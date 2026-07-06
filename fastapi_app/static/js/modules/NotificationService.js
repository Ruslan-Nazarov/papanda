/**
 * NotificationService.js - Premium Toast System
 */

export const NotificationService = {
    container: null,

    init() {
        if (this.container) return;
        this.container = document.createElement('div');
        this.container.id = 'premium-toast-container';
        document.body.appendChild(this.container);

        // Inject CSS for toasts
        const style = document.createElement('style');
        style.innerHTML = `
            #premium-toast-container {
                position: fixed; bottom: 24px; right: 24px;
                display: flex; flex-direction: column; gap: 12px;
                z-index: 20000; pointer-events: none;
            }
            .premium-toast {
                min-width: 300px; padding: 16px 20px;
                background: var(--glass-bg); backdrop-filter: var(--glass-blur);
                border: 1px solid var(--glass-border); border-radius: var(--radius-md);
                box-shadow: var(--shadow-lg); color: var(--color-text-dark);
                display: flex; align-items: center; gap: 12px;
                transform: translateX(100%); opacity: 0;
                transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                pointer-events: auto;
            }
            .premium-toast.active { transform: translateX(0); opacity: 1; }
            .premium-toast.success { border-left: 4px solid var(--color-success); }
            .premium-toast.error { border-left: 4px solid var(--color-error); }
            .premium-toast.info { border-left: 4px solid var(--color-primary); }
            .toast-icon { font-size: 1.25rem; }
            .toast-message { font-weight: 600; font-size: 0.95rem; }
        `;
        document.head.appendChild(style);
    },

    show(message, type = 'success', duration = 3500) {
        this.init();

        // Prevent duplicate active toasts with the exact same message and type
        const existingToasts = this.container.querySelectorAll('.premium-toast');
        for (const existing of existingToasts) {
            const msgEl = existing.querySelector('.toast-message');
            if (msgEl && msgEl.textContent === message && existing.classList.contains(type)) {
                // Flash existing toast slightly to indicate repeated action without stacking duplicates
                existing.style.transform = 'scale(1.05)';
                setTimeout(() => { existing.style.transform = ''; }, 150);
                return;
            }
        }

        // Limit maximum visible toasts on screen to 3
        if (existingToasts.length >= 3) {
            const oldest = existingToasts[0];
            oldest.classList.remove('active');
            setTimeout(() => oldest.remove(), 200);
        }

        const toast = document.createElement('div');
        toast.className = `premium-toast ${type}`;
        
        const icons = { success: '✅', error: '❌', info: 'ℹ️' };
        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || '🔔'}</span>
            <span class="toast-message">${message}</span>
        `;

        this.container.appendChild(toast);
        
        // Trigger animation
        requestAnimationFrame(() => toast.classList.add('active'));

        setTimeout(() => {
            toast.classList.remove('active');
            setTimeout(() => toast.remove(), 400);
        }, duration);
    },

    confirm(message, options = {}) {
        const modal = document.getElementById('customConfirmModal');
        const msgEl = document.getElementById('confirmModalMessage');
        const iconEl = document.getElementById('confirmModalIcon');
        const footer = document.getElementById('confirmModalFooter');

        if (!modal) {
            console.warn("customConfirmModal not found, falling back to native confirm");
            return Promise.resolve(window.confirm(message));
        }

        msgEl.textContent = message;
        if (iconEl) {
            iconEl.style.display = options.icon ? 'block' : 'none';
            if (options.icon) iconEl.textContent = options.icon;
        }

        return new Promise((resolve) => {
            footer.innerHTML = '';
            
            const closeModal = () => {
                if (window.ModalManager) {
                    window.ModalManager.close('customConfirmModal');
                } else {
                    modal.classList.remove('active');
                    modal.style.display = 'none';
                }
            };

            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'btn btn-secondary';
            cancelBtn.textContent = options.cancelText || 'Cancel';
            cancelBtn.onclick = () => { closeModal(); resolve(false); };

            const okBtn = document.createElement('button');
            okBtn.className = options.isDanger ? 'btn btn-danger' : 'btn btn-primary';
            okBtn.textContent = options.okText || 'OK';
            okBtn.onclick = () => { closeModal(); resolve(true); };

            footer.appendChild(cancelBtn);
            footer.appendChild(okBtn);

            if (window.ModalManager) {
                window.ModalManager.open('customConfirmModal');
            } else {
                modal.style.display = 'flex';
                modal.classList.add('active');
            }
        });
    }
};

window.NotificationService = NotificationService;
export const showToast = (msg, type) => NotificationService.show(msg, type);
window.showToast = showToast;
