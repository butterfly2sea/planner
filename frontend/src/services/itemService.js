import {apiClient} from '../api/index.js';

export class ItemService {
    // 获取计划中的所有元素
    async getItems(planId, params = {}) {
        return await apiClient.get(`/items/plan/${planId}`, params);
    }

    // 获取单个元素详情
    async getItem(itemId) {
        return await apiClient.get(`/items/${itemId}`);
    }

    // 创建元素
    async createItem(planId, itemData) {
        return await apiClient.post(`/items/plan/${planId}`, itemData);
    }

    // 更新元素
    async updateItem(itemId, itemData) {
        return await apiClient.put(`/items/${itemId}`, itemData);
    }

    // 删除元素
    async deleteItem(itemId) {
        return await apiClient.delete(`/items/${itemId}`);
    }

    // 批量创建元素
    async batchCreateItems(items) {
        return await apiClient.post('/items/batch', {items});
    }

    // 批量更新元素
    async batchUpdateItems(updates) {
        return await apiClient.put('/items/batch', {updates});
    }

    // 批量删除元素
    async batchDeleteItems(itemIds) {
        return await apiClient.delete('/items/batch', {item_ids: itemIds});
    }

    // 重新排序元素
    async reorderItems(planId, itemIds) {
        return await apiClient.put(`/items/plan/${planId}/reorder`, {
            item_ids: itemIds
        });
    }

    // 更新元素状态
    async updateItemStatus(itemId, status) {
        return await apiClient.patch(`/items/${itemId}/status`, {status});
    }

    // 获取元素关联
    async getRelations(itemId) {
        return await apiClient.get(`/relations/item/${itemId}`);
    }

    // 创建元素关联
    async createRelation(relationData) {
        return await apiClient.post('/relations', relationData);
    }

    // 删除元素关联
    async deleteRelation(relationId) {
        return await apiClient.delete(`/relations/${relationId}`);
    }

    // 获取元素标注
    async getAnnotations(itemId) {
        return await apiClient.get(`/annotations/item/${itemId}`);
    }

    // 添加元素标注
    async addAnnotation(itemId, annotationData) {
        return await apiClient.post(`/annotations/item/${itemId}`, annotationData);
    }

    // 更新元素标注
    async updateAnnotation(annotationId, annotationData) {
        return await apiClient.put(`/annotations/${annotationId}`, annotationData);
    }

    // 删除元素标注
    async deleteAnnotation(annotationId) {
        return await apiClient.delete(`/annotations/${annotationId}`);
    }

    // 上传附件
    async uploadAttachment(itemId, file) {
        return await apiClient.upload(`/attachments/item/${itemId}/upload`, file);
    }

    // 获取附件列表
    async getAttachments(itemId) {
        return await apiClient.get(`/attachments/item/${itemId}`);
    }

    // 删除附件
    async deleteAttachment(attachmentId) {
        return await apiClient.delete(`/attachments/${attachmentId}`);
    }

    // 获取每日行程
    async getDailyItinerary(planId) {
        return await apiClient.get(`/itinerary/plan/${planId}/daily`);
    }

    // 获取时间线
    async getTimeline(planId) {
        return await apiClient.get(`/itinerary/plan/${planId}/timeline`);
    }

    // 优化行程
    async optimizeItinerary(planId) {
        return await apiClient.post(`/itinerary/plan/${planId}/optimize`);
    }
}