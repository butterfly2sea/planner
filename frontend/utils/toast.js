// Toast提示工具

export function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container') || createToastContainer();

    // 创建toast元素
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    // 设置图标
    let icon = '';
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

// 显示确认对话框
export function showConfirm(message, title = '确认') {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content modal-sm">
                <div class="modal-header">
                    <h3>${title}</h3>
                </div>
                <div class="modal-body">
                    <p>${message}</p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="confirm-cancel">取消</button>
                    <button class="btn btn-primary" id="confirm-ok">确定</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const handleCancel = () => {
            modal.remove();
            resolve(false);
        };

        const handleOk = () => {
            modal.remove();
            resolve(true);
        };

        modal.querySelector('#confirm-cancel').addEventListener('click', handleCancel);
        modal.querySelector('#confirm-ok').addEventListener('click', handleOk);

        // 点击背景关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                handleCancel();
            }
        });
    });
}

// 显示加载提示
export function showLoading(message = '加载中...') {
    let loading = document.getElementById('global-loading');

    if (!loading) {
        loading = document.createElement('div');
        loading.id = 'global-loading';
        loading.className = 'loading-overlay';
        loading.innerHTML = `
            <div class="spinner"></div>
            <div class="loading-text">${message}</div>
        `;
        document.body.appendChild(loading);
    }

    loading.style.display = 'flex';

    return {
        hide: () => {
            if (loading) {
                loading.style.display = 'none';
            }
        },
        update: (newMessage) => {
            const text = loading.querySelector('.loading-text');
            if (text) {
                text.textContent = newMessage;
            }
        }
    };
}

// 隐藏加载提示
export function hideLoading() {
    const loading = document.getElementById('global-loading');
    if (loading) {
        loading.style.display = 'none';
    }
}