package database

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"time"

	_ "github.com/lib/pq"
	"github.com/redis/go-redis/v9"
)

var (
	db          *sql.DB
	redisClient *redis.Client
)

// Init 初始化数据库连接
func Init(databaseURL string) error {
	var err error

	// 连接数据库
	db, err = sql.Open("postgres", databaseURL)
	if err != nil {
		return fmt.Errorf("连接数据库失败: %v", err)
	}

	// 配置连接池
	db.SetMaxOpenConns(25)                 // 最大打开连接数
	db.SetMaxIdleConns(10)                 // 最大空闲连接数
	db.SetConnMaxLifetime(5 * time.Minute) // 连接最大生命周期
	db.SetConnMaxIdleTime(2 * time.Minute) // 连接最大空闲时间

	// 测试连接
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := db.PingContext(ctx); err != nil {
		return fmt.Errorf("数据库ping失败: %v", err)
	}

	log.Println("✅ 数据库连接成功")

	// 初始化数据库架构
	if err := initSchema(); err != nil {
		return fmt.Errorf("初始化数据库架构失败: %v", err)
	}

	return nil
}

// InitRedis 初始化Redis连接
func InitRedis(redisURL string) error {
	opt, err := redis.ParseURL(redisURL)
	if err != nil {
		return fmt.Errorf("解析Redis URL失败: %v", err)
	}

	// 设置连接池参数
	opt.PoolSize = 10
	opt.MinIdleConns = 5
	opt.MaxRetries = 3

	redisClient = redis.NewClient(opt)

	// 测试连接
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := redisClient.Ping(ctx).Err(); err != nil {
		redisClient = nil
		return fmt.Errorf("Redis ping失败: %v", err)
	}

	log.Println("✅ Redis连接成功")
	return nil
}

// GetDB 获取数据库连接
func GetDB() *sql.DB {
	return db
}

// GetRedis 获取Redis客户端
func GetRedis() *redis.Client {
	return redisClient
}

// Close 关闭数据库连接
func Close() {
	if db != nil {
		if err := db.Close(); err != nil {
			log.Printf("关闭数据库连接失败: %v", err)
		} else {
			log.Println("数据库连接已关闭")
		}
	}
}

// CloseRedis 关闭Redis连接
func CloseRedis() {
	if redisClient != nil {
		if err := redisClient.Close(); err != nil {
			log.Printf("关闭Redis连接失败: %v", err)
		} else {
			log.Println("Redis连接已关闭")
		}
	}
}

// Transaction 执行数据库事务
func Transaction(fn func(*sql.Tx) error) error {
	tx, err := db.Begin()
	if err != nil {
		return fmt.Errorf("开始事务失败: %v", err)
	}

	defer func() {
		if p := recover(); p != nil {
			_ = tx.Rollback()
			panic(p) // 重新抛出panic
		}
	}()

	if err := fn(tx); err != nil {
		if rbErr := tx.Rollback(); rbErr != nil {
			return fmt.Errorf("回滚事务失败: %v, 原始错误: %v", rbErr, err)
		}
		return err
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("提交事务失败: %v", err)
	}

	return nil
}

// HealthCheck 健康检查
func HealthCheck() map[string]string {
	result := make(map[string]string)

	// 检查PostgreSQL
	if db != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()

		if err := db.PingContext(ctx); err != nil {
			result["postgres"] = fmt.Sprintf("unhealthy: %v", err)
		} else {
			// 获取连接池统计
			stats := db.Stats()
			result["postgres"] = fmt.Sprintf("healthy (open: %d, idle: %d)",
				stats.OpenConnections, stats.Idle)
		}
	} else {
		result["postgres"] = "not connected"
	}

	// 检查Redis
	if redisClient != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()

		if err := redisClient.Ping(ctx).Err(); err != nil {
			result["redis"] = fmt.Sprintf("unhealthy: %v", err)
		} else {
			// 获取连接池统计
			stats := redisClient.PoolStats()
			result["redis"] = fmt.Sprintf("healthy (hits: %d, misses: %d, timeouts: %d)",
				stats.Hits, stats.Misses, stats.Timeouts)
		}
	} else {
		result["redis"] = "not configured"
	}

	return result
}

// initSchema 初始化数据库架构
func initSchema() error {
	schemas := []string{
		// 启用UUID扩展
		`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`,

		// 用户表
		`CREATE TABLE IF NOT EXISTS users (
			id VARCHAR(36) PRIMARY KEY,
			username VARCHAR(50) UNIQUE NOT NULL,
			email VARCHAR(100) UNIQUE NOT NULL,
			password_hash VARCHAR(255) NOT NULL,
			avatar_url TEXT,
			bio TEXT,
			is_active BOOLEAN DEFAULT true,
			is_admin BOOLEAN DEFAULT false,
			last_login_at TIMESTAMPTZ,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,

		// 计划表
		`CREATE TABLE IF NOT EXISTS plans (
			id VARCHAR(36) PRIMARY KEY,
			user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			name VARCHAR(200) NOT NULL,
			description TEXT,
			destination VARCHAR(100),
			start_date DATE,
			end_date DATE,
			budget DECIMAL(10,2),
			participants INTEGER DEFAULT 1,
			status VARCHAR(20) DEFAULT 'draft',
			visibility VARCHAR(20) DEFAULT 'private',
			tags TEXT[],
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,

		// 旅游元素表
		`CREATE TABLE IF NOT EXISTS travel_items (
			id VARCHAR(36) PRIMARY KEY,
			plan_id VARCHAR(36) NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
			item_type VARCHAR(20) NOT NULL,
			name VARCHAR(200) NOT NULL,
			description TEXT,
			latitude DECIMAL(10,6),
			longitude DECIMAL(10,6),
			altitude INTEGER,
			address TEXT,
			start_datetime TIMESTAMPTZ,
			end_datetime TIMESTAMPTZ,
			duration_hours DECIMAL(5,2),
			cost DECIMAL(10,2),
			priority INTEGER DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
			status VARCHAR(20) DEFAULT 'planned',
			booking_status VARCHAR(20),
			properties JSONB,
			images TEXT[],
			notes TEXT,
			tags TEXT[],
			order_index INTEGER,
			group_id VARCHAR(36),
			created_by VARCHAR(36) REFERENCES users(id),
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,

		// 住宿详情表
		`CREATE TABLE IF NOT EXISTS accommodation_details (
			item_id VARCHAR(36) PRIMARY KEY REFERENCES travel_items(id) ON DELETE CASCADE,
			hotel_name VARCHAR(200),
			room_type VARCHAR(100),
			check_in_time TIME,
			check_out_time TIME,
			guests_count INTEGER,
			breakfast_included BOOLEAN DEFAULT false,
			booking_platform VARCHAR(50),
			booking_number VARCHAR(100),
			booking_url TEXT,
			phone VARCHAR(50),
			email VARCHAR(100),
			rating DECIMAL(3,2) CHECK (rating >= 0 AND rating <= 5),
			amenities JSONB,
			price_per_night DECIMAL(10,2),
			total_nights INTEGER,
			taxes_fees DECIMAL(10,2),
			cancellation_policy TEXT
		)`,

		// 交通详情表
		`CREATE TABLE IF NOT EXISTS transport_details (
			item_id VARCHAR(36) PRIMARY KEY REFERENCES travel_items(id) ON DELETE CASCADE,
			transport_type VARCHAR(20),
			departure_location TEXT,
			arrival_location TEXT,
			departure_time TIMESTAMPTZ,
			arrival_time TIMESTAMPTZ,
			distance_km DECIMAL(10,2),
			booking_reference VARCHAR(100),
			carrier_name VARCHAR(100),
			vehicle_number VARCHAR(50),
			seat_number VARCHAR(20),
			route_polyline TEXT,
			elevation_profile JSONB,
			road_conditions TEXT,
			fuel_stations JSONB,
			rest_stops JSONB,
			estimated_fuel_cost DECIMAL(10,2),
			toll_cost DECIMAL(10,2),
			departure_terminal VARCHAR(100),
			arrival_terminal VARCHAR(100),
			transfer_info JSONB
		)`,

		// 景点详情表
		`CREATE TABLE IF NOT EXISTS attraction_details (
			item_id VARCHAR(36) PRIMARY KEY REFERENCES travel_items(id) ON DELETE CASCADE,
			attraction_type VARCHAR(30),
			opening_hours JSONB,
			ticket_price DECIMAL(10,2),
			ticket_type VARCHAR(50),
			advance_booking_required BOOLEAN DEFAULT false,
			best_visit_time VARCHAR(100),
			recommended_duration DECIMAL(5,2),
			difficulty_level INTEGER CHECK (difficulty_level BETWEEN 1 AND 5),
			photography_tips TEXT,
			best_photo_spots JSONB,
			sunrise_time TIME,
			sunset_time TIME,
			facilities JSONB,
			accessibility_info TEXT
		)`,

		// 元素关联表
		`CREATE TABLE IF NOT EXISTS item_relations (
			id VARCHAR(36) PRIMARY KEY,
			source_item_id VARCHAR(36) NOT NULL REFERENCES travel_items(id) ON DELETE CASCADE,
			target_item_id VARCHAR(36) NOT NULL REFERENCES travel_items(id) ON DELETE CASCADE,
			relation_type VARCHAR(30) NOT NULL,
			relation_properties JSONB,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			UNIQUE(source_item_id, target_item_id, relation_type)
		)`,

		// 附件表
		`CREATE TABLE IF NOT EXISTS item_attachments (
			id VARCHAR(36) PRIMARY KEY,
			item_id VARCHAR(36) NOT NULL REFERENCES travel_items(id) ON DELETE CASCADE,
			file_type VARCHAR(20) NOT NULL,
			file_url TEXT NOT NULL,
			file_name VARCHAR(255),
			file_size INTEGER,
			mime_type VARCHAR(100),
			title VARCHAR(200),
			description TEXT,
			is_primary BOOLEAN DEFAULT false,
			order_index INTEGER,
			uploaded_by VARCHAR(36) REFERENCES users(id),
			uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,

		// 标注表
		`CREATE TABLE IF NOT EXISTS item_annotations (
			id VARCHAR(36) PRIMARY KEY,
			item_id VARCHAR(36) NOT NULL REFERENCES travel_items(id) ON DELETE CASCADE,
			annotation_type VARCHAR(30),
			content TEXT NOT NULL,
			marker_lat DECIMAL(10,6),
			marker_lng DECIMAL(10,6),
			rating INTEGER CHECK (rating BETWEEN 1 AND 5),
			created_by VARCHAR(36) REFERENCES users(id),
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,

		// 预算项目表
		`CREATE TABLE IF NOT EXISTS budget_items (
			id VARCHAR(36) PRIMARY KEY,
			plan_id VARCHAR(36) NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
			item_id VARCHAR(36) REFERENCES travel_items(id) ON DELETE SET NULL,
			category VARCHAR(50) NOT NULL,
			description TEXT NOT NULL,
			estimated_amount DECIMAL(10,2),
			actual_amount DECIMAL(10,2),
			currency VARCHAR(10) DEFAULT 'CNY',
			payment_method VARCHAR(30),
			payment_status VARCHAR(20) DEFAULT 'pending',
			payment_date TIMESTAMPTZ,
			notes TEXT,
			receipt_url TEXT,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,

		// 创建索引
		`CREATE INDEX IF NOT EXISTS idx_plans_user_id ON plans(user_id)`,
		`CREATE INDEX IF NOT EXISTS idx_plans_status ON plans(status)`,
		`CREATE INDEX IF NOT EXISTS idx_travel_items_plan_id ON travel_items(plan_id)`,
		`CREATE INDEX IF NOT EXISTS idx_travel_items_type ON travel_items(item_type)`,
		`CREATE INDEX IF NOT EXISTS idx_travel_items_datetime ON travel_items(start_datetime)`,
		`CREATE INDEX IF NOT EXISTS idx_travel_items_status ON travel_items(status)`,
		`CREATE INDEX IF NOT EXISTS idx_item_relations_source ON item_relations(source_item_id)`,
		`CREATE INDEX IF NOT EXISTS idx_item_relations_target ON item_relations(target_item_id)`,
		`CREATE INDEX IF NOT EXISTS idx_item_attachments_item ON item_attachments(item_id)`,
		`CREATE INDEX IF NOT EXISTS idx_item_annotations_item ON item_annotations(item_id)`,
		`CREATE INDEX IF NOT EXISTS idx_budget_items_plan ON budget_items(plan_id)`,
		`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`,
		`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,

		// 创建更新时间触发器
		`CREATE OR REPLACE FUNCTION update_updated_at_column()
		RETURNS TRIGGER AS $$
		BEGIN
			NEW.updated_at = NOW();
			RETURN NEW;
		END;
		$$ language 'plpgsql'`,

		// 为需要的表添加触发器
		`DO $$ 
		BEGIN
			IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at') THEN
				CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
				FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
			END IF;
			
			IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_plans_updated_at') THEN
				CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON plans
				FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
			END IF;
			
			IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_travel_items_updated_at') THEN
				CREATE TRIGGER update_travel_items_updated_at BEFORE UPDATE ON travel_items
				FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
			END IF;
			
			IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_item_annotations_updated_at') THEN
				CREATE TRIGGER update_item_annotations_updated_at BEFORE UPDATE ON item_annotations
				FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
			END IF;
		END $$`,
	}

	// 执行所有SQL语句
	for i, schema := range schemas {
		if _, err := db.Exec(schema); err != nil {
			return fmt.Errorf("执行SQL语句 #%d 失败: %v", i+1, err)
		}
	}

	log.Println("✅ 数据库架构初始化成功")
	return nil
}
