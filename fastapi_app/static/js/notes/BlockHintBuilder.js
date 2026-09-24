import AppState from './AppState.js';
import { ALGORITHM_STEPS, ALGORITHM_TEXTS } from './BlockConstants.js';
import { t } from '../i18n.js';
import AIController from './AIController.js';

class BlockHintBuilder {
    /**
     * Build a hint block element.
     */
    static build(stepRole, stepSide, onRenderAll) {
        // In AI mode the very first block is an inline "what do you want to
        // understand?" field + a one-click "build the whole note" button —
        // no modal, no click-to-discover.
        if (stepRole === 'anchor' && AppState.isAutoFillEnabled) {
            return this._buildAnchorStarter(onRenderAll);
        }

        const div = document.createElement('div');

        div.className = `dialectics-hint-block block-${stepSide} block-hint`;
        div.dataset.hintId = stepRole;
        div.dataset.side = stepSide;
        div.dataset.role = stepRole;
        div.tabIndex = 0;
        div.setAttribute('role', 'button');
        div.addEventListener('keydown', event => {
            if (event.target === div && ['Enter', ' '].includes(event.key)) {
                event.preventDefault();
                div.click();
            }
        });

        div.style.backgroundColor = '#f1f5f9';
        div.style.border = 'none';
        div.style.borderRadius = '16px';
        div.style.padding = '20px 30px 30px 30px';
        div.style.cursor = 'pointer';
        div.style.position = 'relative';
        div.style.boxShadow = 'none';
        div.style.borderLeft = 'none';

        const stepObj = ALGORITHM_STEPS.find(s => s.role === stepRole) || { title: t('new_block_default') };
        // Текст подсказки: window.__ALGORITHM__ (из 7_*.json) → i18n hint_* → заголовок.
        const promptText = ALGORITHM_TEXTS[stepRole] || stepObj.title;

        div.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                <button class="btn-dismiss" title="${t('hide')}" style="background: transparent; border: none; color: #94a3b8; font-size: 1.2rem; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%;">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 1L1 13M1 1l12 12"/></svg>
                </button>
                
                <div style="display: flex; gap: 8px; z-index: 2;">
                    ${stepRole.startsWith('step') ? `
                    <button class="btn-autofill-step learning-block-ai" type="button" title="Предложение ИИ для этого шага">
                        <span>✦</span> Предложить текст
                    </button>
                    ` : ''}
                </div>
            </div>

            <div class="block-content hint-content" style="text-align: center; color: #1e293b; pointer-events: none; font-size: 1rem;">
                ${promptText}
            </div>
        `;

        // Click on the block body -> open editor for this step
        div.addEventListener('click', (e) => {
            if (e.target.closest('button')) return;

            const id = 'block-' + Math.random().toString(36).substring(2, 9);
            const block = {
                id,
                side: stepSide,
                role: stepRole,
                title: stepObj.title,
                html: '',
                status: 'in_progress',
                isDraft: true
            };
            AppState.addBlock(block);
            
            document.dispatchEvent(new CustomEvent('openEditor', { detail: { blockId: id, el: div } }));
        });

        // Autofill step button -> generate next step automatically
        const btnAutofillStep = div.querySelector('.btn-autofill-step');
        if (btnAutofillStep) {
            btnAutofillStep.addEventListener('click', async (e) => {
                e.stopPropagation();
                
                const originalHtml = btnAutofillStep.innerHTML;
                btnAutofillStep.innerHTML = t('hint_generating');
                btnAutofillStep.disabled = true;

                try {
                    const stepNumber = stepRole.replace('step', '');
                    await AIController.generateStep(stepNumber, onRenderAll);
                    
                    setTimeout(() => {
                        const newBlock = AppState.currentNote.blocks.find(b => b.role === stepRole);
                        if (newBlock) {
                            const blockEl = document.getElementById(newBlock.id);
                            if (blockEl) {
                                blockEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                blockEl.style.boxShadow = '0 0 0 3px #10b981';
                                setTimeout(() => blockEl.style.boxShadow = '', 2000);
                            }
                        }
                    }, 100);
                } catch (err) {
                    console.error("Next step generation failed", err);
                    import('./ToastService.js').then(m => m.showToast(t('hint_gen_step_err'), 'error'));
                    btnAutofillStep.innerHTML = originalHtml;
                    btnAutofillStep.disabled = false;
                }
            });
        }

        // Dismiss button -> hide hint and advance
        const btnDismiss = div.querySelector('.btn-dismiss');
        if (btnDismiss) {
            btnDismiss.addEventListener('click', (e) => {
                e.stopPropagation();
                AppState.dismissHint(stepRole);
                if (onRenderAll) onRenderAll();
            });
        }

        return div;
    }

    /**
     * AI-mode starter: inline topic field + "build the whole note" button.
     */
    static _buildAnchorStarter(onRenderAll) {
        const anchorObj = ALGORITHM_STEPS.find(s => s.role === 'anchor') || { title: t('hint_anchor_title') };

        // Пример в placeholder — случайный из пула, меняется при каждом новом объяснении.
        const exPool = String(t('anchor_ex_pool') || '').split('|').map(s => s.trim()).filter(Boolean);
        const exOne = exPool.length ? exPool[Math.floor(Math.random() * exPool.length)] : '';
        const anchorPh = exOne ? `${t('anchor_topic_ph')} «${exOne}»` : t('anchor_topic_ph');

        const div = document.createElement('div');
        div.className = 'dialectics-hint-block block-left block-hint block-anchor-starter';
        div.dataset.hintId = 'anchor';
        div.dataset.side = 'left';
        div.dataset.role = 'anchor';
        div.style.cssText = 'background:#f1f5f9; border:none; border-radius:16px; padding:22px 24px; position:relative;';

        div.innerHTML = `
            <div style="font-weight:700; color:#1e293b; text-align:center; margin-bottom:14px; font-size:1.05rem;">
                ${t('hint_anchor_title')}
            </div>
            <textarea class="anchor-topic-input" rows="3" placeholder="${anchorPh}"
                style="width:100%; box-sizing:border-box; border:1.5px solid #cbd5e1; border-radius:10px; padding:11px 14px; font-size:1rem; line-height:1.5; font-family:inherit; resize:vertical; outline:none; background:#fff;"></textarea>
            <button class="btn-anchor-generate" style="margin-top:12px; width:100%; background:linear-gradient(135deg,#fb923c,#ea580c); color:#fff; border:none; border-radius:10px; padding:12px; font-size:0.95rem; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px;">
                <span>✨</span> ${t('anchor_generate_btn')}
            </button>
            <div style="text-align:center; margin-top:10px;">
                <button class="btn-anchor-editor" style="background:transparent; border:none; color:#64748b; font-size:0.82rem; cursor:pointer; text-decoration:underline;">${t('anchor_open_editor')}</button>
            </div>
        `;

        const ta = div.querySelector('.anchor-topic-input');
        const btnGen = div.querySelector('.btn-anchor-generate');
        const btnEditor = div.querySelector('.btn-anchor-editor');

        const run = async () => {
            const topic = ta.value.trim();
            if (!topic) { ta.focus(); return; }
            btnGen.disabled = true;
            btnGen.style.opacity = '0.6';
            const id = 'block-' + Math.random().toString(36).substring(2, 9);
            const esc = topic.replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
            const html = `<p>${esc}</p>`;
            AppState.addBlock({ id, side: 'left', role: 'anchor', title: anchorObj.title, html, status: 'ready' });
            try {
                const { default: EditorManager } = await import('./EditorManager.js');
                await EditorManager.triggerAutofill(html);
            } catch (err) {
                console.error('Anchor autofill failed', err);
                const m = await import('./ToastService.js');
                m.showToast(t('ed_ai_gen_error') + (err.message || ''), 'error');
                if (onRenderAll) onRenderAll();
            }
        };

        btnGen.addEventListener('click', run);
        ta.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); run(); }
        });

        btnEditor.addEventListener('click', () => {
            const id = 'block-' + Math.random().toString(36).substring(2, 9);
            const topic = ta.value.trim();
            const esc = topic.replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
            AppState.addBlock({
                id, side: 'left', role: 'anchor', title: anchorObj.title,
                html: topic ? `<p>${esc}</p>` : '', status: 'in_progress', isDraft: true
            });
            document.dispatchEvent(new CustomEvent('openEditor', { detail: { blockId: id, el: div } }));
        });

        setTimeout(() => ta.focus(), 50);
        return div;
    }
}

export default BlockHintBuilder;
