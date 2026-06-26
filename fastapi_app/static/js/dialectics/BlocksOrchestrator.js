import { DialecticsAPI } from './api.js';
import { DialecticsUI } from './ui_utils.js';
import { BlockManager } from './BlockManager.js';
import { CanvasManager } from './CanvasManager.js';
import { customConfirm, customChoice, customPrompt } from '../modal_controller.js';

export const BlocksOrchestratorMixin = {
    // --- Core Logic ---
    open(content = '') {
        if (this.dom.editor && !this.dom.editor.classList.contains('embedded')) {
            DialecticsUI.toggleDisplay(this.dom.editor, true, true);
        }
        const aiTab = document.getElementById('tab-ai');
        if (aiTab) aiTab.style.display = 'none';
        this.editor.switchTab('text');
        this.editor.setContent(content);

        if (!this.editor.tiptap && this.dom.dashboardTextarea) {
            const temp = document.createElement('div');
            temp.innerHTML = content;
            this.dom.dashboardTextarea.value = temp.innerText || temp.textContent || "";
            this.dom.dashboardTextarea.dispatchEvent(new Event('input'));
        }
    }

    openEdit(block) {
        const html = block.querySelector('.dialectics-content-inner')?.innerHTML || "";
        this.open(html);
    }

    close() {
        if (this.dom.editor) {
            this.dom.editor.style.display = 'none';
            this.dom.editor.classList.remove('embedded');
        }
        this.editor.setContent('');
        this.state.editingBlock = null;
        this.state.pendingSide = null;
        this.state.pendingRole = null;
        this.state.pendingBlockId = null;
        this.state.insertAfterIndex = null;
    }

    save() {
        this.saveGlobal(false, "toast.dialectics_saved");
    }

    createBlock(side, role, html, id, stickers = [], sources = [], insertAfterIndex = null) {
        const container = side === 'left' ? this.dom.leftCol : this.dom.rightCol;
        if (!container) return;

        const el = document.createElement('div');
        el.className = 'dialectics-block';
        el.dataset.id = id;
        el.dataset.side = side;
        el.dataset.role = role;
        if (stickers.length > 0) el.dataset.stickers = JSON.stringify(stickers);
        if (sources.length > 0) el.dataset.sources = JSON.stringify(sources);

        const badgeText = window._('dialectics.roles.' + role) || role;

        el.innerHTML = `
            <div class="dialectics-block-header">
                <span class="dialectics-block-badge">${badgeText}</span>
                <div class="dialectics-block-actions">
                    <button type="button" class="btn-block-action btn-block-sources" title="Источники">🔗</button>
                    <button type="button" class="btn-block-action btn-block-stickers" title="Стикеры">🏷️</button>
                    <button type="button" class="btn-block-action btn-block-edit" title="Редактировать">✏️</button>
                    <button type="button" class="btn-block-action btn-block-del" title="Удалить">🗑️</button>
                </div>
            </div>
            <div class="dialectics-content-inner">${html}</div>
            <div class="dialectics-stickers-container" style="display:none; margin-top:10px; border-top:1px dashed #e2e8f0; padding-top:8px;"></div>
        `;

        this.attachBlockEvents(el);

        if (insertAfterIndex !== null && insertAfterIndex !== undefined) {
            const allBlocks = Array.from(container.querySelectorAll('.dialectics-block'));
            if (insertAfterIndex < allBlocks.length) {
                allBlocks[insertAfterIndex].after(el);
            } else {
                container.appendChild(el);
            }
        } else {
            container.appendChild(el);
        }

        if (stickers.length > 0) {
            this.renderStickersForBlock(el);
        }
    }

    attachBlockEvents(el) {
        const editBtn = el.querySelector('.btn-block-edit');
        const delBtn = el.querySelector('.btn-block-del');
        const stickersBtn = el.querySelector('.btn-block-stickers');
        const sourcesBtn = el.querySelector('.btn-block-sources');

        if (editBtn) editBtn.onclick = () => {
            this.state.editingBlock = el;
            this.openEdit(el);
        };

        if (delBtn) delBtn.onclick = () => {
            el.remove();
            if (window.showToast) window.showToast(window._("toast.dialectics_updated", "Обновлено"), "success");
        };

        if (stickersBtn) stickersBtn.onclick = () => {
            this.openStickersForCurrent(el.dataset.id);
        };

        if (sourcesBtn) sourcesBtn.onclick = () => {
            this.openSourcesModal(el);
        };
    }

    initStickersModal() {
        const modal = document.getElementById('blockStickersModal');
        const addBtn = document.getElementById('btnAddStickerModal');
        const listEl = document.getElementById('modalStickersList');

        if (!modal || !addBtn) return;

        addBtn.onclick = () => {
            const blockId = modal.dataset.currentBlockId;
            if (!blockId) return;

            const textInput = document.getElementById('modalStickerText');
            const titleInput = document.getElementById('modalStickerTitle');
            const colorInput = document.getElementById('modalStickerColor');

            const text = textInput?.value?.trim();
            if (!text) {
                if (window.showToast) window.showToast("Введите текст стикера", "warning");
                return;
            }

            const block = document.querySelector(`.dialectics-block[data-id="${blockId}"]`);
            if (block) {
                let existing = [];
                try { existing = JSON.parse(block.dataset.stickers || "[]"); } catch(e){}
                existing.push({
                    text: text,
                    title: titleInput?.value?.trim() || "Важное примечание",
                    color: colorInput?.value || "#fff9c4",
                    type: "text"
                });
                block.dataset.stickers = JSON.stringify(existing);
                this.renderStickersForBlock(block);
                this.renderStickersListInModal(blockId);
                this.saveGlobal(false, "toast.dialectics_updated");
            }

            if (textInput) textInput.value = '';
            if (titleInput) titleInput.value = '';
        };
    }

    renderStickersListInModal(blockId) {
        const listEl = document.getElementById('modalStickersList');
        if (!listEl) return;
        listEl.innerHTML = '';

        const block = document.querySelector(`.dialectics-block[data-id="${blockId}"]`);
        if (!block) return;

        let stickers = [];
        try { stickers = JSON.parse(block.dataset.stickers || "[]"); } catch(e){}

        if (stickers.length === 0) {
            listEl.innerHTML = '<div style="color:#94a3b8; font-size:0.9rem; font-style:italic;">Стикеры пока не добавлены.</div>';
            return;
        }

        stickers.forEach((st, idx) => {
            const item = document.createElement('div');
            item.style.cssText = `background:${st.color || '#fff9c4'}; padding:10px; border-radius:6px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:flex-start; box-shadow:0 1px 2px rgba(0,0,0,0.05);`;
            item.innerHTML = `
                <div>
                    <div style="font-weight:bold; font-size:0.85rem; margin-bottom:4px; color:#334155;">${st.title || 'Примечание'}</div>
                    <div style="font-size:0.9rem; color:#1e293b; white-space:pre-wrap;">${st.text}</div>
                </div>
                <button type="button" class="btn-del-st" style="background:none; border:none; cursor:pointer; color:#ef4444; font-weight:bold; padding:0 4px;" title="Удалить">&times;</button>
            `;
            item.querySelector('.btn-del-st').onclick = () => {
                stickers.splice(idx, 1);
                block.dataset.stickers = JSON.stringify(stickers);
                this.renderStickersForBlock(block);
                this.renderStickersListInModal(blockId);
                this.saveGlobal(false, "toast.dialectics_updated");
            };
            listEl.appendChild(item);
        });
    }

    renderStickersForBlock(blockEl) {
        let stickers = [];
        try { stickers = JSON.parse(blockEl.dataset.stickers || "[]"); } catch(e){}

        const container = blockEl.querySelector('.dialectics-stickers-container');
        const btn = blockEl.querySelector('.btn-block-stickers');

        if (btn) {
            const countHtml = stickers.length > 0 ? `<span style="font-size:0.7rem; font-weight:bold; background:#e2e8f0; border-radius:10px; padding:2px 5px; margin-left:4px; color:#334155;">${stickers.length}</span>` : '';
            btn.innerHTML = `🏷️${countHtml}`;
        }

        if (!container) return;
        container.innerHTML = '';

        if (stickers.length === 0) {
            container.style.display = 'none';
            return;
        }

        container.style.display = 'flex';
        container.style.flexWrap = 'wrap';
        container.style.gap = '8px';

        stickers.forEach(st => {
            const pill = document.createElement('div');
            pill.style.cssText = `background:${st.color || '#fff9c4'}; padding:6px 10px; border-radius:6px; font-size:0.85rem; box-shadow:0 1px 2px rgba(0,0,0,0.05); border:1px solid rgba(0,0,0,0.05); max-width:100%;`;
            pill.innerHTML = `<strong style="display:block; font-size:0.75rem; color:#64748b; margin-bottom:2px;">${st.title || 'Примечание'}:</strong><span style="color:#1e293b; white-space:pre-wrap;">${st.text}</span>`;
            container.appendChild(pill);
        });
    }

    initHintEvents() {
        const hints = document.querySelectorAll('.dialectics-hint-block');
        hints.forEach(hintEl => {
            const btnAI = hintEl.querySelector('.btn-hint-ai');
            if (btnAI) {
                btnAI.onclick = (e) => {
                    e.stopPropagation();
                    this.runHintAI({
                        id: hintEl.dataset.stepId || hintEl.dataset.id,
                        side: hintEl.dataset.side
                    });
                };
            }

            hintEl.onclick = () => {
                this.openHintEditor({
                    id: hintEl.dataset.stepId || hintEl.dataset.id,
                    side: hintEl.dataset.side
                });
            };
        });
    }

    bindEvents() {
        if (this.dom.btnSave) this.dom.btnSave.onclick = () => this.save();
        if (this.dom.btnCancel) this.dom.btnCancel.onclick = () => this.close();
        if (this.dom.btnClose) this.dom.btnClose.onclick = () => this.close();

        // Global delegator for dynamically added blocks or hints
        document.addEventListener('click', (e) => {
            const badge = e.target.closest('.dialectics-hint-badge');
            if (badge) {
                e.preventDefault();
                e.stopPropagation();
                const hintEl = badge.closest('.dialectics-hint-block');
                if (hintEl) {
                    this.openHintEditor({
                        id: hintEl.dataset.stepId || hintEl.dataset.id,
                        side: hintEl.dataset.side
                    });
                }
                return;
            }

            const aiBtn = e.target.closest('.btn-hint-ai');
            if (aiBtn) {
                e.preventDefault();
                e.stopPropagation();
                const hintEl = aiBtn.closest('.dialectics-hint-block');
                if (hintEl) {
                    this.runHintAI({
                        id: hintEl.dataset.stepId || hintEl.dataset.id,
                        side: hintEl.dataset.side
                    });
                }
                return;
            }
        });

        // Setup callbacks for BlockManager
        if (window.BlockManager) {
            window.BlockManager.setCallbacks({
                onEdit: (block) => this.openEdit(block),
                onDelete: async () => { await this.saveGlobal(false, "toast.dialectics_updated"); const blocks = BlockManager.getBlocks(this.dom.canvas); BlockManager.render(this.dom.canvas, blocks, this._blockCallbacks()); },
                onHintClick: (hint) => this.openHintEditor(hint),
                onHintAI: (hint) => (hint && hint.id === 'step3' ? this.runAI(this.dom.canvas) : this.runHintAI(hint))
            });
        }
    }

    openHintEditor(hint, content = '', aiHtml = null) {
        this.state.editingBlock = null;
        this.state.pendingSide = hint.side;
        this.state.pendingRole = hint.id;
        this.state.pendingBlockId = 'block_' + Math.random().toString(36).substr(2, 9);
        this.state.insertAfterIndex = null;
        this.open(content);

        const aiTab = document.getElementById('tab-ai');
        if (aiHtml) {
            if (aiTab) aiTab.style.display = 'flex';
            const aiContainer = document.getElementById('aiHelpContent');
            if (aiContainer) aiContainer.innerHTML = aiHtml;
            const copyBtn = document.getElementById('btnCopyAiToText');
            if (copyBtn) {
                copyBtn.onclick = () => {
                    this.editor.setContent(aiHtml);
                    this.editor.switchTab('text');
                    if (window.showToast) window.showToast(window._("dialectics.ai_transferred", "Текст от ИИ перенесен в редактор"), "success");
                };
            }
            this.editor.switchTab('ai');
        } else {
            if (aiTab) aiTab.style.display = 'none';
        }
    }

    toggleExpand() {
        this.state.isExpanded = !this.state.isExpanded;
        if (this.dom.editor) {
            this.dom.editor.classList.toggle('expanded', this.state.isExpanded);
            if (this.dom.backdrop) DialecticsUI.toggleDisplay(this.dom.backdrop, this.state.isExpanded);
        }
        // Resize Fabric.js canvas to match new wrapper dimensions after transition
        setTimeout(() => {
            const wrapper = document.getElementById('shapesCanvasWrapper');
            const fabricCanvas = this.editor && this.editor.fabricCanvas;
            if (wrapper && fabricCanvas) {
                const newW = wrapper.clientWidth;
                const newH = wrapper.clientHeight;
                if (newW > 10 && newH > 10) {
                    fabricCanvas.setWidth(newW);
                    fabricCanvas.setHeight(newH);
                    fabricCanvas.calcOffset();
                    fabricCanvas.renderAll();
                }
            }
        }, 320); // wait for CSS transition to finish
    }

    // Returns the standard callbacks object for BlockManager.render
    _blockCallbacks() {
        return {
            onEdit: (b) => { this.state.editingBlock = b; this.openEdit(b); },
            onInsertAfter: (side, index) => { this.openInsertAfter(side, index); },
            onDelete: async () => { await this.saveGlobal(false, "toast.dialectics_updated"); const blocks = BlockManager.getBlocks(this.dom.canvas); BlockManager.render(this.dom.canvas, blocks, this._blockCallbacks()); },
            onAI: (b) => { this.runAI(b); },
            onSources: (b) => { this.openSourcesModal(b); },
            onHintClick: (hint) => { this.openHintEditor(hint); },
            onHintAI: (hint) => { if (hint && hint.id === 'step3') { this.runAI(this.dom.canvas); } else { this.runHintAI(hint); } }
        };
    }

    openSourcesModal(blockEl) {
        const modal = document.getElementById('blockSourcesModal');
        const listEl = document.getElementById('sourcesList');
        const urlInput = document.getElementById('sourceUrl');
        const titleInput = document.getElementById('sourceTitle');
        const quoteInput = document.getElementById('sourceQuote');
        const addBtn = document.getElementById('btnAddSource');

        if (!modal || !listEl) return;

        let sources = [];
        try {
            if (blockEl.dataset.sources) {
                sources = JSON.parse(blockEl.dataset.sources);
            }
        } catch(e) {}

        const renderList = () => {
            listEl.innerHTML = '';
            if (sources.length === 0) {
                listEl.innerHTML = `<div style="color:#94a3b8; font-size:0.9rem; font-style:italic;">Источники пока не добавлены.</div>`;
                return;
            }
            sources.forEach((s, idx) => {
                const item = document.createElement('div');
                item.style.cssText = 'background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px 14px; display:flex; justify-content:space-between; align-items:flex-start; gap:12px;';
                
                let linkHtml = s.title || s.url;
                if (s.url) {
                    let safeUrl = s.url.startsWith('http') ? s.url : 'https://' + s.url;
                    linkHtml = `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="color:#2563eb; font-weight:600; text-decoration:none;">${s.title || s.url}</a>`;
                } else {
                    linkHtml = `<span style="font-weight:600; color:#1e293b;">${s.title}</span>`;
                }

                let quoteHtml = '';
                if (s.quote) {
                    quoteHtml = `<div style="font-size:0.85rem; color:#475569; margin-top:4px; white-space:pre-wrap;">${s.quote}</div>`;
                }

                item.innerHTML = `
                    <div style="flex-grow:1; overflow:hidden;">
                        ${linkHtml}
                        ${quoteHtml}
                    </div>
                    <button type="button" class="btn-del-src" style="background:none; border:none; cursor:pointer; color:#ef4444; font-size:1.2rem; padding:0 4px; line-height:1;" title="Удалить">&times;</button>
                `;

                item.querySelector('.btn-del-src').onclick = () => {
                    sources.splice(idx, 1);
                    updateBlockData();
                    renderList();
                };

                listEl.appendChild(item);
            });
        };

        const updateBlockData = () => {
            blockEl.dataset.sources = JSON.stringify(sources);
            const btn = blockEl.querySelector('.btn-block-sources');
            if (btn) {
                const countHtml = sources.length > 0 ? `<span style="font-size:0.7rem; font-weight:bold; background:#e2e8f0; border-radius:10px; padding:2px 5px; margin-left:4px; color:#334155;">${sources.length}</span>` : '';
                btn.innerHTML = `🔗${countHtml}`;
            }
            this.saveGlobal(false, "toast.dialectics_updated");
        };

        addBtn.onclick = () => {
            const url = urlInput ? urlInput.value.trim() : '';
            const title = titleInput ? titleInput.value.trim() : '';
            const quote = quoteInput ? quoteInput.value.trim() : '';

            if (!url && !title && !quote) {
                if (window.showToast) window.showToast("Введите информацию об источнике", "warning");
                return;
            }

            sources.push({ url, title, quote });
            if (urlInput) urlInput.value = '';
            if (titleInput) titleInput.value = '';
            if (quoteInput) quoteInput.value = '';

            updateBlockData();
            renderList();
        };

        renderList();
        modal.style.display = 'flex';
    }


};
