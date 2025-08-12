package handlers

import (
	"database/sql"
	"fmt"
	"net/http"
	"time"

	"planner/internal/database"
	"planner/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/lib/pq"
)

// CreatePlan 创建旅游计划
func CreatePlan(c *gin.Context) {
	userID := c.GetString("user_id")

	var plan models.Plan
	if err := c.ShouldBindJSON(&plan); err != nil {
		c.JSON(http.StatusBadRequest, models.ApiResponse{
			Success:   false,
			Message:   "请求参数无效: " + err.Error(),
			Timestamp: time.Now(),
		})
		return
	}

	plan.ID = uuid.New().String()
	plan.UserID = userID
	plan.CreatedAt = time.Now()
	plan.UpdatedAt = time.Now()

	if plan.Status == "" {
		plan.Status = "draft"
	}
	if plan.Visibility == "" {
		plan.Visibility = "private"
	}
	if plan.Destination == "" {
		plan.Destination = "稻城亚丁"
	}
	if plan.Participants == 0 {
		plan.Participants = 1
	}

	db := database.GetDB()
	_, err := db.Exec(`
		INSERT INTO plans (id, user_id, name, description, destination, start_date, end_date, 
			budget, participants, status, visibility, tags, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
	`, plan.ID, plan.UserID, plan.Name, plan.Description, plan.Destination,
		plan.StartDate, plan.EndDate, plan.Budget, plan.Participants,
		plan.Status, plan.Visibility, pq.Array(plan.Tags), plan.CreatedAt, plan.UpdatedAt)

	if err != nil {
		c.Error(err)
		return
	}

	c.JSON(http.StatusCreated, models.ApiResponse{
		Success:   true,
		Data:      plan,
		Message:   "计划创建成功",
		Timestamp: time.Now(),
	})
}

// GetMyPlans 获取我的计划列表
func GetMyPlans(c *gin.Context) {
	userID := c.GetString("user_id")
	db := database.GetDB()

	rows, err := db.Query(`
		SELECT id, user_id, name, description, destination, start_date, end_date,
			budget, participants, status, visibility, created_at, updated_at
		FROM plans
		WHERE user_id = $1
		ORDER BY created_at DESC
	`, userID)

	if err != nil {
		c.Error(err)
		return
	}
	defer rows.Close()

	var plans []models.Plan
	for rows.Next() {
		var plan models.Plan
		err := rows.Scan(&plan.ID, &plan.UserID, &plan.Name, &plan.Description,
			&plan.Destination, &plan.StartDate, &plan.EndDate, &plan.Budget,
			&plan.Participants, &plan.Status, &plan.Visibility,
			&plan.CreatedAt, &plan.UpdatedAt)

		if err != nil {
			c.Error(err)
			return
		}
		plans = append(plans, plan)
	}

	c.JSON(http.StatusOK, models.ApiResponse{
		Success:   true,
		Data:      plans,
		Timestamp: time.Now(),
	})
}

// GetUserPlans 获取用户的所有计划
func GetUserPlans(c *gin.Context) {
	userID := c.Param("userId")
	db := database.GetDB()

	rows, err := db.Query(`
		SELECT id, user_id, name, description, destination, start_date, end_date,
			budget, participants, status, visibility, created_at, updated_at
		FROM plans
		WHERE user_id = $1 AND visibility = 'public'
		ORDER BY created_at DESC
	`, userID)

	if err != nil {
		c.Error(err)
		return
	}
	defer rows.Close()

	var plans []models.Plan
	for rows.Next() {
		var plan models.Plan
		err := rows.Scan(&plan.ID, &plan.UserID, &plan.Name, &plan.Description,
			&plan.Destination, &plan.StartDate, &plan.EndDate, &plan.Budget,
			&plan.Participants, &plan.Status, &plan.Visibility,
			&plan.CreatedAt, &plan.UpdatedAt)

		if err != nil {
			c.Error(err)
			return
		}
		plans = append(plans, plan)
	}

	c.JSON(http.StatusOK, models.ApiResponse{
		Success:   true,
		Data:      plans,
		Timestamp: time.Now(),
	})
}

// GetPlan 获取计划详情
func GetPlan(c *gin.Context) {
	planID := c.Param("planId")
	db := database.GetDB()

	var plan models.Plan
	err := db.QueryRow(`
		SELECT id, user_id, name, description, destination, start_date, end_date,
			budget, participants, status, visibility, created_at, updated_at
		FROM plans WHERE id = $1
	`, planID).Scan(&plan.ID, &plan.UserID, &plan.Name, &plan.Description,
		&plan.Destination, &plan.StartDate, &plan.EndDate, &plan.Budget,
		&plan.Participants, &plan.Status, &plan.Visibility,
		&plan.CreatedAt, &plan.UpdatedAt)

	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, models.ApiResponse{
				Success:   false,
				Message:   "计划不存在",
				Timestamp: time.Now(),
			})
		} else {
			c.Error(err)
		}
		return
	}

	c.JSON(http.StatusOK, models.ApiResponse{
		Success:   true,
		Data:      plan,
		Timestamp: time.Now(),
	})
}

// UpdatePlan 更新计划
func UpdatePlan(c *gin.Context) {
	planID := c.Param("planId")
	userID := c.GetString("user_id")

	db := database.GetDB()

	// 验证计划所有权
	var ownerID string
	err := db.QueryRow("SELECT user_id FROM plans WHERE id = $1", planID).Scan(&ownerID)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, models.ApiResponse{
				Success:   false,
				Message:   "计划不存在",
				Timestamp: time.Now(),
			})
		} else {
			c.Error(err)
		}
		return
	}

	if ownerID != userID {
		c.JSON(http.StatusForbidden, models.ApiResponse{
			Success:   false,
			Message:   "无权修改此计划",
			Timestamp: time.Now(),
		})
		return
	}

	var updates map[string]interface{}
	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(http.StatusBadRequest, models.ApiResponse{
			Success:   false,
			Message:   "请求参数无效",
			Timestamp: time.Now(),
		})
		return
	}

	// 构建动态更新语句
	query := "UPDATE plans SET updated_at = $1"
	args := []interface{}{time.Now()}
	argIndex := 2

	for key, value := range updates {
		if key != "id" && key != "user_id" && key != "created_at" {
			query += fmt.Sprintf(", %s = $%d", key, argIndex)
			args = append(args, value)
			argIndex++
		}
	}

	query += fmt.Sprintf(" WHERE id = $%d", argIndex)
	args = append(args, planID)

	_, err = db.Exec(query, args...)
	if err != nil {
		c.Error(err)
		return
	}

	c.JSON(http.StatusOK, models.ApiResponse{
		Success:   true,
		Message:   "计划更新成功",
		Timestamp: time.Now(),
	})
}

// DeletePlan 删除计划
func DeletePlan(c *gin.Context) {
	planID := c.Param("planId")
	userID := c.GetString("user_id")

	db := database.GetDB()

	// 验证计划所有权
	var ownerID string
	err := db.QueryRow("SELECT user_id FROM plans WHERE id = $1", planID).Scan(&ownerID)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, models.ApiResponse{
				Success:   false,
				Message:   "计划不存在",
				Timestamp: time.Now(),
			})
		} else {
			c.Error(err)
		}
		return
	}

	if ownerID != userID {
		c.JSON(http.StatusForbidden, models.ApiResponse{
			Success:   false,
			Message:   "无权删除此计划",
			Timestamp: time.Now(),
		})
		return
	}

	// 删除计划（级联删除相关数据）
	_, err = db.Exec("DELETE FROM plans WHERE id = $1", planID)
	if err != nil {
		c.Error(err)
		return
	}

	c.JSON(http.StatusOK, models.ApiResponse{
		Success:   true,
		Message:   "计划删除成功",
		Timestamp: time.Now(),
	})
}

// DuplicatePlan 复制计划
func DuplicatePlan(c *gin.Context) {
	planID := c.Param("planId")
	userID := c.GetString("user_id")

	db := database.GetDB()

	// 获取原计划
	var originalPlan models.Plan
	err := db.QueryRow(`
		SELECT name, description, destination, start_date, end_date,
			budget, participants, status, visibility
		FROM plans WHERE id = $1
	`, planID).Scan(&originalPlan.Name, &originalPlan.Description,
		&originalPlan.Destination, &originalPlan.StartDate, &originalPlan.EndDate,
		&originalPlan.Budget, &originalPlan.Participants,
		&originalPlan.Status, &originalPlan.Visibility)

	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, models.ApiResponse{
				Success:   false,
				Message:   "计划不存在",
				Timestamp: time.Now(),
			})
		} else {
			c.Error(err)
		}
		return
	}

	// 创建新计划
	newPlanID := uuid.New().String()
	originalPlan.Name = originalPlan.Name + " (副本)"

	_, err = db.Exec(`
		INSERT INTO plans (id, user_id, name, description, destination, start_date, end_date,
			budget, participants, status, visibility, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
	`, newPlanID, userID, originalPlan.Name, originalPlan.Description,
		originalPlan.Destination, originalPlan.StartDate, originalPlan.EndDate,
		originalPlan.Budget, originalPlan.Participants,
		"draft", "private", time.Now(), time.Now())

	if err != nil {
		c.Error(err)
		return
	}

	// 复制旅游元素
	_, err = db.Exec(`
		INSERT INTO travel_items (
			id, plan_id, item_type, name, description,
			latitude, longitude, address,
			start_datetime, end_datetime, duration_hours,
			cost, priority, status, properties,
			created_by, created_at, updated_at
		)
		SELECT 
			gen_random_uuid(), $1, item_type, name, description,
			latitude, longitude, address,
			start_datetime, end_datetime, duration_hours,
			cost, priority, 'planned', properties,
			$2, NOW(), NOW()
		FROM travel_items
		WHERE plan_id = $3
	`, newPlanID, userID, planID)

	if err != nil {
		// 如果复制元素失败，仍然返回成功（计划已创建）
		c.JSON(http.StatusCreated, models.ApiResponse{
			Success:   true,
			Data:      map[string]string{"id": newPlanID},
			Message:   "计划复制成功（部分元素可能未复制）",
			Timestamp: time.Now(),
		})
		return
	}

	c.JSON(http.StatusCreated, models.ApiResponse{
		Success:   true,
		Data:      map[string]string{"id": newPlanID},
		Message:   "计划复制成功",
		Timestamp: time.Now(),
	})
}

// SharePlan 分享计划
func SharePlan(c *gin.Context) {
	planID := c.Param("planId")
	userID := c.GetString("user_id")

	// 验证计划所有权
	if !verifyPlanOwnership(planID, userID) {
		c.JSON(http.StatusForbidden, models.ApiResponse{
			Success:   false,
			Message:   "无权分享此计划",
			Timestamp: time.Now(),
		})
		return
	}

	// 生成分享链接（简化实现）
	shareToken := uuid.New().String()
	shareURL := fmt.Sprintf("https://travel.example.com/share/%s", shareToken)

	// 在实际应用中，应该将分享信息存储到数据库中

	c.JSON(http.StatusOK, models.ApiResponse{
		Success: true,
		Data: map[string]interface{}{
			"share_url":   shareURL,
			"share_token": shareToken,
			"expires_at":  time.Now().Add(7 * 24 * time.Hour),
		},
		Message:   "分享链接生成成功",
		Timestamp: time.Now(),
	})
}
