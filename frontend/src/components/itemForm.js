import dayjs from 'dayjs';
import Chart from 'chart.js/auto';

export class ItemFormComponent {
    constructor(modalId, options = {}) {
        this.modalId = modalId;
        this.options = options;
        this.modal = null;
        this.form = null;
        this.editingItemId = null;
        this.uploadedImages = [];
        this.relatedItems = [];
        this.isOpen = false;
        this.isPickingLocation = false;
        this.geojsonData = null;
        this.elevationData = null;
        this.elevationChart = null;

        this.init();
    }

    // 初始化
    init() {
        this.modal = document.getElementById(this.modalId);
        this.form = document.getElementById('item-form');

        this.setupEventListeners();
        this.setupImageUpload();
        this.setupGeoJSONUpload();
    }

    // 设置事件监听
    setupEventListeners() {
        // 表单提交
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSubmit();
        });

        // 类型选择变化
        document.getElementById('item-type').addEventListener('change', (e) => {
            this.onTypeChange(e.target.value);
        });

        // 位置选择按钮
        const locationPickBtn = document.getElementById('location-pick-btn');
        if (locationPickBtn) {
            locationPickBtn.addEventListener('click', () => {
                this.toggleLocationPicker();
            });
        }

        // 标签页切换
        document.querySelectorAll('.form-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchTab(tab.dataset.tab);
            });
        });

        // 关联类型选择
        document.getElementById('relation-type')?.addEventListener('change', (e) => {
            this.onRelationTypeChange(e.target.value);
        });

        // 添加关联按钮
        document.getElementById('add-relation-btn')?.addEventListener('click', () => {
            this.addRelation();
        });
    }

    // 设置图片上传
    setupImageUpload() {
        const uploadArea = document.getElementById('upload-area');
        const fileInput = document.getElementById('image-input');

        if (!uploadArea || !fileInput) return;

        uploadArea.addEventListener('click', () => fileInput.click());

        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragging');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragging');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragging');
            this.handleImageFiles(e.dataTransfer.files);
        });

        fileInput.addEventListener('change', (e) => {
            this.handleImageFiles(e.target.files);
        });
    }

    // 设置GeoJSON上传
    setupGeoJSONUpload() {
        const uploadArea = document.getElementById('geojson-upload');
        const fileInput = document.getElementById('geojson-file');

        if (!uploadArea || !fileInput) return;

        uploadArea.addEventListener('click', () => fileInput.click());

        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            this.handleGeoJSONFile(e.dataTransfer.files[0]);
        });

        fileInput.addEventListener('change', (e) => {
            this.handleGeoJSONFile(e.target.files[0]);
        });
    }

    // 处理GeoJSON文件
    handleGeoJSONFile(file) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const geojson = JSON.parse(e.target.result);
                this.processGeoJSON(geojson);
            } catch (error) {
                alert('GeoJSON文件格式错误');
            }
        };
        reader.readAsText(file);
    }

    // 处理GeoJSON数据
    processGeoJSON(geojson) {
        if (geojson.type === 'FeatureCollection' && geojson.features.length > 0) {
            const feature = geojson.features[0];
            if (feature.geometry.type === 'LineString') {
                this.geojsonData = geojson;
                const coordinates = feature.geometry.coordinates;

                // 提取海拔数据
                this.elevationData = this.extractElevationData(coordinates);

                // 显示海拔图表
                if (this.elevationData.length > 0) {
                    this.showElevationChart();
                }

                // 显示成功提示
                const uploadArea = document.getElementById('geojson-upload');
                uploadArea.innerHTML = `
                    <i class="fas fa-check-circle" style="font-size: 32px; color: var(--success-color); margin-bottom: 10px;"></i>
                    <p>轨迹已导入（${coordinates.length}个点）</p>
                    <button type="button" class="btn btn-sm btn-secondary" onclick="this.parentElement.click()">重新选择</button>
                `;

                // 在地图上显示轨迹（如果地图组件可用）
                if (window.mapComponent) {
                    window.mapComponent.addRoute(geojson);
                }
            }
        }
    }

    // 提取海拔数据
    extractElevationData(coordinates) {
        const data = [];
        let totalDistance = 0;

        for (let i = 0; i < coordinates.length; i++) {
            if (i > 0) {
                totalDistance += this.calculateDistance(
                    coordinates[i - 1],
                    coordinates[i]
                );
            }

            data.push({
                distance: totalDistance,
                elevation: coordinates[i][2] || 0 // 第三个值是海拔
            });
        }

        return data;
    }

    // 计算两点间距离（公里）
    calculateDistance(coord1, coord2) {
        const lat1 = coord1[1] * Math.PI / 180;
        const lat2 = coord2[1] * Math.PI / 180;
        const deltaLat = (coord2[1] - coord1[1]) * Math.PI / 180;
        const deltaLng = (coord2[0] - coord1[0]) * Math.PI / 180;

        const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = 6371 * c; // 地球半径（公里）

        return d;
    }

    // 显示海拔图表
    showElevationChart() {
        const preview = document.getElementById('elevation-preview');
        if (!preview) return;

        preview.style.display = 'block';

        const canvas = document.getElementById('elevation-chart');
        if (!canvas) return;

        // 销毁已存在的图表
        if (this.elevationChart) {
            this.elevationChart.destroy();
        }

        const ctx = canvas.getContext('2d');
        this.elevationChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.elevationData.map(d => `${d.distance.toFixed(1)}km`),
                datasets: [{
                    label: '海拔（米）',
                    data: this.elevationData.map(d => d.elevation),
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 1,
                    pointHoverRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            title: (context) => `距离: ${context[0].label}`,
                            label: (context) => `海拔: ${context.parsed.y.toFixed(0)}m`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        title: {
                            display: true,
                            text: '海拔（米）'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: '距离'
                        }
                    }
                }
            }
        });
    }

    // 切换位置选择器
    toggleLocationPicker() {
        this.isPickingLocation = !this.isPickingLocation;
        const btn = document.getElementById('location-pick-btn');

        if (this.options.onLocationPick) {
            const isActive = this.options.onLocationPick();

            if (isActive) {
                btn.classList.add('active');
                btn.innerHTML = '<i class="fas fa-times"></i> 取消选点';
            } else {
                btn.classList.remove('active');
                btn.innerHTML = '<i class="fas fa-map-marker-alt"></i> 地图选点';
            }
        }
    }

    // 设置位置
    setLocation(lngLat) {
        const { lng, lat } = lngLat;
        document.getElementById('item-latitude').value = lat.toFixed(6);
        document.getElementById('item-longitude').value = lng.toFixed(6);
        document.getElementById('item-address').value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

        // 重置选择器状态
        const btn = document.getElementById('location-pick-btn');
        btn.classList.remove('active');
        btn.innerHTML = '<i class="fas fa-map-marker-alt"></i> 地图选点';
        this.isPickingLocation = false;
    }

    // 打开表单
    async open(item = null) {
        this.editingItemId = item ? item.id : null;
        this.isOpen = true;
        this.uploadedImages = [];
        this.geojsonData = null;
        this.elevationData = null;

        // 重置表单
        this.form.reset();
        this.resetFormState();

        // 设置标题
        document.getElementById('modal-title').textContent = item ? '编辑旅游元素' : '添加旅游元素';

        // 如果是编辑模式，填充表单
        if (item) {
            this.fillForm(item);
        }

        // 加载关联元素列表
        if (this.options.onLoadRelatedItems) {
            this.relatedItems = await this.options.onLoadRelatedItems();
            this.updateRelatedItemsList();
        }

        // 显示模态框
        this.modal.classList.add('active');

        // 切换到基本信息标签
        this.switchTab('basic');
    }

    // 关闭表单
    close() {
        this.modal.classList.remove('active');
        this.isOpen = false;
        this.editingItemId = null;
        this.uploadedImages = [];
        this.geojsonData = null;
        this.elevationData = null;

        // 重置位置选择器
        this.isPickingLocation = false;
        const btn = document.getElementById('location-pick-btn');
        if (btn) {
            btn.classList.remove('active');
            btn.innerHTML = '<i class="fas fa-map-marker-alt"></i> 地图选点';
        }

        // 清除地图上的临时路线
        if (window.mapComponent) {
            window.mapComponent.removeRoute();
        }

        // 销毁图表
        if (this.elevationChart) {
            this.elevationChart.destroy();
            this.elevationChart = null;
        }
    }

    // 重置表单状态
    resetFormState() {
        // 隐藏所有特定类型的字段
        document.querySelectorAll('.type-specific-fields').forEach(fields => {
            fields.style.display = 'none';
        });

        // 重置上传区域
        const uploadArea = document.getElementById('upload-area');
        if (uploadArea) {
            uploadArea.innerHTML = `
                <i class="fas fa-cloud-upload-alt"></i>
                <p>拖拽图片到此处或点击上传</p>
            `;
        }

        const geojsonUpload = document.getElementById('geojson-upload');
        if (geojsonUpload) {
            geojsonUpload.innerHTML = `
                <i class="fas fa-cloud-upload-alt" style="font-size: 32px; color: var(--gray-color); margin-bottom: 10px;"></i>
                <p>拖拽GeoJSON文件到此处或点击选择</p>
            `;
        }

        // 隐藏海拔预览
        const elevationPreview = document.getElementById('elevation-preview');
        if (elevationPreview) {
            elevationPreview.style.display = 'none';
        }

        // 清空关联列表
        const relationsList = document.getElementById('relations-list');
        if (relationsList) {
            relationsList.innerHTML = '';
        }
    }

    // 填充表单
    fillForm(item) {
        // 基本信息
        document.getElementById('item-type').value = item.item_type || '';
        document.getElementById('item-name').value = item.name || '';
        document.getElementById('item-description').value = item.description || '';

        // 处理时间 - 转换为本地时间格式
        if (item.start_datetime) {
            const startTime = item.start_datetime.replace('Z', '').substring(0, 16);
            document.getElementById('item-start-time').value = startTime;
        }
        if (item.end_datetime) {
            const endTime = item.end_datetime.replace('Z', '').substring(0, 16);
            document.getElementById('item-end-time').value = endTime;
        }

        document.getElementById('item-cost').value = item.cost || '';
        document.getElementById('item-priority').value = item.priority || 3;

        // 位置信息
        if (item.latitude && item.longitude) {
            document.getElementById('item-latitude').value = item.latitude;
            document.getElementById('item-longitude').value = item.longitude;
        }
        document.getElementById('item-address').value = item.address || '';

        // 触发类型变化事件
        this.onTypeChange(item.item_type);

        // 填充类型特定字段
        this.fillTypeSpecificFields(item);

        // 加载图片
        if (item.images && item.images.length > 0) {
            this.uploadedImages = item.images.map(url => ({ url, uploaded: true }));
            this.updateImagePreview();
        }

        // 加载GeoJSON数据
        if (item.properties?.geojson) {
            this.geojsonData = item.properties.geojson;
            this.elevationData = item.properties.elevation_profile || [];
            if (this.elevationData.length > 0) {
                this.showElevationChart();
            }
        }

        // 加载关联
        if (item.relations) {
            this.displayRelations(item.relations);
        }
    }

    // 填充类型特定字段
    fillTypeSpecificFields(item) {
        if (!item.details) return;

        switch (item.item_type) {
            case 'accommodation':
                if (item.accommodation_details) {
                    document.getElementById('hotel-name').value = item.accommodation_details.hotel_name || '';
                    document.getElementById('room-type').value = item.accommodation_details.room_type || '';
                    document.getElementById('check-in-time').value = item.accommodation_details.check_in_time || '';
                    document.getElementById('check-out-time').value = item.accommodation_details.check_out_time || '';
                    document.getElementById('booking-platform').value = item.accommodation_details.booking_platform || '';
                    document.getElementById('booking-number').value = item.accommodation_details.booking_number || '';
                }
                break;

            case 'transport':
                if (item.transport_details) {
                    document.getElementById('transport-type').value = item.transport_details.transport_type || '';
                    document.getElementById('carrier-name').value = item.transport_details.carrier_name || '';
                    document.getElementById('departure-location').value = item.transport_details.departure_location || '';
                    document.getElementById('arrival-location').value = item.transport_details.arrival_location || '';
                }
                break;

            case 'attraction':
            case 'photo_spot':
                if (item.attraction_details) {
                    document.getElementById('attraction-type').value = item.attraction_details.attraction_type || '';
                    document.getElementById('ticket-price').value = item.attraction_details.ticket_price || '';
                    document.getElementById('best-visit-time').value = item.attraction_details.best_visit_time || '';
                    document.getElementById('recommended-duration').value = item.attraction_details.recommended_duration || '';
                    document.getElementById('photography-tips').value = item.attraction_details.photography_tips || '';
                }
                break;
        }
    }

    // 类型变化处理
    onTypeChange(type) {
        // 隐藏所有特定字段
        document.querySelectorAll('.type-specific-fields').forEach(fields => {
            fields.style.display = 'none';
        });

        // 显示对应类型的字段
        const fieldsId = `${type}-fields`;
        const fields = document.getElementById(fieldsId);
        if (fields) {
            fields.style.display = 'block';
        }

        // 特殊处理交通类型
        if (type === 'transport') {
            const transportFields = document.getElementById('transport-geojson-fields');
            if (transportFields) {
                transportFields.style.display = 'block';
            }
        }
    }

    // 切换标签页
    switchTab(tabName) {
        // 更新标签状态
        document.querySelectorAll('.form-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // 切换内容
        document.querySelectorAll('.form-section').forEach(section => {
            section.classList.toggle('active', section.dataset.section === tabName);
        });
    }

    // 处理表单提交
    async handleSubmit() {
        if (!this.validateForm()) {
            return;
        }

        const data = this.collectFormData();

        if (this.options.onSave) {
            await this.options.onSave(data);
        }
    }

    // 验证表单
    validateForm() {
        const name = document.getElementById('item-name').value;
        const type = document.getElementById('item-type').value;
        const startTime = document.getElementById('item-start-time').value;
        const endTime = document.getElementById('item-end-time').value;

        const errors = [];

        if (!type) {
            errors.push('请选择元素类型');
        }

        if (!name) {
            errors.push('请输入名称');
        }

        if (!startTime) {
            errors.push('请选择开始时间');
        }

        if (!endTime) {
            errors.push('请选择结束时间');
        }

        if (startTime && endTime && new Date(startTime) >= new Date(endTime)) {
            errors.push('结束时间必须晚于开始时间');
        }

        // 显示错误
        if (errors.length > 0) {
            alert('请完善以下信息：\n' + errors.join('\n'));
            return false;
        }

        return true;
    }

    // 收集表单数据
    collectFormData() {
        const data = {
            id: this.editingItemId,
            item_type: document.getElementById('item-type').value,
            name: document.getElementById('item-name').value,
            description: document.getElementById('item-description').value || null,
            start_datetime: document.getElementById('item-start-time').value || null,
            end_datetime: document.getElementById('item-end-time').value || null,
            cost: parseFloat(document.getElementById('item-cost').value) || null,
            priority: parseInt(document.getElementById('item-priority').value) || 3,
            address: document.getElementById('item-address').value || null,
            latitude: parseFloat(document.getElementById('item-latitude').value) || null,
            longitude: parseFloat(document.getElementById('item-longitude').value) || null,
            images: this.uploadedImages.map(img => img.url)
        };

        // 计算持续时间
        if (data.start_datetime && data.end_datetime) {
            const duration = (new Date(data.end_datetime) - new Date(data.start_datetime)) / (1000 * 60 * 60);
            data.duration_hours = duration;
        }

        // 添加GeoJSON数据
        if (this.geojsonData) {
            data.geojson_data = this.geojsonData;
            data.elevation_data = this.elevationData;
        }

        // 收集详细信息
        data.details = this.collectDetails(data.item_type);

        // 收集关联信息
        data.relations = this.collectRelations();

        return data;
    }

    // 收集详细信息
    collectDetails(type) {
        const details = {};

        switch (type) {
            case 'accommodation':
                return {
                    hotel_name: document.getElementById('hotel-name')?.value || null,
                    room_type: document.getElementById('room-type')?.value || null,
                    check_in_time: document.getElementById('check-in-time')?.value || null,
                    check_out_time: document.getElementById('check-out-time')?.value || null,
                    booking_platform: document.getElementById('booking-platform')?.value || null,
                    booking_number: document.getElementById('booking-number')?.value || null
                };

            case 'transport':
                return {
                    transport_type: document.getElementById('transport-type')?.value || null,
                    carrier_name: document.getElementById('carrier-name')?.value || null,
                    departure_location: document.getElementById('departure-location')?.value || null,
                    arrival_location: document.getElementById('arrival-location')?.value || null
                };

            case 'attraction':
            case 'photo_spot':
                return {
                    attraction_type: document.getElementById('attraction-type')?.value || null,
                    ticket_price: parseFloat(document.getElementById('ticket-price')?.value) || null,
                    best_visit_time: document.getElementById('best-visit-time')?.value || null,
                    recommended_duration: parseFloat(document.getElementById('recommended-duration')?.value) || null,
                    photography_tips: document.getElementById('photography-tips')?.value || null
                };

            default:
                return null;
        }
    }

    // 收集关联信息
    collectRelations() {
        const relations = [];
        const relationElements = document.querySelectorAll('.relation-item');

        relationElements.forEach(el => {
            const type = el.dataset.type;
            const targetId = el.dataset.targetId;
            if (type && targetId) {
                relations.push({ type, target_id: targetId });
            }
        });

        return relations;
    }

    // 切换标签页
    switchTab(tabName) {
        // 更新标签按钮状态
        document.querySelectorAll('.form-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // 显示对应的表单部分
        document.querySelectorAll('.form-section').forEach(section => {
            section.classList.toggle('active', section.dataset.section === tabName);
        });
    }

    // 类型变更处理
    onTypeChange(type) {
        const container = document.getElementById('details-container');
        container.innerHTML = '';

        if (!type) return;

        const detailsHTML = this.getDetailsFormHTML(type);
        container.innerHTML = detailsHTML;
    }

    // 获取详细信息表单HTML
    getDetailsFormHTML(type) {
        switch (type) {
            case 'accommodation':
                return `
                    <div class="form-row">
                        <div class="form-group">
                            <label>酒店名称</label>
                            <input type="text" id="hotel-name">
                        </div>
                        <div class="form-group">
                            <label>房型</label>
                            <input type="text" id="room-type" placeholder="如：标准双床房">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>入住时间</label>
                            <input type="time" id="check-in-time" value="14:00">
                        </div>
                        <div class="form-group">
                            <label>退房时间</label>
                            <input type="time" id="check-out-time" value="12:00">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>预订平台</label>
                            <select id="booking-platform">
                                <option value="">请选择</option>
                                <option value="booking.com">Booking.com</option>
                                <option value="agoda">Agoda</option>
                                <option value="ctrip">携程</option>
                                <option value="direct">酒店直订</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>订单号</label>
                            <input type="text" id="booking-number">
                        </div>
                    </div>
                `;

            case 'transport':
                return `
                    <div class="form-row">
                        <div class="form-group">
                            <label>交通类型</label>
                            <select id="transport-type">
                                <option value="flight">飞机</option>
                                <option value="train">火车</option>
                                <option value="bus">大巴</option>
                                <option value="self_drive">自驾</option>
                                <option value="taxi">出租车</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>承运商</label>
                            <input type="text" id="carrier-name" placeholder="如：国航CA1234">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>出发地</label>
                            <input type="text" id="departure-location">
                        </div>
                        <div class="form-group">
                            <label>目的地</label>
                            <input type="text" id="arrival-location">
                        </div>
                    </div>
                `;

            case 'attraction':
            case 'photo_spot':
                return `
                    <div class="form-row">
                        <div class="form-group">
                            <label>景点类型</label>
                            <select id="attraction-type">
                                <option value="scenic_spot">风景名胜</option>
                                <option value="viewpoint">观景台</option>
                                <option value="cultural">文化遗址</option>
                                <option value="religious">宗教场所</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>门票价格（元）</label>
                            <input type="number" id="ticket-price" min="0">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>最佳游览时间</label>
                            <input type="text" id="best-visit-time" placeholder="如：日出时分">
                        </div>
                        <div class="form-group">
                            <label>建议游览时长（小时）</label>
                            <input type="number" id="recommended-duration" min="0.5" step="0.5">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>摄影建议</label>
                        <textarea id="photography-tips" rows="3" placeholder="最佳拍摄位置、光线条件等"></textarea>
                    </div>
                `;

            default:
                return '<p>该类型暂无详细信息设置</p>';
        }
    }

    // 处理图片上传
    handleFiles(files) {
        Array.from(files).forEach(file => {
            if (!file.type.startsWith('image/')) return;
            if (file.size > 5 * 1024 * 1024) {
                alert(`文件 ${file.name} 超过5MB限制`);
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                this.uploadedImages.push({
                    name: file.name,
                    url: e.target.result,
                    file: file,
                    existing: false
                });
                this.renderImagePreview();
            };
            reader.readAsDataURL(file);
        });
    }

    // 渲染图片预览
    renderImagePreview() {
        const preview = document.getElementById('image-preview');
        preview.innerHTML = '';

        this.uploadedImages.forEach((img, index) => {
            const item = document.createElement('div');
            item.className = 'image-preview-item';
            item.innerHTML = `
                <img src="${img.url}" alt="${img.name || '图片'}">
                <button class="image-preview-remove" data-index="${index}">
                    <i class="fas fa-times"></i>
                </button>
            `;

            item.querySelector('.image-preview-remove').addEventListener('click', () => {
                this.removeImage(index);
            });

            preview.appendChild(item);
        });
    }

    // 移除图片
    removeImage(index) {
        this.uploadedImages.splice(index, 1);
        this.renderImagePreview();
    }

    // 设置位置
    setLocation(lngLat) {
        document.getElementById('item-latitude').value = lngLat.lat.toFixed(6);
        document.getElementById('item-longitude').value = lngLat.lng.toFixed(6);
        this.updateAddressFromCoords();
    }

    // 地理编码
    async geocodeAddress() {
        // TODO: 调用地理编码API将地址转换为经纬度
        const address = document.getElementById('item-address').value;
        if (!address) return;

        // 这里应该调用实际的地理编码API
        console.log('地理编码:', address);
    }

    // 根据坐标更新地址
    async updateAddressFromCoords() {
        const lat = parseFloat(document.getElementById('item-latitude').value);
        const lng = parseFloat(document.getElementById('item-longitude').value);

        if (!lat || !lng) return;

        // TODO: 调用反向地理编码API
        console.log('反向地理编码:', lat, lng);
    }

    // 加载可关联的元素
    async loadRelatedItems() {
        const select = document.getElementById('related-items');
        select.innerHTML = '';

        if (this.options.onLoadRelatedItems) {
            const items = await this.options.onLoadRelatedItems();

            items.forEach(item => {
                const option = document.createElement('option');
                option.value = item.id;
                option.textContent = `${item.name} (${this.getTypeConfig(item.item_type).name})`;
                select.appendChild(option);
            });
        }
    }

    // 加载现有关联
    async loadRelations(itemId) {
        // TODO: 从API加载现有关联并显示
        const container = document.getElementById('existing-relations-list');
        container.innerHTML = '<p>暂无关联</p>';
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
}