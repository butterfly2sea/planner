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

    // 修复: 确保返回值始终是数组
    const filteredItems = computed(() => {
        // 防御性编程：确保 items.value 是数组
        if (!Array.isArray(items.value)) {
            console.warn('Items is not an array:', items.value)
            return []
        }

        if (filterType.value === 'all') {
            return items.value
        }
        return items.value.filter(item => item.item_type === filterType.value)
    })

    // 修复: 添加数组检查，防止reduce报错
    const totalCost = computed(() => {
        const itemsArray = filteredItems.value
        if (!Array.isArray(itemsArray) || itemsArray.length === 0) {
            return 0
        }
        return itemsArray.reduce((sum, item) => {
            const cost = typeof item.cost === 'number' ? item.cost : 0
            return sum + cost
        }, 0)
    })

    // 修复: 同样添加数组检查
    const completedItems = computed(() => {
        const itemsArray = filteredItems.value
        if (!Array.isArray(itemsArray)) {
            return []
        }
        return itemsArray.filter(item => item.status === 'completed')
    })

    const completionRate = computed(() => {
        const total = filteredItems.value.length
        const completed = completedItems.value.length
        return total > 0 ? Math.round(completed / total * 100) : 0
    })

    // 加载元素列表 - 增加错误处理和初始化
    const loadItems = async (planId?: number) => {
        const targetPlanId = planId || planStore.currentPlanId
        if (!targetPlanId) {
            console.warn('No plan ID provided for loading items')
            items.value = [] // 确保设置为空数组
            return
        }

        loading.value = true
        try {
            const result = await itemApi.getAll(targetPlanId)
            // 确保API返回的是数组
            if (Array.isArray(result.items)) {
                items.value = result.items
            } else {
                console.warn('API did not return an array:', result.items)
                items.value = []
            }
        } catch (error: any) {
            console.error('Failed to load items:', error)
            items.value = [] // 错误时也设置为空数组
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
            // 确保 items 是数组后再添加
            if (!Array.isArray(items.value)) {
                items.value = []
            }
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

            // 确保 items 是数组
            if (Array.isArray(items.value)) {
                const index = items.value.findIndex(item => item.id === itemId)
                if (index !== -1) {
                    items.value[index] = updatedItem
                }
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

            // 确保 items 是数组
            if (Array.isArray(items.value)) {
                items.value = items.value.filter(item => item.id !== itemId)
            }

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

        if (Array.isArray(items.value)) {
            const item = items.value.find(item => item.id === itemId)
            if (item) {
                selectedItem.value = item
            } else {
                console.warn('Item not found:', itemId)
            }
        }
    }

    // 设置过滤类型
    const setFilterType = (type: ItemType | 'all') => {
        filterType.value = type
    }

    // 按日期分组
    const getItemsByDate = computed(() => {
        const grouped: Record<string, TravelItem[]> = {}
        const itemsArray = filteredItems.value

        if (!Array.isArray(itemsArray)) {
            return grouped
        }

        itemsArray.forEach(item => {
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
            grouped[date].sort((a, b) => {
                if (!a.start_datetime || !b.start_datetime) return 0
                return new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime()
            })
        })

        return grouped
    })

    // 初始化方法 - 确保数据结构正确
    const initialize = () => {
        if (!Array.isArray(items.value)) {
            items.value = []
        }
        selectedItem.value = null
        filterType.value = 'all'
        loading.value = false
    }

    // 在store创建时初始化
    initialize()

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
        setFilterType,
        initialize
    }
})