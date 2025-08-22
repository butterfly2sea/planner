import http from './http'
import type { TravelItem, CreateItemRequest, UpdateItemRequest } from '@/types'

export const itemApi = {
    // 获取计划下的所有元素
    getAll: (planId: number): Promise<TravelItem[]> => {
        return http.get(`/plans/${planId}/items`)
    },

    // 根据ID获取元素
    getById: (id: number): Promise<TravelItem> => {
        return http.get(`/items/${id}`)
    },

    // 创建元素
    create: (data: CreateItemRequest): Promise<TravelItem> => {
        return http.post('/items', data)
    },

    // 更新元素
    update: (id: number, data: UpdateItemRequest): Promise<TravelItem> => {
        return http.put(`/items/${id}`, data)
    },

    // 删除元素
    delete: (id: number): Promise<void> => {
        return http.delete(`/items/${id}`)
    },

    // 批量更新元素
    batchUpdate: (items: UpdateItemRequest[]): Promise<TravelItem[]> => {
        return http.put('/items/batch', { items })
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