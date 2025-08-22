import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'
import type { TravelItem, TypeConfig } from '@/types'

// 配置dayjs插件
dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

/**
 * 格式化日期
 */
export const formatDate = (date: string | Date, format = 'YYYY-MM-DD') => {
    return dayjs(date).format(format)
}

/**
 * 格式化日期时间
 */
export const formatDateTime = (date: string | Date, format = 'YYYY-MM-DD HH:mm') => {
    return dayjs(date).format(format)
}

/**
 * 格式化时间
 */
export const formatTime = (date: string | Date, format = 'HH:mm') => {
    return dayjs(date).format(format)
}

/**
 * 获取相对时间
 */
export const formatRelativeTime = (date: string | Date) => {
    return dayjs(date).fromNow()
}

/**
 * 判断是否为今天
 */
export const isToday = (date: string | Date) => {
    return dayjs(date).isSame(dayjs(), 'day')
}

/**
 * 判断是否为明天
 */
export const isTomorrow = (date: string | Date) => {
    return dayjs(date).isSame(dayjs().add(1, 'day'), 'day')
}

/**
 * 判断是否为昨天
 */
export const isYesterday = (date: string | Date) => {
    return dayjs(date).isSame(dayjs().subtract(1, 'day'), 'day')
}

/**
 * 获取类型配置
 */
export const getTypeConfig = (itemType: string): TypeConfig => {
    const configs: Record<string, TypeConfig> = {
        accommodation: { name: '住宿', icon: 'fa-bed', color: '#805ad5' },
        transport: { name: '交通', icon: 'fa-plane', color: '#3182ce' },
        attraction: { name: '景点', icon: 'fa-mountain', color: '#48bb78' },
        photo_spot: { name: '拍照点', icon: 'fa-camera', color: '#ed8936' },
        rest_area: { name: '休息点', icon: 'fa-coffee', color: '#38b2ac' },
        checkpoint: { name: '检查站', icon: 'fa-shield-alt', color: '#e53e3e' },
        other: { name: '其他', icon: 'fa-ellipsis-h', color: '#718096' }
    }

    return configs[itemType] || configs.other
}

/**
 * 计算两个日期间的持续时间（小时）
 */
export const calculateDuration = (start: string | Date, end: string | Date): number => {
    const startDate = dayjs(start)
    const endDate = dayjs(end)
    return endDate.diff(startDate, 'hour', true)
}

/**
 * 计算总费用
 */
export const calculateTotalCost = (items: TravelItem[]): number => {
    return items.reduce((total, item) => total + (item.cost || 0), 0)
}

/**
 * 按日期分组旅游元素
 */
export const groupItemsByDate = (items: TravelItem[]) => {
    const grouped: Record<string, TravelItem[]> = {}

    items.forEach(item => {
        if (item.start_datetime) {
            const date = dayjs(item.start_datetime).format('YYYY-MM-DD')
            if (!grouped[date]) {
                grouped[date] = []
            }
            grouped[date].push(item)
        }
    })

    // 对每天的项目按时间排序
    Object.keys(grouped).forEach(date => {
        grouped[date].sort((a, b) =>
            dayjs(a.start_datetime!).valueOf() - dayjs(b.start_datetime!).valueOf()
        )
    })

    return grouped
}

/**
 * 防抖函数
 */
export const debounce = <T extends (...args: any[]) => any>(
    func: T,
    wait: number
): ((...args: Parameters<T>) => void) => {
    let timeout: NodeJS.Timeout | null = null

    return (...args: Parameters<T>) => {
        if (timeout) {
            clearTimeout(timeout)
        }

        timeout = setTimeout(() => {
            func(...args)
        }, wait)
    }
}

/**
 * 节流函数
 */
export const throttle = <T extends (...args: any[]) => any>(
    func: T,
    wait: number
): ((...args: Parameters<T>) => void) => {
    let lastTime = 0

    return (...args: Parameters<T>) => {
        const now = Date.now()

        if (now - lastTime >= wait) {
            func(...args)
            lastTime = now
        }
    }
}

/**
 * 深拷贝
 */
export const deepClone = <T>(obj: T): T => {
    if (obj === null || typeof obj !== 'object') {
        return obj
    }

    if (obj instanceof Date) {
        return new Date(obj.getTime()) as unknown as T
    }

    if (obj instanceof Array) {
        return obj.map(item => deepClone(item)) as unknown as T
    }

    if (typeof obj === 'object') {
        const cloned = {} as T
        Object.keys(obj).forEach(key => {
            cloned[key as keyof T] = deepClone(obj[key as keyof T])
        })
        return cloned
    }

    return obj
}

/**
 * 生成唯一ID
 */
export const generateId = (): string => {
    return Math.random().toString(36).substr(2, 9)
}

/**
 * 验证经纬度
 */
export const validateCoordinates = (lng: number, lat: number): boolean => {
    return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90
}

/**
 * 计算两点间距离（米）
 */
export const calculateDistance = (
    lng1: number,
    lat1: number,
    lng2: number,
    lat2: number
): number => {
    const R = 6371000 // 地球半径（米）
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2)

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c
}

/**
 * 格式化文件大小
 */
export const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * 验证邮箱格式
 */
export const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
}

/**
 * 验证手机号格式
 */
export const validatePhone = (phone: string): boolean => {
    const phoneRegex = /^1[3-9]\d{9}$/
    return phoneRegex.test(phone)
}

/**
 * 获取文件扩展名
 */
export const getFileExtension = (filename: string): string => {
    return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2)
}

/**
 * 下载文件
 */
export const downloadFile = (url: string, filename: string) => {
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
}

/**
 * 复制文本到剪贴板
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
        await navigator.clipboard.writeText(text)
        return true
    } catch (err) {
        // 降级方案
        const textArea = document.createElement('textarea')
        textArea.value = text
        document.body.appendChild(textArea)
        textArea.select()
        const successful = document.execCommand('copy')
        document.body.removeChild(textArea)
        return successful
    }
}

/**
 * 获取浏览器信息
 */
export const getBrowserInfo = () => {
    const ua = navigator.userAgent
    let browser = 'Unknown'

    if (ua.includes('Chrome')) {
        browser = 'Chrome'
    } else if (ua.includes('Firefox')) {
        browser = 'Firefox'
    } else if (ua.includes('Safari')) {
        browser = 'Safari'
    } else if (ua.includes('Edge')) {
        browser = 'Edge'
    }

    return {
        browser,
        userAgent: ua,
        language: navigator.language,
        platform: navigator.platform
    }
}

/**
 * 检查是否为移动设备
 */
export const isMobile = (): boolean => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
    )
}