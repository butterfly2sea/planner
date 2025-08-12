package handlers

import (
	"database/sql"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"planner/internal/database"
	"planner/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/lib/pq"
)

// CreateTravelItem 创建旅游元素
func CreateTravelItem(c *gin.Context) {
	planID := c.Param("planId")
	userID := c.GetString("user_id")

	// 验证计划所有权
	if !verifyPlanOwnership(planID, userID) {
		c.JSON(http.StatusForbidden, models.ApiResponse{
			Success:   false,
			Message:   "无权操作此计划",
			Timestamp: time.Now(),
		})
		return
	}

	var req models.CreateTravelItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ApiResponse{
			Success:   false,
			Message:   "请求参数无效: " + err.Error(),
			Timestamp: time.Now(),
		})
		return
	}

	db := database.GetDB()
	tx, err := db.Begin()
	if err != nil {
		c.Error(err)
		return
	}
	defer tx.Rollback()

	// 创建主记录
	itemID := uuid.New().String()
	priority := 3
	if req.Priority != nil {
		priority = *req.Priority
	}
	status := "planned"
	if req.Status != nil {
		status = *req.Status
	}

	_, err = tx.Exec(`
		INSERT INTO travel_items (
			id, plan_id, item_type, name, description,
			latitude, longitude, address,
			start_datetime, end_datetime, duration_hours,
			cost, priority, status, properties,
			created_by, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
	`, itemID, planID, req.ItemType, req.Name, req.Description,
		req.Latitude, req.Longitude, req.Address,
		req.StartDatetime, req.EndDatetime, req.DurationHours,
		req.Cost, priority, status, req.Properties,
		userID, time.Now(), time.Now())

	if err != nil {
		c.Error(err)
		return
	}

	// 根据类型插入详细信息
	switch req.ItemType {
	case models.ItemTypeAccommodation:
		if req.AccommodationDetails != nil {
			req.AccommodationDetails.ItemID = itemID
			err = insertAccommodationDetails(tx, req.AccommodationDetails)
		}
	case models.ItemTypeTransport:
		if req.TransportDetails != nil {
			req.TransportDetails.ItemID = itemID
			err = insertTransportDetails(tx, req.TransportDetails)
		}
	case models.ItemTypeAttraction, models.ItemTypePhotoSpot:
		if req.AttractionDetails != nil {
			req.AttractionDetails.ItemID = itemID
			err = insertAttractionDetails(tx, req.AttractionDetails)
		}
	}

	if err != nil {
		c.Error(err)
		return
	}

	if err := tx.Commit(); err != nil {
		c.Error(err)
		return
	}

	c.JSON(http.StatusCreated, models.ApiResponse{
		Success:   true,
		Data:      map[string]string{"id": itemID},
		Message:   "元素创建成功",
		Timestamp: time.Now(),
	})
}

// GetTravelItems 获取计划中的所有旅游元素
func GetTravelItems(c *gin.Context) {
	planID := c.Param("planId")

	// 查询参数
	itemType := c.Query("type")
	date := c.Query("date")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "50"))

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 50
	}

	db := database.GetDB()

	// 构建查询
	query := `
		SELECT id, plan_id, item_type, name, description,
			latitude, longitude, address,
			start_datetime, end_datetime, duration_hours,
			cost, priority, status, booking_status,
			properties, images, notes, tags,
			order_index, group_id,
			created_by, created_at, updated_at
		FROM travel_items
		WHERE plan_id = $1
	`

	args := []interface{}{planID}
	argIndex := 2

	// 添加过滤条件
	if itemType != "" {
		query += fmt.Sprintf(" AND item_type = $%d", argIndex)
		args = append(args, itemType)
		argIndex++
	}

	if date != "" {
		query += fmt.Sprintf(" AND DATE(start_datetime) = $%d", argIndex)
		args = append(args, date)
		argIndex++
	}

	// 排序
	query += " ORDER BY COALESCE(start_datetime, '9999-12-31'::timestamp), order_index, created_at"

	// 分页
	offset := (page - 1) * pageSize
	query += fmt.Sprintf(" LIMIT %d OFFSET %d", pageSize, offset)

	// 执行查询
	rows, err := db.Query(query, args...)
	if err != nil {
		c.Error(err)
		return
	}
	defer rows.Close()

	var items []models.TravelItem
	for rows.Next() {
		var item models.TravelItem
		err := rows.Scan(
			&item.ID, &item.PlanID, &item.ItemType, &item.Name, &item.Description,
			&item.Latitude, &item.Longitude, &item.Address,
			&item.StartDatetime, &item.EndDatetime, &item.DurationHours,
			&item.Cost, &item.Priority, &item.Status, &item.BookingStatus,
			&item.Properties, pq.Array(&item.Images), &item.Notes, pq.Array(&item.Tags),
			&item.OrderIndex, &item.GroupID,
			&item.CreatedBy, &item.CreatedAt, &item.UpdatedAt,
		)
		if err != nil {
			c.Error(err)
			return
		}

		items = append(items, item)
	}

	// 获取总数
	var total int
	countQuery := "SELECT COUNT(*) FROM travel_items WHERE plan_id = $1"
	countArgs := []interface{}{planID}

	if itemType != "" {
		countQuery += " AND item_type = $2"
		countArgs = append(countArgs, itemType)
	}

	db.QueryRow(countQuery, countArgs...).Scan(&total)

	response := models.TravelItemListResponse{
		Items:    items,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
		HasMore:  total > page*pageSize,
	}

	c.JSON(http.StatusOK, models.ApiResponse{
		Success:   true,
		Data:      response,
		Timestamp: time.Now(),
	})
}

// GetTravelItem 获取单个旅游元素详情
func GetTravelItem(c *gin.Context) {
	itemID := c.Param("itemId")
	db := database.GetDB()

	var item models.TravelItem
	err := db.QueryRow(`
		SELECT id, plan_id, item_type, name, description,
			latitude, longitude, address,
			start_datetime, end_datetime, duration_hours,
			cost, priority, status, booking_status,
			properties, images, notes, tags,
			order_index, group_id,
			created_by, created_at, updated_at
		FROM travel_items WHERE id = $1
	`, itemID).Scan(
		&item.ID, &item.PlanID, &item.ItemType, &item.Name, &item.Description,
		&item.Latitude, &item.Longitude, &item.Address,
		&item.StartDatetime, &item.EndDatetime, &item.DurationHours,
		&item.Cost, &item.Priority, &item.Status, &item.BookingStatus,
		&item.Properties, pq.Array(&item.Images), &item.Notes, pq.Array(&item.Tags),
		&item.OrderIndex, &item.GroupID,
		&item.CreatedBy, &item.CreatedAt, &item.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, models.ApiResponse{
				Success:   false,
				Message:   "元素不存在",
				Timestamp: time.Now(),
			})
		} else {
			c.Error(err)
		}
		return
	}

	c.JSON(http.StatusOK, models.ApiResponse{
		Success:   true,
		Data:      item,
		Timestamp: time.Now(),
	})
}

// UpdateTravelItem 更新旅游元素
func UpdateTravelItem(c *gin.Context) {
	itemID := c.Param("itemId")
	userID := c.GetString("user_id")

	db := database.GetDB()

	// 验证权限
	var planID string
	err := db.QueryRow("SELECT plan_id FROM travel_items WHERE id = $1", itemID).Scan(&planID)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, models.ApiResponse{
				Success:   false,
				Message:   "元素不存在",
				Timestamp: time.Now(),
			})
		} else {
			c.Error(err)
		}
		return
	}

	if !verifyPlanOwnership(planID, userID) {
		c.JSON(http.StatusForbidden, models.ApiResponse{
			Success:   false,
			Message:   "无权修改此元素",
			Timestamp: time.Now(),
		})
		return
	}

	var req models.UpdateTravelItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ApiResponse{
			Success:   false,
			Message:   "请求参数无效",
			Timestamp: time.Now(),
		})
		return
	}

	// 构建更新语句
	updates := make(map[string]interface{})
	if req.Name != nil {
		updates["name"] = *req.Name
	}
	if req.Description != nil {
		updates["description"] = *req.Description
	}
	if req.StartDatetime != nil {
		updates["start_datetime"] = *req.StartDatetime
	}
	if req.EndDatetime != nil {
		updates["end_datetime"] = *req.EndDatetime
	}
	if req.Cost != nil {
		updates["cost"] = *req.Cost
	}
	if req.Priority != nil {
		updates["priority"] = *req.Priority
	}
	if req.Status != nil {
		updates["status"] = *req.Status
	}

	// 执行更新
	if len(updates) > 0 {
		query := "UPDATE travel_items SET updated_at = $1"
		args := []interface{}{time.Now()}
		argIndex := 2

		for key, value := range updates {
			query += fmt.Sprintf(", %s = $%d", key, argIndex)
			args = append(args, value)
			argIndex++
		}

		query += fmt.Sprintf(" WHERE id = $%d", argIndex)
		args = append(args, itemID)

		_, err = db.Exec(query, args...)
		if err != nil {
			c.Error(err)
			return
		}
	}

	c.JSON(http.StatusOK, models.ApiResponse{
		Success:   true,
		Message:   "元素更新成功",
		Timestamp: time.Now(),
	})
}

// DeleteTravelItem 删除旅游元素
func DeleteTravelItem(c *gin.Context) {
	itemID := c.Param("itemId")
	userID := c.GetString("user_id")

	db := database.GetDB()

	// 验证权限
	var planID string
	err := db.QueryRow("SELECT plan_id FROM travel_items WHERE id = $1", itemID).Scan(&planID)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, models.ApiResponse{
				Success:   false,
				Message:   "元素不存在",
				Timestamp: time.Now(),
			})
		} else {
			c.Error(err)
		}
		return
	}

	if !verifyPlanOwnership(planID, userID) {
		c.JSON(http.StatusForbidden, models.ApiResponse{
			Success:   false,
			Message:   "无权删除此元素",
			Timestamp: time.Now(),
		})
		return
	}

	// 删除元素
	_, err = db.Exec("DELETE FROM travel_items WHERE id = $1", itemID)
	if err != nil {
		c.Error(err)
		return
	}

	c.JSON(http.StatusOK, models.ApiResponse{
		Success:   true,
		Message:   "元素删除成功",
		Timestamp: time.Now(),
	})
}

// 辅助函数：验证计划所有权
func verifyPlanOwnership(planID, userID string) bool {
	db := database.GetDB()
	var ownerID string
	err := db.QueryRow("SELECT user_id FROM plans WHERE id = $1", planID).Scan(&ownerID)
	return err == nil && ownerID == userID
}

// 辅助函数：插入住宿详情
func insertAccommodationDetails(tx *sql.Tx, details *models.AccommodationDetails) error {
	_, err := tx.Exec(`
		INSERT INTO accommodation_details (
			item_id, hotel_name, room_type, check_in_time, check_out_time,
			guests_count, breakfast_included, booking_platform, booking_number,
			booking_url, phone, email, rating, amenities,
			price_per_night, total_nights, taxes_fees, cancellation_policy
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
	`, details.ItemID, details.HotelName, details.RoomType, details.CheckInTime, details.CheckOutTime,
		details.GuestsCount, details.BreakfastIncluded, details.BookingPlatform, details.BookingNumber,
		details.BookingURL, details.Phone, details.Email, details.Rating, details.Amenities,
		details.PricePerNight, details.TotalNights, details.TaxesFees, details.CancellationPolicy)
	return err
}

// 辅助函数：插入交通详情
func insertTransportDetails(tx *sql.Tx, details *models.TransportDetails) error {
	_, err := tx.Exec(`
		INSERT INTO transport_details (
			item_id, transport_type, departure_location, arrival_location,
			departure_time, arrival_time, distance_km,
			booking_reference, carrier_name, vehicle_number, seat_number
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`, details.ItemID, details.TransportType, details.DepartureLocation, details.ArrivalLocation,
		details.DepartureTime, details.ArrivalTime, details.DistanceKm,
		details.BookingReference, details.CarrierName, details.VehicleNumber, details.SeatNumber)
	return err
}

// 辅助函数：插入景点详情
func insertAttractionDetails(tx *sql.Tx, details *models.AttractionDetails) error {
	_, err := tx.Exec(`
		INSERT INTO attraction_details (
			item_id, attraction_type, ticket_price, ticket_type,
			advance_booking_required, best_visit_time, recommended_duration,
			difficulty_level, photography_tips
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`, details.ItemID, details.AttractionType, details.TicketPrice, details.TicketType,
		details.AdvanceBookingRequired, details.BestVisitTime, details.RecommendedDuration,
		details.DifficultyLevel, details.PhotographyTips)
	return err
}

// CreateItemRelation 创建元素关联
func CreateItemRelation(c *gin.Context) {
	var req struct {
		SourceItemID       string       `json:"source_item_id" binding:"required"`
		TargetItemID       string       `json:"target_item_id" binding:"required"`
		RelationType       string       `json:"relation_type" binding:"required"`
		RelationProperties models.JSONB `json:"relation_properties"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ApiResponse{
			Success:   false,
			Message:   "请求参数无效",
			Timestamp: time.Now(),
		})
		return
	}

	db := database.GetDB()
	relationID := uuid.New().String()

	_, err := db.Exec(`
		INSERT INTO item_relations (id, source_item_id, target_item_id, relation_type, relation_properties, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (source_item_id, target_item_id, relation_type) DO UPDATE
		SET relation_properties = $5
	`, relationID, req.SourceItemID, req.TargetItemID,
		req.RelationType, req.RelationProperties, time.Now())

	if err != nil {
		c.Error(err)
		return
	}

	c.JSON(http.StatusCreated, models.ApiResponse{
		Success:   true,
		Data:      map[string]string{"id": relationID},
		Message:   "关联创建成功",
		Timestamp: time.Now(),
	})
}

// GetItemRelations 获取元素的所有关联
func GetItemRelations(c *gin.Context) {
	itemID := c.Param("itemId")
	db := database.GetDB()

	rows, err := db.Query(`
		SELECT id, source_item_id, target_item_id, relation_type, relation_properties, created_at
		FROM item_relations
		WHERE source_item_id = $1 OR target_item_id = $1
	`, itemID)

	if err != nil {
		c.Error(err)
		return
	}
	defer rows.Close()

	var relations []models.ItemRelation
	for rows.Next() {
		var relation models.ItemRelation
		err := rows.Scan(
			&relation.ID, &relation.SourceItemID, &relation.TargetItemID,
			&relation.RelationType, &relation.RelationProperties, &relation.CreatedAt,
		)
		if err == nil {
			relations = append(relations, relation)
		}
	}

	c.JSON(http.StatusOK, models.ApiResponse{
		Success:   true,
		Data:      relations,
		Timestamp: time.Now(),
	})
}

// DeleteItemRelation 删除关联
func DeleteItemRelation(c *gin.Context) {
	relationID := c.Param("relationId")
	db := database.GetDB()

	result, err := db.Exec("DELETE FROM item_relations WHERE id = $1", relationID)
	if err != nil {
		c.Error(err)
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, models.ApiResponse{
			Success:   false,
			Message:   "关联不存在",
			Timestamp: time.Now(),
		})
		return
	}

	c.JSON(http.StatusOK, models.ApiResponse{
		Success:   true,
		Message:   "关联删除成功",
		Timestamp: time.Now(),
	})
}

// AddAnnotation 添加标注
func AddAnnotation(c *gin.Context) {
	itemID := c.Param("itemId")
	userID := c.GetString("user_id")

	var req struct {
		AnnotationType *string  `json:"annotation_type"`
		Content        string   `json:"content" binding:"required"`
		MarkerLat      *float64 `json:"marker_lat"`
		MarkerLng      *float64 `json:"marker_lng"`
		Rating         *int     `json:"rating"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ApiResponse{
			Success:   false,
			Message:   "请求参数无效",
			Timestamp: time.Now(),
		})
		return
	}

	db := database.GetDB()
	annotationID := uuid.New().String()

	_, err := db.Exec(`
		INSERT INTO item_annotations (
			id, item_id, annotation_type, content,
			marker_lat, marker_lng, rating,
			created_by, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`, annotationID, itemID, req.AnnotationType, req.Content,
		req.MarkerLat, req.MarkerLng, req.Rating,
		userID, time.Now(), time.Now())

	if err != nil {
		c.Error(err)
		return
	}

	c.JSON(http.StatusCreated, models.ApiResponse{
		Success:   true,
		Data:      map[string]string{"id": annotationID},
		Message:   "标注添加成功",
		Timestamp: time.Now(),
	})
}

// GetAnnotations 获取元素的所有标注
func GetAnnotations(c *gin.Context) {
	itemID := c.Param("itemId")
	db := database.GetDB()

	rows, err := db.Query(`
		SELECT id, item_id, annotation_type, content,
			marker_lat, marker_lng, rating,
			created_by, created_at, updated_at
		FROM item_annotations
		WHERE item_id = $1
		ORDER BY created_at DESC
	`, itemID)

	if err != nil {
		c.Error(err)
		return
	}
	defer rows.Close()

	var annotations []models.ItemAnnotation
	for rows.Next() {
		var annotation models.ItemAnnotation
		err := rows.Scan(
			&annotation.ID, &annotation.ItemID, &annotation.AnnotationType, &annotation.Content,
			&annotation.MarkerLat, &annotation.MarkerLng, &annotation.Rating,
			&annotation.CreatedBy, &annotation.CreatedAt, &annotation.UpdatedAt,
		)
		if err == nil {
			annotations = append(annotations, annotation)
		}
	}

	c.JSON(http.StatusOK, models.ApiResponse{
		Success:   true,
		Data:      annotations,
		Timestamp: time.Now(),
	})
}

// UpdateAnnotation 更新标注
func UpdateAnnotation(c *gin.Context) {
	annotationID := c.Param("annotationId")
	userID := c.GetString("user_id")
	db := database.GetDB()

	// 验证所有权
	var createdBy string
	err := db.QueryRow("SELECT created_by FROM item_annotations WHERE id = $1", annotationID).Scan(&createdBy)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, models.ApiResponse{
				Success:   false,
				Message:   "标注不存在",
				Timestamp: time.Now(),
			})
		} else {
			c.Error(err)
		}
		return
	}

	if createdBy != userID {
		c.JSON(http.StatusForbidden, models.ApiResponse{
			Success:   false,
			Message:   "无权修改此标注",
			Timestamp: time.Now(),
		})
		return
	}

	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ApiResponse{
			Success:   false,
			Message:   "请求参数无效",
			Timestamp: time.Now(),
		})
		return
	}

	// 构建更新语句
	query := "UPDATE item_annotations SET updated_at = $1"
	args := []interface{}{time.Now()}
	argIndex := 2

	for key, value := range req {
		if key == "content" || key == "annotation_type" || key == "rating" {
			query += fmt.Sprintf(", %s = $%d", key, argIndex)
			args = append(args, value)
			argIndex++
		}
	}

	query += fmt.Sprintf(" WHERE id = $%d", argIndex)
	args = append(args, annotationID)

	_, err = db.Exec(query, args...)
	if err != nil {
		c.Error(err)
		return
	}

	c.JSON(http.StatusOK, models.ApiResponse{
		Success:   true,
		Message:   "标注更新成功",
		Timestamp: time.Now(),
	})
}

// DeleteAnnotation 删除标注
func DeleteAnnotation(c *gin.Context) {
	annotationID := c.Param("annotationId")
	userID := c.GetString("user_id")
	db := database.GetDB()

	// 验证所有权
	var createdBy string
	err := db.QueryRow("SELECT created_by FROM item_annotations WHERE id = $1", annotationID).Scan(&createdBy)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, models.ApiResponse{
				Success:   false,
				Message:   "标注不存在",
				Timestamp: time.Now(),
			})
		} else {
			c.Error(err)
		}
		return
	}

	if createdBy != userID {
		c.JSON(http.StatusForbidden, models.ApiResponse{
			Success:   false,
			Message:   "无权删除此标注",
			Timestamp: time.Now(),
		})
		return
	}

	_, err = db.Exec("DELETE FROM item_annotations WHERE id = $1", annotationID)
	if err != nil {
		c.Error(err)
		return
	}

	c.JSON(http.StatusOK, models.ApiResponse{
		Success:   true,
		Message:   "标注删除成功",
		Timestamp: time.Now(),
	})
}

// GetDailyItinerary 获取每日行程
func GetDailyItinerary(c *gin.Context) {
	planID := c.Param("planId")
	db := database.GetDB()

	rows, err := db.Query(`
		SELECT 
			DATE(start_datetime) as travel_date,
			id, item_type, name, description,
			latitude, longitude, address,
			start_datetime, end_datetime, duration_hours,
			cost, status
		FROM travel_items
		WHERE plan_id = $1 AND start_datetime IS NOT NULL
		ORDER BY start_datetime, order_index
	`, planID)

	if err != nil {
		c.Error(err)
		return
	}
	defer rows.Close()

	dailyMap := make(map[string]*models.DailyItinerary)

	for rows.Next() {
		var date sql.NullTime
		var item models.TravelItem

		err := rows.Scan(
			&date,
			&item.ID, &item.ItemType, &item.Name, &item.Description,
			&item.Latitude, &item.Longitude, &item.Address,
			&item.StartDatetime, &item.EndDatetime, &item.DurationHours,
			&item.Cost, &item.Status,
		)

		if err != nil {
			continue
		}

		if date.Valid {
			dateStr := date.Time.Format("2006-01-02")
			if _, exists := dailyMap[dateStr]; !exists {
				dailyMap[dateStr] = &models.DailyItinerary{
					Date:  dateStr,
					Items: []models.TravelItem{},
				}
			}

			daily := dailyMap[dateStr]
			daily.Items = append(daily.Items, item)

			if item.Cost != nil {
				daily.TotalCost += *item.Cost
			}

			if daily.StartTime == nil || (item.StartDatetime != nil && item.StartDatetime.Before(*daily.StartTime)) {
				daily.StartTime = item.StartDatetime
			}

			if daily.EndTime == nil || (item.EndDatetime != nil && item.EndDatetime.After(*daily.EndTime)) {
				daily.EndTime = item.EndDatetime
			}
		}
	}

	// 转换为数组
	var result []models.DailyItinerary
	for _, daily := range dailyMap {
		result = append(result, *daily)
	}

	c.JSON(http.StatusOK, models.ApiResponse{
		Success:   true,
		Data:      result,
		Timestamp: time.Now(),
	})
}

// GetPlanSummary 获取计划摘要
func GetPlanSummary(c *gin.Context) {
	planID := c.Param("planId")
	db := database.GetDB()

	summary := models.PlanSummary{
		PlanID: planID,
	}

	// 统计各类型数量和费用
	rows, err := db.Query(`
		SELECT 
			item_type,
			COUNT(*) as count,
			COALESCE(SUM(cost), 0) as total_cost
		FROM travel_items
		WHERE plan_id = $1
		GROUP BY item_type
	`, planID)

	if err != nil {
		c.Error(err)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var itemType string
		var count int
		var totalCost float64

		err := rows.Scan(&itemType, &count, &totalCost)
		if err != nil {
			continue
		}

		summary.TotalItems += count
		summary.TotalCost += totalCost

		switch models.ItemType(itemType) {
		case models.ItemTypeAccommodation:
			summary.AccommodationDays = count
		case models.ItemTypeTransport:
			summary.TransportCount = count
		case models.ItemTypeAttraction, models.ItemTypePhotoSpot:
			summary.AttractionCount += count
		}
	}

	// 获取日期范围
	var startDate, endDate sql.NullTime
	db.QueryRow(`
		SELECT MIN(start_datetime), MAX(end_datetime)
		FROM travel_items
		WHERE plan_id = $1 AND start_datetime IS NOT NULL
	`, planID).Scan(&startDate, &endDate)

	if startDate.Valid {
		summary.StartDate = startDate.Time
	}
	if endDate.Valid {
		summary.EndDate = endDate.Time
		if startDate.Valid {
			summary.Duration = int(endDate.Time.Sub(startDate.Time).Hours()/24) + 1
		}
	}

	// 获取预算信息
	db.QueryRow(`
		SELECT COALESCE(SUM(estimated_amount), 0)
		FROM budget_items
		WHERE plan_id = $1
	`, planID).Scan(&summary.EstimatedCost)

	c.JSON(http.StatusOK, models.ApiResponse{
		Success:   true,
		Data:      summary,
		Timestamp: time.Now(),
	})
}

// ExportPlanJSON 导出计划为JSON
func ExportPlanJSON(c *gin.Context) {
	planID := c.Param("planId")
	db := database.GetDB()

	// 获取计划信息
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

	// 获取旅游元素
	rows, err := db.Query(`
		SELECT id, item_type, name, description, latitude, longitude,
			start_datetime, end_datetime, cost
		FROM travel_items WHERE plan_id = $1
		ORDER BY start_datetime
	`, planID)

	if err != nil {
		c.Error(err)
		return
	}
	defer rows.Close()

	var items []map[string]interface{}
	for rows.Next() {
		var item models.TravelItem
		err := rows.Scan(&item.ID, &item.ItemType, &item.Name, &item.Description,
			&item.Latitude, &item.Longitude, &item.StartDatetime, &item.EndDatetime, &item.Cost)
		if err != nil {
			continue
		}

		itemMap := map[string]interface{}{
			"id":          item.ID,
			"type":        item.ItemType,
			"name":        item.Name,
			"description": item.Description,
			"latitude":    item.Latitude,
			"longitude":   item.Longitude,
			"start_time":  item.StartDatetime,
			"end_time":    item.EndDatetime,
			"cost":        item.Cost,
		}
		items = append(items, itemMap)
	}

	// 构建导出数据
	exportData := map[string]interface{}{
		"plan":        plan,
		"items":       items,
		"exported_at": time.Now(),
	}

	// 设置响应头
	c.Header("Content-Type", "application/json")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"plan-%s.json\"", planID))

	c.JSON(http.StatusOK, exportData)
}
