<template>
  <div class="gantt-container">
    <div v-if="items.length === 0" class="empty-state">
      <el-empty description="没有设置时间的元素" />
    </div>

    <div ref="ganttContainer" class="gantt-chart" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue'
import Gantt from 'frappe-gantt'
import dayjs from 'dayjs'
import type { TravelItem } from '@/types'

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
}

interface Emits {
  (e: 'task-click', task: FrappeGanttTask): void
  (e: 'date-change', task: FrappeGanttTask, start: Date, end: Date): void
  (e: 'progress-change', task: FrappeGanttTask, progress: number): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const ganttContainer = ref<HTMLElement>()
const gantt = ref<InstanceType<typeof Gantt>>()
const viewMode = ref<'Quarter Day' | 'Half Day' | 'Day' | 'Week' | 'Month'>('Day')

const modes = ['Quarter Day', 'Half Day', 'Day', 'Week', 'Month'] as const

onMounted(() => {
  initGantt()
})

watch(() => props.items, () => {
  updateGantt()
}, { deep: true })

const initGantt = async () => {
  if (!ganttContainer.value) return

  await nextTick()
  updateGantt()
}

const updateGantt = () => {
  if (!ganttContainer.value) return

  // 清空容器
  ganttContainer.value.innerHTML = ''

  const tasks = convertToGanttTasks(props.items)

  if (tasks.length === 0) {
    return
  }

  // 创建甘特图容器
  const ganttDiv = document.createElement('div')
  ganttDiv.style.cssText = `
    width: 100%;
    height: 400px;
    overflow: auto;
  `
  ganttContainer.value.appendChild(ganttDiv)

  // 延迟初始化甘特图
  setTimeout(() => {
    try {
      gantt.value = new Gantt(ganttDiv, tasks, {
        view_mode: viewMode.value,
        date_format: 'YYYY-MM-DD',
        language: 'zh',
        header_height: 50,
        column_width: 30,
        step: 24,
        bar_height: 20,
        bar_corner_radius: 3,
        arrow_curve: 10,
        padding: 10,

        custom_popup_html: (task: any) => {
          const item = props.items.find(i => i.id === task.id)
          if (!item) return ''

          return `
            <div class="gantt-popup">
              <h5>${item.name}</h5>
              <p>开始: ${dayjs(item.start_datetime).format('MM-DD HH:mm')}</p>
              <p>结束: ${dayjs(item.end_datetime).format('MM-DD HH:mm')}</p>
              ${item.cost ? `<p>费用: ¥${item.cost}</p>` : ''}
            </div>
          `
        },

        on_click: (task: any) => {
          emit('task-click', task as FrappeGanttTask)
        },

        on_date_change: (task: any, start: Date, end: Date) => {
          emit('date-change', task as FrappeGanttTask, start, end)
        },

        on_progress_change: (task: any, progress: number) => {
          emit('progress-change', task as FrappeGanttTask, progress)
        }
      })
    } catch (error) {
      console.error('甘特图初始化失败:', error)
    }
  }, 100)
}

const convertToGanttTasks = (items: TravelItem[]): FrappeGanttTask[] => {
  const tasks: FrappeGanttTask[] = []

  if (!Array.isArray(items)) {
    return tasks
  }

  items.forEach(item => {
    if (!item.start_datetime || !item.end_datetime) {
      return
    }

    const startDate = dayjs(item.start_datetime)
    const endDate = dayjs(item.end_datetime)

    if (!startDate.isValid() || !endDate.isValid()) {
      return
    }

    tasks.push({
      id: item.id,
      name: item.name || `元素-${item.id}`,
      start: startDate.format('YYYY-MM-DD HH:mm'),
      end: endDate.format('YYYY-MM-DD HH:mm'),
      progress: item.status === 'completed' ? 100 :
          item.status === 'in_progress' ? 50 : 0,
      dependencies: '',
      custom_class: `bar-${item.item_type || 'other'}`,
      _item: item
    })
  })

  return tasks
}

const zoomIn = () => {
  const currentIndex = modes.indexOf(viewMode.value)
  if (currentIndex > 0) {
    viewMode.value = modes[currentIndex - 1]
    if (gantt.value) {
      gantt.value.change_view_mode(viewMode.value)
    }
  }
}

const zoomOut = () => {
  const currentIndex = modes.indexOf(viewMode.value)
  if (currentIndex < modes.length - 1) {
    viewMode.value = modes[currentIndex + 1]
    if (gantt.value) {
      gantt.value.change_view_mode(viewMode.value)
    }
  }
}

const scrollToToday = () => {
  if (gantt.value) {
    // 使用私有方法或检查方法是否存在
    const ganttInstance = gantt.value as any
    if (ganttInstance.scroll_today) {
      ganttInstance.scroll_today()
    } else if (ganttInstance.scrollToToday) {
      ganttInstance.scrollToToday()
    }
  }
}

defineExpose({
  zoomIn,
  zoomOut,
  scrollToToday
})
</script>

<style lang="scss" scoped>
.gantt-container {
  height: 100%;
  background: white;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.gantt-chart {
  width: 100%;
  height: 100%;
  padding: 16px;
}

:deep(.gantt-popup) {
  padding: 12px;

  h5 {
    margin: 0 0 8px 0;
    font-size: 14px;
    font-weight: 600;
  }

  p {
    margin: 0 0 4px 0;
    font-size: 12px;
    color: #666;
  }
}

// 甘特图条形样式
:deep(.bar-accommodation) {
  fill: #805ad5;
}

:deep(.bar-transport) {
  fill: #3182ce;
}

:deep(.bar-attraction) {
  fill: #48bb78;
}

:deep(.bar-photo_spot) {
  fill: #ed8936;
}

:deep(.bar-rest_area) {
  fill: #38b2ac;
}

:deep(.bar-checkpoint) {
  fill: #e53e3e;
}

:deep(.bar-other) {
  fill: #718096;
}
</style>