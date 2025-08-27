<template>
  <div class="gantt-container">
    <!-- 空状态 -->
    <div v-if="!validItems.length" class="empty-state">
      <el-empty description="没有设置时间的元素" :image-size="100">
        <template #description>
          <p>请添加包含开始和结束时间的旅游元素</p>
        </template>
      </el-empty>
    </div>

    <template v-else>
      <!-- 甘特图 -->
      <div class="gantt-wrapper">
        <div ref="ganttContainer" class="gantt-chart" :class="{ 'gantt-loading': isLoading }"></div>
      </div>
    </template>

    <!-- 加载状态 -->
    <div v-if="isLoading" class="loading-overlay">
      <el-icon class="is-loading">
        <Loading/>
      </el-icon>
      <p>{{ loadingStatus }}</p>
    </div>

    <!-- 错误状态 -->
    <div v-if="ganttError" class="error-overlay">
      <el-icon>
        <WarningFilled/>
      </el-icon>
      <h4>甘特图加载失败</h4>
      <p>{{ ganttError }}</p>
      <el-button type="primary" @click="initGantt">重试</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import {computed, nextTick, onMounted, onUnmounted, reactive, ref, watch} from 'vue'
import {ElMessage} from 'element-plus'
import {Loading, WarningFilled} from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import type {TravelItem} from '@/types'

// 定义甘特图任务接口
interface GanttTask {
  id: string
  name: string
  start: string
  end: string
  progress: number
  important?: boolean
  dependencies?: string
  custom_class?: string
  _item?: TravelItem
}

interface Props {
  items: TravelItem[]
}

interface Emits {
  (e: 'task-click', task: GanttTask): void

  (e: 'date-change', task: GanttTask, start: Date, end: Date): void

  (e: 'progress-change', task: GanttTask, progress: number): void

  (e: 'add-task', task: Partial<TravelItem>): void

  (e: 'remove-task', item: TravelItem): void
}

const props = withDefaults(defineProps<Props>(), {})

const emit = defineEmits<Emits>()

// 响应式数据
const ganttContainer = ref<HTMLElement>()
let ganttInstance: any = null
const isLoading = ref(false)
const ganttError = ref('')
const loadingStatus = ref('')
const currentViewMode = ref('Day')

// 视图模式配置
const viewModes = ['Hour', 'Quarter Day', 'Half Day', 'Day', 'Week', 'Month', 'Year']
const viewModeLabels: Record<string, string> = {
  'Hour': '小时',
  'Quarter Day': '6小时',
  'Half Day': '12小时',
  'Day': '天',
  'Week': '周',
  'Month': '月',
  'Year': '年'
}

// 甘特图配置选项
const options = reactive({
  view_mode: 'Hour',
  bar_height: 30,
  date_format: 'YYYY-MM-DD HH:mm:ss',
  language: 'zh',
  padding: 18,
  readonly: false,
  show_expected_progress: false,
  today_button: true,
  scroll_to: 'start',
  view_mode_select: false,
  popup_on: 'click',
  holidays: {},
  ignore: [],
  on_click: (task: any) => {
    console.log('任务点击:', task)
    ElMessage.info(`点击了任务: ${task.name}`)
    emit('task-click', task)
  },
  on_date_change: (task: any, start: Date, end: Date) => {
    console.log('日期变更:', task, start, end)
    ElMessage.success(`任务 "${task.name}" 日期已更新`)
    emit('date-change', task, start, end)
  },
  on_progress_change: (task: any, progress: number) => {
    console.log('进度变更:', task, progress)
    ElMessage.success(`任务 "${task.name}" 进度更新为 ${progress}%`)
    emit('progress-change', task, progress)
  },
  on_double_click: (task: any) => {
    console.log('双击任务:', task)
    ElMessage.warning(`双击了任务: ${task.name}`)
  }
})


// 计算有效项目
const validItems = computed(() => {
  if (!Array.isArray(props.items)) {
    return []
  }

  return props.items.filter(item => {
    return item &&
        item.start_datetime &&
        item.end_datetime &&
        dayjs(item.start_datetime).isValid() &&
        dayjs(item.end_datetime).isValid()
  })
})

// 计算甘特图任务
const ganttTasks = computed(() => {
  return convertToGanttTasks(validItems.value)
})

// 初始化甘特图
const initGantt = async () => {
  if (!ganttContainer.value || validItems.value.length === 0) {
    return
  }

  isLoading.value = true
  ganttError.value = ''
  loadingStatus.value = '正在加载甘特图组件...'

  try {
    // 尝试从CDN加载Frappe Gantt
    await loadGanttFromCDN()

    const GanttClass = (window as any).Gantt
    if (!GanttClass) {
      throw new Error('无法加载甘特图库')
    }

    loadingStatus.value = '正在创建甘特图...'
    await createGanttChart(GanttClass)

  } catch (error) {
    console.error('甘特图初始化失败:', error)
    ganttError.value = error instanceof Error ? error.message : '甘特图初始化失败'
  } finally {
    isLoading.value = false
  }
}

// 从CDN加载甘特图库
const loadGanttFromCDN = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // 检查是否已经加载
    if ((window as any).Gantt) {
      resolve()
      return
    }

    // 加载CSS
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://cdn.jsdelivr.net/npm/frappe-gantt/dist/frappe-gantt.css'
    document.head.appendChild(link)

    // 加载JS
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/frappe-gantt/dist/frappe-gantt.umd.js'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('CDN加载失败'))
    document.head.appendChild(script)

    // 超时处理
    setTimeout(() => reject(new Error('CDN加载超时')), 10000)
  })
}

// 创建甘特图
const createGanttChart = async (GanttClass: any) => {
  if (!ganttContainer.value) return

  // 清空容器
  ganttContainer.value.innerHTML = ''

  const tasks = ganttTasks.value
  if (tasks.length === 0) {
    return
  }

  try {
    // 创建甘特图实例
    ganttInstance = new GanttClass(ganttContainer.value, tasks, {
      ...options,
      view_mode: currentViewMode.value
    })
  } catch (error) {
    console.error('甘特图实例创建失败:', error)
    throw error
  }
}

// 更新甘特图配置
const updateGanttOptions = () => {
  if (ganttInstance && ganttInstance.update_options) {
    try {
      ganttInstance.update_options(options)
    } catch (error) {
      console.error('更新配置失败:', error)
    }
  }
}

// 转换为甘特图任务格式
const convertToGanttTasks = (items: TravelItem[]): GanttTask[] => {
  const tasks: GanttTask[] = []

  items.forEach((item) => {
    if (!item.start_datetime || !item.end_datetime) return

    const startDate = dayjs(item.start_datetime)
    const endDate = dayjs(item.end_datetime)

    if (!startDate.isValid() || !endDate.isValid()) return

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

    const task: GanttTask = {
      id: `task_${item.id}`,
      name: item.name,
      start: startDate.toISOString(),
      end: adjustedEndDate.toISOString(),
      progress,
      custom_class: `gantt-task-${item.item_type || 'other'}`,
      _item: {
        ...item,
        name: item.name,
        item_type: item.item_type || 'other'
      }
    }

    tasks.push(task)
  })

  return tasks
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

// 生命周期
onMounted(async () => {
  await nextTick()
  if (validItems.value.length > 0) {
    await initGantt()
  }
})

// 监听数据变化
watch(() => validItems.value, async () => {
  if (validItems.value.length > 0) {
    await initGantt()
  } else if (ganttInstance) {
    if (ganttContainer.value) {
      ganttContainer.value.innerHTML = ''
    }
    ganttInstance = null
  }
}, {deep: true})

// 组件卸载时清理
onUnmounted(() => {
  if (ganttInstance && ganttInstance.destroy) {
    try {
      ganttInstance.destroy()
    } catch (error) {
      console.warn('甘特图销毁失败:', error)
    }
  }
  ganttInstance = null
})

// 暴露方法给父组件
defineExpose({
  initGantt
})
</script>

<style lang="scss" scoped>
.gantt-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f8f9fa;
  border-radius: 8px;
  overflow: hidden;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 300px;
}

.gantt-wrapper {
  height: 100%;
  display: flex;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  padding: 20px;
  margin-bottom: 20px;

  h3 {
    margin: 0 0 20px 0;
    color: #303133;
  }
}

.gantt-chart {
  min-height: 400px;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  position: relative;

  &.gantt-loading {
    opacity: 0.6;
  }
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 10;

  .el-icon {
    font-size: 32px;
    color: #409eff;
    margin-bottom: 10px;
  }

  p {
    color: #606266;
    margin: 0;
  }
}

.error-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.95);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 10;

  .el-icon {
    font-size: 32px;
    color: #f56c6c;
    margin-bottom: 10px;
  }

  h4 {
    color: #303133;
    margin: 0 0 5px 0;
  }

  p {
    color: #909399;
    margin: 0 0 15px 0;
  }
}

// 甘特图任务类型样式
:deep(.gantt-task-accommodation) {
  fill: #805ad5 !important;
}

:deep(.gantt-task-transport) {
  fill: #3182ce !important;
}

:deep(.gantt-task-attraction) {
  fill: #48bb78 !important;
}

:deep(.gantt-task-photo_spot) {
  fill: #ed8936 !important;
}

:deep(.gantt-task-rest_area) {
  fill: #38b2ac !important;
}

:deep(.gantt-task-checkpoint) {
  fill: #e53e3e !important;
}

:deep(.gantt-task-other) {
  fill: #718096 !important;
}
</style>