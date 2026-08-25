import NotesAPI from './api.js';
import AppState from './AppState.js';

class ConceptExplainManager {
    static init() {
        console.log('ConceptExplainManager Initialized');
    }

    static async handleAiAction(action, editor, aiResponseContainer, aiAppendBtn, aiReplaceBtn, onResponseReady, options = {}) {
        aiResponseContainer.innerHTML = '<em>Загрузка...</em>';
        if (aiAppendBtn) aiAppendBtn.style.display = 'none';
        if (aiReplaceBtn) aiReplaceBtn.style.display = 'none';
        
        try {
            const blockHtml = editor.getHTML();
            const noteTitle = AppState.currentNote.title;
            
            let result = '';
            if (action === 'explain') {
                const res = await NotesAPI.explainBlock(blockHtml, noteTitle, 'explain');
                result = res.result;
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
            
            let htmlResult = result || '<em style="color: #94a3b8;">AI не вернул ответ.</em>';
            if (result && typeof marked !== 'undefined') {
                htmlResult = DOMPurify.sanitize(marked.parse(result));
            }
            aiResponseContainer.innerHTML = htmlResult; 
            if (aiAppendBtn) aiAppendBtn.style.display = 'block';
            if (aiReplaceBtn) aiReplaceBtn.style.display = 'block';
            
            if (onResponseReady) onResponseReady(result);
        } catch (err) {
            aiResponseContainer.innerHTML = `<em style="color: red;">Ошибка: ${err.message}</em>`;
        }
    }
}

export default ConceptExplainManager;
