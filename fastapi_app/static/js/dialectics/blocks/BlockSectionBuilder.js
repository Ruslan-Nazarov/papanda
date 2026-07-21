/**
 * BlockSectionBuilder.js - Построение разделов/заголовков на холсте
 */
export const BlockSectionBuilder = {
    renderSectionBlock(factory, container, b, callbacks, logicalBlockIndex) {
        let titleText = b.title || '';
        if (!titleText) titleText = 'Раздел';
        
        const blockEl = document.createElement('div');
        blockEl.className = 'dialectics-block block-section';
        blockEl.dataset.blockId = b.id;
        if (b.role) blockEl.dataset.role = b.role;
        blockEl.dataset.isSection = 'true';
        blockEl.dataset.title = titleText;
        blockEl.innerHTML = `
            <div class="section-chapter-container" style="display: flex; align-items: baseline; justify-content: space-between; padding: 16px 8px 10px 8px; border-bottom: 2px solid #ea580c; cursor: pointer;" title="Нажмите, чтобы изменить название раздела">
                <div style="display: flex; align-items: baseline; gap: 12px;">
                    <span style="color: #ea580c; font-size: 1.5rem; line-height: 1;">📑</span>
                    <h2 class="block-title-text" style="margin: 0; font-size: 1.6rem; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; line-height: 1.2;">${titleText}</h2>
                </div>
                <div class="section-actions" style="display: flex; gap: 8px; opacity: 0; transition: opacity 0.2s;">
                    <button class="btn-section-edit" title="Изменить название" style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 6px; padding: 4px 10px; font-size: 0.85rem; font-weight: 600; color: #ea580c; cursor: pointer;">✎ Изменить</button>
                    <button class="btn-section-del" title="Удалить раздел" style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 4px 10px; font-size: 0.85rem; font-weight: 600; color: #dc2626; cursor: pointer;">🗑️</button>
                </div>
            </div>
        `;
        
        blockEl.onmouseenter = () => {
            const actions = blockEl.querySelector('.section-actions');
            if (actions) actions.style.opacity = '1';
        };
        blockEl.onmouseleave = () => {
            const actions = blockEl.querySelector('.section-actions');
            if (actions) actions.style.opacity = '0';
        };

        if (callbacks) {
            const containerEl = blockEl.querySelector('.section-chapter-container');
            if (containerEl && callbacks.onEdit) {
                containerEl.onclick = (e) => {
                    e.stopPropagation();
                    callbacks.onEdit(blockEl);
                };
            }
            const editBtn = blockEl.querySelector('.btn-section-edit');
            if (editBtn) {
                editBtn.onclick = (e) => {
                    e.stopPropagation();
                    if (callbacks.onEdit) callbacks.onEdit(blockEl);
                };
            }
            const delBtn = blockEl.querySelector('.btn-section-del');
            if (delBtn) {
                delBtn.onclick = (e) => {
                    e.stopPropagation();
                    if (callbacks.onDelete) {
                        const nextEl = blockEl.nextElementSibling;
                        if (nextEl && nextEl.classList.contains('block-insert-row')) {
                            nextEl.remove();
                        }
                        blockEl.remove();
                        callbacks.onDelete();
                    }
                };
            }
        }
        
        container.appendChild(blockEl);
        if (callbacks.onInsertAfter && factory.createInsertRow) {
            container.appendChild(factory.createInsertRow(callbacks, logicalBlockIndex + 1));
        }
    }
};
