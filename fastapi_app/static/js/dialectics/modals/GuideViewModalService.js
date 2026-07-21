/**
 * GuideViewModalService.js - Модальные окна справки (Guide), справочника (Reference) и просмотра конспекта (View Note)
 */
export const GuideViewModalService = {
    async showReferenceModal(ctx) {
        const modal = document.getElementById('referenceDialecticsModal');
        if (!modal) return;
        modal.style.display = 'flex';

        const contentEl = document.getElementById('dialecticsReferenceContent');
        if (!contentEl) return;

        if (contentEl.dataset.loaded === 'true') return;

        try {
            contentEl.innerHTML = '<div style="color: #64748b; text-align: center; padding: 20px;">Загрузка справочника...</div>';
            const res = await fetch('/api/dialectics/reference');
            if (!res.ok) throw new Error("Failed to load reference");
            const data = await res.json();
            contentEl.innerHTML = `<div class="guide-markdown-content">${data.html}</div>`;
            contentEl.dataset.loaded = 'true';
        } catch (err) {
            console.error(err);
            contentEl.innerHTML = '<div style="color: #ef4444; text-align: center; padding: 20px;">Не удалось загрузить справочник.</div>';
        }
    },

    async showGuideModal(ctx) {
        const modal = document.getElementById('guideDialecticsModal');
        if (!modal) return;
        modal.style.display = 'flex';
        modal.offsetHeight; // trigger reflow
        modal.classList.add('active');

        const contentEl = document.getElementById('dialecticsGuideContent');
        if (!contentEl) return;

        if (contentEl.dataset.loaded === 'true') return;

        try {
            contentEl.innerHTML = '<div style="color: #64748b; text-align: center; padding: 20px;">Загрузка инструкции...</div>';
            const res = await fetch('/api/dialectics/guide');
            if (!res.ok) throw new Error("Failed to load guide");
            const data = await res.json();
            contentEl.innerHTML = `<div class="guide-markdown-content">${data.html}</div>`;
            contentEl.dataset.loaded = 'true';
        } catch (err) {
            console.error(err);
            contentEl.innerHTML = '<div style="color: #ef4444; text-align: center; padding: 20px;">Не удалось загрузить инструкцию.</div>';
        }
    },

    hideGuideModal(ctx) {
        const modal = document.getElementById('guideDialecticsModal');
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => modal.style.display = 'none', 200);
        }
    },

    showViewModal(ctx, id, title, blocks) {
        ctx.state.viewingNoteId = id;
        ctx.dom.viewTitle.textContent = title;

        let fullHtml = "";
        blocks.forEach(b => {
            fullHtml += `<div style="margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
                <small style="color: #94a3b8; text-transform: uppercase;">${b.side}</small>
                <div>${b.html}</div>
            </div>`;
        });

        ctx.dom.viewBody.innerHTML = fullHtml;
        ctx.dom.viewModal.style.display = 'flex';
        ctx.dom.viewModal.offsetHeight; // trigger reflow
        ctx.dom.viewModal.classList.add('active');
    },

    hideViewModal(ctx) {
        if (ctx.dom.viewModal) {
            ctx.dom.viewModal.classList.remove('active');
            setTimeout(() => ctx.dom.viewModal.style.display = 'none', 200);
        }
        ctx.state.viewingNoteId = null;
    }
};
