import dayjs from 'dayjs';

export class ItemFormComponent {
    constructor(modalId, options = {}) {
        this.modal = document.getElementById(modalId);
        this.form = document.getElementById('item-form');
        this.options = options;
        this.isOpen = false;
        this.editingItemId = null;
        this.uploadedImages = [];
        this.existingRelations = [];

        this.init();
    }

    init() {
        this.bindEvents();
        this.setupImageUpload();
    }

    bindEvents() {
        // 表单标签切换
        document.querySelectorAll('.form-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchTab(tab.dataset.tab);
            });
        });

        // 元素类型变更
        document.getElementById('item-type').addEventListener('change', (e) => {
            this.onTypeChange(e.target.value);
        });

        // 保存按钮
        document.getElementById('save-item-btn').addEventListener('click', () => {
            this.save();
        });

        // 地址输入框联动经纬度
        document.getElementById('item-address').addEventListener('blur', () => {
            this.geocodeAddress();
        });

        // 经纬度输入框联动
        document.getElementById('item-latitude').addEventListener('change', () => {
            this.updateAddressFromCoords();
        });

        document.getElementById('item-longitude').addEventListener('change', () => {
            this.updateAddressFromCoords();
        });
    }

    setupImageUpload() {
        const uploadArea = document.getElementById('upload-area');
        const fileInput = document.getElementById('file-input');

        if (uploadArea && fileInput) {
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
                this.handleFiles(e.dataTransfer.files);
            });

            fileInput.addEventListener('change', (e) => {
                this.handleFiles(e.target.files);
            });
        }
    }

    // 打开表单
    open(item = null) {
        this.isOpen = true;
        this.editingItemId = item ? item.id : null;

        // 重置表单
        this.form.reset();
        this.uploadedImages = [];
        this.existingRelations = [];
        this.renderImagePreview();

        // 设置标题
        document.getElementById('item-modal-title').textContent = item ? '编辑旅游元素' : '添加旅游元素';

        // 如果是编辑模式，填充数据
        if (item) {
            this.fillForm(item);
            this.loadRelations(item.id);
        }

        // 加载可关联的元素
        this.loadRelatedItems();

        // 显示模态框
        this.modal.classList.add('active');

        // 切换到基本信息标签
        this.switchTab('basic');
    }

    // 关闭表单
    close() {
        this.isOpen = false;
        this.modal.classList.remove('active');
        this.editingItemId = null;
        this.uploadedImages = [];
        this.existingRelations = [];
    }

    // 填充表单数据
    fillForm(item) {
        // 基本信息
        document.getElementById('item-type').value = item.item_type || '';
        document.getElementById('item-name').value = item.name || '';
        document.getElementById('item-description').value = item.description || '';

        // 时间信息
        if (item.start_datetime) {
            document.getElementById('item-start-time').value = dayjs(item.start_datetime).format('YYYY-MM-DDTHH:mm');
        }
        if (item.end_datetime) {
            document.getElementById('item-end-time').value = dayjs(item.end_datetime).format('YYYY-MM-DDTHH:mm');
        }

        // 其他信息
        document.getElementById('item-cost').value = item.cost || '';
        document.getElementById('item-priority').value = item.priority || 3;
        document.getElementById('item-address').value = item.address || '';
        document.getElementById('item-latitude').value = item.latitude || '';
        document.getElementById('item-longitude').value = item.longitude || '';

        // 触发类型变更以显示对应的详细信息表单
        this.onTypeChange(item.item_type);

        // 填充详细信息
        if (item.details) {
            this.fillDetails(item.item_type, item.details);
        }

        // 填充图片
        if (item.images && item.images.length > 0) {
            this.uploadedImages = item.images.map(url => ({ url, existing: true }));
            this.renderImagePreview();
        }
    }

    // 填充详细信息
    fillDetails(type, details) {
        switch (type) {
            case 'accommodation':
                if (details.hotel_name) document.getElementById('hotel-name').value = details.hotel_name;
                if (details.room_type) document.getElementById('room-type').value = details.room_type;
                if (details.check_in_time) document.getElementById('check-in-time').value = details.check_in_time;
                if (details.check_out_time) document.getElementById('check-out-time').value = details.check_out_time;
                if (details.booking_platform) document.getElementById('booking-platform').value = details.booking_platform;
                if (details.booking_number) document.getElementById('booking-number').value = details.booking_number;
                break;

            case 'transport':
                if (details.transport_type) document.getElementById('transport-type').value = details.transport_type;
                if (details.carrier_name) document.getElementById('carrier-name').value = details.carrier_name;
                if (details.departure_location) document.getElementById('departure-location').value = details.departure_location;
                if (details.arrival_location) document.getElementById('arrival-location').value = details.arrival_location;
                break;

            case 'attraction':
            case 'photo_spot':
                if (details.attraction_type) document.getElementById('attraction-type').value = details.attraction_type;
                if (details.ticket_price) document.getElementById('ticket-price').value = details.ticket_price;
                if (details.best_visit_time) document.getElementById('best-visit-time').value = details.best_visit_time;
                if (details.recommended_duration) document.getElementById('recommended-duration').value = details.recommended_duration;
                if (details.photography_tips) document.getElementById('photography-tips').value = details.photography_tips;
                break;
        }
    }

    // 保存表单
    async save() {
        // 表单验证
        if (!this.validate()) {
            return;
        }

        // 收集数据
        const data = this.collectFormData();

        // 调用保存回调
        if (this.options.onSave) {
            await this.options.onSave(data);
        }
    }

    // 表单验证
    validate() {
        const errors = [];

        // 必填字段验证
        const itemType = document.getElementById('item-type').value;
        const itemName = document.getElementById('item-name').value;
        const startTime = document.getElementById('item-start-time').value;
        const endTime = document.getElementById('item-end-time').value;

        if (!itemType) {
            errors.push('请选择元素类型');
        }

        if (!itemName.trim()) {
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
        }

        return details;
    }

    // 收集关联信息
    collectRelations() {
        const relatedItems = document.getElementById('related-items');
        const relationType = document.getElementById('relation-type').value;
        const selectedItems = Array.from(relatedItems.selectedOptions).map(opt => opt.value);

        const relations = [];
        selectedItems.forEach(targetId => {
            relations.push({
                source_item_id: this.editingItemId,
                target_item_id: targetId,
                relation_type: relationType
            });
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