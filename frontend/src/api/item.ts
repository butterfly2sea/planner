import http from './http'
import {CreateItemRequest, TravelItem, TravelItemResponse, UpdateItemRequest} from '@/types'

export const itemApi = {
    // 获取计划下的所有元素
    getAll: (planId: number): Promise<TravelItemResponse> => {
        return http.get(`/items/plan/${planId}`)
    },

    // 根据ID获取元素
    getById: (id: number): Promise<TravelItem> => {
        return http.get(`/items/${id}`)
    },

    // 创建元素
    create: (data: CreateItemRequest): Promise<TravelItem> => {
        const {plan_id, ...itemData} = data
        return http.post(`/items/plan/${plan_id}`, itemData)
    },

    // 更新元素
    update: (id: number, data: UpdateItemRequest): Promise<TravelItem> => {
        const {id: itemId, ...updateData} = data
        return http.put(`/items/${id}`, updateData)
    },

    // 删除元素
    delete: (id: number): Promise<void> => {
        return http.delete(`/items/${id}`)
    },

    // 重新排序元素
    reorderItems: (planId: number, itemIds: number[]): Promise<void> => {
        return http.put(`/items/plan/${planId}/reorder`, {
            item_ids: itemIds
        })
    },

    // 更新元素状态
    updateStatus: (id: number, status: string): Promise<TravelItem> => {
        return http.patch(`/items/${id}/status`, {status})
    },

    // 上传图片
    uploadImage: (file: File): Promise<{ url: string }> => {
        const formData = new FormData()
        formData.append('image', file)
        return http.post('/upload/image', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        })
    },

    // 上传GeoJSON
    uploadGeoJSON: (file: File): Promise<{ data: any }> => {
        const formData = new FormData()
        formData.append('geojson', file)
        return http.post('/upload/geojson', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        })
    }
}