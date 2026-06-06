/**
 * HeaderService.js - Manages dashboard header interactions (color picker, etc).
 */

export const HeaderService = {
    init() {
        window.HeaderService = this;
        window.toggleHeaderColorPicker = (e) => this.toggleColorPicker(e);
        window.setHeaderColor = (color, el) => this.setColor(color, el);
    },

    toggleColorPicker(e) {
        if (e) e.stopPropagation();
        const popup = document.getElementById('headerColorPickerPopup');
        if (popup) popup.classList.toggle('active');
    },

    setColor(color, el) {
        const input = document.getElementById('headerCommonColor');
        const indicator = document.getElementById('headerColorIndicator');
        if (input) input.value = color;
        if (indicator) indicator.style.background = color || 'var(--color-border-medium)';

        document.querySelectorAll('#headerColorPickerPopup .color-dot').forEach(d => d.classList.remove('active'));
        if (el) el.classList.add('active');

        const popup = document.getElementById('headerColorPickerPopup');
        if (popup) popup.classList.remove('active');
    },

    async refreshBadges() {
        try {
            const resp = await fetch('/api/header/widgets');
            if (resp.ok) {
                const html = await resp.text();
                const container = document.querySelector('.header-info-widgets');
                if (container) container.innerHTML = html;
            }
        } catch (e) { console.warn("[HeaderService] Failed to refresh header widgets", e); }
    }
};
