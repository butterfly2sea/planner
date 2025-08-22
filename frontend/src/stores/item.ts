import { defineStore } from 'pinia'
import { ref, computed, readonly } from 'vue'
import type { TravelItem, CreateItemRequest, UpdateItemRequest, ItemType } from '@/types'
import { itemApi } from '@/api/item'
import { usePlanStore } from './plan'
import { ElMessage } from 'element-plus'

export const useItemStore = defineStore('item', () => {
    const items = ref<TravelItem[]>([])
    const selectedItem = ref<TravelItem | null>(null)
    const filterType = ref<ItemType | 'all'>('all')
    const loading = ref(false)

    const planStore = usePlanStore()

    const filteredItems = computed(() => {
        if (filterType.value === 'all') {
            return items.value
        }
        return items.value.filter(item => item.item_type === filterType.value)
    })

    const totalCost = computed(() => {
        return filteredItems.value.reduce((sum, item) => sum + (item.cost || 0), 0)
    })

    const completedItems = computed(() => {
        return filteredItems.value.filter(item => item.status === 'completed')
    })

    const completionRate = computed(() => {
        const total = filteredItems.value.length
        return total > 0 ? Math.round(completedItems.value.length / total * 100) : 0
    })

    // 加载元素列表
    const loadItems = async (planId?: number) => {
        const targetPlanId = planId || planStore.currentPlanId
        if (!targetPlanId) return

        loading.value = true
        try {
            items.value = await itemApi.getAll(targetPlanId)
        } catch (error: any) {
            ElMessage.error(error.message || '加载元素失败')
            throw error
        } finally {
            loading.value = false
        }
    }

    // 创建元素
    const createItem = async (data: CreateItemRequest) => {
        loading.value = true
        try {
            const item = await itemApi.create(data)
            items.value.push(item)
            ElMessage.success('元素添加成功')
            return item
        } catch (error: any) {
            ElMessage.error(error.message || '添加元素失败')
            throw error
        } finally {
            loading.value = false
        }
    }

    // 更新元素
    const updateItem = async (itemId: number, data: UpdateItemRequest) => {
        loading.value = true
        try {
            const updatedItem = await itemApi.update(itemId, data)
            const index = items.value.findIndex(item => item.id === itemId)
            if (index !== -1) {
                items.value[index] = updatedItem
            }
            if (selectedItem.value?.id === itemId) {
                selectedItem.value = updatedItem
            }
            ElMessage.success('元素更新成功')
            return updatedItem
        } catch (error: any) {
            ElMessage.error(error.message || '更新元素失败')
            throw error
        } finally {
            loading.value = false
        }
    }

    // 删除元素
    const deleteItem = async (itemId: number) => {
        loading.value = true
        try {
            await itemApi.delete(itemId)
            items.value = items.value.filter(item => item.id !== itemId)
            if (selectedItem.value?.id === itemId) {
                selectedItem.value = null
            }
            ElMessage.success('元素删除成功')
        } catch (error: any) {
            ElMessage.error(error.message || '删除元素失败')
            throw error
        } finally {
            loading.value = false
        }
    }

    // 选择元素
    const selectItem = (itemId: number | null) => {
        if (itemId === null) {
            selectedItem.value = null
            return
        }

        const item = items.value.find(item => item.id === itemId)
        if (item) {
            selectedItem.value = item
        }
    }

    // 设置过滤类型
    const setFilterType = (type: ItemType | 'all') => {
        filterType.value = type
    }

    // 按日期分组
    const getItemsByDate = computed(() => {
        const grouped: Record<string, TravelItem[]> = {}

        filteredItems.value.forEach(item => {
            if (item.start_datetime) {
                const date = item.start_datetime.split('T')[0]
                if (!grouped[date]) {
                    grouped[date] = []
                }
                grouped[date].push(item)
            }
        })

        // 对每天的项目按时间排序
        Object.keys(grouped).forEach(date => {
            grouped[date].sort((a, b) =>
                new Date(a.start_datetime!).getTime() - new Date(b.start_datetime!).getTime()
            )
        })

        return grouped
    })

    return {
        items: readonly(items),
        selectedItem: readonly(selectedItem),
        filterType: readonly(filterType),
        filteredItems,
        totalCost,
        completedItems,
        completionRate,
        getItemsByDate,
        loading: readonly(loading),
        loadItems,
        createItem,
        updateItem,
        deleteItem,
        selectItem,
        setFilterType
    }
})