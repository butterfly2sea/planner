package handlers

import (
	"database/sql"
	"net/http"
	"time"

	"planner/internal/config"
	"planner/internal/database"
	"planner/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

// Register 用户注册
func Register(c *gin.Context) {
	var req models.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ApiResponse{
			Success:   false,
			Message:   "请求参数无效: " + err.Error(),
			Timestamp: time.Now(),
		})
		return
	}

	db := database.GetDB()

	// 检查用户名是否已存在
	var exists bool
	err := db.QueryRow("SELECT EXISTS(SELECT 1 FROM users WHERE username = $1)", req.Username).Scan(&exists)
	if err != nil {
		c.Error(err)
		return
	}
	if exists {
		c.JSON(http.StatusConflict, models.ApiResponse{
			Success:   false,
			Message:   "用户名已存在",
			Timestamp: time.Now(),
		})
		return
	}

	// 检查邮箱是否已存在
	err = db.QueryRow("SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)", req.Email).Scan(&exists)
	if err != nil {
		c.Error(err)
		return
	}
	if exists {
		c.JSON(http.StatusConflict, models.ApiResponse{
			Success:   false,
			Message:   "邮箱已被注册",
			Timestamp: time.Now(),
		})
		return
	}

	// 加密密码
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.Error(err)
		return
	}

	// 创建用户
	userID := uuid.New().String()
	_, err = db.Exec(`
		INSERT INTO users (id, username, email, password_hash, is_active, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`, userID, req.Username, req.Email, string(hashedPassword), true, time.Now(), time.Now())

	if err != nil {
		c.Error(err)
		return
	}

	c.JSON(http.StatusCreated, models.ApiResponse{
		Success: true,
		Data: map[string]interface{}{
			"id":       userID,
			"username": req.Username,
			"email":    req.Email,
		},
		Message:   "注册成功",
		Timestamp: time.Now(),
	})
}

// Login 用户登录
func Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ApiResponse{
			Success:   false,
			Message:   "请求参数无效",
			Timestamp: time.Now(),
		})
		return
	}

	db := database.GetDB()

	// 查询用户
	var user models.User
	err := db.QueryRow(`
		SELECT id, username, email, password_hash, is_active 
		FROM users WHERE username = $1
	`, req.Username).Scan(&user.ID, &user.Username, &user.Email, &user.Password, &user.IsActive)

	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusUnauthorized, models.ApiResponse{
				Success:   false,
				Message:   "用户名或密码错误",
				Timestamp: time.Now(),
			})
		} else {
			c.Error(err)
		}
		return
	}

	// 验证密码
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, models.ApiResponse{
			Success:   false,
			Message:   "用户名或密码错误",
			Timestamp: time.Now(),
		})
		return
	}

	// 检查账户状态
	if !user.IsActive {
		c.JSON(http.StatusForbidden, models.ApiResponse{
			Success:   false,
			Message:   "账户已被禁用",
			Timestamp: time.Now(),
		})
		return
	}

	// 更新最后登录时间
	_, _ = db.Exec("UPDATE users SET last_login_at = $1 WHERE id = $2", time.Now(), user.ID)

	// 生成JWT
	cfg := config.Get()
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id":  user.ID,
		"username": user.Username,
		"email":    user.Email,
		"exp":      time.Now().Add(7 * 24 * time.Hour).Unix(),
	})

	tokenString, err := token.SignedString([]byte(cfg.JWTSecret))
	if err != nil {
		c.Error(err)
		return
	}

	c.JSON(http.StatusOK, models.ApiResponse{
		Success: true,
		Data: map[string]interface{}{
			"token": tokenString,
			"user": map[string]interface{}{
				"id":       user.ID,
				"username": user.Username,
				"email":    user.Email,
			},
		},
		Message:   "登录成功",
		Timestamp: time.Now(),
	})
}

// Logout 用户登出
func Logout(c *gin.Context) {
	// 在实际应用中，这里可以将token加入黑名单
	c.JSON(http.StatusOK, models.ApiResponse{
		Success:   true,
		Message:   "登出成功",
		Timestamp: time.Now(),
	})
}

// RefreshToken 刷新令牌
func RefreshToken(c *gin.Context) {
	// 获取当前用户信息
	userID := c.GetString("user_id")
	username := c.GetString("username")

	// 生成新的JWT
	cfg := config.Get()
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id":  userID,
		"username": username,
		"exp":      time.Now().Add(7 * 24 * time.Hour).Unix(),
	})

	tokenString, err := token.SignedString([]byte(cfg.JWTSecret))
	if err != nil {
		c.Error(err)
		return
	}

	c.JSON(http.StatusOK, models.ApiResponse{
		Success: true,
		Data: map[string]interface{}{
			"token": tokenString,
		},
		Message:   "令牌刷新成功",
		Timestamp: time.Now(),
	})
}

// GetProfile 获取用户资料
func GetProfile(c *gin.Context) {
	userID := c.GetString("user_id")
	db := database.GetDB()

	var user models.User
	err := db.QueryRow(`
		SELECT id, username, email, avatar_url, bio, is_active, created_at, updated_at, last_login_at
		FROM users WHERE id = $1
	`, userID).Scan(&user.ID, &user.Username, &user.Email, &user.AvatarURL, &user.Bio,
		&user.IsActive, &user.CreatedAt, &user.UpdatedAt, &user.LastLoginAt)

	if err != nil {
		c.Error(err)
		return
	}

	c.JSON(http.StatusOK, models.ApiResponse{
		Success:   true,
		Data:      user,
		Timestamp: time.Now(),
	})
}

// UpdateProfile 更新用户资料
func UpdateProfile(c *gin.Context) {
	userID := c.GetString("user_id")

	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ApiResponse{
			Success:   false,
			Message:   "请求参数无效",
			Timestamp: time.Now(),
		})
		return
	}

	db := database.GetDB()

	// 如果包含密码更新
	if newPassword, ok := req["password"].(string); ok && newPassword != "" {
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
		if err != nil {
			c.Error(err)
			return
		}
		_, err = db.Exec("UPDATE users SET password_hash = $1 WHERE id = $2", string(hashedPassword), userID)
		if err != nil {
			c.Error(err)
			return
		}
		delete(req, "password")
	}

	// 更新其他字段
	if email, ok := req["email"].(string); ok {
		_, err := db.Exec("UPDATE users SET email = $1, updated_at = $2 WHERE id = $3",
			email, time.Now(), userID)
		if err != nil {
			c.Error(err)
			return
		}
	}

	if avatarURL, ok := req["avatar_url"].(string); ok {
		_, err := db.Exec("UPDATE users SET avatar_url = $1, updated_at = $2 WHERE id = $3",
			avatarURL, time.Now(), userID)
		if err != nil {
			c.Error(err)
			return
		}
	}

	if bio, ok := req["bio"].(string); ok {
		_, err := db.Exec("UPDATE users SET bio = $1, updated_at = $2 WHERE id = $3",
			bio, time.Now(), userID)
		if err != nil {
			c.Error(err)
			return
		}
	}

	c.JSON(http.StatusOK, models.ApiResponse{
		Success:   true,
		Message:   "资料更新成功",
		Timestamp: time.Now(),
	})
}
