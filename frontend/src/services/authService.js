import {apiClient} from '../api/index.js';

export class AuthService {
    // 登录
    async login(username, password) {
        return await apiClient.post('/auth/login', {
            username,
            password
        });
    }

    // 注册
    async register(username, email, password) {
        return await apiClient.post('/auth/register', {
            username,
            email,
            password
        });
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
        return await apiClient.get('/auth/profile');
    }

    // 更新用户资料
    async updateProfile(data) {
        return await apiClient.put('/auth/profile', data);
    }

    // 刷新令牌
    async refreshToken() {
        return await apiClient.post('/auth/refresh');
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