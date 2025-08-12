// API基础配置
const API_BASE_URL = 'http://localhost:3000/api/v1';

// API请求类
export class ApiClient {
    constructor() {
        this.baseURL = API_BASE_URL;
    }

    // 获取请求头
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };

        const token = localStorage.getItem('token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        return headers;
    }

    // 通用请求方法
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            ...options,
            headers: {
                ...this.getHeaders(),
                ...options.headers
            }
        };

        try {
            const response = await fetch(url, config);

            // 处理响应
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }

            // 如果响应包含success字段，检查是否成功
            if (data.hasOwnProperty('success') && !data.success) {
                throw new Error(data.message || '请求失败');
            }

            return data.data || data;
        } catch (error) {
            console.error('API请求失败:', error);
            throw error;
        }
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
    async delete(endpoint) {
        return this.request(endpoint, {
            method: 'DELETE'
        });
    }

    // 上传文件
    async upload(endpoint, files, data = {}) {
        const formData = new FormData();

        // 添加文件
        if (Array.isArray(files)) {
            files.forEach((file, index) => {
                formData.append(`file_${index}`, file);
            });
        } else {
            formData.append('file', files);
        }

        // 添加其他数据
        Object.keys(data).forEach(key => {
            formData.append(key, data[key]);
        });

        const headers = {};
        const token = localStorage.getItem('token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        return this.request(endpoint, {
            method: 'POST',
            headers,
            body: formData
        });
    }
}

// 创建默认实例
export const apiClient = new ApiClient();