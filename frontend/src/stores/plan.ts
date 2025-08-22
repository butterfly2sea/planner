import { defineStore } from 'pinia'
import { ref, computed, readonly } from 'vue'
import type { Plan, CreatePlanRequest } from '@/types'
import { planApi } from '@/api/plan'
import { ElMessage } from 'element-plus'

export const usePlanStore = defineStore('plan', () => {
    const plans = ref<Plan[]>([])
    const currentPlan = ref<Plan | null>(null)
    const loading = ref(false)

    const currentPlanId = computed(() => currentPlan.value?.id)

    // 加载所有计划
    const loadPlans = async () => {
        loading.value = true
        try {
            plans.value = await planApi.getAll()

            // 如果只有一个计划，自动选择
            if (plans.value.length === 1 && !currentPlan.value) {
                currentPlan.value = plans.value[0]
            }
        } catch (error: any) {
            ElMessage.error(error.message || '加载计划失败')
            throw error
        } finally {
            loading.value = false
        }
    }

    // 创建计划
    const createPlan = async (data: CreatePlanRequest) => {
        loading.value = true
        try {
            const plan = await planApi.create(data)
            plans.value.push(plan)
            currentPlan.value = plan
            ElMessage.success('计划创建成功')
            return plan
        } catch (error: any) {
            ElMessage.error(error.message || '创建计划失败')
            throw error
        } finally {
            loading.value = false
        }
    }

    // 选择计划
    const selectPlan = async (planId: number) => {
        const plan = plans.value.find(p => p.id === planId)
        if (plan) {
            currentPlan.value = plan
            ElMessage.success(`已切换到计划: ${plan.name}`)
        } else {
            // 如果本地没有，从API获取
            try {
                const fetchedPlan = await planApi.getById(planId)
                currentPlan.value = fetchedPlan
                ElMessage.success(`已切换到计划: ${fetchedPlan.name}`)
            } catch (error: any) {
                ElMessage.error(error.message || '加载计划失败')
                throw error
            }
        }
    }

    // 更新计划
    const updatePlan = async (planId: number, data: Partial<Plan>) => {
        loading.value = true
        try {
            const updatedPlan = await planApi.update(planId, data)
            const index = plans.value.findIndex(p => p.id === planId)
            if (index !== -1) {
                plans.value[index] = updatedPlan
            }
            if (currentPlan.value?.id === planId) {
                currentPlan.value = updatedPlan
            }
            ElMessage.success('计划更新成功')
            return updatedPlan
        } catch (error: any) {
            ElMessage.error(error.message || '更新计划失败')
            throw error
        } finally {
            loading.value = false
        }
    }

    // 删除计划
    const deletePlan = async (planId: number) => {
        loading.value = true
        try {
            await planApi.delete(planId)
            plans.value = plans.value.filter(p => p.id !== planId)
            if (currentPlan.value?.id === planId) {
                currentPlan.value = plans.value[0] || null
            }
            ElMessage.success('计划删除成功')
        } catch (error: any) {
            ElMessage.error(error.message || '删除计划失败')
            throw error
        } finally {
            loading.value = false
        }
    }

    return {
        plans: readonly(plans),
        currentPlan: readonly(currentPlan),
        currentPlanId,
        loading: readonly(loading),
        loadPlans,
        createPlan,
        selectPlan,
        updatePlan,
        deletePlan
    }
})