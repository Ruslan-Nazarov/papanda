export class EditorDragBehavior {
    static makeDraggable(modalEl, headerEl, lifecycle) {
        if (!modalEl || !headerEl) return;

        let isDragging = false;
        let startX = 0, startY = 0, initialLeft = 0, initialTop = 0;

        headerEl.style.cursor = 'grab';

        const onMouseDown = (e) => {
            if (e.target.closest('button') || e.target.closest('input') || e.target.closest('.modal-toolbar')) return;
            isDragging = true;
            headerEl.style.cursor = 'grabbing';
            startX = e.clientX;
            startY = e.clientY;
            initialLeft = modalEl.offsetLeft;
            initialTop = modalEl.offsetTop;
            e.preventDefault();
        };

        const onMouseMove = (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            const newLeft = Math.max(8, Math.min(window.innerWidth - modalEl.offsetWidth - 8, initialLeft + dx));
            const newTop = Math.max(8, Math.min(window.innerHeight - modalEl.offsetHeight - 8, initialTop + dy));
            modalEl.style.left = `${newLeft}px`;
            modalEl.style.top = `${newTop}px`;
        };

        const onMouseUp = () => {
            if (isDragging) {
                isDragging = false;
                headerEl.style.cursor = 'grab';
            }
        };

        lifecycle.on(headerEl, 'mousedown', onMouseDown);
        lifecycle.on(document, 'mousemove', onMouseMove);
        lifecycle.on(document, 'mouseup', onMouseUp);
    }
}
