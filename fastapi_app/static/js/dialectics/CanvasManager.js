/**
 * CanvasManager.js - Управление холстом и событиями клика
 */
export const CanvasManager = {
    init(container, callbacks) {
        if (!container) return;

        let lastTriggerTime = 0;

        const triggerAction = (target, clientX) => {
            const now = Date.now();
            if (now - lastTriggerTime < 500) return; // Prevent duplicate trigger from touchend + dblclick
            lastTriggerTime = now;

            if (target.closest('button, .resize-handle, .block-actions')) return;
            const b = target.closest('.dialectics-block');
            if (b) {
                if (callbacks.onDoubleClick) callbacks.onDoubleClick(b);
            } else {
                const r = container.getBoundingClientRect();
                const mid = r.left + (r.width / 2);
                if (callbacks.onClick) callbacks.onClick(clientX, mid);
            }
        };

        // Desktop / Mouse double click
        container.addEventListener('dblclick', (e) => {
            if (!e.target) return;
            triggerAction(e.target, e.clientX);
        });

        // Touch screen double tap detection
        let lastTouchTime = 0;
        let lastTouchTarget = null;
        container.addEventListener('touchend', (e) => {
            const touch = e.changedTouches && e.changedTouches[0];
            if (!touch) return;
            const target = touch.target;
            if (!target || target.closest('button, .resize-handle, .block-actions')) return;

            const now = Date.now();
            if (now - lastTouchTime < 350 && (lastTouchTarget === target || target.closest('.dialectics-block') === lastTouchTarget?.closest('.dialectics-block'))) {
                if (e.cancelable) e.preventDefault();
                lastTouchTime = 0;
                lastTouchTarget = null;
                triggerAction(target, touch.clientX);
            } else {
                lastTouchTime = now;
                lastTouchTarget = target;
            }
        });
    }
};
