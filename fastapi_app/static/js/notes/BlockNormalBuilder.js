import AppState from './AppState.js';
import DictModalService from './DictModalService.js';
import AICheckModalService from './AICheckModalService.js';
import { showToast } from './ToastService.js';
import BlockMathRenderer from './BlockMathRenderer.js';
import { ALGORITHM_STEPS } from './BlockConstants.js';

import BlockColorPicker from './BlockColorPicker.js';

class BlockNormalBuilder {
    static setupHiddenPhrases(container) {
        if (!container) return;
        const phrases = container.querySelectorAll('span[data-type="hidden-phrase"], .hidden-phrase-mark');
        phrases.forEach(phrase => {
            const hint = phrase.getAttribute('data-hint') || '';
            
            if (!phrase.querySelector('.hp-arrow')) {
                const arrow = document.createElement('span');
                arrow.className = 'hp-arrow';
                arrow.textContent = phrase.classList.contains('is-expanded') ? ' ▴' : ' ▾';
                phrase.appendChild(arrow);
            }
            if (hint && !phrase.querySelector('.hp-content')) {
                const content = document.createElement('span');
                content.className = 'hp-content';
                content.innerHTML = ` 💡 ${hint}`;
                phrase.appendChild(content);
            }

            phrase.onclick = (e) => {
                e.stopPropagation();
                const isExpanded = phrase.classList.toggle('is-expanded');
                const arrow = phrase.querySelector('.hp-arrow');
                if (arrow) arrow.textContent = isExpanded ? ' ▴' : ' ▾';
            };
        });
    }

    static openColorPicker(block, buttonEl, div) {
        BlockColorPicker.open(block, buttonEl, div);
    }

    static build(block, onRenderAll) {
        const div = document.createElement('div');
        div.className = `dialectics-block block-${block.side || 'left'}`;
        if (block.is_pinned) {
            div.classList.add('pinned-sticky');
        }
        if (block.border_color) {
            div.style.borderLeftColor = block.border_color;
        }
        div.dataset.id = block.id;
        div.id = block.id;
        div.draggable = true;

        if (block.role === 'section') {
            div.className = `dialectics-block block-section`;
            div.innerHTML = `
                <div class="block-header" style="justify-content: center; border-bottom: none; background: #e2e8f0;">
                    <span class="drag-handle" title="Перетащить блок">⠿</span>
                    <h2 class="block-title" contenteditable="true" style="font-size: 1.25rem; font-weight: bold; text-align: center; width: 100%; margin: 0;">${block.title || 'Раздел'}</h2>
                </div>
                <div class="block-actions">
                    <button class="block-action-btn btn-delete" title="Удалить">🗑</button>
                </div>
            `;
        } else {
            const stepObj = ALGORITHM_STEPS.find(s => s.role === block.role);
            const roleLabelHTML = stepObj ? `<div class="block-role-label" style="position: absolute; top: -24px; left: 12px; font-size: 0.85rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; pointer-events: none; user-select: none;">${stepObj.title}</div>` : '';

            div.innerHTML = `
                ${roleLabelHTML}
                <div class="block-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <div class="block-header-left">
                        <span class="drag-handle" title="Перетащить блок">⠿</span>
                        <span class="block-number"></span>
                        <div class="block-status-dot" data-status="${block.status || 'none'}" title="Статус: ${block.status || 'none'}"></div>
                        <button class="btn-collapse-toggle" title="Свернуть/Развернуть">${block.collapsed ? '▶' : '▼'}</button>
                        <h3 class="block-title" contenteditable="true">${block.title || 'Что вам нужно понять?'}</h3>
                    </div>
                    <div class="block-header-right" style="display: flex; align-items: center; gap: 4px;">
                        <button class="block-action-btn btn-autofill-ai" title="Автозаполнение ИИ" style="font-size: 1.1rem; padding: 2px 4px; border: none; background: transparent; cursor: pointer;">✨</button>
                        <button class="btn-pin-toggle ${block.is_pinned ? 'active' : ''}" title="Закрепить (плавающий блок)">📌</button>
                    </div>
                </div>
                ${block.tags ? `
                <div class="block-tags" style="padding: 0 16px 8px 46px; display: flex; flex-wrap: wrap; gap: 6px;">
                    ${block.tags.split(',').filter(t => t.trim()).map(t => `<span style="background: #e2e8f0; color: #475569; font-size: 0.75rem; padding: 2px 8px; border-radius: 12px; font-weight: 500;">#${t.trim()}</span>`).join('')}
                </div>
                ` : ''}
                <div class="block-toolbar-row" style="display: flex; align-items: center; gap: 4px;">
                    <button class="block-action-btn btn-sources" title="Инструкция к шагу">ℹ️</button>
                    <button class="block-action-btn btn-connections" title="Источники блока" style="position:relative;">
                        🔗${(block.sources && block.sources.length > 0) ? `<span style="position:absolute; top:-4px; right:-6px; background:#3b82f6; color:white; font-size:0.6rem; padding:1px 4px; border-radius:8px; font-weight:bold;">${block.sources.length}</span>` : ''}
                    </button>
                    <button class="block-action-btn btn-dict" title="Словарь блока">📖</button>
                    <button class="block-action-btn btn-hint" title="Хаки понимания">💡</button>
                    <button class="block-action-btn btn-sticker" title="Заметки / Цвет">🟨</button>
                    <button class="block-action-btn btn-hide" title="Развернуть/свернуть скрытые фразы">👁️</button>
                    <div style="width: 1px; height: 16px; background: #cbd5e1; margin: 0 3px;"></div>
                    <button class="block-action-btn btn-edit" title="Редактировать">✏️</button>
                    <button class="block-action-btn btn-ai-check" title="Проверка ИИ">🔬</button>
                    <button class="block-action-btn btn-copy" title="Копировать текст блока">📋</button>
                    <button class="block-action-btn btn-color" title="Цвет рамки блока">🎨</button>
                    ${(block.role === 'step1' || block.role === 'anchor') ? `<button class="block-action-btn btn-regenerate" title="Перегенерировать шаги ИИ">🔄</button>` : ''}
                    <button class="block-action-btn btn-delete" title="Удалить">🗑️</button>
                </div>
                <div class="block-content">${block.html || '<p>Текст...</p>'}</div>
            `;
        }

        // Setup hidden phrases interactivity inside block content
        this.setupHiddenPhrases(div);

        // Bind delete
        div.querySelector('.btn-delete')?.addEventListener('click', () => {
            AppState.removeBlock(block.id);
            if (onRenderAll) onRenderAll();
        });

        // Bind Pin toggle
        const pinBtn = div.querySelector('.btn-pin-toggle');
        if (pinBtn) {
            pinBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                block.is_pinned = !block.is_pinned;
                AppState.updateBlock(block.id, { is_pinned: block.is_pinned });
                div.classList.toggle('pinned-sticky', block.is_pinned);
                pinBtn.classList.toggle('active', block.is_pinned);
            });
        }

        // Bind Autofill AI
        const btnAutofill = div.querySelector('.btn-autofill-ai');
        if (btnAutofill) {
            btnAutofill.addEventListener('click', (e) => {
                e.stopPropagation();
                import('./ToastService.js').then(m => m.showToast('Запущена ИИ генерация...'));
                import('./api.js').then(module => {
                    const NotesAPI = module.default;
                    const anchorText = (block.html || '').replace(/<[^>]+>/g, '').trim();
                    const noteTitle = AppState.currentNote.title;
                    if (AppState.isAutoFillStepByStep) {
                        NotesAPI.generateNextStep(anchorText, 'step1').then(res => {
                            if (res && res.result && res.result['step1']) {
                                const stepObj = ALGORITHM_STEPS.find(s => s.role === 'step1') || {};
                                const newBlock = {
                                    id: 'block-' + Math.random().toString(36).substr(2, 9),
                                    side: stepObj.side || 'left',
                                    role: 'step1',
                                    title: stepObj.title || 'step1',
                                    html: `<p>${res.result['step1']}</p>`,
                                    status: 'ready',
                                    isDraft: false
                                };
                                AppState.addBlock(newBlock);
                                AppState.dismissHint('step1');
                                if (onRenderAll) onRenderAll();
                            }
                        }).catch(err => {
                            console.error("Autofill step failed", err);
                            import('./ToastService.js').then(m => m.showToast('Ошибка автозаполнения', 'error'));
                        });
                    } else {
                        NotesAPI.autofillConspect(anchorText, noteTitle).then(res => {
                            if (res && res.result && typeof res.result === 'object') {
                                const steps = ['step1', 'step2', 'step3', 'step4', 'step5'];
                                let delay = 600;
                                steps.forEach((step, index) => {
                                    if (res.result[step]) {
                                        setTimeout(() => {
                                            const stepObj = ALGORITHM_STEPS.find(s => s.role === step) || {};
                                            const newBlock = {
                                                id: 'block-' + Math.random().toString(36).substr(2, 9),
                                                side: stepObj.side || 'center',
                                                role: step,
                                                title: stepObj.title || step,
                                                html: `<p>${res.result[step]}</p>`,
                                                status: 'ready',
                                                isDraft: false
                                            };
                                            AppState.addBlock(newBlock);
                                            AppState.dismissHint(step);
                                            if (onRenderAll) onRenderAll();
                                        }, delay * (index + 1));
                                    }
                                });
                            }
                        }).catch(err => {
                            console.error("Autofill failed", err);
                            import('./ToastService.js').then(m => m.showToast('Ошибка автозаполнения', 'error'));
                        });
                    }
                });
            });
        }

        // Bind Collapse toggle
        const collapseBtn = div.querySelector('.btn-collapse-toggle');
        if (collapseBtn) {
            collapseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                block.collapsed = !block.collapsed;
                AppState.updateBlock(block.id, { collapsed: block.collapsed });
                div.classList.toggle('collapsed', block.collapsed);
                collapseBtn.textContent = block.collapsed ? '▶' : '▼';
                const content = div.querySelector('.block-content');
                if (content) content.style.display = block.collapsed ? 'none' : 'block';
            });
        }

        // Bind editor
        const btnEdit = div.querySelector('.btn-edit');
        if (btnEdit) {
            btnEdit.addEventListener('click', () => {
                if (block.status === 'ready') {
                    import('./ToastService.js').then(m => m.default.showToast('Для редактирования снимите зелёный статус', 'info'));
                    return;
                }
                document.dispatchEvent(new CustomEvent('openEditor', { detail: { blockId: block.id, el: div } }));
            });
        }

        const blockContent = div.querySelector('.block-content');
        if (blockContent) {
            blockContent.addEventListener('dblclick', (e) => {
                const selection = window.getSelection();
                if (selection.toString().length > 0) return;
                if (block.status === 'ready') {
                    import('./ToastService.js').then(m => m.default.showToast('Для редактирования снимите зелёный статус', 'info'));
                    return;
                }
                document.dispatchEvent(new CustomEvent('openEditor', { detail: { blockId: block.id, el: div } }));
            });
        }

        // Bind title
        const titleEl = div.querySelector('.block-title');
        if (titleEl) {
            titleEl.addEventListener('blur', () => {
                AppState.updateBlock(block.id, { title: titleEl.textContent });
            });
        }

        // Bind status dot
        const statusEl = div.querySelector('.block-status-dot');
        if (statusEl) {
            statusEl.addEventListener('click', (e) => {
                e.stopPropagation();
                const statuses = ['none', 'ready'];
                const next = statuses[(statuses.indexOf(block.status || 'none') + 1) % 2];
                block.status = next;
                AppState.updateBlock(block.id, { status: next });
                statusEl.dataset.status = next;
                if (onRenderAll) onRenderAll();
            });
        }

        // Bind Step Info (ℹ️)
        const btnSources = div.querySelector('.btn-sources');
        if (btnSources) {
            btnSources.addEventListener('click', async () => {
                const BlockMetaModalService = (await import('./BlockMetaModalService.js')).default;
                BlockMetaModalService.showInfoModal(block.id);
            });
        }

        // Bind Block Sources / Links (🔗)
        const btnConnections = div.querySelector('.btn-connections');
        if (btnConnections) {
            btnConnections.addEventListener('click', async () => {
                const BlockMetaModalService = (await import('./BlockMetaModalService.js')).default;
                BlockMetaModalService.showSourcesModal(block.id);
            });
        }

        // Bind Dictionary (📖)
        const btnDict = div.querySelector('.btn-dict');
        if (btnDict) {
            btnDict.addEventListener('click', () => {
                DictModalService.show(block.id);
            });
        }

        // Bind Understanding Hacks (💡)
        const btnHint = div.querySelector('.btn-hint');
        if (btnHint) {
            btnHint.addEventListener('click', async () => {
                const UnderstandingHacksService = (await import('./UnderstandingHacksService.js')).default;
                UnderstandingHacksService.show(block, btnHint);
            });
        }

        // Bind Sticker / Color
        const btnSticker = div.querySelector('.btn-sticker');
        if (btnSticker) {
            btnSticker.addEventListener('click', async () => {
                const BlockStickersManager = (await import('./BlockStickersManager.js')).default;
                BlockStickersManager.openBlockStickersPanel(block, div);
            });
        }

        // Bind Hide / Eye toggle for hidden phrases (👁️)
        const btnHide = div.querySelector('.btn-hide');
        if (btnHide) {
            btnHide.addEventListener('click', (e) => {
                e.stopPropagation();
                const phrases = div.querySelectorAll('span[data-type="hidden-phrase"], .hidden-phrase-mark');
                if (phrases.length === 0) {
                    showToast('В этом блоке нет скрытых фраз');
                    return;
                }
                const anyCollapsed = Array.from(phrases).some(p => !p.classList.contains('is-expanded'));
                phrases.forEach(p => {
                    p.classList.toggle('is-expanded', anyCollapsed);
                    const arrow = p.querySelector('.hp-arrow');
                    if (arrow) arrow.textContent = anyCollapsed ? ' ▴' : ' ▾';
                });
            });
        }

        // Bind AI Check (🔬)
        const btnAiCheck = div.querySelector('.btn-ai-check');
        if (btnAiCheck) {
            btnAiCheck.addEventListener('click', () => {
                AICheckModalService.show(block.id);
            });
        }

        // Bind Copy (📋)
        const btnCopy = div.querySelector('.btn-copy');
        if (btnCopy) {
            btnCopy.addEventListener('click', async (e) => {
                e.stopPropagation();
                const contentEl = div.querySelector('.block-content');
                const titleText = (block.title || '').trim();
                const bodyText = contentEl ? contentEl.innerText.trim() : (block.html || '').replace(/<[^>]+>/g, '').trim();
                const fullText = titleText ? `${titleText}\n\n${bodyText}` : bodyText;
                
                try {
                    await navigator.clipboard.writeText(fullText);
                } catch {
                    const ta = document.createElement('textarea');
                    ta.value = fullText;
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand('copy');
                    document.body.removeChild(ta);
                }
                showToast('📋 Текст блока скопирован в буфер');
            });
        }

        // Bind Color Picker (🎨)
        const btnColor = div.querySelector('.btn-color');
        if (btnColor) {
            btnColor.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openColorPicker(block, btnColor, div);
            });
        }

        // Bind Regenerate (🔄)
        const btnRegenerate = div.querySelector('.btn-regenerate');
        if (btnRegenerate) {
            btnRegenerate.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm('Это удалит все последующие шаги и сгенерирует их заново. Продолжить?')) {
                    const blocksToKeep = AppState.currentNote.blocks.filter(b => b.id === block.id || b.role === 'section');
                    AppState.currentNote.blocks = blocksToKeep;
                    if (onRenderAll) onRenderAll();
                    import('./ToastService.js').then(m => m.showToast('Запущена генерация шагов...'));
                    import('./api.js').then(module => {
                        const NotesAPI = module.default;
                        const anchorText = (block.html || '').replace(/<[^>]+>/g, '').trim();
                        const noteTitle = AppState.currentNote.title;
                        if (AppState.isAutoFillStepByStep) {
                            NotesAPI.generateNextStep(anchorText, 'step1').then(res => {
                                if (res && res.result && res.result['step1']) {
                                    const stepObj = ALGORITHM_STEPS.find(s => s.role === 'step1') || {};
                                    const newBlock = {
                                        id: 'block-' + Math.random().toString(36).substr(2, 9),
                                        side: stepObj.side || 'left',
                                        role: 'step1',
                                        title: stepObj.title || 'step1',
                                        html: `<p>${res.result['step1']}</p>`,
                                        status: 'ready',
                                        isDraft: false
                                    };
                                    AppState.addBlock(newBlock);
                                    AppState.dismissHint('step1');
                                    if (onRenderAll) onRenderAll();
                                }
                            }).catch(err => {
                                console.error("Regeneration step failed", err);
                                import('./ToastService.js').then(m => m.showToast('Ошибка перегенерации', 'error'));
                            });
                        } else {
                            NotesAPI.autofillConspect(anchorText, noteTitle).then(res => {
                                if (res && res.result && typeof res.result === 'object') {
                                    const steps = ['step1', 'step2', 'step3', 'step4', 'step5'];
                                    let delay = 600;
                                    steps.forEach((step, index) => {
                                        if (res.result[step]) {
                                            setTimeout(() => {
                                                // ALGORITHM_STEPS is imported at the top of BlockNormalBuilder.js
                                                const stepObj = ALGORITHM_STEPS.find(s => s.role === step) || {};
                                                const newBlock = {
                                                    id: 'block-' + Math.random().toString(36).substr(2, 9),
                                                    side: stepObj.side || 'center',
                                                    role: step,
                                                    title: stepObj.title || step,
                                                    html: `<p>${res.result[step]}</p>`,
                                                    status: 'ready',
                                                    isDraft: false
                                                };
                                                AppState.addBlock(newBlock);
                                                AppState.dismissHint(step);
                                                if (onRenderAll) onRenderAll();
                                            }, delay * (index + 1));
                                        }
                                    });
                                }
                            }).catch(err => {
                                console.error("Regeneration failed", err);
                                import('./ToastService.js').then(m => m.showToast('Ошибка перегенерации', 'error'));
                            });
                        }
                    });
                }
            });
        }

        // Math rendering
        BlockMathRenderer.renderMath(div);

        if (block.collapsed) {
            div.classList.add('collapsed');
            const content = div.querySelector('.block-content');
            if (content) content.style.display = 'none';
        }

        return div;
    }
}

export default BlockNormalBuilder;
