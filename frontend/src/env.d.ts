/// <reference types="vite/client" />
declare module '*.vue' {
    import type { DefineComponent } from 'vue'
    const component: DefineComponent<{}, {}, any>
    export default component
}

interface ImportMetaEnv {
    readonly VITE_API_BASE_URL: string
    readonly VITE_MAPBOX_TOKEN: string
    readonly VITE_MAPTILER_KEY: string
    readonly VITE_APP_TITLE: string
    readonly VITE_APP_VERSION: string
    readonly VITE_APP_DESCRIPTION: string
    readonly VITE_DEV_SERVER_PORT: string
    readonly VITE_ENABLE_DEVTOOLS: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}

// 第三方库类型声明
declare module 'frappe-gantt' {
    export interface GanttOptions {
        view_mode?: string
        date_format?: string
        language?: string
        header_height?: number
        column_width?: number
        step?: number
        bar_height?: number
        bar_corner_radius?: number
        arrow_curve?: number
        padding?: number
        view_modes?: string[]
        custom_popup_html?: (task: any) => string
        on_click?: (task: any) => void
        on_date_change?: (task: any, start: Date, end: Date) => void
        on_progress_change?: (task: any, progress: number) => void
    }

    export interface Task {
        id: string | number
        name: string
        start: string
        end: string
        progress: number
        dependencies?: string
        custom_class?: string
    }

    export default class Gantt {
        constructor(element: string | HTMLElement, tasks: Task[], options?: GanttOptions)
        change_view_mode(mode: string): void
        refresh(tasks: Task[]): void
        scroll_today?(): void
        scrollToToday?(): void
    }
}

declare module 'sortablejs' {
    export interface SortableOptions {
        group?: string | object
        sort?: boolean
        disabled?: boolean
        animation?: number
        handle?: string
        filter?: string
        draggable?: string
        ghostClass?: string
        chosenClass?: string
        dragClass?: string
        onStart?: (evt: any) => void
        onEnd?: (evt: any) => void
        onAdd?: (evt: any) => void
        onUpdate?: (evt: any) => void
        onRemove?: (evt: any) => void
        onSort?: (evt: any) => void
    }

    export default class Sortable {
        constructor(el: HTMLElement, options?: SortableOptions)
        static create(el: HTMLElement, options?: SortableOptions): Sortable
        destroy(): void
    }
}
