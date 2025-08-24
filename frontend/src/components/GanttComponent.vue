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
      <p>Loading status: {{ loadingStatus }}</p>
    </div>

    <!-- 甘特图工具栏 -->
    <div v-if="validItems.length > 0" class="gantt-toolbar">
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

      <el-button size="small" @click="scrollToToday" :icon="Calendar">
        今天
      </el-button>

      <el-button v-if="ganttError" size="small" type="warning" @click="retryGanttInit">
        <el-icon>
          <Refresh/>
        </el-icon>
        重试
      </el-button>
    </div>

    <!-- 甘特图容器 -->
    <div
        v-show="validItems.length > 0"
        ref="ganttContainer"
        class="gantt-chart"
        :class="{ 'gantt-loading': isLoading }"
    />

    <!-- 加载状态 -->
    <div v-if="isLoading && validItems.length > 0" class="loading-overlay">
      <el-icon class="is-loading">
        <Loading/>
      </el-icon>
      <p>{{ loadingStatus }}</p>
    </div>

    <!-- 错误状态 -->
    <div v-if="ganttError && validItems.length > 0" class="error-overlay">
      <el-icon>
        <WarningFilled/>
      </el-icon>
      <h4>甘特图加载失败</h4>
      <p>{{ ganttError }}</p>
      <el-button type="primary" @click="retryGanttInit">重试</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import {computed, nextTick, onMounted, onUnmounted, ref, watch} from 'vue'
import dayjs from 'dayjs'
import type {TravelItem} from '@/types'
import {ElMessage} from 'element-plus'
import {Calendar, Loading, Refresh, WarningFilled} from '@element-plus/icons-vue'

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
const currentViewMode = ref<string>('Day')

// 视图模式配置
const viewModes = ['Quarter Day', 'Half Day', 'Day', 'Week', 'Month']
const viewModeLabels: Record<string, string> = {
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

    if (!hasValidDates && item && item.start_datetime) {
      console.warn('Item with invalid dates:', item.name, item.start_datetime, item.end_datetime)
    }

    return hasValidDates
  })
})

// 计算甘特图任务
const ganttTasks = computed(() => {
  return convertToGanttTasks(validItems.value)
})

// 组件挂载
onMounted(async () => {
  await nextTick()
  if (validItems.value.length > 0) {
    await initGantt()
  }
})

// 监听数据变化
watch(() => validItems.value, async () => {
  console.log('Valid items changed:', validItems.value.length)
  if (validItems.value.length > 0) {
    await updateGantt()
  } else {
    destroyGantt()
  }
}, {deep: true})

// 组件卸载时清理
onUnmounted(() => {
  destroyGantt()
})

// 初始化甘特图
const initGantt = async (): Promise<void> => {
  if (!ganttContainer.value || validItems.value.length === 0) {
    console.warn('Cannot init gantt: container not available or no valid items')
    return
  }

  isLoading.value = true
  ganttError.value = ''
  loadingStatus.value = '正在加载甘特图组件...'

  try {
    // 动态导入Frappe Gantt，使用多种方式尝试
    let Gantt: any = null

    try {
      // 方式1: ES模块导入
      const ganttModule = await import('frappe-gantt')
      Gantt = ganttModule.default || ganttModule
    } catch (e1) {
      console.warn('ES module import failed, trying CDN:', e1)

      try {
        // 方式2: CDN导入
        await loadGanttFromCDN()
        Gantt = (window as any).Gantt
      } catch (e2) {
        console.warn('CDN import failed, trying fallback:', e2)

        // 方式3: 使用简化的甘特图实现
        Gantt = createSimpleGantt
      }
    }

    if (!Gantt) {
      throw new Error('无法加载甘特图库')
    }

    loadingStatus.value = '正在创建甘特图...'
    await createGanttChart(Gantt)

  } catch (error) {
    console.error('Failed to create gantt chart:', error)
    ganttError.value = error instanceof Error ? error.message : '甘特图初始化失败'
    ElMessage.error('甘特图加载失败，请检查网络连接')
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

    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/frappe-gantt@0.6.1/dist/frappe-gantt.min.js'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('CDN加载失败'))

    // 加载CSS
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://cdn.jsdelivr.net/npm/frappe-gantt@0.6.1/dist/frappe-gantt.css'

    document.head.appendChild(link)
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
    console.log('No tasks to display in gantt')
    return
  }

  console.log('Creating gantt with tasks:', tasks.length)

  try {
    // 如果是简化实现
    if (GanttClass === createSimpleGantt) {
      createSimpleGantt(ganttContainer.value, tasks)
      return
    }

    // 创建甘特图实例
    gantt.value = new GanttClass(ganttContainer.value, tasks, {
      view_mode: currentViewMode.value,
      date_format: 'YYYY-MM-DD',
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

  } catch (error) {
    console.error('Gantt instance creation failed:', error)
    // 回退到简化实现
    createSimpleGantt(ganttContainer.value, tasks)
  }
}

// 简化的甘特图实现（回退方案）
const createSimpleGantt = (container: HTMLElement, tasks: GanttTask[]) => {
  console.log('Using simple gantt fallback')

  const html = `
    <div class="simple-gantt">
      <div class="gantt-header">
        <h4>甘特图视图（简化版）</h4>
        <p>完整甘特图功能加载中，当前显示简化时间线</p>
      </div>
      <div class="gantt-tasks">
        ${tasks.map(task => `
          <div class="gantt-task" data-task-id="${task.id}">
            <div class="task-info">
              <strong>${task.name}</strong>
              <small>${task.start} 至 ${task.end}</small>
            </div>
            <div class="task-progress">
              <div class="progress-bar" style="width: ${task.progress}%"></div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `

  container.innerHTML = html

  // 添加点击事件
  container.querySelectorAll('.gantt-task').forEach(taskEl => {
    taskEl.addEventListener('click', () => {
      const taskId = taskEl.getAttribute('data-task-id')
      const task = tasks.find(t => t.id === taskId)
      if (task) {
        emit('task-click', task)
      }
    })
  })
}

// 更新甘特图
const updateGantt = async () => {
  if (validItems.value.length === 0) {
    destroyGantt()
    return
  }

  await initGantt()
}

// 销毁甘特图
const destroyGantt = () => {
  if (gantt.value && gantt.value.destroy) {
    try {
      gantt.value.destroy()
    } catch (e) {
      console.warn('Gantt destroy error:', e)
    }
  }
  gantt.value = null

  if (ganttContainer.value) {
    ganttContainer.value.innerHTML = ''
  }
}

// 重试初始化
const retryGanttInit = async () => {
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
      console.warn('Change view mode failed:', e)
      // 重新创建甘特图
      await initGantt()
    }
  }
}

// 滚动到今天
const scrollToToday = () => {
  console.log('Scroll to today requested')
  // 简单实现：重新渲染甘特图
  if (gantt.value) {
    try {
      // 如果有原生方法就调用
      if (gantt.value.scroll_to_date) {
        gantt.value.scroll_to_date(new Date())
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
      start: startDate.format('YYYY-MM-DD'),
      end: adjustedEndDate.format('YYYY-MM-DD'),
      progress,
      custom_class: `gantt-task-${item.item_type}`,
      _item: item
    }

    tasks.push(task)
  })

  return tasks
}

// 创建任务弹窗内容
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

// 获取类型配置
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

// 暴露方法给父组件
defineExpose({
  updateGantt,
  changeViewMode,
  scrollToToday,
  retryGanttInit
})
</script>

<style lang="scss" scoped>
.gantt-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f8f9fa;
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
  margin: 0 16px 16px 16px;
  font-size: 12px;
  color: #666;

  p {
    margin: 4px 0;
  }
}

.gantt-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: white;
  border-bottom: 1px solid #e8e8e8;
  flex-shrink: 0;
}

.gantt-chart {
  flex: 1;
  position: relative;
  background: white;
  overflow: hidden;

  &.gantt-loading {
    pointer-events: none;
    opacity: 0.6;
  }
}

.loading-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  z-index: 100;

  .el-icon {
    font-size: 24px;
    color: #409eff;
  }

  p {
    margin: 0;
    color: #666;
    font-size: 14px;
  }
}

.error-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  text-align: center;
  z-index: 100;
  background: white;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);

  .el-icon {
    font-size: 48px;
    color: #f56565;
  }

  h4 {
    margin: 0;
    color: #333;
    font-size: 18px;
  }

  p {
    margin: 0;
    color: #666;
    font-size: 14px;
    max-width: 300px;
  }
}

// 简化甘特图样式
.simple-gantt {
  padding: 20px;
  height: 100%;

  .gantt-header {
    text-align: center;
    margin-bottom: 20px;

    h4 {
      margin: 0 0 8px 0;
      color: #333;
    }

    p {
      margin: 0;
      color: #666;
      font-size: 14px;
    }
  }

  .gantt-tasks {
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-height: 400px;
    overflow-y: auto;
  }

  .gantt-task {
    background: white;
    border: 1px solid #e8e8e8;
    border-radius: 6px;
    padding: 12px;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      transform: translateY(-1px);
    }

    .task-info {
      margin-bottom: 8px;

      strong {
        display: block;
        color: #333;
        font-size: 14px;
        margin-bottom: 4px;
      }

      small {
        color: #666;
        font-size: 12px;
      }
    }

    .task-progress {
      height: 4px;
      background: #f0f0f0;
      border-radius: 2px;
      overflow: hidden;

      .progress-bar {
        height: 100%;
        background: #409eff;
        border-radius: 2px;
        transition: width 0.3s ease;
      }
    }
  }
}

// 全局甘特图样式
:global(.gantt .bar) {
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
</style>