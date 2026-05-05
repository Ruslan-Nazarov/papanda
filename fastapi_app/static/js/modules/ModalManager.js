/**
 * ModalManager.js - Premium Modal Controller with smooth transitions.
 */

export const ModalManager = {
    activeModals: [],

    open(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        // Ensure backdrop blur is active
        modal.classList.add('active');
        modal.style.display = 'flex';
        
        // Push to stack for ESC handling
        this.activeModals.push(modalId);

        // Prevent body scroll
        document.body.style.overflow = 'hidden';
    },

    close(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        modal.classList.remove('active');
        
        // Wait for animation
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);

        this.activeModals = this.activeModals.filter(id => id !== modalId);
        
        if (this.activeModals.length === 0) {
            document.body.style.overflow = '';
        }
    },

    init() {
        // Close on ESC
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.activeModals.length > 0) {
                this.close(this.activeModals[this.activeModals.length - 1]);
            }
        });

        // Close on click outside
        window.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('modal')) {
                this.close(e.target.id);
            }
        });
    }
};

ModalManager.init();
window.ModalManager = ModalManager;
