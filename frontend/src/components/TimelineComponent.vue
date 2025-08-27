<template>
  <div class="timeline-container">
    <div v-if="!timelineData || Object.keys(timelineData).length === 0" class="empty-state">
      <el-empty
          description="暂无时间安排"
          :image-size="100"
      >
        <template #description>
          <p>请添加包含时间信息的旅游元素</p>
        </template>
      </el-empty>
    </div>

    <div v-else class="timeline-content">
      <div class="timeline">
        <div
            v-for="(dayData, date) in timelineData"
            :key="String(date)"
            class="timeline-day"
        >
          <!-- 日期头部 -->
          <div class="day-header">
            <div class="day-info">
              <h3 class="day-date">{{ formatDate(String(date)) }}</h3>
              <div class="day-stats">
                <span class="item-count">{{ dayData.items.length }}项活动</span>
                <span v-if="dayData.totalCost > 0" class="day-cost">¥{{ dayData.totalCost.toFixed(2) }}</span>
              </div>
            </div>
            <div class="day-progress">
              <el-progress
                  :percentage="dayData.completionRate"
                  :width="60"
                  type="circle"
                  :show-text="false"
                  :stroke-width="4"
              />
            </div>
          </div>

          <!-- 时间线项目 -->
          <div class="timeline-items">
            <div
                v-for="(item, index) in dayData.items"
                :key="item.id"
                class="timeline-item"
                :class="{
                'completed': item.status === 'completed',
                'in-progress': item.status === 'in_progress',
                'cancelled': item.status === 'cancelled'
              }"
                @click="handleItemClick(item.id)"
            >
              <!-- 时间线连接线 -->
              <div class="timeline-connector">
                <div
                    class="timeline-dot"
                    :style="{ backgroundColor: getTypeConfig(item.item_type).color }"
                >
                  <i :class="`fas ${getTypeConfig(item.item_type).icon}`"></i>
                </div>
                <div
                    v-if="index < dayData.items.length - 1"
                    class="timeline-line"
                ></div>
              </div>

              <!-- 内容区域 -->
              <div class="timeline-content-wrapper">
                <!-- 时间信息 -->
                <div class="timeline-time">
                  <span class="start-time">{{ formatTime(item.start_datetime || null) }}</span>
                  <span v-if="item.end_datetime" class="end-time">
                    - {{ formatTime(item.end_datetime) }}
                  </span>
                  <span v-if="getDuration(item)" class="duration">
                    ({{ getDuration(item) }})
                  </span>
                </div>

                <!-- 主要内容 -->
                <div class="timeline-content-body">
                  <h4 class="item-title">
                    {{ item.name }}
                    <!-- 修复: 确保type有有效值 -->
                    <el-tag
                        v-if="item.priority && item.priority !== 'normal'"
                        :type="getPriorityType(item.priority)"
                        size="small"
                    >
                      {{ getPriorityText(item.priority) }}
                    </el-tag>
                  </h4>

                  <p v-if="item.description" class="item-description">
                    {{ item.description }}
                  </p>

                  <div class="timeline-meta">
                    <span class="type-tag">{{ getTypeConfig(item.item_type).name }}</span>
                    <span v-if="item.address" class="meta-item">
                      <i class="fas fa-map-marker-alt"/>
                      {{ truncateText(item.address, 30) }}
                    </span>
                    <span v-if="item.cost && item.cost > 0" class="meta-item cost">
                      <i class="fas fa-yuan-sign"/>
                      ¥{{ item.cost.toFixed(2) }}
                    </span>
                  </div>

                  <!-- 状态指示器 - 修复: 确保type有有效值 -->
                  <div v-if="item.status && item.status !== 'pending'" class="status-indicator">
                    <el-tag
                        :type="getStatusType(item.status)"
                        size="small"
                        effect="plain"
                    >
                      {{ getStatusText(item.status) }}
                    </el-tag>
                  </div>
                </div>

                <!-- 操作按钮 -->
                <div class="timeline-actions">
                  <el-button-group size="small">
                    <el-button
                        type="text"
                        @click.stop="handleItemEdit(item.id)"
                        :icon="Edit"
                    >
                      编辑
                    </el-button>
                    <el-button
                        v-if="item.latitude && item.longitude"
                        type="text"
                        @click.stop="handleShowOnMap(item)"
                        :icon="Location"
                    >
                      地图
                    </el-button>
                  </el-button-group>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import dayjs from 'dayjs'
import type { TravelItem, TypeConfig } from '@/types'
import { Edit, Location } from '@element-plus/icons-vue'

interface Props {
  items: TravelItem[]
}

interface Emits {
  (e: 'item-click', itemId: number): void
  (e: 'item-edit', itemId: number): void
  (e: 'show-on-map', item: TravelItem): void
}

interface TimelineDay {
  date: string
  items: TravelItem[]
  totalCost: number
  completionRate: number
}

const props = withDefaults(defineProps<Props>(), {
})

const emit = defineEmits<Emits>()

const typeConfigs: Record<string, TypeConfig> = {
  accommodation: { name: '住宿', icon: 'fa-bed', color: '#805ad5' },
  transport: { name: '交通', icon: 'fa-plane', color: '#3182ce' },
  attraction: { name: '景点', icon: 'fa-mountain', color: '#48bb78' },
  photo_spot: { name: '拍照点', icon: 'fa-camera', color: '#ed8936' },
  rest_area: { name: '休息点', icon: 'fa-coffee', color: '#38b2ac' },
  checkpoint: { name: '检查站', icon: 'fa-shield-alt', color: '#e53e3e' },
  other: { name: '其他', icon: 'fa-ellipsis-h', color: '#718096' }
}

// 获取有日期的项目
const itemsWithDates = computed(() => {
  if (!Array.isArray(props.items)) {
    console.warn('Items is not an array:', props.items)
    return []
  }

  return props.items.filter(item => item && item.start_datetime)
})

// 时间线数据
const timelineData = computed(() => {
  const grouped: Record<string, TimelineDay> = {}

  itemsWithDates.value.forEach(item => {
    const date = dayjs(item.start_datetime!).format('YYYY-MM-DD')

    if (!grouped[date]) {
      grouped[date] = {
        date,
        items: [],
        totalCost: 0,
        completionRate: 0
      }
    }

    grouped[date].items.push(item)
  })

  // 计算每天的统计信息
  Object.values(grouped).forEach(dayData => {
    // 按时间排序
    dayData.items.sort((a, b) => {
      const timeA = dayjs(a.start_datetime!).valueOf()
      const timeB = dayjs(b.start_datetime!).valueOf()
      return timeA - timeB
    })

    // 计算总费用
    dayData.totalCost = dayData.items.reduce((sum, item) => {
      return sum + (item.cost || 0)
    }, 0)

    // 计算完成率
    const completedCount = dayData.items.filter(item => item.status === 'completed').length
    dayData.completionRate = dayData.items.length > 0
        ? Math.round((completedCount / dayData.items.length) * 100)
        : 0
  })

  // 按日期排序
  const sortedEntries = Object.entries(grouped).sort(([dateA], [dateB]) => {
    return dayjs(dateA).valueOf() - dayjs(dateB).valueOf()
  })

  return Object.fromEntries(sortedEntries)
})

// 工具函数
const getTypeConfig = (type: string): TypeConfig => {
  return typeConfigs[type] || typeConfigs.other
}

const formatDate = (dateStr: string): string => {
  if (!dateStr) return ''

  const date = dayjs(dateStr)
  if (!date.isValid()) return dateStr

  const today = dayjs()
  const tomorrow = today.add(1, 'day')
  const yesterday = today.subtract(1, 'day')

  if (date.isSame(today, 'day')) {
    return `今天 ${date.format('M月D日')}`
  } else if (date.isSame(tomorrow, 'day')) {
    return `明天 ${date.format('M月D日')}`
  } else if (date.isSame(yesterday, 'day')) {
    return `昨天 ${date.format('M月D日')}`
  } else {
    return date.format('M月D日 ddd')
  }
}

const formatTime = (datetime: string | null | undefined): string => {
  if (!datetime) return ''

  const parsed = dayjs(datetime)
  if (!parsed.isValid()) return ''

  return parsed.format('HH:mm')
}

const getDuration = (item: TravelItem): string => {
  if (!item.start_datetime || !item.end_datetime) return ''

  const start = dayjs(item.start_datetime)
  const end = dayjs(item.end_datetime)

  if (!start.isValid() || !end.isValid()) return ''

  const diffMinutes = end.diff(start, 'minute')

  if (diffMinutes < 60) {
    return `${diffMinutes}分钟`
  } else {
    const hours = Math.floor(diffMinutes / 60)
    const minutes = diffMinutes % 60
    return minutes > 0 ? `${hours}小时${minutes}分钟` : `${hours}小时`
  }
}

// 修复: 确保返回有效的Element Plus tag type
const getPriorityType = (priority: string): "success" | "info" | "warning" | "danger" => {
  const typeMap: Record<string, "success" | "info" | "warning" | "danger"> = {
    'high': 'danger',
    'medium': 'warning',
    'low': 'info',
    'normal': 'success'
  }
  return typeMap[priority] || 'info'
}

const getPriorityText = (priority: string): string => {
  const textMap: Record<string, string> = {
    'high': '高',
    'medium': '中',
    'low': '低',
    'normal': '普通'
  }
  return textMap[priority] || priority
}

// 修复: 确保返回有效的Element Plus tag type
const getStatusType = (status: string): "success" | "info" | "warning" | "danger" => {
  const typeMap: Record<string, "success" | "info" | "warning" | "danger"> = {
    'completed': 'success',
    'in_progress': 'warning',
    'cancelled': 'danger',
    'pending': 'info'
  }
  return typeMap[status] || 'info'
}

const getStatusText = (status: string): string => {
  const textMap: Record<string, string> = {
    'completed': '已完成',
    'in_progress': '进行中',
    'cancelled': '已取消',
    'pending': '待处理'
  }
  return textMap[status] || status
}

const truncateText = (text: string | undefined, maxLength: number): string => {
  if (!text) return ''
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
}

// 事件处理
const handleItemClick = (itemId: number) => {
  emit('item-click', itemId)
}

const handleItemEdit = (itemId: number) => {
  emit('item-edit', itemId)
}

const handleShowOnMap = (item: TravelItem) => {
  emit('show-on-map', item)
}
</script>

<style lang="scss" scoped>
.timeline-container {
  height: 100%;
  padding: 20px;
  background: #f8f9fa;
  overflow-y: auto;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 300px;
}

.debug-info {
  background: rgba(255, 255, 255, 0.9);
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 16px;
  font-size: 12px;
  color: #666;

  p {
    margin: 4px 0;
  }
}

.timeline-content {
  max-width: 1000px;
  margin: 0 auto;
}

.timeline-day {
  margin-bottom: 32px;

  &:last-child {
    margin-bottom: 0;
  }
}

.day-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: white;
  padding: 20px 24px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  margin-bottom: 16px;
  border-left: 4px solid #3b82f6;

  .day-info {
    flex: 1;
  }

  .day-date {
    margin: 0 0 8px 0;
    font-size: 20px;
    font-weight: 600;
    color: #1f2937;
  }

  .day-stats {
    display: flex;
    gap: 16px;
    font-size: 14px;
    color: #6b7280;

    .item-count {
      color: #3b82f6;
      font-weight: 500;
    }

    .day-cost {
      color: #10b981;
      font-weight: 600;
    }
  }
}

.timeline-items {
  position: relative;
  background: white;
  border-radius: 12px;
  padding: 20px 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.timeline-item {
  position: relative;
  display: flex;
  margin-bottom: 24px;
  cursor: pointer;
  transition: all 0.3s ease;

  &:last-child {
    margin-bottom: 0;

    .timeline-connector .timeline-line {
      display: none;
    }
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  &.completed {
    opacity: 0.8;

    .timeline-content-body {
      .item-title {
        text-decoration: line-through;
        color: #6b7280;
      }
    }
  }

  &.cancelled {
    opacity: 0.6;

    .timeline-dot {
      background-color: #ef4444 !important;
    }
  }
}

.timeline-connector {
  position: relative;
  margin-right: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;

  .timeline-dot {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 16px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    z-index: 2;
  }

  .timeline-line {
    width: 2px;
    height: 60px;
    background: #e5e7eb;
    flex: 1;
    margin-top: 8px;
  }
}

.timeline-content-wrapper {
  flex: 1;
  background: #f8fafc;
  border-radius: 8px;
  padding: 16px 20px;
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;

  .timeline-item:hover & {
    background: #f1f5f9;
    border-color: #cbd5e1;
  }
}

.timeline-time {
  font-size: 14px;
  color: #3b82f6;
  font-weight: 600;
  margin-bottom: 8px;

  .end-time, .duration {
    color: #6b7280;
    font-weight: 400;
  }

  .duration {
    font-size: 12px;
  }
}

.timeline-content-body {
  margin-bottom: 12px;

  .item-title {
    margin: 0 0 8px 0;
    font-size: 18px;
    font-weight: 600;
    color: #1f2937;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .item-description {
    margin: 0 0 12px 0;
    color: #4b5563;
    font-size: 14px;
    line-height: 1.5;
  }
}

.timeline-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 13px;

  .type-tag {
    background: #e0e7ff;
    color: #3730a3;
    padding: 4px 8px;
    border-radius: 4px;
    font-weight: 500;
  }

  .meta-item {
    display: flex;
    align-items: center;
    gap: 4px;
    color: #6b7280;

    &.cost {
      color: #10b981;
      font-weight: 600;
    }

    i {
      opacity: 0.7;
    }
  }
}

.status-indicator {
  margin-top: 8px;
}

.timeline-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e5e7eb;

  .el-button {
    font-size: 12px;
  }
}

// 响应式设计
@media (max-width: 768px) {
  .timeline-container {
    padding: 12px;
  }

  .day-header {
    padding: 16px;

    .day-date {
      font-size: 18px;
    }

    .day-stats {
      flex-direction: column;
      gap: 4px;
    }
  }

  .timeline-items {
    padding: 16px;
  }

  .timeline-item {
    margin-bottom: 20px;
  }

  .timeline-connector {
    margin-right: 12px;

    .timeline-dot {
      width: 32px;
      height: 32px;
      font-size: 14px;
    }
  }

  .timeline-content-wrapper {
    padding: 12px 16px;

    .item-title {
      font-size: 16px;
    }
  }

  .timeline-meta {
    gap: 8px;

    .meta-item {
      font-size: 12px;
    }
  }
}
</style>