/**
 * PAPANDA NOTIFICATION SERVICE
 * Replaces native alert() and confirm() with premium custom modals.
 */
window.NotificationService = {
    confirm: (message, options = {}) => {
        const modal = document.getElementById('customConfirmModal');
        const msgEl = document.getElementById('confirmModalMessage');
        const iconEl = document.getElementById('confirmModalIcon');
        const footer = document.getElementById('confirmModalFooter');

        if (!modal) {
            console.warn("customConfirmModal not found, falling back to native confirm");
            return Promise.resolve(window.confirm(message));
        }

        msgEl.textContent = message;
        iconEl.style.display = options.icon ? 'block' : 'none';
        if (options.icon) iconEl.textContent = options.icon;

        return new Promise((resolve) => {
            footer.innerHTML = '';
            
            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'btn btn-secondary';
            cancelBtn.textContent = options.cancelText || 'Cancel';
            cancelBtn.onclick = () => {
                modal.style.display = 'none';
                resolve(false);
            };

            const okBtn = document.createElement('button');
            okBtn.className = options.isDanger ? 'btn btn-danger' : 'btn btn-primary';
            okBtn.textContent = options.okText || 'OK';
            okBtn.onclick = () => {
                modal.style.display = 'none';
                resolve(true);
            };

            footer.appendChild(cancelBtn);
            footer.appendChild(okBtn);
            modal.style.display = 'block';
        });
    }
};
