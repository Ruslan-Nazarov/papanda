import AppState from './AppState.js';
import { ALGORITHM_STEPS, ALGORITHM_TEXTS } from './BlockConstants.js';
import { t } from '../i18n.js';
import NotesAPI from './api.js';

class BlockHintBuilder {
    /**
     * Build a hint block element.
     */
    static build(stepRole, stepSide, onRenderAll) {
        const div = document.createElement('div');

        div.className = `dialectics-hint-block block-${stepSide} block-hint`;
        div.dataset.hintId = stepRole;
        div.dataset.side = stepSide;
        div.dataset.role = stepRole;

        div.style.backgroundColor = '#f1f5f9';
        div.style.border = 'none';
        div.style.borderRadius = '16px';
        div.style.padding = '20px 30px 30px 30px';
        div.style.cursor = 'pointer';
        div.style.position = 'relative';
        div.style.boxShadow = 'none';
        div.style.borderLeft = 'none';

        const stepObj = ALGORITHM_STEPS.find(s => s.role === stepRole) || { title: 'Новый блок' };
        const promptText = t(`hint_${stepRole}`) !== `hint_${stepRole}` 
            ? t(`hint_${stepRole}`) 
            : (ALGORITHM_TEXTS[stepRole] || stepObj.title);

        div.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                <button class="btn-dismiss" title="${t('hide')}" style="background: transparent; border: none; color: #94a3b8; font-size: 1.2rem; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%;">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 1L1 13M1 1l12 12"/></svg>
                </button>
                
                <div style="display: flex; gap: 8px; z-index: 2;">
                    <button class="btn-ai" title="${t('ai_help')}" style="background: white; border: 1px solid #e2e8f0; border-radius: 20px; padding: 6px 12px; color: #64748b; font-size: 0.85rem; font-weight: 500; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                        <span style="color: #f59e0b; font-size: 1rem;">✨</span> ${t('ai_help')}
                    </button>
                    ${(AppState.isAutoFillEnabled && AppState.isAutoFillStepByStep) ? `
                    <button class="btn-autofill-step" title="Продолжить автозаполнение" style="background: white; border: 1px solid #e2e8f0; border-radius: 20px; padding: 6px 12px; color: #10b981; font-size: 0.85rem; font-weight: 500; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                        <span>▶</span> Сгенерировать ИИ
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

        // AI button -> open editor with AI tab
        const btnAi = div.querySelector('.btn-ai');
        if (btnAi) {
            btnAi.addEventListener('click', async (e) => {
                e.stopPropagation();
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
                
                document.dispatchEvent(new CustomEvent('openEditor', {
                    detail: { blockId: id, el: div, openWithAiTab: true, aiRole: stepRole }
                }));
            });
        }

        // Autofill step button -> generate next step automatically
        const btnAutofillStep = div.querySelector('.btn-autofill-step');
        if (btnAutofillStep) {
            btnAutofillStep.addEventListener('click', async (e) => {
                e.stopPropagation();
                
                const originalHtml = btnAutofillStep.innerHTML;
                btnAutofillStep.innerHTML = `⏳ Генерирую...`;
                btnAutofillStep.disabled = true;

                try {
                    const currentContent = AppState.currentNote.blocks
                        .filter(b => b.html && b.html.trim().length > 0 && !b.isDraft)
                        .map(b => `[${b.title}]:\n${b.html.replace(/<[^>]+>/g, '')}`)
                        .join('\n\n');
                        
                    const res = await NotesAPI.generateNextStep(currentContent, stepRole);
                    
                    if (res && res.result && res.result[stepRole]) {
                        const newBlock = {
                            id: 'block-' + Math.random().toString(36).substring(2, 9),
                            side: stepSide,
                            role: stepRole,
                            title: stepObj.title,
                            html: `<p>${res.result[stepRole]}</p>`,
                            status: 'ready',
                            isDraft: false
                        };
                        AppState.addBlock(newBlock);
                        AppState.dismissHint(stepRole);
                        if (onRenderAll) onRenderAll();
                        
                        setTimeout(() => {
                            const blockEl = document.getElementById(newBlock.id);
                            if (blockEl) {
                                blockEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                blockEl.style.boxShadow = '0 0 0 3px #10b981';
                                setTimeout(() => blockEl.style.boxShadow = '', 2000);
                            }
                        }, 100);
                    } else {
                        throw new Error("Неверный ответ от ИИ");
                    }
                } catch (err) {
                    console.error("Next step generation failed", err);
                    import('./ToastService.js').then(m => m.showToast('Ошибка генерации шага', 'error'));
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
}

export default BlockHintBuilder;
