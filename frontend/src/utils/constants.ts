export const ITEM_TYPES = {
    ACCOMMODATION: 'accommodation',
    TRANSPORT: 'transport',
    ATTRACTION: 'attraction',
    PHOTO_SPOT: 'photo_spot',
    REST_AREA: 'rest_area',
    CHECKPOINT: 'checkpoint',
    OTHER: 'other'
} as const

export const ITEM_STATUSES = {
    PLANNED: 'planned',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled'
} as const

export const RELATION_TYPES = {
    NEAR_TO: 'near_to',
    REQUIRES: 'requires',
    CONFLICTS_WITH: 'conflicts_with',
    ALTERNATIVE_TO: 'alternative_to',
    INCLUDED_IN: 'included_in'
} as const

export const MAP_STYLES = {
    STREET: 'street',
    SATELLITE: 'satellite',
    TERRAIN: 'terrain',
    DARK: 'dark'
} as const

export const GANTT_VIEW_MODES = [
    'Quarter Day',
    'Half Day',
    'Day',
    'Week',
    'Month'
] as const

export const DATE_FORMATS = {
    DATE: 'YYYY-MM-DD',
    DATETIME: 'YYYY-MM-DD HH:mm',
    TIME: 'HH:mm',
    DISPLAY_DATE: 'MM月DD日',
    DISPLAY_DATETIME: 'MM月DD日 HH:mm'
} as const