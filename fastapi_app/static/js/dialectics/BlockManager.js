/**
 * BlockManager.js - Управление блоками на холсте Диалектики
 */
import { customConfirm, customPrompt } from '../modal_controller.js';
import { renderAlternativesWidget } from './editor_setup.js';
import katex from 'katex';

window.DIALECTICS_HINTS = null;
fetch('/api/ai/dialectics/hints')
    .then(r => r.json())
    .then(data => { window.DIALECTICS_HINTS = data; })
    .catch(e => console.warn('Failed to load dialectics hints:', e));

export const COLOR_PRESETS = {
    blue: {
        bg: 'linear-gradient(135deg, #ffffff 0%, #eff6ff 100%)',
        accent: '#3b82f6'
    },
    green: {
        bg: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)',
        accent: '#10b981'
    },
    red: {
        bg: 'linear-gradient(135deg, #ffffff 0%, #fff1f2 100%)',
        accent: '#ef4444'
    },
    yellow: {
        bg: 'linear-gradient(135deg, #ffffff 0%, #fffbeb 100%)',
        accent: '#f59e0b'
    },
    purple: {
        bg: 'linear-gradient(135deg, #ffffff 0%, #faf5ff 100%)',
        accent: '#8b5cf6'
    }
};

export const BlockManager = {
    globalCallbacks: {},
    setCallbacks(callbacks) {
        this.globalCallbacks = callbacks;
    },
    renderMath(element) {
        // Convert raw text like $formula$ into <span data-type="mathNode">
        const walk = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
        let textNode;
        const nodesToReplace = [];
        
        while (textNode = walk.nextNode()) {
            const parent = textNode.parentNode;
            if (parent && 
                parent.tagName !== 'SCRIPT' && 
                parent.tagName !== 'STYLE' && 
                parent.tagName !== 'CODE' && 
                parent.tagName !== 'PRE' && 
                parent.getAttribute('data-type') !== 'mathNode' &&
                !parent.closest('.ProseMirror')) {
                
                const text = textNode.nodeValue;
                if (text.includes('$')) {
                    nodesToReplace.push(textNode);
                }
            }
        }
        
        nodesToReplace.forEach(node => {
            const text = node.nodeValue;
            const mathRegex = /(\$\$[\s\S]+?\$\$|\$[^\$]+?\$)/g;
            let lastIndex = 0;
            let match;
            const fragments = document.createDocumentFragment();
            let hasMatches = false;
            
            while ((match = mathRegex.exec(text)) !== null) {
                hasMatches = true;
                const matchIndex = match.index;
                const rawMatch = match[0];
                
                if (matchIndex > lastIndex) {
                    fragments.appendChild(document.createTextNode(text.substring(lastIndex, matchIndex)));
                }
                
                const isDisplay = rawMatch.startsWith('$$');
                const latex = isDisplay ? rawMatch.slice(2, -2) : rawMatch.slice(1, -1);
                
                const mathSpan = document.createElement('span');
                mathSpan.setAttribute('data-type', 'mathNode');
                mathSpan.setAttribute('latex', latex.trim());
                mathSpan.className = 'math-node';
                fragments.appendChild(mathSpan);
                
                lastIndex = mathRegex.lastIndex;
            }
            
            if (hasMatches) {
                if (lastIndex < text.length) {
                    fragments.appendChild(document.createTextNode(text.substring(lastIndex)));
                }
                node.parentNode.replaceChild(fragments, node);
            }
        });

        // Now render all mathNode spans
        const mathNodes = element.querySelectorAll('span[data-type="mathNode"]');
        mathNodes.forEach(node => {
            const latex = node.getAttribute('latex');
            if (latex) {
                try {
                    katex.render(latex, node, { throwOnError: false });
                } catch(e) {
                    node.textContent = latex;
                    node.style.color = 'red';
                }
            }
        });

        // Render quotes authors/sources
        const quotes = element.querySelectorAll('blockquote[data-type="quoteBlock"]');
        quotes.forEach(quote => {
            const author = quote.getAttribute('data-author');
            if (author) {
                if (!quote.querySelector('.quote-author-line')) {
                    const authorLine = document.createElement('div');
                    authorLine.className = 'quote-author-line';
                    authorLine.contentEditable = 'false';
                    authorLine.innerHTML = `<span class="quote-author-text">— ${author}</span>`;
                    quote.appendChild(authorLine);
                }
            }
        });

        // Render inline alternatives widgets on canvas
        const altBlocks = element.querySelectorAll('div[data-type="alternativesBlock"]');
        altBlocks.forEach(altEl => {
            let options = [];
            try {
                options = JSON.parse(altEl.getAttribute('data-options'));
            } catch(e) {}
            if (!Array.isArray(options) || options.length === 0) {
                options = ['Вариант 1: Напишите первую формулировку...', 'Вариант 2: Напишите альтернативную формулировку...'];
            }
            renderAlternativesWidget(
                altEl,
                options,
                null,
                (selectedText) => {
                    const contentToInsert = (selectedText.includes('<') && selectedText.includes('>')) ? selectedText : `<p>${selectedText}</p>`;
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = contentToInsert;
                    const blockEl = altEl.closest('.dialectics-block');
                    if (blockEl) {
                        altEl.replaceWith(...tempDiv.childNodes);
                        const blockId = blockEl.dataset.blockId || blockEl.dataset.id;
                        if (window.app && window.app.note && window.app.note.blocks) {
                            const b = window.app.note.blocks.find(item => item.id === blockId);
                            if (b) {
                                const activeTabEl = blockEl.querySelector('.block-tab-content.active');
                                if (activeTabEl) {
                                    const tabId = activeTabEl.dataset.tabId;
                                    if (b.tabs) {
                                        const tab = b.tabs.find(t => t.id === tabId);
                                        if (tab) tab.html = activeTabEl.innerHTML;
                                    } else {
                                        b.html = activeTabEl.innerHTML;
                                    }
                                } else {
                                    const inner = blockEl.querySelector('.dialectics-content-inner');
                                    if (inner) b.html = inner.innerHTML;
                                }
                                if (window.app.saveNote) window.app.saveNote();
                            }
                        }
                    }
                }
            );
        });
    },

    updateProgressWidget(blocks) {
        const container = document.getElementById('noteProgressWidget');
        if (!container) return;

        const nonSections = (blocks || []).filter(b => b && !b.isSection && b.side !== 'section' && b.role !== 'anchor');
        const total = nonSections.length;
        const ready = nonSections.filter(b => b.status === 'ready').length;
        const working = nonSections.filter(b => b.status === 'in_progress').length;

        const readyCountEl = document.getElementById('noteProgressReadyCount');
        const workingCountEl = document.getElementById('noteProgressWorkingCount');
        const totalCountEl = document.getElementById('noteProgressTotalCount');
        const percentEl = document.getElementById('noteProgressPercent');
        const readyBar = document.getElementById('noteProgressReadyBar');
        const workingBar = document.getElementById('noteProgressWorkingBar');

        if (readyCountEl) readyCountEl.innerText = ready;
        if (workingCountEl) workingCountEl.innerText = working;
        if (totalCountEl) totalCountEl.innerText = total;

        if (total === 0) {
            container.style.opacity = '0.5';
            if (percentEl) percentEl.innerText = '0%';
            if (readyBar) readyBar.style.width = '0%';
            if (workingBar) workingBar.style.width = '0%';
            return;
        }

        container.style.opacity = '1';
        const readyPercent = (ready / total) * 100;
        const workingPercent = (working / total) * 100;

        if (percentEl) {
            percentEl.innerText = Math.round(readyPercent) + '%';
        }
        if (readyBar) {
            readyBar.style.width = `${readyPercent}%`;
        }
        if (workingBar) {
            workingBar.style.width = `${workingPercent}%`;
        }
    },

    render(container, blocks, callbacks = {}) {
        if (!container) return;
        
        callbacks = { ...this.globalCallbacks, ...callbacks };
        const divider = document.getElementById('canvasDivider');
        container.innerHTML = '';
        if (divider) container.appendChild(divider);

        this.updateProgressWidget(blocks);


        const getHint = (key, defaultVal) => {
            if (typeof window._ === 'function') {
                const trans = window._(key);
                if (trans && trans !== key) return trans;
            }
            const shortKey = key.replace('dialectics.hints.', '');
            if (window.DIALECTICS_HINTS && window.DIALECTICS_HINTS[shortKey]) {
                return window.DIALECTICS_HINTS[shortKey];
            }
            return defaultVal;
        };

        const ANCHOR_HINT = {
            id: 'anchor',
            side: 'left',
            text: getHint('dialectics.hints.anchor', 'Что вам нужно понять?'),
            title: getHint('dialectics.hints.anchor', 'Что вам нужно понять?')
        };

        const STEPS = [
            {
                id: 'step1',
                side: 'left',
                text: getHint('dialectics.hints.step1', '<div style="font-size:1.02em; font-weight:500; color:#1e293b; margin-bottom:8px;">Опишите простейший процесс, который, по вашему мнению, лежит в основе проблемы, которую вы хотите понять.</div><div style="font-size:0.85em; color:#64748b; font-weight:400; line-height:1.35;">Примером простейшего процесса может быть суммирование. Если вы затрудняетесь, то нажмите кнопку Помощь ИИ. Помните, что ИИ не способен к пониманию, но может предоставить вам знания.</div>'),
                title: getHint('dialectics.hints.step1_title', 'Простейший процесс')
            },
            {
                id: 'step2',
                side: 'right',
                text: getHint('dialectics.hints.step2', '<div style="font-size:1.02em; font-weight:500; color:#1e293b; margin-bottom:8px;">Опишите, как развивается этот простейший процесс.</div><div style="font-size:0.85em; color:#64748b; font-weight:400; line-height:1.35;">Развитие – это взаимодействие процесса с другими процессами в мире. Например, если простейшим является суммирование, то его развитием будет суммирование пяти, десяти и т.п. единиц, использование суммирования в торговле, праве, науке. Если вы сомневаетесь или не знаете, то можете нажать кнопку Помощь ИИ. Однако помните, что ИИ не может заменить человека в понимании процессов, ИИ может только предоставить знания.</div>'),
                title: getHint('dialectics.hints.step2_title', 'Опишите как развивается этот простейший процесс')
            },
            {
                id: 'step3',
                side: 'left',
                text: getHint('dialectics.hints.step3', '<div style="font-size:1.02em; font-weight:500; color:#1e293b; margin-bottom:8px;">Вы уже нашли простейший процесс, посмотрели, как он развивается. В этом развитии вы должны отыскать противоположный процесс.</div><div style="font-size:0.85em; color:#64748b; font-weight:400; line-height:1.35;">Вы можете сделать это через специальный ИИ под кнопкой ✨. А можете сделать это самостоятельно. Противоположным является такой процесс, который сам остается самостоятельным, но полностью исключает другой.</div>'),
                title: getHint('dialectics.hints.step3_title', 'Найти противоположный процесс')
            },
            {
                id: 'step4',
                side: 'right',
                text: getHint('dialectics.hints.step4', 'Опишите развитие противоположного процесса'),
                title: getHint('dialectics.hints.step4', 'Опишите развитие противоположного процесса')
            },
            {
                id: 'step5',
                side: 'center',
                text: getHint('dialectics.hints.step5', 'Объедините оба противоположных процесса в одно общее развитие. К каким противоречиям это приводит? Как могут быть разрешены противоречия?'),
                title: getHint('dialectics.hints.step5', 'Объедините оба противоположных процесса в одно общее развитие. К каким противоречиям это приводит? Как могут быть разрешены противоречия?')
            }
        ];


        const specialBlocks = {};
        const normalBlocks = [];
        let curSideRoles = { left: 'step1', right: 'step2', center: 'step5' };

        blocks.forEach(b => {
            const isSec = b.isSection === true || b.side === 'section';
            if (b.role && b.role !== 'anchor') {
                if (b.side && curSideRoles[b.side]) {
                    curSideRoles[b.side] = b.role;
                }
            }

            if (b.role) {
                specialBlocks[b.role] = b;
                if (b.role !== 'anchor') {
                    normalBlocks.push(b); // Include steps in normal flow
                }
            } else {
                normalBlocks.push(b);
            }
        });

        const stepOrder = { 'step1': 1, 'step2': 2, 'step3': 3, 'step4': 4, 'step5': 5 };
        const allElements = [];

        if (!specialBlocks['anchor']) {
            normalBlocks.forEach(b => allElements.push({ type: 'block', data: b }));
            allElements.push({ type: 'hint', data: ANCHOR_HINT });
        } else {
            let nextHint = null;
            for (const step of STEPS) {
                const isDismissed = window.app && window.app.state && window.app.state.dismissedHints && window.app.state.dismissedHints.includes(step.id);
                const showHidden = document.getElementById('toggleShowHiddenHints')?.checked;
                if (!specialBlocks[step.id] && !(isDismissed && !showHidden)) {
                    nextHint = step;
                    break;
                }
            }

            let hintPushed = false;
            normalBlocks.forEach(b => {
                if (nextHint && !hintPushed && b.role && stepOrder[b.role] && stepOrder[b.role] > stepOrder[nextHint.id]) {
                    allElements.push({ type: 'hint', data: nextHint });
                    hintPushed = true;
                }
                allElements.push({ type: 'block', data: b });
            });

            if (nextHint && !hintPushed) {
                allElements.push({ type: 'hint', data: nextHint });
            }

            allElements.push({ type: 'block', data: specialBlocks['anchor'] });
        }

        const createInsertRow = (targetIndex) => {
            const zone = document.createElement('div');
            zone.className = `block-insert-row`;
            
            ['left', 'right', 'center'].forEach(side => {
                const wrap = document.createElement('div');
                wrap.className = `insert-wrap insert-wrap--${side}`;
                if (side === 'left') {
                    wrap.style.display = 'flex';
                    wrap.style.gap = '8px';
                    wrap.style.alignItems = 'center';
                    wrap.style.justifyContent = 'center';
                    wrap.innerHTML = `
                        <button class="btn-insert-block btn-insert-round" title="Добавить блок">+</button>
                    `;
                    const btns = wrap.querySelectorAll('button');
                    btns[0].onclick = (e) => {
                        e.stopPropagation();
                        callbacks.onInsertAfter('left', targetIndex - 1);
                    };
                } else if (side === 'right') {
                    wrap.style.display = 'flex';
                    wrap.style.gap = '8px';
                    wrap.style.alignItems = 'center';
                    wrap.style.justifyContent = 'center';
                    wrap.innerHTML = `
                        <button class="btn-insert-block btn-insert-round" title="Добавить блок">+</button>
                        <button class="btn-insert-block btn-insert-section" title="Добавить раздел">📑 Раздел</button>
                    `;
                    const btns = wrap.querySelectorAll('button');
                    btns[0].onclick = (e) => {
                        e.stopPropagation();
                        callbacks.onInsertAfter('right', targetIndex - 1);
                    };
                    btns[1].onclick = (e) => {
                        e.stopPropagation();
                        callbacks.onInsertAfter('section', targetIndex - 1);
                    };
                } else {
                    wrap.style.display = 'flex';
                    wrap.style.gap = '8px';
                    wrap.style.alignItems = 'center';
                    wrap.style.justifyContent = 'center';
                    wrap.innerHTML = `
                        <button class="btn-insert-block btn-insert-square" title="Add summary">+</button>
                    `;
                    const btns = wrap.querySelectorAll('button');
                    btns[0].onclick = (e) => {
                        e.stopPropagation();
                        callbacks.onInsertAfter('center', targetIndex - 1);
                    };
                }
                zone.appendChild(wrap);
            });
            
            return zone;
        };

        if (callbacks.onInsertAfter) {
            container.appendChild(createInsertRow(0));
        }

        let logicalBlockIndex = 0;

        allElements.forEach((el) => {
            if (el.type === 'hint') {
                const isNoDialectics = container.classList.contains('mode-no-dialectics') || 
                                       (document.getElementById('toggleDialecticsMode') && !document.getElementById('toggleDialecticsMode').checked);
                if (isNoDialectics) return;
                const hint = el.data;
                const div = document.createElement('div');
                div.className = `dialectics-hint-block block-${hint.side}`;
                div.dataset.hintId = hint.id;
                div.dataset.side = hint.side;
                const aiHelpText = hint.id === 'step3' ? getHint('dialectics.ai_opposites', 'ИИ-противоположности') : getHint('dialectics.ai_help', 'Помощь ИИ');
                div.innerHTML = `
                    <button class="btn-hint-dismiss" title="Скрыть подсказку" style="position:absolute; left: 12px; top: 12px; background:none; border:none; cursor:pointer; font-size:1rem; color:#94a3b8; transition:color 0.2s; display:flex; align-items:center; justify-content:center; padding:2px; z-index:10;">✕</button>
                    <div class="dialectics-hint-text">${hint.text}</div>
                    <button class="btn-hint-ai" title="${aiHelpText}" style="position:absolute; right: 12px; top: 12px; background:rgba(255,255,255,0.7); border:1px solid #cbd5e1; border-radius:14px; padding:3px 10px; cursor:pointer; opacity:0.85; transition:all 0.2s; font-size: 0.82rem; display:flex; align-items:center; gap:5px; color:#334155; font-weight:500; box-shadow: 0 1px 2px rgba(0,0,0,0.05);"><span style="font-size:1rem;">✨</span> <span>${aiHelpText}</span></button>
                `;
                div.onclick = (e) => {
                    e.stopPropagation();
                    if (callbacks.onHintClick) callbacks.onHintClick(hint);
                };
                const dismissBtn = div.querySelector('.btn-hint-dismiss');
                if (dismissBtn) {
                    dismissBtn.onmouseover = () => dismissBtn.style.color = '#ef4444';
                    dismissBtn.onmouseleave = () => dismissBtn.style.color = '#94a3b8';
                    dismissBtn.onclick = (e) => {
                        e.stopPropagation();
                        if (callbacks.onHintDismiss) callbacks.onHintDismiss(hint.id);
                    };
                }
                const aiBtn = div.querySelector('.btn-hint-ai');
                if (aiBtn) {
                    aiBtn.onmouseover = () => aiBtn.style.opacity = '1';
                    aiBtn.onmouseout = () => aiBtn.style.opacity = '0.6';
                    aiBtn.onclick = (e) => {
                        e.stopPropagation();
                        if (callbacks.onHintAI) callbacks.onHintAI(hint);
                    };
                }
                container.appendChild(div);
            } else {
                const b = el.data;
                if (!b.id) b.id = 'block_' + Math.random().toString(36).substring(2, 9);
                const isSection = b.isSection === true || b.side === 'section';
                const blockEl = document.createElement('div');
                blockEl.className = `dialectics-block block-${b.side || 'left'}${isSection ? ' block-section' : ''}`;
                blockEl.dataset.blockId = b.id;
                if (b.role) blockEl.dataset.role = b.role;
                if (isSection) blockEl.dataset.isSection = 'true';
                
                let titleText = b.title || '';
                if (isSection) {
                    if (!titleText) titleText = 'Раздел';
                    blockEl.className = 'dialectics-block block-section';
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
                    if (callbacks.onInsertAfter) {
                        container.appendChild(createInsertRow(logicalBlockIndex + 1));
                    }
                    logicalBlockIndex++;
                    return;
                }

                if (!titleText && b.role) {
                    if (b.role === 'anchor') titleText = ANCHOR_HINT.title;
                    else {
                        const step = STEPS.find(s => s.id === b.role);
                        if (step) titleText = step.title;
                    }
                }
                if (!titleText) {
                    titleText = isSection ? 'Раздел' : (b.side === 'center' ? 'Связующий блок' : 'Блок');
                }

                let infoIconHtml = '';
                if (b.role) {
                    let stepText = '';
                    if (b.role === 'anchor') stepText = ANCHOR_HINT.text;
                    else {
                        const step = STEPS.find(s => s.id === b.role);
                        if (step) stepText = step.text;
                    }
                    const cleanStepText = stepText.replace(/<[^>]*>/g, '').trim();
                    infoIconHtml = `<span class="dialectics-step-info-trigger" title="${cleanStepText}" style="cursor:help; margin-left:6px; color:#94a3b8; font-size:0.9rem; font-weight:normal; vertical-align:middle; transition:color 0.2s;" onmouseover="this.style.color='#64748b'" onmouseout="this.style.color='#94a3b8'">ℹ️</span>`;
                }

                const isCollapsed = b.collapsed === true;
                if (isCollapsed) {
                    blockEl.classList.add('is-collapsed');
                }
                blockEl.dataset.collapsed = isCollapsed ? 'true' : 'false';
                
                const isPinned = b.pinned === true || b.isPinned === true || b.isSticky === true || b.dataset?.pinned === 'true';
                if (isPinned && (b.side === 'left' || !b.side)) {
                    blockEl.classList.add('is-sticky');
                }
                blockEl.dataset.pinned = (isPinned && (b.side === 'left' || !b.side)) ? 'true' : 'false';
                
                const blockStatus = b.status || 'none';
                blockEl.dataset.status = blockStatus;

                if (b.title) {
                    blockEl.dataset.title = b.title;
                }
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
                    <div class="dialectics-block-header" style="display:flex; align-items:center; justify-content:space-between; font-size: 0.8rem; color: #64748b; font-weight: 700; padding: 12px 14px 6px 14px; border-bottom:1px solid #f1f5f9; text-transform: uppercase; background:#f8fafc; border-top-left-radius:12px; border-top-right-radius:12px; cursor: grab; position: sticky; top: 0; z-index: 15; box-shadow: 0 2px 6px -1px rgba(0,0,0,0.05);" title="Зажмите заголовок для перетаскивания блока">
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
                    ${extraHtml}
                    ${contentHtml}
                    ${wordsHtml}
                `;
                
                this.renderMath(blockEl);

                const headerEl = blockEl.querySelector('.dialectics-block-header');
                if (headerEl) {
                    headerEl.addEventListener('mouseenter', () => {
                        blockEl.setAttribute('draggable', 'true');
                    });
                    headerEl.addEventListener('mouseleave', () => {
                        if (!blockEl.classList.contains('is-dragging')) {
                            blockEl.setAttribute('draggable', 'false');
                        }
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

                // Status Toggle Click Handler
                const statusBtn = blockEl.querySelector('.btn-block-status');
                if (statusBtn) {
                    statusBtn.onclick = (e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        if (callbacks.onStatusToggle) callbacks.onStatusToggle(blockEl);
                    };
                    statusBtn.onmousedown = (e) => {
                        e.stopPropagation();
                    };
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
                        // Unpin other left blocks so they don't collide when scrolling
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
                    if (newState) {
                        blockEl.classList.add('is-sticky');
                    } else {
                        blockEl.classList.remove('is-sticky');
                    }

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

                    if (callbacks.onSave) {
                        callbacks.onSave();
                    } else if (window.app && window.app.saveNote) {
                        window.app.saveNote();
                    }
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
                            }).catch(err => {
                                console.error('Failed to copy: ', err);
                            });
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
                    if(window.app) window.app.openStickersForCurrent(b.id);
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
                        phrases.forEach(el => {
                            el.setAttribute('data-expanded', targetState);
                        });
                    };
                }
                if (b.sources) {
                    blockEl.dataset.sources = JSON.stringify(b.sources);
                }
                if (b.words) {
                    blockEl.dataset.words = JSON.stringify(b.words);
                }

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

                if (callbacks.onInsertAfter) {
                    container.appendChild(createInsertRow(logicalBlockIndex + 1));
                }
                logicalBlockIndex++;
            }
        });

        if (typeof window.applyCanvasModes === 'function') window.applyCanvasModes();
    },

    getBlocks(container) {
        if (!container) return [];
        const blocks = [];
        container.querySelectorAll('.dialectics-block').forEach(b => {
            const isSection = b.dataset.isSection === 'true' || b.classList.contains('block-section') || b.dataset.side === 'section';
            if (isSection) {
                const titleEl = b.querySelector('.block-title-text');
                const titleText = b.dataset.title || (titleEl ? titleEl.innerText : 'Раздел');
                blocks.push({
                    id: b.dataset.blockId || b.dataset.id || ('block_' + Math.random().toString(36).substring(2, 9)),
                    side: 'section',
                    isSection: true,
                    title: titleText,
                    html: `<p>${titleText}</p>`
                });
                return;
            }
            const inner = b.querySelector('.dialectics-content-inner');
            if (inner) {
                let sources = [];
                try {
                    if (b.dataset.sources) {
                        sources = JSON.parse(b.dataset.sources);
                    }
                } catch(e) {}

                let words = [];
                try {
                    if (b.dataset.words) {
                        words = JSON.parse(b.dataset.words);
                    }
                } catch(e) {}

                let html = inner.innerHTML;
                if (b._tiptapEditor) {
                    html = b._tiptapEditor.getHTML();
                }

                let title = b.dataset.title || undefined;
                if (b.classList.contains('is-editing')) {
                    const inlineTitleInput = b.querySelector('.inline-title-input');
                    if (inlineTitleInput) {
                        title = inlineTitleInput.value.trim() || undefined;
                    }
                }

                blocks.push({
                    id: b.dataset.blockId || ('block_' + Math.random().toString(36).substring(2, 9)),
                    side: (b.classList.contains('block-left') ? 'left' : 
                          b.classList.contains('block-center') ? 'center' : 'right'),
                    isSection: false,
                    html: html,
                    role: b.dataset.role || undefined,
                    sources: sources,
                    title: title,
                    collapsed: b.dataset.collapsed === 'true',
                    pinned: b.dataset.pinned === 'true' || b.classList.contains('is-sticky'),
                    words: words,
                    color: b.dataset.color || undefined,
                    status: b.dataset.status || "none"
                });
            }
        });
        return blocks;
    },

    getLastSide(container) {
        if (!container) return null;
        const blocks = container.querySelectorAll('.dialectics-block');
        if (blocks.length === 0) return null;
        return blocks[blocks.length - 1].classList.contains('block-left') ? 'left' : 'right';
    }
};
