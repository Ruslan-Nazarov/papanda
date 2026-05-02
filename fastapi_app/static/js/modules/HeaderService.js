/**
 * HeaderService.js - Manages dashboard header interactions (color picker, etc).
 */

export const HeaderService = {
    init() {
        window.toggleHeaderColorPicker = (e) => this.toggleColorPicker(e);
        window.setHeaderColor = (color, el) => this.setColor(color, el);
    },

    toggleColorPicker(e) {
        if (e) e.stopPropagation();
        const popup = document.getElementById('headerColorPickerPopup');
        const btn = document.getElementById('headerColorBtn');
        if (!popup || !btn) return;

        const isShown = popup.style.display === 'flex';
        const rect = btn.getBoundingClientRect();
        popup.style.left = (rect.left + window.scrollX - 50) + 'px';
        popup.style.top  = (rect.bottom + window.scrollY + 5) + 'px';
        popup.style.display = isShown ? 'none' : 'flex';
    },

    setColor(color, el) {
        const input = document.getElementById('headerCommonColor');
        const indicator = document.getElementById('headerColorIndicator');
        if (input) input.value = color;
        if (indicator) indicator.style.background = color || 'var(--color-border-medium)';

        document.querySelectorAll('#headerColorPickerPopup .color-dot').forEach(d => d.classList.remove('active'));
        if (el) el.classList.add('active');

        const popup = document.getElementById('headerColorPickerPopup');
        if (popup) popup.style.display = 'none';
    }
};
