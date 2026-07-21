/**
 * BlockStickersManager.js - Управление стикерами, источниками, словами (словарем), цветами и хаками
 */
import { BlockManager, COLOR_PRESETS } from '../BlockManager.js';
import { customChoice } from '../../modal_controller.js';
import { DialecticsLogger } from '../DialecticsLogger.js';

export const BlockStickersManager = {
    initStickersModal(engine) {
        const modal = document.getElementById('blockStickersModal');
        const addBtn = document.getElementById('btnAddStickerModal');
        const listEl = document.getElementById('modalStickersList');
        const titleInput = document.getElementById('newStickerTitleModal');
        const textInput = document.getElementById('newStickerTextModal');
        const colorInputs = document.querySelectorAll('.modal-color-pill');

        if (!modal || !addBtn || !listEl) return;

        let selectedColor = '#fff9c4';
        colorInputs.forEach(pill => {
            pill.onclick = () => {
                colorInputs.forEach(p => p.style.border = '1px solid #cbd5e1');
                pill.style.border = '2px solid #3b82f6';
                selectedColor = pill.dataset.color || '#fff9c4';
            };
        });

        addBtn.onclick = () => {
            const blockId = modal.dataset.blockId;
            if (!blockId) return;

            const block = document.querySelector(`.dialectics-block[data-id="${blockId}"]`);
            if (!block) return;

            const title = titleInput ? titleInput.value.trim() : '';
            const text = textInput ? textInput.value.trim() : '';

            if (!text && !title) {
                if (window.showToast) window.showToast("Введите текст или заголовок стикера", "warning");
                return;
            }

            let stickers = [];
            try { stickers = JSON.parse(block.dataset.stickers || "[]"); } catch(e){}

            stickers.push({
                id: 'st_' + Math.random().toString(36).substr(2, 9),
                title: title || 'Примечание',
                text: text,
                color: selectedColor
            });

            block.dataset.stickers = JSON.stringify(stickers);
            this.renderStickersForBlock(block);
            this.renderStickersListInModal(engine, blockId);
            if (engine.saveGlobal) engine.saveGlobal(false, "toast.dialectics_updated");

            if (textInput) textInput.value = '';
            if (titleInput) titleInput.value = '';
        };
    },

    renderStickersListInModal(engine, blockId) {
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
                this.renderStickersListInModal(engine, blockId);
                if (engine.saveGlobal) engine.saveGlobal(false, "toast.dialectics_updated");
            };
            listEl.appendChild(item);
        });
    },

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
    },

    openSourcesModal(engine, blockEl) {
        const modal = document.getElementById('blockSourcesModal');
        const listEl = document.getElementById('sourcesList');
        const urlInput = document.getElementById('sourceUrl');
        const titleInput = document.getElementById('sourceTitle');
        const quoteInput = document.getElementById('sourceQuote');
        const addBtn = document.getElementById('btnAddSource');

        if (!modal || !listEl) return;

        let sources = [];
        try {
            if (blockEl.dataset.sources) sources = JSON.parse(blockEl.dataset.sources);
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
            if (engine.saveGlobal) engine.saveGlobal(false, "toast.dialectics_updated");
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
    },

    openWordsModal(engine, blockEl) {
        const modal = document.getElementById('blockWordsModal');
        const listEl = document.getElementById('wordsList');
        const termInput = document.getElementById('wordTerm');
        const definitionInput = document.getElementById('wordDefinition');
        const connectionsInput = document.getElementById('wordConnections');
        const addBtn = document.getElementById('btnAddWord');

        if (!modal || !listEl) return;

        let words = [];
        try {
            if (blockEl.dataset.words) words = JSON.parse(blockEl.dataset.words);
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
            if (engine.saveGlobal) engine.saveGlobal(false, "toast.dialectics_updated");

            const allBlocks = BlockManager.getBlocks(engine.dom.canvas);
            BlockManager.render(engine.dom.canvas, allBlocks, engine._blockCallbacks());
        };

        addBtn.onclick = () => {
            const word = termInput ? termInput.value.trim() : '';
            const definition = definitionInput ? definitionInput.value.trim() : '';
            const connections = connectionsInput ? connectionsInput.value.trim() : '';

            if (!word || !definition) {
                if (window.showToast) window.showToast("Введите понятие и его объяснение", "warning");
                return;
            }

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
    },

    async openColorModal(engine, blockEl) {
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
            if (engine.saveGlobal) await engine.saveGlobal(false, "toast.dialectics_updated");

            const allBlocks = BlockManager.getBlocks(engine.dom.canvas);
            BlockManager.render(engine.dom.canvas, allBlocks, engine._blockCallbacks());
        }
    },

    openHacksPopover(engine, blockEl) {
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
};
