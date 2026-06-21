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
        picker.style.cssText = `
            display: none; 
            position: absolute; 
            z-index: 9999; 
            padding: 16px; 
            grid-template-columns: repeat(4, 1fr); 
            gap: 12px; 
            width: max-content;
            background: var(--color-bg-white, #ffffff);
            border: 1px solid var(--color-border-light, #e2e8f0);
            border-radius: 16px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
            transform-origin: top right;
            animation: popupScale 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        `;
        
        this.colors.forEach(color => {
            const dot = document.createElement('div');
            dot.style.cssText = `
                background: ${color}; 
                width: 32px; 
                height: 32px; 
                border-radius: 50%; 
                cursor: pointer; 
                box-shadow: inset 0 0 0 1px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.1); 
                transition: transform 0.2s, box-shadow 0.2s;
            `;
            dot.onmouseover = () => {
                dot.style.transform = 'scale(1.15)';
                dot.style.boxShadow = 'inset 0 0 0 1px rgba(0,0,0,0.05), 0 4px 10px rgba(0,0,0,0.15)';
            };
            dot.onmouseout = () => {
                dot.style.transform = 'scale(1)';
                dot.style.boxShadow = 'inset 0 0 0 1px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.1)';
            };
            dot.onclick = () => this.applyColor(color);
            picker.appendChild(dot);
        });
        
        // Add "Reset" option
        const reset = document.createElement('button');
        reset.title = 'Reset to default';
        reset.style.cssText = `
            background: var(--color-bg-subtle, #f8fafc); 
            color: var(--color-text-dark, #1e293b);
            cursor: pointer; 
            border: 1px solid var(--color-border-light, #e2e8f0); 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            font-size: 0.85rem;
            font-weight: 600;
            grid-column: span 4; 
            width: 100%; 
            border-radius: 10px; 
            margin-top: 4px;
            padding: 8px;
            transition: background 0.2s;
        `;
        reset.innerHTML = '⟲ Reset Color';
        reset.onmouseover = () => reset.style.background = 'var(--color-border-light, #e2e8f0)';
        reset.onmouseout = () => reset.style.background = 'var(--color-bg-subtle, #f8fafc)';
        reset.onclick = () => this.applyColor(null);
        picker.appendChild(reset);

        document.body.appendChild(picker);

        if (!document.getElementById('colorPickerStyles')) {
            const style = document.createElement('style');
            style.id = 'colorPickerStyles';
            style.innerHTML = `
                @keyframes popupScale {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
            `;
            document.head.appendChild(style);
        }
    },

    openColorPicker(btn) {
        const picker = document.getElementById('globalWidgetColorPicker');
        this.activeWidget = btn.closest('.grid-stack-item');
        
        if (!picker || !this.activeWidget) return;

        if (picker.style.display === 'grid' && this.lastClickedBtn === btn) {
            picker.style.display = 'none';
            this.lastClickedBtn = null;
            return;
        }

        picker.style.display = 'grid';
        this.lastClickedBtn = btn;
        
        const rect = btn.getBoundingClientRect();
        const width = picker.offsetWidth;
        
        picker.style.top = `${rect.bottom + window.scrollY + 8}px`;
        picker.style.left = `${rect.right + window.scrollX - width}px`;
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
