// API基础配置
const API_BASE_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3000/api/v1'
    : '/api/v1';

// API请求类
export class ApiClient {
    constructor() {
        this.baseURL = API_BASE_URL;
        this.defaultTimeout = 30000; // 30秒超时
    }

    // 获取请求头
    getHeaders(isFormData = false) {
        const headers = {};

        // 如果不是FormData，设置Content-Type
        if (!isFormData) {
            headers['Content-Type'] = 'application/json';
        }

        // 添加认证token
        const token = localStorage.getItem('token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        // 添加请求ID用于追踪
        headers['X-Request-ID'] = this.generateRequestId();

        return headers;
    }

    // 生成请求ID
    generateRequestId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    // 通用请求方法
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;

        // 设置超时
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), options.timeout || this.defaultTimeout);

        const config = {
            ...options,
            headers: {
                ...this.getHeaders(options.body instanceof FormData),
                ...options.headers
            },
            signal: controller.signal
        };

        try {
            const response = await fetch(url, config);
            clearTimeout(timeoutId);

            // 处理空响应
            if (response.status === 204) {
                return null;
            }

            // 尝试解析JSON响应
            let data;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                // 如果不是JSON，返回文本
                data = await response.text();
            }

            // 处理错误响应
            if (!response.ok) {
                const error = new Error(
                    data.message ||
                    `HTTP error! status: ${response.status}`
                );
                error.status = response.status;
                error.response = data;
                throw error;
            }

            // 检查响应中的success字段
            if (typeof data === 'object' && data.hasOwnProperty('success') && !data.success) {
                const error = new Error(data.message || '请求失败');
                error.response = data;
                throw error;
            }

            // 检查是否需要刷新token
            const refreshRequired = response.headers.get('X-Token-Refresh-Required');
            if (refreshRequired === 'true') {
                this.scheduleTokenRefresh();
            }

            return data.data || data;
        } catch (error) {
            // 处理超时错误
            if (error.name === 'AbortError') {
                const timeoutError = new Error('请求超时');
                timeoutError.status = 408;
                throw timeoutError;
            }

            // 处理网络错误
            if (!error.status) {
                error.status = 0;
                error.message = error.message || '网络连接失败';
            }

            console.error('API请求失败:', error);
            throw error;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    // 调度token刷新
    scheduleTokenRefresh() {
        // 避免重复调度
        if (this.refreshTimer) {
            return;
        }

        // 在2分钟后刷新token
        this.refreshTimer = setTimeout(async () => {
            try {
                const response = await this.post('/auth/refresh');
                if (response.token) {
                    localStorage.setItem('token', response.token);
                }
            } catch (error) {
                console.error('Token刷新失败:', error);
                // 可以在这里触发重新登录
            } finally {
                this.refreshTimer = null;
            }
        }, 2 * 60 * 1000);
    }

    // GET请求
    async get(endpoint, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;

        return this.request(url, {
            method: 'GET'
        });
    }

    // POST请求
    async post(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // PUT请求
    async put(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    // PATCH请求
    async patch(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
    }

    // DELETE请求
    async delete(endpoint, data = null) {
        const options = {
            method: 'DELETE'
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        return this.request(endpoint, options);
    }

    // 上传文件
    async upload(endpoint, files, data = {}, onProgress = null) {
        const formData = new FormData();

        // 添加文件
        if (Array.isArray(files)) {
            files.forEach((file, index) => {
                formData.append(`file_${index}`, file);
            });
        } else if (files instanceof FileList) {
            Array.from(files).forEach((file, index) => {
                formData.append(`file_${index}`, file);
            });
        } else {
            formData.append('file', files);
        }

        // 添加其他数据
        Object.keys(data).forEach(key => {
            const value = data[key];
            if (value !== null && value !== undefined) {
                if (typeof value === 'object' && !(value instanceof File)) {
                    formData.append(key, JSON.stringify(value));
                } else {
                    formData.append(key, value);
                }
            }
        });

        // 如果支持进度回调，使用XMLHttpRequest
        if (onProgress && typeof onProgress === 'function') {
            return this.uploadWithProgress(endpoint, formData, onProgress);
        }

        return this.request(endpoint, {
            method: 'POST',
            body: formData
        });
    }

    // 带进度的上传
    uploadWithProgress(endpoint, formData, onProgress) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            const url = `${this.baseURL}${endpoint}`;

            // 监听上传进度
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percentComplete = (e.loaded / e.total) * 100;
                    onProgress(percentComplete, e.loaded, e.total);
                }
            });

            // 监听请求完成
            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        resolve(response.data || response);
                    } catch (e) {
                        resolve(xhr.responseText);
                    }
                } else {
                    reject(new Error(`上传失败: ${xhr.status}`));
                }
            });

            // 监听请求错误
            xhr.addEventListener('error', () => {
                reject(new Error('上传失败'));
            });

            // 监听请求中止
            xhr.addEventListener('abort', () => {
                reject(new Error('上传已取消'));
            });

            // 设置请求头
            const token = localStorage.getItem('token');
            if (token) {
                xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            }

            // 发送请求
            xhr.open('POST', url);
            xhr.send(formData);
        });
    }

    // 批量请求
    async batch(requests) {
        return Promise.all(requests.map(req => {
            const { method, endpoint, data, params } = req;
            switch (method.toUpperCase()) {
                case 'GET':
                    return this.get(endpoint, params);
                case 'POST':
                    return this.post(endpoint, data);
                case 'PUT':
                    return this.put(endpoint, data);
                case 'PATCH':
                    return this.patch(endpoint, data);
                case 'DELETE':
                    return this.delete(endpoint, data);
                default:
                    return Promise.reject(new Error(`不支持的方法: ${method}`));
            }
        }));
    }

    // 设置默认错误处理器
    setErrorHandler(handler) {
        this.errorHandler = handler;
    }

    // 清理资源
    cleanup() {
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
            this.refreshTimer = null;
        }
    }
}

// 创建默认实例
export const apiClient = new ApiClient();

// 导出便捷方法
export const api = {
    get: (endpoint, params) => apiClient.get(endpoint, params),
    post: (endpoint, data) => apiClient.post(endpoint, data),
    put: (endpoint, data) => apiClient.put(endpoint, data),
    patch: (endpoint, data) => apiClient.patch(endpoint, data),
    delete: (endpoint, data) => apiClient.delete(endpoint, data),
    upload: (endpoint, files, data, onProgress) => apiClient.upload(endpoint, files, data, onProgress)
};

// 在页面卸载时清理
window.addEventListener('beforeunload', () => {
    apiClient.cleanup();
});