#!/bin/bash

# =====================================================
# 2025四川西部深度游数据导入脚本（修正版）
# 使用方法: ./sichuan_deep_tour.sh [user_id]
# =====================================================

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 默认配置
DEFAULT_USER_ID="0a410df6-2768-4f10-96e7-935579fe5978"
DB_NAME="daocheng_travel"
DB_USER="postgres"
DB_HOST="localhost"
DB_PORT="5432"
DB_PASSWORD="password"

# 获取参数
USER_ID=${1:-$DEFAULT_USER_ID}
FORCE_IMPORT=${2:-"false"}

print_message() {
    echo -e "${2}${1}${NC}"
}

print_title() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}   $1${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

check_database_connection() {
    print_message "正在检查数据库连接..." "$YELLOW"
    if PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c '\q' 2>/dev/null; then
        print_message "✓ 数据库连接成功" "$GREEN"
        return 0
    else
        print_message "✗ 数据库连接失败，请检查配置" "$RED"
        exit 1
    fi
}

ensure_user_exists() {
    local user_id=$1
    local username=${2:-"admin"}
    local email=${3:-"${username}@example.com"}

    print_message "检查用户是否存在: $user_id" "$YELLOW"

    local user_exists=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM users WHERE id = '$user_id'" 2>/dev/null | tr -d ' ')

    if [ "$user_exists" = "0" ] || [ -z "$user_exists" ]; then
        print_message "用户不存在，正在创建用户: $user_id" "$YELLOW"

        PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME <<EOF
INSERT INTO users (
    id, username, email, password_hash,
    is_active, is_admin, created_at, updated_at
) VALUES (
    '$user_id',
    '$username',
    '$email',
    '\$2a\$10\$2l.tRXHl8ElZ1cKgBTfmyuMnUeG0tNkO8UEIKcP2.x5bc1rsWgcCC',
    true,
    false,
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;
EOF

        if [ $? -eq 0 ]; then
            print_message "✓ 用户创建成功" "$GREEN"
        else
            print_message "✗ 用户创建失败" "$RED"
            exit 1
        fi
    else
        print_message "✓ 用户已存在" "$GREEN"
    fi
}

import_sichuan_tour() {
    print_message "开始导入四川西部深度游数据..." "$YELLOW"

    local plan_id="plan_sc_$(date +%Y%m%d)"

    ensure_user_exists "$USER_ID" "admin" "admin@example.com"

PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME <<EOF
BEGIN;

-- ==========================================
-- 1. 创建主计划
-- ==========================================
INSERT INTO plans (
    id, user_id, name, description, destination,
    start_date, end_date, budget, participants,
    status, visibility, tags, created_at, updated_at
) VALUES (
    '$plan_id',
    '$USER_ID',
    '2025四川西部深度游：稻城亚丁+色达+四姑娘山+墨石公园+甘孜',
    '深秋川西高原自驾之旅，涵盖四姑娘山、色达佛学院、墨石公园、甘孜白利寺、稻城亚丁三神山、新都桥等精华景点',
    '四川西部',
    '2025-09-29',
    '2025-10-10',
    32000.00,
    2,
    'planned',
    'private',
    ARRAY['深度游', '摄影', '高原', '雪山', '佛教', '自驾'],
    NOW(),
    NOW()
);

-- ==========================================
-- Day 1: 北京→成都
-- ==========================================

-- 去程航班
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    latitude, longitude, altitude, address,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, order_index, created_by, created_at, updated_at
) VALUES (
    'sc01_flight_bj_cd',
    '$plan_id',
    'transport',
    '北京-成都航班 CA4113',
    '中国国航CA4113，北京T3→成都T2',
    39.5098, 116.4105, 50, '北京首都T3',
    '2025-09-29 19:50:00',
    '2025-09-29 23:05:00',
    3.25,
    1200.00,
    5,
    'planned',
    1,
    '$USER_ID',
    NOW(),
    NOW()
);

INSERT INTO transport_details (
    item_id, transport_type, departure_location, arrival_location,
    departure_time, arrival_time, carrier_name, vehicle_number,
    departure_terminal, arrival_terminal
) VALUES (
    'sc01_flight_bj_cd',
    'flight',
    '北京首都国际机场T3',
    '成都双流国际机场T2',
    '2025-09-29 19:50:00',
    '2025-09-29 23:05:00',
    '中国国航',
    'CA4113',
    'T3',
    'T2'
);

-- 成都住宿
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    latitude, longitude, altitude, address,
    start_datetime, end_datetime,
    cost, priority, status, order_index, created_by, created_at, updated_at
) VALUES (
    'sc02_hotel_cd_d1',
    '$plan_id',
    'accommodation',
    '成都春熙路亚朵酒店',
    '位于市中心，交通便利，次日取车方便',
    30.6598, 104.0805, 500, '成都锦江区春熙路',
    '2025-09-30 00:30:00',
    '2025-09-30 12:00:00',
    480.00,
    5,
    'planned',
    2,
    '$USER_ID',
    NOW(),
    NOW()
);

INSERT INTO accommodation_details (
    item_id, hotel_name, room_type, check_in_time, check_out_time,
    guests_count, breakfast_included, phone, rating, price_per_night, total_nights
) VALUES (
    'sc02_hotel_cd_d1',
    '成都春熙路亚朵酒店',
    '高级大床房',
    '14:00',
    '12:00',
    2,
    true,
    '028-86688888',
    4.8,
    480.00,
    1
);

-- ==========================================
-- Day 2: 成都→四姑娘山
-- ==========================================

-- 租车
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, order_index, created_by, created_at, updated_at
) VALUES (
    'sc03_car_rental',
    '$plan_id',
    'transport',
    '租车服务（11天）',
    '租用四驱SUV，包含全险和道路救援',
    '2025-09-30 09:00:00',
    '2025-10-10 06:00:00',
    264.0,
    8500.00,
    5,
    'planned',
    3,
    '$USER_ID',
    NOW(),
    NOW()
);

-- 成都到四姑娘山
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    latitude, longitude, altitude, address,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, order_index, created_by, created_at, updated_at
) VALUES (
    'sc04_drive_cd_sgn',
    '$plan_id',
    'transport',
    '成都→四姑娘山',
    '经都汶高速→303省道，230公里',
    31.0783, 102.8947, 3200, '四姑娘山日隆镇',
    '2025-09-30 09:30:00',
    '2025-09-30 14:30:00',
    5.0,
    220.00,
    5,
    'planned',
    4,
    '$USER_ID',
    NOW(),
    NOW()
);

INSERT INTO transport_details (
    item_id, transport_type, departure_location, arrival_location,
    departure_time, arrival_time, distance_km, estimated_fuel_cost, toll_cost
) VALUES (
    'sc04_drive_cd_sgn',
    'self_drive',
    '成都市',
    '四姑娘山日隆镇',
    '2025-09-30 09:30:00',
    '2025-09-30 14:30:00',
    230.0,
    180.00,
    40.00
);

-- 双桥沟游览
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    latitude, longitude, altitude, address,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, order_index, created_by, created_at, updated_at
) VALUES (
    'sc05_shuangqiao_valley',
    '$plan_id',
    'attraction',
    '四姑娘山双桥沟',
    '观赏彩林和雪山，乘观光车游览',
    31.0890, 102.8634, 3200, '双桥沟景区',
    '2025-09-30 15:00:00',
    '2025-09-30 18:00:00',
    3.0,
    120.00,
    5,
    'planned',
    5,
    '$USER_ID',
    NOW(),
    NOW()
);

INSERT INTO attraction_details (
    item_id, attraction_type, ticket_price, ticket_type,
    best_visit_time, recommended_duration, difficulty_level, photography_tips
) VALUES (
    'sc05_shuangqiao_valley',
    'valley_scenery',
    120.00,
    '门票+观光车',
    '下午15:00-18:00',
    3.0,
    2,
    '秋季彩林拍摄建议使用偏振镜增强色彩对比度'
);

-- 四姑娘山住宿
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    latitude, longitude, altitude, address,
    start_datetime, end_datetime,
    cost, priority, status, order_index, created_by, created_at, updated_at
) VALUES (
    'sc06_hotel_sgn',
    '$plan_id',
    'accommodation',
    '四姑娘山悦山酒店',
    '可观四姑娘山日出，配备供氧设备',
    31.0783, 102.8947, 3200, '日隆镇银龙街',
    '2025-09-30 21:00:00',
    '2025-10-01 09:00:00',
    680.00,
    5,
    'planned',
    6,
    '$USER_ID',
    NOW(),
    NOW()
);

INSERT INTO accommodation_details (
    item_id, hotel_name, room_type, check_in_time, check_out_time,
    guests_count, breakfast_included, phone, rating, price_per_night, total_nights
) VALUES (
    'sc06_hotel_sgn',
    '四姑娘山悦山酒店',
    '山景大床房',
    '14:00',
    '12:00',
    2,
    true,
    '0837-2791688',
    4.6,
    680.00,
    1
);

-- ==========================================
-- Day 3: 四姑娘山→马尔康
-- ==========================================

-- 长坪沟徒步
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    latitude, longitude, altitude, address,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, order_index, created_by, created_at, updated_at
) VALUES (
    'sc07_changping_valley',
    '$plan_id',
    'attraction',
    '四姑娘山长坪沟',
    '原始森林徒步，秋季彩林观赏',
    31.1089, 102.8723, 3200, '长坪沟景区',
    '2025-10-01 08:30:00',
    '2025-10-01 13:00:00',
    4.5,
    70.00,
    5,
    'planned',
    7,
    '$USER_ID',
    NOW(),
    NOW()
);

INSERT INTO attraction_details (
    item_id, attraction_type, ticket_price, ticket_type,
    best_visit_time, recommended_duration, difficulty_level, photography_tips
) VALUES (
    'sc07_changping_valley',
    'hiking_trail',
    70.00,
    '门票+观光车',
    '上午8:30-13:00',
    4.5,
    3,
    '拍摄彩林建议逆光或侧光，突出叶片的通透感'
);

-- 骑马服务（可选）
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, order_index, created_by, created_at, updated_at
) VALUES (
    'sc08_horse_riding',
    '$plan_id',
    'other',
    '长坪沟骑马服务',
    '从喇嘛寺骑马往返木骡子',
    '2025-10-01 09:00:00',
    '2025-10-01 12:30:00',
    3.5,
    300.00,
    4,
    'optional',
    8,
    '$USER_ID',
    NOW(),
    NOW()
);

-- 前往马尔康
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    latitude, longitude, altitude, address,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, order_index, created_by, created_at, updated_at
) VALUES (
    'sc09_drive_sgn_mk',
    '$plan_id',
    'transport',
    '四姑娘山→马尔康',
    '经317国道，途径梦笔山垭口',
    31.9058, 102.2070, 2633, '马尔康市',
    '2025-10-01 15:00:00',
    '2025-10-01 18:30:00',
    3.5,
    150.00,
    5,
    'planned',
    9,
    '$USER_ID',
    NOW(),
    NOW()
);

INSERT INTO transport_details (
    item_id, transport_type, departure_location, arrival_location,
    departure_time, arrival_time, distance_km, estimated_fuel_cost
) VALUES (
    'sc09_drive_sgn_mk',
    'self_drive',
    '四姑娘山日隆镇',
    '马尔康市',
    '2025-10-01 15:00:00',
    '2025-10-01 18:30:00',
    150.0,
    120.00
);

-- 马尔康住宿
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    latitude, longitude, altitude, address,
    start_datetime, end_datetime,
    cost, priority, status, order_index, created_by, created_at, updated_at
) VALUES (
    'sc10_hotel_mk',
    '$plan_id',
    'accommodation',
    '马尔康嘉绒大酒店',
    '海拔较低，有利于休息调整',
    31.9058, 102.2070, 2633, '马尔康市团结街',
    '2025-10-01 21:00:00',
    '2025-10-02 09:00:00',
    450.00,
    4,
    'planned',
    10,
    '$USER_ID',
    NOW(),
    NOW()
);

INSERT INTO accommodation_details (
    item_id, hotel_name, room_type, check_in_time, check_out_time,
    guests_count, breakfast_included, phone, rating, price_per_night, total_nights
) VALUES (
    'sc10_hotel_mk',
    '马尔康嘉绒大酒店',
    '豪华标间',
    '14:00',
    '12:00',
    2,
    true,
    '0837-2822888',
    4.3,
    450.00,
    1
);

-- ==========================================
-- Day 4: 马尔康→色达
-- ==========================================

-- 前往色达
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    latitude, longitude, altitude, address,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, order_index, created_by, created_at, updated_at
) VALUES (
    'sc11_drive_mk_sd',
    '$plan_id',
    'transport',
    '马尔康→色达县',
    '经317国道，沿途高原草甸风光',
    32.2685, 100.3290, 3880, '色达县',
    '2025-10-02 09:30:00',
    '2025-10-02 14:00:00',
    4.5,
    200.00,
    5,
    'planned',
    11,
    '$USER_ID',
    NOW(),
    NOW()
);

INSERT INTO transport_details (
    item_id, transport_type, departure_location, arrival_location,
    departure_time, arrival_time, distance_km, estimated_fuel_cost
) VALUES (
    'sc11_drive_mk_sd',
    'self_drive',
    '马尔康市',
    '色达县',
    '2025-10-02 09:30:00',
    '2025-10-02 14:00:00',
    190.0,
    150.00
);

-- 色达五明佛学院
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    latitude, longitude, altitude, address,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, order_index, created_by, created_at, updated_at
) VALUES (
    'sc12_seda_academy',
    '$plan_id',
    'attraction',
    '色达五明佛学院',
    '世界最大藏传佛学院，万余僧舍依山而建',
    32.2396, 100.3677, 4000, '色达五明佛学院',
    '2025-10-02 15:30:00',
    '2025-10-02 18:30:00',
    3.0,
    0.00,
    5,
    'planned',
    12,
    '$USER_ID',
    NOW(),
    NOW()
);

INSERT INTO attraction_details (
    item_id, attraction_type, ticket_price, ticket_type,
    best_visit_time, recommended_duration, difficulty_level, photography_tips
) VALUES (
    'sc12_seda_academy',
    'religious_site',
    0.00,
    '免费',
    '下午15:30-18:30',
    3.0,
    3,
    '拍摄僧舍群建议使用长焦镜头，保持距离尊重僧人'
);

-- 色达住宿
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    latitude, longitude, altitude, address,
    start_datetime, end_datetime,
    cost, priority, status, order_index, created_by, created_at, updated_at
) VALUES (
    'sc13_hotel_sd',
    '$plan_id',
    'accommodation',
    '色达圣地大酒店',
    '县城内较好酒店，配备供氧设备',
    32.2685, 100.3290, 3880, '色达县团结路',
    '2025-10-02 21:00:00',
    '2025-10-03 09:00:00',
    420.00,
    5,
    'planned',
    13,
    '$USER_ID',
    NOW(),
    NOW()
);

INSERT INTO accommodation_details (
    item_id, hotel_name, room_type, check_in_time, check_out_time,
    guests_count, breakfast_included, phone, rating, price_per_night, total_nights
) VALUES (
    'sc13_hotel_sd',
    '色达圣地大酒店',
    '标准间',
    '14:00',
    '12:00',
    2,
    true,
    '0836-8522998',
    4.1,
    420.00,
    1
);

-- ==========================================
-- Day 5: 色达→墨石公园→甘孜
-- ==========================================

-- 前往墨石公园
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    latitude, longitude, altitude, address,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, order_index, created_by, created_at, updated_at
) VALUES (
    'sc14_drive_sd_ms',
    '$plan_id',
    'transport',
    '色达→墨石公园',
    '经317→248国道，前往奇特石林景观',
    31.2167, 101.1333, 3500, '道孚县墨石公园',
    '2025-10-03 09:30:00',
    '2025-10-03 13:00:00',
    3.5,
    160.00,
    5,
    'planned',
    14,
    '$USER_ID',
    NOW(),
    NOW()
);

-- 墨石公园游览
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    latitude, longitude, altitude, address,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, order_index, created_by, created_at, updated_at
) VALUES (
    'sc15_moshi_park',
    '$plan_id',
    'attraction',
    '墨石公园景区',
    '全球唯一糜棱岩石林，黑色石林奇观',
    31.2167, 101.1333, 3500, '墨石公园景区',
    '2025-10-03 13:30:00',
    '2025-10-03 16:30:00',
    3.0,
    60.00,
    5,
    'planned',
    15,
    '$USER_ID',
    NOW(),
    NOW()
);

INSERT INTO attraction_details (
    item_id, attraction_type, ticket_price, ticket_type,
    best_visit_time, recommended_duration, difficulty_level, photography_tips
) VALUES (
    'sc15_moshi_park',
    'geological_park',
    60.00,
    '门票',
    '13:30-16:30中午阳光最佳',
    3.0,
    2,
    '黑色石林适合强光拍摄，建议使用偏振镜增强对比度'
);

-- 前往甘孜
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    latitude, longitude, altitude, address,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, order_index, created_by, created_at, updated_at
) VALUES (
    'sc16_drive_ms_gz',
    '$plan_id',
    'transport',
    '墨石公园→甘孜县',
    '前往甘孜县，藏传佛教文化中心',
    31.6167, 99.9833, 3380, '甘孜县',
    '2025-10-03 17:00:00',
    '2025-10-03 18:30:00',
    1.5,
    80.00,
    4,
    'planned',
    16,
    '$USER_ID',
    NOW(),
    NOW()
);

-- 甘孜县城游览
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    latitude, longitude, altitude, address,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, order_index, created_by, created_at, updated_at
) VALUES (
    'sc17_ganzi_city',
    '$plan_id',
    'attraction',
    '甘孜县城及白利寺',
    '参观甘孜县城和白利寺，了解康巴文化',
    31.6167, 99.9833, 3380, '甘孜县城',
    '2025-10-03 19:00:00',
    '2025-10-03 20:30:00',
    1.5,
    0.00,
    4,
    'planned',
    17,
    '$USER_ID',
    NOW(),
    NOW()
);

INSERT INTO attraction_details (
    item_id, attraction_type, ticket_price, ticket_type,
    best_visit_time, recommended_duration, difficulty_level
) VALUES (
    'sc17_ganzi_city',
    'cultural_site',
    0.00,
    '免费',
    '傍晚19:00-20:30',
    1.5,
    1
);

-- 甘孜住宿
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    latitude, longitude, altitude, address,
    start_datetime, end_datetime,
    cost, priority, status, order_index, created_by, created_at, updated_at
) VALUES (
    'sc18_hotel_gz',
    '$plan_id',
    'accommodation',
    '甘孜雪域大酒店',
    '设施完善，海拔适中',
    31.6167, 99.9833, 3380, '甘孜县团结路',
    '2025-10-03 22:30:00',
    '2025-10-04 09:00:00',
    480.00,
    4,
    'planned',
    18,
    '$USER_ID',
    NOW(),
    NOW()
);

INSERT INTO accommodation_details (
    item_id, hotel_name, room_type, check_in_time, check_out_time,
    guests_count, breakfast_included, phone, rating, price_per_night, total_nights
) VALUES (
    'sc18_hotel_gz',
    '甘孜雪域大酒店',
    '豪华标间',
    '14:00',
    '12:00',
    2,
    true,
    '0836-7522888',
    4.4,
    480.00,
    1
);

-- ==========================================
-- Day 6: 甘孜→理塘
-- ==========================================

-- 前往理塘
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    latitude, longitude, altitude, address,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, order_index, created_by, created_at, updated_at
) VALUES (
    'sc19_drive_gz_lt',
    '$plan_id',
    'transport',
    '甘孜→理塘',
    '前往世界高城理塘，海拔4014米',
    29.9999, 100.2687, 4014, '理塘县',
    '2025-10-04 09:30:00',
    '2025-10-04 14:30:00',
    5.0,
    200.00,
    5,
    'planned',
    19,
    '$USER_ID',
    NOW(),
    NOW()
);

-- 毛垭大草原
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    latitude, longitude, altitude, address,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, order_index, created_by, created_at, updated_at
) VALUES (
    'sc20_maoya_grassland',
    '$plan_id',
    'attraction',
    '理塘毛垭大草原',
    '中国最美高原草原之一',
    29.9742, 100.3156, 4000, '毛垭大草原',
    '2025-10-04 16:00:00',
    '2025-10-04 18:00:00',
    2.0,
    0.00,
    5,
    'planned',
    20,
    '$USER_ID',
    NOW(),
    NOW()
);

INSERT INTO attraction_details (
    item_id, attraction_type, ticket_price, ticket_type,
    best_visit_time, recommended_duration, difficulty_level, photography_tips
) VALUES (
    'sc20_maoya_grassland',
    'grassland',
    0.00,
    '免费',
    '黄昏16:00-18:00',
    2.0,
    2,
    '拍摄草原建议使用广角镜头展现辽阔感，黄昏时分暖光最美'
);

-- 理塘住宿
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    latitude, longitude, altitude, address,
    start_datetime, end_datetime,
    cost, priority, status, order_index, created_by, created_at, updated_at
) VALUES (
    'sc21_hotel_lt',
    '$plan_id',
    'accommodation',
    '理塘康巴大酒店',
    '世界高城标志酒店，供氧充足',
    29.9999, 100.2687, 4014, '理塘县团结路',
    '2025-10-04 21:00:00',
    '2025-10-05 09:00:00',
    520.00,
    5,
    'planned',
    21,
    '$USER_ID',
    NOW(),
    NOW()
);

INSERT INTO accommodation_details (
    item_id, hotel_name, room_type, check_in_time, check_out_time,
    guests_count, breakfast_included, phone, rating, price_per_night, total_nights
) VALUES (
    'sc21_hotel_lt',
    '理塘康巴大酒店',
    '高原适应房',
    '14:00',
    '12:00',
    2,
    true,
    '0836-5326888',
    4.5,
    520.00,
    1
);

-- ==========================================
-- Day 7: 理塘→稻城→香格里拉镇
-- ==========================================

-- 前往稻城
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    latitude, longitude, altitude, address,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, order_index, created_by, created_at, updated_at
) VALUES (
    'sc22_drive_lt_dc',
    '$plan_id',
    'transport',
    '理塘→稻城县',
    '经G227省道，途经海子山姊妹湖',
    29.0376, 100.2990, 3750, '稻城县',
    '2025-10-05 09:30:00',
    '2025-10-05 12:30:00',
    3.0,
    150.00,
    5,
    'planned',
    22,
    '$USER_ID',
    NOW(),
    NOW()
);

-- 海子山姊妹湖
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    latitude, longitude, altitude, address,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, order_index, created_by, created_at, updated_at
) VALUES (
    'sc23_sisters_lake',
    '$plan_id',
    'attraction',
    '海子山姊妹湖',
    '高原湖泊，两湖相依如姊妹',
    29.3167, 100.1833, 4685, '海子山观景台',
    '2025-10-05 10:30:00',
    '2025-10-05 11:30:00',
    1.0,
    0.00,
    5,
    'planned',
    23,
    '$USER_ID',
    NOW(),
    NOW()
);

INSERT INTO attraction_details (
    item_id, attraction_type, ticket_price, ticket_type,
    best_visit_time, recommended_duration, difficulty_level, photography_tips
) VALUES (
    'sc23_sisters_lake',
    'alpine_lake',
    0.00,
    '免费',
    '上午10:30-11:30',
    1.0,
    3,
    '高海拔拍摄注意防风，使用偏振镜增强湖水蓝色'
);

-- 前往香格里拉镇
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    latitude, longitude, altitude, address,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, order_index, created_by, created_at, updated_at
) VALUES (
    'sc24_drive_dc_yd',
    '$plan_id',
    'transport',
    '稻城→香格里拉镇',
    '进入亚丁景区核心区域',
    28.4167, 100.3167, 2900, '香格里拉镇',
    '2025-10-05 14:30:00',
    '2025-10-05 16:30:00',
    2.0,
    80.00,
    5,
    'planned',
    24,
    '$USER_ID',
    NOW(),
    NOW()
);

-- 亚丁住宿（第一晚）
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    latitude, longitude, altitude, address,
    start_datetime, end_datetime,
    cost, priority, status, order_index, created_by, created_at, updated_at
) VALUES (
    'sc25_hotel_yd_d1',
    '$plan_id',
    'accommodation',
    '亚丁村精品酒店（第一晚）',
    '景区内酒店，可观三神山',
    28.4167, 100.3167, 2900, '亚丁村',
    '2025-10-05 17:00:00',
    '2025-10-06 08:00:00',
    880.00,
    5,
    'planned',
    25,
    '$USER_ID',
    NOW(),
    NOW()
);

INSERT INTO accommodation_details (
    item_id, hotel_name, room_type, check_in_time, check_out_time,
    guests_count, breakfast_included, phone, rating, price_per_night, total_nights
) VALUES (
    'sc25_hotel_yd_d1',
    '亚丁村藏缘精品酒店',
    '雪山景观房',
    '14:00',
    '12:00',
    2,
    true,
    '0836-5728888',
    4.7,
    880.00,
    1
);

-- ==========================================
-- Day 8-9: 亚丁景区深度游
-- ==========================================

-- 亚丁景区门票
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    start_datetime, end_datetime,
    cost, priority, status, order_index, created_by, created_at, updated_at
) VALUES (
    'sc26_yading_tickets',
    '$plan_id',
    'ticket',
    '亚丁景区门票（2天）',
    '包含门票+观光车，两日有效',
    '2025-10-06 08:00:00',
    '2025-10-07 18:00:00',
    350.00,
    5,
    'planned',
    26,
    '$USER_ID',
    NOW(),
    NOW()
);

-- 冲古寺
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    latitude, longitude, altitude, address,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, order_index, created_by, created_at, updated_at
) VALUES (
    'sc27_chonggu_temple',
    '$plan_id',
    'attraction',
    '冲古寺',
    '三神山守护寺，可观仙乃日雪山',
    28.3833, 100.3500, 3880, '亚丁冲古寺',
    '2025-10-06 09:00:00',
    '2025-10-06 10:00:00',
    1.0,
    0.00,
    5,
    'planned',
    27,
    '$USER_ID',
    NOW(),
    NOW()
);

-- 珍珠海
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    latitude, longitude, altitude, address,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, order_index, created_by, created_at, updated_at
) VALUES (
    'sc28_pearl_lake',
    '$plan_id',
    'attraction',
    '珍珠海',
    '仙乃日神山下圣湖，倒影绝美',
    28.3916, 100.3583, 4100, '亚丁珍珠海',
    '2025-10-06 10:30:00',
    '2025-10-06 13:30:00',
    3.0,
    0.00,
    5,
    'planned',
    28,
    '$USER_ID',
    NOW(),
    NOW()
);

INSERT INTO attraction_details (
    item_id, attraction_type, ticket_price, ticket_type,
    best_visit_time, recommended_duration, difficulty_level, photography_tips
) VALUES (
    'sc28_pearl_lake',
    'sacred_lake',
    0.00,
    '含在门票内',
    '上午10:30-13:30',
    3.0,
    2,
    '拍摄倒影选择无风的上午，使用偏振镜控制反光'
);

-- 亚丁住宿（第二晚）
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    latitude, longitude, altitude, address,
    start_datetime, end_datetime,
    cost, priority, status, order_index, created_by, created_at, updated_at
) VALUES (
    'sc29_hotel_yd_d2',
    '$plan_id',
    'accommodation',
    '亚丁村精品酒店（第二晚）',
    '连续住宿便于深度游览',
    28.4167, 100.3167, 2900, '亚丁村',
    '2025-10-06 18:00:00',
    '2025-10-07 08:00:00',
    880.00,
    5,
    'planned',
    29,
    '$USER_ID',
    NOW(),
    NOW()
);

-- 洛绒牛场
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    latitude, longitude, altitude, address,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, order_index, created_by, created_at, updated_at
) VALUES (
    'sc30_luorong_pasture',
    '$plan_id',
    'attraction',
    '洛绒牛场',
    '三神山环绕的高山牧场',
    28.3667, 100.3500, 4150, '洛绒牛场',
    '2025-10-07 08:30:00',
    '2025-10-07 09:30:00',
    1.0,
    0.00,
    5,
    'planned',
    30,
    '$USER_ID',
    NOW(),
    NOW()
);

-- 电瓶车
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    start_datetime, end_datetime,
    cost, priority, status, order_index, created_by, created_at, updated_at
) VALUES (
    'sc31_electric_bus',
    '$plan_id',
    'transport',
    '洛绒牛场电瓶车',
    '冲古寺-洛绒牛场往返',
    '2025-10-07 08:30:00',
    '2025-10-07 17:00:00',
    180.00,
    4,
    'planned',
    31,
    '$USER_ID',
    NOW(),
    NOW()
);

-- 牛奶海
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    latitude, longitude, altitude, address,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, order_index, created_by, created_at, updated_at
) VALUES (
    'sc32_milk_lake',
    '$plan_id',
    'attraction',
    '牛奶海',
    '央迈勇神山下圣湖，海拔4600米',
    28.3750, 100.3583, 4600, '牛奶海',
    '2025-10-07 10:00:00',
    '2025-10-07 13:00:00',
    3.0,
    0.00,
    5,
    'planned',
    32,
    '$USER_ID',
    NOW(),
    NOW()
);

INSERT INTO attraction_details (
    item_id, attraction_type, ticket_price, ticket_type,
    best_visit_time, recommended_duration, difficulty_level, photography_tips
) VALUES (
    'sc32_milk_lake',
    'alpine_lake',
    0.00,
    '含在门票内',
    '上午10:00-13:00',
    3.0,
    5,
    '高海拔拍摄需注意相机电池消耗快，多备电池'
);

-- 五色海
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    latitude, longitude, altitude, address,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, order_index, created_by, created_at, updated_at
) VALUES (
    'sc33_five_color_lake',
    '$plan_id',
    'attraction',
    '五色海',
    '海拔4700米，亚丁最高点',
    28.3833, 100.3583, 4700, '五色海',
    '2025-10-07 13:30:00',
    '2025-10-07 15:00:00',
    1.5,
    0.00,
    5,
    'planned',
    33,
    '$USER_ID',
    NOW(),
    NOW()
);

INSERT INTO attraction_details (
    item_id, attraction_type, ticket_price, ticket_type,
    best_visit_time, recommended_duration, difficulty_level, photography_tips
) VALUES (
    'sc33_five_color_lake',
    'alpine_lake',
    0.00,
    '含在门票内',
    '中午13:30-15:00',
    1.5,
    5,
    '需要强烈阳光才能看到五色效果，天气是关键因素'
);

-- 亚丁住宿（第三晚）
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    latitude, longitude, altitude, address,
    start_datetime, end_datetime,
    cost, priority, status, order_index, created_by, created_at, updated_at
) VALUES (
    'sc34_hotel_yd_d3',
    '$plan_id',
    'accommodation',
    '亚丁村精品酒店（第三晚）',
    '三晚连住，深度体验亚丁',
    28.4167, 100.3167, 2900, '亚丁村',
    '2025-10-07 18:00:00',
    '2025-10-08 09:00:00',
    880.00,
    5,
    'planned',
    34,
    '$USER_ID',
    NOW(),
    NOW()
);

-- ==========================================
-- Day 10: 亚丁→新都桥
-- ==========================================

-- 前往新都桥
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    latitude, longitude, altitude, address,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, order_index, created_by, created_at, updated_at
) VALUES (
    'sc35_drive_yd_xdq',
    '$plan_id',
    'transport',
    '香格里拉镇→新都桥',
    '前往摄影天堂新都桥',
    30.0333, 101.7833, 3300, '新都桥镇',
    '2025-10-08 09:30:00',
    '2025-10-08 16:30:00',
    7.0,
    320.00,
    5,
    'planned',
    35,
    '$USER_ID',
    NOW(),
    NOW()
);

INSERT INTO transport_details (
    item_id, transport_type, departure_location, arrival_location,
    departure_time, arrival_time, distance_km, estimated_fuel_cost
) VALUES (
    'sc35_drive_yd_xdq',
    'self_drive',
    '香格里拉镇',
    '新都桥镇',
    '2025-10-08 09:30:00',
    '2025-10-08 16:30:00',
    350.0,
    280.00
);

-- 新都桥摄影
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    latitude, longitude, altitude, address,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, order_index, created_by, created_at, updated_at
) VALUES (
    'sc36_xdq_photography',
    '$plan_id',
    'attraction',
    '新都桥十里画廊',
    '著名摄影天堂，光与影的世界',
    30.0333, 101.7833, 3300, '新都桥十里画廊',
    '2025-10-08 17:00:00',
    '2025-10-08 19:00:00',
    2.0,
    0.00,
    5,
    'planned',
    36,
    '$USER_ID',
    NOW(),
    NOW()
);

INSERT INTO attraction_details (
    item_id, attraction_type, ticket_price, ticket_type,
    best_visit_time, recommended_duration, difficulty_level, photography_tips
) VALUES (
    'sc36_xdq_photography',
    'photography_spot',
    0.00,
    '免费',
    '黄昏17:00-19:00',
    2.0,
    1,
    '新都桥以光影著称，黄昏和日出时分最佳'
);

-- 新都桥住宿
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    latitude, longitude, altitude, address,
    start_datetime, end_datetime,
    cost, priority, status, order_index, created_by, created_at, updated_at
) VALUES (
    'sc37_hotel_xdq',
    '$plan_id',
    'accommodation',
    '新都桥印象雅致酒店',
    '可观贡嘎雪山，摄影爱好者首选',
    30.0333, 101.7833, 3300, '新都桥318国道旁',
    '2025-10-08 19:30:00',
    '2025-10-09 09:00:00',
    650.00,
    5,
    'planned',
    37,
    '$USER_ID',
    NOW(),
    NOW()
);

INSERT INTO accommodation_details (
    item_id, hotel_name, room_type, check_in_time, check_out_time,
    guests_count, breakfast_included, phone, rating, price_per_night, total_nights
) VALUES (
    'sc37_hotel_xdq',
    '新都桥印象雅致酒店',
    '山景大床房',
    '14:00',
    '12:00',
    2,
    true,
    '0836-2866888',
    4.6,
    650.00,
    1
);

-- ==========================================
-- Day 11: 新都桥→成都→北京
-- ==========================================

-- 新都桥日出（可选）
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, order_index, created_by, created_at, updated_at
) VALUES (
    'sc38_xdq_sunrise',
    '$plan_id',
    'other',
    '新都桥日出摄影',
    '早起拍摄贡嘎雪山日出',
    '2025-10-09 06:30:00',
    '2025-10-09 08:00:00',
    1.5,
    0.00,
    4,
    'optional',
    38,
    '$USER_ID',
    NOW(),
    NOW()
);

-- 返回成都
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    latitude, longitude, altitude, address,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, order_index, created_by, created_at, updated_at
) VALUES (
    'sc39_drive_xdq_cd',
    '$plan_id',
    'transport',
    '新都桥→成都机场',
    '经康定、雅安返回成都，结束川西之旅',
    30.5783, 103.9467, 488, '成都双流机场',
    '2025-10-09 09:30:00',
    '2025-10-09 17:30:00',
    8.0,
    380.00,
    5,
    'planned',
    39,
    '$USER_ID',
    NOW(),
    NOW()
);

INSERT INTO transport_details (
    item_id, transport_type, departure_location, arrival_location,
    departure_time, arrival_time, distance_km, estimated_fuel_cost, toll_cost
) VALUES (
    'sc39_drive_xdq_cd',
    'self_drive',
    '新都桥镇',
    '成都双流机场',
    '2025-10-09 09:30:00',
    '2025-10-09 17:30:00',
    430.0,
    320.00,
    80.00
);

-- 还车
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, order_index, created_by, created_at, updated_at
) VALUES (
    'sc40_return_car',
    '$plan_id',
    'transport',
    '机场还车',
    '归还租用车辆，办理还车手续',
    '2025-10-09 17:30:00',
    '2025-10-09 18:30:00',
    1.0,
    0.00,
    4,
    'planned',
    40,
    '$USER_ID',
    NOW(),
    NOW()
);

-- 返程航班
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    latitude, longitude, altitude, address,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, order_index, created_by, created_at, updated_at
) VALUES (
    'sc41_flight_cd_bj',
    '$plan_id',
    'transport',
    '成都-北京航班 CA4114',
    '成都T2→北京T3，结束川西之旅',
    30.5783, 103.9467, 488, '成都双流T2',
    '2025-10-09 20:30:00',
    '2025-10-09 23:45:00',
    3.25,
    1200.00,
    5,
    'planned',
    41,
    '$USER_ID',
    NOW(),
    NOW()
);

INSERT INTO transport_details (
    item_id, transport_type, departure_location, arrival_location,
    departure_time, arrival_time, carrier_name, vehicle_number,
    departure_terminal, arrival_terminal
) VALUES (
    'sc41_flight_cd_bj',
    'flight',
    '成都双流国际机场T2',
    '北京首都国际机场T3',
    '2025-10-09 20:30:00',
    '2025-10-09 23:45:00',
    '中国国航',
    'CA4114',
    'T2',
    'T3'
);

-- ==========================================
-- 创建项目关联关系
-- ==========================================
INSERT INTO item_relations (
    id, source_item_id, target_item_id, relation_type, created_at
) VALUES
    ('rel_101', 'sc02_hotel_cd_d1', 'sc03_car_rental', 'nearby', NOW()),
    ('rel_102', 'sc06_hotel_sgn', 'sc05_shuangqiao_valley', 'nearby', NOW()),
    ('rel_103', 'sc06_hotel_sgn', 'sc07_changping_valley', 'nearby', NOW()),
    ('rel_104', 'sc13_hotel_sd', 'sc12_seda_academy', 'nearby', NOW()),
    ('rel_105', 'sc18_hotel_gz', 'sc17_ganzi_city', 'nearby', NOW()),
    ('rel_106', 'sc25_hotel_yd_d1', 'sc27_chonggu_temple', 'nearby', NOW()),
    ('rel_107', 'sc30_luorong_pasture', 'sc31_electric_bus', 'requires', NOW()),
    ('rel_108', 'sc32_milk_lake', 'sc33_five_color_lake', 'nearby', NOW()),
    ('rel_109', 'sc37_hotel_xdq', 'sc36_xdq_photography', 'nearby', NOW());

-- ==========================================
-- 创建重要标注
-- ==========================================
INSERT INTO item_annotations (
    id, item_id, annotation_type, content, rating, created_by, created_at, updated_at
) VALUES
    ('ann_101', 'sc05_shuangqiao_valley', 'photo_tip', '双桥沟秋季彩林最佳拍摄时间是下午15:00-17:00，阳光斜射时色彩层次最丰富', 5, '$USER_ID', NOW(), NOW()),
    ('ann_102', 'sc12_seda_academy', 'cultural_note', '色达五明佛学院是神圣宗教场所，参观需保持安静，尊重僧人，遵守拍照规定', 5, '$USER_ID', NOW(), NOW()),
    ('ann_103', 'sc15_moshi_park', 'geological_info', '墨石公园是全球唯一糜棱岩石林景观，黑色石林在中午强光下与蓝天形成强烈对比', 5, '$USER_ID', NOW(), NOW()),
    ('ann_104', 'sc23_sisters_lake', 'altitude_warning', '海子山姊妹湖海拔4685米，是全程最高观景点，停留时间不宜过长', 4, '$USER_ID', NOW(), NOW()),
    ('ann_105', 'sc28_pearl_lake', 'hiking_tip', '珍珠海是亚丁最经典徒步路线，老少皆宜。拍摄仙乃日倒影选择无风上午时段', 5, '$USER_ID', NOW(), NOW()),
    ('ann_106', 'sc32_milk_lake', 'difficulty_warning', '牛奶海徒步极具挑战性，往返10公里，海拔上升500米，需要极好体力', 5, '$USER_ID', NOW(), NOW()),
    ('ann_107', 'sc33_five_color_lake', 'safety_warning', '五色海海拔4700米，是亚丁最高点，天气变化极快，务必注意安全', 5, '$USER_ID', NOW(), NOW()),
    ('ann_108', 'sc36_xdq_photography', 'photo_tip', '新都桥被誉为摄影天堂，黄昏和日出时分光影效果最佳', 5, '$USER_ID', NOW(), NOW());

-- ==========================================
-- 创建预算明细
-- ==========================================
INSERT INTO budget_items (
    id, plan_id, category, description,
    estimated_amount, actual_amount, currency, payment_status, created_at
) VALUES
    ('bdg_101', '$plan_id', '交通', '往返机票（2人）', 2400.00, NULL, 'CNY', 'pending', NOW()),
    ('bdg_102', '$plan_id', '交通', '租车费用（11天）', 8500.00, NULL, 'CNY', 'pending', NOW()),
    ('bdg_103', '$plan_id', '交通', '全程油费', 2600.00, NULL, 'CNY', 'pending', NOW()),
    ('bdg_104', '$plan_id', '交通', '过路费+停车', 600.00, NULL, 'CNY', 'pending', NOW()),
    ('bdg_105', '$plan_id', '住宿', '成都酒店', 480.00, NULL, 'CNY', 'pending', NOW()),
    ('bdg_106', '$plan_id', '住宿', '四姑娘山酒店', 680.00, NULL, 'CNY', 'pending', NOW()),
    ('bdg_107', '$plan_id', '住宿', '马尔康酒店', 450.00, NULL, 'CNY', 'pending', NOW()),
    ('bdg_108', '$plan_id', '住宿', '色达酒店', 420.00, NULL, 'CNY', 'pending', NOW()),
    ('bdg_109', '$plan_id', '住宿', '甘孜酒店', 480.00, NULL, 'CNY', 'pending', NOW()),
    ('bdg_110', '$plan_id', '住宿', '理塘酒店', 520.00, NULL, 'CNY', 'pending', NOW()),
    ('bdg_111', '$plan_id', '住宿', '亚丁村酒店（3晚）', 2640.00, NULL, 'CNY', 'pending', NOW()),
    ('bdg_112', '$plan_id', '住宿', '新都桥酒店', 650.00, NULL, 'CNY', 'pending', NOW()),
    ('bdg_113', '$plan_id', '餐饮', '正餐费用', 2800.00, NULL, 'CNY', 'pending', NOW()),
    ('bdg_114', '$plan_id', '餐饮', '零食饮料', 600.00, NULL, 'CNY', 'pending', NOW()),
    ('bdg_115', '$plan_id', '门票', '亚丁景区门票', 350.00, NULL, 'CNY', 'pending', NOW()),
    ('bdg_116', '$plan_id', '门票', '四姑娘山门票', 190.00, NULL, 'CNY', 'pending', NOW()),
    ('bdg_117', '$plan_id', '门票', '墨石公园门票', 60.00, NULL, 'CNY', 'pending', NOW()),
    ('bdg_118', '$plan_id', '活动', '电瓶车+骑马', 480.00, NULL, 'CNY', 'pending', NOW()),
    ('bdg_119', '$plan_id', '购物', '特产伴手礼', 1500.00, NULL, 'CNY', 'pending', NOW()),
    ('bdg_120', '$plan_id', '其他', '保险+应急费用', 3190.00, NULL, 'CNY', 'pending', NOW());

COMMIT;

-- 输出统计信息
DO \$\$
DECLARE
    v_plan_count INTEGER;
    v_item_count INTEGER;
    v_budget_count INTEGER;
    v_total_budget NUMERIC;
BEGIN
    SELECT COUNT(*) INTO v_plan_count FROM plans WHERE id = '$plan_id';
    SELECT COUNT(*) INTO v_item_count FROM travel_items WHERE plan_id = '$plan_id';
    SELECT COUNT(*) INTO v_budget_count FROM budget_items WHERE plan_id = '$plan_id';
    SELECT SUM(estimated_amount) INTO v_total_budget FROM budget_items WHERE plan_id = '$plan_id';

    RAISE NOTICE '========================================';
    RAISE NOTICE '✓ 四川西部深度游数据导入成功！';
    RAISE NOTICE '========================================';
    RAISE NOTICE '  计划ID: %', '$plan_id';
    RAISE NOTICE '  用户ID: %', '$USER_ID';
    RAISE NOTICE '  总预算: ¥%', v_total_budget;
    RAISE NOTICE '  行程天数: 11天10晚';
    RAISE NOTICE '  旅游项目: % 个', v_item_count;
    RAISE NOTICE '  预算项目: % 个', v_budget_count;
    RAISE NOTICE '========================================';
    RAISE NOTICE '🗺️ 核心景点:';
    RAISE NOTICE '  • 四姑娘山双桥沟+长坪沟';
    RAISE NOTICE '  • 色达五明佛学院';
    RAISE NOTICE '  • 墨石公园（糜棱岩石林）';
    RAISE NOTICE '  • 甘孜白利寺';
    RAISE NOTICE '  • 理塘毛垭大草原';
    RAISE NOTICE '  • 稻城亚丁三神山';
    RAISE NOTICE '  • 新都桥摄影天堂';
    RAISE NOTICE '========================================';
END \$\$;
EOF

    if [ $? -eq 0 ]; then
        print_message "✓ 四川西部深度游数据导入成功！" "$GREEN"
        print_message "  计划ID: $plan_id" "$BLUE"
        print_message "  总预算: ¥32,000" "$BLUE"
        print_message "  旅游项目: 41个" "$BLUE"
        print_message "  核心景点: 四姑娘山+色达+墨石公园+甘孜+稻城亚丁+新都桥" "$BLUE"
    else
        print_message "✗ 数据导入失败" "$RED"
        exit 1
    fi
}

main() {
    print_title "2025四川西部深度游数据导入系统"

    if [ -z "$DB_PASSWORD" ]; then
        print_message "请设置数据库密码: export DB_PASSWORD=your_password" "$RED"
        exit 1
    fi

    check_database_connection
    import_sichuan_tour

    print_message "\n✅ 导入完成！可使用以下SQL查询：" "$GREEN"
    echo ""
    echo "-- 查看计划"
    echo "SELECT * FROM plans WHERE id LIKE 'plan_sc_%';"
    echo ""
    echo "-- 查看行程"
    echo "SELECT DATE(start_datetime) as day, name, item_type, cost"
    echo "FROM travel_items WHERE plan_id LIKE 'plan_sc_%'"
    echo "ORDER BY start_datetime;"
    echo ""
    echo "-- 查看预算"
    echo "SELECT category, SUM(estimated_amount) as total"
    echo "FROM budget_items WHERE plan_id LIKE 'plan_sc_%'"
    echo "GROUP BY category;"
}

main