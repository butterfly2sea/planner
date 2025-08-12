import { apiClient } from '../api/index.js';

export class ItemService {
    // 获取计划中的所有元素
    async getItems(planId, params = {}) {
        const response = await apiClient.get(`/items/plan/${planId}`, params);
        return response;
    }

    // 获取单个元素详情
    async getItem(itemId) {
        const response = await apiClient.get(`/items/${itemId}`);
        return response;
    }

    // 创建元素
    async createItem(planId, itemData) {
        const response = await apiClient.post(`/items/plan/${planId}`, itemData);
        return response;
    }

    // 更新元素
    async updateItem(itemId, itemData) {
        const response = await apiClient.put(`/items/${itemId}`, itemData);
        return response;
    }

    // 删除元素
    async deleteItem(itemId) {
        const response = await apiClient.delete(`/items/${itemId}`);
        return response;
    }

    // 批量创建元素
    async batchCreateItems(items) {
        const response = await apiClient.post('/items/batch', { items });
        return response;
    }

    // 批量更新元素
    async batchUpdateItems(updates) {
        const response = await apiClient.put('/items/batch', { updates });
        return response;
    }

    // 批量删除元素
    async batchDeleteItems(itemIds) {
        const response = await apiClient.delete('/items/batch', { item_ids: itemIds });
        return response;
    }

    // 重新排序元素
    async reorderItems(planId, itemIds) {
        const response = await apiClient.put(`/items/plan/${planId}/reorder`, {
            item_ids: itemIds
        });
        return response;
    }

    // 更新元素状态
    async updateItemStatus(itemId, status) {
        const response = await apiClient.patch(`/items/${itemId}/status`, { status });
        return response;
    }

    // 获取元素关联
    async getRelations(itemId) {
        const response = await apiClient.get(`/relations/item/${itemId}`);
        return response;
    }

    // 创建元素关联
    async createRelation(relationData) {
        const response = await apiClient.post('/relations', relationData);
        return response;
    }

    // 删除元素关联
    async deleteRelation(relationId) {
        const response = await apiClient.delete(`/relations/${relationId}`);
        return response;
    }

    // 获取元素标注
    async getAnnotations(itemId) {
        const response = await apiClient.get(`/annotations/item/${itemId}`);
        return response;
    }

    // 添加元素标注
    async addAnnotation(itemId, annotationData) {
        const response = await apiClient.post(`/annotations/item/${itemId}`, annotationData);
        return response;
    }

    // 更新元素标注
    async updateAnnotation(annotationId, annotationData) {
        const response = await apiClient.put(`/annotations/${annotationId}`, annotationData);
        return response;
    }

    // 删除元素标注
    async deleteAnnotation(annotationId) {
        const response = await apiClient.delete(`/annotations/${annotationId}`);
        return response;
    }

    // 上传附件
    async uploadAttachment(itemId, file) {
        const response = await apiClient.upload(`/attachments/item/${itemId}/upload`, file);
        return response;
    }

    // 获取附件列表
    async getAttachments(itemId) {
        const response = await apiClient.get(`/attachments/item/${itemId}`);
        return response;
    }

    // 删除附件
    async deleteAttachment(attachmentId) {
        const response = await apiClient.delete(`/attachments/${attachmentId}`);
        return response;
    }

    // 获取每日行程
    async getDailyItinerary(planId) {
        const response = await apiClient.get(`/itinerary/plan/${planId}/daily`);
        return response;
    }

    // 获取时间线
    async getTimeline(planId) {
        const response = await apiClient.get(`/itinerary/plan/${planId}/timeline`);
        return response;
    }

    // 优化行程
    async optimizeItinerary(planId) {
        const response = await apiClient.post(`/itinerary/plan/${planId}/optimize`);
        return response;
    }
}