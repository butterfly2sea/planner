// 导入样式
import '../styles/main.css';

// 导入模块
import {AuthService} from './services/authService.js';
import {PlanService} from './services/planService.js';
import {ItemService} from './services/itemService.js';
import {MapComponent} from './components/map.js';
import {TimelineComponent} from './components/timeline.js';
import {GanttComponent} from './components/gantt.js';
import {ItemFormComponent} from './components/itemForm.js';
import {showToast} from '../utils/toast.js';

// 全局状态
const appState = {
    currentUser: null,
    currentPlan: null,
    travelItems: [],
    selectedItem: null,
    filterType: 'all',
    isPickingLocation: false  // 新增：位置选择状态
};

// 服务实例
let authService;
let planService;
let itemService;

// 组件实例
let mapComponent;
let timelineComponent;
let ganttComponent;
let itemFormComponent;

// 初始化应用
async function initApp() {
    // 初始化服务
    authService = new AuthService();
    planService = new PlanService();
    itemService = new ItemService();

    // 检查认证状态
    const token = localStorage.getItem('token');
    if (token) {
        try {
            appState.currentUser = await authService.getProfile();
            showUserInfo();
            await loadPlans();
        } catch (error) {
            console.error('Token验证失败:', error);
            localStorage.removeItem('token');
            showLoginModal();
        }
    } else {
        showLoginModal();
    }

    // 初始化组件
    initComponents();

    // 绑定事件
    bindEvents();

    // 恢复面板状态
    restorePanelStates();
}

// 初始化组件
function initComponents() {
    // 初始化地图
    mapComponent = new MapComponent('map', {
        onMarkerClick: (itemId) => selectItem(itemId),
        onMapClick: (lngLat) => {
            // 如果正在选择位置，更新表单
            if (appState.isPickingLocation && itemFormComponent && itemFormComponent.isOpen) {
                itemFormComponent.setLocation(lngLat);
                appState.isPickingLocation = false;
            }
        }
    });

    // 初始化时间轴
    timelineComponent = new TimelineComponent('timeline-container', {
        onItemClick: (itemId) => selectItem(itemId),
        onItemEdit: (itemId) => editItem(itemId)
    });

    // 初始化甘特图
    ganttComponent = new GanttComponent('gantt-container', {
        onTaskClick: (task) => selectItem(task.id),
        onDateChange: async (task, start, end) => {
            await updateItemTime(task.id, start, end);
        },
        onProgressChange: async (task, progress) => {
            // 处理进度更新
        }
    });

    // 初始化表单组件
    itemFormComponent = new ItemFormComponent('item-modal', {
        onSave: async (data) => {
            await saveItem(data);
        },
        onLoadRelatedItems: async () => {
            return appState.travelItems.filter(item => item.id !== itemFormComponent.editingItemId);
        },
        onLocationPick: () => {
            // 激活地图选点模式
            appState.isPickingLocation = !appState.isPickingLocation;
            if (appState.isPickingLocation) {
                showToast('请在地图上点击选择位置', 'info');
                mapComponent.enableLocationPicking();
            } else {
                mapComponent.disableLocationPicking();
            }
            return appState.isPickingLocation;
        }
    });
}

// 格式化时间为ISO 8601格式
function formatDateTime(datetime) {
    if (!datetime) return null;

    // 移除可能存在的时区标记
    datetime = datetime.replace('Z', '').replace('+00:00', '');

    // 如果是YYYY-MM-DDTHH:mm格式，添加秒
    if (datetime.length === 16) {
        datetime = datetime + ':00';
    }

    // 如果是YYYY-MM-DDTHH:mm:ss格式，添加时区
    if (datetime.length === 19) {
        datetime = datetime + 'Z';
    }

    // 验证并返回
    try {
        const date = new Date(datetime);
        if (isNaN(date.getTime())) {
            throw new Error('Invalid date');
        }
        return date.toISOString();
    } catch (error) {
        console.error('时间格式化错误:', error);
        return datetime + 'Z'; // 尝试直接添加时区
    }
}

// 绑定事件
function bindEvents() {
    // 用户相关
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('register-form').addEventListener('submit', handleRegister);

    // 计划相关
    document.getElementById('create-plan-btn').addEventListener('click', () => {
        document.getElementById('plan-modal').classList.add('active');
    });

    document.getElementById('plan-select').addEventListener('change', async (e) => {
        if (e.target.value) {
            await loadPlan(e.target.value);
        }
    });

    document.getElementById('plan-form').addEventListener('submit', handleCreatePlan);

    // 元素相关
    document.getElementById('add-item-btn').addEventListener('click', () => {
        itemFormComponent.open();
    });

    // 过滤器
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            filterItems(chip.dataset.type);
        });
    });

    // 视图切换
    document.querySelectorAll('.view-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            switchView(tab.dataset.view);
        });
    });

    // 地图控制
    document.getElementById('fit-bounds-btn').addEventListener('click', () => {
        mapComponent.fitBounds(appState.travelItems);
    });

    document.getElementById('map-style-select').addEventListener('change', (e) => {
        mapComponent.setStyle(e.target.value);
    });

    // 甘特图控制
    document.getElementById('gantt-zoom-in')?.addEventListener('click', () => {
        ganttComponent.zoomIn();
    });

    document.getElementById('gantt-zoom-out')?.addEventListener('click', () => {
        ganttComponent.zoomOut();
    });

    document.getElementById('gantt-today')?.addEventListener('click', () => {
        ganttComponent.scrollToToday();
    });

    // 面板折叠控制
    document.querySelectorAll('.panel-header').forEach(header => {
        header.addEventListener('click', (e) => {
            // 忽略头部内的按钮点击
            if (e.target.closest('button') || e.target.closest('select')) return;

            const panel = header.closest('.panel');
            togglePanel(panel.id);
        });
    });

    // 自动排布
    document.getElementById('auto-arrange-btn')?.addEventListener('click', async () => {
        await autoArrangeItems();
    });

    // 导出
    document.getElementById('export-btn')?.addEventListener('click', async () => {
        await exportPlan();
    });

    // 模态框关闭
    document.querySelectorAll('[data-modal-close]').forEach(btn => {
        btn.addEventListener('click', () => {
            const modalId = btn.getAttribute('data-modal-close');
            document.getElementById(modalId).classList.remove('active');
        });
    });

    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = btn.closest('.modal');
            if (modal) {
                modal.classList.remove('active');
            }
        });
    });
}

// 登录处理
async function handleLogin() {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    try {
        showLoading(true);
        const response = await authService.login(username, password);

        localStorage.setItem('token', response.token);
        appState.currentUser = response.user;

        document.getElementById('login-modal').classList.remove('active');
        showUserInfo();

        await loadPlans();
        showToast('登录成功', 'success');
    } catch (error) {
        showToast(error.message || '登录失败', 'error');
    } finally {
        showLoading(false);
    }
}

// 注册处理
async function handleRegister() {
    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

    try {
        showLoading(true);
        await authService.register(username, email, password);

        showToast('注册成功，请登录', 'success');
        document.getElementById('register-modal').classList.remove('active');
        document.getElementById('login-modal').classList.add('active');

        // 自动填充用户名
        document.getElementById('login-username').value = username;
    } catch (error) {
        showToast(error.message || '注册失败', 'error');
    } finally {
        showLoading(false);
    }
}

// 退出登录
async function handleLogout() {
    try {
        await authService.logout();
        localStorage.removeItem('token');
        appState.currentUser = null;
        appState.currentPlan = null;
        appState.travelItems = [];

        showLoginModal();
        showToast('已退出登录', 'info');
    } catch (error) {
        console.error('退出登录失败:', error);
    }
}

// 加载计划列表
async function loadPlans() {
    try {
        const plans = await planService.getMyPlans();
        const select = document.getElementById('plan-select');

        // 清空选项
        select.innerHTML = '<option value="">选择计划...</option>';

        // 添加计划选项
        plans.forEach(plan => {
            const option = document.createElement('option');
            option.value = plan.id;
            option.textContent = plan.name;
            select.appendChild(option);
        });

        // 如果只有一个计划，自动选中
        if (plans.length === 1) {
            select.value = plans[0].id;
            await loadPlan(plans[0].id);
        }
    } catch (error) {
        showToast('加载计划失败', 'error');
    }
}

// 保存计划
async function savePlan() {
    const planData = {
        name: document.getElementById('plan-name').value,
        description: document.getElementById('plan-description').value,
        destination: document.getElementById('plan-destination').value,
        start_date: document.getElementById('plan-start-date').value,
        end_date: document.getElementById('plan-end-date').value,
        budget: parseFloat(document.getElementById('plan-budget').value) || 0,
        participants: parseInt(document.getElementById('plan-participants').value) || 1
    };

    if (!planData.name) {
        showToast('请输入计划名称', 'warning');
        return;
    }

    try {
        showLoading(true);
        const plan = await planService.createPlan(planData);

        document.getElementById('plan-modal').classList.remove('active');
        await loadPlans();

        // 自动选中新创建的计划
        document.getElementById('plan-select').value = plan.id;
        await loadPlan(plan.id);

        showToast('计划创建成功', 'success');
    } catch (error) {
        showToast('创建计划失败', 'error');
    } finally {
        showLoading(false);
    }
}

// 切换面板折叠状态
function togglePanel(panelId) {
    const panel = document.getElementById(panelId);
    if (!panel) return;

    panel.classList.toggle('collapsed');

    const icon = panel.querySelector('.panel-toggle i');
    if (icon) {
        if (panel.classList.contains('collapsed')) {
            icon.className = 'fas fa-chevron-right';
        } else {
            icon.className = 'fas fa-chevron-down';
        }
    }

    // 保存状态到localStorage
    localStorage.setItem(`panel-${panelId}`, panel.classList.contains('collapsed'));

    // 如果是地图面板，触发地图重新调整大小
    if (panelId === 'map-panel' && !panel.classList.contains('collapsed')) {
        setTimeout(() => {
            mapComponent?.map?.resize();
        }, 300);
    }
}

// 恢复面板状态
function restorePanelStates() {
    const panels = ['map-panel', 'timeline-panel', 'items-panel'];
    panels.forEach(panelId => {
        const collapsed = localStorage.getItem(`panel-${panelId}`) === 'true';
        if (collapsed) {
            const panel = document.getElementById(panelId);
            if (panel) {
                panel.classList.add('collapsed');
                const icon = panel.querySelector('.panel-toggle i');
                if (icon) {
                    icon.className = 'fas fa-chevron-right';
                }
            }
        }
    });
}

// 保存元素
async function saveItem(itemData) {
    if (!appState.currentPlan) {
        showToast('请先选择计划', 'warning');
        return;
    }

    try {
        showLoading(true);

        // 格式化时间
        if (itemData.start_datetime) {
            itemData.start_datetime = formatDateTime(itemData.start_datetime);
        }
        if (itemData.end_datetime) {
            itemData.end_datetime = formatDateTime(itemData.end_datetime);
        }

        // 处理GeoJSON数据（如果有）
        if (itemData.geojson_data) {
            itemData.properties = itemData.properties || {};
            itemData.properties.geojson = itemData.geojson_data;

            // 提取海拔数据
            if (itemData.elevation_data) {
                itemData.properties.elevation_profile = itemData.elevation_data;
            }
        }

        if (itemData.id) {
            // 更新元素
            await itemService.updateItem(itemData.id, itemData);
            showToast('元素更新成功', 'success');
        } else {
            // 创建元素
            await itemService.createItem(appState.currentPlan.id, itemData);
            showToast('元素创建成功', 'success');
        }

        // 重新加载元素
        await loadPlan(appState.currentPlan.id);

        // 关闭表单
        itemFormComponent.close();

        // 重置位置选择状态
        appState.isPickingLocation = false;
        mapComponent.disableLocationPicking();
    } catch (error) {
        showToast(error.message || '保存失败', 'error');
    } finally {
        showLoading(false);
    }
}

// 加载计划
async function loadPlan(planId) {
    try {
        showLoading(true);

        // 获取计划详情
        const plan = await planService.getPlan(planId);
        appState.currentPlan = plan;

        // 获取计划的所有元素
        const items = await itemService.getItems(planId);
        appState.travelItems = items;

        // 更新所有视图
        updateAllViews();

        // 适应地图边界
        if (items.length > 0) {
            mapComponent.fitBounds(items);
        }

        showToast('计划加载成功', 'success');
    } catch (error) {
        showToast('加载计划失败', 'error');
    } finally {
        showLoading(false);
    }
}

// 更新所有视图
function updateAllViews() {
    mapComponent.updateMarkers(appState.travelItems);
    timelineComponent.update(appState.travelItems);
    ganttComponent.update(appState.travelItems);
    renderItemsList();
}

// 选择元素
function selectItem(itemId) {
    appState.selectedItem = appState.travelItems.find(item => item.id === itemId);

    // 更新列表选中状态
    document.querySelectorAll('.item-card').forEach(card => {
        card.classList.toggle('selected', card.dataset.id === itemId);
    });

    // 地图定位
    if (appState.selectedItem) {
        mapComponent.focusItem(appState.selectedItem);
    }
}

// 编辑元素
function editItem(itemId) {
    const item = appState.travelItems.find(i => i.id === itemId);
    if (item) {
        // 重置位置选择状态
        appState.isPickingLocation = false;
        mapComponent.disableLocationPicking();

        // 更新列表
        renderItemsList();
    }
}

// 切换视图
function switchView(viewName) {
    // 更新标签状态
    document.querySelectorAll('.view-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.view === viewName);
    });

    // 切换视图面板
    document.querySelectorAll('.view-panel').forEach(panel => {
        panel.classList.toggle('active', panel.id === `${viewName}-view`);
    });

    // 如果切换到甘特图，刷新甘特图
    if (viewName === 'gantt') {
        ganttComponent.refresh();
    }
}

// 渲染元素列表
function renderItemsList() {
    const container = document.getElementById('items-list');
    const filteredItems = appState.filterType === 'all'
        ? appState.travelItems
        : appState.travelItems.filter(item => item.item_type === appState.filterType);

    container.innerHTML = '';

    filteredItems.forEach(item => {
        const card = createItemCard(item);
        container.appendChild(card);
    });
}

// 创建元素卡片
function createItemCard(item) {
    const card = document.createElement('div');
    card.className = 'item-card';
    card.dataset.id = item.id;

    if (appState.selectedItem && appState.selectedItem.id === item.id) {
        card.classList.add('selected');
    }

    const typeConfig = itemFormComponent.getTypeConfig(item.item_type);

    card.innerHTML = `
        <div class="item-card-header">
            <div class="item-card-title">${item.name}</div>
            <div class="item-card-type" style="background: ${typeConfig.color};">
                ${typeConfig.name}
            </div>
        </div>
        <div class="item-card-details">
            ${item.start_datetime ? `<span><i class="fas fa-clock"></i> ${formatDateTime(item.start_datetime)}</span>` : ''}
            ${item.cost ? `<span><i class="fas fa-yuan-sign"></i> ${item.cost}</span>` : ''}
        </div>
        <div class="item-card-actions">
            <button class="btn btn-sm" onclick="app.editItem('${item.id}')">
                <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-sm btn-danger" onclick="app.deleteItem('${item.id}')">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;

    card.addEventListener('click', (e) => {
        if (!e.target.closest('.item-card-actions')) {
            selectItem(item.id);
        }
    });

    return card;
}

// 删除元素
async function deleteItem(itemId) {
    if (!confirm('确定要删除这个元素吗？')) return;

    try {
        showLoading(true);
        await itemService.deleteItem(itemId);

        // 从本地列表中移除
        appState.travelItems = appState.travelItems.filter(item => item.id !== itemId);

        // 更新视图
        updateAllViews();

        showToast('删除成功', 'success');
    } catch (error) {
        showToast('删除失败', 'error');
    } finally {
        showLoading(false);
    }
}

// 自动排布
async function autoArrangeItems() {
    if (!appState.currentPlan || appState.travelItems.length === 0) {
        showToast('没有可排布的元素', 'warning');
        return;
    }

    try {
        showLoading(true);

        // 按优先级和类型排序
        const sortedItems = [...appState.travelItems].sort((a, b) => {
            if (a.priority !== b.priority) {
                return b.priority - a.priority;
            }
            // 同优先级按类型排序
            const typeOrder = ['transport', 'attraction', 'photo_spot', 'rest_area', 'accommodation'];
            return typeOrder.indexOf(a.item_type) - typeOrder.indexOf(b.item_type);
        });

        // 重新分配时间
        let currentTime = new Date(appState.currentPlan.start_date || new Date());
        currentTime.setHours(8, 0, 0, 0);

        for (const item of sortedItems) {
            const duration = item.duration_hours || 2;
            const startTime = new Date(currentTime);
            const endTime = new Date(currentTime.getTime() + duration * 60 * 60 * 1000);

            await itemService.updateItem(item.id, {
                start_datetime: startTime.toISOString(),
                end_datetime: endTime.toISOString()
            });

            // 更新本地数据
            item.start_datetime = startTime.toISOString();
            item.end_datetime = endTime.toISOString();

            // 下一个元素开始时间 = 当前结束时间 + 30分钟休息
            currentTime = new Date(endTime.getTime() + 30 * 60 * 1000);

            // 如果超过晚上9点，换到第二天早上8点
            if (currentTime.getHours() >= 21) {
                currentTime.setDate(currentTime.getDate() + 1);
                currentTime.setHours(8, 0, 0, 0);
            }
        }

        // 更新视图
        updateAllViews();

        showToast('智能排布完成', 'success');
    } catch (error) {
        showToast('排布失败', 'error');
    } finally {
        showLoading(false);
    }
}

// 导出计划
async function exportPlan() {
    if (!appState.currentPlan) {
        showToast('请先选择计划', 'warning');
        return;
    }

    try {
        showLoading(true);
        const data = await planService.exportPlan(appState.currentPlan.id);

        // 创建下载链接
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `plan-${appState.currentPlan.name}-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);

        showToast('导出成功', 'success');
    } catch (error) {
        showToast('导出失败', 'error');
    } finally {
        showLoading(false);
    }
}

// 更新所有视图
function updateAllViews() {
    // 更新地图
    mapComponent.updateMarkers(appState.travelItems);

    // 更新时间轴
    timelineComponent.update(appState.travelItems);

    // 更新甘特图
    ganttComponent.update(appState.travelItems);

    // 更新列表
    renderItemsList();
}

// 显示用户信息
function showUserInfo() {
    const userInfo = document.getElementById('user-info');
    const usernameDisplay = document.getElementById('username-display');

    if (appState.currentUser) {
        usernameDisplay.textContent = `欢迎，${appState.currentUser.username}`;
        userInfo.style.display = 'flex';
    } else {
        userInfo.style.display = 'none';
    }
}

// 显示登录模态框
function showLoginModal() {
    document.getElementById('login-modal').classList.add('active');
    document.getElementById('register-modal').classList.remove('active');
}

// 显示计划模态框
function showPlanModal() {
    document.getElementById('plan-modal').classList.add('active');
    document.getElementById('plan-form').reset();
}

// 显示加载指示器

// 显示/隐藏加载状态
function showLoading(show) {
    const loader = document.getElementById('loading');
    if (loader) {
        loader.style.display = show ? 'flex' : 'none';
    }
}

// 导出给全局使用
window.app = {
    editItem,
    deleteItem
};

// 启动应用
document.addEventListener('DOMContentLoaded', initApp);