// 基础类型定义
export type ItemType =
    | 'accommodation'
    | 'transport'
    | 'attraction'
    | 'photo_spot'
    | 'rest_area'
    | 'checkpoint'
    | 'other'

export type ItemStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'

export type Priority = 'low' | 'normal' | 'medium' | 'high'

export type RelationType = 'depends_on' | 'blocks' | 'related_to' | 'follows'

// 计划相关类型
export interface Plan {
    id: number
    user_id: number
    name: string
    description?: string
    start_date?: string
    end_date?: string
    budget?: number
    status: string
    is_public: boolean
    created_at: string
    updated_at: string
}

export interface CreatePlanRequest {
    name: string
    description?: string
    start_date?: string
    end_date?: string
    budget?: number
    is_public?: boolean
}

export interface UpdatePlanRequest {
    name?: string
    description?: string
    start_date?: string
    end_date?: string
    budget?: number
    is_public?: boolean
}

// 旅游元素类型
export interface TravelItem {
    id: number
    plan_id: number
    item_type: ItemType
    name: string
    description?: string
    start_datetime?: string
    end_datetime?: string
    latitude?: number
    longitude?: number
    address?: string
    cost?: number
    priority: Priority
    status: ItemStatus
    order_index: number
    properties?: Record<string, any>
    images?: string[]
    created_at: string
    updated_at: string
}

export interface TravelItemResponse {
    items: TravelItem[],
    total: number,
    page: number,
    page_size: number,
    has_more: boolean
}

export interface CreateItemRequest {
    plan_id: number
    name: string
    item_type: ItemType
    description?: string
    start_datetime?: string
    end_datetime?: string
    latitude?: number
    longitude?: number
    address?: string
    cost?: number
    priority?: Priority
    status?: ItemStatus
    properties?: Record<string, any>
    images?: string[]
}

export interface UpdateItemRequest {
    id: number
    name?: string
    item_type?: ItemType
    description?: string
    start_datetime?: string
    end_datetime?: string
    latitude?: number
    longitude?: number
    address?: string
    cost?: number
    priority?: Priority
    status?: ItemStatus
    properties?: Record<string, any>
    images?: string[]
}

// 关联类型
export interface ItemRelation {
    id: number
    source_item_id: number
    target_item_id: number
    relation_type: RelationType
    description?: string
    created_at: string
    updated_at: string
}

export interface CreateRelationRequest {
    source_item_id: number
    target_item_id: number
    relation_type: RelationType
    description?: string
}

// 用户认证类型
export interface User {
    id: number
    username: string
    email: string
    full_name?: string
    avatar?: string
    is_admin: boolean
    created_at: string
    updated_at: string
}

export interface LoginRequest {
    username: string
    password: string
}

export interface RegisterRequest {
    username: string
    email: string
    password: string
    full_name?: string
}

export interface AuthResponse {
    user: User
    access_token: string
    refresh_token: string
    expires_in: number
}

// API响应类型
export interface ApiResponse<T = any> {
    success: boolean
    data?: T
    message?: string
    errors?: Record<string, string[]>
    timestamp: string
}

export interface PaginatedResponse<T> {
    data: T[]
    total: number
    page: number
    per_page: number
    last_page: number
}

// 组件Props类型
export interface MapComponentProps {
    items: TravelItem[]
    selectedItem?: TravelItem | null
    isLocationPicking?: boolean
    showDebugInfo?: boolean
    onMarkerClick?: (itemId: number) => void
    onMapClick?: (lngLat: { lng: number; lat: number }) => void
    onLocationPicked?: (lngLat: { lng: number; lat: number }) => void
}

export interface TimelineComponentProps {
    items: TravelItem[]
    showDebugInfo?: boolean
    onItemClick?: (itemId: number) => void
    onItemEdit?: (itemId: number) => void
    onShowOnMap?: (item: TravelItem) => void
}

export interface GanttComponentProps {
    items: TravelItem[]
    showDebugInfo?: boolean
    onTaskClick?: (task: GanttTask) => void
    onDateChange?: (task: GanttTask, start: Date, end: Date) => void
    onProgressChange?: (task: GanttTask, progress: number) => void
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
    view_mode: 'Quarter Day' | 'Half Day' | 'Day' | 'Week' | 'Month'
    date_format: string
    language: string
    header_height: number
    column_width: number
    step: number
    bar_height: number
    bar_corner_radius: number
    arrow_curve: number
    padding: number
    view_modes: string[]
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
    completionRate: number
}

// 地图相关类型
export interface MarkerInfo {
    item: TravelItem
    element: HTMLElement
    popup?: any
}

export interface MapStyles {
    street: string
    satellite: string
    terrain: string
    dark: string
}

export interface LocationCoordinates {
    lng: number
    lat: number
}

// 表单验证类型
export interface ValidationRule {
    required?: boolean
    message?: string
    trigger?: string | string[]
    min?: number
    max?: number
    pattern?: RegExp
    validator?: (rule: any, value: any, callback: any) => void
}

export interface FormRules {
    [key: string]: ValidationRule | ValidationRule[]
}

// 文件上传类型
export interface UploadFile {
    uid: number | string
    name: string
    status: 'ready' | 'uploading' | 'success' | 'error'
    url?: string
    raw?: File
    response?: any
    percentage?: number
}

// 统计数据类型
export interface PlanStatistics {
    totalItems: number
    completedItems: number
    pendingItems: number
    totalCost: number
    completionRate: number
    itemsByType: Record<ItemType, number>
    itemsByStatus: Record<ItemStatus, number>
    dailySchedule: Record<string, TravelItem[]>
}

export interface SystemStatistics {
    totalUsers: number
    totalPlans: number
    totalItems: number
    activeUsers: number
    popularDestinations: Array<{
        name: string
        count: number
        coordinates: [number, number]
    }>
}

// 导出数据类型
export interface ExportData {
    plan: Plan
    items: TravelItem[]
    relations?: ItemRelation[]
    statistics?: PlanStatistics
    exportTime: string
    version: string
}

// 导入数据类型
export interface ImportData {
    plan: Omit<Plan, 'id' | 'user_id' | 'created_at' | 'updated_at'>
    items: Omit<CreateItemRequest, 'plan_id'>[]
    relations?: Omit<CreateRelationRequest, 'source_item_id' | 'target_item_id'>[]
}

// WebSocket消息类型
export interface WebSocketMessage {
    type: 'plan_updated' | 'item_created' | 'item_updated' | 'item_deleted' | 'user_joined' | 'user_left'
    payload: any
    timestamp: string
    user_id?: number
}

// 错误类型
export interface ApiError {
    code: string
    message: string
    details?: any
}

export interface ValidationError {
    field: string
    message: string
    code: string
}

// Store状态类型
export interface PlanStoreState {
    plans: Plan[]
    currentPlan: Plan | null
    loading: boolean
    error: string | null
}

export interface ItemStoreState {
    items: TravelItem[]
    selectedItem: TravelItem | null
    filterType: ItemType | 'all'
    loading: boolean
    error: string | null
}

export interface AuthStoreState {
    user: User | null
    isAuthenticated: boolean
    token: string | null
    refreshToken: string | null
    loading: boolean
    error: string | null
}

// 路由类型
export interface RouteMetadata {
    title?: string
    requiresAuth?: boolean
    requiresGuest?: boolean
    requiresAdmin?: boolean
    breadcrumb?: string[]
}

// 主题类型
export interface ThemeConfig {
    primary: string
    secondary: string
    success: string
    warning: string
    error: string
    info: string
    background: string
    surface: string
    text: string
    textSecondary: string
}

// 本地化类型
export interface LocaleMessages {
    [key: string]: string | LocaleMessages
}

// 配置类型
export interface AppConfig {
    apiUrl: string
    mapboxToken?: string
    uploadMaxSize: number
    supportedImageTypes: string[]
    defaultMapCenter: [number, number]
    defaultMapZoom: number
    debug: boolean
}

// 全局声明
declare global {
    interface Window {
        __APP_CONFIG__?: Partial<AppConfig>
        __INITIAL_STATE__?: any
    }
}

// 默认导出类型配置
export const defaultTypeConfigs: Record<ItemType, TypeConfig> = {
    accommodation: {name: '住宿', icon: 'fa-bed', color: '#805ad5'},
    transport: {name: '交通', icon: 'fa-plane', color: '#3182ce'},
    attraction: {name: '景点', icon: 'fa-mountain', color: '#48bb78'},
    photo_spot: {name: '拍照点', icon: 'fa-camera', color: '#ed8936'},
    rest_area: {name: '休息点', icon: 'fa-coffee', color: '#38b2ac'},
    checkpoint: {name: '检查站', icon: 'fa-shield-alt', color: '#e53e3e'},
    other: {name: '其他', icon: 'fa-ellipsis-h', color: '#718096'}
}

// 工具类型
export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

// 联合类型助手
export type KeysOfUnion<T> = T extends T ? keyof T : never

export type ValuesOf<T> = T[keyof T]

// 函数类型
export type EventHandler<T = any> = (event: T) => void | Promise<void>

export type AsyncEventHandler<T = any> = (event: T) => Promise<void>

export type Validator<T> = (value: T) => boolean | string

export type Transformer<T, U> = (value: T) => U

// 组合类型
export type ItemWithRelations = TravelItem & {
    relations?: ItemRelation[]
}

export type PlanWithItems = Plan & {
    items?: TravelItem[]
    statistics?: PlanStatistics
}

export type UserWithPlans = User & {
    plans?: Plan[]
    planCount?: number
}

// 扩展Element Plus类型
declare module '@vue/runtime-core' {
    export interface GlobalProperties {
        $message: typeof import('element-plus')['ElMessage']
        $confirm: typeof import('element-plus')['ElMessageBox']['confirm']
        $loading: typeof import('element-plus')['ElLoading']['service']
    }
}

// Vue Router扩展
declare module 'vue-router' {
    interface RouteMeta extends RouteMetadata {
    }
}