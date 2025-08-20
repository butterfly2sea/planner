import {apiClient} from '../api/index.js';

export class PlanService {
    // 获取我的计划列表
    async getMyPlans() {
        return await apiClient.get('/plans');
    }

    // 获取计划详情
    async getPlan(planId) {
        return await apiClient.get(`/plans/${planId}`);
    }

    // 创建计划
    async createPlan(planData) {
        return await apiClient.post('/plans', planData);
    }

    // 更新计划
    async updatePlan(planId, planData) {
        return await apiClient.put(`/plans/${planId}`, planData);
    }

    // 删除计划
    async deletePlan(planId) {
        return await apiClient.delete(`/plans/${planId}`);
    }

    // 复制计划
    async duplicatePlan(planId) {
        return await apiClient.post(`/plans/${planId}/duplicate`);
    }

    // 分享计划
    async sharePlan(planId) {
        return await apiClient.post(`/plans/${planId}/share`);
    }

    // 导出计划为JSON
    async exportPlan(planId) {
        return await apiClient.get(`/io/plan/${planId}/export/json`);
    }

    // 导出计划为PDF
    async exportPlanPDF(planId) {
        return await apiClient.get(`/io/plan/${planId}/export/pdf`);
    }

    // 导入计划
    async importPlan(jsonData) {
        return await apiClient.post('/io/plan/import/json', jsonData);
    }

    // 获取计划统计
    async getPlanStatistics(planId) {
        return await apiClient.get(`/analytics/plan/${planId}/statistics`);
    }

    // 获取计划摘要
    async getPlanSummary(planId) {
        return await apiClient.get(`/analytics/plan/${planId}/summary`);
    }
}