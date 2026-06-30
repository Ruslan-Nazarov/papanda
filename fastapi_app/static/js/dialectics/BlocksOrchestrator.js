import { DialecticsAPI } from './api.js';
import { DialecticsUI } from './ui_utils.js';
import { BlockManager, COLOR_PRESETS } from './BlockManager.js';
import { CanvasManager } from './CanvasManager.js';
import { customConfirm, customChoice, customPrompt } from '../modal_controller.js';

class BlocksOrchestratorClass {
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
        try { localStorage.setItem('papanda_editor_open_state', JSON.stringify({ isOpen: true, content })); } catch(e) {}
    }

    openEdit(block) {
        const html = block.querySelector('.dialectics-content-inner')?.innerHTML || "";
        const titleInput = document.getElementById('editorBlockTitleInput');
        if (titleInput) {
            titleInput.value = block.dataset.title || "";
        }
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
        try { localStorage.setItem('papanda_editor_open_state', JSON.stringify({ isOpen: false })); } catch(e) {}
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
                onHintAI: (hint) => (hint && hint.id === 'step3' ? this.runAI(this.dom.canvas) : this.runHintAI(hint)),
                onHacks: (block) => this.openHacksPopover(block)
            });
        }
    }

    openHintEditor(hint, content = '', aiHtml = null) {
        this.state.editingBlock = null;
        this.state.pendingSide = hint.side;
        this.state.pendingRole = hint.id;
        this.state.pendingBlockId = 'block_' + Math.random().toString(36).substr(2, 9);
        this.state.insertAfterIndex = null;
        const titleInput = document.getElementById('editorBlockTitleInput');
        if (titleInput) {
            titleInput.value = "";
        }
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
            onEdit: (b) => { 
                if (b.classList.contains('block-section') || b.dataset.isSection === 'true') {
                    this.openSectionTitleModal(null, b);
                    return;
                }
                this.state.editingBlock = b; 
                this.openEdit(b); 
            },
            onInsertAfter: (side, index) => { this.openInsertAfter(side, index); },
            onDelete: async () => { await this.saveGlobal(false, "toast.dialectics_updated"); const blocks = BlockManager.getBlocks(this.dom.canvas); BlockManager.render(this.dom.canvas, blocks, this._blockCallbacks()); },
            onAI: (b) => { this.runAI(b); },
            onSources: (b) => { this.openSourcesModal(b); },
            onWords: (b) => { this.openWordsModal(b); },
            onColor: (b) => { this.openColorModal(b); },
            onHintClick: (hint) => { this.openHintEditor(hint); },
            onHintAI: (hint) => { if (hint && hint.id === 'step3') { this.runAI(this.dom.canvas); } else { this.runHintAI(hint); } },
            onFoldToggle: () => { this.saveGlobal(false, "toast.dialectics_updated"); },
            onHacks: (b) => { this.openHacksPopover(b); }
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

    openWordsModal(blockEl) {
        const modal = document.getElementById('blockWordsModal');
        const listEl = document.getElementById('wordsList');
        const termInput = document.getElementById('wordTerm');
        const definitionInput = document.getElementById('wordDefinition');
        const connectionsInput = document.getElementById('wordConnections');
        const addBtn = document.getElementById('btnAddWord');

        if (!modal || !listEl) return;

        let words = [];
        try {
            if (blockEl.dataset.words) {
                words = JSON.parse(blockEl.dataset.words);
            }
        } catch(e) {}

        const renderList = () => {
            listEl.innerHTML = '';
            if (words.length === 0) {
                listEl.innerHTML = `<div style="color:#94a3b8; font-size:0.9rem; font-style:italic;">Словарь блока пуст.</div>`;
                return;
            }
            words.forEach((w, idx) => {
                const item = document.createElement('div');
                item.style.cssText = 'background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px 14px; display:flex; justify-content:space-between; align-items:flex-start; gap:12px; margin-bottom: 8px;';
                
                let connHtml = '';
                if (w.connections) {
                    connHtml = `<div style="font-size:0.8rem; color:#64748b; margin-top:4px;"><b>Связи:</b> ${w.connections}</div>`;
                }

                item.innerHTML = `
                    <div style="flex-grow:1; overflow:hidden;">
                        <span style="font-weight:600; color:#1e40af;">📖 ${w.word}</span>
                        <div style="font-size:0.85rem; color:#475569; margin-top:4px; white-space:pre-wrap;">${w.definition}</div>
                        ${connHtml}
                    </div>
                    <button type="button" class="btn-del-word" style="background:none; border:none; cursor:pointer; color:#ef4444; font-size:1.2rem; padding:0 4px; line-height:1;" title="Удалить">&times;</button>
                `;

                item.querySelector('.btn-del-word').onclick = () => {
                    words.splice(idx, 1);
                    updateBlockData();
                    renderList();
                };

                listEl.appendChild(item);
            });
        };

        const updateBlockData = () => {
            blockEl.dataset.words = JSON.stringify(words);
            const btn = blockEl.querySelector('.btn-block-words');
            if (btn) {
                const countHtml = words.length > 0 ? `<span style="font-size:0.7rem; font-weight:bold; background:#e2e8f0; border-radius:10px; padding:2px 5px; margin-left:4px; color:#334155;">${words.length}</span>` : '';
                btn.innerHTML = `📖${countHtml}`;
            }
            this.saveGlobal(false, "toast.dialectics_updated");
            
            // Re-render blocks to update the displayed badges
            const allBlocks = BlockManager.getBlocks(this.dom.canvas);
            BlockManager.render(this.dom.canvas, allBlocks, this._blockCallbacks());
        };

        addBtn.onclick = () => {
            const word = termInput ? termInput.value.trim() : '';
            const definition = definitionInput ? definitionInput.value.trim() : '';
            const connections = connectionsInput ? connectionsInput.value.trim() : '';

            if (!word || !definition) {
                if (window.showToast) window.showToast("Введите понятие и его объяснение", "warning");
                return;
            }

            // Check duplicate word in current block
            if (words.some(x => x.word.toLowerCase() === word.toLowerCase())) {
                if (window.showToast) window.showToast("Это слово уже есть в словаре блока", "warning");
                return;
            }

            words.push({ word, definition, connections });
            if (termInput) termInput.value = '';
            if (definitionInput) definitionInput.value = '';
            if (connectionsInput) connectionsInput.value = '';

            updateBlockData();
            renderList();
        };

        renderList();
        modal.style.display = 'flex';
    }

    async openColorModal(blockEl) {
        const currentColor = blockEl.dataset.color || '';
        const choice = await customChoice({
            title: 'Цвет блока',
            options: [
                { label: '⚪ По умолчанию', value: 'default', checked: !currentColor },
                { label: '🔵 Синий', value: 'blue', checked: currentColor === 'blue' },
                { label: '🟢 Зеленый', value: 'green', checked: currentColor === 'green' },
                { label: '🔴 Красный', value: 'red', checked: currentColor === 'red' },
                { label: '🟡 Желтый', value: 'yellow', checked: currentColor === 'yellow' },
                { label: '🟣 Фиолетовый', value: 'purple', checked: currentColor === 'purple' }
            ],
            okLabel: 'Выбрать',
            cancelLabel: 'Отмена'
        });

        if (choice !== null && choice !== undefined) {
            const selectedColor = choice === 'default' ? '' : choice;
            if (selectedColor) {
                blockEl.dataset.color = selectedColor;
                const preset = COLOR_PRESETS[selectedColor];
                if (preset) {
                    blockEl.style.setProperty('--block-custom-bg', preset.bg);
                    blockEl.style.setProperty('--block-custom-accent', preset.accent);
                }
            } else {
                delete blockEl.dataset.color;
                blockEl.style.removeProperty('--block-custom-bg');
                blockEl.style.removeProperty('--block-custom-accent');
            }
            await this.saveGlobal(false, "toast.dialectics_updated");
            
            // Re-render blocks to apply change everywhere
            const allBlocks = BlockManager.getBlocks(this.dom.canvas);
            BlockManager.render(this.dom.canvas, allBlocks, this._blockCallbacks());
        }
    }

    addSectionBlock() {
        this.openSectionTitleModal(-1);
    }

    openSectionTitleModal(index = null, existingBlock = null) {
        this.state.pendingSectionIndex = index;
        this.state.editingSectionBlock = existingBlock;
        const modal = document.getElementById('sectionTitleModal');
        const input = document.getElementById('sectionTitleInputField');
        if (!modal || !input) return;
        
        if (existingBlock) {
            let title = existingBlock.dataset.title;
            if (!title) {
                const span = existingBlock.querySelector('.dialectics-block-header span:nth-child(2)');
                title = span ? span.innerText : 'Раздел';
            }
            input.value = title || '';
        } else {
            input.value = '';
        }
        
        modal.style.display = 'flex';
        setTimeout(() => input.focus(), 50);
    }

    closeSectionTitleModal() {
        const modal = document.getElementById('sectionTitleModal');
        if (modal) modal.style.display = 'none';
        this.state.pendingSectionIndex = null;
        this.state.editingSectionBlock = null;
    }

    saveSectionTitle() {
        const input = document.getElementById('sectionTitleInputField');
        if (!input || !this.dom.canvas) return;
        
        const title = input.value.trim() || 'Раздел';
        
        if (this.state.editingSectionBlock) {
            this.state.editingSectionBlock.dataset.title = title;
            const span = this.state.editingSectionBlock.querySelector('.block-title-text');
            if (span) span.innerText = title;
            const inner = this.state.editingSectionBlock.querySelector('.dialectics-content-inner');
            if (inner) inner.innerHTML = `<p>${title}</p>`;
            
            const blocks = BlockManager.getBlocks(this.dom.canvas);
            BlockManager.render(this.dom.canvas, blocks, this._blockCallbacks());
            this.saveGlobal(false, "toast.dialectics_updated");
        } else {
            const blocks = BlockManager.getBlocks(this.dom.canvas);
            const newSection = {
                id: 'block_' + Math.random().toString(36).substr(2, 9),
                side: 'section',
                isSection: true,
                title: title,
                html: `<p>${title}</p>`
            };
            
            if (this.state.pendingSectionIndex !== null && this.state.pendingSectionIndex !== undefined && this.state.pendingSectionIndex >= 0) {
                if (this.state.pendingSectionIndex < blocks.length) {
                    blocks.splice(this.state.pendingSectionIndex + 1, 0, newSection);
                } else {
                    blocks.push(newSection);
                }
            } else if (this.state.pendingSectionIndex === -1) {
                blocks.unshift(newSection);
            } else {
                blocks.push(newSection);
            }
            
            BlockManager.render(this.dom.canvas, blocks, this._blockCallbacks());
            this.saveGlobal(false, "toast.dialectics_updated");
        }
        
        this.closeSectionTitleModal();
    }

    toggleTableOfContents(e) {
        if (e) e.stopPropagation();
        let menu = document.getElementById('tableOfContentsMenu');
        if (!menu) return;
        if (menu.style.display === 'none' || !menu.style.display) {
            this.updateTableOfContents();
            menu.style.display = 'block';
            const closeHandler = (evt) => {
                if (!menu.contains(evt.target) && evt.target.id !== 'btnToggleTOC') {
                    menu.style.display = 'none';
                    document.removeEventListener('click', closeHandler);
                }
            };
            setTimeout(() => document.addEventListener('click', closeHandler), 10);
        } else {
            menu.style.display = 'none';
        }
    }

    updateTableOfContents() {
        const listEl = document.getElementById('tableOfContentsList');
        if (!listEl || !this.dom.canvas) return;
        
        const blocks = Array.from(this.dom.canvas.querySelectorAll('.dialectics-block'));
        listEl.innerHTML = '';
        
        if (blocks.length === 0) {
            listEl.innerHTML = '<div style="padding: 12px; color: #94a3b8; font-size: 0.85rem; text-align: center;">В конспекте пока нет блоков и разделов.</div>';
            return;
        }
        
        blocks.forEach((b, idx) => {
            const isSection = b.classList.contains('block-section') || b.dataset.isSection === 'true';
            let title = b.dataset.title;
            if (!title) {
                const headerSpan = b.querySelector('.dialectics-block-header span:first-child');
                title = headerSpan ? headerSpan.innerText : (isSection ? 'Раздел' : `Блок ${idx + 1}`);
            }
            
            const item = document.createElement('div');
            item.style.cssText = `
                display: flex; align-items: center; gap: 8px; padding: 8px 12px; 
                border-radius: 8px; cursor: pointer; transition: background 0.15s;
                font-size: ${isSection ? '0.9rem' : '0.8rem'};
                font-weight: ${isSection ? '700' : '500'};
                color: ${isSection ? '#ea580c' : '#334155'};
                background: ${isSection ? '#fff7ed' : 'transparent'};
                border-left: ${isSection ? '4px solid #ea580c' : '2px solid transparent'};
            `;
            item.onmouseover = () => item.style.background = isSection ? '#ffedd5' : '#f8fafc';
            item.onmouseout = () => item.style.background = isSection ? '#fff7ed' : 'transparent';
            
            const icon = isSection ? '📑' : (b.classList.contains('block-left') ? '▫️' : '▪️');
            item.innerHTML = `<span>${icon}</span><span style="flex-grow:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${title}</span>`;
            
            item.onclick = () => {
                document.getElementById('tableOfContentsMenu').style.display = 'none';
                b.scrollIntoView({ behavior: 'smooth', block: 'center' });
                b.style.transition = 'box-shadow 0.5s ease';
                const origBoxShadow = b.style.boxShadow;
                b.style.boxShadow = '0 0 0 4px #ea580c';
                setTimeout(() => { b.style.boxShadow = origBoxShadow; }, 1500);
            };
            
            listEl.appendChild(item);
        });
    }

    openHacksPopover(blockEl) {
        const existing = document.getElementById('dialecticsHacksPopover');
        if (existing) {
            const isSame = existing.dataset.blockId === (blockEl.dataset.blockId || '');
            existing.remove();
            if (isSame) return;
        }

        const popover = document.createElement('div');
        popover.id = 'dialecticsHacksPopover';
        popover.dataset.blockId = blockEl.dataset.blockId || '';
        popover.style.cssText = `
            position: fixed;
            z-index: 999999;
            width: 350px;
            max-height: 440px;
            background: #ffffff;
            border: 1px solid #cbd5e1;
            border-radius: 12px;
            box-shadow: 0 14px 30px -5px rgba(15, 23, 42, 0.15), 0 8px 15px -6px rgba(15, 23, 42, 0.1);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            animation: hacksPopoverFadeIn 0.18s ease-out;
        `;

        if (!document.getElementById('hacksPopoverStyles')) {
            const styleEl = document.createElement('style');
            styleEl.id = 'hacksPopoverStyles';
            styleEl.textContent = `
                @keyframes hacksPopoverFadeIn {
                    from { opacity: 0; transform: translateY(-6px) scale(0.97); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
            `;
            document.head.appendChild(styleEl);
        }

        const btnEl = blockEl.querySelector('.btn-block-hacks');
        const rect = btnEl ? btnEl.getBoundingClientRect() : blockEl.getBoundingClientRect();

        let left = rect.right - 350;
        if (left < 10) left = rect.left;
        let top = rect.bottom + 8;
        if (top + 440 > window.innerHeight) {
            top = Math.max(10, rect.top - 448);
        }
        popover.style.left = `${left}px`;
        popover.style.top = `${top}px`;

        const hacksTitle = window._ ? window._('dialectics.hacks_title', 'Хаки понимания') : 'Хаки понимания';
        const copyHint = window._ ? window._('dialectics.hack_copy_hint', 'Нажмите на карточку, чтобы скопировать совет') : 'Нажмите на карточку, чтобы скопировать совет';
        const copiedMsg = window._ ? window._('dialectics.hack_copied', 'Совет скопирован в буфер обмена') : 'Совет скопирован в буфер обмена';

        const hacks = [
            {
                title: window._ ? window._('dialectics.hack_1_title', 'Количественный подход к формуле') : 'Количественный подход к формуле',
                text: window._ ? window._('dialectics.hack_1_text', 'Если сразу сложно понять формулу, то сначала изучите ее количественно, сведите к суммированию, а затем уже изучите качественно.') : 'Если сразу сложно понять формулу, то сначала изучите ее количественно, сведите к суммированию, а затем уже изучите качественно.',
                tag: '📊 Базовый'
            }
        ];

        let listHtml = '';
        hacks.forEach((h, idx) => {
            listHtml += `
                <div class="hack-card-item" data-idx="${idx}" style="background: #ffffff; border: 1px solid #e2e8f0; border-left: 3.5px solid #3b82f6; border-radius: 10px; padding: 12px; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.02); transition: transform 0.15s, box-shadow 0.15s;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                        <span style="font-weight: 600; font-size: 0.88rem; color: #0f172a;">${h.title}</span>
                        <span style="font-size: 0.72rem; font-weight: 600; background: #eff6ff; color: #2563eb; padding: 2px 6px; border-radius: 6px;">${h.tag}</span>
                    </div>
                    <div style="font-size: 0.82rem; color: #475569; line-height: 1.45;">
                        ${h.text}
                    </div>
                </div>
            `;
        });

        popover.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-bottom: 1px solid #e2e8f0;">
                <div style="display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 0.92rem; color: #1e293b;">
                    <span>💡</span>
                    <span>${hacksTitle}</span>
                </div>
                <button class="hacks-popover-close" style="background: transparent; border: none; font-size: 1.1rem; color: #64748b; cursor: pointer; padding: 2px 6px; border-radius: 6px;">✕</button>
            </div>
            <div style="padding: 14px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px;">
                ${listHtml}
            </div>
            <div style="font-size:0.72rem; color:#94a3b8; text-align:center; padding: 6px 12px 10px 12px; border-top: 1px solid #f1f5f9; background: #f8fafc;">
                ${copyHint}
            </div>
        `;

        document.body.appendChild(popover);

        popover.querySelectorAll('.hack-card-item').forEach(cardEl => {
            cardEl.onmouseenter = () => {
                cardEl.style.transform = 'translateY(-1px)';
                cardEl.style.boxShadow = '0 4px 8px rgba(0,0,0,0.05)';
            };
            cardEl.onmouseleave = () => {
                cardEl.style.transform = 'none';
                cardEl.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)';
            };
            cardEl.onclick = (e) => {
                e.stopPropagation();
                const idx = parseInt(cardEl.dataset.idx);
                const h = hacks[idx];
                navigator.clipboard.writeText(h.title + ': ' + h.text);
                if (window.showToast) window.showToast(copiedMsg, "success");
            };
        });

        setTimeout(() => {
            const closeHandler = (e) => {
                if (!popover.contains(e.target) && e.target !== btnEl && !(btnEl && btnEl.contains(e.target))) {
                    popover.remove();
                    document.removeEventListener('click', closeHandler);
                }
            };
            document.addEventListener('click', closeHandler);
            const closeBtn = popover.querySelector('.hacks-popover-close');
            if (closeBtn) {
                closeBtn.onclick = () => {
                    popover.remove();
                    document.removeEventListener('click', closeHandler);
                };
            }
        }, 10);
    }

}

export const BlocksOrchestratorMixin = {};
Object.getOwnPropertyNames(BlocksOrchestratorClass.prototype).forEach(key => {
    if (key !== 'constructor') BlocksOrchestratorMixin[key] = BlocksOrchestratorClass.prototype[key];
});
