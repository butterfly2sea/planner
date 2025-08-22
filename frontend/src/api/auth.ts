import http from './http'
import type { User, LoginRequest, RegisterRequest, AuthResponse } from '@/types'

export const authApi = {
    // 登录
    login: (data: LoginRequest): Promise<AuthResponse> => {
        return http.post('/auth/login', data)
    },

    // 注册
    register: (data: RegisterRequest): Promise<void> => {
        return http.post('/auth/register', data)
    },

    // 获取用户信息
    getProfile: (): Promise<User> => {
        return http.get('/auth/profile')
    },

    // 退出登录
    logout: (): Promise<void> => {
        return http.post('/auth/logout')
    },

    // 刷新token
    refreshToken: (): Promise<{ token: string }> => {
        return http.post('/auth/refresh')
    }
}
