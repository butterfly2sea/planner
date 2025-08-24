<template>
  <div class="gantt-container">
    <div v-if="!validItems.length" class="empty-state">
      <el-empty
          description="没有设置时间的元素"
          :image-size="100"
      >
        <template #description>
          <p>请添加包含开始和结束时间的旅游元素</p>
        </template>
      </el-empty>
    </div>

    <!-- 调试信息 -->
    <div v-if="showDebugInfo && validItems.length > 0" class="debug-info">
      <p>Total items: {{ props.items?.length || 0 }}</p>
      <p>Valid items with dates: {{ validItems.length }}</p>
      <p>Gantt tasks: {{ ganttTasks.length }}</p>
    </div>

    <div v-show="validItems.length > 0" ref="ganttContainer" class="gantt-chart"/>
  </div>
</template>

<script setup lang="ts">
import {computed, nextTick, onMounted, ref, watch} from 'vue'
import dayjs from 'dayjs'
import type {TravelItem} from '@/types'
import {ElMessage} from 'element-plus'

// 定义与Frappe Gantt兼容的任务类型
interface FrappeGanttTask {
  id: string | number
  name: string
  start: string
  end: string
  progress: number
  dependencies?: string
  custom_class?: string
  _item?: TravelItem
}

interface Props {
  items: TravelItem[]
  showDebugInfo?: boolean
}

interface Emits {
  (e: 'task-click', task: FrappeGanttTask): void

  (e: 'date-change', task: FrappeGanttTask, start: Date, end: Date): void

  (e: 'progress-change', task: FrappeGanttTask, progress: number): void
}

const props = withDefaults(defineProps<Props>(), {
  showDebugInfo: false
})

const emit = defineEmits<Emits>()

const ganttContainer = ref<HTMLElement>()
const gantt = ref<any>()
const viewMode = ref<'Quarter Day' | 'Half Day' | 'Day' | 'Week' | 'Month'>('Day')

// 计算有效的项目（有开始和结束时间的）
const validItems = computed(() => {
  if (!Array.isArray(props.items)) {
    console.warn('Items is not an array:', props.items)
    return []
  }

  return props.items.filter(item => {
    const hasValidDates = item &&
        item.start_datetime &&
        item.end_datetime &&
        dayjs(item.start_datetime).isValid() &&
        dayjs(item.end_datetime).isValid()

    if (!hasValidDates && item) {
      console.warn('Item missing valid dates:', item.name, item.start_datetime, item.end_datetime)
    }

    return hasValidDates
  })
})

// 计算甘特图任务数据
const ganttTasks = computed(() => {
  return convertToGanttTasks(validItems.value)
})

onMounted(async () => {
  await nextTick()
  initGantt()
})

watch(() => validItems.value, () => {
  console.log('Valid items changed:', validItems.value.length)
  updateGantt()
}, {deep: true})

const initGantt = () => {
  if (!ganttContainer.value || validItems.value.length === 0) {
    console.warn('Cannot init gantt: container not available or no valid items')
    return
  }

  updateGantt()
}

const updateGantt = async () => {
  if (!ganttContainer.value) return

  // 清空容器
  ganttContainer.value.innerHTML = ''

  const tasks = ganttTasks.value
  if (tasks.length === 0) {
    console.log('No tasks to display in gantt')
    return
  }

  console.log('Updating gantt with tasks:', tasks.length)

  try {
    // 动态导入Frappe Gantt
    const {default: Gantt} = await import('frappe-gantt')

    // 创建甘特图容器
    const ganttDiv = document.createElement('div')
    ganttDiv.style.cssText = `
      width: 100%;
      height: 100%;
      min-height: 400px;
      overflow: auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    `
    ganttContainer.value.appendChild(ganttDiv)

    // 延迟初始化甘特图以确保DOM准备就绪
    await nextTick()

    gantt.value = new Gantt(ganttDiv, tasks, {
      view_mode: viewMode.value,
      date_format: 'YYYY-MM-DD',
      language: 'zh',
      header_height: 50,
      column_width: 30,
      step: 24,
      bar_height: 20,
      bar_corner_radius: 3,
      arrow_curve: 5,
      padding: 18,
      view_modes: ['Quarter Day', 'Half Day', 'Day', 'Week', 'Month'],

      custom_popup_html: (task: any) => {
        return createTaskPopupContent(task)
      },

      on_click: (task: any) => {
        console.log('Gantt task clicked:', task)
        emit('task-click', task)
      },

      on_date_change: (task: any, start: Date, end: Date) => {
        console.log('Gantt date changed:', task, start, end)
        emit('date-change', task, start, end)
      },

      on_progress_change: (task: any, progress: number) => {
        console.log('Gantt progress changed:', task, progress)
        emit('progress-change', task, progress)
      }
    })

  } catch (error) {
    console.error('Failed to create gantt chart:', error)

    // 显示错误信息
    if (ganttContainer.value) {
      ganttContainer.value.innerHTML = `
        <div class="gantt-error">
          <div class="error-content">
            <i class="fas fa-exclamation-triangle"></i>
            <h4>甘特图加载失败</h4>
            <p>请检查网络连接或刷新页面重试</p>
            <button onclick="window.location.reload()" class="retry-button">刷新页面</button>
          </div>
        </div>
      `
    }

    ElMessage.error('甘特图初始化失败')
  }
}

const convertToGanttTasks = (items: TravelItem[]): FrappeGanttTask[] => {
  if (!Array.isArray(items)) {
    console.warn('Items is not an array for gantt conversion')
    return []
  }

  const tasks: FrappeGanttTask[] = []
  const typeColors = {
    accommodation: '#805ad5',
    transport: '#3182ce',
    attraction: '#48bb78',
    photo_spot: '#ed8936',
    rest_area: '#38b2ac',
    checkpoint: '#e53e3e',
    other: '#718096'
  }

  items.forEach(item => {
    if (!item.start_datetime || !item.end_datetime) return

    const startDate = dayjs(item.start_datetime)
    const endDate = dayjs(item.end_datetime)

    // 确保结束时间晚于开始时间
    const adjustedEndDate = endDate.isSame(startDate) || endDate.isBefore(startDate)
        ? startDate.add(1, 'hour')
        : endDate

    // 计算进度
    let progress = 0
    if (item.status === 'completed') {
      progress = 100
    } else if (item.status === 'in_progress') {
      progress = 50
    }

    const task: FrappeGanttTask = {
      id: item.id.toString(),
      name: item.name,
      start: startDate.format('YYYY-MM-DD'),
      end: adjustedEndDate.format('YYYY-MM-DD'),
      progress,
      custom_class: `gantt-task-${item.item_type}`,
      _item: item
    }

    tasks.push(task)
  })

  // 按开始时间排序
  tasks.sort((a, b) => {
    return dayjs(a.start).valueOf() - dayjs(b.start).valueOf()
  })

  return tasks
}

const createTaskPopupContent = (task: any): string => {
  const item = task._item
  if (!item) return ''

  const startTime = dayjs(item.start_datetime).format('MM-DD HH:mm')
  const endTime = dayjs(item.end_datetime).format('MM-DD HH:mm')
  const duration = dayjs(item.end_datetime).diff(dayjs(item.start_datetime), 'hour', true)

  return `
    <div class="gantt-popup">
      <div class="popup-header">
        <strong>${item.name}</strong>
        <span class="item-type">${getTypeConfig(item.item_type).name}</span>
      </div>
      <div class="popup-content">
        <p><i class="fas fa-clock"></i> ${startTime} - ${endTime}</p>
        <p><i class="fas fa-hourglass-half"></i> 持续 ${duration.toFixed(1)} 小时</p>
        ${item.address ? `<p><i class="fas fa-map-marker-alt"></i> ${item.address}</p>` : ''}
        ${item.cost ? `<p><i class="fas fa-yuan-sign"></i> ¥${item.cost}</p>` : ''}
        ${item.description ? `<p class="description">${item.description}</p>` : ''}
      </div>
    </div>
  `
}

const getTypeConfig = (type: string) => {
  const configs = {
    accommodation: {name: '住宿', icon: 'fa-bed', color: '#805ad5'},
    transport: {name: '交通', icon: 'fa-plane', color: '#3182ce'},
    attraction: {name: '景点', icon: 'fa-mountain', color: '#48bb78'},
    photo_spot: {name: '拍照点', icon: 'fa-camera', color: '#ed8936'},
    rest_area: {name: '休息点', icon: 'fa-coffee', color: '#38b2ac'},
    checkpoint: {name: '检查站', icon: 'fa-shield-alt', color: '#e53e3e'},
    other: {name: '其他', icon: 'fa-ellipsis-h', color: '#718096'}
  }

  return configs[type as keyof typeof configs] || configs.other
}

// 甘特图控制方法
const zoomIn = () => {
  if (gantt.value) {
    const currentModeIndex = ['Quarter Day', 'Half Day', 'Day', 'Week', 'Month'].indexOf(viewMode.value)
    if (currentModeIndex > 0) {
      const newMode = ['Quarter Day', 'Half Day', 'Day', 'Week', 'Month'][currentModeIndex - 1]
      gantt.value.change_view_mode(newMode)
      viewMode.value = newMode as any
    }
  }
}

const zoomOut = () => {
  if (gantt.value) {
    const currentModeIndex = ['Quarter Day', 'Half Day', 'Day', 'Week', 'Month'].indexOf(viewMode.value)
    if (currentModeIndex < 4) {
      const newMode = ['Quarter Day', 'Half Day', 'Day', 'Week', 'Month'][currentModeIndex + 1]
      gantt.value.change_view_mode(newMode)
      viewMode.value = newMode as any
    }
  }
}

const scrollToToday = () => {
  if (gantt.value) {
    // Frappe Gantt 没有直接的滚动到今天的方法，我们可以重新渲染
    const today = dayjs().format('YYYY-MM-DD')
    // 这里可以根据需要实现滚动到今天的逻辑
    console.log('Scroll to today:', today)
  }
}

// 暴露方法给父组件
defineExpose({
  zoomIn,
  zoomOut,
  scrollToToday,
  updateGantt
})
</script>

<style lang="scss" scoped>
.gantt-container {
  height: 100%;
  padding: 16px;
  background: #f8f9fa;
  display: flex;
  flex-direction: column;
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

.gantt-chart {
  flex: 1;
  min-height: 400px;
  position: relative;
}

// 全局甘特图样式
:global(.gantt) {
  .bar {
    &.gantt-task-accommodation {
      fill: #805ad5 !important;
    }

    &.gantt-task-transport {
      fill: #3182ce !important;
    }

    &.gantt-task-attraction {
      fill: #48bb78 !important;
    }

    &.gantt-task-photo_spot {
      fill: #ed8936 !important;
    }

    &.gantt-task-rest_area {
      fill: #38b2ac !important;
    }

    &.gantt-task-checkpoint {
      fill: #e53e3e !important;
    }

    &.gantt-task-other {
      fill: #718096 !important;
    }
  }

  .bar-progress {
    fill: rgba(255, 255, 255, 0.3) !important;
  }
}

// 甘特图错误状态样式
.gantt-error {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 400px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

  .error-content {
    text-align: center;
    color: #666;

    i {
      font-size: 48px;
      color: #f56565;
      margin-bottom: 16px;
    }

    h4 {
      margin: 0 0 8px 0;
      color: #333;
    }

    p {
      margin: 0 0 16px 0;
      color: #666;
    }

    .retry-button {
      background: #3182ce;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;

      &:hover {
        background: #2c5aa0;
      }
    }
  }
}

// 甘特图弹出框样式
:global(.gantt-popup) {
  .popup-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid #e2e8f0;

    strong {
      color: #2d3748;
      font-size: 16px;
    }

    .item-type {
      background: #e2e8f0;
      color: #4a5568;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
    }
  }

  .popup-content {
    p {
      margin: 6px 0;
      display: flex;
      align-items: center;
      font-size: 14px;
      color: #4a5568;

      i {
        margin-right: 8px;
        width: 16px;
        color: #718096;
      }

      &.description {
        margin-top: 12px;
        padding-top: 8px;
        border-top: 1px solid #e2e8f0;
        color: #2d3748;
        display: block;
      }
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .gantt-container {
    padding: 12px;
  }

  .gantt-chart {
    min-height: 300px;
  }
}
</style>