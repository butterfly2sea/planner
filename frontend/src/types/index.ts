export interface User {
    id: number
    username: string
    email: string
    created_at: string
}

export interface Plan {
    id: number
    name: string
    description?: string
    user_id: number
    created_at: string
    updated_at: string
}

export interface TravelItem {
    id: number
    plan_id: number
    item_type: ItemType
    name: string
    description?: string
    start_datetime?: string
    end_datetime?: string
    duration_hours?: number
    cost?: number
    priority: number
    status: ItemStatus
    address?: string
    latitude?: number
    longitude?: number
    images?: string[]
    properties?: Record<string, any>
    created_at: string
    updated_at: string
}

export type ItemType =
    | 'accommodation'
    | 'transport'
    | 'attraction'
    | 'photo_spot'
    | 'rest_area'
    | 'checkpoint'
    | 'other'

export type ItemStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled'

export interface ItemRelation {
    id: number
    source_item_id: number
    target_item_id: number
    relation_type: RelationType
    created_at: string
}

export type RelationType =
    | 'near_to'
    | 'requires'
    | 'conflicts_with'
    | 'alternative_to'
    | 'included_in'

export interface ApiResponse<T> {
    data: T
    message?: string
    status: number
}

export interface LoginRequest {
    username: string
    password: string
}

export interface RegisterRequest {
    username: string
    email: string
    password: string
}

export interface AuthResponse {
    token: string
    user: User
}

export interface CreatePlanRequest {
    name: string
    description?: string
}

export interface CreateItemRequest {
    plan_id: number
    item_type: ItemType
    name: string
    description?: string
    start_datetime?: string
    end_datetime?: string
    cost?: number
    priority?: number
    address?: string
    latitude?: number
    longitude?: number
    images?: string[]
    properties?: Record<string, any>
}

export interface UpdateItemRequest extends Partial<CreateItemRequest> {
    id: number
}

// 地图相关类型
export interface MapOptions {
    onMarkerClick?: (itemId: number) => void
    onMapClick?: (lngLat: { lng: number; lat: number }) => void
}

export interface MarkerInfo {
    item: TravelItem
    element: HTMLElement
}

// 甘特图相关类型
export interface GanttTask {
    id: number | string
    name: string
    start: string
    end: string
    progress: number
    dependencies?: string
    custom_class?: string
    _item?: TravelItem
}

export interface GanttOptions {
    onTaskClick?: (task: GanttTask) => void
    onDateChange?: (task: GanttTask, start: Date, end: Date) => void
    onProgressChange?: (task: GanttTask, progress: number) => void
}

// 组件配置类型
export interface TypeConfig {
    name: string
    icon: string
    color: string
}

export interface TimelineDay {
    date: string
    items: TravelItem[]
    totalCost: number
}

// 全局声明
declare global {
    interface Window {
        // 可以在这里添加全局类型声明
    }
}