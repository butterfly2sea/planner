import axios, { type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { ElMessage } from 'element-plus'
import type { ApiResponse } from '@/types'

// 创建axios实例
const http = axios.create({
    baseURL: '/api/v1',
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json'
    }
})

// 请求拦截器
http.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        // 添加认证token
        const token = localStorage.getItem('token')
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    (error) => {
        return Promise.reject(error)
    }
)

// 响应拦截器
http.interceptors.response.use(
    (response: AxiosResponse<ApiResponse<any>>) => {
        return response.data.data
    },
    (error) => {
        if (error.response) {
            const { status, data } = error.response

            switch (status) {
                case 401:
                    // 未授权，清除token并跳转到登录页
                    localStorage.removeItem('token')
                    window.location.href = '/login'
                    ElMessage.error('登录已过期，请重新登录')
                    break
                case 403:
                    ElMessage.error('权限不足')
                    break
                case 404:
                    ElMessage.error('请求的资源不存在')
                    break
                case 500:
                    ElMessage.error('服务器内部错误')
                    break
                default:
                    ElMessage.error(data?.message || '请求失败')
            }
        } else if (error.request) {
            ElMessage.error('网络连接失败')
        } else {
            ElMessage.error('请求配置错误')
        }

        return Promise.reject(error)
    }
)

export default http