import Gantt from 'frappe-gantt';
import dayjs from 'dayjs';

export class GanttComponent {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.options = options;
        this.gantt = null;
        this.items = [];
        this.viewMode = 'Day';
    }

    // 更新甘特图
    update(items) {
        this.items = items;
        this.render();
    }

    // 渲染甘特图
    render() {
        // 清空容器
        this.container.innerHTML = '';

        if (this.items.length === 0) {
            this.container.innerHTML = '<div class="empty-state">暂无行程安排</div>';
            return;
        }

        // 转换数据格式
        const tasks = this.convertToGanttTasks(this.items);

        if (tasks.length === 0) {
            this.container.innerHTML = '<div class="empty-state">没有设置时间的元素</div>';
            return;
        }

        // 创建SVG容器
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('id', 'gantt-svg');
        this.container.appendChild(svg);

        // 初始化甘特图
        this.gantt = new Gantt('#gantt-svg', tasks, {
            view_mode: this.viewMode,
            date_format: 'YYYY-MM-DD',
            language: 'zh',
            header_height: 50,
            column_width: 30,
            step: 24,
            bar_height: 30,
            bar_corner_radius: 3,
            arrow_curve: 5,
            padding: 18,
            view_modes: ['Quarter Day', 'Half Day', 'Day', 'Week', 'Month'],

            // 自定义颜色
            custom_popup_html: (task) => {
                const item = this.items.find(i => i.id === task.id);
                if (!item) return '';

                const typeConfig = this.getTypeConfig(item.item_type);
                return `
                    <div class="gantt-popup">
                        <h5>${item.name}</h5>
                        <p><i class="fas ${typeConfig.icon}"></i> ${typeConfig.name}</p>
                        <p>开始: ${dayjs(item.start_datetime).format('MM-DD HH:mm')}</p>
                        <p>结束: ${dayjs(item.end_datetime).format('MM-DD HH:mm')}</p>
                        ${item.cost ? `<p>费用: ¥${item.cost}</p>` : ''}
                    </div>
                `;
            },

            // 点击事件
            on_click: (task) => {
                if (this.options.onTaskClick) {
                    this.options.onTaskClick(task);
                }
            },

            // 日期变更事件
            on_date_change: (task, start, end) => {
                if (this.options.onDateChange) {
                    // 检查关联约束
                    if (this.checkConstraints(task.id, start, end)) {
                        this.options.onDateChange(task, start, end);
                    } else {
                        // 恢复原始时间
                        this.refresh();
                    }
                }
            },

            // 进度变更事件
            on_progress_change: (task, progress) => {
                if (this.options.onProgressChange) {
                    this.options.onProgressChange(task, progress);
                }
            }
        });

        // 添加关联线
        this.drawDependencies();
    }

    // 转换为甘特图任务格式
    convertToGanttTasks(items) {
        const tasks = [];

        items.forEach(item => {
            if (item.start_datetime && item.end_datetime) {
                const typeConfig = this.getTypeConfig(item.item_type);

                tasks.push({
                    id: item.id,
                    name: item.name,
                    start: dayjs(item.start_datetime).format('YYYY-MM-DD HH:mm'),
                    end: dayjs(item.end_datetime).format('YYYY-MM-DD HH:mm'),
                    progress: item.status === 'completed' ? 100 :
                        item.status === 'in_progress' ? 50 : 0,
                    dependencies: this.getDependencies(item.id),
                    custom_class: `bar-${item.item_type}`,
                    // 自定义数据
                    _item: item
                });
            }
        });

        return tasks;
    }

    // 获取依赖关系
    getDependencies(itemId) {
        // TODO: 从关联数据中获取依赖关系
        // 这里需要根据实际的关联数据结构来实现
        return '';
    }

    // 绘制依赖关系线
    drawDependencies() {
        // TODO: 根据元素的关联关系绘制连接线
        // 特别是"需要"类型的关联
    }

    // 检查约束
    checkConstraints(itemId, newStart, newEnd) {
        const item = this.items.find(i => i.id === itemId);
        if (!item) return true;

        // TODO: 检查关联约束
        // 例如：如果A需要B，则A的开始时间不能早于B的结束时间

        // 检查时间合理性
        if (newEnd <= newStart) {
            alert('结束时间必须晚于开始时间');
            return false;
        }

        // 检查时间跨度
        const duration = (newEnd - newStart) / (1000 * 60 * 60); // 小时
        if (duration > 24) {
            if (!confirm('活动时长超过24小时，确定要这样设置吗？')) {
                return false;
            }
        }

        return true;
    }

    // 缩放视图
    zoomIn() {
        const modes = ['Quarter Day', 'Half Day', 'Day', 'Week', 'Month'];
        const currentIndex = modes.indexOf(this.viewMode);
        if (currentIndex > 0) {
            this.viewMode = modes[currentIndex - 1];
            this.gantt.change_view_mode(this.viewMode);
        }
    }

    zoomOut() {
        const modes = ['Quarter Day', 'Half Day', 'Day', 'Week', 'Month'];
        const currentIndex = modes.indexOf(this.viewMode);
        if (currentIndex < modes.length - 1) {
            this.viewMode = modes[currentIndex + 1];
            this.gantt.change_view_mode(this.viewMode);
        }
    }

    // 滚动到今天
    scrollToToday() {
        if (this.gantt) {
            this.gantt.scroll_today();
        }
    }

    // 刷新甘特图
    refresh() {
        if (this.gantt) {
            this.gantt.refresh(this.convertToGanttTasks(this.items));
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
}