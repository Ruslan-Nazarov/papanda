/**
 * ModalManager.js - Unified management for static and dynamic modals in Papanda.
 */

export class ModalManager {
    static _escListener = null;

    /**
     * Open a modal by ID
     * @param {string} modalId 
     */
    static open(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.warn(`[ModalManager] Modal with ID "${modalId}" not found.`);
            return;
        }
        
        modal.style.display = 'flex';
        modal.openedAt = Date.now();
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
        
        // Add escape key listener if not already added
        if (!this._escListener) {
            this._escListener = (e) => {
                if (e.key === 'Escape') this.closeLast();
            };
            window.addEventListener('keydown', this._escListener);
        }
    }

    /**
     * Close a modal by ID
     * @param {string} modalId 
     */
    static close(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        
        modal.style.display = 'none';
        
        // Restore scrolling if no other modals are open
        const openModals = document.querySelectorAll('.modal[style*="display: flex"], .modal-overlay[style*="display: flex"]');
        if (openModals.length === 0) {
            document.body.style.overflow = '';
        }
    }

    /**
     * Close the most recently opened modal (top of stack)
     */
    static closeLast() {
        const openModals = Array.from(document.querySelectorAll('.modal[style*="display: flex"], .modal-overlay[style*="display: flex"]'));
        if (openModals.length > 0) {
            const lastModal = openModals[openModals.length - 1];
            this.close(lastModal.id);
        }
    }

    /**
     * Global initialization: handle backdrop clicks
     */
    static initGlobal() {
        window.addEventListener('click', (e) => {
            const openModals = document.querySelectorAll('.modal[style*="display: flex"], .modal-overlay[style*="display: flex"]');
            openModals.forEach(modal => {
                if (e.target === modal) {
                    // Prevent accidental closes (e.g. if click was actually part of opening process)
                    if (modal.openedAt && (Date.now() - modal.openedAt < 300)) return;
                    this.close(modal.id);
                }
            });
        });
    }
}

// Global exports for backward compatibility and HTML onclicks
window.ModalManager = ModalManager;
window.openModal = (id) => ModalManager.open(id);
window.closeModal = (id) => ModalManager.close(id);
