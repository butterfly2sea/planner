<template>
  <div class="timeline-container">
    <div v-if="timelineData.length === 0" class="empty-state">
      <el-empty description="暂无行程安排"/>
    </div>

    <div v-else class="timeline-content">
      <div
          v-for="day in timelineData"
          :key="day.date"
          class="timeline-day"
      >
        <div class="timeline-day-header">
          <div class="timeline-day-date">
            <div class="date-main">{{ formatDate(day.date) }}</div>
            <div class="date-sub">{{ formatWeekday(day.date) }}</div>
          </div>
          <div class="timeline-day-summary">
            {{ day.items.length }} 个项目 · ¥{{ day.totalCost.toFixed(2) }}
          </div>
        </div>

        <div class="timeline-items">
          <div
              v-for="item in day.items"
              :key="item.id"
              class="timeline-item"
              @click="handleItemClick(item.id)"
          >
            <div
                class="timeline-icon"
                :style="{ background: getTypeConfig(item.item_type).color }"
            >
              <i :class="`fas ${getTypeConfig(item.item_type).icon}`"/>
            </div>

            <div class="timeline-time">
              {{ formatTime(item.start_datetime || '') }}
              {{ item.end_datetime ? `- ${formatTime(item.end_datetime)}` : '' }}
            </div>

            <div class="timeline-content-body">
              <h4>{{ item.name }}</h4>
              <p>{{ item.description || getTypeConfig(item.item_type).name }}</p>
              <div class="timeline-meta">
                <span v-if="item.address" class="meta-item">
                  <i class="fas fa-map-marker-alt"/>
                  {{ item.address }}
                </span>
                <span v-if="item.cost" class="meta-item">
                  <i class="fas fa-yuan-sign"/>
                  ¥{{ item.cost }}
                </span>
              </div>
            </div>

            <div class="timeline-actions">
              <el-button
                  type="text"
                  size="small"
                  @click.stop="handleItemEdit(item.id)"
              >
                <el-icon>
                  <Edit/>
                </el-icon>
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import dayjs from 'dayjs'
import type {TravelItem, TypeConfig} from '@/types'

interface Props {
  items: TravelItem[]
}

interface Emits {
  (e: 'item-click', itemId: number): void

  (e: 'item-edit', itemId: number): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const typeConfigs: Record<string, TypeConfig> = {
  accommodation: {name: '住宿', icon: 'fa-bed', color: '#805ad5'},
  transport: {name: '交通', icon: 'fa-plane', color: '#3182ce'},
  attraction: {name: '景点', icon: 'fa-mountain', color: '#48bb78'},
  photo_spot: {name: '拍照点', icon: 'fa-camera', color: '#ed8936'},
  rest_area: {name: '休息点', icon: 'fa-coffee', color: '#38b2ac'},
  checkpoint: {name: '检查站', icon: 'fa-shield-alt', color: '#e53e3e'},
  other: {name: '其他', icon: 'fa-ellipsis-h', color: '#718096'}
}

const timelineData = computed(() => {
  const grouped: Record<string, TravelItem[]> = {}

  props.items.forEach(item => {
    if (item.start_datetime) {
      const date = dayjs(item.start_datetime).format('YYYY-MM-DD')
      if (!grouped[date]) {
        grouped[date] = []
      }
      grouped[date].push(item)
    }
  })

  // 对每天的项目按时间排序
  Object.keys(grouped).forEach(date => {
    grouped[date].sort((a, b) =>
        dayjs(a.start_datetime!).valueOf() - dayjs(b.start_datetime!).valueOf()
    )
  })

  // 转换为数组并排序
  return Object.keys(grouped)
      .sort()
      .map(date => ({
        date,
        items: grouped[date],
        totalCost: grouped[date].reduce((sum, item) => sum + (item.cost || 0), 0)
      }))
})

const getTypeConfig = (itemType: string): TypeConfig => {
  return typeConfigs[itemType] || typeConfigs.other
}

const formatDate = (dateStr: string) => {
  return dayjs(dateStr).format('MM月DD日')
}

const formatWeekday = (dateStr: string) => {
  return dayjs(dateStr).format('dddd')
}

const formatTime = (datetime: string) => {
  if (!datetime) return ''
  return dayjs(datetime).format('HH:mm')
}

const handleItemClick = (itemId: number) => {
  emit('item-click', itemId)
}

const handleItemEdit = (itemId: number) => {
  emit('item-edit', itemId)
}
</script>

<style lang="scss" scoped>
.timeline-container {
  height: 100%;
  overflow-y: auto;
  background: #f5f5f5;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.timeline-content {
  padding: 20px;
}

.timeline-day {
  margin-bottom: 24px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.timeline-day-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: #fafafa;
  border-bottom: 1px solid #e8e8e8;

  .timeline-day-date {
    .date-main {
      font-size: 18px;
      font-weight: 600;
      color: #2c3e50;
    }

    .date-sub {
      font-size: 12px;
      color: #7f8c8d;
    }
  }

  .timeline-day-summary {
    font-size: 14px;
    color: #7f8c8d;
  }
}

.timeline-items {
  padding: 0;
}

.timeline-item {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  cursor: pointer;
  transition: background 0.3s;
  border-bottom: 1px solid #f5f5f5;

  &:hover {
    background: #f9f9f9;
  }

  &:last-child {
    border-bottom: none;
  }
}

.timeline-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: white;
  margin-right: 16px;
}

.timeline-time {
  flex-shrink: 0;
  min-width: 100px;
  font-weight: 600;
  color: #7f8c8d;
  font-size: 14px;
  margin-right: 16px;
}

.timeline-content-body {
  flex: 1;

  h4 {
    margin: 0 0 4px 0;
    font-size: 16px;
    color: #2c3e50;
  }

  p {
    margin: 0 0 8px 0;
    font-size: 14px;
    color: #7f8c8d;
  }

  .timeline-meta {
    display: flex;
    gap: 16px;

    .meta-item {
      font-size: 12px;
      color: #95a5a6;
      display: flex;
      align-items: center;
      gap: 4px;
    }
  }
}

.timeline-actions {
  flex-shrink: 0;
}
</style>