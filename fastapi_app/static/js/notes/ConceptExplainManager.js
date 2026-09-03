import NotesAPI from './api.js';
import AppState from './AppState.js';

import { t } from '../i18n.js';
export function renderStreamMarkdown(container, fullText) {
    if (typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined') {
        container.innerHTML = DOMPurify.sanitize(marked.parse(fullText));
    } else {
        container.textContent = fullText;
    }
}

class ConceptExplainManager {
    static init() {
        console.log('ConceptExplainManager Initialized');
    }

    /** Стримит SSE-ответ в контейнер, дорисовывая markdown не чаще раза в 60мс. */
    static async _streamInto(endpoint, body, container) {
        container.innerHTML = '<span style="color:#94a3b8;">▍</span>';
        let last = 0;
        const full = await NotesAPI.stream(endpoint, body, (_delta, acc) => {
            const now = Date.now();
            if (now - last > 60) {
                last = now;
                renderStreamMarkdown(container, acc + ' ▍');
            }
        });
        renderStreamMarkdown(container, full || '');
        return full;
    }

    static async handleAiAction(action, editor, aiResponseContainer, aiAppendBtn, aiReplaceBtn, onResponseReady, options = {}) {
        aiResponseContainer.innerHTML = `<em>${t('loading')}</em>`;
        if (aiAppendBtn) aiAppendBtn.style.display = 'none';
        if (aiReplaceBtn) aiReplaceBtn.style.display = 'none';
        
        try {
            const blockHtml = editor.getHTML();
            const noteTitle = AppState.currentNote.title;

            let result = '';
            if (action === 'explain') {
                result = await this._streamInto(
                    '/ai/dialectics/explain-concept/stream',
                    { text: blockHtml, context_before: noteTitle || '', context_after: '', history: [] },
                    aiResponseContainer
                );
            } else if (action === 'opposite') {
                const plainText = editor.getText();
                const res = await NotesAPI.getOpposites(plainText);
                result = res.result;
            } else if (action === 'hint') {
                const currentContent = AppState.currentNote.blocks
                    .filter(b => b.html && b.html.trim().length > 0 && !b.isDraft)
                    .map(b => `[${b.title}]:\n${b.html.replace(/<[^>]+>/g, '')}`)
                    .join('\n\n');
                const role = options.role || 'step1';
                const res = await NotesAPI.getHint(role, currentContent, noteTitle);
                result = res.result;
            }
            
            let htmlResult = result || `<em style="color: #94a3b8;">${t('ai_no_answer')}</em>`;
            if (result && typeof marked !== 'undefined') {
                htmlResult = DOMPurify.sanitize(marked.parse(result));
            }
            aiResponseContainer.innerHTML = htmlResult; 
            if (aiAppendBtn) aiAppendBtn.style.display = 'block';
            if (aiReplaceBtn) aiReplaceBtn.style.display = 'block';
            
            if (onResponseReady) onResponseReady(result);
        } catch (err) {
            aiResponseContainer.innerHTML = `<em style="color: red;">${t('error_word')}: ${err.message}</em>`;
        }
    }
}

export default ConceptExplainManager;
