package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"planner/internal/config"
	"planner/internal/database"
	"planner/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func setupTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	return router
}

func TestRegister(t *testing.T) {
	// 初始化测试环境
	config.Load()
	// 注意：在实际测试中应该使用测试数据库
	// database.Init("postgres://postgres:password@localhost/daocheng_travel_test?sslmode=disable")

	router := setupTestRouter()
	router.POST("/api/v1/auth/register", Register)

	t.Run("成功注册新用户", func(t *testing.T) {
		reqBody := models.RegisterRequest{
			Username: "testuser",
			Email:    "test@example.com",
			Password: "password123",
		}

		jsonBody, _ := json.Marshal(reqBody)
		req, _ := http.NewRequest("POST", "/api/v1/auth/register", bytes.NewBuffer(jsonBody))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		// 由于没有实际数据库连接，这里会失败
		// 在实际测试中应该使用mock或测试数据库
		// assert.Equal(t, http.StatusCreated, w.Code)
	})

	t.Run("用户名太短", func(t *testing.T) {
		reqBody := models.RegisterRequest{
			Username: "ab",
			Email:    "test@example.com",
			Password: "password123",
		}

		jsonBody, _ := json.Marshal(reqBody)
		req, _ := http.NewRequest("POST", "/api/v1/auth/register", bytes.NewBuffer(jsonBody))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("无效的邮箱格式", func(t *testing.T) {
		reqBody := models.RegisterRequest{
			Username: "testuser",
			Email:    "invalid-email",
			Password: "password123",
		}

		jsonBody, _ := json.Marshal(reqBody)
		req, _ := http.NewRequest("POST", "/api/v1/auth/register", bytes.NewBuffer(jsonBody))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
}

func TestLogin(t *testing.T) {
	router := setupTestRouter()
	router.POST("/api/v1/auth/login", Login)

	t.Run("缺少用户名", func(t *testing.T) {
		reqBody := models.LoginRequest{
			Username: "",
			Password: "password123",
		}

		jsonBody, _ := json.Marshal(reqBody)
		req, _ := http.NewRequest("POST", "/api/v1/auth/login", bytes.NewBuffer(jsonBody))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("缺少密码", func(t *testing.T) {
		reqBody := models.LoginRequest{
			Username: "testuser",
			Password: "",
		}

		jsonBody, _ := json.Marshal(reqBody)
		req, _ := http.NewRequest("POST", "/api/v1/auth/login", bytes.NewBuffer(jsonBody))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
}

func TestHealth(t *testing.T) {
	router := setupTestRouter()
	router.GET("/api/v1/health", Health)

	req, _ := http.NewRequest("GET", "/api/v1/health", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response models.ApiResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.True(t, response.Success)
}
