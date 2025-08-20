// Toast提示工具

export function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container') || createToastContainer();

    // 创建toast元素
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    // 设置图标
    let icon;
    switch (type) {
        case 'success':
            icon = 'fa-check-circle';
            break;
        case 'error':
            icon = 'fa-exclamation-circle';
            break;
        case 'warning':
            icon = 'fa-exclamation-triangle';
            break;
        default:
            icon = 'fa-info-circle';
    }

    toast.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${message}</span>
    `;

    // 添加到容器
    container.appendChild(toast);

    // 触发动画
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    // 自动移除
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, duration);

    return toast;
}

// 创建toast容器
function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
    return container;
}