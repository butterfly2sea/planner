package config

import (
	"github.com/joho/godotenv"
	"log"
	"os"
)

type Config struct {
	// 服务器配置
	Port    string
	GinMode string

	// 数据库配置
	DatabaseURL string

	// Redis配置
	RedisURL string

	// JWT配置
	JWTSecret string

	// CORS配置
	CORSOrigin string
}

var globalConfig *Config

// Load 加载配置
func Load() *Config {
	// 加载.env文件
	if err := godotenv.Load(); err != nil {
		log.Println("未找到 .env 文件，使用系统环境变量")
	}

	globalConfig = &Config{
		Port:        getEnv("PORT", "3000"),
		GinMode:     getEnv("GIN_MODE", "debug"),
		DatabaseURL: getEnv("DATABASE_URL", "postgres://postgres:password@localhost/daocheng_travel?sslmode=disable"),
		RedisURL:    getEnv("REDIS_URL", "redis://localhost:6379"),
		JWTSecret:   getEnv("JWT_SECRET", "your-secret-key"),
		CORSOrigin:  getEnv("CORS_ORIGIN", "*"),
	}

	return globalConfig
}

// Get 获取全局配置
func Get() *Config {
	if globalConfig == nil {
		return Load()
	}
	return globalConfig
}

// getEnv 获取环境变量，带默认值
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
