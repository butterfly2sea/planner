package middleware

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"planner/internal/config"
	"planner/internal/database"
	"planner/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

// RequestID 请求ID中间件
func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		requestID := c.GetHeader("X-Request-ID")
		if requestID == "" {
			requestID = uuid.New().String()
		}
		c.Set("request_id", requestID)
		c.Header("X-Request-ID", requestID)
		c.Next()
	}
}

// ErrorHandler 错误处理中间件
func ErrorHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()

		if len(c.Errors) > 0 {
			err := c.Errors.Last()
			c.JSON(http.StatusInternalServerError, models.ApiResponse{
				Success:   false,
				Message:   err.Error(),
				Timestamp: time.Now(),
			})
		}
	}
}

// Timeout 请求超时中间件
func Timeout(timeout time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c.Request.Context(), timeout)
		defer cancel()

		c.Request = c.Request.WithContext(ctx)
		c.Next()
	}
}

// SecurityHeaders 安全头中间件
func SecurityHeaders() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-Frame-Options", "DENY")
		c.Header("X-XSS-Protection", "1; mode=block")
		c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		c.Next()
	}
}

// Auth JWT认证中间件
func Auth() gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenString := c.GetHeader("Authorization")
		if tokenString == "" {
			c.JSON(http.StatusUnauthorized, models.ApiResponse{
				Success:   false,
				Message:   "未提供认证令牌",
				Timestamp: time.Now(),
			})
			c.Abort()
			return
		}

		// 移除 "Bearer " 前缀
		if len(tokenString) > 7 && tokenString[:7] == "Bearer " {
			tokenString = tokenString[7:]
		}

		// 解析JWT
		cfg := config.Get()
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("意外的签名方法: %v", token.Header["alg"])
			}
			return []byte(cfg.JWTSecret), nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, models.ApiResponse{
				Success:   false,
				Message:   "无效的令牌",
				Timestamp: time.Now(),
			})
			c.Abort()
			return
		}

		// 提取用户信息
		if claims, ok := token.Claims.(jwt.MapClaims); ok {
			c.Set("user_id", claims["user_id"])
			c.Set("username", claims["username"])
		}

		c.Next()
	}
}

// Admin 管理员权限中间件
func Admin() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetString("user_id")

		// 检查用户是否为管理员
		db := database.GetDB()
		var isAdmin bool
		err := db.QueryRow("SELECT is_admin FROM users WHERE id = $1", userID).Scan(&isAdmin)

		if err != nil || !isAdmin {
			c.JSON(http.StatusForbidden, models.ApiResponse{
				Success:   false,
				Message:   "需要管理员权限",
				Timestamp: time.Now(),
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// RateLimit 限流中间件（简化版）
func RateLimit(maxRequests int, window time.Duration) gin.HandlerFunc {
	// 这是一个简化的内存限流实现
	// 生产环境应该使用Redis实现分布式限流
	requests := make(map[string][]time.Time)

	return func(c *gin.Context) {
		clientIP := c.ClientIP()
		now := time.Now()

		// 清理过期的请求记录
		if timestamps, exists := requests[clientIP]; exists {
			var validTimestamps []time.Time
			for _, t := range timestamps {
				if now.Sub(t) < window {
					validTimestamps = append(validTimestamps, t)
				}
			}
			requests[clientIP] = validTimestamps
		}

		// 检查请求数量
		if len(requests[clientIP]) >= maxRequests {
			c.JSON(http.StatusTooManyRequests, models.ApiResponse{
				Success:   false,
				Message:   "请求过于频繁，请稍后再试",
				Timestamp: time.Now(),
			})
			c.Abort()
			return
		}

		// 记录当前请求
		requests[clientIP] = append(requests[clientIP], now)
		c.Next()
	}
}
