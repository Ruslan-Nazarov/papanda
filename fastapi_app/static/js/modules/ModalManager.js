/**
 * ModalManager.js - Premium Modal Controller with smooth transitions.
 */

export const ModalManager = {
    activeModals: [],

    open(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        // Dynamic Z-index management
        const baseZIndex = 2000;
        const newZIndex = baseZIndex + (this.activeModals.length * 10) + 5;
        modal.style.setProperty('z-index', newZIndex, 'important');

        // Set display flex first, then add active class on next paint for smooth transition
        modal.style.display = 'flex';
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                modal.classList.add('active');
            });
        });
        
        // Push to stack for ESC handling
        this.activeModals.push(modalId);

        // Prevent body scroll
        document.body.style.overflow = 'hidden';
    },

    close(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        // Dispatch an event so widgets can sync back unsubmitted data
        modal.dispatchEvent(new CustomEvent('modal-closed', { detail: { modalId } }));

        modal.classList.remove('active');
        
        // Wait for transition animation (200ms) to complete before hiding display
        setTimeout(() => {
            if (!modal.classList.contains('active')) {
                modal.style.display = 'none';
            }
        }, 200);

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
                if (e.target.dataset.preventOutsideClick === 'true') {
                    // Do nothing, preventing accidental close
                    return;
                }
                this.close(e.target.id);
            }
        });
    }
};

ModalManager.init();
window.ModalManager = ModalManager;
