/**
 * formula_parser.js
 * Frontend logic for floating AI Formula Parser widget.
 */

window.sendFormulaMessage = async function() {
    const input = document.getElementById('formulaPromptInput');
    const history = document.getElementById('formulaChatHistory');
    if (!input || !history) return;

    const formula = input.value.trim();
    if (!formula) return;

    input.value = '';
    if (window.autoResizeTextarea) autoResizeTextarea(input);

    // Append user message
    const userMsg = document.createElement('div');
    userMsg.className = 'chat-message user-message';
    userMsg.innerHTML = `<div class="message-content">` + (window.DOMPurify ? DOMPurify.sanitize(formula) : formula) + `</div>`;
    history.appendChild(userMsg);
    history.scrollTop = history.scrollHeight;

    // Append AI loading message
    const aiMsg = document.createElement('div');
    aiMsg.className = 'chat-message ai-message loading';
    aiMsg.innerHTML = `<div class="message-content">Разбираю диалектическую структуру формулы...</div>`;
    history.appendChild(aiMsg);
    history.scrollTop = history.scrollHeight;
    saveFormulaHistory();

    try {
        const res = await fetch('/api/ai/dialectics/parser', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ formula: formula })
        });

        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.detail || 'API Error');
        }

        const data = await res.json();
        let parsed;
        try {
            let cleanJson = data.result;
            if (cleanJson.includes("```json")) {
                cleanJson = cleanJson.split("```json")[1].split("```")[0];
            } else if (cleanJson.includes("```")) {
                cleanJson = cleanJson.split("```")[1].split("```")[0];
            }
            parsed = JSON.parse(cleanJson.trim());
        } catch(e) {
            parsed = null;
        }

        let itemsList = [];
        if (parsed) {
            if (Array.isArray(parsed)) {
                itemsList = parsed;
            } else if (typeof parsed === 'object') {
                if (Array.isArray(parsed.nodes)) itemsList = parsed.nodes;
                else if (Array.isArray(parsed.formula_analysis)) itemsList = parsed.formula_analysis;
                else if (parsed.node) itemsList = [parsed];
                else if (parsed.formula_analysis && typeof parsed.formula_analysis === 'object') itemsList = [parsed.formula_analysis];
                else {
                    Object.values(parsed).forEach(val => {
                        if (Array.isArray(val)) itemsList = itemsList.concat(val);
                        else if (val && typeof val === 'object' && (val.node || val.symbol || val.predecessor || val.crisis_of_notation)) itemsList.push(val);
                    });
                    if (itemsList.length === 0) itemsList = [parsed];
                }
            }
        }

        aiMsg.classList.remove('loading');
        if (itemsList && itemsList.length > 0 && (itemsList[0].node || itemsList[0].symbol || itemsList[0].predecessor || itemsList[0].crisis_of_notation)) {
            let html = `<div style="font-weight: 700; margin-bottom: 10px; color: #0f172a; font-size: 0.95rem;">🧬 Диалектический генезис формулы:</div>`;
            itemsList.forEach(item => {
                const title = item.node || item.symbol || item.title || 'Элемент формулы';
                const predecessor = item.predecessor || item.process || item.thesis || '';
                const crisis = item.crisis_of_notation || item.contradiction || item.crisis || '';
                const resolution = item.resolution || item.synthesis || item.result || '';
                const example = item.example || item.name || '';

                html += `<div style="background: #ffffff; border: 1px solid #e2e8f0; border-left: 4px solid #2563eb; border-radius: 8px; padding: 10px 12px; margin-bottom: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
                            <div style="font-weight: 700; font-size: 1rem; color: #1e293b; margin-bottom: 6px; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px;">
                                🧮 ${title} ${example ? `<span style="font-size:0.8rem; font-weight:400; color:#64748b;">(${example})</span>` : ''}
                            </div>
                            ${predecessor ? `<div style="margin-bottom: 6px; font-size: 0.88rem;"><span style="color: #475569; font-weight: 600;">Предшественник (А):</span> <span style="color: #1e293b;">${predecessor}</span></div>` : ''}
                            ${crisis ? `<div style="margin-bottom: 6px; font-size: 0.88rem; background: #fef2f2; padding: 6px 8px; border-radius: 4px; border-left: 3px solid #ef4444;"><span style="color: #991b1b; font-weight: 600;">Кризис записи (В):</span> <span style="color: #7f1d1d;">${crisis}</span></div>` : ''}
                            ${resolution ? `<div style="font-size: 0.88rem; background: #f0fdf4; padding: 6px 8px; border-radius: 4px; border-left: 3px solid #22c55e;"><span style="color: #166534; font-weight: 600;">Разрешение (С):</span> <span style="color: #14532d;">${resolution}</span></div>` : ''}
                         </div>`;
            });
            aiMsg.innerHTML = `<div class="message-content">${window.DOMPurify ? DOMPurify.sanitize(html) : html}</div>`;
        } else {
            const cleanText = data.result ? data.result.replace(/```json/g, '').replace(/```/g, '') : "Анализ завершен.";
            aiMsg.innerHTML = `<div class="message-content" style="white-space: pre-wrap;">${window.DOMPurify ? DOMPurify.sanitize(cleanText) : cleanText}</div>`;
        }
    } catch (err) {
        aiMsg.classList.remove('loading');
        aiMsg.innerHTML = `<div class="message-content" style="color: #ef4444;">Ошибка разбора: ${err.message}</div>`;
    }
    history.scrollTop = history.scrollHeight;
    saveFormulaHistory();
};

function saveFormulaHistory() {
    const history = document.getElementById('formulaChatHistory');
    if (history) localStorage.setItem('papanda_formula_chat_history', history.innerHTML);
}

document.addEventListener('DOMContentLoaded', () => {
    const history = document.getElementById('formulaChatHistory');
    const saved = localStorage.getItem('papanda_formula_chat_history');
    if (history && saved) {
        history.innerHTML = saved;
        history.scrollTop = history.scrollHeight;
    }
});

window.toggleFormulaVoiceInput = function() {
    if (window.showToast) window.showToast("Голосовой ввод формулы активирован. Произнесите формулу...", "info");
};
