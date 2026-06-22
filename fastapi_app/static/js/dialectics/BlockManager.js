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

        const ANCHOR_HINT = {
            id: 'anchor', side: 'left', text: 'Что вам нужно понять?', title: 'Что вам нужно понять?'
        };

        const STEPS = [
            { id: 'step1', side: 'left', text: 'Простейший процесс', title: 'Простейший процесс' },
            { id: 'step2', side: 'right', text: 'Опишите как развивается этот простейший процесс', title: 'Опишите как развивается этот простейший процесс' },
            { id: 'step3', side: 'left', text: 'Найти противоположный процесс', title: 'Найти противоположный процесс' },
            { id: 'step4', side: 'right', text: 'Опишите развитие противоположного процесса', title: 'Опишите развитие противоположного процесса' },
            { id: 'step5', side: 'center', text: 'Объедините оба противоположных процесса в одно общее развитие, движение, к каким противоречиям это приводит и как разрешается это противоречие', title: 'Объедините оба противоположных процесса в одно общее развитие, движение, к каким противоречиям это приводит и как разрешается это противоречие' }
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

        const allElements = [];

        // Always push normal blocks first
        normalBlocks.forEach(b => allElements.push({ type: 'block', data: b }));

        if (!specialBlocks['anchor']) {
            allElements.push({ type: 'hint', data: ANCHOR_HINT });
        } else {

            let nextHint = null;
            for (const step of STEPS) {
                if (!specialBlocks[step.id]) {
                    nextHint = step;
                    break;
                }
            }

            if (nextHint) {
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
                div.innerHTML = `
                    <div class="dialectics-hint-text">${hint.text}</div>
                    <button class="btn-hint-ai" title="Ask AI for this step" style="position:absolute; right: 10px; top: 10px; background:transparent; border:none; cursor:pointer; opacity:0.6; transition:opacity 0.2s; font-size: 1.2rem;">✨</button>
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

                blockEl.innerHTML = `
                    <div class="dialectics-block-actions">
                        <button class="btn-block-edit" title="Edit">✎</button>
                        <button class="btn-block-ai" title="Ask AI">✨</button>
                        <button class="btn-block-sticker" title="Stickers" style="display: flex; align-items: center; justify-content: center;"><div class="sticker-icon-mini" style="transform: scale(0.65); margin: 0;"></div></button>
                        <button class="btn-block-del" title="Delete">🗑️</button>
                    </div>
                    ${extraHtml}
                    <div class="dialectics-content-inner">${b.html}</div>
                `;
                
                this.renderMath(blockEl);

                blockEl.querySelector('.btn-block-ai').onclick = (e) => {
                    e.stopPropagation();
                    if (callbacks.onAI) callbacks.onAI(blockEl);
                };
                blockEl.querySelector('.btn-block-edit').onclick = (e) => {
                    e.stopPropagation();
                    callbacks.onEdit(blockEl);
                };
                blockEl.querySelector('.btn-block-sticker').onclick = (e) => {
                    e.stopPropagation();
                    if(window.app) window.app.openStickersForCurrent(b.id);
                };
                blockEl.querySelector('.btn-block-del').onclick = async (e) => {
                    e.stopPropagation();
                    const confirmed = await customConfirm({
                        title: 'Delete block',
                        message: 'Are you sure you want to delete this block?',
                        icon: '🗑️',
                        buttons: [
                            { label: 'Cancel', value: false, class: 'confirm-btn-secondary' },
                            { label: 'Delete', value: true, class: 'confirm-btn-danger' }
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
                blocks.push({
                    id: b.dataset.blockId || ('block_' + Math.random().toString(36).substring(2, 9)),
                    side: b.classList.contains('block-left') ? 'left' : 
                          b.classList.contains('block-center') ? 'center' : 'right',
                    html: inner.innerHTML,
                    role: b.dataset.role || undefined
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
