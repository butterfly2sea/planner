<template>
  <div class="planner-container">
    <!-- 顶部工具栏 -->
    <div class="planner-header">
      <div class="plan-selector">
        <el-select
            v-model="selectedPlanId"
            placeholder="选择计划"
            @change="handlePlanChange"
            style="width: 200px"
        >
          <el-option
              v-for="plan in planStore.plans"
              :key="plan.id"
              :label="plan.name"
              :value="plan.id"
          />
        </el-select>

        <el-button type="primary" @click="handleCreatePlan">
          <el-icon>
            <Plus/>
          </el-icon>
          新建计划
        </el-button>
      </div>

      <div class="view-tabs">
        <el-radio-group v-model="activeView" @change="handleViewChange">
          <el-radio-button value="map">
            <el-icon>
              <Location/>
            </el-icon>
            地图
          </el-radio-button>
          <el-radio-button value="timeline">
            <el-icon>
              <Clock/>
            </el-icon>
            时间轴
          </el-radio-button>
          <el-radio-button value="gantt">
            <el-icon>
              <Histogram/>
            </el-icon>
            甘特图
          </el-radio-button>
        </el-radio-group>
      </div>

      <div class="toolbar">
        <el-button type="primary" @click="handleAddItem">
          <el-icon>
            <Plus/>
          </el-icon>
          添加元素
        </el-button>

        <el-button @click="exportPlan">
          <el-icon>
            <Download/>
          </el-icon>
          导出
        </el-button>
      </div>
    </div>

    <!-- 过滤器 -->
    <div class="filter-bar">
      <el-radio-group v-model="itemStore.filterType" @change="itemStore.setFilterType">
        <el-radio-button value="all">全部</el-radio-button>
        <el-radio-button value="accommodation">住宿</el-radio-button>
        <el-radio-button value="transport">交通</el-radio-button>
        <el-radio-button value="attraction">景点</el-radio-button>
        <el-radio-button value="photo_spot">拍照点</el-radio-button>
        <el-radio-button value="rest_area">休息点</el-radio-button>
        <el-radio-button value="checkpoint">检查站</el-radio-button>
        <el-radio-button value="other">其他</el-radio-button>
      </el-radio-group>

      <div class="stats">
        <el-statistic
            title="总项目"
            :value="itemStore.filteredItems.length"
            suffix="个"
        />
        <el-statistic
            title="总费用"
            :value="itemStore.totalCost"
            prefix="¥"
            :precision="2"
        />
        <el-statistic
            title="完成率"
            :value="itemStore.completionRate"
            suffix="%"
        />
      </div>
    </div>

    <!-- 主内容区域 -->
    <div class="planner-content">
      <!-- 地图视图 -->
      <div v-show="activeView === 'map'" class="view-panel">
        <MapComponent
            ref="mapRef"
            :items="itemStore.filteredItems"
            :is-location-picking="isLocationPicking"
            @marker-click="handleMarkerClick"
            @map-click="handleMapClick"
            @location-picked="handleLocationPicked"
            @location-pick-cancelled="handleLocationPickCancelled"
        />
      </div>

      <!-- 时间轴视图 -->
      <div v-show="activeView === 'timeline'" class="view-panel">
        <TimelineComponent
            :items="itemStore.filteredItems"
            @item-click="handleItemClick"
            @item-edit="handleItemEdit"
            @show-on-map="handleShowOnMap"
        />
      </div>

      <!-- 甘特图视图 -->
      <div v-show="activeView === 'gantt'" class="view-panel">
        <GanttComponent
            ref="ganttRef"
            :items="itemStore.filteredItems"
            @task-click="handleTaskClick"
            @date-change="handleDateChange"
        />
      </div>
    </div>

    <!-- 新建计划对话框 -->
    <CreatePlanDialog
        v-model="showCreatePlanDialog"
        @created="handlePlanCreated"
    />

    <!-- 元素编辑对话框 -->
    <ItemDialog
        ref="itemDialogRef"
        v-model="showItemDialog"
        :item="editingItem"
        @saved="handleItemSaved"
        @location-pick-start="handleLocationPickStart"
        @location-pick-cancel="handleLocationPickCancel"
    />
  </div>
</template>

<script setup lang="ts">
import {computed, nextTick, onMounted, ref, watch} from 'vue'
import {usePlanStore} from '@/stores/plan'
import {useItemStore} from '@/stores/item'
import {ElMessage} from 'element-plus'
import {Calendar, Clock, Download, Histogram, Location, Plus, ZoomIn, ZoomOut} from '@element-plus/icons-vue'
import type {TravelItem} from '@/types'

// Components
import MapComponent from '@/components/MapComponent.vue'
import TimelineComponent from '@/components/TimelineComponent.vue'
import GanttComponent from '@/components/GanttComponent.vue'
import CreatePlanDialog from '@/components/CreatePlanDialog.vue'
import ItemDialog from '@/components/ItemDialog.vue'

const planStore = usePlanStore()
const itemStore = useItemStore()

// 响应式数据
const activeView = ref<'map' | 'timeline' | 'gantt'>('map')
const selectedPlanId = ref<number | null>(null)
const showCreatePlanDialog = ref(false)
const showItemDialog = ref(false)
const editingItem = ref<TravelItem | null>(null)
const isLocationPicking = ref(false)

// 组件引用
const ganttRef = ref()
const mapRef = ref()
const itemDialogRef = ref()

// 计算属性
const currentPlan = computed(() => planStore.currentPlan)

// 生命周期
onMounted(async () => {
  try {
    console.log('Planner component mounted, loading plans...')
    await planStore.loadPlans()

    if (planStore.currentPlan) {
      selectedPlanId.value = planStore.currentPlan.id
      console.log('Loading items for plan:', planStore.currentPlan.id)
      await itemStore.loadItems(planStore.currentPlan.id)
    } else {
      console.warn('No current plan available after loading')
      itemStore.initialize()
    }
  } catch (error) {
    console.error('Failed to initialize planner:', error)
    ElMessage.error('初始化失败，请刷新页面重试')
  }
})

// 监听器
watch(() => planStore.currentPlan, (newPlan) => {
  if (newPlan && newPlan.id !== selectedPlanId.value) {
    selectedPlanId.value = newPlan.id
    console.log('Current plan changed:', newPlan.id)
  }
}, {immediate: true})

watch(() => itemStore.items, (newItems) => {
  console.log('Items changed:', newItems?.length || 0)
}, {deep: true})

// 计划管理事件处理
const handlePlanChange = async (planId: number) => {
  if (!planId) {
    console.warn('Invalid plan ID:', planId)
    return
  }

  try {
    console.log('Changing to plan:', planId)
    await planStore.selectPlan(planId)
    await itemStore.loadItems(planId)
    console.log('Plan changed successfully')
  } catch (error) {
    console.error('Failed to change plan:', error)
    ElMessage.error('切换计划失败')
  }
}

const handleCreatePlan = () => {
  console.log('Create plan button clicked')
  showCreatePlanDialog.value = true
}

const handlePlanCreated = (plan: any) => {
  console.log('Plan created:', plan)
  if (plan && plan.id) {
    selectedPlanId.value = plan.id
  }
  showCreatePlanDialog.value = false
  ElMessage.success('计划创建成功')
}

// 视图切换
const handleViewChange = (view: string) => {
  console.log('Changing view to:', view)
  activeView.value = view as 'map' | 'timeline' | 'gantt'
}

// 项目管理事件处理
const handleAddItem = () => {
  console.log('Add item button clicked')
  if (!planStore.currentPlan) {
    ElMessage.warning('请先选择一个计划')
    return
  }
  editingItem.value = null
  showItemDialog.value = true
}

const handleItemSaved = async () => {
  console.log('Item saved, refreshing items list')
  showItemDialog.value = false
  editingItem.value = null

  if (planStore.currentPlanId) {
    try {
      await itemStore.loadItems(planStore.currentPlanId)
      console.log('Items reloaded successfully')
    } catch (error) {
      console.error('Failed to reload items:', error)
      ElMessage.error('保存成功，但刷新列表失败')
    }
  }
}

const handleItemClick = (itemId: number) => {
  console.log('Item clicked:', itemId)
  if (typeof itemId === 'number') {
    itemStore.selectItem(itemId)
  }
}

const handleItemEdit = (itemId: number) => {
  console.log('Edit item:', itemId)

  if (!Array.isArray(itemStore.items)) {
    console.error('Items is not an array:', itemStore.items)
    return
  }

  const item = itemStore.items.find(i => i.id === itemId)
  if (item) {
    editingItem.value = item
    showItemDialog.value = true
  } else {
    console.warn('Item not found:', itemId)
    ElMessage.warning('找不到该项目')
  }
}

// 地图相关事件处理
const handleMarkerClick = (itemId: number) => {
  console.log('Marker clicked:', itemId)
  if (typeof itemId === 'number') {
    itemStore.selectItem(itemId)
  }
}

const handleMapClick = (lngLat: { lng: number; lat: number }) => {
  console.log('Map clicked:', lngLat, 'isLocationPicking:', isLocationPicking.value)

  if (isLocationPicking.value && itemDialogRef.value) {
    // 位置选择模式下传递坐标给对话框
    itemDialogRef.value.setLocation(lngLat)
  }
}

const handleShowOnMap = (item: TravelItem) => {
  console.log('Show item on map:', item.id)
  activeView.value = 'map'

  nextTick(() => {
    if (mapRef.value && item.latitude && item.longitude) {
      // 聚焦到该项目位置
      itemStore.selectItem(item.id)
    }
  })
}

// 位置选择相关
const handleLocationPickStart = () => {
  console.log('Location pick started from dialog')
  isLocationPicking.value = true

  // 切换到地图视图
  if (activeView.value !== 'map') {
    activeView.value = 'map'
  }

  // 启动地图的位置选择模式
  nextTick(() => {
    if (mapRef.value) {
      mapRef.value.startLocationPicking()
    }
  })
}

const handleLocationPickCancel = () => {
  console.log('Location pick cancelled from dialog')
  isLocationPicking.value = false

  if (mapRef.value) {
    mapRef.value.cancelLocationPick()
  }
}

const handleLocationPicked = (lngLat: { lng: number; lat: number }) => {
  console.log('Location picked from map:', lngLat)

  // 传递给对话框
  if (itemDialogRef.value) {
    itemDialogRef.value.setLocation(lngLat)
  }
}

const handleLocationPickCancelled = () => {
  console.log('Location pick cancelled from map')
  isLocationPicking.value = false
}

// 甘特图相关事件处理
const handleTaskClick = (task: any) => {
  console.log('Task clicked:', task)
  if (task && task._item && task._item.id) {
    itemStore.selectItem(task._item.id)
  }
}

const handleDateChange = async (task: any, start: Date, end: Date) => {
  if (!task || !task._item) {
    console.error('Invalid task data:', task)
    return
  }

  console.log('Updating task dates:', task._item.id, start, end)

  try {
    await itemStore.updateItem(task._item.id, {
      id: task._item.id,
      start_datetime: start.toISOString(),
      end_datetime: end.toISOString()
    })
    ElMessage.success('时间更新成功')
  } catch (error) {
    console.error('Failed to update dates:', error)
    ElMessage.error('时间更新失败')
  }
}

// 导出功能
const exportPlan = () => {
  if (!currentPlan.value) {
    ElMessage.warning('没有选择的计划')
    return
  }

  if (!Array.isArray(itemStore.items) || itemStore.items.length === 0) {
    ElMessage.warning('没有可导出的数据')
    return
  }

  try {
    const exportData = {
      plan: currentPlan.value,
      items: itemStore.items,
      exportTime: new Date().toISOString(),
      version: '2.0'
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    })

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${currentPlan.value.name}-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)

    URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  } catch (error) {
    console.error('Failed to export plan:', error)
    ElMessage.error('导出失败')
  }
}
</script>

<style lang="scss" scoped>
.planner-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}

.planner-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: white;
  border-bottom: 1px solid #e8e8e8;
  flex-wrap: wrap;
  gap: 16px;

  .plan-selector {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .view-tabs {
    flex: 1;
    display: flex;
    justify-content: center;

    @media (max-width: 768px) {
      order: 3;
      width: 100%;
      justify-content: flex-start;
    }
  }

  .toolbar {
    display: flex;
    gap: 8px;
  }
}

.filter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: white;
  border-bottom: 1px solid #e8e8e8;
  flex-wrap: wrap;
  gap: 16px;

  .stats {
    display: flex;
    gap: 32px;

    :deep(.el-statistic) {
      .el-statistic__content {
        font-size: 16px;
      }

      .el-statistic__head {
        font-size: 12px;
        color: #999;
      }
    }
  }
}

.planner-content {
  flex: 1;
  position: relative;
  overflow: hidden;

  .view-panel {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
  }

  .gantt-toolbar {
    padding: 12px 16px;
    background: white;
    border-bottom: 1px solid #e8e8e8;
  }
}

// 响应式设计
@media (max-width: 768px) {
  .planner-header {
    padding: 12px 16px;

    .plan-selector {
      order: 1;
    }

    .toolbar {
      order: 2;
    }
  }

  .filter-bar {
    padding: 12px 16px;

    .stats {
      gap: 16px;

      :deep(.el-statistic) {
        .el-statistic__content {
          font-size: 14px;
        }
      }
    }
  }
}
</style>