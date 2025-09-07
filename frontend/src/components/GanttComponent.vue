<template>
  <div class="gantt-wrapper">
    <!-- 控制面板 -->
    <div class="gantt-controls" v-if="showControls">
      <div class="view-mode-selector">
        <label>视图模式:</label>
        <el-select v-model="currentPrecision" @change="updateView">
          <el-option
              v-for="(label, precision) in precisionLabels"
              :key="precision"
              :label="label"
              :value="precision"
          />
        </el-select>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="isLoading" class="gantt-loading">
      <el-skeleton :rows="5" animated />
    </div>

    <!-- 错误信息 -->
    <el-alert
        v-if="ganttError"
        :title="ganttError"
        type="error"
        show-icon
        :closable="true"
        @close="ganttError = ''"
    />

    <!-- Vue Ganttastic 甘特图 -->
    <div v-if="!isLoading && !ganttError && ganttRows.length > 0" class="gantt-container">
      <g-gantt-chart
          :chart-start="chartStart"
          :chart-end="chartEnd"
          :precision="currentPrecision"
          bar-start="startDate"
          bar-end="endDate"
          :locale="locale"
          :width="chartWidth"
          :push-on-overlap="false"
          :no-overlap="true"
          @bar-click="handleBarClick"
          @bar-dblclick="handleBarDoubleClick"
          @bar-mouseenter="handleBarMouseEnter"
          @bar-mouseleave="handleBarMouseLeave"
          @contextmenu="handleContextMenu"
          @dragstart-bar="handleDragStart"
          @drag-bar="handleDrag"
          @dragend-bar="handleDragEnd"
      >
        <g-gantt-row
            v-for="(row, index) in ganttRows"
            :key="row.id || index"
            :label="row.label"
            :bars="row.bars"
            :highlight-on-hover="true"
        />
      </g-gantt-chart>
    </div>

    <!-- 空状态 -->
    <div v-if="!isLoading && !ganttError && ganttRows.length === 0" class="gantt-empty">
      <el-empty description="暂无甘特图数据">
        <template #description>
          <p v-if="validItems.length === 0">请添加包含开始和结束时间的旅游元素</p>
          <p v-else>数据处理中，请稍候...</p>
        </template>
        <el-button v-if="validItems.length > 0" type="primary" @click="retryInitialization">
          重试加载
        </el-button>
      </el-empty>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import duration from 'dayjs/plugin/duration'
import minMax from 'dayjs/plugin/minMax'

// 配置dayjs
dayjs.extend(duration)
dayjs.extend(minMax)
dayjs.locale('zh-cn')

// 类型定义
interface TravelItem {
  id: string | number
  name: string
  item_type: string
  start_datetime: string
  end_datetime: string
  type?: string
  description?: string
  status?: string
  cost?: number
  latitude?: number
  longitude?: number
}

interface GanttRow {
  id: string | number
  label: string
  bars: GanttBar[]
}

interface GanttBar {
  startDate: string
  endDate: string
  ganttBarConfig: {
    id: string | number
    label: string
    style?: Record<string, any>
    hasHandles?: boolean
    immobile?: boolean
    bundle?: string
  }
  _item?: TravelItem
}

interface Props {
  items: TravelItem[]
  showControls?: boolean
  precision?: string
  locale?: string
  width?: string
}

interface Emits {
  (e: 'bar-click', bar: GanttBar, item: TravelItem): void
  (e: 'bar-double-click', bar: GanttBar, item: TravelItem): void
  (e: 'bar-drag', bar: GanttBar, item: TravelItem, newStart: string, newEnd: string): void
  (e: 'item-update', item: TravelItem, updates: Partial<TravelItem>): void
}

const props = withDefaults(defineProps<Props>(), {
  showControls: true,
  precision: 'hour',
  locale: 'zh-cn',
  width: '100%'
})

const emit = defineEmits<Emits>()

// 响应式数据
const isLoading = ref(false)
const ganttError = ref('')
const currentPrecision = ref(props.precision)
const locale = ref(props.locale)
const chartWidth = ref(props.width)

// 精度标签映射
const precisionLabels: Record<string, string> = {
  'hour': '小时',
  'day': '天',
  'week': '周',
  'month': '月'
}

// 类型配置
const typeConfigs: Record<string, { name: string; color: string; icon: string }> = {
  accommodation: { name: '住宿', color: '#805ad5', icon: 'fa-bed' },
  transport: { name: '交通', color: '#3182ce', icon: 'fa-plane' },
  attraction: { name: '景点', color: '#48bb78', icon: 'fa-mountain' },
  photo_spot: { name: '拍照点', color: '#ed8936', icon: 'fa-camera' },
  rest_area: { name: '休息点', color: '#38b2ac', icon: 'fa-coffee' },
  checkpoint: { name: '检查站', color: '#e53e3e', icon: 'fa-shield-alt' },
  other: { name: '其他', color: '#718096', icon: 'fa-ellipsis-h' }
}

// 计算有效项目
const validItems = computed(() => {
  if (!Array.isArray(props.items)) {
    console.warn('Items is not an array:', props.items)
    return []
  }

  const filtered = props.items.filter(item => {
    // 基本验证
    if (!item) {
      console.warn('Null item found')
      return false
    }

    // 时间验证
    const hasValidDates = item.start_datetime &&
        item.end_datetime &&
        dayjs(item.start_datetime).isValid() &&
        dayjs(item.end_datetime).isValid()

    if (!hasValidDates) {
      console.warn('Item with invalid dates:', {
        name: item.name,
        start: item.start_datetime,
        end: item.end_datetime
      })
      return false
    }

    // 确保结束时间不早于开始时间
    const startDate = dayjs(item.start_datetime)
    const endDate = dayjs(item.end_datetime)

    if (endDate.isBefore(startDate)) {
      console.warn('Item with end before start:', {
        name: item.name,
        start: item.start_datetime,
        end: item.end_datetime
      })
      return false
    }

    return true
  })
  return filtered
})

// 计算图表开始和结束时间
const chartStart = computed(() => {
  if (validItems.value.length === 0) {
    return dayjs().format('YYYY-MM-DD HH:mm:ss')
  }

  const startTimes = validItems.value.map(item => dayjs(item.start_datetime))
  const earliest = dayjs.min(startTimes)

  // 向前扩展一些时间以提供视觉缓冲
  return earliest?.subtract(2, 'hour').format('YYYY-MM-DD HH:mm:ss')
})

const chartEnd = computed(() => {
  if (validItems.value.length === 0) {
    return dayjs().add(1, 'day').format('YYYY-MM-DD HH:mm:ss')
  }

  const endTimes = validItems.value.map(item => dayjs(item.end_datetime))
  const latest = dayjs.max(endTimes)

  // 向后扩展一些时间以提供视觉缓冲
  return latest?.add(2, 'hour').format('YYYY-MM-DD HH:mm:ss')
})

// 计算时间跨度
const timeSpan = computed(() => {
  if (validItems.value.length === 0) return 0

  const start = dayjs(chartStart.value)
  const end = dayjs(chartEnd.value)
  return Math.ceil(end.diff(start, 'day', true))
})

// 转换为甘特图行数据
const ganttRows = computed(() => {
  const items = validItems.value
  console.log('Computing ganttRows, valid items:', items.length)

  if (items.length === 0) {
    console.log('No valid items, returning empty rows')
    return []
  }

  try {
    const rows: GanttRow[] = []

    // 按项目类型分组
    const typeGroups = groupItemsByType(items)
    console.log('Type groups:', Object.keys(typeGroups))

    // 按预定义的类型顺序显示
    const typeOrder = ['accommodation', 'transport', 'attraction', 'photo_spot', 'rest_area', 'checkpoint', 'other']

    typeOrder.forEach(type => {
      const itemList = typeGroups[type]
      if (!itemList || itemList.length === 0) return

      console.log(`Processing type "${type}":`, itemList.length, 'items')

      const bars: GanttBar[] = []

      itemList.forEach(item => {
        try {
          const bar = convertToGanttBar(item)
          if (bar) {
            bars.push(bar)
            console.log(`Created bar for ${item.name}:`, {
              start: bar.startDate,
              end: bar.endDate,
              label: bar.ganttBarConfig.label
            })
          }
        } catch (error) {
          console.error('Failed to convert item to gantt bar:', item.name, error)
        }
      })

      if (bars.length > 0) {
        const config = typeConfigs[type] || typeConfigs.other
        rows.push({
          id: `type-${type}`,
          label: `${config.name} (${bars.length})`,
          bars
        })
        console.log(`Added row: "${config.name}", ${bars.length} bars`)
      }
    })

    console.log('Final gantt rows:', rows.length)
    return rows
  } catch (error) {
    console.error('Error computing gantt rows:', error)
    ganttError.value = '甘特图数据处理失败: ' + (error instanceof Error ? error.message : '未知错误')
    return []
  }
})

// 按项目类型分组
function groupItemsByType(items: TravelItem[]): Record<string, TravelItem[]> {
  return items.reduce((groups, item) => {
    const itemType = item.item_type || item.type || 'other'
    if (!groups[itemType]) {
      groups[itemType] = []
    }
    groups[itemType].push(item)
    return groups
  }, {} as Record<string, TravelItem[]>)
}

// 转换单个项目为甘特条
function convertToGanttBar(item: TravelItem): GanttBar | null {
  try {
    const startDate = dayjs.tz(item.start_datetime, "Asia/Shanghai")
    const endDate = dayjs.tz(item.end_datetime, "Asia/Shanghai")

    if (!startDate.isValid() || !endDate.isValid()) {
      throw new Error(`Invalid dates for item ${item.name}: start=${item.start_datetime}, end=${item.end_datetime}`)
    }

    // 确保结束时间晚于开始时间，最少1小时
    const adjustedEndDate = endDate.isSame(startDate) || endDate.isBefore(startDate)
        ? startDate.add(1, 'hour')
        : endDate

    // 获取类型配置
    const itemType = item.item_type || item.type || 'other'
    const config = typeConfigs[itemType] || typeConfigs.other

    // 使用Vue Ganttastic要求的日期格式：YYYY-MM-DD HH:mm
    const bar: GanttBar = {
      startDate: startDate.format('YYYY-MM-DD HH:mm'),
      endDate: adjustedEndDate.format('YYYY-MM-DD HH:mm'),
      ganttBarConfig: {
        id: String(item.id),
        label: item.name,
        style: {
          backgroundColor: config.color,
          color: 'white',
          borderRadius: '4px',
          border: '1px solid rgba(255,255,255,0.3)'
        },
        hasHandles: true,
        immobile: false,
        bundle: itemType
      },
      _item: item
    }

    console.log(`Created gantt bar for ${item.name}:`, {
      start: bar.startDate,
      end: bar.endDate,
      duration: adjustedEndDate.diff(startDate, 'hour'),
      type: itemType
    })

    return bar
  } catch (error) {
    console.error('Error converting item to gantt bar:', item.name, error)
    return null
  }
}

// 事件处理函数
function handleBarClick(bar: any, event: Event) {
  const ganttBar = bar as GanttBar
  if (ganttBar._item) {
    console.log('Bar clicked:', ganttBar._item.name)
    emit('bar-click', ganttBar, ganttBar._item)
  }
}

function handleBarDoubleClick(bar: any, event: Event) {
  const ganttBar = bar as GanttBar
  if (ganttBar._item) {
    console.log('Bar double clicked:', ganttBar._item.name)
    emit('bar-double-click', ganttBar, ganttBar._item)
  }
}

function handleBarMouseEnter(bar: any, event: Event) {
  // 鼠标悬停处理
}

function handleBarMouseLeave(bar: any, event: Event) {
  // 鼠标离开处理
}

function handleContextMenu(bar: any, event: Event) {
  event.preventDefault()
  // 右键菜单处理
}

function handleDragStart(bar: any, event: Event) {
  const ganttBar = bar as GanttBar
  if (ganttBar._item) {
    console.log('开始拖拽:', ganttBar._item.name)
  }
}

function handleDrag(bar: any, event: Event) {
  // 拖拽过程中的处理
}

function handleDragEnd(bar: any, movedBars: any[]) {
  const ganttBar = bar as GanttBar
  if (ganttBar._item && movedBars.length > 0) {
    const movedBar = movedBars[0]
    const newStart = movedBar.startDate
    const newEnd = movedBar.endDate

    emit('bar-drag', ganttBar, ganttBar._item, newStart, newEnd)
    emit('item-update', ganttBar._item, {
      start_datetime: newStart,
      end_datetime: newEnd
    })

    ElMessage.success(`项目 "${ganttBar._item.name}" 时间已更新`)
  }
}

function updateView() {
  ElMessage.info(`视图模式已切换为: ${precisionLabels[currentPrecision.value]}`)
}

function retryInitialization() {
  ganttError.value = ''
  console.log('Retrying gantt initialization...')
  // 强制重新计算
  nextTick(() => {
    if (validItems.value.length > 0) {
      console.log('Retry: valid items available, should show gantt')
    } else {
      console.log('Retry: no valid items available')
    }
  })
}

// 初始化
onMounted(async () => {
  isLoading.value = true

  try {
    await nextTick()

    console.log('GanttComponent mounted, items:', props.items?.length || 0)
    console.log('Valid items:', validItems.value.length)
    console.log('Gantt rows:', ganttRows.value.length)

    // 移除之前的错误检查，让组件正常渲染
    if (validItems.value.length === 0) {
      console.log('No valid items on mount, but component will render empty state')
    } else {
      console.log(`甘特图初始化成功，包含 ${ganttRows.value.length} 行数据`)
    }

  } catch (error) {
    console.error('甘特图初始化失败:', error)
    ganttError.value = error instanceof Error ? error.message : '甘特图初始化失败'
  } finally {
    isLoading.value = false
  }
})

// 监听数据变化
watch(
    () => props.items,
    (newItems) => {
      console.log('Props items changed:', newItems?.length || 0)
    },
    { deep: true, immediate: true }
)

watch(
    () => validItems.value,
    (newItems) => {
      console.log('Valid items updated:', newItems.length, '个有效项目')
      if (newItems.length > 0 && ganttError.value) {
        // 如果有了有效数据但仍有错误信息，清除错误
        ganttError.value = ''
      }
    },
    { deep: true }
)

watch(
    () => ganttRows.value,
    (newRows) => {
      console.log('Gantt rows updated:', newRows.length, '行')
    },
    { deep: true }
)
</script>

<style scoped lang="scss">
.gantt-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.gantt-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: var(--el-bg-color-page);
  border-radius: 8px;

  .view-mode-selector {
    display: flex;
    align-items: center;
    gap: 12px;

    label {
      font-weight: 500;
      color: var(--el-text-color-primary);
    }
  }

  .gantt-stats {
    display: flex;
    gap: 16px;
    font-size: 14px;
    color: var(--el-text-color-regular);

    span {
      padding: 4px 8px;
      background: var(--el-fill-color-light);
      border-radius: 4px;
    }
  }
}

.gantt-loading {
  padding: 20px;
  border-radius: 8px;
  background: white;
}

.gantt-container {
  flex: 1;
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  min-height: 300px;
}

.gantt-empty {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
  background: white;
  border-radius: 8px;
}

.debug-panel {
  background: var(--el-fill-color-lighter);
  border-radius: 8px;
  overflow: hidden;

  .debug-content {
    padding: 16px;
    font-size: 14px;
    line-height: 1.5;

    p {
      margin: 8px 0;
    }

    ul {
      margin: 8px 0;
      padding-left: 20px;
    }

    li {
      margin: 4px 0;
    }
  }
}

// Vue Ganttastic 样式定制
:deep(.g-gantt-chart) {
  font-family: var(--el-font-family);
}

:deep(.g-gantt-row-label) {
  font-weight: 500;
  color: var(--el-text-color-primary);
  background: var(--el-fill-color-lighter);
  border-right: 1px solid var(--el-border-color-light);
  padding: 8px 12px;
}

:deep(.g-gantt-bar) {
  transition: all 0.2s ease;
  cursor: pointer;

  &:hover {
    filter: brightness(1.1);
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }
}

:deep(.g-gantt-time-axis) {
  background: var(--el-fill-color-page);
  border-bottom: 1px solid var(--el-border-color-light);
}

:deep(.g-gantt-rows-container) {
  border: 1px solid var(--el-border-color-light);
  border-radius: 4px;
}
</style>