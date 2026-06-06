/**
 * WidgetSettingsService.js
 * Manages individual widget configurations like border colors.
 */

window.WidgetSettings = {
    activeWidget: null,
    
    colors: [
        '#6366f1', '#f43f5e', '#10b981', '#f59e0b', 
        '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
        '#3b82f6', '#ef4444', '#14b8a6', '#f97316'
    ],

    init() {
        this.createPickerUI();
        this.applySavedColors();
        
        // Close picker when clicking outside
        document.addEventListener('click', (e) => {
            const picker = document.getElementById('globalWidgetColorPicker');
            if (picker && !picker.contains(e.target) && !e.target.classList.contains('widget-settings-trigger')) {
                picker.style.display = 'none';
            }
        });
    },

    createPickerUI() {
        if (document.getElementById('globalWidgetColorPicker')) return;
        
        const picker = document.createElement('div');
        picker.id = 'globalWidgetColorPicker';
        picker.className = 'premium-popup';
        picker.style.cssText = 'display: none; position: fixed; z-index: 9999; padding: 12px; grid-template-columns: repeat(4, 1fr); gap: 8px; width: 160px;';
        
        this.colors.forEach(color => {
            const dot = document.createElement('div');
            dot.className = 'color-dot';
            dot.style.cssText = `background: ${color}; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; border: 2px solid white; box-shadow: var(--shadow-sm); transition: transform 0.2s;`;
            dot.onmouseover = () => dot.style.transform = 'scale(1.2)';
            dot.onmouseout = () => dot.style.transform = 'scale(1)';
            dot.onclick = () => this.applyColor(color);
            picker.appendChild(dot);
        });
        
        // Add "Reset" option
        const reset = document.createElement('div');
        reset.className = 'color-dot';
        reset.title = 'Reset to default';
        reset.style.cssText = 'background: #e2e8f0; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; border: 2px solid white; box-shadow: var(--shadow-sm); display: flex; align-items: center; justify-content: center; font-size: 14px; grid-column: span 4; width: 100%; border-radius: 6px; margin-top: 4px;';
        reset.innerHTML = '↺ Reset';
        reset.onclick = () => this.applyColor(null);
        picker.appendChild(reset);

        document.body.appendChild(picker);
    },

    openColorPicker(btn) {
        const picker = document.getElementById('globalWidgetColorPicker');
        // Find the grid-stack-item which holds the canonical ID
        this.activeWidget = btn.closest('.grid-stack-item');
        
        if (!picker || !this.activeWidget) return;

        const rect = btn.getBoundingClientRect();
        picker.style.top = `${rect.bottom + 8}px`;
        picker.style.left = `${rect.right - 160}px`;
        picker.style.display = 'grid';
    },

    applyColor(color) {
        if (!this.activeWidget) return;
        
        const widgetId = this.activeWidget.id || this.activeWidget.getAttribute('gs-id');
        if (!widgetId) return;

        if (color) {
            this.activeWidget.style.setProperty('--widget-border-color', color);
        } else {
            this.activeWidget.style.removeProperty('--widget-border-color');
        }
        
        document.getElementById('globalWidgetColorPicker').style.display = 'none';
        
        // Save to layout
        this.saveColorToLayout(widgetId, color);
    },

    async saveColorToLayout(widgetId, color) {
        if (!window.P_DASHBOARD_LAYOUT) return;
        
        // Ensure the item exists in layout
        if (!window.P_DASHBOARD_LAYOUT[widgetId]) {
            window.P_DASHBOARD_LAYOUT[widgetId] = { id: widgetId };
        }
        
        window.P_DASHBOARD_LAYOUT[widgetId].border_color = color;

        // Trigger global layout save
        if (window.saveLayout) {
            window.saveLayout();
        }
    },

    applySavedColors() {
        if (!window.P_DASHBOARD_LAYOUT) return;
        
        Object.entries(window.P_DASHBOARD_LAYOUT).forEach(([id, data]) => {
            if (data.border_color) {
                // Find by ID or gs-id
                const el = document.getElementById(id) || document.querySelector(`.grid-stack-item[gs-id="${id}"]`);
                if (el) {
                    el.style.setProperty('--widget-border-color', data.border_color);
                }
            }
        });
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    WidgetSettings.init();
});
