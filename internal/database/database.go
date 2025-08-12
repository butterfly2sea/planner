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
func Init(dbURL string) error {
	var err error
	db, err = sql.Open("postgres", dbURL)
	if err != nil {
		return fmt.Errorf("无法连接数据库: %v", err)
	}

	// 设置连接池参数
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)

	// 测试连接
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := db.PingContext(ctx); err != nil {
		return fmt.Errorf("数据库 ping 失败: %v", err)
	}

	// 创建必要的表
	if err := createTables(); err != nil {
		return fmt.Errorf("创建表失败: %v", err)
	}

	log.Println("✅ 数据库连接成功")
	return nil
}

// InitRedis 初始化Redis连接
func InitRedis(redisURL string) error {
	opt, err := redis.ParseURL(redisURL)
	if err != nil {
		return fmt.Errorf("无效的 Redis URL: %v", err)
	}

	redisClient = redis.NewClient(opt)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := redisClient.Ping(ctx).Err(); err != nil {
		return fmt.Errorf("Redis ping 失败: %v", err)
	}

	log.Println("✅ Redis 连接成功")
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
		}
	}
}

// CloseRedis 关闭Redis连接
func CloseRedis() {
	if redisClient != nil {
		if err := redisClient.Close(); err != nil {
			log.Printf("关闭Redis连接失败: %v", err)
		}
	}
}

// createTables 创建必要的数据库表
func createTables() error {
	schemas := []string{
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
			priority INTEGER DEFAULT 3,
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
			rating DECIMAL(3,2),
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
			difficulty_level INTEGER,
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
			rating INTEGER,
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
		`CREATE INDEX IF NOT EXISTS idx_travel_items_plan_id ON travel_items(plan_id)`,
		`CREATE INDEX IF NOT EXISTS idx_travel_items_type ON travel_items(item_type)`,
		`CREATE INDEX IF NOT EXISTS idx_travel_items_datetime ON travel_items(start_datetime)`,
		`CREATE INDEX IF NOT EXISTS idx_item_relations_source ON item_relations(source_item_id)`,
		`CREATE INDEX IF NOT EXISTS idx_item_relations_target ON item_relations(target_item_id)`,
		`CREATE INDEX IF NOT EXISTS idx_item_attachments_item ON item_attachments(item_id)`,
		`CREATE INDEX IF NOT EXISTS idx_item_annotations_item ON item_annotations(item_id)`,
		`CREATE INDEX IF NOT EXISTS idx_budget_items_plan ON budget_items(plan_id)`,
	}

	for _, schema := range schemas {
		if _, err := db.Exec(schema); err != nil {
			return fmt.Errorf("执行SQL失败: %v", err)
		}
	}

	return nil
}
