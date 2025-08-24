<template>
  <div class="map-container">
    <div class="map-controls">
      <el-select v-model="currentStyle" @change="setMapStyle" style="width: 120px">
        <el-option label="矢量" value="vector"/>
        <el-option label="卫星" value="satellite"/>
        <el-option label="等高线" value="contour"/>
        <el-option label="地形" value="terrain"/>
        <el-option label="深色" value="dark"/>
        <el-option label="浅色" value="light"/>
      </el-select>

      <el-button @click="fitBounds" size="small">
        <el-icon><Aim /></el-icon>
        适应视图
      </el-button>

      <el-button v-if="isLocationPicking" @click="cancelLocationPick" size="small" type="warning">
        <el-icon><Close /></el-icon>
        取消选择
      </el-button>
    </div>

    <!-- 调试信息 -->
    <div v-if="showDebugInfo" class="debug-info">
      <p>Items count: {{ props.items?.length || 0 }}</p>
      <p>Markers count: {{ markers.size }}</p>
      <p>Location picking: {{ isLocationPicking }}</p>
    </div>

    <div ref="mapContainer" class="map" :class="{ 'location-picking': isLocationPicking }"/>

    <!-- 空状态显示 -->
    <div v-if="!props.items || props.items.length === 0" class="empty-overlay">
      <el-empty
          description="暂无地理位置信息"
          :image-size="80"
      >
        <template #description>
          <p>请添加包含经纬度信息的元素</p>
        </template>
      </el-empty>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch, computed, nextTick } from 'vue'
import maplibregl from 'maplibre-gl'
import type { TravelItem, TypeConfig } from '@/types'
import { ElMessage } from 'element-plus'

interface Props {
  items: TravelItem[]
  isLocationPicking?: boolean
  showDebugInfo?: boolean
}

interface Emits {
  (e: 'marker-click', itemId: number): void
  (e: 'map-click', lngLat: { lng: number; lat: number }): void
  (e: 'location-picked', lngLat: { lng: number; lat: number }): void
  (e: 'location-pick-cancelled'): void
}

const props = withDefaults(defineProps<Props>(), {
  isLocationPicking: false,
  showDebugInfo: false
})

const emit = defineEmits<Emits>()

const mapContainer = ref<HTMLElement>()
const map = ref<maplibregl.Map>()
// 修复: 明确指定Map类型避免类型推断问题
const markers = ref<Map<number, maplibregl.Marker>>(new Map<number, maplibregl.Marker>())
const currentStyle = ref<keyof typeof mapStyles>('vector')
const isLocationPicking = ref(false)

const mapStyles = {
  // 中文矢量地图 (基于OpenStreetMap)
  vector: {
    version: 8,
    sources: {
      'osm-tiles': {
        type: 'raster',
        tiles: [
          'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
        ],
        tileSize: 256,
        attribution: '© OpenStreetMap contributors'
      },
      'chinese-labels': {
        type: 'vector',
        tiles: [
          'https://api.maptiler.com/tiles/v3/{z}/{x}/{y}.pbf?key=get_your_own_OpIi9ZULNHzrESv6T2vL'
        ]
      }
    },
    layers: [
      {
        id: 'osm-tiles',
        source: 'osm-tiles',
        type: 'raster'
      }
    ]
  },

  // 中文卫星图
  satellite: {
    version: 8,
    sources: {
      'satellite': {
        type: 'raster',
        tiles: [
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        ],
        tileSize: 256,
        attribution: '© Esri, Maxar, GeoEye, Earthstar Geographics'
      }
    },
    layers: [
      {
        id: 'satellite',
        source: 'satellite',
        type: 'raster'
      }
    ]
  },

  // 等高线地形图
  contour: {
    version: 8,
    sources: {
      'terrain': {
        type: 'raster',
        tiles: [
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}'
        ],
        tileSize: 256,
        attribution: '© Esri'
      },
      'contours': {
        type: 'vector',
        tiles: [
          'https://api.maptiler.com/tiles/contours/{z}/{x}/{y}.pbf?key=get_your_own_OpIi9ZULNHzrESv6T2vL'
        ]
      }
    },
    layers: [
      {
        id: 'terrain',
        source: 'terrain',
        type: 'raster'
      },
      {
        id: 'contour-lines',
        source: 'contours',
        'source-layer': 'contour',
        type: 'line',
        paint: {
          'line-color': '#8B4513',
          'line-width': 1,
          'line-opacity': 0.6
        }
      }
    ]
  },

  // 地形图
  terrain: 'https://api.maptiler.com/maps/outdoor/style.json?key=get_your_own_OpIi9ZULNHzrESv6T2vL',

  // 深色模式
  dark: 'https://api.maptiler.com/maps/streets-v2-dark/style.json?key=get_your_own_OpIi9ZULNHzrESv6T2vL',

  // 简洁白色
  light: 'https://api.maptiler.com/maps/streets-v2/style.json?key=get_your_own_OpIi9ZULNHzrESv6T2vL'
} as const

const typeConfigs: Record<string, TypeConfig> = {
  accommodation: { name: '住宿', icon: 'fa-bed', color: '#805ad5' },
  transport: { name: '交通', icon: 'fa-plane', color: '#3182ce' },
  attraction: { name: '景点', icon: 'fa-mountain', color: '#48bb78' },
  photo_spot: { name: '拍照点', icon: 'fa-camera', color: '#ed8936' },
  rest_area: { name: '休息点', icon: 'fa-coffee', color: '#38b2ac' },
  checkpoint: { name: '检查站', icon: 'fa-shield-alt', color: '#e53e3e' },
  other: { name: '其他', icon: 'fa-ellipsis-h', color: '#718096' }
}

// 计算有效的地理位置项目
const validItems = computed(() => {
  if (!Array.isArray(props.items)) {
    console.warn('Items is not an array:', props.items)
    return []
  }

  return props.items.filter(item => {
    const hasCoords = item &&
        typeof item.latitude === 'number' &&
        typeof item.longitude === 'number' &&
        !isNaN(item.latitude) &&
        !isNaN(item.longitude)

    if (!hasCoords && item) {
      console.warn('Item missing valid coordinates:', item.name, item.latitude, item.longitude)
    }

    return hasCoords
  })
})

onMounted(async () => {
  await nextTick()
  initMap()
})

onUnmounted(() => {
  cleanup()
})

watch(() => props.items, (newItems) => {
  console.log('Items changed:', newItems?.length || 0)
  updateMarkers()
}, { deep: true })

watch(() => props.isLocationPicking, (picking) => {
  isLocationPicking.value = picking
  updateCursor()
})

// 修复: 分离游标更新逻辑
const updateCursor = () => {
  if (!map.value) return

  const canvas = map.value.getCanvas()
  if (!canvas) return

  if (isLocationPicking.value) {
    canvas.style.cursor = 'crosshair'
  } else {
    canvas.style.cursor = ''
  }
}

const initMap = () => {
  if (!mapContainer.value) {
    console.error('Map container not available')
    return
  }

  try {
    map.value = new maplibregl.Map({
      container: mapContainer.value,
      style: mapStyles[currentStyle.value],
      center: [100.2331, 28.4269], // 稻城亚丁中心位置
      zoom: 10,
      attributionControl: false
    })

    map.value.addControl(new maplibregl.NavigationControl(), 'top-left')
    map.value.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')

    map.value.on('load', () => {
      console.log('Map loaded, updating markers')
      updateMarkers()
      updateCursor()
    })

    map.value.on('click', (e) => {
      console.log('Map clicked:', e.lngLat, 'isLocationPicking:', isLocationPicking.value)

      if (isLocationPicking.value) {
        // 位置选择模式
        emit('location-picked', { lng: e.lngLat.lng, lat: e.lngLat.lat })
        ElMessage.success('位置已选择')
      } else {
        // 普通地图点击
        emit('map-click', { lng: e.lngLat.lng, lat: e.lngLat.lat })
      }
    })

    map.value.on('error', (e) => {
      console.error('Map error:', e.error)
    })

  } catch (error) {
    console.error('Failed to initialize map:', error)
    ElMessage.error('地图初始化失败')
  }
}

const updateMarkers = async () => {
  if (!map.value || !map.value.isStyleLoaded()) {
    console.warn('Map not ready for marker updates')
    return
  }

  console.log('Updating markers, valid items:', validItems.value.length)

  // 清除现有标记
  clearMarkers()

  // 添加新标记
  validItems.value.forEach(item => {
    try {
      addMarker(item)
    } catch (error) {
      console.error('Failed to add marker for item:', item.name, error)
    }
  })

  // 如果有标记，自动适应视图
  if (validItems.value.length > 0) {
    setTimeout(() => fitBounds(), 500)
  }
}

const addMarker = (item: TravelItem) => {
  if (!map.value || !item.latitude || !item.longitude) return

  const config = typeConfigs[item.item_type] || typeConfigs.other

  // 创建标记元素
  const markerElement = document.createElement('div')
  markerElement.className = 'custom-marker'
  markerElement.style.cssText = `
    width: 32px;
    height: 32px;
    background-color: ${config.color};
    border: 2px solid white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 14px;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    transition: transform 0.2s ease;
  `
  markerElement.innerHTML = `<i class="fas ${config.icon}"></i>`

  // 悬停效果
  markerElement.addEventListener('mouseenter', () => {
    markerElement.style.transform = 'scale(1.2)'
  })
  markerElement.addEventListener('mouseleave', () => {
    markerElement.style.transform = 'scale(1)'
  })

  // 创建标记
  const marker = new maplibregl.Marker(markerElement)
      .setLngLat([item.longitude, item.latitude])
      .addTo(map.value!)

  // 创建弹出框
  const popup = new maplibregl.Popup({
    offset: 25,
    closeButton: true,
    closeOnClick: true
  }).setHTML(createPopupContent(item))

  // 点击事件
  markerElement.addEventListener('click', (e) => {
    e.stopPropagation()
    console.log('Marker clicked:', item.id)

    if (isLocationPicking.value) {
      // 位置选择模式下不处理标记点击
      return
    }

    // 显示弹出框
    marker.setPopup(popup)
    marker.togglePopup()

    // 发送点击事件
    emit('marker-click', item.id)
  })

  // 修复: 使用明确的类型设置避免类型推断问题
  markers.value.set(item.id, marker)
}

const createPopupContent = (item: TravelItem): string => {
  const config = typeConfigs[item.item_type] || typeConfigs.other
  const startTime = item.start_datetime ? new Date(item.start_datetime).toLocaleString('zh-CN') : ''

  return `
    <div class="map-popup">
      <div class="popup-header">
        <i class="fas ${config.icon}" style="color: ${config.color}; margin-right: 8px;"></i>
        <strong style="color: #2d3748; font-size: 16px;">${item.name}</strong>
      </div>
      <div class="popup-content">
        <p style="margin: 8px 0; color: #4a5568; font-size: 13px;">
          <i class="fas fa-tag" style="margin-right: 4px;"></i>
          ${config.name}
        </p>
        ${item.description ?
      `<p style="margin: 8px 0; color: #718096; font-size: 14px;">${item.description}</p>` : ''
  }
        ${item.address ?
      `<p style="margin: 4px 0; color: #718096; font-size: 13px;">
             <i class="fas fa-map-marker-alt" style="margin-right: 4px;"></i>
             ${item.address}
           </p>` : ''
  }
        ${item.cost ?
      `<p style="margin: 4px 0; color: #48bb78; font-size: 13px;">
             <i class="fas fa-yuan-sign" style="margin-right: 4px;"></i>
             ¥${item.cost}
           </p>` : ''
  }
        ${startTime ?
      `<p style="margin: 4px 0; color: #718096; font-size: 13px;">
             <i class="fas fa-clock" style="margin-right: 4px;"></i>
             ${startTime}
           </p>` : ''
  }
      </div>
    </div>
  `
}

const clearMarkers = () => {
  markers.value.forEach(marker => {
    marker.remove()
  })
  markers.value.clear()
}

const setMapStyle = (styleName: string) => {
  const styleKey = styleName as keyof typeof mapStyles
  if (!map.value || !mapStyles[styleKey]) return

  currentStyle.value = styleKey
  map.value.setStyle(mapStyles[styleKey])

  // 重新添加标记
  map.value.once('style.load', () => {
    updateMarkers()
  })
}

const fitBounds = () => {
  if (!map.value || validItems.value.length === 0) {
    console.warn('Cannot fit bounds: no valid items')
    return
  }

  try {
    const bounds = new maplibregl.LngLatBounds()
    let hasPoints = false

    validItems.value.forEach(item => {
      if (item.latitude && item.longitude) {
        bounds.extend([item.longitude, item.latitude])
        hasPoints = true
      }
    })

    if (hasPoints) {
      map.value.fitBounds(bounds, {
        padding: 50,
        maxZoom: 15
      })
    }
  } catch (error) {
    console.error('Failed to fit bounds:', error)
  }
}

// 位置选择相关方法
const startLocationPicking = () => {
  isLocationPicking.value = true
  updateCursor()
  ElMessage.info('请在地图上点击选择位置')
}

const cancelLocationPick = () => {
  isLocationPicking.value = false
  updateCursor()
  emit('location-pick-cancelled')
}

const cleanup = () => {
  clearMarkers()
  map.value?.remove()
}

// 暴露给父组件的方法
defineExpose({
  fitBounds,
  setMapStyle,
  startLocationPicking,
  cancelLocationPick,
  updateMarkers
})
</script>

<style lang="scss" scoped>
.map-container {
  position: relative;
  height: 100%;
  min-height: 400px;
}

.map-controls {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 1000;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.debug-info {
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 1000;
  background: rgba(255, 255, 255, 0.9);
  padding: 8px;
  border-radius: 4px;
  font-size: 12px;

  p {
    margin: 2px 0;
  }
}

.map {
  width: 100%;
  height: 100%;
  min-height: 400px;

  &.location-picking {
    cursor: crosshair !important;
  }
}

.empty-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 100;
  text-align: center;
}

// 全局样式，用于自定义marker
:global(.custom-marker) {
  &:hover {
    z-index: 1000;
  }
}

// 弹出框样式
:global(.maplibregl-popup-content) {
  padding: 12px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);

  .map-popup {
    .popup-header {
      display: flex;
      align-items: center;
      margin-bottom: 8px;
      padding-bottom: 8px;
      border-bottom: 1px solid #e2e8f0;
    }

    .popup-content {
      p {
        display: flex;
        align-items: center;
      }
    }
  }
}

:global(.maplibregl-popup-close-button) {
  font-size: 16px;
  padding: 4px;
  color: #4a5568;

  &:hover {
    background: #f7fafc;
    color: #2d3748;
  }
}
</style>