import maplibregl from 'maplibre-gl';
import Chart from 'chart.js/auto';

export class MapComponent {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.options = options;
        this.map = null;
        this.markers = new Map();
        this.tempMarker = null;
        this.currentStyle = 'streets';
        this.isPickingLocation = false;
        this.routeLayer = null;

        this.init();
    }

    // 初始化地图
    init() {
        // 地图样式配置
        this.styles = {
            streets: {
                version: 8,
                sources: {
                    'osm-tiles': {
                        type: 'raster',
                        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                        tileSize: 256
                    }
                },
                layers: [{
                    id: 'osm-tiles',
                    type: 'raster',
                    source: 'osm-tiles',
                    minzoom: 0,
                    maxzoom: 19
                }]
            },
            satellite: {
                version: 8,
                sources: {
                    'satellite-tiles': {
                        type: 'raster',
                        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
                        tileSize: 256
                    }
                },
                layers: [{
                    id: 'satellite-tiles',
                    type: 'raster',
                    source: 'satellite-tiles',
                    minzoom: 0,
                    maxzoom: 19
                }]
            },
            terrain: {
                version: 8,
                sources: {
                    'terrain-tiles': {
                        type: 'raster',
                        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}'],
                        tileSize: 256
                    }
                },
                layers: [{
                    id: 'terrain-tiles',
                    type: 'raster',
                    source: 'terrain-tiles',
                    minzoom: 0,
                    maxzoom: 19
                }]
            },
            dark: {
                version: 8,
                sources: {
                    'dark-tiles': {
                        type: 'raster',
                        tiles: ['https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}.png'],
                        tileSize: 256
                    }
                },
                layers: [{
                    id: 'dark-tiles',
                    type: 'raster',
                    source: 'dark-tiles',
                    minzoom: 0,
                    maxzoom: 19
                }]
            }
        };

        // 初始化地图
        this.map = new maplibregl.Map({
            container: this.containerId,
            style: this.styles[this.currentStyle],
            center: [100.3, 28.5], // 稻城亚丁中心坐标
            zoom: 11,
            attributionControl: false
        });

        // 添加控件
        this.map.addControl(new maplibregl.NavigationControl());
        this.map.addControl(new maplibregl.GeolocateControl({
            positionOptions: {
                enableHighAccuracy: true
            },
            trackUserLocation: true
        }));

        // 绑定事件
        this.map.on('click', (e) => {
            if (this.isPickingLocation) {
                this.handleLocationPick(e.lngLat);
            }
        });

        // 地图加载完成后的处理
        this.map.on('load', () => {
            this.setupMapLayers();
        });
    }

    // 设置地图图层
    setupMapLayers() {
        // 预留用于添加自定义图层
    }

    // 启用位置选择
    enableLocationPicking() {
        this.isPickingLocation = true;
        this.map.getCanvas().style.cursor = 'crosshair';
    }

    // 禁用位置选择
    disableLocationPicking() {
        this.isPickingLocation = false;
        this.map.getCanvas().style.cursor = '';
        this.removeTemporaryMarker();
    }

    // 处理位置选择
    handleLocationPick(lngLat) {
        const { lng, lat } = lngLat;

        // 添加临时标记
        this.addTemporaryMarker(lng, lat);

        // 触发回调
        if (this.options.onMapClick) {
            this.options.onMapClick({ lng, lat });
        }
    }

    // 切换地图样式
    setStyle(styleName) {
        if (this.styles[styleName]) {
            this.currentStyle = styleName;
            this.map.setStyle(this.styles[styleName]);

            // 重新添加标记和图层
            this.map.once('style.load', () => {
                this.setupMapLayers();
                this.restoreMarkers();
                this.restoreRoute();
            });
        }
    }

    // 恢复标记
    restoreMarkers() {
        const items = Array.from(this.markers.values()).map(marker => marker._item);
        this.updateMarkers(items);
    }

    // 恢复路线
    restoreRoute() {
        if (this.routeLayer) {
            this.addRoute(this.routeLayer);
        }
    }

    // 更新标记
    updateMarkers(items) {
        // 清除现有标记
        this.clearMarkers();

        // 添加新标记
        items.forEach(item => {
            if (item.latitude && item.longitude) {
                this.addMarker(item);
            }
        });
    }

    // 添加标记
    addMarker(item) {
        const typeConfig = this.getTypeConfig(item.item_type);

        // 创建标记元素
        const el = document.createElement('div');
        el.className = 'map-marker';
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
            transition: transform 0.2s;
        `;
        el.innerHTML = `<i class="fas ${typeConfig.icon}" style="color: white; font-size: 16px;"></i>`;

        // 鼠标悬停效果
        el.addEventListener('mouseenter', () => {
            el.style.transform = 'scale(1.1)';
        });
        el.addEventListener('mouseleave', () => {
            el.style.transform = 'scale(1)';
        });

        // 创建弹出窗口
        const popup = new maplibregl.Popup({ offset: 25, closeButton: false })
            .setHTML(this.createPopupContent(item));

        // 创建标记
        const marker = new maplibregl.Marker({ element: el })
            .setLngLat([item.longitude, item.latitude])
            .setPopup(popup)
            .addTo(this.map);

        // 保存标记引用和数据
        marker._item = item;
        this.markers.set(item.id, marker);

        // 点击事件
        el.addEventListener('click', () => {
            if (this.options.onMarkerClick) {
                this.options.onMarkerClick(item.id);
            }
        });

        // 如果有海拔数据，在弹出窗口打开时绘制图表
        if (item.properties?.elevation_profile) {
            popup.on('open', () => {
                setTimeout(() => {
                    this.renderElevationChart(item);
                }, 100);
            });
        }
    }

    // 创建弹出窗口内容
    createPopupContent(item) {
        const typeConfig = this.getTypeConfig(item.item_type);
        let elevationChart = '';

        if (item.properties?.elevation_profile) {
            elevationChart = `
                <div style="margin-top: 10px; height: 100px;">
                    <canvas id="popup-elevation-${item.id}" width="250" height="100"></canvas>
                </div>
            `;
        }

        return `
            <div style="padding: 8px; min-width: 200px; max-width: 300px;">
                <h4 style="margin: 0 0 8px 0; color: #2d3748;">
                    <i class="fas ${typeConfig.icon}" style="color: ${typeConfig.color};"></i>
                    ${item.name}
                </h4>
                ${item.description ? `<p style="margin: 0 0 8px 0; color: #718096; font-size: 14px;">${item.description}</p>` : ''}
                ${item.address ? `<p style="margin: 0 0 4px 0; color: #718096; font-size: 13px;"><i class="fas fa-map-marker-alt"></i> ${item.address}</p>` : ''}
                ${item.cost ? `<p style="margin: 0; color: #e53e3e; font-weight: 600;">¥${item.cost}</p>` : ''}
                ${elevationChart}
            </div>
        `;
    }

    // 渲染海拔图表
    renderElevationChart(item) {
        const canvas = document.getElementById(`popup-elevation-${item.id}`);
        if (!canvas || !item.properties?.elevation_profile) return;

        const ctx = canvas.getContext('2d');
        const data = item.properties.elevation_profile;

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(d => `${d.distance.toFixed(1)}`),
                datasets: [{
                    data: data.map(d => d.elevation),
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0
                }]
            },
            options: {
                responsive: false,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            title: (context) => `${context[0].label} km`,
                            label: (context) => `海拔: ${context.parsed.y} m`
                        }
                    }
                },
                scales: {
                    x: {
                        display: false,
                        grid: { display: false }
                    },
                    y: {
                        display: false,
                        grid: { display: false }
                    }
                }
            }
        });
    }

    // 添加路线（GeoJSON）
    addRoute(geojson) {
        // 保存路线数据
        this.routeLayer = geojson;

        // 移除已存在的路线
        if (this.map.getLayer('route')) {
            this.map.removeLayer('route');
        }
        if (this.map.getLayer('route-outline')) {
            this.map.removeLayer('route-outline');
        }
        if (this.map.getSource('route')) {
            this.map.removeSource('route');
        }

        // 添加路线源
        this.map.addSource('route', {
            type: 'geojson',
            data: geojson
        });

        // 添加路线轮廓（用于描边效果）
        this.map.addLayer({
            id: 'route-outline',
            type: 'line',
            source: 'route',
            layout: {
                'line-join': 'round',
                'line-cap': 'round'
            },
            paint: {
                'line-color': '#ffffff',
                'line-width': 5
            }
        });

        // 添加路线主体
        this.map.addLayer({
            id: 'route',
            type: 'line',
            source: 'route',
            layout: {
                'line-join': 'round',
                'line-cap': 'round'
            },
            paint: {
                'line-color': '#3182ce',
                'line-width': 3
            }
        });

        // 适应路线边界
        if (geojson.features && geojson.features.length > 0) {
            const coordinates = geojson.features[0].geometry.coordinates;
            const bounds = new maplibregl.LngLatBounds();

            coordinates.forEach(coord => {
                bounds.extend([coord[0], coord[1]]);
            });

            this.map.fitBounds(bounds, { padding: 50 });
        }
    }

    // 移除路线
    removeRoute() {
        if (this.map.getLayer('route')) {
            this.map.removeLayer('route');
        }
        if (this.map.getLayer('route-outline')) {
            this.map.removeLayer('route-outline');
        }
        if (this.map.getSource('route')) {
            this.map.removeSource('route');
        }
        this.routeLayer = null;
    }

    // 清除标记
    clearMarkers() {
        this.markers.forEach(marker => marker.remove());
        this.markers.clear();
    }

    // 添加临时标记
    addTemporaryMarker(lng, lat) {
        this.removeTemporaryMarker();

        const el = document.createElement('div');
        el.style.cssText = `
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: #48bb78;
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            animation: pulse 1.5s infinite;
        `;

        this.tempMarker = new maplibregl.Marker({ element: el })
            .setLngLat([lng, lat])
            .addTo(this.map);
    }

    // 移除临时标记
    removeTemporaryMarker() {
        if (this.tempMarker) {
            this.tempMarker.remove();
            this.tempMarker = null;
        }
    }

    // 聚焦到某个元素
    focusItem(item) {
        if (item.latitude && item.longitude) {
            this.map.flyTo({
                center: [item.longitude, item.latitude],
                zoom: 14,
                duration: 1000
            });

            // 打开弹出窗口
            const marker = this.markers.get(item.id);
            if (marker) {
                marker.togglePopup();
            }
        }
    }

    // 适应边界
    fitBounds(items) {
        const bounds = new maplibregl.LngLatBounds();
        let hasPoints = false;

        items.forEach(item => {
            if (item.latitude && item.longitude) {
                bounds.extend([item.longitude, item.latitude]);
                hasPoints = true;
            }
        });

        if (hasPoints) {
            this.map.fitBounds(bounds, { padding: 50 });
        }
    }

    // 获取类型配置
    getTypeConfig(itemType) {
        const configs = {
            accommodation: {
                name: '住宿',
                icon: 'fa-bed',
                color: '#805ad5'
            },
            transport: {
                name: '交通',
                icon: 'fa-plane',
                color: '#3182ce'
            },
            attraction: {
                name: '景点',
                icon: 'fa-mountain',
                color: '#48bb78'
            },
            photo_spot: {
                name: '拍照点',
                icon: 'fa-camera',
                color: '#ed8936'
            },
            rest_area: {
                name: '休息点',
                icon: 'fa-coffee',
                color: '#38b2ac'
            },
            checkpoint: {
                name: '检查站',
                icon: 'fa-shield-alt',
                color: '#e53e3e'
            },
            other: {
                name: '其他',
                icon: 'fa-ellipsis-h',
                color: '#718096'
            }
        };

        return configs[itemType] || configs.other;
    }

    // 销毁地图
    destroy() {
        this.clearMarkers();
        this.removeTemporaryMarker();
        this.map.remove();
    }
}