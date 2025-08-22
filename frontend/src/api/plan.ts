import http from './http'
import type { Plan, CreatePlanRequest } from '@/types'

export const planApi = {
    // 获取所有计划
    getAll: (): Promise<Plan[]> => {
        return http.get('/plans')
    },

    // 根据ID获取计划
    getById: (id: number): Promise<Plan> => {
        return http.get(`/plans/${id}`)
    },

    // 创建计划
    create: (data: CreatePlanRequest): Promise<Plan> => {
        return http.post('/plans', data)
    },

    // 更新计划
    update: (id: number, data: Partial<Plan>): Promise<Plan> => {
        return http.put(`/plans/${id}`, data)
    },

    // 删除计划
    delete: (id: number): Promise<void> => {
        return http.delete(`/plans/${id}`)
    }
}