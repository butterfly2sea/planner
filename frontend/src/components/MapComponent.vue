<template>
  <div class="map-container">
    <div class="map-controls">
      <el-select v-model="currentStyle" @change="setMapStyle" style="width: 120px">
        <el-option label="街道" value="street"/>
        <el-option label="卫星" value="satellite"/>
        <el-option label="地形" value="terrain"/>
        <el-option label="深色" value="dark"/>
      </el-select>

      <el-button @click="fitBounds" size="small">
        <el-icon>
          <Aim/>
        </el-icon>
        适应视图
      </el-button>
    </div>

    <div ref="mapContainer" class="map"/>
  </div>
</template>

<script setup lang="ts">
import {onMounted, onUnmounted, ref, watch} from 'vue'
import maplibregl from 'maplibre-gl'
import type {TravelItem, TypeConfig} from '@/types'

interface Props {
  items: TravelItem[]
}

interface Emits {
  (e: 'marker-click', itemId: number): void

  (e: 'map-click', lngLat: { lng: number; lat: number }): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const mapContainer = ref<HTMLElement>()
const map = ref<maplibregl.Map>()
const markers = ref(new Map<number, maplibregl.Marker>())
const currentStyle = ref<keyof typeof mapStyles>('street')

const mapStyles = {
  street: 'https://demotiles.maplibre.org/style.json',
  satellite: 'https://api.maptiler.com/maps/hybrid/style.json?key=get_your_own_OpIi9ZULNHzrESv6T2vL',
  terrain: 'https://api.maptiler.com/maps/outdoor/style.json?key=get_your_own_OpIi9ZULNHzrESv6T2vL',
  dark: 'https://api.maptiler.com/maps/streets-v2-dark/style.json?key=get_your_own_OpIi9ZULNHzrESv6T2vL'
} as const

const typeConfigs: Record<string, TypeConfig> = {
  accommodation: {name: '住宿', icon: 'fa-bed', color: '#805ad5'},
  transport: {name: '交通', icon: 'fa-plane', color: '#3182ce'},
  attraction: {name: '景点', icon: 'fa-mountain', color: '#48bb78'},
  photo_spot: {name: '拍照点', icon: 'fa-camera', color: '#ed8936'},
  rest_area: {name: '休息点', icon: 'fa-coffee', color: '#38b2ac'},
  checkpoint: {name: '检查站', icon: 'fa-shield-alt', color: '#e53e3e'},
  other: {name: '其他', icon: 'fa-ellipsis-h', color: '#718096'}
}

onMounted(() => {
  initMap()
})

onUnmounted(() => {
  map.value?.remove()
})

watch(() => props.items, () => {
  updateMarkers()
}, {deep: true})

const initMap = () => {
  if (!mapContainer.value) return

  map.value = new maplibregl.Map({
    container: mapContainer.value,
    style: mapStyles[currentStyle.value],
    center: [100.2331, 28.4269], // 稻城亚丁中心位置
    zoom: 10
  })

  map.value.on('load', () => {
    updateMarkers()
  })

  map.value.on('click', (e) => {
    emit('map-click', {lng: e.lngLat.lng, lat: e.lngLat.lat})
  })
}

const updateMarkers = () => {
  if (!map.value) return

  // 清除现有标记
  clearMarkers()

  // 添加新标记
  props.items.forEach(item => {
    if (item.latitude && item.longitude) {
      addMarker(item)
    }
  })

  // 适应边界
  if (props.items.length > 0) {
    fitBounds()
  }
}

const addMarker = (item: TravelItem) => {
  if (!map.value) return

  const typeConfig = typeConfigs[item.item_type] || typeConfigs.other

  // 创建标记元素
  const el = document.createElement('div')
  el.className = 'map-marker'
  el.style.cssText = `
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: ${typeConfig.color};
    border: 3px solid white;
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.2s ease;
    z-index: 1;
  `
  el.innerHTML = `<i class="fas ${typeConfig.icon}" style="color: white; font-size: 16px;"></i>`

  // 悬停效果
  el.addEventListener('mouseenter', () => {
    el.style.transform = 'scale(1.1)'
    el.style.zIndex = '10'
  })

  el.addEventListener('mouseleave', () => {
    el.style.transform = 'scale(1)'
    el.style.zIndex = '1'
  })

  // 创建弹出窗口
  const popup = new maplibregl.Popup({
    offset: 25,
    closeButton: false,
    maxWidth: '300px'
  }).setHTML(createPopupContent(item))

  // 创建标记
  const marker = new maplibregl.Marker({
    element: el,
    anchor: 'center'
  })
      .setLngLat([item.longitude!, item.latitude!])
      .setPopup(popup)
      .addTo(map.value)

  // 点击事件
  el.addEventListener('click', (e) => {
    e.stopPropagation()
    emit('marker-click', item.id)
  })

  // markers.value.set(item.id, marker)
}

const createPopupContent = (item: TravelItem) => {
  const typeConfig = typeConfigs[item.item_type] || typeConfigs.other

  return `
    <div style="padding: 8px; min-width: 200px; max-width: 300px;">
      <h4 style="margin: 0 0 8px 0; color: #2d3748;">
        <i class="fas ${typeConfig.icon}" style="color: ${typeConfig.color};"></i>
        ${item.name}
      </h4>
      ${item.description ? `<p style="margin: 0 0 8px 0; color: #718096; font-size: 14px;">${item.description}</p>` : ''}
      ${item.address ? `<p style="margin: 0 0 4px 0; color: #718096; font-size: 13px;"><i class="fas fa-map-marker-alt"></i> ${item.address}</p>` : ''}
      ${item.cost ? `<p style="margin: 0 0 4px 0; color: #48bb78; font-size: 13px;"><i class="fas fa-yuan-sign"></i> ¥${item.cost}</p>` : ''}
      ${item.start_datetime ? `<p style="margin: 0; color: #718096; font-size: 13px;"><i class="fas fa-clock"></i> ${new Date(item.start_datetime).toLocaleString('zh-CN')}</p>` : ''}
    </div>
  `
}

const clearMarkers = () => {
  markers.value.forEach(marker => marker.remove())
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
  if (!map.value || props.items.length === 0) return

  const bounds = new maplibregl.LngLatBounds()
  let hasPoints = false

  props.items.forEach(item => {
    if (item.latitude && item.longitude) {
      bounds.extend([item.longitude, item.latitude])
      hasPoints = true
    }
  })

  if (hasPoints) {
    map.value.fitBounds(bounds, {padding: 50})
  }
}

defineExpose({
  fitBounds,
  setMapStyle
})
</script>

<style lang="scss" scoped>
.map-container {
  position: relative;
  height: 100%;
}

.map-controls {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 1000;
  display: flex;
  gap: 8px;
}

.map {
  width: 100%;
  height: 100%;
}
</style>