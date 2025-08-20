#!/bin/bash

# =====================================================
# 稻城亚丁深度游旅游计划完整数据导入脚本
# 使用方法: ./import_deep_tour.sh [user_id]
# =====================================================

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# 打印带颜色的消息
print_message() {
    echo -e "${2}${1}${NC}"
}

# 打印标题
print_title() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}   $1${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

# 检查数据库连接
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

# 检查或创建用户
ensure_user_exists() {
    local user_id=$1
    local username=${2:-"admin"}
    local email=${3:-"${username}@example.com"}

    print_message "检查用户是否存在: $user_id" "$YELLOW"

    # 检查用户是否存在
    local user_exists=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM users WHERE id = '$user_id'" 2>/dev/null | tr -d ' ')

    if [ "$user_exists" = "0" ] || [ -z "$user_exists" ]; then
        print_message "用户不存在，正在创建用户: $user_id" "$YELLOW"

        # 创建新用户（使用默认密码的哈希值）
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

# 清理已存在的计划数据
cleanup_existing_plan() {
    local plan_id=$1

    print_message "清理已存在的计划数据: $plan_id" "$YELLOW"

    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME <<EOF
-- 清理已存在的数据
DELETE FROM budget_items WHERE plan_id = '$plan_id';
DELETE FROM item_relations WHERE source_item_id IN (SELECT id FROM travel_items WHERE plan_id = '$plan_id');
DELETE FROM item_relations WHERE target_item_id IN (SELECT id FROM travel_items WHERE plan_id = '$plan_id');
DELETE FROM item_annotations WHERE item_id IN (SELECT id FROM travel_items WHERE plan_id = '$plan_id');
DELETE FROM item_attachments WHERE item_id IN (SELECT id FROM travel_items WHERE plan_id = '$plan_id');
DELETE FROM attraction_details WHERE item_id IN (SELECT id FROM travel_items WHERE plan_id = '$plan_id');
DELETE FROM transport_details WHERE item_id IN (SELECT id FROM travel_items WHERE plan_id = '$plan_id');
DELETE FROM accommodation_details WHERE item_id IN (SELECT id FROM travel_items WHERE plan_id = '$plan_id');
DELETE FROM travel_items WHERE plan_id = '$plan_id';
DELETE FROM plans WHERE id = '$plan_id';
EOF
    print_message "✓ 清理完成" "$GREEN"
}

# 导入深度游完整方案
import_deep_tour_complete() {
    local plan_id="plan_daocheng_deep_$(date +%Y%m%d_%H%M%S)"

    print_title "导入稻城亚丁11天深度游完整方案"

    # 确保用户存在
    ensure_user_exists "$USER_ID" "admin" "admin@admin.admin"

    # 清理旧数据
    if [ "$FORCE_IMPORT" = "true" ]; then
        cleanup_existing_plan "$plan_id"
    fi

    print_message "开始导入完整数据..." "$YELLOW"
    print_message "使用用户ID: $USER_ID" "$BLUE"
    print_message "使用计划ID: $plan_id" "$BLUE"

    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME <<EOF
BEGIN;

-- ==========================================
-- 1. 创建深度游计划
-- ==========================================
INSERT INTO plans (
    id, user_id, name, description, destination,
    start_date, end_date, budget, participants,
    status, visibility, tags, created_at, updated_at
) VALUES (
    '$plan_id',
    '$USER_ID', 
    '稻城亚丁11天深度摄影游【完整版】',
    '从北京出发，飞抵成都后租车自驾，深度游览稻城亚丁及川西沿线精华景点。行程涵盖摄影天堂新都桥、世界高城理塘、最后的香格里拉稻城亚丁等地。包含3天景区深度游览，充分拍摄三神山美景，体验藏族文化，品尝特色美食。',
    '稻城亚丁',
    '2025-09-29',
    '2025-10-10',
    25000.00,
    2,
    'planned',
    'private',
    ARRAY['深度游', '摄影', '高原', '雪山', '秋景', '藏文化', '自驾'],
    NOW(),
    NOW()
);

-- ==========================================
-- 2. Day 1 (9月29日): 北京→成都
-- ==========================================
-- 去程航班
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, booking_status, order_index, created_at, updated_at
) VALUES (
    'item_001_flight_bjs_ctu',
    '$plan_id',  
    'transport',
    '北京-成都航班 CA4113',
    '中国国航CA4113航班，19:50起飞，23:05抵达。建议提前2小时到机场办理登机',
    '2025-09-29 19:50:00',
    '2025-09-29 23:05:00',
    3.25,
    1200.00,
    5,
    'confirmed',
    'pending',
    1,
    NOW(),
    NOW()
);

-- 航班详情
INSERT INTO transport_details (
    item_id, transport_type, departure_location, arrival_location,
    departure_time, arrival_time, carrier_name, vehicle_number,
    departure_terminal, arrival_terminal
) VALUES (
    'item_001_flight_bjs_ctu',
    'flight',
    '北京首都国际机场',
    '成都双流国际机场',
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
    address, latitude, longitude,
    start_datetime, end_datetime,
    cost, priority, status, booking_status,
    properties, notes, order_index, created_at, updated_at
) VALUES (
    'item_002_hotel_chengdu_d1',
    '$plan_id', 
    'accommodation',
    '成都春熙路亚朵酒店',
    '位于春熙路商圈，距离IFS国际金融中心300米，方便购物和品尝美食。次日租车点就在附近',
    '成都市锦江区春熙路步行街',
    30.6598, 104.0805,
    '2025-09-29 23:30:00',
    '2025-09-30 12:00:00',
    450.00,
    4,
    'confirmed',
    'pending',
    '{"room_type": "高级大床房", "breakfast": true, "wifi": true, "parking": true}'::jsonb,
    '酒店提供免费早餐和停车服务',
    2,
    NOW(),
    NOW()
);

-- 住宿详情
INSERT INTO accommodation_details (
    item_id, hotel_name, room_type, check_in_time, check_out_time,
    guests_count, breakfast_included, booking_platform, phone, rating
) VALUES (
    'item_002_hotel_chengdu_d1',
    '成都春熙路亚朵酒店',
    '高级大床房',
    '14:00',
    '12:00',
    2,
    true,
    '携程',
    '028-86688888',
    4.8
);

-- ==========================================
-- 3. Day 2 (9月30日): 成都→康定 (340km)
-- ==========================================
-- 租车
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    address, start_datetime, end_datetime, duration_hours,
    cost, priority, status, properties, order_index, created_at, updated_at
) VALUES (
    'item_003_car_rental',
    '$plan_id',
    'transport',
    'SUV租车 - 丰田汉兰达',
    '丰田汉兰达7座SUV，适合高原驾驶，含基础保险+不计免赔。神州租车春熙路店取车',
    '成都市锦江区春熙路神州租车',
    '2025-09-30 09:00:00',
    '2025-10-09 18:00:00',
    240,
    6600.00,
    5,
    'confirmed',
    '{"vehicle": "丰田汉兰达", "seats": 7, "fuel": "汽油", "insurance": "全险", "company": "神州租车"}'::jsonb,
    3,
    NOW(),
    NOW()
);

-- 成都早餐
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    address, start_datetime, end_datetime, duration_hours,
    cost, priority, status, order_index, created_at, updated_at
) VALUES (
    'item_004_breakfast_chengdu',
    '$plan_id',
    'other',
    '龙抄手总店',
    '品尝成都特色早餐：龙抄手、担担面、钟水饺',
    '成都市锦江区联升巷',
    '2025-09-30 07:30:00',
    '2025-09-30 08:30:00',
    1,
    60.00,
    3,
    'planned',
    4,
    NOW(),
    NOW()
);

-- 泸定桥景点
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    address, latitude, longitude, altitude,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, properties, order_index, created_at, updated_at
) VALUES (
    'item_005_luding_bridge',
    '$plan_id',
    'attraction',
    '泸定桥',
    '红军飞夺泸定桥历史遗迹，横跨大渡河的古老铁索桥',
    '甘孜州泸定县',
    29.9142, 102.2347, 1330,
    '2025-09-30 13:00:00',
    '2025-09-30 14:00:00',
    1,
    10.00,
    3,
    'planned',
    '{"type": "历史遗迹", "tickets": "成人10元", "photo_spot": true}'::jsonb,
    5,
    NOW(),
    NOW()
);

-- 康定住宿
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    address, latitude, longitude, altitude,
    start_datetime, end_datetime,
    cost, priority, status, properties, notes, order_index, created_at, updated_at
) VALUES (
    'item_006_hotel_kangding',
    '$plan_id',
    'accommodation',
    '康定锅庄温泉度假酒店',
    '康定市区高档温泉酒店，可泡温泉缓解旅途疲劳，有助于适应高原',
    '康定市榆林新区',
    30.0544, 101.9637, 2560,
    '2025-09-30 18:00:00',
    '2025-10-01 09:00:00',
    580.00,
    4,
    'confirmed',
    '{"room_type": "豪华山景房", "hot_spring": true, "oxygen": true}'::jsonb,
    '酒店提供温泉和供氧设施',
    6,
    NOW(),
    NOW()
);

-- ==========================================
-- 4. Day 3 (10月1日): 康定→新都桥 (75km)
-- ==========================================
-- 折多山垭口
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    address, latitude, longitude, altitude,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, properties, notes, order_index, created_at, updated_at
) VALUES (
    'item_007_zheduoshan',
    '$plan_id',
    'photo_spot',
    '折多山垭口',
    '康巴第一关，海拔4298米，是川藏线上第一个需要翻越的高山垭口。云海、日出绝佳拍摄地',
    '折多山垭口',
    30.0896, 101.8523, 4298,
    '2025-10-01 10:30:00',
    '2025-10-01 11:30:00',
    1,
    0,
    5,
    'planned',
    '{"elevation": 4298, "features": ["云海", "经幡", "观景台"], "difficulty": "easy"}'::jsonb,
    '注意高原反应，不要剧烈运动',
    7,
    NOW(),
    NOW()
);

-- 新都桥午餐
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    address, start_datetime, end_datetime,
    cost, priority, status, order_index, created_at, updated_at
) VALUES (
    'item_008_lunch_xinduqiao',
    '$plan_id',
    'other',
    '藏家石锅鸡',
    '品尝特色石锅鸡和酥油茶',
    '新都桥镇',
    '2025-10-01 12:30:00',
    '2025-10-01 13:30:00',
    150.00,
    3,
    'planned',
    8,
    NOW(),
    NOW()
);

-- 新都桥十里画廊
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    address, latitude, longitude, altitude,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, properties, notes, order_index, created_at, updated_at
) VALUES (
    'item_009_xinduqiao_gallery',
    '$plan_id',
    'photo_spot',
    '新都桥十里画廊',
    '摄影家天堂，10月金秋胡杨林最美。沿途藏式民居、小河流水、光影变幻',
    '新都桥镇',
    30.0708, 101.4853, 3460,
    '2025-10-01 14:30:00',
    '2025-10-01 17:30:00',
    3,
    0,
    5,
    'planned',
    '{"best_time": "早晨7-9点，傍晚17-19点", "photo_spots": ["胡杨林", "藏式民居", "河流", "远山"]}'::jsonb,
    '最佳拍摄时间是早晚的斜射光',
    9,
    NOW(),
    NOW()
);

-- 新都桥住宿
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    address, latitude, longitude, altitude,
    start_datetime, end_datetime,
    cost, priority, status, properties, order_index, created_at, updated_at
) VALUES (
    'item_010_hotel_xinduqiao',
    '$plan_id',
    'accommodation',
    '新都桥瓦泽乡居摄影主题酒店',
    '专为摄影爱好者打造，楼顶观景台可拍摄贡嘎雪山日照金山',
    '新都桥镇瓦泽乡',
    30.0708, 101.4853, 3460,
    '2025-10-01 18:00:00',
    '2025-10-02 09:00:00',
    680.00,
    5,
    'confirmed',
    '{"features": ["观景台", "摄影向导", "免费三脚架"], "view": "贡嘎雪山"}'::jsonb,
    10,
    NOW(),
    NOW()
);

-- ==========================================
-- 5. Day 4 (10月2日): 新都桥→理塘→稻城 (350km)
-- ==========================================
-- 高尔寺山
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    address, latitude, longitude, altitude,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, order_index, created_at, updated_at
) VALUES (
    'item_011_gaersi_mountain',
    '$plan_id',
    'photo_spot',
    '高尔寺山观景台',
    '海拔4412米，可远眺贡嘎雪山群峰',
    '高尔寺山垭口',
    30.0896, 101.8523, 4412,
    '2025-10-02 10:00:00',
    '2025-10-02 10:30:00',
    0.5,
    0,
    4,
    'planned',
    11,
    NOW(),
    NOW()
);

-- 天路十八弯
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    address, latitude, longitude, altitude,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, properties, order_index, created_at, updated_at
) VALUES (
    'item_012_tianlu_18_bends',
    '$plan_id',
    'photo_spot',
    '天路十八弯观景台',
    '川藏线奇观，壮观的盘山公路，从观景台俯瞰整个天路十八弯',
    '雅江至理塘路段',
    29.7856, 100.7523, 3990,
    '2025-10-02 11:30:00',
    '2025-10-02 12:00:00',
    0.5,
    0,
    5,
    'planned',
    '{"photo_tips": "使用长焦镜头压缩景深", "best_angle": "观景台东侧"}'::jsonb,
    12,
    NOW(),
    NOW()
);

-- 理塘午餐
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    address, start_datetime, end_datetime,
    cost, priority, status, order_index, created_at, updated_at
) VALUES (
    'item_013_lunch_litang',
    '$plan_id',
    'other',
    '理塘高原鳕鱼庄',
    '品尝理塘特色高原鳕鱼',
    '理塘县城',
    '2025-10-02 13:00:00',
    '2025-10-02 14:00:00',
    200.00,
    3,
    'planned',
    13,
    NOW(),
    NOW()
);

-- 勒通古镇
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    address, latitude, longitude, altitude,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, properties, order_index, created_at, updated_at
) VALUES (
    'item_014_letong_ancient_town',
    '$plan_id',
    'attraction',
    '勒通古镇（千户藏寨）',
    '丁真的家乡，体验原汁原味的藏族文化，观看藏族歌舞表演',
    '理塘县城',
    30.0000, 100.2667, 4014,
    '2025-10-02 14:00:00',
    '2025-10-02 15:30:00',
    1.5,
    0,
    4,
    'planned',
    '{"activities": ["藏族歌舞", "转经筒", "藏族服饰体验"]}'::jsonb,
    14,
    NOW(),
    NOW()
);

-- 海子山
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    address, latitude, longitude, altitude,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, properties, notes, order_index, created_at, updated_at
) VALUES (
    'item_015_haizishan',
    '$plan_id',
    'photo_spot',
    '海子山自然保护区',
    '古冰帽遗迹，1145个高山湖泊，外星球般的地貌，是青藏高原最大的古冰体遗迹',
    '理塘至稻城路段',
    29.4736, 100.2458, 4500,
    '2025-10-02 16:30:00',
    '2025-10-02 17:30:00',
    1,
    0,
    5,
    'planned',
    '{"features": ["姊妹湖", "石河", "冰蚀地貌"], "area": "3287平方公里"}'::jsonb,
    '姊妹湖是最佳拍摄点',
    15,
    NOW(),
    NOW()
);

-- 稻城住宿
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    address, latitude, longitude, altitude,
    start_datetime, end_datetime,
    cost, priority, status, properties, order_index, created_at, updated_at
) VALUES (
    'item_016_hotel_daocheng',
    '$plan_id',
    'accommodation',
    '稻城雪域花园温泉酒店',
    '稻城县最好的温泉酒店，泡温泉有助于缓解疲劳和适应高原',
    '稻城县金珠镇',
    29.0372, 100.2984, 3750,
    '2025-10-02 18:30:00',
    '2025-10-03 09:00:00',
    680.00,
    4,
    'confirmed',
    '{"facilities": ["温泉", "供氧", "餐厅", "停车场"]}'::jsonb,
    16,
    NOW(),
    NOW()
);

-- ==========================================
-- 6. Day 5 (10月3日): 稻城→亚丁村 (110km)
-- ==========================================
-- 稻城青杨林
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    address, latitude, longitude, altitude,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, order_index, created_at, updated_at
) VALUES (
    'item_017_qingyang_forest',
    '$plan_id',
    'photo_spot',
    '稻城万亩青杨林',
    '世界海拔最高的胡杨林，10月金黄一片',
    '稻城县城郊',
    29.0372, 100.2984, 3750,
    '2025-10-03 09:30:00',
    '2025-10-03 10:30:00',
    1,
    0,
    4,
    'planned',
    17,
    NOW(),
    NOW()
);

-- 桑堆红草地
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    address, latitude, longitude, altitude,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, properties, notes, order_index, created_at, updated_at
) VALUES (
    'item_018_red_grassland',
    '$plan_id',
    'photo_spot',
    '桑堆红草地',
    '季节性景观，每年9-10月呈现红色，极具观赏价值',
    '桑堆镇',
    29.0372, 100.2984, 3800,
    '2025-10-03 11:00:00',
    '2025-10-03 11:30:00',
    0.5,
    10.00,
    4,
    'planned',
    '{"season": "9-10月", "color": "红色", "area": "湿地"}'::jsonb,
    '需要付费给当地村民10元',
    18,
    NOW(),
    NOW()
);

-- 稻城白塔
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    address, latitude, longitude, altitude,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, order_index, created_at, updated_at
) VALUES (
    'item_019_white_pagoda',
    '$plan_id',
    'attraction',
    '稻城白塔（尊胜塔林）',
    '藏区最大的白塔群，共108座白塔',
    '稻城县城',
    29.0372, 100.2984, 3750,
    '2025-10-03 11:45:00',
    '2025-10-03 12:15:00',
    0.5,
    0,
    3,
    'planned',
    19,
    NOW(),
    NOW()
);

-- 香格里拉镇午餐
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    address, start_datetime, end_datetime,
    cost, priority, status, order_index, created_at, updated_at
) VALUES (
    'item_020_lunch_shangri_la',
    '$plan_id',
    'other',
    '香格里拉镇藏餐厅',
    '品尝藏式牦牛肉火锅',
    '香格里拉镇',
    '2025-10-03 13:00:00',
    '2025-10-03 14:00:00',
    180.00,
    3,
    'planned',
    20,
    NOW(),
    NOW()
);

-- 亚丁景区门票
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    address, start_datetime, end_datetime,
    cost, priority, status, properties, order_index, created_at, updated_at
) VALUES (
    'item_021_yading_ticket',
    '$plan_id',
    'other',
    '亚丁景区门票+观光车票',
    '门票146元/人，观光车120元/人（必须），有效期3天，可多次进出',
    '亚丁景区游客中心',
    '2025-10-03 14:30:00',
    '2025-10-06 18:00:00',
    532.00,
    5,
    'confirmed',
    '{"ticket": 146, "bus": 120, "validity": "3天", "per_person": 266}'::jsonb,
    21,
    NOW(),
    NOW()
);

-- 观光车进景区
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    address, start_datetime, end_datetime, duration_hours,
    cost, priority, status, order_index, created_at, updated_at
) VALUES (
    'item_022_scenic_bus',
    '$plan_id',
    'transport',
    '景区观光车（游客中心-亚丁村）',
    '乘坐观光车进入景区，路程约1小时，沿途风景优美',
    '亚丁景区',
    '2025-10-03 15:00:00',
    '2025-10-03 16:00:00',
    1,
    0,
    4,
    'confirmed',
    22,
    NOW(),
    NOW()
);

-- 亚丁村住宿（3晚）
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    address, latitude, longitude, altitude,
    start_datetime, end_datetime,
    cost, priority, status, properties, notes, order_index, created_at, updated_at
) VALUES (
    'item_023_hotel_yading',
    '$plan_id',
    'accommodation',
    '亚丁村德西康巴客栈',
    '景区内住宿3晚，位置绝佳，可看到仙乃日神山，方便二次进山节省观光车费',
    '亚丁村2号站',
    28.4656, 100.3326, 3900,
    '2025-10-03 17:00:00',
    '2025-10-06 10:00:00',
    2400.00,
    5,
    'confirmed',
    '{"nights": 3, "view": "仙乃日", "facilities": ["电热毯", "24小时热水", "供氧"]}'::jsonb,
    '住景区内可节省二次进山观光车费60元/人',
    23,
    NOW(),
    NOW()
);

-- ==========================================
-- 7. Day 6 (10月4日): 亚丁景区短线游
-- ==========================================
-- 冲古寺
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    address, latitude, longitude, altitude,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, properties, order_index, created_at, updated_at
) VALUES (
    'item_024_chonggu_temple',
    '$plan_id',
    'attraction',
    '冲古寺',
    '海拔3880米的藏传佛教寺庙，是拍摄仙乃日雪山倒影的绝佳位置',
    '亚丁景区',
    28.3744, 100.3644, 3880,
    '2025-10-04 08:30:00',
    '2025-10-04 09:30:00',
    1,
    0,
    4,
    'planned',
    '{"built": "元朝", "altitude": 3880, "deity": "仙乃日"}'::jsonb,
    24,
    NOW(),
    NOW()
);

-- 珍珠海徒步
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    address, latitude, longitude, altitude,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, properties, notes, order_index, created_at, updated_at
) VALUES (
    'item_025_pearl_lake',
    '$plan_id',
    'attraction',
    '珍珠海（卓玛拉措）',
    '仙乃日神山脚下的圣湖，碧绿如翡翠，是拍摄仙乃日倒影的最佳地点',
    '亚丁景区',
    28.3655, 100.3826, 4100,
    '2025-10-04 09:30:00',
    '2025-10-04 13:00:00',
    3.5,
    0,
    5,
    'planned',
    '{"distance": "往返5.6km", "difficulty": "中等", "elevation_gain": 200}'::jsonb,
    '最佳拍摄时间是上午，仙乃日倒影最清晰',
    25,
    NOW(),
    NOW()
);

-- 冲古草甸
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    address, latitude, longitude, altitude,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, order_index, created_at, updated_at
) VALUES (
    'item_026_chonggu_meadow',
    '$plan_id',
    'photo_spot',
    '冲古草甸',
    '大片的草甸，背景是三座神山，是拍摄风光大片的好地方',
    '亚丁景区',
    28.3744, 100.3644, 3880,
    '2025-10-04 14:00:00',
    '2025-10-04 16:00:00',
    2,
    0,
    4,
    'planned',
    26,
    NOW(),
    NOW()
);

-- 仙乃日日落
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    address, latitude, longitude, altitude,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, properties, order_index, created_at, updated_at
) VALUES (
    'item_027_xiannairi_sunset',
    '$plan_id',
    'photo_spot',
    '仙乃日日落金山',
    '在亚丁村拍摄仙乃日日照金山',
    '亚丁村',
    28.4656, 100.3326, 3900,
    '2025-10-04 17:30:00',
    '2025-10-04 19:00:00',
    1.5,
    0,
    5,
    'planned',
    '{"best_spot": "亚丁村2号站观景台", "equipment": "70-200mm镜头"}'::jsonb,
    27,
    NOW(),
    NOW()
);

-- ==========================================
-- 8. Day 7 (10月5日): 亚丁景区长线游
-- ==========================================
-- 早起拍日出
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    address, latitude, longitude, altitude,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, order_index, created_at, updated_at
) VALUES (
    'item_028_sunrise',
    '$plan_id',
    'photo_spot',
    '亚丁村日出',
    '拍摄仙乃日日出金山',
    '亚丁村观景台',
    28.4656, 100.3326, 3900,
    '2025-10-05 06:00:00',
    '2025-10-05 07:00:00',
    1,
    0,
    5,
    'planned',
    28,
    NOW(),
    NOW()
);

-- 电瓶车到洛绒牛场
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    address, start_datetime, end_datetime, duration_hours,
    cost, priority, status, order_index, created_at, updated_at
) VALUES (
    'item_029_electric_bus',
    '$plan_id',
    'transport',
    '电瓶车（冲古寺-洛绒牛场）',
    '往返80元/人，单程50元/人，节省体力用于长线徒步',
    '亚丁景区',
    '2025-10-05 07:30:00',
    '2025-10-05 08:00:00',
    0.5,
    160.00,
    4,
    'confirmed',
    29,
    NOW(),
    NOW()
);

-- 洛绒牛场
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    address, latitude, longitude, altitude,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, properties, order_index, created_at, updated_at
) VALUES (
    'item_030_luorong_pasture',
    '$plan_id',
    'photo_spot',
    '洛绒牛场',
    '海拔4180米的高山牧场，是观看三座神山的最佳位置，央迈勇正面全景',
    '亚丁景区',
    28.4166, 100.3500, 4180,
    '2025-10-05 08:00:00',
    '2025-10-05 09:00:00',
    1,
    0,
    5,
    'planned',
    '{"view": ["央迈勇", "夏诺多吉"], "facilities": ["休息站", "补给站"]}'::jsonb,
    30,
    NOW(),
    NOW()
);

-- 牛奶海徒步
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    address, latitude, longitude, altitude,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, properties, notes, order_index, created_at, updated_at
) VALUES (
    'item_031_milk_lake',
    '$plan_id',
    'attraction',
    '牛奶海',
    '海拔4600米的高原圣湖，湖水呈乳白色，被雪山环绕',
    '亚丁景区',
    28.3880, 100.3590, 4600,
    '2025-10-05 09:00:00',
    '2025-10-05 13:00:00',
    4,
    0,
    5,
    'planned',
    '{"distance": "单程5km", "difficulty": "困难", "elevation_gain": 420, "horse": "可骑马上山300元"}'::jsonb,
    '量力而行，注意高原反应',
    31,
    NOW(),
    NOW()
);

-- 五色海
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    address, latitude, longitude, altitude,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, properties, notes, order_index, created_at, updated_at
) VALUES (
    'item_032_five_color_lake',
    '$plan_id',
    'attraction',
    '五色海',
    '海拔4700米，湖水在阳光照射下呈现五种颜色，是当地人心中的圣湖',
    '亚丁景区',
    28.3850, 100.3560, 4700,
    '2025-10-05 13:00:00',
    '2025-10-05 14:00:00',
    1,
    0,
    5,
    'planned',
    '{"distance": "从牛奶海步行20分钟", "difficulty": "困难", "sacred": true}'::jsonb,
    '亚丁景区最高点，务必注意安全',
    32,
    NOW(),
    NOW()
);

-- 返程下山
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    address, start_datetime, end_datetime, duration_hours,
    cost, priority, status, order_index, created_at, updated_at
) VALUES (
    'item_033_return_trek',
    '$plan_id',
    'other',
    '返程下山',
    '从五色海原路返回洛绒牛场，乘电瓶车返回',
    '亚丁景区',
    '2025-10-05 14:00:00',
    '2025-10-05 17:00:00',
    3,
    0,
    4,
    'planned',
    33,
    NOW(),
    NOW()
);

-- ==========================================
-- 9. Day 8 (10月6日): 亚丁→稻城→理塘 (230km)
-- ==========================================
-- 二次进山短线补拍
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    address, start_datetime, end_datetime, duration_hours,
    cost, priority, status, notes, order_index, created_at, updated_at
) VALUES (
    'item_034_second_entry',
    '$plan_id',
    'other',
    '二次进山补拍（可选）',
    '根据前两天天气情况，选择是否二次进山补拍',
    '亚丁景区',
    '2025-10-06 07:00:00',
    '2025-10-06 09:00:00',
    2,
    60.00,
    2,
    'optional',
    '住景区内只需付观光车半价60元',
    34,
    NOW(),
    NOW()
);

-- 出景区
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    address, start_datetime, end_datetime, duration_hours,
    cost, priority, status, order_index, created_at, updated_at
) VALUES (
    'item_035_exit_scenic',
    '$plan_id',
    'transport',
    '观光车出景区',
    '乘坐观光车从亚丁村到游客中心',
    '亚丁景区',
    '2025-10-06 10:00:00',
    '2025-10-06 11:00:00',
    1,
    0,
    4,
    'confirmed',
    35,
    NOW(),
    NOW()
);

-- 稻城午餐
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    address, start_datetime, end_datetime,
    cost, priority, status, order_index, created_at, updated_at
) VALUES (
    'item_036_lunch_daocheng',
    '$plan_id',
    'other',
    '稻城松茸炖鸡',
    '品尝稻城特产松茸',
    '稻城县城',
    '2025-10-06 13:00:00',
    '2025-10-06 14:00:00',
    220.00,
    3,
    'planned',
    36,
    NOW(),
    NOW()
);

-- 理塘住宿
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    address, latitude, longitude, altitude,
    start_datetime, end_datetime,
    cost, priority, status, properties, order_index, created_at, updated_at
) VALUES (
    'item_037_hotel_litang',
    '$plan_id',
    'accommodation',
    '理塘高城假日酒店',
    '世界高城理塘，海拔4014米',
    '理塘县城中心',
    30.0000, 100.2667, 4014,
    '2025-10-06 18:00:00',
    '2025-10-07 09:00:00',
    380.00,
    3,
    'confirmed',
    '{"altitude": 4014, "facilities": ["供氧", "暖气"]}'::jsonb,
    37,
    NOW(),
    NOW()
);

-- ==========================================
-- 10. Day 9 (10月7日): 理塘→雅江 (140km)
-- ==========================================
-- 理塘毛垭大草原
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    address, latitude, longitude, altitude,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, order_index, created_at, updated_at
) VALUES (
    'item_038_maoya_grassland',
    '$plan_id',
    'photo_spot',
    '毛垭大草原',
    '川西高寒草原，面积辽阔，是理塘的标志性景观',
    '理塘西郊',
    29.9967, 100.2000, 4000,
    '2025-10-07 09:30:00',
    '2025-10-07 10:30:00',
    1,
    0,
    4,
    'planned',
    38,
    NOW(),
    NOW()
);

-- 卡子拉山
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    address, latitude, longitude, altitude,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, order_index, created_at, updated_at
) VALUES (
    'item_039_kazila_mountain',
    '$plan_id',
    'photo_spot',
    '卡子拉山垭口',
    '海拔4718米，云端上的高山牧场',
    '理塘至雅江路段',
    29.9000, 100.5000, 4718,
    '2025-10-07 11:00:00',
    '2025-10-07 11:30:00',
    0.5,
    0,
    3,
    'planned',
    39,
    NOW(),
    NOW()
);

-- 雅江午餐
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    address, start_datetime, end_datetime,
    cost, priority, status, order_index, created_at, updated_at
) VALUES (
    'item_040_lunch_yajiang',
    '$plan_id',
    'other',
    '雅江雅鱼庄',
    '品尝雅江特色雅鱼',
    '雅江县城',
    '2025-10-07 13:00:00',
    '2025-10-07 14:00:00',
    180.00,
    3,
    'planned',
    40,
    NOW(),
    NOW()
);

-- 雅江住宿
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    address, latitude, longitude, altitude,
    start_datetime, end_datetime,
    cost, priority, status, properties, order_index, created_at, updated_at
) VALUES (
    'item_041_hotel_yajiang',
    '$plan_id',
    'accommodation',
    '雅江驿都大酒店',
    '雅砻江畔，海拔2640米，氧气充足舒适',
    '雅江县城',
    30.0314, 101.0146, 2640,
    '2025-10-07 18:00:00',
    '2025-10-08 09:00:00',
    320.00,
    3,
    'confirmed',
    '{"river_view": true, "altitude": 2640}'::jsonb,
    41,
    NOW(),
    NOW()
);

-- ==========================================
-- 11. Day 10 (10月8日): 雅江→成都 (360km)
-- ==========================================
-- 早餐
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    address, start_datetime, end_datetime,
    cost, priority, status, order_index, created_at, updated_at
) VALUES (
    'item_042_breakfast_yajiang',
    '$plan_id',
    'other',
    '雅江早餐',
    '酒店早餐',
    '雅江县城',
    '2025-10-08 08:00:00',
    '2025-10-08 09:00:00',
    40.00,
    2,
    'planned',
    42,
    NOW(),
    NOW()
);

-- 新都桥停留
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    address, start_datetime, end_datetime, duration_hours,
    cost, priority, status, order_index, created_at, updated_at
) VALUES (
    'item_043_xinduqiao_stop',
    '$plan_id',
    'photo_spot',
    '新都桥补拍',
    '返程再次经过新都桥，可补拍照片',
    '新都桥镇',
    '2025-10-08 10:30:00',
    '2025-10-08 11:30:00',
    1,
    0,
    2,
    'optional',
    43,
    NOW(),
    NOW()
);

-- 康定午餐
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    address, start_datetime, end_datetime,
    cost, priority, status, order_index, created_at, updated_at
) VALUES (
    'item_044_lunch_kangding',
    '$plan_id',
    'other',
    '康定牦牛肉汤锅',
    '最后一顿藏餐',
    '康定市',
    '2025-10-08 13:00:00',
    '2025-10-08 14:00:00',
    160.00,
    3,
    'planned',
    44,
    NOW(),
    NOW()
);

-- 还车
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    address, start_datetime, end_datetime, duration_hours,
    cost, priority, status, order_index, created_at, updated_at
) VALUES (
    'item_045_return_car',
    '$plan_id',
    'transport',
    '成都还车',
    '神州租车成都机场店还车',
    '成都双流机场',
    '2025-10-08 18:00:00',
    '2025-10-08 19:00:00',
    1,
    0,
    5,
    'confirmed',
    45,
    NOW(),
    NOW()
);

-- 成都住宿
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    address, latitude, longitude,
    start_datetime, end_datetime,
    cost, priority, status, properties, order_index, created_at, updated_at
) VALUES (
    'item_046_hotel_chengdu_d10',
    '$plan_id',
    'accommodation',
    '成都空港大酒店',
    '机场附近，方便次日登机',
    '成都双流机场附近',
    30.5728, 103.9470,
    '2025-10-08 19:30:00',
    '2025-10-09 20:00:00',
    380.00,
    4,
    'confirmed',
    '{"shuttle": true, "distance_to_airport": "5km"}'::jsonb,
    46,
    NOW(),
    NOW()
);

-- ==========================================
-- 12. Day 11 (10月9日): 成都一日游+返程
-- ==========================================
-- 武侯祠
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    address, latitude, longitude,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, order_index, created_at, updated_at
) VALUES (
    'item_047_wuhou_temple',
    '$plan_id',
    'attraction',
    '武侯祠',
    '三国文化圣地，刘备和诸葛亮的祠堂',
    '成都市武侯区',
    30.6469, 104.0478,
    '2025-10-09 09:00:00',
    '2025-10-09 11:00:00',
    2,
    60.00,
    3,
    'optional',
    47,
    NOW(),
    NOW()
);

-- 锦里古街
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    address, latitude, longitude,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, order_index, created_at, updated_at
) VALUES (
    'item_048_jinli_street',
    '$plan_id',
    'attraction',
    '锦里古街',
    '成都著名古街，购买特产伴手礼',
    '成都市武侯区',
    30.6444, 104.0475,
    '2025-10-09 11:00:00',
    '2025-10-09 13:00:00',
    2,
    0,
    3,
    'optional',
    48,
    NOW(),
    NOW()
);

-- 成都火锅
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    address, start_datetime, end_datetime,
    cost, priority, status, order_index, created_at, updated_at
) VALUES (
    'item_049_hotpot_chengdu',
    '$plan_id',
    'other',
    '小龙坎火锅',
    '离开前必吃的成都火锅',
    '成都市春熙路',
    '2025-10-09 13:00:00',
    '2025-10-09 15:00:00',
    300.00,
    4,
    'planned',
    49,
    NOW(),
    NOW()
);

-- 返程航班
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    start_datetime, end_datetime, duration_hours,
    cost, priority, status, booking_status, order_index, created_at, updated_at
) VALUES (
    'item_050_flight_ctu_bjs',
    '$plan_id',
    'transport',
    '成都-北京航班 CA4194',
    '中国国航CA4194航班，21:15起飞，00:15+1抵达',
    '2025-10-09 21:15:00',
    '2025-10-10 00:15:00',
    3,
    1200.00,
    5,
    'confirmed',
    'pending',
    50,
    NOW(),
    NOW()
);

-- 航班详情
INSERT INTO transport_details (
    item_id, transport_type, departure_location, arrival_location,
    departure_time, arrival_time, carrier_name, vehicle_number,
    departure_terminal, arrival_terminal
) VALUES (
    'item_050_flight_ctu_bjs',
    'flight',
    '成都双流国际机场',
    '北京首都国际机场',
    '2025-10-09 21:15:00',
    '2025-10-10 00:15:00',
    '中国国航',
    'CA4194',
    'T2',
    'T3'
);

-- ==========================================
-- 13. 插入其他费用项目
-- ==========================================
-- 全程油费
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    cost, priority, status, properties, order_index, created_at, updated_at
) VALUES (
    'item_051_fuel',
    '$plan_id',
    'other',
    '全程油费',
    '预计行驶2000公里，按1元/公里计算',
    2000.00,
    4,
    'estimated',
    '{"total_distance": "2000km", "fuel_price": "8.5元/升", "consumption": "10L/100km"}'::jsonb,
    51,
    NOW(),
    NOW()
);

-- 过路费
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    cost, priority, status, order_index, created_at, updated_at
) VALUES (
    'item_052_toll',
    '$plan_id',
    'other',
    '过路费',
    '成雅高速+雅康高速',
    200.00,
    3,
    'estimated',
    52,
    NOW(),
    NOW()
);

-- 停车费
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    cost, priority, status, order_index, created_at, updated_at
) VALUES (
    'item_053_parking',
    '$plan_id',
    'other',
    '停车费',
    '各景点及酒店停车费',
    150.00,
    2,
    'estimated',
    53,
    NOW(),
    NOW()
);

-- 保险
INSERT INTO travel_items (
    id, plan_id, item_type, name, description,
    cost, priority, status, order_index, created_at, updated_at
) VALUES (
    'item_054_insurance',
    '$plan_id',
    'other',
    '旅游保险',
    '高原旅游意外险（2人）',
    200.00,
    4,
    'confirmed',
    54,
    NOW(),
    NOW()
);

-- ==========================================
-- 14. 创建元素关联关系
-- ==========================================
INSERT INTO item_relations (
    id, source_item_id, target_item_id, relation_type, created_at
) VALUES
    ('rel_001', 'item_002_hotel_chengdu_d1', 'item_003_car_rental', 'nearby', NOW()),
    ('rel_002', 'item_010_hotel_xinduqiao', 'item_009_xinduqiao_gallery', 'nearby', NOW()),
    ('rel_003', 'item_023_hotel_yading', 'item_024_chonggu_temple', 'nearby', NOW()),
    ('rel_004', 'item_023_hotel_yading', 'item_025_pearl_lake', 'nearby', NOW()),
    ('rel_005', 'item_023_hotel_yading', 'item_031_milk_lake', 'nearby', NOW()),
    ('rel_006', 'item_029_electric_bus', 'item_030_luorong_pasture', 'transport_to', NOW()),
    ('rel_007', 'item_031_milk_lake', 'item_032_five_color_lake', 'nearby', NOW()),
    ('rel_008', 'item_047_wuhou_temple', 'item_048_jinli_street', 'nearby', NOW());

-- ==========================================
-- 15. 创建预算明细
-- ==========================================
INSERT INTO budget_items (
    id, plan_id, category, description,
    estimated_amount, actual_amount, currency, payment_status, created_at
) VALUES
    ('budget_001', '$plan_id', '交通', '往返机票（2人）', 2400.00, NULL, 'CNY', 'pending', NOW()),
    ('budget_002', '$plan_id', '交通', '租车费用（11天）', 6600.00, NULL, 'CNY', 'pending', NOW()),
    ('budget_003', '$plan_id', '交通', '油费', 2000.00, NULL, 'CNY', 'pending', NOW()),
    ('budget_004', '$plan_id', '交通', '过路费+停车费', 350.00, NULL, 'CNY', 'pending', NOW()),
    ('budget_005', '$plan_id', '住宿', '全程酒店（10晚）', 5870.00, NULL, 'CNY', 'pending', NOW()),
    ('budget_006', '$plan_id', '餐饮', '正餐费用', 2490.00, NULL, 'CNY', 'pending', NOW()),
    ('budget_007', '$plan_id', '餐饮', '零食饮料', 500.00, NULL, 'CNY', 'pending', NOW()),
    ('budget_008', '$plan_id', '门票', '亚丁景区门票+观光车', 532.00, NULL, 'CNY', 'pending', NOW()),
    ('budget_009', '$plan_id', '门票', '其他景点门票', 70.00, NULL, 'CNY', 'pending', NOW()),
    ('budget_010', '$plan_id', '活动', '电瓶车+骑马（可选）', 460.00, NULL, 'CNY', 'pending', NOW()),
    ('budget_011', '$plan_id', '购物', '特产伴手礼', 1000.00, NULL, 'CNY', 'pending', NOW()),
    ('budget_012', '$plan_id', '其他', '旅游保险', 200.00, NULL, 'CNY', 'pending', NOW()),
    ('budget_013', '$plan_id', '其他', '应急备用金', 2528.00, NULL, 'CNY', 'pending', NOW());

-- ==========================================
-- 16. 添加一些标注信息
-- ==========================================
INSERT INTO item_annotations (
    id, item_id, annotation_type, content, rating, created_by, created_at, updated_at
) VALUES
    ('ann_001', 'item_009_xinduqiao_gallery', 'photo_tip', '最佳拍摄时间是早上7-9点和傍晚17-19点，光线斜射时胡杨林呈现金黄色', 5, '$USER_ID', NOW(), NOW()),
    ('ann_002', 'item_025_pearl_lake', 'warning', '珍珠海海拔4100米，徒步需注意高原反应，建议慢行', 4, '$USER_ID', NOW(), NOW()),
    ('ann_003', 'item_031_milk_lake', 'difficulty', '牛奶海徒步难度大，往返约10公里，需要良好体力。可选择骑马上山（300元/人）', 5, '$USER_ID', NOW(), NOW()),
    ('ann_004', 'item_015_haizishan', 'highlight', '姊妹湖是海子山的精华，两个相连的高原湖泊，是拍摄倒影的绝佳地点', 5, '$USER_ID', NOW(), NOW()),
    ('ann_005', 'item_023_hotel_yading', 'tips', '住在景区内虽然条件简陋，但可以节省二次进山的观光车费，也方便早起拍日出', 4, '$USER_ID', NOW(), NOW());

COMMIT;

-- ==========================================
-- 输出统计信息
-- ==========================================
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
    RAISE NOTICE '✓ 数据导入完成！';
    RAISE NOTICE '  计划数量: %', v_plan_count;
    RAISE NOTICE '  旅游项目: % 个', v_item_count;
    RAISE NOTICE '  预算项目: % 个', v_budget_count;
    RAISE NOTICE '  总预算: ¥%', v_total_budget;
    RAISE NOTICE '========================================';
END \$\$;
EOF

    if [ $? -eq 0 ]; then
        print_message "✓ 深度游完整方案导入成功！" "$GREEN"
        print_message "  计划ID: $plan_id" "$BLUE"
        print_message "  用户ID: $USER_ID" "$BLUE"
        print_message "  总预算: ¥25,000" "$BLUE"
        print_message "  行程天数: 11天10晚" "$BLUE"
        print_message "  旅游项目: 54个" "$BLUE"
    else
        print_message "✗ 数据导入失败，请检查错误信息" "$RED"
        exit 1
    fi
}

# 主函数
main() {
    print_title "稻城亚丁深度游数据导入系统"

    # 检查环境变量
    if [ -z "$DB_PASSWORD" ]; then
        print_message "请设置数据库密码环境变量: export DB_PASSWORD=your_password" "$RED"
        exit 1
    fi

    # 检查数据库连接
    check_database_connection

    # 导入完整数据
    import_deep_tour_complete

    print_message "\n导入完成！您可以使用以下SQL查询数据：" "$GREEN"
    echo ""
    echo "-- 查看计划概览"
    echo "SELECT * FROM plans WHERE id LIKE 'plan_daocheng_deep_%';"
    echo ""
    echo "-- 查看每日行程"
    echo "SELECT DATE(start_datetime) as day, name, item_type, cost"
    echo "FROM travel_items"
    echo "WHERE plan_id LIKE 'plan_daocheng_deep_%'"
    echo "ORDER BY order_index;"
    echo ""
    echo "-- 查看预算汇总"
    echo "SELECT category, SUM(estimated_amount) as total"
    echo "FROM budget_items"
    echo "WHERE plan_id LIKE 'plan_daocheng_deep_%'"
    echo "GROUP BY category;"
}

# 运行主函数
main

# =====================================================
# 使用说明：
# 1. 设置数据库密码：export DB_PASSWORD=your_password
# 2. 运行脚本：./import_deep_tour.sh [user_id]
# 3. 如需强制覆盖：./import_deep_tour.sh user_id true
# =====================================================
