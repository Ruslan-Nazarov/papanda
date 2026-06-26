/**
 * WidgetManager.js
 * Manages floating AI widgets (Article Parser, Formula Parser, etc.)
 * Handles side-by-side docking and horizontal bottom taskbar minimization.
 */

(function() {
    const WIDGET_WIDTH = 400;
    const WIDGET_GAP = 20;
    const START_RIGHT = 20;

    class WidgetManagerClass {
        constructor() {
            this.registry = {
                'articleParserWidget': { id: 'articleParserWidget', title: '📄 Парсер статей', icon: '📄' },
                'formulaParserWidget': { id: 'formulaParserWidget', title: '🧮 Парсер формул', icon: '🧮' }
            };
            this.openWidgets = [];
            this.minimizedWidgets = [];
        }

        register(id, title, icon) {
            this.registry[id] = { id, title, icon };
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
            this.openWidgets.forEach((id, idx) => {
                const el = document.getElementById(id);
                if (!el) return;
                const rightPos = START_RIGHT + idx * (WIDGET_WIDTH + WIDGET_GAP);
                el.style.right = rightPos + 'px';
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
                return `<button class="dock-widget-btn" onclick="window.WidgetManager && window.WidgetManager.open('${id}')" title="Развернуть">
                            <span class="dock-icon">${meta.icon}</span>
                            <span>${meta.title}</span>
                        </button>`;
            }).join('');
        }
    }

    window.WidgetManager = new WidgetManagerClass();

    // Make floating widget headers draggable
    function makeDraggable(widgetId, handleId) {
        const widget = document.getElementById(widgetId);
        const handle = document.getElementById(handleId);
        if (!widget || !handle) return;

        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        handle.onmousedown = dragMouseDown;

        function dragMouseDown(e) {
            if (['BUTTON', 'INPUT', 'SELECT', 'A'].includes(e.target.tagName)) return;
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }

        function elementDrag(e) {
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            widget.style.top = (widget.offsetTop - pos2) + "px";
            widget.style.left = (widget.offsetLeft - pos1) + "px";
            widget.style.bottom = "auto";
            widget.style.right = "auto";
        }

        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        makeDraggable('articleParserWidget', 'articleParserDragHandle');
        makeDraggable('formulaParserWidget', 'formulaParserDragHandle');
    });
})();
