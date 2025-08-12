import { apiClient } from '../api/index.js';

export class PlanService {
    // 获取我的计划列表
    async getMyPlans() {
        const response = await apiClient.get('/plans');
        return response;
    }

    // 获取计划详情
    async getPlan(planId) {
        const response = await apiClient.get(`/plans/${planId}`);
        return response;
    }

    // 创建计划
    async createPlan(planData) {
        const response = await apiClient.post('/plans', planData);
        return response;
    }

    // 更新计划
    async updatePlan(planId, planData) {
        const response = await apiClient.put(`/plans/${planId}`, planData);
        return response;
    }

    // 删除计划
    async deletePlan(planId) {
        const response = await apiClient.delete(`/plans/${planId}`);
        return response;
    }

    // 复制计划
    async duplicatePlan(planId) {
        const response = await apiClient.post(`/plans/${planId}/duplicate`);
        return response;
    }

    // 分享计划
    async sharePlan(planId) {
        const response = await apiClient.post(`/plans/${planId}/share`);
        return response;
    }

    // 导出计划为JSON
    async exportPlan(planId) {
        const response = await apiClient.get(`/io/plan/${planId}/export/json`);
        return response;
    }

    // 导出计划为PDF
    async exportPlanPDF(planId) {
        const response = await apiClient.get(`/io/plan/${planId}/export/pdf`);
        return response;
    }

    // 导入计划
    async importPlan(jsonData) {
        const response = await apiClient.post('/io/plan/import/json', jsonData);
        return response;
    }

    // 获取计划统计
    async getPlanStatistics(planId) {
        const response = await apiClient.get(`/analytics/plan/${planId}/statistics`);
        return response;
    }

    // 获取计划摘要
    async getPlanSummary(planId) {
        const response = await apiClient.get(`/analytics/plan/${planId}/summary`);
        return response;
    }
}