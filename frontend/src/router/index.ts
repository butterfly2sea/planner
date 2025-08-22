import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
    {
        path: '/login',
        name: 'Login',
        component: () => import('@/views/Login.vue'),
        meta: { requiresAuth: false }
    },
    {
        path: '/register',
        name: 'Register',
        component: () => import('@/views/Register.vue'),
        meta: { requiresAuth: false }
    },
    {
        path: '/',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: { requiresAuth: true },
        children: [
            {
                path: '',
                redirect: '/planner'
            },
            {
                path: '/planner',
                name: 'Planner',
                component: () => import('@/views/Planner.vue')
            },
            {
                path: '/plans',
                name: 'Plans',
                component: () => import('@/views/Plans.vue')
            },
            {
                path: '/settings',
                name: 'Settings',
                component: () => import('@/views/Settings.vue')
            }
        ]
    },
    {
        path: '/:pathMatch(.*)*',
        name: 'NotFound',
        component: () => import('@/views/NotFound.vue')
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

// 全局路由守卫
router.beforeEach((to, _from, next) => {
    const authStore = useAuthStore()

    // 检查是否需要认证
    if (to.meta.requiresAuth && !authStore.isAuthenticated) {
        next('/login')
    } else if ((to.name === 'Login' || to.name === 'Register') && authStore.isAuthenticated) {
        next('/')
    } else {
        next()
    }
})

export default router