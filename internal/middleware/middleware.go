package middleware

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"strings"
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

			// 记录错误日志
			requestID, _ := c.Get("request_id")
			log.Printf("[ERROR] RequestID: %v, Error: %v", requestID, err)

			// 根据错误类型返回不同的状态码
			statusCode := http.StatusInternalServerError
			message := "服务器内部错误"

			// 可以根据错误类型定制响应
			if err.IsType(gin.ErrorTypeBind) {
				statusCode = http.StatusBadRequest
				message = "请求参数错误"
			} else if err.IsType(gin.ErrorTypePublic) {
				message = err.Error()
			}

			c.JSON(statusCode, models.ApiResponse{
				Success:   false,
				Message:   message,
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

		// 使用channel来处理超时
		done := make(chan struct{})
		go func() {
			c.Next()
			close(done)
		}()

		select {
		case <-done:
			// 请求正常完成
		case <-ctx.Done():
			// 请求超时
			c.AbortWithStatusJSON(http.StatusRequestTimeout, models.ApiResponse{
				Success:   false,
				Message:   "请求超时",
				Timestamp: time.Now(),
			})
		}
	}
}

// SecurityHeaders 安全头中间件
func SecurityHeaders() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-Frame-Options", "DENY")
		c.Header("X-XSS-Protection", "1; mode=block")
		c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		c.Header("Content-Security-Policy", "default-src 'self'")
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Header("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
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
		tokenString = strings.TrimPrefix(tokenString, "Bearer ")
		tokenString = strings.TrimSpace(tokenString)

		// 解析JWT
		cfg := config.Get()
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			// 验证签名方法
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("意外的签名方法: %v", token.Header["alg"])
			}
			return []byte(cfg.JWTSecret), nil
		})

		if err != nil {
			c.JSON(http.StatusUnauthorized, models.ApiResponse{
				Success:   false,
				Message:   "无效的令牌: " + err.Error(),
				Timestamp: time.Now(),
			})
			c.Abort()
			return
		}

		if !token.Valid {
			c.JSON(http.StatusUnauthorized, models.ApiResponse{
				Success:   false,
				Message:   "令牌已失效",
				Timestamp: time.Now(),
			})
			c.Abort()
			return
		}

		// 提取用户信息
		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			c.JSON(http.StatusUnauthorized, models.ApiResponse{
				Success:   false,
				Message:   "无效的令牌格式",
				Timestamp: time.Now(),
			})
			c.Abort()
			return
		}

		// 验证必要的claims
		userID, ok := claims["user_id"].(string)
		if !ok || userID == "" {
			c.JSON(http.StatusUnauthorized, models.ApiResponse{
				Success:   false,
				Message:   "令牌缺少用户信息",
				Timestamp: time.Now(),
			})
			c.Abort()
			return
		}

		// 检查token是否即将过期（提前5分钟）
		if exp, ok := claims["exp"].(float64); ok {
			expirationTime := time.Unix(int64(exp), 0)
			if time.Until(expirationTime) < 5*time.Minute {
				// 设置标记，提示客户端需要刷新token
				c.Header("X-Token-Refresh-Required", "true")
			}
		}

		// 可选：验证用户是否仍然存在且活跃
		db := database.GetDB()
		var isActive bool
		err = db.QueryRow("SELECT is_active FROM users WHERE id = $1", userID).Scan(&isActive)
		if err != nil || !isActive {
			c.JSON(http.StatusUnauthorized, models.ApiResponse{
				Success:   false,
				Message:   "用户账户无效或已被禁用",
				Timestamp: time.Now(),
			})
			c.Abort()
			return
		}

		// 设置用户信息到上下文
		c.Set("user_id", userID)
		c.Set("username", claims["username"])
		c.Set("email", claims["email"])
		c.Next()
	}
}

// Admin 管理员权限中间件
func Admin() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetString("user_id")
		if userID == "" {
			c.JSON(http.StatusUnauthorized, models.ApiResponse{
				Success:   false,
				Message:   "未认证用户",
				Timestamp: time.Now(),
			})
			c.Abort()
			return
		}

		// 检查管理员权限
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

// RateLimit 速率限制中间件
func RateLimit(requestsPerMinute int) gin.HandlerFunc {
	// 简单的内存实现，生产环境应使用Redis
	rateLimiter := make(map[string][]time.Time)

	return func(c *gin.Context) {
		// 使用IP地址或用户ID作为限制键
		key := c.ClientIP()
		if userID := c.GetString("user_id"); userID != "" {
			key = userID
		}

		now := time.Now()
		windowStart := now.Add(-time.Minute)

		// 清理过期的请求记录
		if requests, exists := rateLimiter[key]; exists {
			validRequests := []time.Time{}
			for _, reqTime := range requests {
				if reqTime.After(windowStart) {
					validRequests = append(validRequests, reqTime)
				}
			}
			rateLimiter[key] = validRequests
		}

		// 检查是否超过限制
		if len(rateLimiter[key]) >= requestsPerMinute {
			c.JSON(http.StatusTooManyRequests, models.ApiResponse{
				Success:   false,
				Message:   "请求过于频繁，请稍后再试",
				Timestamp: time.Now(),
			})
			c.Abort()
			return
		}

		// 记录当前请求
		rateLimiter[key] = append(rateLimiter[key], now)
		c.Next()
	}
}

// Logger 日志中间件
func Logger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		raw := c.Request.URL.RawQuery

		// 处理请求
		c.Next()

		// 记录日志
		latency := time.Since(start)
		clientIP := c.ClientIP()
		method := c.Request.Method
		statusCode := c.Writer.Status()

		if raw != "" {
			path = path + "?" + raw
		}

		requestID, _ := c.Get("request_id")
		userID, _ := c.Get("user_id")

		log.Printf("[%s] %s %s %d %v | User: %v | RequestID: %v | Latency: %v",
			clientIP,
			method,
			path,
			statusCode,
			c.Errors.String(),
			userID,
			requestID,
			latency,
		)
	}
}
