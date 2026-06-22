/**
 * ui_utils.js - Управление интерфейсом (Dialectics)
 */
export const DialecticsUI = {
    toggleDisplay(el, show, flex = false) {
        if (!el) return;
        el.style.display = show ? (flex ? 'flex' : 'block') : 'none';
    },
    setLoading(container, text = 'Loading...') {
        container.innerHTML = `<div style="color: #64748b; text-align: center; padding: 20px;">${text}</div>`;
    },
    clearLoading(container) {
        if (container) container.innerHTML = '';
    },
    setupDraggable(el, handle, state) {
        if (!el || !handle) return;
        let isDragging = false;
        let offset = { x: 0, y: 0 };
        handle.addEventListener('mousedown', (e) => {
            if (state && state.isExpanded) return;
            if (e.target.closest('button, input, textarea, [contenteditable="true"]')) return;
            isDragging = true;
            const rect = el.getBoundingClientRect();
            offset = { x: e.clientX - rect.left, y: e.clientY - rect.top };
            el.style.transition = 'none';
        });
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            let left = e.clientX - offset.x, top = e.clientY - offset.y;
            left = Math.max(-200, Math.min(left, window.innerWidth - 100));
            top = Math.max(0, Math.min(top, window.innerHeight - 50));
            el.style.left = `${left}px`; el.style.top = `${top}px`; el.style.position = 'fixed';
        });
        document.addEventListener('mouseup', () => { isDragging = false; el.style.transition = ''; });
    },
    setupResizable(el, handle) {
        if (!el || !handle) return;
        let isResizing = false;
        let startW, startH, startX, startY;
        handle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            isResizing = true;
            startW = el.offsetWidth;
            startH = el.offsetHeight;
            startX = e.clientX;
            startY = e.clientY;
            el.style.transition = 'none';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            const newW = startW + (e.clientX - startX);
            const newH = startH + (e.clientY - startY);
            
            if (newW > 350 && newW < window.innerWidth * 0.9) el.style.width = `${newW}px`;
            if (newH > 250 && newH < window.innerHeight * 0.9) el.style.height = `${newH}px`;
        });

        document.addEventListener('mouseup', () => {
            isResizing = false;
            el.style.transition = '';
        });
    }
};
