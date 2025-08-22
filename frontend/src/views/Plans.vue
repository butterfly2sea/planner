<template>
  <div class="plans-container">
    <div class="plans-header">
      <h1>我的计划</h1>
      <el-button type="primary" @click="showCreateDialog = true">
        <el-icon><Plus /></el-icon>
        新建计划
      </el-button>
    </div>

    <div class="plans-content">
      <div v-if="planStore.loading" class="loading-state">
        <el-skeleton :rows="3" animated />
      </div>

      <div v-else-if="planStore.plans.length === 0" class="empty-state">
        <el-empty description="还没有任何计划">
          <el-button type="primary" @click="showCreateDialog = true">
            创建第一个计划
          </el-button>
        </el-empty>
      </div>

      <div v-else class="plans-grid">
        <div
            v-for="plan in planStore.plans"
            :key="plan.id"
            class="plan-card"
            :class="{ active: plan.id === planStore.currentPlan?.id }"
            @click="selectPlan(plan)"
        >
          <div class="plan-card-header">
            <h3>{{ plan.name }}</h3>
            <el-dropdown @command="(cmd: string) => handlePlanAction(cmd, plan)">
              <el-button type="text" size="small">
                <el-icon><MoreFilled /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="edit">编辑</el-dropdown-item>
                  <el-dropdown-item command="duplicate">复制</el-dropdown-item>
                  <el-dropdown-item command="export">导出</el-dropdown-item>
                  <el-dropdown-item command="delete" divided>删除</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>

          <div class="plan-card-body">
            <p v-if="plan.description" class="plan-description">
              {{ plan.description }}
            </p>
            <p v-else class="plan-description placeholder">
              暂无描述
            </p>

            <div class="plan-stats">
              <div class="stat-item">
                <span class="stat-label">创建时间</span>
                <span class="stat-value">{{ formatDate(plan.created_at) }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">最后修改</span>
                <span class="stat-value">{{ formatDate(plan.updated_at) }}</span>
              </div>
            </div>
          </div>

          <div class="plan-card-footer">
            <el-tag v-if="plan.id === planStore.currentPlan?.id" type="success" size="small">
              当前计划
            </el-tag>
            <el-button
                type="primary"
                size="small"
                @click.stop="goToPlanner(plan)"
            >
              开始规划
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 创建计划对话框 -->
    <CreatePlanDialog
        v-model="showCreateDialog"
        @created="handlePlanCreated"
    />

    <!-- 编辑计划对话框 -->
    <EditPlanDialog
        v-model="showEditDialog"
        :plan="editingPlan"
        @updated="handlePlanUpdated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePlanStore } from '@/stores/plan'
import { ElMessageBox } from 'element-plus'
import dayjs from 'dayjs'
import type { Plan } from '@/types'

import CreatePlanDialog from '@/components/CreatePlanDialog.vue'
import EditPlanDialog from '@/components/EditPlanDialog.vue'

const router = useRouter()
const planStore = usePlanStore()

const showCreateDialog = ref(false)
const showEditDialog = ref(false)
const editingPlan = ref<Plan | null>(null)

onMounted(() => {
  planStore.loadPlans()
})

const formatDate = (dateStr: string) => {
  return dayjs(dateStr).format('YYYY-MM-DD HH:mm')
}

const selectPlan = (plan: Plan) => {
  planStore.selectPlan(plan.id)
}

const goToPlanner = (plan: Plan) => {
  planStore.selectPlan(plan.id)
  router.push('/planner')
}

const handlePlanAction = async (command: string, plan: Plan) => {
  switch (command) {
    case 'edit':
      editingPlan.value = plan
      showEditDialog.value = true
      break
    case 'duplicate':
      // TODO: 实现计划复制功能
      break
    case 'export':
      // TODO: 实现计划导出功能
      break
    case 'delete':
      await handleDeletePlan(plan)
      break
  }
}

const handleDeletePlan = async (plan: Plan) => {
  try {
    await ElMessageBox.confirm(
        `确定要删除计划"${plan.name}"吗？此操作不可恢复。`,
        '确认删除',
        {
          confirmButtonText: '删除',
          cancelButtonText: '取消',
          type: 'warning'
        }
    )

    await planStore.deletePlan(plan.id)
  } catch (error) {
    // 用户取消或删除失败
  }
}

const handlePlanCreated = () => {
  showCreateDialog.value = false
}

const handlePlanUpdated = () => {
  showEditDialog.value = false
  editingPlan.value = null
}
</script>

<style lang="scss" scoped>
.plans-container {
  padding: 24px;
  background: #f5f5f5;
  min-height: 100vh;
}

.plans-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;

  h1 {
    margin: 0;
    font-size: 24px;
    font-weight: 600;
    color: #2c3e50;
  }
}

.loading-state {
  padding: 40px;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

.plans-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.plan-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.3s;
  border: 2px solid transparent;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  }

  &.active {
    border-color: #409eff;
  }
}

.plan-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;

  h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #2c3e50;
    flex: 1;
    margin-right: 12px;
  }
}

.plan-card-body {
  margin-bottom: 16px;

  .plan-description {
    margin: 0 0 16px 0;
    color: #7f8c8d;
    font-size: 14px;
    line-height: 1.5;

    &.placeholder {
      font-style: italic;
      opacity: 0.6;
    }
  }

  .plan-stats {
    display: flex;
    flex-direction: column;
    gap: 4px;

    .stat-item {
      display: flex;
      justify-content: space-between;
      font-size: 12px;

      .stat-label {
        color: #95a5a6;
      }

      .stat-value {
        color: #7f8c8d;
      }
    }
  }
}

.plan-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>