/**
 * CanvasManager.js - Управление холстом и событиями клика
 */
export const CanvasManager = {
    init(container, callbacks) {
        if (!container) return;

        const handleCanvasClick = (e) => {
            const target = e.target || (e.changedTouches && e.changedTouches[0].target);
            if (!target) return;

            // Ignore if clicked on buttons or existing blocks
            if (target.closest('button, .resize-handle, .block-actions')) return;
            const b = target.closest('.dialectics-block');
            if (b) return;

            const r = container.getBoundingClientRect();
            const clientX = e.clientX || (e.changedTouches && e.changedTouches[0].clientX);
            const mid = r.left + (r.width / 2);
            
            callbacks.onClick(clientX, mid);
        };

        container.addEventListener('click', handleCanvasClick);
        container.addEventListener('touchend', (e) => {
            if (e.cancelable) e.preventDefault();
            handleCanvasClick(e.changedTouches[0]);
        });

        container.addEventListener('dblclick', (e) => {
            const b = e.target.closest('.dialectics-block');
            if (b) callbacks.onDoubleClick(b);
        });
    }
};
