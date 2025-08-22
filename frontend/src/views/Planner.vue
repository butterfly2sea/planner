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

        <el-button type="primary" @click="showCreatePlanDialog = true">
          <el-icon><Plus /></el-icon>
          新建计划
        </el-button>
      </div>

      <div class="view-tabs">
        <el-radio-group v-model="activeView" @change="handleViewChange">
          <el-radio-button value="map">
            <el-icon><Location /></el-icon>
            地图
          </el-radio-button>
          <el-radio-button value="timeline">
            <el-icon><Clock /></el-icon>
            时间轴
          </el-radio-button>
          <el-radio-button value="gantt">
            <el-icon><Histogram /></el-icon>
            甘特图
          </el-radio-button>
        </el-radio-group>
      </div>

      <div class="toolbar">
        <el-button type="primary" @click="showItemDialog = true">
          <el-icon><Plus /></el-icon>
          添加元素
        </el-button>

        <el-button @click="exportPlan">
          <el-icon><Download /></el-icon>
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
            :items="itemStore.filteredItems"
            @marker-click="handleMarkerClick"
            @map-click="handleMapClick"
        />
      </div>

      <!-- 时间轴视图 -->
      <div v-show="activeView === 'timeline'" class="view-panel">
        <TimelineComponent
            :items="itemStore.filteredItems"
            @item-click="handleItemClick"
            @item-edit="handleItemEdit"
        />
      </div>

      <!-- 甘特图视图 -->
      <div v-show="activeView === 'gantt'" class="view-panel">
        <div class="gantt-toolbar">
          <el-button-group>
            <el-button @click="ganttZoomIn">
              <el-icon><ZoomIn /></el-icon>
              放大
            </el-button>
            <el-button @click="ganttZoomOut">
              <el-icon><ZoomOut /></el-icon>
              缩小
            </el-button>
            <el-button @click="ganttScrollToToday">
              <el-icon><Calendar /></el-icon>
              今天
            </el-button>
          </el-button-group>
        </div>
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
        v-model="showItemDialog"
        :item="editingItem"
        @saved="handleItemSaved"
        @location-pick="handleLocationPick"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { usePlanStore } from '@/stores/plan'
import { useItemStore } from '@/stores/item'
import { ElMessage } from 'element-plus'
import type { TravelItem } from '@/types'

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
const ganttRef = ref()

// 计算属性
const currentPlan = computed(() => planStore.currentPlan)

// 生命周期
onMounted(async () => {
  await planStore.loadPlans()
  if (planStore.currentPlan) {
    selectedPlanId.value = planStore.currentPlan.id
    await itemStore.loadItems(planStore.currentPlan.id)
  }
})

// 监听器
watch(() => planStore.currentPlan, (newPlan) => {
  if (newPlan) {
    selectedPlanId.value = newPlan.id
  }
})

// 事件处理
const handlePlanChange = async (planId: number) => {
  await planStore.selectPlan(planId)
  await itemStore.loadItems(planId)
}

const handleViewChange = (view: string) => {
  activeView.value = view as 'map' | 'timeline' | 'gantt'
}

const handlePlanCreated = (plan: any) => {
  selectedPlanId.value = plan.id
  showCreatePlanDialog.value = false
}

const handleItemSaved = async () => {
  showItemDialog.value = false
  editingItem.value = null
  await itemStore.loadItems(planStore.currentPlanId!)
}

const handleMarkerClick = (itemId: number) => {
  itemStore.selectItem(itemId)
}

const handleMapClick = (lngLat: { lng: number; lat: number }) => {
  // TODO: 处理地图点击，可能用于位置选择
  console.log('Map clicked:', lngLat)
}

const handleItemClick = (itemId: number) => {
  itemStore.selectItem(itemId)
}

const handleItemEdit = (itemId: number) => {
  const item = itemStore.items.find(i => i.id === itemId)
  if (item) {
    editingItem.value = item
    showItemDialog.value = true
  }
}

const handleTaskClick = (task: any) => {
  if (task._item) {
    itemStore.selectItem(task._item.id)
  }
}

const handleDateChange = async (task: any, start: Date, end: Date) => {
  if (task._item) {
    try {
      await itemStore.updateItem(task._item.id, {
        id: task._item.id,
        start_datetime: start.toISOString(),
        end_datetime: end.toISOString()
      })
      ElMessage.success('时间更新成功')
    } catch (error) {
      ElMessage.error('时间更新失败')
    }
  }
}

const handleLocationPick = () => {
  // TODO: 启用地图位置选择模式
  activeView.value = 'map'
  ElMessage.info('请在地图上点击选择位置')
}

// 甘特图控制
const ganttZoomIn = () => {
  ganttRef.value?.zoomIn()
}

const ganttZoomOut = () => {
  ganttRef.value?.zoomOut()
}

const ganttScrollToToday = () => {
  ganttRef.value?.scrollToToday()
}

// 导出计划
const exportPlan = () => {
  if (!currentPlan.value || itemStore.items.length === 0) {
    ElMessage.warning('没有可导出的数据')
    return
  }

  const exportData = {
    plan: currentPlan.value,
    items: itemStore.items,
    exportTime: new Date().toISOString()
  }

  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: 'application/json'
  })

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${currentPlan.value.name}-${new Date().toISOString().split('T')[0]}.json`
  a.click()

  URL.revokeObjectURL(url)
  ElMessage.success('导出成功')
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

  .plan-selector {
    display: flex;
    align-items: center;
    gap: 12px;
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
</style>