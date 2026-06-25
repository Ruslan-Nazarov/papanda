/**
 * BlockManager.js - Управление блоками на холсте Диалектики
 */
import { customConfirm } from '../modal_controller.js';
import katex from 'katex';

export const BlockManager = {
    renderMath(element) {
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
    },

    render(container, blocks, callbacks) {
        if (!container) return;
        const divider = document.getElementById('canvasDivider');
        container.innerHTML = '';
        if (divider) container.appendChild(divider);

        const getHint = (key, defaultVal) => {
            if (typeof window._ === 'function') {
                const trans = window._(key);
                return trans !== key ? trans : defaultVal;
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

        blocks.forEach(b => {
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
                if (!specialBlocks[step.id]) {
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
                const isCenter = side === 'center';
                wrap.innerHTML = `<button class="btn-insert-block ${isCenter ? 'btn-insert-square' : 'btn-insert-round'}" title="${isCenter ? 'Add summary' : 'Add block'}">+</button>`;
                wrap.querySelector('button').onclick = (e) => {
                    e.stopPropagation();
                    callbacks.onInsertAfter(side, targetIndex - 1);
                };
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
                const hint = el.data;
                const div = document.createElement('div');
                div.className = `dialectics-hint-block block-${hint.side}`;
                div.dataset.hintId = hint.id;
                div.dataset.side = hint.side;
                const aiHelpText = hint.id === 'step3' ? getHint('dialectics.ai_opposites', 'ИИ-противоположности') : getHint('dialectics.ai_help', 'Помощь ИИ');
                div.innerHTML = `
                    <div class="dialectics-hint-text">${hint.text}</div>
                    <button class="btn-hint-ai" title="${aiHelpText}" style="position:absolute; right: 12px; top: 12px; background:rgba(255,255,255,0.7); border:1px solid #cbd5e1; border-radius:14px; padding:3px 10px; cursor:pointer; opacity:0.85; transition:all 0.2s; font-size: 0.82rem; display:flex; align-items:center; gap:5px; color:#334155; font-weight:500; box-shadow: 0 1px 2px rgba(0,0,0,0.05);"><span style="font-size:1rem;">✨</span> <span>${aiHelpText}</span></button>
                `;
                div.onclick = (e) => {
                    e.stopPropagation();
                    if (callbacks.onHintClick) callbacks.onHintClick(hint);
                };
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
                const blockEl = document.createElement('div');
                blockEl.className = `dialectics-block block-${b.side || 'left'}`;
                blockEl.dataset.blockId = b.id;
                if (b.role) blockEl.dataset.role = b.role;
                
                let extraHtml = '';
                if (b.role) {
                    let titleText = '';
                    if (b.role === 'anchor') titleText = ANCHOR_HINT.title;
                    else {
                        const step = STEPS.find(s => s.id === b.role);
                        if (step) titleText = step.title;
                    }
                    if (titleText) {
                        extraHtml = `<div style="font-size: 0.8rem; color: #64748b; font-weight: 700; padding: 12px 14px 0 14px; text-transform: uppercase;">${titleText}</div>`;
                    }
                }

                let sourcesCountHtml = '';
                if (b.sources && b.sources.length > 0) {
                    sourcesCountHtml = `<span style="font-size:0.7rem; font-weight:bold; background:#e2e8f0; border-radius:10px; padding:2px 5px; margin-left:4px;">${b.sources.length}</span>`;
                }

                blockEl.innerHTML = `
                    <div class="dialectics-block-actions">
                        <button class="btn-block-edit" title="Edit">✎</button>
                        ${b.role === 'step3' ? '<button class="btn-block-ai" title="Поиск противоположностей">✨</button>' : ''}
                        <button class="btn-block-sources" title="Sources">🔗${sourcesCountHtml}</button>
                        <button class="btn-block-sticker" title="Stickers" style="display: flex; align-items: center; justify-content: center;"><div class="sticker-icon-mini" style="transform: scale(0.65); margin: 0;"></div></button>
                        <button class="btn-block-del" title="Delete">🗑️</button>
                    </div>
                    ${extraHtml}
                    <div class="dialectics-content-inner">${b.html}</div>
                `;
                
                this.renderMath(blockEl);

                const aiBtnEl = blockEl.querySelector('.btn-block-ai');
                if (aiBtnEl) {
                    aiBtnEl.onclick = (e) => {
                        e.stopPropagation();
                        if (callbacks.onAI) callbacks.onAI(blockEl);
                    };
                }
                blockEl.querySelector('.btn-block-edit').onclick = (e) => {
                    e.stopPropagation();
                    callbacks.onEdit(blockEl);
                };
                blockEl.querySelector('.btn-block-sticker').onclick = (e) => {
                    e.stopPropagation();
                    if(window.app) window.app.openStickersForCurrent(b.id);
                };
                if (b.sources) {
                    blockEl.dataset.sources = JSON.stringify(b.sources);
                }

                blockEl.querySelector('.btn-block-sources').onclick = (e) => {
                    e.stopPropagation();
                    if (callbacks.onSources) callbacks.onSources(blockEl);
                };
                blockEl.querySelector('.btn-block-del').onclick = async (e) => {
                    e.stopPropagation();
                    const confirmed = await customConfirm({
                        title: window._ ? window._('dialectics.delete_block_title') : 'Удаление блока',
                        message: window._ ? window._('dialectics.delete_block_msg') : 'Вы уверены, что хотите удалить этот блок?',
                        icon: '🗑️',
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
                        if (callbacks.onDelete) callbacks.onDelete();
                    }
                };
                
                container.appendChild(blockEl);

                if (callbacks.onInsertAfter) {
                    container.appendChild(createInsertRow(logicalBlockIndex + 1));
                }
                logicalBlockIndex++;
            }
        });
    },

    getBlocks(container) {
        if (!container) return [];
        const blocks = [];
        container.querySelectorAll('.dialectics-block').forEach(b => {
            const inner = b.querySelector('.dialectics-content-inner');
            if (inner) {
                let sources = [];
                try {
                    if (b.dataset.sources) {
                        sources = JSON.parse(b.dataset.sources);
                    }
                } catch(e) {}

                blocks.push({
                    id: b.dataset.blockId || ('block_' + Math.random().toString(36).substring(2, 9)),
                    side: b.classList.contains('block-left') ? 'left' : 
                          b.classList.contains('block-center') ? 'center' : 'right',
                    html: inner.innerHTML,
                    role: b.dataset.role || undefined,
                    sources: sources
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
