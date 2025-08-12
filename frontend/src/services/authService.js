import { apiClient } from '../api/index.js';

export class AuthService {
    // 登录
    async login(username, password) {
        const response = await apiClient.post('/auth/login', {
            username,
            password
        });
        return response;
    }

    // 注册
    async register(username, email, password) {
        const response = await apiClient.post('/auth/register', {
            username,
            email,
            password
        });
        return response;
    }

    // 退出登录
    async logout() {
        try {
            await apiClient.post('/auth/logout');
        } catch (error) {
            // 忽略退出登录的错误
            console.log('Logout error:', error);
        }
    }

    // 获取用户资料
    async getProfile() {
        const response = await apiClient.get('/auth/profile');
        return response;
    }

    // 更新用户资料
    async updateProfile(data) {
        const response = await apiClient.put('/auth/profile', data);
        return response;
    }

    // 刷新令牌
    async refreshToken() {
        const response = await apiClient.post('/auth/refresh');
        return response;
    }

    // 检查是否已登录
    isLoggedIn() {
        return !!localStorage.getItem('token');
    }

    // 获取当前令牌
    getToken() {
        return localStorage.getItem('token');
    }

    // 设置令牌
    setToken(token) {
        localStorage.setItem('token', token);
    }

    // 清除令牌
    clearToken() {
        localStorage.removeItem('token');
    }
}