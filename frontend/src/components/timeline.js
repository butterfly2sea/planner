import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';

dayjs.locale('zh-cn');

export class TimelineComponent {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.options = options;
        this.items = [];
    }

    // 更新时间轴
    update(items) {
        this.items = items;
        this.render();
    }

    // 渲染时间轴
    render() {
        this.container.innerHTML = '';

        if (this.items.length === 0) {
            this.container.innerHTML = '<div class="empty-state">暂无行程安排</div>';
            return;
        }

        // 按日期分组
        const itemsByDate = this.groupByDate(this.items);

        // 排序并渲染每一天
        Object.keys(itemsByDate).sort().forEach(date => {
            const dayContainer = this.createDayContainer(date, itemsByDate[date]);
            this.container.appendChild(dayContainer);
        });
    }

    // 按日期分组
    groupByDate(items) {
        const grouped = {};

        items.forEach(item => {
            if (item.start_datetime) {
                const date = dayjs(item.start_datetime).format('YYYY-MM-DD');
                if (!grouped[date]) {
                    grouped[date] = [];
                }
                grouped[date].push(item);
            }
        });

        // 对每天的项目按时间排序
        Object.keys(grouped).forEach(date => {
            grouped[date].sort((a, b) =>
                new Date(a.start_datetime) - new Date(b.start_datetime)
            );
        });

        return grouped;
    }

    // 创建日期容器
    createDayContainer(date, dayItems) {
        const container = document.createElement('div');
        container.className = 'timeline-day';

        // 计算当天总费用
        const totalCost = dayItems.reduce((sum, item) => sum + (item.cost || 0), 0);

        // 日期头部
        const header = document.createElement('div');
        header.className = 'timeline-day-header';
        header.innerHTML = `
            <div class="timeline-day-date">
                ${this.formatDate(date)}
            </div>
            <div class="timeline-day-summary">
                ${dayItems.length} 个项目 · ¥${totalCost.toFixed(2)}
            </div>
        `;
        container.appendChild(header);

        // 项目列表
        const itemsContainer = document.createElement('div');
        itemsContainer.className = 'timeline-items';

        dayItems.forEach(item => {
            const itemElement = this.createTimelineItem(item);
            itemsContainer.appendChild(itemElement);
        });

        container.appendChild(itemsContainer);

        return container;
    }

    // 创建时间轴项目
    createTimelineItem(item) {
        const element = document.createElement('div');
        element.className = 'timeline-item';
        element.dataset.id = item.id;

        const typeConfig = this.getTypeConfig(item.item_type);

        element.innerHTML = `
            <div class="timeline-icon icon-${item.item_type}">
                <i class="fas ${typeConfig.icon}"></i>
            </div>
            <div class="timeline-time">
                ${this.formatTime(item.start_datetime)}
                ${item.end_datetime ? `- ${this.formatTime(item.end_datetime)}` : ''}
            </div>
            <div class="timeline-content">
                <h4>${item.name}</h4>
                <p>${item.description || typeConfig.name}</p>
                ${item.address ? `<p class="timeline-address"><i class="fas fa-map-marker-alt"></i> ${item.address}</p>` : ''}
                ${item.cost ? `<p class="timeline-cost"><i class="fas fa-yuan-sign"></i> ${item.cost}</p>` : ''}
            </div>
            <div class="timeline-actions">
                <button class="btn btn-sm timeline-edit-btn" data-id="${item.id}" title="编辑">
                    <i class="fas fa-edit"></i>
                </button>
            </div>
        `;

        // 绑定点击事件
        element.addEventListener('click', (e) => {
            if (!e.target.closest('.timeline-actions')) {
                if (this.options.onItemClick) {
                    this.options.onItemClick(item.id);
                }
            }
        });

        // 绑定编辑按钮事件
        const editBtn = element.querySelector('.timeline-edit-btn');
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.options.onItemEdit) {
                this.options.onItemEdit(item.id);
            }
        });

        return element;
    }

    // 格式化日期
    formatDate(dateStr) {
        const date = dayjs(dateStr);
        const weekday = date.format('dddd');
        return `${date.format('MM月DD日')} ${weekday}`;
    }

    // 格式化时间
    formatTime(datetime) {
        if (!datetime) return '';
        return dayjs(datetime).format('HH:mm');
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