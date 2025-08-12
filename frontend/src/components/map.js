import maplibregl from 'maplibre-gl';

export class MapComponent {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.options = options;
        this.markers = new Map();
        this.tempMarker = null;
        this.currentStyle = 'streets';

        this.init();
    }

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
                        tiles: ['https://stamen-tiles.a.ssl.fastly.net/terrain/{z}/{x}/{y}.png'],
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
            if (this.options.onMapClick) {
                this.options.onMapClick(e.lngLat);
            }
        });
    }

    // 切换地图样式
    setStyle(styleName) {
        if (this.styles[styleName]) {
            this.currentStyle = styleName;
            this.map.setStyle(this.styles[styleName]);

            // 重新添加标记
            setTimeout(() => {
                const items = Array.from(this.markers.keys()).map(id => {
                    const marker = this.markers.get(id);
                    return marker._item;
                });
                this.updateMarkers(items);
            }, 100);
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
        `;
        el.innerHTML = `<i class="fas ${typeConfig.icon}" style="color: white; font-size: 16px;"></i>`;

        // 创建弹出窗口
        const popup = new maplibregl.Popup({ offset: 25 })
            .setHTML(this.createPopupContent(item));

        // 创建标记
        const marker = new maplibregl.Marker({ element: el })
            .setLngLat([item.longitude, item.latitude])
            .setPopup(popup)
            .addTo(this.map);

        // 保存标记引用
        marker._item = item;
        this.markers.set(item.id, marker);

        // 点击事件
        el.addEventListener('click', () => {
            if (this.options.onMarkerClick) {
                this.options.onMarkerClick(item.id);
            }
        });
    }

    // 创建弹出窗口内容
    createPopupContent(item) {
        const typeConfig = this.getTypeConfig(item.item_type);
        return `
            <div style="padding: 8px; min-width: 200px;">
                <h4 style="margin: 0 0 8px 0; color: #2d3748;">
                    <i class="fas ${typeConfig.icon}" style="color: ${typeConfig.color};"></i>
                    ${item.name}
                </h4>
                ${item.description ? `<p style="margin: 0 0 8px 0; color: #718096; font-size: 14px;">${item.description}</p>` : ''}
                ${item.cost ? `<p style="margin: 0; color: #e53e3e; font-weight: 600;">¥${item.cost}</p>` : ''}
            </div>
        `;
    }

    // 清除标记
    clearMarkers() {
        this.markers.forEach(marker => marker.remove());
        this.markers.clear();
    }

    // 聚焦到某个元素
    focusItem(item) {
        if (item.latitude && item.longitude) {
            this.map.flyTo({
                center: [item.longitude, item.latitude],
                zoom: 14
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

    // 添加临时标记
    addTemporaryMarker(lng, lat) {
        this.removeTemporaryMarker();

        const el = document.createElement('div');
        el.style.cssText = `
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: #667eea;
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
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
        this.map.remove();
    }
}