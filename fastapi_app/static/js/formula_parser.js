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

        aiMsg.classList.remove('loading');
        if (parsed && Array.isArray(parsed) && parsed.length > 0) {
            let html = `<div style="font-weight: 700; margin-bottom: 8px; color: #0f172a;">Результат анализа формулы:</div>`;
            parsed.forEach(item => {
                html += `<div style="background:#f1f5f9; padding:8px 10px; border-radius:6px; margin-bottom:6px; font-size:0.9rem;">
                            <div style="font-weight:700; color:#2563eb;">${item.symbol || ''} (${item.name || ''})</div>
                            <div style="color:#334155; margin-top:2px;"><b>Процесс:</b> ${item.process || ''}</div>
                            <div style="color:#475569; font-size:0.85rem; margin-top:2px;"><i>Пример:</i> ${item.example || ''}</div>
                         </div>`;
            });
            aiMsg.innerHTML = `<div class="message-content">${html}</div>`;
        } else {
            const cleanText = data.result ? data.result.replace(/```json/g, '').replace(/```/g, '') : "Анализ завершен.";
            aiMsg.innerHTML = `<div class="message-content" style="white-space: pre-wrap;">${window.DOMPurify ? DOMPurify.sanitize(cleanText) : cleanText}</div>`;
        }
    } catch (err) {
        aiMsg.classList.remove('loading');
        aiMsg.innerHTML = `<div class="message-content" style="color: #ef4444;">Ошибка разбора: ${err.message}</div>`;
    }
    history.scrollTop = history.scrollHeight;
};

window.toggleFormulaVoiceInput = function() {
    if (window.showToast) window.showToast("Голосовой ввод формулы активирован. Произнесите формулу...", "info");
};
