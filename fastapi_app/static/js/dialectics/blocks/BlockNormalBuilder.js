/**
 * BlockNormalBuilder.js - Построение стандартных блоков на холсте (заголовок, кнопки, стикеры, слова, статусы)
 */
import { customConfirm } from '../../modal_controller.js';
import { COLOR_PRESETS, getHint } from '../BlockConstants.js';

export const BlockNormalBuilder = {
    renderNormalBlock(container, b, callbacks, renderMathFn) {
        const blockEl = document.createElement('div');
        blockEl.className = `dialectics-block block-${b.side || 'left'}`;
        blockEl.dataset.blockId = b.id;
        if (b.role) blockEl.dataset.role = b.role;
        
        let titleText = b.title || '';
        if (!titleText && b.role) {
            if (b.role === 'anchor') titleText = getHint('dialectics.hints.anchor', 'Что вам нужно понять?');
            else {
                const stepTitleKey = `dialectics.hints.${b.role}_title`;
                const shortKey = `${b.role}_title`;
                if (window.DIALECTICS_HINTS && window.DIALECTICS_HINTS[shortKey]) {
                    titleText = window.DIALECTICS_HINTS[shortKey];
                } else if (typeof window._ === 'function' && window._(stepTitleKey) !== stepTitleKey) {
                    titleText = window._(stepTitleKey);
                }
            }
        }
        if (!titleText) {
            titleText = b.side === 'center' ? 'Связующий блок' : 'Блок';
        }

        let infoIconHtml = '';
        if (b.role) {
            let stepText = '';
            if (b.role === 'anchor') stepText = getHint('dialectics.hints.anchor', 'Что вам нужно понять?');
            else {
                const stepTextKey = `dialectics.hints.${b.role}`;
                if (window.DIALECTICS_HINTS && window.DIALECTICS_HINTS[b.role]) {
                    stepText = window.DIALECTICS_HINTS[b.role];
                } else if (typeof window._ === 'function' && window._(stepTextKey) !== stepTextKey) {
                    stepText = window._(stepTextKey);
                }
            }
            const cleanStepText = stepText.replace(/<[^>]*>/g, '').trim();
            if (cleanStepText) {
                infoIconHtml = `<span class="dialectics-step-info-trigger" title="${cleanStepText}" style="cursor:help; margin-left:6px; color:#94a3b8; font-size:0.9rem; font-weight:normal; vertical-align:middle; transition:color 0.2s;" onmouseover="this.style.color='#64748b'" onmouseout="this.style.color='#94a3b8'">ℹ️</span>`;
            }
        }

        const isCollapsed = b.collapsed === true;
        if (isCollapsed) blockEl.classList.add('is-collapsed');
        blockEl.dataset.collapsed = isCollapsed ? 'true' : 'false';
        
        const isPinned = b.pinned === true || b.isPinned === true || b.isSticky === true || b.dataset?.pinned === 'true';
        if (isPinned && (b.side === 'left' || !b.side)) {
            blockEl.classList.add('is-sticky');
        }
        blockEl.dataset.pinned = (isPinned && (b.side === 'left' || !b.side)) ? 'true' : 'false';
        
        const blockStatus = b.status || 'none';
        blockEl.dataset.status = blockStatus;

        if (b.title) blockEl.dataset.title = b.title;
        if (b.color) {
            blockEl.dataset.color = b.color;
            const preset = COLOR_PRESETS[b.color];
            if (preset) {
                blockEl.style.setProperty('--block-custom-bg', preset.bg);
                blockEl.style.setProperty('--block-custom-accent', preset.accent);
            }
        } else {
            delete blockEl.dataset.color;
            blockEl.style.removeProperty('--block-custom-bg');
            blockEl.style.removeProperty('--block-custom-accent');
        }

        const arrowChar = isCollapsed ? '▶' : '▼';
        const foldBtnHtml = `<button class="btn-block-fold-toggle" title="Свернуть/Развернуть" style="background:none; border:none; cursor:pointer; font-size:0.75rem; color:#64748b; padding:2px 6px; line-height:1; display:inline-flex; align-items:center; justify-content:center; border-radius:4px; transition:background 0.2s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'">${arrowChar}</button>`;

        const statusCircleHtml = `<span class="note-status-circle status-${blockStatus} btn-block-status" title="Статус блока: ${blockStatus === 'ready' ? 'Готово (Заблокировано)' : (blockStatus === 'in_progress' ? 'В работе' : 'Не указан')}" style="width: 14px; height: 14px; margin-right: 4px; flex-shrink: 0; display: inline-block; cursor: pointer; box-sizing: border-box; border-radius: 50%; padding: 0; background-clip: padding-box;"></span>`;
        
        let lockIconHtml = '';
        if (blockStatus === 'ready') {
            lockIconHtml = `<span class="block-lock-icon" title="Блок заблокирован от изменений" style="font-size: 0.85rem; margin-left: 6px; cursor: default; user-select: none;">🔒</span>`;
        }

        let pinHeaderBtnHtml = '';
        let pinActionBtnHtml = '';
        if (b.side === 'left' || !b.side) {
            const pinTitle = isPinned ? "Открепить блок при прокрутке" : "Заставить блок плавать при прокрутке";
            const pinClass = isPinned ? "is-pinned" : "";
            const pinText = isPinned ? "📌 Закреплен" : "📌";
            pinHeaderBtnHtml = `<button class="btn-block-pin-header ${pinClass}" title="${pinTitle}" style="margin-left:auto; background: ${isPinned ? '#e0e7ff' : 'transparent'}; border: 1px solid ${isPinned ? '#6366f1' : 'transparent'}; color: ${isPinned ? '#4338ca' : '#94a3b8'}; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 800; display: inline-flex; align-items: center; gap: 4px; cursor: pointer; transition: all 0.2s;">${pinText}</button>`;
            pinActionBtnHtml = '';
        }

        let blockHtml = b.html || '<p></p>';
        if (b.tabs && b.active_tab_id) {
            const activeT = b.tabs.find(t => t.id === b.active_tab_id);
            if (activeT) {
                blockHtml = activeT.content || activeT.html || blockHtml;
            }
        }

        let extraHtml = `
            <div class="dialectics-block-header" style="display:flex; align-items:center; justify-content:space-between; font-size: 0.8rem; color: #64748b; font-weight: 700; padding: 12px 14px 6px 14px; border-bottom:1px solid #f1f5f9; text-transform: uppercase; background:#f8fafc; cursor: grab;" title="Зажмите заголовок для перетаскивания блока">
                <div style="display:flex; align-items:center; gap:4px; overflow:hidden;">
                    ${statusCircleHtml}
                    ${foldBtnHtml}
                    <span class="block-title-text" style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${titleText}</span>
                    ${infoIconHtml}
                    ${lockIconHtml}
                </div>
                ${pinHeaderBtnHtml}
            </div>
        `;

        let sourcesCountHtml = '';
        if (b.sources && b.sources.length > 0) {
            sourcesCountHtml = `<span style="font-size:0.7rem; font-weight:bold; background:#e2e8f0; border-radius:10px; padding:2px 5px; margin-left:4px;">${b.sources.length}</span>`;
        }

        let wordsCountHtml = '';
        if (b.words && b.words.length > 0) {
            wordsCountHtml = `<span style="font-size:0.7rem; font-weight:bold; background:#e2e8f0; border-radius:10px; padding:2px 5px; margin-left:4px;">${b.words.length}</span>`;
        }

        let wordsHtml = '';
        if (b.words && b.words.length > 0) {
            wordsHtml = `<div class="dialectics-block-words-row" style="margin-top: 4px; display: flex; flex-wrap: wrap; gap: 6px; padding: 0 14px 10px 14px;">`;
            b.words.forEach(w => {
                wordsHtml += `<span class="dialectics-word-badge" onclick="event.stopPropagation(); window.app && window.app.showWordDefinition('${w.word.replace(/'/g, "\\'")}')" style="cursor: pointer; background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; border-radius: 12px; padding: 2px 8px; font-size: 0.8rem; font-weight: 500; display: inline-flex; align-items: center; gap: 4px;" title="Нажмите для просмотра определения">📖 ${w.word}</span>`;
            });
            wordsHtml += `</div>`;
        }

        let stickersCount = 0;
        if (window.app && window.app.state && window.app.state.blockStickersCount) {
            stickersCount = window.app.state.blockStickersCount[b.id] || 0;
        }
        const stickersCountHtml = stickersCount > 0 ? `<span style="font-size:0.7rem; font-weight:bold; background:#fde68a; border-radius:10px; padding:2px 5px; margin-left:4px; color:#b45309;">${stickersCount}</span>` : '';

        let contentHtml = `<div class="dialectics-content-inner">${blockHtml}</div>`;

        blockEl.innerHTML = `
            <div class="dialectics-block-sticky-header">
                ${extraHtml}
                <div class="dialectics-block-actions">
                    ${pinActionBtnHtml}
                    <button class="btn-block-sources" title="Sources">🔗${sourcesCountHtml}</button>
                    <button class="btn-block-words" title="Словарь">📖${wordsCountHtml}</button>
                    <button class="btn-block-hacks" title="${window._ ? window._('dialectics.hacks_title') : 'Хаки понимания'}">💡</button>
                    <button class="btn-block-sticker" title="Stickers" style="display: flex; align-items: center; justify-content: center; gap: 2px;"><div class="sticker-icon-mini" style="transform: scale(0.65); margin: 0;"></div>${stickersCountHtml}</button>
                    <button class="btn-block-hidden-phrases" title="Развернуть/свернуть сноски">👁</button>
                    <span class="btn-block-sep" style="width: 1px; height: 16px; background-color: #cbd5e1; margin: 0 4px; align-self: center;"></span>
                    <button class="btn-block-edit" title="Edit">✎</button>
                    ${b.role === 'step3' ? '<button class="btn-block-ai" title="Поиск противоположностей">✨</button>' : ''}
                    <button class="btn-block-check-ai" title="${window._ ? window._('dialectics.check_ai') : 'Проверить ИИ'}">🔬</button>
                    <button class="btn-block-copy" title="${window._ ? window._('dialectics.copy_text') : 'Скопировать текст'}">📋</button>
                    <button class="btn-block-color" title="Цвет">🎨</button>
                    <button class="btn-block-del" title="Delete">🗑️</button>
                </div>
            </div>
            ${contentHtml}
            ${wordsHtml}
        `;
        
        blockEl._rawHtml = blockHtml;
        if (typeof renderMathFn === 'function') renderMathFn(blockEl);

        const headerEl = blockEl.querySelector('.dialectics-block-header');
        if (headerEl) {
            headerEl.addEventListener('mouseenter', () => blockEl.setAttribute('draggable', 'true'));
            headerEl.addEventListener('mouseleave', () => {
                if (!blockEl.classList.contains('is-dragging')) blockEl.setAttribute('draggable', 'false');
            });
            headerEl.addEventListener('mousedown', (e) => {
                if (e.target.closest('button') || e.target.closest('.dialectics-step-info-trigger')) {
                    blockEl.setAttribute('draggable', 'false');
                    blockEl._preventDrag = true;
                } else {
                    blockEl.setAttribute('draggable', 'true');
                    blockEl._preventDrag = false;
                }
            });
        }

        const statusBtn = blockEl.querySelector('.btn-block-status');
        if (statusBtn) {
            statusBtn.onclick = (e) => {
                e.stopPropagation();
                e.preventDefault();
                if (callbacks.onStatusToggle) callbacks.onStatusToggle(blockEl);
            };
            statusBtn.onmousedown = (e) => e.stopPropagation();
        }

        const foldBtnEl = blockEl.querySelector('.btn-block-fold-toggle');
        if (foldBtnEl) {
            foldBtnEl.onclick = (e) => {
                e.stopPropagation();
                const currentlyCollapsed = blockEl.classList.contains('is-collapsed');
                if (currentlyCollapsed) {
                    blockEl.classList.remove('is-collapsed');
                    foldBtnEl.innerHTML = '▼';
                    blockEl.dataset.collapsed = 'false';
                } else {
                    blockEl.classList.add('is-collapsed');
                    foldBtnEl.innerHTML = '▶';
                    blockEl.dataset.collapsed = 'true';
                }
                if (callbacks.onFoldToggle) callbacks.onFoldToggle();
            };
        }

        const togglePinHandler = (e) => {
            e.stopPropagation();
            const currentlyPinned = blockEl.dataset.pinned === 'true' || blockEl.classList.contains('is-sticky');
            if (!currentlyPinned) {
                container.querySelectorAll('.dialectics-block.is-sticky').forEach(otherEl => {
                    if (otherEl !== blockEl) {
                        otherEl.classList.remove('is-sticky');
                        otherEl.dataset.pinned = 'false';
                        const otherHBtn = otherEl.querySelector('.btn-block-pin-header');
                        if (otherHBtn) {
                            otherHBtn.innerHTML = '📌';
                            otherHBtn.classList.remove('is-pinned');
                            otherHBtn.style.background = 'transparent';
                            otherHBtn.style.borderColor = 'transparent';
                            otherHBtn.style.color = '#94a3b8';
                            otherHBtn.title = "Заставить блок плавать при прокрутке";
                        }
                        const otherABtn = otherEl.querySelector('.btn-block-pin');
                        if (otherABtn) {
                            otherABtn.classList.remove('is-pinned');
                            otherABtn.style.color = 'inherit';
                            otherABtn.title = "Заставить блок плавать при прокрутке";
                        }
                    }
                });
            }

            const newState = !currentlyPinned;
            blockEl.dataset.pinned = newState ? 'true' : 'false';
            if (newState) blockEl.classList.add('is-sticky');
            else blockEl.classList.remove('is-sticky');

            const hBtn = blockEl.querySelector('.btn-block-pin-header');
            if (hBtn) {
                hBtn.innerHTML = newState ? '📌 Закреплен' : '📌';
                if (newState) {
                    hBtn.classList.add('is-pinned');
                    hBtn.style.background = '#e0e7ff';
                    hBtn.style.borderColor = '#6366f1';
                    hBtn.style.color = '#4338ca';
                } else {
                    hBtn.classList.remove('is-pinned');
                    hBtn.style.background = 'transparent';
                    hBtn.style.borderColor = 'transparent';
                    hBtn.style.color = '#94a3b8';
                }
                hBtn.title = newState ? "Открепить блок при прокрутке" : "Заставить блок плавать при прокрутке";
            }
            const aBtn = blockEl.querySelector('.btn-block-pin');
            if (aBtn) {
                if (newState) {
                    aBtn.classList.add('is-pinned');
                    aBtn.style.color = '#6366f1';
                } else {
                    aBtn.classList.remove('is-pinned');
                    aBtn.style.color = 'inherit';
                }
                aBtn.title = newState ? "Открепить блок при прокрутке" : "Заставить блок плавать при прокрутке";
            }

            if (callbacks.onSave) callbacks.onSave();
            else if (window.app && window.app.saveNote) window.app.saveNote();
        };

        const pinBtnEl = blockEl.querySelector('.btn-block-pin');
        if (pinBtnEl) pinBtnEl.onclick = togglePinHandler;
        const pinHeaderBtnEl = blockEl.querySelector('.btn-block-pin-header');
        if (pinHeaderBtnEl) pinHeaderBtnEl.onclick = togglePinHandler;

        const aiBtnEl = blockEl.querySelector('.btn-block-ai');
        if (aiBtnEl) {
            aiBtnEl.onclick = (e) => {
                e.stopPropagation();
                if (blockStatus === 'ready') {
                    if (window.showToast) window.showToast('Этот блок заблокирован от изменений.', 'warning');
                    return;
                }
                if (callbacks.onAI) callbacks.onAI(blockEl);
            };
        }
        const checkAiBtnEl = blockEl.querySelector('.btn-block-check-ai');
        if (checkAiBtnEl) {
            checkAiBtnEl.onclick = (e) => {
                e.stopPropagation();
                if (callbacks.onCheckAI) callbacks.onCheckAI(blockEl);
            };
        }
        const copyBtnEl = blockEl.querySelector('.btn-block-copy');
        if (copyBtnEl) {
            copyBtnEl.onclick = (e) => {
                e.stopPropagation();
                const innerEl = blockEl.querySelector('.dialectics-content-inner');
                if (innerEl) {
                    const text = innerEl.innerText || innerEl.textContent || '';
                    navigator.clipboard.writeText(text).then(() => {
                        const copiedMsg = window._ ? window._('dialectics.text_copied') : 'Текст скопирован в буфер обмена';
                        if (window.showToast) window.showToast(copiedMsg, 'success');
                    }).catch(err => console.error('Failed to copy: ', err));
                }
            };
        }
        blockEl.querySelector('.btn-block-edit').onclick = (e) => {
            e.stopPropagation();
            if (blockStatus === 'ready') {
                if (window.showToast) window.showToast('Этот блок заблокирован. Смените статус на «В работе», чтобы изменить его.', 'warning');
                return;
            }
            const activeT = b.tabs && b.tabs.find(t => t.id === b.active_tab_id);
            if (activeT && activeT.status === 'clean' && activeT.is_locked !== false) {
                if (window.showToast) window.showToast('Для редактирования чистовика сперва нажмите на иконку замка 🔒 в шапке вкладки', 'warning');
                return;
            }
            callbacks.onEdit(blockEl);
        };
        blockEl.querySelector('.btn-block-sticker').onclick = (e) => {
            e.stopPropagation();
            if (blockStatus === 'ready') {
                if (window.showToast) window.showToast('Этот блок заблокирован от изменений.', 'warning');
                return;
            }
            if (window.app) window.app.openStickersForCurrent(b.id);
        };
        const hiddenPhrasesBtn = blockEl.querySelector('.btn-block-hidden-phrases');
        if (hiddenPhrasesBtn) {
            hiddenPhrasesBtn.onclick = (e) => {
                e.stopPropagation();
                const phrases = blockEl.querySelectorAll('.dialectics-hidden-phrase');
                if (!phrases.length) {
                    if (window.showToast) window.showToast('В этом блоке нет сносок / скрытого текста', 'info');
                    return;
                }
                let anyCollapsed = false;
                phrases.forEach(el => {
                    if (el.getAttribute('data-expanded') !== 'true') anyCollapsed = true;
                });
                const targetState = anyCollapsed ? 'true' : 'false';
                phrases.forEach(el => el.setAttribute('data-expanded', targetState));
            };
        }
        if (b.sources) blockEl.dataset.sources = JSON.stringify(b.sources);
        if (b.words) blockEl.dataset.words = JSON.stringify(b.words);

        blockEl.querySelector('.btn-block-sources').onclick = (e) => {
            e.stopPropagation();
            if (blockStatus === 'ready') {
                if (window.showToast) window.showToast('Этот блок заблокирован от изменений.', 'warning');
                return;
            }
            if (callbacks.onSources) callbacks.onSources(blockEl);
        };
        blockEl.querySelector('.btn-block-words').onclick = (e) => {
            e.stopPropagation();
            if (blockStatus === 'ready') {
                if (window.showToast) window.showToast('Этот блок заблокирован от изменений.', 'warning');
                return;
            }
            if (callbacks.onWords) callbacks.onWords(blockEl);
        };
        const colorBtn = blockEl.querySelector('.btn-block-color');
        if (colorBtn) {
            colorBtn.onclick = (e) => {
                e.stopPropagation();
                if (blockStatus === 'ready') {
                    if (window.showToast) window.showToast('Этот блок заблокирован от изменений.', 'warning');
                    return;
                }
                if (callbacks.onColor) callbacks.onColor(blockEl);
            };
        }
        blockEl.querySelector('.btn-block-del').onclick = async (e) => {
            e.stopPropagation();
            if (blockStatus === 'ready') {
                if (window.showToast) window.showToast('Этот блок заблокирован от удаления. Смените статус на «В работе», чтобы удалить его.', 'warning');
                return;
            }
            const confirmed = await customConfirm({
                title: window._ ? window._('dialectics.delete_block_title') : 'Удаление блока',
                message: window._ ? window._('dialectics.delete_block_msg') : 'Вы уверены, что хотите удалить этот блок?',
                icon: '',
                buttons: [
                    { label: window._ ? window._('dialectics.cancel') : 'Отмена', value: false, class: 'confirm-btn-secondary' },
                    { label: window._ ? window._('dialectics.delete') : 'Удалить', value: true, class: 'confirm-btn-danger' }
                ]
            });
            if (confirmed) {
                const nextEl = blockEl.nextElementSibling;
                if (nextEl && nextEl.classList.contains('block-insert-row')) {
                    nextEl.remove();
                }
                // Отключаем ResizeObserver перед удалением блока
                if (blockEl._stickyHeaderObserver) {
                    blockEl._stickyHeaderObserver.disconnect();
                    blockEl._stickyHeaderObserver = null;
                }
                blockEl.remove();
                if (callbacks.onDelete) callbacks.onDelete(blockEl.dataset.blockId || blockEl.dataset.id);
            }
        };
        const hacksBtn = blockEl.querySelector('.btn-block-hacks');
        if (hacksBtn) {
            hacksBtn.onclick = (e) => {
                e.stopPropagation();
                if (blockStatus === 'ready') {
                    if (window.showToast) window.showToast('Этот блок заблокирован от изменений.', 'warning');
                    return;
                }
                if (callbacks.onHacks) callbacks.onHacks(blockEl);
            };
        }
        
        container.appendChild(blockEl);

        // Динамически включаем sticky только если блок достаточно высокий.
        // Минимальная высота: шапка (~60px) + контент + буфер (~120px суммарно).
        // Без этого шапка "плавала" даже на маленьких блоках.
        const STICKY_THRESHOLD = 180; // px — блок должен быть выше этого значения

        const updateStickyEligibility = () => {
            if (blockEl.classList.contains('is-collapsed')) {
                blockEl.classList.remove('header-can-stick');
                return;
            }
            const blockHeight = blockEl.getBoundingClientRect().height;
            if (blockHeight > STICKY_THRESHOLD) {
                blockEl.classList.add('header-can-stick');
            } else {
                blockEl.classList.remove('header-can-stick');
            }
        };

        if (typeof ResizeObserver !== 'undefined') {
            const ro = new ResizeObserver(() => updateStickyEligibility());
            ro.observe(blockEl);
            // Сохраняем ссылку на observer чтобы его можно было отключить при удалении блока
            blockEl._stickyHeaderObserver = ro;
        }

        // Обновляем при ручном сворачивании блока
        const foldBtnForSticky = blockEl.querySelector('.btn-block-fold-toggle');
        if (foldBtnForSticky) {
            foldBtnForSticky.addEventListener('click', () => {
                // Ждём один кадр пока классы обновятся
                requestAnimationFrame(() => updateStickyEligibility());
            }, { capture: false, passive: true });
        }
    }
};
