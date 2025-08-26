<template>
  <div class="gantt-container">
    <!-- 空状态 -->
    <div v-if="!validItems.length" class="empty-state">
      <el-empty
          description="没有设置时间的旅游元素"
          :image-size="100"
      >
        <template #description>
          <p>请添加包含开始和结束时间的旅游元素来查看甘特图</p>
        </template>
      </el-empty>
    </div>

    <!-- 调试信息 -->
    <div v-if="showDebugInfo && validItems.length > 0" class="debug-info">
      <p>总元素数: {{ props.items?.length || 0 }}</p>
      <p>有效元素数: {{ validItems.length }}</p>
      <p>甘特图任务数: {{ ganttTasks.length }}</p>
      <p>加载状态: {{ loadingStatus }}</p>
      <p>当前视图: {{ currentViewMode }}</p>
      <p v-if="ganttError" style="color: red;">错误: {{ ganttError }}</p>
    </div>

    <!-- 甘特图工具栏 -->
    <div v-if="validItems.length > 0" class="gantt-toolbar">
      <div class="toolbar-left">
        <el-button-group size="small">
          <el-button
              v-for="mode in viewModes"
              :key="mode"
              :type="currentViewMode === mode ? 'primary' : ''"
              @click="changeViewMode(mode)"
          >
            {{ viewModeLabels[mode] }}
          </el-button>
        </el-button-group>
      </div>

      <div class="toolbar-right">
        <el-button size="small" @click="scrollToToday" :icon="Calendar">
          今天
        </el-button>
        <el-button v-if="ganttError" size="small" type="warning" @click="retryInit">
          <el-icon><Refresh /></el-icon>
          重试
        </el-button>
      </div>
    </div>

    <!-- 甘特图容器 -->
    <div
        v-show="validItems.length > 0"
        ref="ganttContainer"
        class="gantt-chart"
        :class="{ 'is-loading': isLoading }"
    />

    <!-- 加载状态 -->
    <div v-if="isLoading && validItems.length > 0" class="loading-overlay">
      <el-icon class="is-loading" size="24">
        <Loading />
      </el-icon>
      <p>{{ loadingStatus }}</p>
    </div>

    <!-- 错误状态 -->
    <div v-if="ganttError && !isLoading && validItems.length > 0" class="error-overlay">
      <el-icon size="48" color="#f56c6c">
        <WarningFilled />
      </el-icon>
      <h4>甘特图加载失败</h4>
      <p>{{ ganttError }}</p>
      <el-button type="primary" @click="retryInit">重试</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import dayjs from 'dayjs'
import type { TravelItem } from '@/types'
import { ElMessage } from 'element-plus'
import { Calendar, Loading, Refresh, WarningFilled } from '@element-plus/icons-vue'

// 导入甘特图库
import Gantt from 'frappe-gantt'

// 定义甘特图任务接口
interface GanttTask {
  id: string
  name: string
  start: string
  end: string
  progress: number
  custom_class?: string
  _item?: TravelItem
}

interface Props {
  items: TravelItem[]
  showDebugInfo?: boolean
}

interface Emits {
  (e: 'task-click', task: GanttTask): void
  (e: 'date-change', task: GanttTask, start: Date, end: Date): void
  (e: 'progress-change', task: GanttTask, progress: number): void
}

const props = withDefaults(defineProps<Props>(), {
  showDebugInfo: false
})

const emit = defineEmits<Emits>()

// 响应式数据
const ganttContainer = ref<HTMLElement>()
const gantt = ref<any>()
const isLoading = ref(false)
const ganttError = ref('')
const loadingStatus = ref('')
const currentViewMode = ref<string>('Quarter Day')

// 视图模式配置
const viewModes = ['Hour', 'Quarter Day', 'Half Day', 'Day', 'Week', 'Month']
const viewModeLabels: Record<string, string> = {
  'Hour': '1小时',
  'Quarter Day': '6小时',
  'Half Day': '12小时',
  'Day': '天',
  'Week': '周',
  'Month': '月'
}

// 计算有效项目
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

    if (!hasValidDates && item?.start_datetime) {
      console.warn('Item with invalid dates:', item.name, item.start_datetime, item.end_datetime)
    }

    return hasValidDates
  })
})

// 计算甘特图任务
const ganttTasks = computed(() => {
  return convertToGanttTasks(validItems.value)
})

// 生命周期钩子
onMounted(async () => {
  await nextTick()
  if (validItems.value.length > 0) {
    await initGantt()
  }
})

onUnmounted(() => {
  destroyGantt()
})

// 监听数据变化
watch(() => validItems.value, async (newItems) => {
  console.log('Valid items changed:', newItems.length)
  if (newItems.length > 0) {
    await updateGantt()
  } else {
    destroyGantt()
  }
}, { deep: true })

// 初始化甘特图
const initGantt = async (): Promise<void> => {
  if (!ganttContainer.value || validItems.value.length === 0) {
    console.warn('Cannot init gantt: missing container or no valid items')
    return
  }

  isLoading.value = true
  ganttError.value = ''
  loadingStatus.value = '正在初始化甘特图...'

  try {
    await createGanttChart()
    console.log('Gantt chart initialized successfully')
  } catch (error) {
    console.error('Failed to initialize gantt:', error)
    ganttError.value = error instanceof Error ? error.message : '甘特图初始化失败'
    ElMessage.error('甘特图创建失败，请重试')
  } finally {
    isLoading.value = false
  }
}

// 创建甘特图
const createGanttChart = async () => {
  if (!ganttContainer.value) {
    throw new Error('甘特图容器未找到')
  }

  // 清空容器
  ganttContainer.value.innerHTML = ''

  const tasks = ganttTasks.value
  if (tasks.length === 0) {
    ganttContainer.value.innerHTML = '<div class="no-tasks">暂无甘特图数据</div>'
    return
  }

  console.log('Creating gantt with tasks:', tasks.length)
  loadingStatus.value = '正在渲染甘特图...'

  try {
    // 验证任务数据并过滤无效任务
    const validTasks = tasks.filter(task => {
      const isValid = task.id &&
          task.name &&
          task.start &&
          task.end &&
          dayjs(task.start).isValid() &&
          dayjs(task.end).isValid()

      if (!isValid) {
        console.warn('Invalid task data filtered out:', task)
      }
      return isValid
    })

    if (validTasks.length === 0) {
      throw new Error('没有有效的任务数据')
    }

    console.log('Valid tasks for gantt:', validTasks.length)

    // 创建甘特图实例 - 使用标准配置
    gantt.value = new Gantt(ganttContainer.value, validTasks, {
      view_mode: currentViewMode.value,
      date_format: 'YYYY-MM-DD HH:mm:ss',
      language: 'zh',
      header_height: 50,
      column_width: 30,
      step: 24,
      bar_height: 20,
      bar_corner_radius: 3,
      arrow_curve: 5,
      padding: 18,

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

    console.log('Gantt chart created successfully')

  } catch (error) {
    console.error('Failed to create gantt instance:', error)
    throw new Error(`甘特图创建失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

// 更新甘特图
const updateGantt = async () => {
  if (validItems.value.length === 0) {
    destroyGantt()
    return
  }

  // 如果甘特图已存在且数据格式正确，尝试更新而非重新创建
  if (gantt.value && typeof gantt.value.refresh === 'function') {
    try {
      const tasks = ganttTasks.value
      if (tasks.length > 0) {
        gantt.value.refresh(tasks)
        return
      }
    } catch (error) {
      console.warn('Failed to refresh gantt, recreating:', error)
    }
  }

  // 重新创建甘特图
  await initGantt()
}

// 销毁甘特图
const destroyGantt = () => {
  if (gantt.value) {
    try {
      // frappe-gantt 没有标准的 destroy 方法，我们手动清理
      gantt.value = null
    } catch (e) {
      console.warn('Gantt cleanup error:', e)
    }
  }

  if (ganttContainer.value) {
    ganttContainer.value.innerHTML = ''
  }
}

// 重试初始化
const retryInit = async () => {
  ganttError.value = ''
  await initGantt()
}

// 改变视图模式
const changeViewMode = async (mode: string) => {
  currentViewMode.value = mode

  if (gantt.value && gantt.value.change_view_mode) {
    try {
      gantt.value.change_view_mode(mode)
    } catch (e) {
      console.warn('Change view mode failed, recreating gantt:', e)
      // 重新创建甘特图
      await initGantt()
    }
  }
}

// 滚动到今天
const scrollToToday = async () => {
  if (gantt.value) {
    try {
      // frappe-gantt 的滚动方法可能不存在，我们尝试其他方式
      if (gantt.value.scroll_to_date) {
        gantt.value.scroll_to_date(new Date())
      } else if (gantt.value.scroll_to_today) {
        gantt.value.scroll_to_today()
      } else {
        // 如果没有内置方法，重新创建甘特图以当前日期为中心
        console.log('No scroll method available, refreshing gantt')
        await initGantt()
      }
    } catch (e) {
      console.warn('Scroll to today failed:', e)
    }
  }
}

// 转换为甘特图任务格式
const convertToGanttTasks = (items: TravelItem[]): GanttTask[] => {
  if (!Array.isArray(items)) {
    console.warn('Items is not an array for gantt conversion')
    return []
  }

  const tasks: GanttTask[] = []

  items.forEach((item, index) => {
    // 确保 item 存在且有必要的属性
    if (!item || !item.start_datetime || !item.end_datetime) {
      console.warn('Item missing required datetime fields:', item)
      return
    }

    const startDate = dayjs(item.start_datetime)
    const endDate = dayjs(item.end_datetime)

    if (!startDate.isValid() || !endDate.isValid()) {
      console.warn('Invalid dates for item:', item.name || 'Unknown', item.start_datetime, item.end_datetime)
      return
    }

    // 确保结束时间晚于开始时间
    const adjustedEndDate = endDate.isSame(startDate) || endDate.isBefore(startDate)
        ? startDate.add(1, 'hour')
        : endDate

    // 安全地计算进度
    let progress = 0
    if (item.status === 'completed') {
      progress = 100
    } else if (item.status === 'in_progress') {
      progress = 50
    }

    const task: GanttTask = {
      id: `task_${item.id || index}`,
      name: (item.name && item.name.trim()) || `未命名任务${index + 1}`,
      // 保留完整的时间信息，使用ISO格式
      start: startDate.toISOString(),
      end: adjustedEndDate.toISOString(),
      progress,
      custom_class: `gantt-task-${item.item_type || 'other'}`,
      _item: {
        ...item,
        name: (item.name && item.name.trim()) || `未命名任务${index + 1}`,
        item_type: item.item_type || 'other'
      }
    }

    tasks.push(task)
  })

  console.log('Converted tasks with time info:', tasks.length)
  return tasks
}

// 创建任务弹窗内容
const createTaskPopupContent = (task: any): string => {
  // 安全地获取任务项数据
  const item = task?._item
  if (!item) {
    console.warn('Task item data not available:', task)
    return `<div class="gantt-popup">任务详情不可用</div>`
  }

  // 安全地获取时间信息
  const startTime = item.start_datetime ? dayjs(item.start_datetime).format('MM-DD HH:mm') : '未知'
  const endTime = item.end_datetime ? dayjs(item.end_datetime).format('MM-DD HH:mm') : '未知'

  let durationText = '未知'
  if (item.start_datetime && item.end_datetime) {
    const duration = dayjs(item.end_datetime).diff(dayjs(item.start_datetime), 'minute')

    // 格式化持续时间
    if (duration >= 1440) { // 大于等于1天
      const days = Math.floor(duration / 1440)
      const hours = Math.floor((duration % 1440) / 60)
      durationText = days > 0 ? `${days}天${hours > 0 ? hours + '小时' : ''}` : `${hours}小时`
    } else if (duration >= 60) { // 大于等于1小时
      const hours = Math.floor(duration / 60)
      const minutes = duration % 60
      durationText = `${hours}小时${minutes > 0 ? minutes + '分钟' : ''}`
    } else if (duration > 0) { // 小于1小时但大于0
      durationText = `${duration}分钟`
    }
  }

  // 安全地获取名称和类型
  const name = item.name || '未命名任务'
  const typeConfig = getTypeConfig(item.item_type)

  return `
    <div class="gantt-popup">
      <div class="popup-header">
        <strong>${name}</strong>
        <span class="item-type">${typeConfig.name}</span>
      </div>
      <div class="popup-content">
        <p><i class="fas fa-clock"></i> ${startTime} - ${endTime}</p>
        <p><i class="fas fa-hourglass-half"></i> 持续 ${durationText}</p>
        ${item.address ? `<p><i class="fas fa-map-marker-alt"></i> ${item.address}</p>` : ''}
        ${item.cost ? `<p><i class="fas fa-yuan-sign"></i> ¥${item.cost}</p>` : ''}
        ${item.description ? `<p class="description">${item.description}</p>` : ''}
      </div>
    </div>
  `
}

// 获取类型配置
const getTypeConfig = (type?: string | null) => {
  const configs = {
    accommodation: { name: '住宿', icon: 'fa-bed', color: '#805ad5' },
    transport: { name: '交通', icon: 'fa-plane', color: '#3182ce' },
    attraction: { name: '景点', icon: 'fa-mountain', color: '#48bb78' },
    photo_spot: { name: '拍照点', icon: 'fa-camera', color: '#ed8936' },
    rest_area: { name: '休息点', icon: 'fa-coffee', color: '#38b2ac' },
    checkpoint: { name: '检查站', icon: 'fa-shield-alt', color: '#e53e3e' },
    other: { name: '其他', icon: 'fa-ellipsis-h', color: '#718096' }
  }

  // 安全地处理类型查找
  if (!type || typeof type !== 'string') {
    return configs.other
  }

  const normalizedType = type.toLowerCase().trim()
  return configs[normalizedType as keyof typeof configs] || configs.other
}

// 暴露方法给父组件
defineExpose({
  updateGantt,
  changeViewMode,
  scrollToToday,
  retryInit
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
  background: white;
}

.debug-info {
  background: rgba(255, 255, 255, 0.95);
  padding: 12px 16px;
  margin: 12px;
  border-radius: 6px;
  font-size: 12px;
  color: #666;
  border-left: 3px solid #409eff;

  p {
    margin: 4px 0;
    line-height: 1.4;
  }
}

.gantt-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: white;
  border-bottom: 1px solid #e4e7ed;
  min-height: 56px;

  .toolbar-left {
    flex: 1;
  }

  .toolbar-right {
    display: flex;
    gap: 8px;
  }
}

.gantt-chart {
  flex: 1;
  background: white;
  position: relative;
  min-height: 300px;
  overflow: visible; /* 允许内容溢出以支持交互 */

  &.is-loading {
    pointer-events: none;
    opacity: 0.7;
  }

  // 基础甘特图样式，避免干扰交互
  :deep(.gantt) {
    font-family: inherit;

    // 确保SVG元素可以交互
    svg {
      overflow: visible;
    }

    // 任务条样式 - 保持简单避免干扰拖拽
    .bar {
      cursor: move; /* 明确指示可拖拽 */

      &:hover {
        filter: brightness(1.1);
        stroke-width: 2px;
      }
    }

    // 进度条样式
    .bar-progress {
      pointer-events: none; /* 进度条不拦截交互事件 */
    }

    // 确保文本不干扰交互
    text {
      pointer-events: none;
      user-select: none;
    }
  }

  // 根据任务类型设置不同颜色
  :deep(.gantt-task-accommodation .bar) {
    fill: #805ad5;
    stroke: #6b46c1;
  }

  :deep(.gantt-task-transport .bar) {
    fill: #3182ce;
    stroke: #2c5282;
  }

  :deep(.gantt-task-attraction .bar) {
    fill: #48bb78;
    stroke: #38a169;
  }

  :deep(.gantt-task-photo_spot .bar) {
    fill: #ed8936;
    stroke: #d69e2e;
  }

  :deep(.gantt-task-rest_area .bar) {
    fill: #38b2ac;
    stroke: #319795;
  }

  :deep(.gantt-task-checkpoint .bar) {
    fill: #e53e3e;
    stroke: #c53030;
  }

  :deep(.gantt-task-other .bar) {
    fill: #718096;
    stroke: #4a5568;
  }
}

.loading-overlay,
.error-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.95);
  z-index: 10;
  backdrop-filter: blur(2px);

  p, h4 {
    margin: 8px 0;
    text-align: center;
  }

  h4 {
    color: #303133;
    font-size: 16px;
  }

  p {
    color: #606266;
    font-size: 14px;
  }
}

.no-tasks {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #909399;
  font-size: 14px;
}

// 甘特图弹窗样式
:deep(.gantt-popup) {
  max-width: 300px;
  padding: 12px;
  font-size: 13px;

  .popup-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    padding-bottom: 8px;
    border-bottom: 1px solid #e4e7ed;

    strong {
      font-size: 14px;
      color: #303133;
      max-width: 200px;
      word-break: break-word;
    }

    .item-type {
      font-size: 11px;
      padding: 2px 6px;
      background: #409eff;
      color: white;
      border-radius: 4px;
      white-space: nowrap;
    }
  }

  .popup-content {
    p {
      margin: 6px 0;
      font-size: 12px;
      color: #606266;
      display: flex;
      align-items: flex-start;
      gap: 6px;
      line-height: 1.4;

      i {
        width: 12px;
        color: #909399;
        margin-top: 2px;
        flex-shrink: 0;
      }

      &.description {
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid #f0f2f5;
        font-style: italic;
      }
    }
  }
}
/* Frappe Gantt 基础样式 */
:deep(.gantt) {
  font-family: inherit;
  font-size: 12px;

  .grid-background {
    fill: none;
  }

  .grid-header {
    fill: #fafafa;
    stroke: #e0e0e0;
    stroke-width: 1px;
  }

  .grid-row {
    fill: none;
    stroke: #e0e0e0;
    stroke-width: 1px;
  }

  .today-highlight {
    fill: #fcf8e3;
    stroke: #faebcc;
    stroke-width: 1px;
  }

  .bar {
    fill: #409eff;
    stroke: #339fff;
    stroke-width: 1px;
    rx: 3;
    ry: 3;
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
      fill: #66b1ff;
      stroke: #409eff;
    }
  }

  .bar-progress {
    fill: #85ce61;
    stroke: #67c23a;
    stroke-width: 1px;
    rx: 3;
    ry: 3;
  }

  .bar-label {
    fill: #606266;
    dominant-baseline: central;
    font-size: 12px;
    font-weight: lighter;
  }

  .arrow {
    fill: none;
    stroke: #666;
    stroke-width: 1.4;
    marker-end: url(#arrowhead);
  }

  .gantt-popup {
    position: absolute;
    background: white;
    border: 1px solid #e4e7ed;
    border-radius: 6px;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
    padding: 12px;
    font-size: 12px;
    z-index: 1000;
    max-width: 300px;

    &::before {
      content: '';
      position: absolute;
      top: -8px;
      left: 50%;
      transform: translateX(-50%);
      width: 0;
      height: 0;
      border-left: 8px solid transparent;
      border-right: 8px solid transparent;
      border-bottom: 8px solid white;
    }

    &::after {
      content: '';
      position: absolute;
      top: -9px;
      left: 50%;
      transform: translateX(-50%);
      width: 0;
      height: 0;
      border-left: 8px solid transparent;
      border-right: 8px solid transparent;
      border-bottom: 8px solid #e4e7ed;
    }
  }

  text {
    font-family: inherit;
    font-size: 11px;
    fill: #606266;
    pointer-events: none;
    user-select: none;
  }

  .tick {
    stroke: #e0e0e0;
    stroke-width: 1;
  }

  .month {
    font-size: 12px;
    font-weight: bolder;
  }

  .lower-text {
    font-size: 11px;
    fill: #909399;
  }
}
</style>
