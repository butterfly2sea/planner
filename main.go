package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"planner/internal/config"
	"planner/internal/database"
	"planner/internal/middleware"
	"planner/internal/routes"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	// 加载配置
	cfg := config.Load()

	// 初始化数据库
	if err := database.Init(cfg.DatabaseURL); err != nil {
		log.Fatal("数据库初始化失败:", err)
	}
	defer database.Close()

	// 初始化Redis（可选）
	if err := database.InitRedis(cfg.RedisURL); err != nil {
		log.Printf("⚠️ Redis连接失败，某些功能可能受限: %v", err)
	} else {
		defer database.CloseRedis()
	}

	// 设置Gin模式
	if cfg.GinMode == "release" {
		gin.SetMode(gin.ReleaseMode)
	}

	// 创建路由
	router := gin.New()

	// 设置中间件
	setupMiddleware(router, cfg)

	// 设置路由
	routes.Setup(router)

	// 设置静态文件服务
	router.Static("/static", "./static")
	router.StaticFile("/", "./static/index.html")

	// 创建HTTP服务器
	srv := &http.Server{
		Addr:           ":" + cfg.Port,
		Handler:        router,
		ReadTimeout:    15 * time.Second,
		WriteTimeout:   15 * time.Second,
		IdleTimeout:    60 * time.Second,
		MaxHeaderBytes: 1 << 20, // 1 MB
	}

	// 启动服务器
	go func() {
		log.Printf("🚀 服务器运行在 http://localhost:%s\n", cfg.Port)
		log.Printf("📚 API文档: http://localhost:%s/api/v1/docs\n", cfg.Port)

		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("启动服务器失败: %v\n", err)
		}
	}()

	// 优雅关闭
	gracefulShutdown(srv)
}

func setupMiddleware(router *gin.Engine, cfg *config.Config) {
	// 日志中间件
	router.Use(gin.LoggerWithConfig(gin.LoggerConfig{
		SkipPaths: []string{"/api/v1/health"},
	}))

	// 恢复中间件
	router.Use(gin.Recovery())

	// CORS配置
	corsConfig := cors.Config{
		AllowOrigins:     []string{cfg.CORSOrigin},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization", "X-Request-ID"},
		ExposeHeaders:    []string{"Content-Length", "X-Request-ID"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}
	router.Use(cors.New(corsConfig))

	// 自定义中间件
	router.Use(middleware.RequestID())
	router.Use(middleware.ErrorHandler())
	router.Use(middleware.Timeout(30 * time.Second))
	router.Use(middleware.SecurityHeaders())
}

func gracefulShutdown(srv *http.Server) {
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("正在关闭服务器...")

	// 设置5秒的超时时间
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// 关闭HTTP服务器
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatal("服务器强制关闭:", err)
	}

	// 关闭数据库连接
	database.Close()
	database.CloseRedis()

	log.Println("服务器已关闭")
}
