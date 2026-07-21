/**
 * BlockInsertAndHintBuilder.js - Построение строк добавления (разделителей +) и блоков подсказок (ИИ/подсказки)
 */
import { getHint } from '../BlockConstants.js';

export const BlockInsertAndHintBuilder = {
    createInsertRow(callbacks, targetIndex) {
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
    },

    renderHintBlock(container, hint, callbacks) {
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
    }
};
