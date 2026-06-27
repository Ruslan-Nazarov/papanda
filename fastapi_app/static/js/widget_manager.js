/**
 * WidgetManager.js
 * Manages floating AI widgets (Article Parser, Formula Parser, etc.)
 * Handles side-by-side docking, stable viewport dragging, and bottom taskbar minimization.
 */

(function() {
    const WIDGET_WIDTH = 400;
    const WIDGET_GAP = 20;
    const START_RIGHT = 20;

    class WidgetManagerClass {
        constructor() {
            this.registry = {
                'articleParserWidget': { id: 'articleParserWidget', title: 'Парсер статей', icon: '📄' },
                'formulaParserWidget': { id: 'formulaParserWidget', title: 'Парсер формул', icon: '🧮' }
            };
            this.openWidgets = [];
            this.minimizedWidgets = [];
        }

        saveState() {
            try {
                const positions = {};
                Object.keys(this.registry).forEach(id => {
                    const el = document.getElementById(id);
                    if (el) {
                        positions[id] = {
                            left: el.style.left,
                            top: el.style.top,
                            right: el.style.right,
                            bottom: el.style.bottom,
                            width: el.style.width,
                            height: el.style.height,
                            dragged: el.dataset.dragged
                        };
                    }
                });
                localStorage.setItem('papanda_widgets_state', JSON.stringify({
                    openWidgets: this.openWidgets,
                    minimizedWidgets: this.minimizedWidgets,
                    positions: positions
                }));
            } catch (e) {}
        }

        loadState() {
            try {
                const data = JSON.parse(localStorage.getItem('papanda_widgets_state') || 'null');
                if (!data) return;
                if (data.positions) {
                    Object.keys(data.positions).forEach(id => {
                        const el = document.getElementById(id);
                        const pos = data.positions[id];
                        if (el && pos) {
                            if (pos.left) el.style.left = pos.left;
                            if (pos.top) el.style.top = pos.top;
                            if (pos.right) el.style.right = pos.right;
                            if (pos.bottom) el.style.bottom = pos.bottom;
                            if (pos.width) el.style.width = pos.width;
                            if (pos.height) el.style.height = pos.height;
                            if (pos.dragged) el.dataset.dragged = pos.dragged;
                        }
                    });
                }
                if (Array.isArray(data.openWidgets)) {
                    data.openWidgets.forEach(id => this.open(id));
                }
                if (Array.isArray(data.minimizedWidgets)) {
                    data.minimizedWidgets.forEach(id => this.minimize(id));
                }
            } catch (e) {}
        }

        register(id, title, icon) {
            this.registry[id] = { id, title, icon };
        }

        bringToFront(id) {
            this.openWidgets.forEach(wId => {
                const el = document.getElementById(wId);
                if (el) {
                    el.style.zIndex = (wId === id) ? '1005' : '1000';
                }
            });
        }

        open(id) {
            const el = document.getElementById(id);
            if (!el) return;

            // Remove from minimized if present
            this.minimizedWidgets = this.minimizedWidgets.filter(w => w !== id);
            
            // Add to open if not present
            if (!this.openWidgets.includes(id)) {
                this.openWidgets.push(id);
            }

            el.style.display = 'flex';
            el.classList.remove('minimized');
            
            this.bringToFront(id);
            this.recalculatePositions();
            this.renderDock();
        }

        close(id) {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';

            this.openWidgets = this.openWidgets.filter(w => w !== id);
            this.minimizedWidgets = this.minimizedWidgets.filter(w => w !== id);

            this.recalculatePositions();
            this.renderDock();
        }

        minimize(id) {
            const el = document.getElementById(id);
            if (el) {
                el.classList.add('minimized');
                setTimeout(() => {
                    if (el.classList.contains('minimized')) el.style.display = 'none';
                }, 250);
            }

            this.openWidgets = this.openWidgets.filter(w => w !== id);
            if (!this.minimizedWidgets.includes(id)) {
                this.minimizedWidgets.push(id);
            }

            this.recalculatePositions();
            this.renderDock();
        }

        toggle(id) {
            if (this.openWidgets.includes(id)) {
                this.minimize(id);
            } else {
                this.open(id);
            }
        }

        recalculatePositions() {
            let dockIndex = 0;
            this.openWidgets.forEach((id) => {
                const el = document.getElementById(id);
                if (!el) return;
                
                // Не переопределять координаты окон, которые пользователь перетащил вручную
                if (el.dataset.dragged === 'true') return;

                const rightPos = START_RIGHT + dockIndex * (WIDGET_WIDTH + WIDGET_GAP);
                el.style.right = rightPos + 'px';
                el.style.bottom = '20px';
                el.style.left = 'auto';
                el.style.top = 'auto';
                dockIndex++;
            });
        }

        renderDock() {
            const dockContainer = document.getElementById('bottomWidgetDock');
            const dockBar = document.getElementById('widgetDockBar');
            if (!dockContainer || !dockBar) return;

            if (this.minimizedWidgets.length === 0) {
                dockContainer.style.display = 'none';
                dockBar.innerHTML = '';
                return;
            }

            dockContainer.style.display = 'block';
            dockBar.innerHTML = this.minimizedWidgets.map(id => {
                const meta = this.registry[id] || { title: id, icon: '📦' };
                const cleanTitle = meta.title.replace(/^[\uD800-\uDBFF\uDC00-\uDFFF\u2600-\u27BF📄🧮📦\s]+/g, '');
                return `<button class="dock-widget-btn" onclick="window.WidgetManager && window.WidgetManager.open('${id}')" title="Развернуть">
                            <span class="dock-icon">${meta.icon}</span>
                            <span>${cleanTitle}</span>
                        </button>`;
            }).join('');
            this.saveState();
        }
    }

    window.WidgetManager = new WidgetManagerClass();

    // Надежное перетаскивание плавающих виджетов за заголовок
    function makeDraggable(widgetId, handleId) {
        const widget = document.getElementById(widgetId);
        const handle = document.getElementById(handleId);
        if (!widget || !handle) return;

        // Клик по окну выводит его на передний план
        widget.addEventListener('mousedown', () => {
            if (window.WidgetManager) window.WidgetManager.bringToFront(widgetId);
        });

        handle.addEventListener('mousedown', (e) => {
            if (['BUTTON', 'INPUT', 'SELECT', 'A'].includes(e.target.tagName)) return;
            e.preventDefault();

            if (window.WidgetManager) window.WidgetManager.bringToFront(widgetId);

            const rect = widget.getBoundingClientRect();
            const shiftX = e.clientX - rect.left;
            const shiftY = e.clientY - rect.top;

            // Помечаем виджет как перемещенный вручную
            widget.dataset.dragged = 'true';

            function elementDrag(e) {
                e.preventDefault();
                let newLeft = e.clientX - shiftX;
                let newTop = e.clientY - shiftY;

                const maxLeft = window.innerWidth - 60;
                const maxTop = window.innerHeight - 60;
                newLeft = Math.max(-WIDGET_WIDTH + 60, Math.min(maxLeft, newLeft));
                newTop = Math.max(0, Math.min(maxTop, newTop));

                widget.style.left = newLeft + 'px';
                widget.style.top = newTop + 'px';
                widget.style.right = 'auto';
                widget.style.bottom = 'auto';
            }

            function closeDragElement() {
                document.removeEventListener('mousemove', elementDrag);
                document.removeEventListener('mouseup', closeDragElement);
                if (window.WidgetManager) window.WidgetManager.saveState();
            }

            document.addEventListener('mousemove', elementDrag);
            document.addEventListener('mouseup', closeDragElement);
        });

        // Двойной клик по заголовку возвращает виджет в исходную стыковку (док)
        handle.addEventListener('dblclick', (e) => {
            if (['BUTTON', 'INPUT', 'SELECT', 'A'].includes(e.target.tagName)) return;
            widget.dataset.dragged = 'false';
            widget.style.left = 'auto';
            widget.style.top = 'auto';
            widget.style.bottom = '20px';
            if (window.WidgetManager) {
                window.WidgetManager.recalculatePositions();
                window.WidgetManager.saveState();
            }
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        makeDraggable('articleParserWidget', 'articleParserDragHandle');
        makeDraggable('formulaParserWidget', 'formulaParserDragHandle');
        setTimeout(() => {
            if (window.WidgetManager) window.WidgetManager.loadState();
        }, 100);
    });
})();
