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
      <el-empty description="暂无甘特图数据" />
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
  location: string
  start_datetime: string
  end_datetime: string
  type?: string
  description?: string
  status?: string
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

    if (!hasValidDates && item) {
      console.warn('Item with invalid dates:', item.name, item.start_datetime, item.end_datetime)
    }

    return hasValidDates
  })
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
  return end.diff(start, 'day')
})

// 转换为甘特图行数据
const ganttRows = computed(() => {
  // 显式访问 validItems.value 确保依赖追踪
  const items = validItems.value
  console.log('computed触发 - 重新计算ganttRows, validItems数量:', items.length)

  if (items.length === 0) {
    console.log('没有有效项目，返回空数组')
    return []
  }

  const rows: GanttRow[] = []

  // 按位置分组 - 使用items而不是validItems.value
  const locationGroups = groupItemsByLocation(items)
  console.log('位置分组结果:', Object.keys(locationGroups))

  Object.entries(locationGroups).forEach(([location, itemList]) => {
    console.log(`处理位置 "${location}":`, itemList.length, '个项目')

    const bars: GanttBar[] = itemList
      .map(item => {
        try {
          return convertToGanttBar(item)
        } catch (error) {
          console.error('转换项目失败:', item, error)
          return null
        }
      })
      .filter((bar): bar is GanttBar => bar !== null)

    if (bars.length > 0) {
      rows.push({
        id: `location-${location}`,
        label: location || '未知位置',
        bars
      })
      console.log(`添加行: "${location}", ${bars.length}个条目`)
    }
  })

  console.log('最终生成', rows.length, '行数据')
  return rows
})


// 按位置分组项目
function groupItemsByLocation(items: TravelItem[]): Record<string, TravelItem[]> {
  return items.reduce((groups, item) => {
    const location = item.location || '其他'
    if (!groups[location]) {
      groups[location] = []
    }
    groups[location].push(item)
    return groups
  }, {} as Record<string, TravelItem[]>)
}

// 转换单个项目为甘特条
function convertToGanttBar(item: TravelItem): GanttBar {
  const startDate = dayjs(item.start_datetime)
  const endDate = dayjs(item.end_datetime)

  // 确保结束时间晚于开始时间
  const adjustedEndDate = endDate.isSame(startDate) || endDate.isBefore(startDate)
      ? startDate.add(1, 'hour')
      : endDate

  return {
    startDate: startDate.format('YYYY-MM-DD HH:mm:ss'),
    endDate: adjustedEndDate.format('YYYY-MM-DD HH:mm:ss'),
    ganttBarConfig: {
      id: item.id,
      label: item.name,
      hasHandles: true,
      style: getItemStyle(item)
    },
    _item: item
  }
}

// 获取项目样式
function getItemStyle(item: TravelItem): Record<string, any> {
  const typeColors: Record<string, string> = {
    'attraction': '#4CAF50',
    'restaurant': '#FF9800',
    'accommodation': '#2196F3',
    'transportation': '#9C27B0',
    'activity': '#E91E63',
    'shopping': '#00BCD4'
  }

  const baseStyle = {
    background: typeColors[item.type || 'activity'] || '#607D8B',
    borderRadius: '4px',
    color: 'white',
    fontSize: '12px',
    fontWeight: '500'
  }

  // 根据状态添加特殊样式
  if (item.status === 'completed') {
    baseStyle.background = '#4CAF50'
    // baseStyle['opacity'] = '0.8'
  } else if (item.status === 'cancelled') {
    baseStyle.background = '#F44336'
    // baseStyle['textDecoration'] = 'line-through'
  }

  return baseStyle
}

// 事件处理函数
function handleBarClick(bar: any, event: Event) {
  const ganttBar = bar as GanttBar
  if (ganttBar._item) {
    emit('bar-click', ganttBar, ganttBar._item)
    ElMessage.info(`点击了项目: ${ganttBar._item.name}`)
  }
}

function handleBarDoubleClick(bar: any, event: Event) {
  const ganttBar = bar as GanttBar
  if (ganttBar._item) {
    emit('bar-double-click', ganttBar, ganttBar._item)
    ElMessage.info(`双击了项目: ${ganttBar._item.name}`)
  }
}

function handleBarMouseEnter(bar: any, event: Event) {
  // 可以在这里添加鼠标悬停效果
}

function handleBarMouseLeave(bar: any, event: Event) {
  // 清理鼠标悬停效果
}

function handleContextMenu(bar: any, event: Event) {
  event.preventDefault()
  const ganttBar = bar as GanttBar
  if (ganttBar._item) {
    ElMessageBox.confirm(
        `确定要删除项目 "${ganttBar._item.name}" 吗？`,
        '确认删除',
        {
          confirmButtonText: '删除',
          cancelButtonText: '取消',
          type: 'warning',
        }
    ).then(() => {
      ElMessage.success('项目已删除')
      // 这里应该调用删除API
    }).catch(() => {
      ElMessage.info('已取消删除')
    })
  }
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

// 初始化
onMounted(async () => {
  isLoading.value = true

  try {
    await nextTick()

    if (validItems.value.length === 0) {
      ganttError.value = '没有有效的甘特图数据'
      return
    }

    console.log(`甘特图初始化成功，包含 ${ganttRows.value.length} 行数据`)

  } catch (error) {
    console.error('甘特图初始化失败:', error)
    ganttError.value = error instanceof Error ? error.message : '甘特图初始化失败'
  } finally {
    isLoading.value = false
  }
})

// 监听数据变化
watch(
    () => validItems.value,
    (newItems) => {
      console.log('甘特图数据更新:', newItems.length, '个有效项目')
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
}

.gantt-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: var(--el-bg-color-page);
  border-radius: 8px;
  margin-bottom: 16px;

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
}

.gantt-empty {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
  background: white;
  border-radius: 8px;
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
}

:deep(.g-gantt-bar) {
  transition: all 0.2s ease;

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
</style>