import NotesAPI from './api.js';
import AppState from './AppState.js';

import { t } from '../i18n.js';
export class EditorAITab {
    constructor(modalContainer, getEditor, aiRole) {
        this.modalContainer = modalContainer;
        this.getEditor = getEditor;
        this.aiRole = aiRole;
    }

    init(autoRun = false) {
        const mc = this.modalContainer;
        const aiSubtabs = mc.querySelectorAll('.ai-subtab-btn');
        const aiSubContents = mc.querySelectorAll('.ai-subtab-content');
        
        aiSubtabs.forEach(btn => {
            btn.addEventListener('click', () => {
                aiSubtabs.forEach(b => { 
                    b.classList.remove('active'); 
                    b.style.fontWeight = 'normal'; 
                    b.style.color = '#64748b'; 
                });
                aiSubContents.forEach(c => c.style.display = 'none');
                btn.classList.add('active');
                btn.style.fontWeight = 'bold';
                btn.style.color = '#3b82f6';
                const subtabId = btn.dataset.subtab.replace('ai-', 'ai-area-');
                const targetContent = mc.querySelector(`#${subtabId}`);
                if (targetContent) targetContent.style.display = 'block';
            });
        });

        mc.querySelector('#btn-ai-copy-text')?.addEventListener('click', () => {
            const aiResponseExample = mc.querySelector('#ai-response-example');
            const html = aiResponseExample ? aiResponseExample.innerHTML : '';
            const editor = this.getEditor();
            if (editor && html) {
                editor.commands.setContent(html);
            }
            mc.querySelector('[data-tab="text"]')?.click();
        });

        if (autoRun) {
            setTimeout(() => this.runAiAction('hint', this.aiRole), 100);
        }
    }

    async runAiAction(action, role) {
        const mc = this.modalContainer;
        const aiResponseHint = mc.querySelector('#ai-response-hint');
        const aiResponseExample = mc.querySelector('#ai-response-example');

        if (action === 'hint') {
            if (aiResponseHint) aiResponseHint.innerHTML = `<em style="color:#94a3b8;">${t('ai_preparing_hint')}</em>`;
            if (aiResponseExample) aiResponseExample.innerHTML = `<em style="color:#94a3b8;">${t('ai_generating_example')}</em>`;
            
            try {
                const currentContent = AppState.currentNote.blocks
                    .filter(b => b.html && b.html.trim().length > 0 && !b.isDraft)
                    .map(b => `[${b.title}]:\n${b.html.replace(/<[^>]+>/g, '')}`)
                    .join('\n\n');
                const noteTitle = AppState.currentNote.title;
                
                const [hintRes, exampleRes] = await Promise.all([
                    NotesAPI.getHint(role || 'step1', currentContent, noteTitle, 'ru', 'hint').catch(e => ({ result: t('error_word') + ': ' + e.message })),
                    NotesAPI.getHint(role || 'step1', currentContent, noteTitle, 'ru', 'example').catch(e => ({ result: t('error_word') + ': ' + e.message }))
                ]);
                
                const formatResult = (res) => {
                    let html = res.result || res.hint || `<em style="color: #94a3b8;">${t('ai_no_answer')}</em>`;
                    if (res.result && typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined') {
                        html = DOMPurify.sanitize(marked.parse(res.result));
                    }
                    return html;
                };
                
                if (aiResponseHint) aiResponseHint.innerHTML = formatResult(hintRes);
                if (aiResponseExample) aiResponseExample.innerHTML = formatResult(exampleRes);
            } catch (err) {
                if (aiResponseHint) aiResponseHint.innerHTML = `<em style="color:#ef4444;">${t('error_word')}: ${err.message}</em>`;
                if (aiResponseExample) aiResponseExample.innerHTML = `<em style="color:#ef4444;">${t('error_word')}: ${err.message}</em>`;
            }
        } else {
            const aiResponseArea = aiResponseHint || mc.querySelector('#ai-response-area');
            if (!aiResponseArea) return;
            aiResponseArea.innerHTML = `<em style="color:#94a3b8;">${t('ai_thinking')}</em>`;
            try {
                const ConceptExplainManager = (await import('./ConceptExplainManager.js')).default;
                await ConceptExplainManager.handleAiAction(
                    action,
                    this.getEditor(),
                    { set innerHTML(v) { aiResponseArea.innerHTML = v; }, querySelector: () => null },
                    null,
                    null,
                    () => {},
                    { role }
                );
            } catch (err) {
                aiResponseArea.innerHTML = `<em style="color:#ef4444;">${t('ai_request_error')}: ${err.message}</em>`;
            }
        }
    }
}
