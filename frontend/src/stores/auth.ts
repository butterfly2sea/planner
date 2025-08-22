import { defineStore } from 'pinia'
import { ref, computed, readonly } from 'vue'
import type { User, LoginRequest, RegisterRequest } from '@/types'
import { authApi } from '@/api/auth'
import { ElMessage } from 'element-plus'

export const useAuthStore = defineStore('auth', () => {
    const user = ref<User | null>(null)
    const token = ref<string | null>(null)
    const loading = ref(false)

    const isAuthenticated = computed(() => !!token.value)

    // 初始化认证状态
    const initAuth = () => {
        const savedToken = localStorage.getItem('token')
        if (savedToken) {
            token.value = savedToken
        }
    }

    // 检查认证状态
    const checkAuth = async () => {
        if (!token.value) return

        try {
            const profile = await authApi.getProfile()
            user.value = profile
        } catch (error) {
            console.error('认证检查失败:', error)
            clearAuth()
        }
    }

    // 登录
    const login = async (credentials: LoginRequest) => {
        loading.value = true
        try {
            const response = await authApi.login(credentials)
            token.value = response.token
            user.value = response.user

            localStorage.setItem('token', response.token)
            ElMessage.success('登录成功')

            return response
        } catch (error: any) {
            ElMessage.error(error.message || '登录失败')
            throw error
        } finally {
            loading.value = false
        }
    }

    // 注册
    const register = async (data: RegisterRequest) => {
        loading.value = true
        try {
            await authApi.register(data)
            ElMessage.success('注册成功，请登录')
        } catch (error: any) {
            ElMessage.error(error.message || '注册失败')
            throw error
        } finally {
            loading.value = false
        }
    }

    // 退出登录
    const logout = async () => {
        try {
            if (token.value) {
                await authApi.logout()
            }
        } catch (error) {
            console.error('退出登录失败:', error)
        } finally {
            clearAuth()
            ElMessage.success('已退出登录')
        }
    }

    // 清除认证信息
    const clearAuth = () => {
        user.value = null
        token.value = null
        localStorage.removeItem('token')
    }

    // 初始化
    initAuth()

    return {
        user: readonly(user),
        token: readonly(token),
        loading: readonly(loading),
        isAuthenticated,
        login,
        register,
        logout,
        checkAuth,
        clearAuth
    }
})