import { ElMessage, ElNotification } from 'element-plus'

export type ToastType = 'success' | 'warning' | 'info' | 'error'

export const showToast = (message: string, type: ToastType = 'info', duration = 3000) => {
    ElMessage({
        message,
        type,
        duration,
        showClose: true
    })
}

export const showNotification = (
    title: string,
    message: string,
    type: ToastType = 'info',
    duration = 4500
) => {
    ElNotification({
        title,
        message,
        type,
        duration,
        showClose: true
    })
}

export const showPersistentNotification = (
    title: string,
    message: string,
    type: ToastType = 'info'
) => {
    ElNotification({
        title,
        message,
        type,
        duration: 0,
        showClose: true
    })
}