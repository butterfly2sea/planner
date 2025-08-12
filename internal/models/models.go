package models

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"
)

// ==================== 通用响应 ====================

type ApiResponse struct {
	Success   bool        `json:"success"`
	Data      interface{} `json:"data,omitempty"`
	Message   string      `json:"message,omitempty"`
	Timestamp time.Time   `json:"timestamp"`
}

// ==================== 用户相关 ====================

type User struct {
	ID          string     `json:"id" db:"id"`
	Username    string     `json:"username" db:"username"`
	Email       string     `json:"email" db:"email"`
	Password    string     `json:"-" db:"password_hash"`
	AvatarURL   *string    `json:"avatar_url,omitempty" db:"avatar_url"`
	Bio         *string    `json:"bio,omitempty" db:"bio"`
	IsActive    bool       `json:"is_active" db:"is_active"`
	IsAdmin     bool       `json:"is_admin" db:"is_admin"`
	LastLoginAt *time.Time `json:"last_login_at,omitempty" db:"last_login_at"`
	CreatedAt   time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at" db:"updated_at"`
}

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type RegisterRequest struct {
	Username string `json:"username" binding:"required,min=3,max=50"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

// ==================== 计划相关 ====================

type Plan struct {
	ID           string    `json:"id" db:"id"`
	UserID       string    `json:"user_id" db:"user_id"`
	Name         string    `json:"name" db:"name"`
	Description  string    `json:"description" db:"description"`
	Destination  string    `json:"destination" db:"destination"`
	StartDate    *string   `json:"start_date" db:"start_date"`
	EndDate      *string   `json:"end_date" db:"end_date"`
	Budget       float64   `json:"budget" db:"budget"`
	Participants int       `json:"participants" db:"participants"`
	Status       string    `json:"status" db:"status"`
	Visibility   string    `json:"visibility" db:"visibility"`
	Tags         []string  `json:"tags" db:"tags"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time `json:"updated_at" db:"updated_at"`
}

// ==================== 旅游元素相关 ====================

type ItemType string

const (
	ItemTypeAccommodation ItemType = "accommodation"
	ItemTypeTransport     ItemType = "transport"
	ItemTypeAttraction    ItemType = "attraction"
	ItemTypePhotoSpot     ItemType = "photo_spot"
	ItemTypeRestArea      ItemType = "rest_area"
	ItemTypeCheckpoint    ItemType = "checkpoint"
	ItemTypeOther         ItemType = "other"
)

type TravelItem struct {
	ID            string      `json:"id" db:"id"`
	PlanID        string      `json:"plan_id" db:"plan_id"`
	ItemType      ItemType    `json:"item_type" db:"item_type"`
	Name          string      `json:"name" db:"name"`
	Description   *string     `json:"description,omitempty" db:"description"`
	Latitude      *float64    `json:"latitude,omitempty" db:"latitude"`
	Longitude     *float64    `json:"longitude,omitempty" db:"longitude"`
	Altitude      *int        `json:"altitude,omitempty" db:"altitude"`
	Address       *string     `json:"address,omitempty" db:"address"`
	StartDatetime *time.Time  `json:"start_datetime,omitempty" db:"start_datetime"`
	EndDatetime   *time.Time  `json:"end_datetime,omitempty" db:"end_datetime"`
	DurationHours *float64    `json:"duration_hours,omitempty" db:"duration_hours"`
	Cost          *float64    `json:"cost,omitempty" db:"cost"`
	Priority      int         `json:"priority" db:"priority"`
	Status        string      `json:"status" db:"status"`
	BookingStatus *string     `json:"booking_status,omitempty" db:"booking_status"`
	Properties    JSONB       `json:"properties,omitempty" db:"properties"`
	Images        []string    `json:"images,omitempty" db:"images"`
	Notes         *string     `json:"notes,omitempty" db:"notes"`
	Tags          []string    `json:"tags,omitempty" db:"tags"`
	OrderIndex    *int        `json:"order_index,omitempty" db:"order_index"`
	GroupID       *string     `json:"group_id,omitempty" db:"group_id"`
	CreatedBy     *string     `json:"created_by,omitempty" db:"created_by"`
	CreatedAt     time.Time   `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time   `json:"updated_at" db:"updated_at"`
	Details       interface{} `json:"details,omitempty"`
}

// ==================== 详细信息 ====================

type AccommodationDetails struct {
	ItemID             string   `json:"item_id" db:"item_id"`
	HotelName          *string  `json:"hotel_name,omitempty" db:"hotel_name"`
	RoomType           *string  `json:"room_type,omitempty" db:"room_type"`
	CheckInTime        *string  `json:"check_in_time,omitempty" db:"check_in_time"`
	CheckOutTime       *string  `json:"check_out_time,omitempty" db:"check_out_time"`
	GuestsCount        *int     `json:"guests_count,omitempty" db:"guests_count"`
	BreakfastIncluded  bool     `json:"breakfast_included" db:"breakfast_included"`
	BookingPlatform    *string  `json:"booking_platform,omitempty" db:"booking_platform"`
	BookingNumber      *string  `json:"booking_number,omitempty" db:"booking_number"`
	BookingURL         *string  `json:"booking_url,omitempty" db:"booking_url"`
	Phone              *string  `json:"phone,omitempty" db:"phone"`
	Email              *string  `json:"email,omitempty" db:"email"`
	Rating             *float64 `json:"rating,omitempty" db:"rating"`
	Amenities          JSONB    `json:"amenities,omitempty" db:"amenities"`
	PricePerNight      *float64 `json:"price_per_night,omitempty" db:"price_per_night"`
	TotalNights        *int     `json:"total_nights,omitempty" db:"total_nights"`
	TaxesFees          *float64 `json:"taxes_fees,omitempty" db:"taxes_fees"`
	CancellationPolicy *string  `json:"cancellation_policy,omitempty" db:"cancellation_policy"`
}

type TransportDetails struct {
	ItemID            string     `json:"item_id" db:"item_id"`
	TransportType     *string    `json:"transport_type,omitempty" db:"transport_type"`
	DepartureLocation *string    `json:"departure_location,omitempty" db:"departure_location"`
	ArrivalLocation   *string    `json:"arrival_location,omitempty" db:"arrival_location"`
	DepartureTime     *time.Time `json:"departure_time,omitempty" db:"departure_time"`
	ArrivalTime       *time.Time `json:"arrival_time,omitempty" db:"arrival_time"`
	DistanceKm        *float64   `json:"distance_km,omitempty" db:"distance_km"`
	BookingReference  *string    `json:"booking_reference,omitempty" db:"booking_reference"`
	CarrierName       *string    `json:"carrier_name,omitempty" db:"carrier_name"`
	VehicleNumber     *string    `json:"vehicle_number,omitempty" db:"vehicle_number"`
	SeatNumber        *string    `json:"seat_number,omitempty" db:"seat_number"`
	RoutePolyline     *string    `json:"route_polyline,omitempty" db:"route_polyline"`
	EstimatedFuelCost *float64   `json:"estimated_fuel_cost,omitempty" db:"estimated_fuel_cost"`
	TollCost          *float64   `json:"toll_cost,omitempty" db:"toll_cost"`
	DepartureTerminal *string    `json:"departure_terminal,omitempty" db:"departure_terminal"`
	ArrivalTerminal   *string    `json:"arrival_terminal,omitempty" db:"arrival_terminal"`
}

type AttractionDetails struct {
	ItemID                 string   `json:"item_id" db:"item_id"`
	AttractionType         *string  `json:"attraction_type,omitempty" db:"attraction_type"`
	TicketPrice            *float64 `json:"ticket_price,omitempty" db:"ticket_price"`
	TicketType             *string  `json:"ticket_type,omitempty" db:"ticket_type"`
	AdvanceBookingRequired bool     `json:"advance_booking_required" db:"advance_booking_required"`
	BestVisitTime          *string  `json:"best_visit_time,omitempty" db:"best_visit_time"`
	RecommendedDuration    *float64 `json:"recommended_duration,omitempty" db:"recommended_duration"`
	DifficultyLevel        *int     `json:"difficulty_level,omitempty" db:"difficulty_level"`
	PhotographyTips        *string  `json:"photography_tips,omitempty" db:"photography_tips"`
	SunriseTime            *string  `json:"sunrise_time,omitempty" db:"sunrise_time"`
	SunsetTime             *string  `json:"sunset_time,omitempty" db:"sunset_time"`
	AccessibilityInfo      *string  `json:"accessibility_info,omitempty" db:"accessibility_info"`
}

// ==================== 关联和标注 ====================

type ItemRelation struct {
	ID                 string    `json:"id" db:"id"`
	SourceItemID       string    `json:"source_item_id" db:"source_item_id"`
	TargetItemID       string    `json:"target_item_id" db:"target_item_id"`
	RelationType       string    `json:"relation_type" db:"relation_type"`
	RelationProperties JSONB     `json:"relation_properties,omitempty" db:"relation_properties"`
	CreatedAt          time.Time `json:"created_at" db:"created_at"`
}

type ItemAttachment struct {
	ID          string    `json:"id" db:"id"`
	ItemID      string    `json:"item_id" db:"item_id"`
	FileType    string    `json:"file_type" db:"file_type"`
	FileURL     string    `json:"file_url" db:"file_url"`
	FileName    *string   `json:"file_name,omitempty" db:"file_name"`
	FileSize    *int      `json:"file_size,omitempty" db:"file_size"`
	MimeType    *string   `json:"mime_type,omitempty" db:"mime_type"`
	Title       *string   `json:"title,omitempty" db:"title"`
	Description *string   `json:"description,omitempty" db:"description"`
	IsPrimary   bool      `json:"is_primary" db:"is_primary"`
	OrderIndex  *int      `json:"order_index,omitempty" db:"order_index"`
	UploadedBy  *string   `json:"uploaded_by,omitempty" db:"uploaded_by"`
	UploadedAt  time.Time `json:"uploaded_at" db:"uploaded_at"`
}

type ItemAnnotation struct {
	ID             string    `json:"id" db:"id"`
	ItemID         string    `json:"item_id" db:"item_id"`
	AnnotationType *string   `json:"annotation_type,omitempty" db:"annotation_type"`
	Content        string    `json:"content" db:"content"`
	MarkerLat      *float64  `json:"marker_lat,omitempty" db:"marker_lat"`
	MarkerLng      *float64  `json:"marker_lng,omitempty" db:"marker_lng"`
	Rating         *int      `json:"rating,omitempty" db:"rating"`
	CreatedBy      *string   `json:"created_by,omitempty" db:"created_by"`
	CreatedAt      time.Time `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time `json:"updated_at" db:"updated_at"`
}

// ==================== 请求模型 ====================

type CreateTravelItemRequest struct {
	ItemType             ItemType              `json:"item_type" binding:"required"`
	Name                 string                `json:"name" binding:"required"`
	Description          *string               `json:"description"`
	Latitude             *float64              `json:"latitude"`
	Longitude            *float64              `json:"longitude"`
	Address              *string               `json:"address"`
	StartDatetime        *time.Time            `json:"start_datetime"`
	EndDatetime          *time.Time            `json:"end_datetime"`
	DurationHours        *float64              `json:"duration_hours"`
	Cost                 *float64              `json:"cost"`
	Priority             *int                  `json:"priority"`
	Status               *string               `json:"status"`
	Properties           JSONB                 `json:"properties"`
	AccommodationDetails *AccommodationDetails `json:"accommodation_details,omitempty"`
	TransportDetails     *TransportDetails     `json:"transport_details,omitempty"`
	AttractionDetails    *AttractionDetails    `json:"attraction_details,omitempty"`
}

type UpdateTravelItemRequest struct {
	Name                 *string               `json:"name"`
	Description          *string               `json:"description"`
	Latitude             *float64              `json:"latitude"`
	Longitude            *float64              `json:"longitude"`
	Address              *string               `json:"address"`
	StartDatetime        *time.Time            `json:"start_datetime"`
	EndDatetime          *time.Time            `json:"end_datetime"`
	DurationHours        *float64              `json:"duration_hours"`
	Cost                 *float64              `json:"cost"`
	Priority             *int                  `json:"priority"`
	Status               *string               `json:"status"`
	Properties           JSONB                 `json:"properties"`
	AccommodationDetails *AccommodationDetails `json:"accommodation_details,omitempty"`
	TransportDetails     *TransportDetails     `json:"transport_details,omitempty"`
	AttractionDetails    *AttractionDetails    `json:"attraction_details,omitempty"`
}

// ==================== 响应模型 ====================

type TravelItemListResponse struct {
	Items    []TravelItem `json:"items"`
	Total    int          `json:"total"`
	Page     int          `json:"page"`
	PageSize int          `json:"page_size"`
	HasMore  bool         `json:"has_more"`
}

type DailyItinerary struct {
	Date      string       `json:"date"`
	Items     []TravelItem `json:"items"`
	TotalCost float64      `json:"total_cost"`
	StartTime *time.Time   `json:"start_time"`
	EndTime   *time.Time   `json:"end_time"`
}

type PlanSummary struct {
	PlanID            string    `json:"plan_id"`
	TotalItems        int       `json:"total_items"`
	TotalCost         float64   `json:"total_cost"`
	EstimatedCost     float64   `json:"estimated_cost"`
	AccommodationDays int       `json:"accommodation_days"`
	TransportCount    int       `json:"transport_count"`
	AttractionCount   int       `json:"attraction_count"`
	StartDate         time.Time `json:"start_date"`
	EndDate           time.Time `json:"end_date"`
	Duration          int       `json:"duration_days"`
}

// ==================== 辅助类型 ====================

// JSONB 处理JSON数据库字段
type JSONB map[string]interface{}

func (j JSONB) Value() (driver.Value, error) {
	if j == nil {
		return nil, nil
	}
	return json.Marshal(j)
}

func (j *JSONB) Scan(value interface{}) error {
	if value == nil {
		*j = nil
		return nil
	}
	bytes, ok := value.([]byte)
	if !ok {
		return fmt.Errorf("cannot scan %T into JSONB", value)
	}
	return json.Unmarshal(bytes, j)
}
