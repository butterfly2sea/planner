#!/bin/bash

# =====================================================
# 2025四川西部深度游数据导入脚本（优化版）
# 路线：成都→四姑娘山→丹巴→墨石公园→甘孜→理塘→稻城亚丁→新都桥→成都
# 使用方法: ./sichuan_optimized_tour.sh [user_id]
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

import_optimized_tour() {
    print_message "开始导入川西深度游优化版数据..." "$YELLOW"

    local plan_id="plan_opt_$(date +%Y%m%d)"

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
    '2025川西深度游：四姑娘山+丹巴+墨石公园+稻城亚丁+新都桥',
    '深秋川西经典环线，涵盖雪山彩林、藏族村寨、地质奇观、高原圣湖。路线优化，时间从容，深度体验川西之美',
    '四川西部',
    '2025-09-29',
    '2025-10-10',
    28000.00,
    2,
    'planned',
    'private',
    ARRAY['深度游', '摄影', '高原', '雪山', '藏族文化', '自驾', '优化路线'],
    NOW(),
    NOW()
);

-- ==========================================
-- Day 1 (9月29日): 北京→成都
-- ==========================================

-- 去程航班
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    latitude, longitude, altitude, address,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, properties, notes, order_index, created_by, created_at, updated_at
) VALUES (
    'opt01_flight_bj_cd',
    '$plan_id',
    'transport',
    '北京-成都航班 CA4113',
    '中国国航CA4113，北京T3→成都T2，建议提前2小时到机场',
    39.5098, 116.4105, 50, '北京首都T3',
    '2025-09-29 19:50:00',
    '2025-09-29 23:05:00',
    3.25,
    1200.00,
    5,
    'planned',
    '{"flight_number": "CA4113", "class": "经济舱"}'::jsonb,
    '携带高原药物，准备好川西之旅',
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
    'opt01_flight_bj_cd',
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

-- 机场到酒店
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, order_index, created_by, created_at, updated_at
) VALUES (
    'opt02_airport_taxi',
    '$plan_id',
    'transport',
    '机场→酒店交通',
    '深夜抵达，出租车前往春熙路酒店',
    '2025-09-29 23:20:00',
    '2025-09-30 00:20:00',
    1.0,
    80.00,
    4,
    'planned',
    2,
    '$USER_ID',
    NOW(),
    NOW()
);

-- 成都住宿
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    latitude, longitude, altitude, address,
    start_datetime, end_datetime,
    cost, priority, status, properties, order_index, created_by, created_at, updated_at
) VALUES (
    'opt03_hotel_cd',
    '$plan_id',
    'accommodation',
    '成都春熙路亚朵酒店',
    '市中心位置，方便次日租车出发',
    30.6598, 104.0805, 500, '成都锦江区春熙路',
    '2025-09-30 00:30:00',
    '2025-09-30 10:00:00',
    480.00,
    5,
    'planned',
    '{"room_type": "高级大床房", "breakfast": true}'::jsonb,
    3,
    '$USER_ID',
    NOW(),
    NOW()
);

INSERT INTO accommodation_details (
    item_id, hotel_name, room_type, check_in_time, check_out_time,
    guests_count, breakfast_included, phone, rating, price_per_night, total_nights
) VALUES (
    'opt03_hotel_cd',
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
-- Day 2 (9月30日): 成都→四姑娘山
-- ==========================================

-- 酒店早餐
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, order_index, created_by, created_at, updated_at
) VALUES (
    'opt04_breakfast_cd',
    '$plan_id',
    'dining',
    '酒店早餐',
    '享用丰盛自助早餐，为高原之旅补充营养',
    '2025-09-30 08:00:00',
    '2025-09-30 09:00:00',
    1.0,
    0.00,
    3,
    'planned',
    4,
    '$USER_ID',
    NOW(),
    NOW()
);

-- 租车
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, properties, order_index, created_by, created_at, updated_at
) VALUES (
    'opt05_car_rental',
    '$plan_id',
    'transport',
    '租车服务（11天）',
    '租用四驱SUV，含全险及高原装备',
    '2025-09-30 09:30:00',
    '2025-10-10 07:00:00',
    261.5,
    7800.00,
    5,
    'planned',
    '{"vehicle": "丰田普拉多", "insurance": "全险"}'::jsonb,
    5,
    '$USER_ID',
    NOW(),
    NOW()
);

-- 成都→四姑娘山
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    latitude, longitude, altitude, address,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, properties, order_index, created_by, created_at, updated_at
) VALUES (
    'opt06_drive_cd_sgn',
    '$plan_id',
    'transport',
    '成都→四姑娘山',
    '经都汶高速→303省道，230公里，途径映秀、卧龙',
    31.0783, 102.8947, 3200, '四姑娘山日隆镇',
    '2025-09-30 10:00:00',
    '2025-09-30 15:00:00',
    5.0,
    220.00,
    5,
    'planned',
    '{"distance": "230km", "stops": ["映秀", "卧龙"]}'::jsonb,
    6,
    '$USER_ID',
    NOW(),
    NOW()
);

INSERT INTO transport_details (
    item_id, transport_type, departure_location, arrival_location,
    departure_time, arrival_time, distance_km, estimated_fuel_cost, toll_cost
) VALUES (
    'opt06_drive_cd_sgn',
    'self_drive',
    '成都市',
    '四姑娘山日隆镇',
    '2025-09-30 10:00:00',
    '2025-09-30 15:00:00',
    230.0,
    180.00,
    40.00
);

-- 映秀午餐
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, properties, order_index, created_by, created_at, updated_at
) VALUES (
    'opt07_lunch_yingxiu',
    '$plan_id',
    'dining',
    '映秀镇午餐',
    '在地震遗址纪念地用餐休整',
    '2025-09-30 12:30:00',
    '2025-09-30 13:30:00',
    1.0,
    100.00,
    3,
    'planned',
    '{"cuisine": "川菜", "memorial_site": true}'::jsonb,
    7,
    '$USER_ID',
    NOW(),
    NOW()
);

-- 双桥沟游览
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    latitude, longitude, altitude, address,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, properties, order_index, created_by, created_at, updated_at
) VALUES (
    'opt08_shuangqiao',
    '$plan_id',
    'attraction',
    '四姑娘山双桥沟',
    '最具观赏性的沟谷，秋季彩林绚烂，观光车游览',
    31.0890, 102.8634, 3200, '双桥沟景区',
    '2025-09-30 15:30:00',
    '2025-09-30 18:30:00',
    3.0,
    120.00,
    5,
    'planned',
    '{"highlights": ["人参果坪", "撵鱼坝", "四姑娘山观景台"]}'::jsonb,
    8,
    '$USER_ID',
    NOW(),
    NOW()
);

INSERT INTO attraction_details (
    item_id, attraction_type, ticket_price, ticket_type,
    best_visit_time, recommended_duration, difficulty_level, photography_tips
) VALUES (
    'opt08_shuangqiao',
    'valley_scenery',
    120.00,
    '门票+观光车',
    '下午15:30-18:30',
    3.0,
    2,
    '下午光线柔和，彩林色彩层次丰富，建议使用偏振镜'
);

-- 四姑娘山住宿
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    latitude, longitude, altitude, address,
    start_datetime, end_datetime,
    cost, priority, status, properties, order_index, created_by, created_at, updated_at
) VALUES (
    'opt09_hotel_sgn',
    '$plan_id',
    'accommodation',
    '四姑娘山悦山酒店',
    '可观四姑娘山日出，配备供氧设备',
    31.0783, 102.8947, 3200, '日隆镇银龙街',
    '2025-09-30 19:00:00',
    '2025-10-01 09:00:00',
    650.00,
    5,
    'planned',
    '{"mountain_view": true, "oxygen": true}'::jsonb,
    9,
    '$USER_ID',
    NOW(),
    NOW()
);

INSERT INTO accommodation_details (
    item_id, hotel_name, room_type, check_in_time, check_out_time,
    guests_count, breakfast_included, phone, rating, price_per_night, total_nights
) VALUES (
    'opt09_hotel_sgn',
    '四姑娘山悦山酒店',
    '山景大床房',
    '14:00',
    '12:00',
    2,
    true,
    '0837-2791688',
    4.6,
    650.00,
    1
);

-- ==========================================
-- Day 3 (10月1日): 四姑娘山→丹巴
-- ==========================================

-- 长坪沟徒步
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    latitude, longitude, altitude, address,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, properties, order_index, created_by, created_at, updated_at
) VALUES (
    'opt10_changping',
    '$plan_id',
    'attraction',
    '四姑娘山长坪沟',
    '原始森林徒步，秋季彩林最佳观赏地',
    31.1089, 102.8723, 3200, '长坪沟景区',
    '2025-10-01 08:30:00',
    '2025-10-01 13:00:00',
    4.5,
    70.00,
    5,
    'planned',
    '{"highlights": ["枯树滩", "木骡子", "原始森林"]}'::jsonb,
    10,
    '$USER_ID',
    NOW(),
    NOW()
);

INSERT INTO attraction_details (
    item_id, attraction_type, ticket_price, ticket_type,
    best_visit_time, recommended_duration, difficulty_level, photography_tips
) VALUES (
    'opt10_changping',
    'hiking_trail',
    70.00,
    '门票+观光车',
    '上午8:30-13:00',
    4.5,
    3,
    '逆光拍摄彩林通透感强，枯树滩是经典构图点'
);

-- 骑马服务（可选）
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, properties, order_index, created_by, created_at, updated_at
) VALUES (
    'opt11_horse_ride',
    '$plan_id',
    'other',
    '长坪沟骑马',
    '骑马往返木骡子，体验藏区马帮文化',
    '2025-10-01 09:00:00',
    '2025-10-01 12:30:00',
    3.5,
    280.00,
    4,
    'optional',
    '{"service": "往返骑马", "cultural_experience": true}'::jsonb,
    11,
    '$USER_ID',
    NOW(),
    NOW()
);

-- 前往丹巴
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    latitude, longitude, altitude, address,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, properties, order_index, created_by, created_at, updated_at
) VALUES (
    'opt12_drive_sgn_db',
    '$plan_id',
    'transport',
    '四姑娘山→丹巴',
    '经小金县前往丹巴，沿途大渡河峡谷风光',
    30.8806, 101.8897, 1800, '丹巴县',
    '2025-10-01 14:00:00',
    '2025-10-01 17:30:00',
    3.5,
    140.00,
    5,
    'planned',
    '{"route": "小金-丹巴", "scenery": "大渡河峡谷"}'::jsonb,
    12,
    '$USER_ID',
    NOW(),
    NOW()
);

INSERT INTO transport_details (
    item_id, transport_type, departure_location, arrival_location,
    departure_time, arrival_time, distance_km, estimated_fuel_cost
) VALUES (
    'opt12_drive_sgn_db',
    'self_drive',
    '四姑娘山日隆镇',
    '丹巴县',
    '2025-10-01 14:00:00',
    '2025-10-01 17:30:00',
    110.0,
    90.00
);

-- 甲居藏寨游览
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    latitude, longitude, altitude, address,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, properties, order_index, created_by, created_at, updated_at
) VALUES (
    'opt13_jiaju_village',
    '$plan_id',
    'attraction',
    '甲居藏寨',
    '中国最美乡村，嘉绒藏族建筑群落',
    30.8833, 101.8833, 2000, '甲居藏寨',
    '2025-10-01 18:00:00',
    '2025-10-01 19:30:00',
    1.5,
    50.00,
    5,
    'planned',
    '{"architecture": "嘉绒藏族", "best_view": "黄昏时分"}'::jsonb,
    13,
    '$USER_ID',
    NOW(),
    NOW()
);

INSERT INTO attraction_details (
    item_id, attraction_type, ticket_price, ticket_type,
    best_visit_time, recommended_duration, difficulty_level, photography_tips
) VALUES (
    'opt13_jiaju_village',
    'cultural_village',
    50.00,
    '门票',
    '黄昏18:00-19:30',
    1.5,
    1,
    '黄昏时分藏房在夕阳下呈现温暖色调，层次分明'
);

-- 丹巴住宿
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    latitude, longitude, altitude, address,
    start_datetime, end_datetime,
    cost, priority, status, properties, order_index, created_by, created_at, updated_at
) VALUES (
    'opt14_hotel_db',
    '$plan_id',
    'accommodation',
    '丹巴美人谷酒店',
    '当地特色酒店，可观藏寨夜景',
    30.8806, 101.8897, 1800, '丹巴县城',
    '2025-10-01 20:00:00',
    '2025-10-02 09:00:00',
    380.00,
    4,
    'planned',
    '{"local_style": true, "village_view": true}'::jsonb,
    14,
    '$USER_ID',
    NOW(),
    NOW()
);

INSERT INTO accommodation_details (
    item_id, hotel_name, room_type, check_in_time, check_out_time,
    guests_count, breakfast_included, phone, rating, price_per_night, total_nights
) VALUES (
    'opt14_hotel_db',
    '丹巴美人谷酒店',
    '标准大床房',
    '14:00',
    '12:00',
    2,
    true,
    '0836-3522888',
    4.2,
    380.00,
    1
);

-- ==========================================
-- Day 4 (10月2日): 丹巴→墨石公园→甘孜
-- ==========================================

-- 中路藏寨日出
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, properties, order_index, created_by, created_at, updated_at
) VALUES (
    'opt15_zhonglu_sunrise',
    '$plan_id',
    'other',
    '中路藏寨日出',
    '早起拍摄中路藏寨日出美景',
    '2025-10-02 07:00:00',
    '2025-10-02 08:30:00',
    1.5,
    0.00,
    4,
    'optional',
    '{"activity": "日出摄影", "best_spot": "中路藏寨"}'::jsonb,
    15,
    '$USER_ID',
    NOW(),
    NOW()
);

-- 前往墨石公园
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    latitude, longitude, altitude, address,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, properties, order_index, created_by, created_at, updated_at
) VALUES (
    'opt16_drive_db_ms',
    '$plan_id',
    'transport',
    '丹巴→墨石公园',
    '经道孚县前往墨石公园，约120公里',
    31.2167, 101.1333, 3500, '墨石公园',
    '2025-10-02 09:30:00',
    '2025-10-02 12:30:00',
    3.0,
    130.00,
    5,
    'planned',
    '{"route": "经道孚县", "distance": "120km"}'::jsonb,
    16,
    '$USER_ID',
    NOW(),
    NOW()
);

INSERT INTO transport_details (
    item_id, transport_type, departure_location, arrival_location,
    departure_time, arrival_time, distance_km, estimated_fuel_cost
) VALUES (
    'opt16_drive_db_ms',
    'self_drive',
    '丹巴县',
    '墨石公园',
    '2025-10-02 09:30:00',
    '2025-10-02 12:30:00',
    120.0,
    100.00
);

-- 墨石公园游览
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    latitude, longitude, altitude, address,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, properties, order_index, created_by, created_at, updated_at
) VALUES (
    'opt17_moshi_park',
    '$plan_id',
    'attraction',
    '墨石公园',
    '全球唯一糜棱岩石林，黑色石林奇观',
    31.2167, 101.1333, 3500, '墨石公园景区',
    '2025-10-02 13:00:00',
    '2025-10-02 16:00:00',
    3.0,
    60.00,
    5,
    'planned',
    '{"unique_feature": "糜棱岩石林", "color": "黑色"}'::jsonb,
    17,
    '$USER_ID',
    NOW(),
    NOW()
);

INSERT INTO attraction_details (
    item_id, attraction_type, ticket_price, ticket_type,
    best_visit_time, recommended_duration, difficulty_level, photography_tips
) VALUES (
    'opt17_moshi_park',
    'geological_park',
    60.00,
    '门票',
    '中午13:00-16:00强光最佳',
    3.0,
    2,
    '黑色石林在强光下与蓝天对比强烈，使用偏振镜增强效果'
);

-- 前往甘孜
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    latitude, longitude, altitude, address,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, properties, order_index, created_by, created_at, updated_at
) VALUES (
    'opt18_drive_ms_gz',
    '$plan_id',
    'transport',
    '墨石公园→甘孜',
    '继续前往甘孜县，约80公里',
    31.6167, 99.9833, 3380, '甘孜县',
    '2025-10-02 16:30:00',
    '2025-10-02 18:30:00',
    2.0,
    80.00,
    4,
    'planned',
    '{"distance": "80km", "destination": "甘孜县"}'::jsonb,
    18,
    '$USER_ID',
    NOW(),
    NOW()
);

-- 甘孜白利寺
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    latitude, longitude, altitude, address,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, properties, order_index, created_by, created_at, updated_at
) VALUES (
    'opt19_baili_temple',
    '$plan_id',
    'attraction',
    '甘孜白利寺',
    '甘孜最重要寺庙，康巴藏传佛教文化中心',
    31.6167, 99.9833, 3380, '甘孜白利寺',
    '2025-10-02 19:00:00',
    '2025-10-02 20:00:00',
    1.0,
    0.00,
    4,
    'planned',
    '{"temple": "白利寺", "culture": "康巴藏传佛教"}'::jsonb,
    19,
    '$USER_ID',
    NOW(),
    NOW()
);

INSERT INTO attraction_details (
    item_id, attraction_type, ticket_price, ticket_type,
    best_visit_time, recommended_duration, difficulty_level
) VALUES (
    'opt19_baili_temple',
    'religious_site',
    0.00,
    '免费',
    '傍晚19:00-20:00',
    1.0,
    1
);

-- 甘孜住宿
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    latitude, longitude, altitude, address,
    start_datetime, end_datetime,
    cost, priority, status, properties, order_index, created_by, created_at, updated_at
) VALUES (
    'opt20_hotel_gz',
    '$plan_id',
    'accommodation',
    '甘孜雪域大酒店',
    '甘孜县最好酒店，设施完善',
    31.6167, 99.9833, 3380, '甘孜县团结路',
    '2025-10-02 20:30:00',
    '2025-10-03 09:00:00',
    450.00,
    4,
    'planned',
    '{"facilities": "完善", "altitude": "3380m"}'::jsonb,
    20,
    '$USER_ID',
    NOW(),
    NOW()
);

INSERT INTO accommodation_details (
    item_id, hotel_name, room_type, check_in_time, check_out_time,
    guests_count, breakfast_included, phone, rating, price_per_night, total_nights
) VALUES (
    'opt20_hotel_gz',
    '甘孜雪域大酒店',
    '豪华标间',
    '14:00',
    '12:00',
    2,
    true,
    '0836-7522888',
    4.4,
    450.00,
    1
);

-- ==========================================
-- Day 5 (10月3日): 甘孜→理塘
-- ==========================================

-- 甘孜→理塘
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    latitude, longitude, altitude, address,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, properties, order_index, created_by, created_at, updated_at
) VALUES (
    'opt21_drive_gz_lt',
    '$plan_id',
    'transport',
    '甘孜→理塘',
    '前往世界高城理塘，约180公里，海拔上升至4014米',
    29.9999, 100.2687, 4014, '理塘县',
    '2025-10-03 09:30:00',
    '2025-10-03 14:00:00',
    4.5,
    180.00,
    5,
    'planned',
    '{"distance": "180km", "elevation": "4014m"}'::jsonb,
    21,
    '$USER_ID',
    NOW(),
    NOW()
);

INSERT INTO transport_details (
    item_id, transport_type, departure_location, arrival_location,
    departure_time, arrival_time, distance_km, estimated_fuel_cost
) VALUES (
    'opt21_drive_gz_lt',
    'self_drive',
    '甘孜县',
    '理塘县',
    '2025-10-03 09:30:00',
    '2025-10-03 14:00:00',
    180.0,
    150.00
);

-- 理塘午餐休整
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, properties, order_index, created_by, created_at, updated_at
) VALUES (
    'opt22_lunch_lt',
    '$plan_id',
    'dining',
    '理塘县城午餐',
    '世界高城用餐，适应海拔',
    '2025-10-03 14:00:00',
    '2025-10-03 15:00:00',
    1.0,
    120.00,
    3,
    'planned',
    '{"altitude": "4014m", "adaptation": true}'::jsonb,
    22,
    '$USER_ID',
    NOW(),
    NOW()
);

-- 毛垭大草原
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    latitude, longitude, altitude, address,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, properties, order_index, created_by, created_at, updated_at
) VALUES (
    'opt23_maoya_grassland',
    '$plan_id',
    'attraction',
    '理塘毛垭大草原',
    '中国最美高原草原，秋季金黄无量河蜿蜒',
    29.9742, 100.3156, 4000, '毛垭大草原',
    '2025-10-03 15:30:00',
    '2025-10-03 17:30:00',
    2.0,
    0.00,
    5,
    'planned',
    '{"scenery": "金黄草原", "river": "无量河"}'::jsonb,
    23,
    '$USER_ID',
    NOW(),
    NOW()
);

INSERT INTO attraction_details (
    item_id, attraction_type, ticket_price, ticket_type,
    best_visit_time, recommended_duration, difficulty_level, photography_tips
) VALUES (
    'opt23_maoya_grassland',
    'grassland',
    0.00,
    '免费',
    '下午15:30-17:30',
    2.0,
    2,
    '广角镜头展现辽阔感，无量河作前景元素，黄昏光线最美'
);

-- 理塘住宿
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    latitude, longitude, altitude, address,
    start_datetime, end_datetime,
    cost, priority, status, properties, order_index, created_by, created_at, updated_at
) VALUES (
    'opt24_hotel_lt',
    '$plan_id',
    'accommodation',
    '理塘康巴大酒店',
    '世界高城标志酒店，供氧设施完善',
    29.9999, 100.2687, 4014, '理塘县团结路',
    '2025-10-03 18:00:00',
    '2025-10-04 09:00:00',
    500.00,
    5,
    'planned',
    '{"oxygen": true, "altitude": "4014m"}'::jsonb,
    24,
    '$USER_ID',
    NOW(),
    NOW()
);

INSERT INTO accommodation_details (
    item_id, hotel_name, room_type, check_in_time, check_out_time,
    guests_count, breakfast_included, phone, rating, price_per_night, total_nights
) VALUES (
    'opt24_hotel_lt',
    '理塘康巴大酒店',
    '高原适应房',
    '14:00',
    '12:00',
    2,
    true,
    '0836-5326888',
    4.5,
    500.00,
    1
);

-- ==========================================
-- Day 6 (10月4日): 理塘→稻城→香格里拉镇
-- ==========================================

-- 理塘→稻城
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    latitude, longitude, altitude, address,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, properties, order_index, created_by, created_at, updated_at
) VALUES (
    'opt25_drive_lt_dc',
    '$plan_id',
    'transport',
    '理塘→稻城',
    '经G227省道，145公里，途经海子山姊妹湖',
    29.0376, 100.2990, 3750, '稻城县',
    '2025-10-04 09:30:00',
    '2025-10-04 12:30:00',
    3.0,
    150.00,
    5,
    'planned',
    '{"route": "G227", "highlight": "姊妹湖"}'::jsonb,
    25,
    '$USER_ID',
    NOW(),
    NOW()
);

-- 海子山姊妹湖
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    latitude, longitude, altitude, address,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, properties, order_index, created_by, created_at, updated_at
) VALUES (
    'opt26_sisters_lake',
    '$plan_id',
    'attraction',
    '海子山姊妹湖',
    '海拔4685米高原湖泊，两湖相依如碧玉镶嵌',
    29.3167, 100.1833, 4685, '海子山观景台',
    '2025-10-04 10:30:00',
    '2025-10-04 11:30:00',
    1.0,
    0.00,
    5,
    'planned',
    '{"elevation": "4685m", "feature": "双湖"}'::jsonb,
    26,
    '$USER_ID',
    NOW(),
    NOW()
);

INSERT INTO attraction_details (
    item_id, attraction_type, ticket_price, ticket_type,
    best_visit_time, recommended_duration, difficulty_level, photography_tips
) VALUES (
    'opt26_sisters_lake',
    'alpine_lake',
    0.00,
    '免费',
    '上午10:30-11:30',
    1.0,
    3,
    '高海拔强风，相机防护重要，偏振镜增强湖水蓝色'
);

-- 稻城县城游览
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, properties, order_index, created_by, created_at, updated_at
) VALUES (
    'opt27_daocheng_city',
    '$plan_id',
    'other',
    '稻城县城游览',
    '参观白塔公园，品尝当地美食',
    '2025-10-04 12:30:00',
    '2025-10-04 14:00:00',
    1.5,
    100.00,
    3,
    'planned',
    '{"attractions": ["白塔公园"], "local_food": true}'::jsonb,
    27,
    '$USER_ID',
    NOW(),
    NOW()
);

-- 稻城→香格里拉镇
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    latitude, longitude, altitude, address,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, properties, order_index, created_by, created_at, updated_at
) VALUES (
    'opt28_drive_dc_yd',
    '$plan_id',
    'transport',
    '稻城→香格里拉镇',
    '进入亚丁景区，75公里山路风景如画',
    28.4167, 100.3167, 2900, '香格里拉镇',
    '2025-10-04 14:30:00',
    '2025-10-04 16:30:00',
    2.0,
    80.00,
    5,
    'planned',
    '{"distance": "75km", "scenery": "雪山森林"}'::jsonb,
    28,
    '$USER_ID',
    NOW(),
    NOW()
);

-- 香格里拉镇住宿（第一晚）
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    latitude, longitude, altitude, address,
    start_datetime, end_datetime,
    cost, priority, status, properties, order_index, created_by, created_at, updated_at
) VALUES (
    'opt29_hotel_yd_d1',
    '$plan_id',
    'accommodation',
    '亚丁村精品酒店（第一晚）',
    '景区内酒店，观三神山，便于多次进出',
    28.4167, 100.3167, 2900, '亚丁村',
    '2025-10-04 17:00:00',
    '2025-10-05 08:00:00',
    820.00,
    5,
    'planned',
    '{"location": "景区内", "mountain_view": true}'::jsonb,
    29,
    '$USER_ID',
    NOW(),
    NOW()
);

INSERT INTO accommodation_details (
    item_id, hotel_name, room_type, check_in_time, check_out_time,
    guests_count, breakfast_included, phone, rating, price_per_night, total_nights
) VALUES (
    'opt29_hotel_yd_d1',
    '亚丁村藏缘精品酒店',
    '雪山景观房',
    '14:00',
    '12:00',
    2,
    true,
    '0836-5728888',
    4.7,
    820.00,
    1
);

-- ==========================================
-- Day 7 (10月5日): 亚丁短线游
-- ==========================================

-- 亚丁景区门票
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    start_datetime, end_datetime,
    cost, priority, status, properties, order_index, created_by, created_at, updated_at
) VALUES (
    'opt30_yading_tickets',
    '$plan_id',
    'ticket',
    '亚丁景区门票（2天）',
    '含门票+观光车，两日有效',
    '2025-10-05 08:00:00',
    '2025-10-06 18:00:00',
    350.00,
    5,
    'planned',
    '{"validity": "2天", "includes": "门票+观光车"}'::jsonb,
    30,
    '$USER_ID',
    NOW(),
    NOW()
);

-- 冲古寺
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    latitude, longitude, altitude, address,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, properties, order_index, created_by, created_at, updated_at
) VALUES (
    'opt31_chonggu_temple',
    '$plan_id',
    'attraction',
    '冲古寺',
    '三神山守护寺，近距离观赏仙乃日',
    28.3833, 100.3500, 3880, '冲古寺',
    '2025-10-05 09:00:00',
    '2025-10-05 10:00:00',
    1.0,
    0.00,
    5,
    'planned',
    '{"guardian_temple": true, "mountain": "仙乃日"}'::jsonb,
    31,
    '$USER_ID',
    NOW(),
    NOW()
);

-- 珍珠海徒步
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    latitude, longitude, altitude, address,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, properties, order_index, created_by, created_at, updated_at
) VALUES (
    'opt32_pearl_lake',
    '$plan_id',
    'attraction',
    '珍珠海（卓玛拉措）',
    '仙乃日神山下圣湖，完美倒影',
    28.3916, 100.3583, 4100, '珍珠海',
    '2025-10-05 10:30:00',
    '2025-10-05 14:00:00',
    3.5,
    0.00,
    5,
    'planned',
    '{"sacred_lake": true, "reflection": "仙乃日"}'::jsonb,
    32,
    '$USER_ID',
    NOW(),
    NOW()
);

INSERT INTO attraction_details (
    item_id, attraction_type, ticket_price, ticket_type,
    best_visit_time, recommended_duration, difficulty_level, photography_tips
) VALUES (
    'opt32_pearl_lake',
    'sacred_lake',
    0.00,
    '含在门票内',
    '上午10:30-14:00',
    3.5,
    2,
    '无风上午拍摄倒影最佳，仙乃日雪山是主体构图'
);

-- 下午休整
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, order_index, created_by, created_at, updated_at
) VALUES (
    'opt33_afternoon_rest',
    '$plan_id',
    'other',
    '下午休整',
    '酒店休息，为明日长线徒步储备体力',
    '2025-10-05 14:30:00',
    '2025-10-05 17:30:00',
    3.0,
    0.00,
    3,
    'planned',
    33,
    '$USER_ID',
    NOW(),
    NOW()
);

-- 香格里拉镇住宿（第二晚）
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    latitude, longitude, altitude, address,
    start_datetime, end_datetime,
    cost, priority, status, order_index, created_by, created_at, updated_at
) VALUES (
    'opt34_hotel_yd_d2',
    '$plan_id',
    'accommodation',
    '亚丁村精品酒店（第二晚）',
    '连续住宿，深度体验亚丁',
    28.4167, 100.3167, 2900, '亚丁村',
    '2025-10-05 18:00:00',
    '2025-10-06 08:00:00',
    820.00,
    5,
    'planned',
    34,
    '$USER_ID',
    NOW(),
    NOW()
);

-- ==========================================
-- Day 8 (10月6日): 亚丁长线挑战游
-- ==========================================

-- 电瓶车至洛绒牛场
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    start_datetime, end_datetime,
    cost, priority, status, properties, order_index, created_by, created_at, updated_at
) VALUES (
    'opt35_electric_bus',
    '$plan_id',
    'transport',
    '洛绒牛场电瓶车',
    '冲古寺-洛绒牛场往返，节省体力',
    '2025-10-06 08:30:00',
    '2025-10-06 17:00:00',
    180.00,
    4,
    'planned',
    '{"route": "冲古寺↔洛绒牛场"}'::jsonb,
    35,
    '$USER_ID',
    NOW(),
    NOW()
);

-- 洛绒牛场
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    latitude, longitude, altitude, address,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, properties, order_index, created_by, created_at, updated_at
) VALUES (
    'opt36_luorong_pasture',
    '$plan_id',
    'attraction',
    '洛绒牛场',
    '三神山环绕的高山牧场，最佳观景点',
    28.3667, 100.3500, 4150, '洛绒牛场',
    '2025-10-06 09:00:00',
    '2025-10-06 10:00:00',
    1.0,
    0.00,
    5,
    'planned',
    '{"surrounded_by": "三神山", "best_viewpoint": true}'::jsonb,
    36,
    '$USER_ID',
    NOW(),
    NOW()
);

-- 牛奶海徒步
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    latitude, longitude, altitude, address,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, properties, order_index, created_by, created_at, updated_at
) VALUES (
    'opt37_milk_lake',
    '$plan_id',
    'attraction',
    '牛奶海（俄绒措）',
    '央迈勇下圣湖，海拔4600米，极具挑战',
    28.3750, 100.3583, 4600, '牛奶海',
    '2025-10-06 10:30:00',
    '2025-10-06 13:30:00',
    3.0,
    0.00,
    5,
    'planned',
    '{"elevation": "4600m", "difficulty": "极高"}'::jsonb,
    37,
    '$USER_ID',
    NOW(),
    NOW()
);

INSERT INTO attraction_details (
    item_id, attraction_type, ticket_price, ticket_type,
    best_visit_time, recommended_duration, difficulty_level, photography_tips
) VALUES (
    'opt37_milk_lake',
    'alpine_lake',
    0.00,
    '含在门票内',
    '上午10:30-13:30',
    3.0,
    5,
    '高海拔摄影注意电池保暖，牛奶色湖水配央迈勇雪山'
);

-- 五色海挑战
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    latitude, longitude, altitude, address,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, properties, order_index, created_by, created_at, updated_at
) VALUES (
    'opt38_five_color_lake',
    '$plan_id',
    'attraction',
    '五色海（丹增措）',
    '海拔4700米，亚丁最高点，神秘五色',
    28.3833, 100.3583, 4700, '五色海',
    '2025-10-06 14:00:00',
    '2025-10-06 15:30:00',
    1.5,
    0.00,
    5,
    'planned',
    '{"elevation": "4700m", "highest_point": true}'::jsonb,
    38,
    '$USER_ID',
    NOW(),
    NOW()
);

INSERT INTO attraction_details (
    item_id, attraction_type, ticket_price, ticket_type,
    best_visit_time, recommended_duration, difficulty_level, photography_tips
) VALUES (
    'opt38_five_color_lake',
    'alpine_lake',
    0.00,
    '含在门票内',
    '中午14:00-15:30阳光充足',
    1.5,
    5,
    '需强光看到五色效果，天气变化快，注意安全'
);

-- 香格里拉镇住宿（第三晚）
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    latitude, longitude, altitude, address,
    start_datetime, end_datetime,
    cost, priority, status, order_index, created_by, created_at, updated_at
) VALUES (
    'opt39_hotel_yd_d3',
    '$plan_id',
    'accommodation',
    '亚丁村精品酒店（第三晚）',
    '最后一晚亚丁住宿，珍惜雪山美景',
    28.4167, 100.3167, 2900, '亚丁村',
    '2025-10-06 18:00:00',
    '2025-10-07 09:00:00',
    820.00,
    5,
    'planned',
    39,
    '$USER_ID',
    NOW(),
    NOW()
);

-- ==========================================
-- Day 9 (10月7日): 亚丁→新都桥
-- ==========================================

-- 亚丁→新都桥
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    latitude, longitude, altitude, address,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, properties, order_index, created_by, created_at, updated_at
) VALUES (
    'opt40_drive_yd_xdq',
    '$plan_id',
    'transport',
    '香格里拉镇→新都桥',
    '经稻城、理塘前往摄影天堂，约320公里',
    30.0333, 101.7833, 3300, '新都桥',
    '2025-10-07 09:30:00',
    '2025-10-07 16:00:00',
    6.5,
    280.00,
    5,
    'planned',
    '{"distance": "320km", "destination": "摄影天堂"}'::jsonb,
    40,
    '$USER_ID',
    NOW(),
    NOW()
);

INSERT INTO transport_details (
    item_id, transport_type, departure_location, arrival_location,
    departure_time, arrival_time, distance_km, estimated_fuel_cost
) VALUES (
    'opt40_drive_yd_xdq',
    'self_drive',
    '香格里拉镇',
    '新都桥镇',
    '2025-10-07 09:30:00',
    '2025-10-07 16:00:00',
    320.0,
    250.00
);

-- 新都桥摄影
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    latitude, longitude, altitude, address,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, properties, order_index, created_by, created_at, updated_at
) VALUES (
    'opt41_xdq_photography',
    '$plan_id',
    'attraction',
    '新都桥十里画廊',
    '川西摄影天堂，光与影的世界',
    30.0333, 101.7833, 3300, '新都桥十里画廊',
    '2025-10-07 16:30:00',
    '2025-10-07 18:30:00',
    2.0,
    0.00,
    5,
    'planned',
    '{"famous_for": "摄影天堂", "elements": "光影"}'::jsonb,
    41,
    '$USER_ID',
    NOW(),
    NOW()
);

INSERT INTO attraction_details (
    item_id, attraction_type, ticket_price, ticket_type,
    best_visit_time, recommended_duration, difficulty_level, photography_tips
) VALUES (
    'opt41_xdq_photography',
    'photography_spot',
    0.00,
    '免费',
    '黄昏16:30-18:30',
    2.0,
    1,
    '光影变化是新都桥特色，小桥流水藏房经幡构成经典元素'
);

-- 新都桥住宿
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    latitude, longitude, altitude, address,
    start_datetime, end_datetime,
    cost, priority, status, properties, order_index, created_by, created_at, updated_at
) VALUES (
    'opt42_hotel_xdq',
    '$plan_id',
    'accommodation',
    '新都桥印象雅致酒店',
    '摄影爱好者首选，可观贡嘎雪山',
    30.0333, 101.7833, 3300, '新都桥318国道',
    '2025-10-07 19:00:00',
    '2025-10-08 09:00:00',
    620.00,
    5,
    'planned',
    '{"photography_hotel": true, "gongga_view": true}'::jsonb,
    42,
    '$USER_ID',
    NOW(),
    NOW()
);

INSERT INTO accommodation_details (
    item_id, hotel_name, room_type, check_in_time, check_out_time,
    guests_count, breakfast_included, phone, rating, price_per_night, total_nights
) VALUES (
    'opt42_hotel_xdq',
    '新都桥印象雅致酒店',
    '山景大床房',
    '14:00',
    '12:00',
    2,
    true,
    '0836-2866888',
    4.6,
    620.00,
    1
);

-- ==========================================
-- Day 10 (10月8日): 新都桥→成都
-- ==========================================

-- 新都桥日出（可选）
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, properties, order_index, created_by, created_at, updated_at
) VALUES (
    'opt43_sunrise_xdq',
    '$plan_id',
    'other',
    '新都桥日出摄影',
    '早起拍摄贡嘎雪山日出',
    '2025-10-08 07:00:00',
    '2025-10-08 08:30:00',
    1.5,
    0.00,
    4,
    'optional',
    '{"activity": "日出摄影", "target": "贡嘎雪山"}'::jsonb,
    43,
    '$USER_ID',
    NOW(),
    NOW()
);

-- 新都桥→成都
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    latitude, longitude, altitude, address,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, properties, order_index, created_by, created_at, updated_at
) VALUES (
    'opt44_drive_xdq_cd',
    '$plan_id',
    'transport',
    '新都桥→成都',
    '经康定、雅安返回成都，约380公里',
    30.6598, 104.0805, 500, '成都市区',
    '2025-10-08 09:30:00',
    '2025-10-08 16:30:00',
    7.0,
    330.00,
    5,
    'planned',
    '{"distance": "380km", "route": "康定-雅安-成都"}'::jsonb,
    44,
    '$USER_ID',
    NOW(),
    NOW()
);

INSERT INTO transport_details (
    item_id, transport_type, departure_location, arrival_location,
    departure_time, arrival_time, distance_km, estimated_fuel_cost, toll_cost
) VALUES (
    'opt44_drive_xdq_cd',
    'self_drive',
    '新都桥镇',
    '成都市区',
    '2025-10-08 09:30:00',
    '2025-10-08 16:30:00',
    380.0,
    280.00,
    50.00
);

-- 康定午餐
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, properties, order_index, created_by, created_at, updated_at
) VALUES (
    'opt45_lunch_kangding',
    '$plan_id',
    'dining',
    '康定情歌故乡午餐',
    '在康定品尝最后的川西美食',
    '2025-10-08 12:30:00',
    '2025-10-08 13:30:00',
    1.0,
    120.00,
    3,
    'planned',
    '{"location": "康定", "farewell_meal": true}'::jsonb,
    45,
    '$USER_ID',
    NOW(),
    NOW()
);

-- 成都住宿
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    latitude, longitude, altitude, address,
    start_datetime, end_datetime,
    cost, priority, status, properties, order_index, created_by, created_at, updated_at
) VALUES (
    'opt46_hotel_cd_final',
    '$plan_id',
    'accommodation',
    '成都机场酒店',
    '机场附近住宿，方便次日早班机',
    30.5783, 103.9467, 500, '成都双流机场',
    '2025-10-08 17:00:00',
    '2025-10-09 08:00:00',
    350.00,
    4,
    'planned',
    '{"airport_nearby": true, "convenient": true}'::jsonb,
    46,
    '$USER_ID',
    NOW(),
    NOW()
);

INSERT INTO accommodation_details (
    item_id, hotel_name, room_type, check_in_time, check_out_time,
    guests_count, breakfast_included, phone, rating, price_per_night, total_nights
) VALUES (
    'opt46_hotel_cd_final',
    '成都机场希尔顿酒店',
    '标准大床房',
    '14:00',
    '12:00',
    2,
    true,
    '028-85718888',
    4.5,
    350.00,
    1
);

-- 成都美食体验
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, properties, order_index, created_by, created_at, updated_at
) VALUES (
    'opt47_chengdu_food',
    '$plan_id',
    'dining',
    '成都火锅告别晚餐',
    '享受正宗成都火锅，为川西之旅画下句号',
    '2025-10-08 19:00:00',
    '2025-10-08 21:00:00',
    2.0,
    200.00,
    3,
    'planned',
    '{"cuisine": "成都火锅", "farewell": true}'::jsonb,
    47,
    '$USER_ID',
    NOW(),
    NOW()
);

-- ==========================================
-- Day 11 (10月9日): 成都→北京
-- ==========================================

-- 还车
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, properties, order_index, created_by, created_at, updated_at
) VALUES (
    'opt48_return_car',
    '$plan_id',
    'transport',
    '机场还车',
    '归还租用车辆，办理相关手续',
    '2025-10-09 08:30:00',
    '2025-10-09 09:30:00',
    1.0,
    0.00,
    4,
    'planned',
    '{"final_settlement": true}'::jsonb,
    48,
    '$USER_ID',
    NOW(),
    NOW()
);

-- 返程航班
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    latitude, longitude, altitude, address,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, properties, order_index, created_by, created_at, updated_at
) VALUES (
    'opt49_flight_cd_bj',
    '$plan_id',
    'transport',
    '成都-北京航班 CA4114',
    '成都T2→北京T3，结束川西深度游',
    30.5783, 103.9467, 488, '成都双流T2',
    '2025-10-09 11:30:00',
    '2025-10-09 14:45:00',
    3.25,
    1200.00,
    5,
    'planned',
    '{"return_flight": true, "journey_end": true}'::jsonb,
    49,
    '$USER_ID',
    NOW(),
    NOW()
);

INSERT INTO transport_details (
    item_id, transport_type, departure_location, arrival_location,
    departure_time, arrival_time, carrier_name, vehicle_number,
    departure_terminal, arrival_terminal
) VALUES (
    'opt49_flight_cd_bj',
    'flight',
    '成都双流国际机场T2',
    '北京首都国际机场T3',
    '2025-10-09 11:30:00',
    '2025-10-09 14:45:00',
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
    ('rel_001', 'opt03_hotel_cd', 'opt05_car_rental', 'nearby', NOW()),
    ('rel_002', 'opt09_hotel_sgn', 'opt08_shuangqiao', 'nearby', NOW()),
    ('rel_003', 'opt09_hotel_sgn', 'opt10_changping', 'nearby', NOW()),
    ('rel_004', 'opt14_hotel_db', 'opt13_jiaju_village', 'nearby', NOW()),
    ('rel_005', 'opt20_hotel_gz', 'opt19_baili_temple', 'nearby', NOW()),
    ('rel_006', 'opt29_hotel_yd_d1', 'opt31_chonggu_temple', 'nearby', NOW()),
    ('rel_007', 'opt36_luorong_pasture', 'opt35_electric_bus', 'requires', NOW()),
    ('rel_008', 'opt37_milk_lake', 'opt38_five_color_lake', 'nearby', NOW()),
    ('rel_009', 'opt42_hotel_xdq', 'opt41_xdq_photography', 'nearby', NOW()),
    ('rel_010', 'opt32_pearl_lake', 'opt31_chonggu_temple', 'connected_by_trail', NOW());

-- ==========================================
-- 创建重要标注
-- ==========================================
INSERT INTO item_annotations (
    id, item_id, annotation_type, content, rating, created_by, created_at, updated_at
) VALUES
    ('ann_001', 'opt08_shuangqiao', 'photo_tip', '双桥沟秋季彩林拍摄建议下午15:30-18:30，阳光斜射层次丰富', 5, '$USER_ID', NOW(), NOW()),
    ('ann_002', 'opt13_jiaju_village', 'cultural_note', '甲居藏寨是嘉绒藏族建筑典范，黄昏时分藏房在夕阳下最美', 5, '$USER_ID', NOW(), NOW()),
    ('ann_003', 'opt17_moshi_park', 'geological_info', '全球唯一糜棱岩石林，中午强光下黑石与蓝天对比最强烈', 5, '$USER_ID', NOW(), NOW()),
    ('ann_004', 'opt26_sisters_lake', 'altitude_warning', '海子山姊妹湖海拔4685米，停留时间不宜过长，注意高原反应', 4, '$USER_ID', NOW(), NOW()),
    ('ann_005', 'opt32_pearl_lake', 'hiking_tip', '珍珠海是亚丁最经典徒步，老少皆宜，拍摄仙乃日倒影选择无风上午', 5, '$USER_ID', NOW(), NOW()),
    ('ann_006', 'opt37_milk_lake', 'difficulty_warning', '牛奶海徒步极具挑战，往返8公里，海拔4600米，需极好体力', 5, '$USER_ID', NOW(), NOW()),
    ('ann_007', 'opt38_five_color_lake', 'safety_warning', '五色海海拔4700米亚丁最高点，天气变化快，务必注意安全', 5, '$USER_ID', NOW(), NOW()),
    ('ann_008', 'opt41_xdq_photography', 'photo_tip', '新都桥摄影天堂，黄昏和日出光影效果最佳，经典川西元素齐全', 5, '$USER_ID', NOW(), NOW()),
    ('ann_009', 'opt23_maoya_grassland', 'landscape_tip', '理塘毛垭大草原秋季金黄，无量河蜿蜒其间，是拍摄高原草原经典', 5, '$USER_ID', NOW(), NOW());

-- ==========================================
-- 创建预算明细
-- ==========================================
INSERT INTO budget_items (
    id, plan_id, category, description,
    estimated_amount, actual_amount, currency, payment_status, created_at
) VALUES
    ('bdg_001', '$plan_id', '交通', '往返机票（2人）', 2400.00, NULL, 'CNY', 'pending', NOW()),
    ('bdg_002', '$plan_id', '交通', '租车费用（11天）', 7800.00, NULL, 'CNY', 'pending', NOW()),
    ('bdg_003', '$plan_id', '交通', '全程油费', 2200.00, NULL, 'CNY', 'pending', NOW()),
    ('bdg_004', '$plan_id', '交通', '过路费+停车', 450.00, NULL, 'CNY', 'pending', NOW()),
    ('bdg_005', '$plan_id', '交通', '机场交通+市内', 200.00, NULL, 'CNY', 'pending', NOW()),

    ('bdg_006', '$plan_id', '住宿', '成都酒店（2晚）', 830.00, NULL, 'CNY', 'pending', NOW()),
    ('bdg_007', '$plan_id', '住宿', '四姑娘山酒店', 650.00, NULL, 'CNY', 'pending', NOW()),
    ('bdg_008', '$plan_id', '住宿', '丹巴酒店', 380.00, NULL, 'CNY', 'pending', NOW()),
    ('bdg_009', '$plan_id', '住宿', '甘孜酒店', 450.00, NULL, 'CNY', 'pending', NOW()),
    ('bdg_010', '$plan_id', '住宿', '理塘酒店', 500.00, NULL, 'CNY', 'pending', NOW()),
    ('bdg_011', '$plan_id', '住宿', '亚丁村酒店（3晚）', 2460.00, NULL, 'CNY', 'pending', NOW()),
    ('bdg_012', '$plan_id', '住宿', '新都桥酒店', 620.00, NULL, 'CNY', 'pending', NOW()),

    ('bdg_013', '$plan_id', '餐饮', '正餐费用', 2200.00, NULL, 'CNY', 'pending', NOW()),
    ('bdg_014', '$plan_id', '餐饮', '特色美食', 600.00, NULL, 'CNY', 'pending', NOW()),
    ('bdg_015', '$plan_id', '餐饮', '零食饮料', 500.00, NULL, 'CNY', 'pending', NOW()),

    ('bdg_016', '$plan_id', '门票', '亚丁景区门票', 350.00, NULL, 'CNY', 'pending', NOW()),
    ('bdg_017', '$plan_id', '门票', '四姑娘山门票', 190.00, NULL, 'CNY', 'pending', NOW()),
    ('bdg_018', '$plan_id', '门票', '墨石公园门票', 60.00, NULL, 'CNY', 'pending', NOW()),
    ('bdg_019', '$plan_id', '门票', '甲居藏寨门票', 50.00, NULL, 'CNY', 'pending', NOW()),

    ('bdg_020', '$plan_id', '活动', '电瓶车', 180.00, NULL, 'CNY', 'pending', NOW()),
    ('bdg_021', '$plan_id', '活动', '骑马服务', 280.00, NULL, 'CNY', 'pending', NOW()),
    ('bdg_022', '$plan_id', '活动', '摄影创作', 400.00, NULL, 'CNY', 'pending', NOW()),

    ('bdg_023', '$plan_id', '购物', '特产伴手礼', 1200.00, NULL, 'CNY', 'pending', NOW()),
    ('bdg_024', '$plan_id', '购物', '藏族工艺品', 600.00, NULL, 'CNY', 'pending', NOW()),

    ('bdg_025', '$plan_id', '其他', '旅游保险', 250.00, NULL, 'CNY', 'pending', NOW()),
    ('bdg_026', '$plan_id', '其他', '高原药物+氧气', 300.00, NULL, 'CNY', 'pending', NOW()),
    ('bdg_027', '$plan_id', '其他', '应急备用金', 2490.00, NULL, 'CNY', 'pending', NOW());

COMMIT;

-- 输出统计信息
DO \$\$
DECLARE
    v_plan_count INTEGER;
    v_item_count INTEGER;
    v_budget_count INTEGER;
    v_total_budget NUMERIC;
    v_accommodation_count INTEGER;
    v_attraction_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_plan_count FROM plans WHERE id = '$plan_id';
    SELECT COUNT(*) INTO v_item_count FROM travel_items WHERE plan_id = '$plan_id';
    SELECT COUNT(*) INTO v_budget_count FROM budget_items WHERE plan_id = '$plan_id';
    SELECT SUM(estimated_amount) INTO v_total_budget FROM budget_items WHERE plan_id = '$plan_id';
    SELECT COUNT(*) INTO v_accommodation_count FROM travel_items WHERE plan_id = '$plan_id' AND item_type = 'accommodation';
    SELECT COUNT(*) INTO v_attraction_count FROM travel_items WHERE plan_id = '$plan_id' AND item_type = 'attraction';

    RAISE NOTICE '========================================';
    RAISE NOTICE '✓ 川西深度游优化版数据导入成功！';
    RAISE NOTICE '========================================';
    RAISE NOTICE '  计划ID: %', '$plan_id';
    RAISE NOTICE '  用户ID: %', '$USER_ID';
    RAISE NOTICE '  总预算: ¥%', v_total_budget;
    RAISE NOTICE '  行程天数: 11天10晚';
    RAISE NOTICE '  旅游项目: % 个', v_item_count;
    RAISE NOTICE '  住宿项目: % 个', v_accommodation_count;
    RAISE NOTICE '  景点项目: % 个', v_attraction_count;
    RAISE NOTICE '  预算项目: % 个', v_budget_count;
    RAISE NOTICE '========================================';
    RAISE NOTICE '🗺️ 优化路线亮点:';
    RAISE NOTICE '  • 四姑娘山：双桥沟+长坪沟双沟深度游';
    RAISE NOTICE '  • 丹巴美人谷：甲居藏寨+中路藏寨';
    RAISE NOTICE '  • 墨石公园：全球唯一黑色石林';
    RAISE NOTICE '  • 甘孜白利寺：康巴藏传佛教文化';
    RAISE NOTICE '  • 理塘毛垭：中国最美高原草原';
    RAISE NOTICE '  • 稻城亚丁：三神山+三圣湖深度游';
    RAISE NOTICE '  • 新都桥：川西摄影天堂';
    RAISE NOTICE '========================================';
    RAISE NOTICE '⚡ 路线优化优势:';
    RAISE NOTICE '  ✓ 去除色达绕路，节省6小时车程';
    RAISE NOTICE '  ✓ 增加丹巴美人谷，体验嘉绒文化';
    RAISE NOTICE '  ✓ 亚丁连住3晚，深度体验三神山';
    RAISE NOTICE '  ✓ 海拔梯次适应，高原反应风险降低';
    RAISE NOTICE '  ✓ 每日行车时间合理，游览更从容';
    RAISE NOTICE '========================================';
END \$\$;
EOF

    if [ $? -eq 0 ]; then
        print_message "✓ 川西深度游优化版数据导入成功！" "$GREEN"
        print_message "" ""
        print_message "📋 导入详情：" "$BLUE"
        print_message "  计划ID: $plan_id" "$BLUE"
        print_message "  总预算: ¥28,000" "$BLUE"
        print_message "  旅游项目: 49个" "$BLUE"
        print_message "" ""
        print_message "🎯 路线优化亮点：" "$GREEN"
        print_message "  ✓ 去除色达绕路，节省大量车程时间" "$GREEN"
        print_message "  ✓ 增加丹巴美人谷，体验嘉绒藏族文化" "$GREEN"
        print_message "  ✓ 亚丁连住3晚，深度游览三神山" "$GREEN"
        print_message "  ✓ 行程更从容，每日安排更合理" "$GREEN"
        print_message "" ""
        print_message "📍 核心景点：四姑娘山+丹巴+墨石公园+甘孜+理塘+稻城亚丁+新都桥" "$BLUE"
        print_message "" ""
    else
        print_message "✗ 数据导入失败，请检查错误" "$RED"
        exit 1
    fi
}

main() {
    print_title "2025川西深度游优化版数据导入系统"
    print_message "去除色达，增加丹巴，路线更合理从容" "$YELLOW"

    if [ -z "$DB_PASSWORD" ]; then
        print_message "请设置数据库密码: export DB_PASSWORD=your_password" "$RED"
        exit 1
    fi

    check_database_connection
    import_optimized_tour

    print_message "\n🔍 导入完成！可使用以下SQL查询：" "$GREEN"
    echo ""
    echo "-- 查看优化计划"
    echo "SELECT * FROM plans WHERE id LIKE 'plan_opt_%';"
    echo ""
    echo "-- 查看每日行程"
    echo "SELECT DATE(start_datetime) as day, name, item_type,"
    echo "       COALESCE(cost, 0) as cost, priority"
    echo "FROM travel_items WHERE plan_id LIKE 'plan_opt_%'"
    echo "ORDER BY start_datetime, order_index;"
    echo ""
    echo "-- 查看住宿安排"
    echo "SELECT ti.name, ti.altitude, DATE(ti.start_datetime) as date,"
    echo "       ad.price_per_night"
    echo "FROM travel_items ti"
    echo "LEFT JOIN accommodation_details ad ON ti.id = ad.item_id"
    echo "WHERE ti.plan_id LIKE 'plan_opt_%' AND ti.item_type = 'accommodation'"
    echo "ORDER BY ti.start_datetime;"
    echo ""
    echo "-- 查看景点安排"
    echo "SELECT ti.name, ti.altitude, DATE(ti.start_datetime) as date,"
    echo "       atd.difficulty_level, atd.photography_tips"
    echo "FROM travel_items ti"
    echo "LEFT JOIN attraction_details atd ON ti.id = atd.item_id"
    echo "WHERE ti.plan_id LIKE 'plan_opt_%' AND ti.item_type = 'attraction'"
    echo "ORDER BY ti.start_datetime;"
}

main