import http from './http'
import type { ItemRelation, RelationType } from '@/types'

export const relationApi = {
    // 获取元素的所有关联
    getByItemId: (itemId: number): Promise<ItemRelation[]> => {
        return http.get(`/items/${itemId}/relations`)
    },

    // 创建关联
    create: (data: {
        source_item_id: number
        target_item_id: number
        relation_type: RelationType
    }): Promise<ItemRelation> => {
        return http.post('/relations', data)
    },

    // 删除关联
    delete: (id: number): Promise<void> => {
        return http.delete(`/relations/${id}`)
    },

    // 获取计划下的所有关联
    getByPlanId: (planId: number): Promise<ItemRelation[]> => {
        return http.get(`/plans/${planId}/relations`)
    }
}