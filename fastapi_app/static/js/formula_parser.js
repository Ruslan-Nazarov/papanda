/**
 * formula_parser.js
 * Frontend logic for floating AI Formula Parser widget, powered by DialecticsBaseWidget.
 */

let formulaWidget = null;

// Инициализация виджета
function initFormulaWidget() {
    formulaWidget = new DialecticsBaseWidget({
        widgetId: 'formulaParserWidget',
        dragHandleId: 'formulaParserDragHandle',
        historyId: 'formulaChatHistory',
        inputId: 'formulaPromptInput',
        voiceBtnId: 'btnFormulaVoice',
        storageKey: 'papanda_formula_chat_history',
        welcomeHtml: `
            <div class="chat-message ai-message">
                <div class="message-content">${window._ ? window._('dialectics.formula_welcome', 'Введите математическую формулу (например, E = mc^2 или Hψ = Eψ), чтобы разобрать ее диалектическую структуру.') : 'Введите математическую формулу (например, E = mc^2 или Hψ = Eψ), чтобы разобрать ее диалектическую структуру.'}</div>
            </div>
        `
    });

    // Восстанавливаем сохраненную историю
    formulaWidget.restoreHistory();

    // Настраиваем отправку по Enter
    const input = document.getElementById('formulaPromptInput');
    if (input) {
        // Предотвращаем дублирование обработчика Enter
        if (input.dataset.hasEnterHandler !== 'true') {
            input.dataset.hasEnterHandler = 'true';
            input.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendFormulaMessage();
                }
            });
        }
    }

    // Инициализируем обработку картинок из буфера
    initFormulaPasteHandler();
}

// Заглушка для inline onclick-обработчика в HTML
window.toggleFormulaVoiceInput = function() {
    // Голосовой ввод автоматически инициализируется и привязывается к клику по кнопке базовым классом
};

// Очистка истории
window.clearFormulaChatHistory = function() {
    if (formulaWidget) {
        formulaWidget.clearHistory(() => {
            if (window.showToast) window.showToast("История переписки очищена", "info");
        });
    }
};

// Отправка формулы на диалектический разбор
window.sendFormulaMessage = async function(formulaOverride) {
    const input = document.getElementById('formulaPromptInput');
    if (!input || !formulaWidget) return;

    const formula = (formulaOverride !== undefined) ? formulaOverride.trim() : input.value.trim();
    if (!formula) return;

    if (formulaOverride === undefined) {
        input.value = '';
        if (window.autoResizeTextarea) autoResizeTextarea(input);
    }

    // Отображаем сообщение пользователя в чате (с KaTeX-рендерингом)
    formulaWidget.appendMessage('user', formula);

    // Добавляем индикатор загрузки ИИ
    const aiMsg = formulaWidget.appendMessage('ai', 'Разбираю диалектическую структуру формулы...', true);
    if (aiMsg) {
        aiMsg.classList.add('loading');
    }

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

        if (aiMsg) {
            aiMsg.classList.remove('loading');
            const contentDiv = aiMsg.querySelector('.message-content');
            
            if (itemsList && itemsList.length > 0 && (itemsList[0].node || itemsList[0].symbol || itemsList[0].predecessor || itemsList[0].crisis_of_notation)) {
                const genesisTitle = window._ ? window._('dialectics.formula_genesis', 'Диалектический генезис формулы:') : 'Диалектический генезис формулы:';
                let html = `<div style="font-weight: 700; margin-bottom: 10px; color: #0f172a; font-size: 0.95rem;">🧬 ${genesisTitle}</div>`;
                itemsList.forEach(item => {
                    const title = item.node || item.symbol || item.title || (window._ ? window._('dialectics.formula_element', 'Элемент формулы') : 'Элемент формулы');
                    const predecessor = item.predecessor || item.process || item.thesis || '';
                    const crisis = item.crisis_of_notation || item.contradiction || item.crisis || '';
                    const resolution = item.resolution || item.synthesis || item.result || '';
                    const example = item.example || item.name || '';

                    const predLabel = window._ ? window._('dialectics.formula_predecessor', 'Предшественник (А):') : 'Предшественник (А):';
                    const crisisLabel = window._ ? window._('dialectics.formula_crisis', 'Кризис записи (В):') : 'Кризис записи (В):';
                    const resLabel = window._ ? window._('dialectics.formula_resolution', 'Разрешение (С):') : 'Разрешение (С):';

                    html += `<div style="background: #ffffff; border: 1px solid #e2e8f0; border-left: 4px solid #2563eb; border-radius: 8px; padding: 10px 12px; margin-bottom: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
                                <div style="font-weight: 700; font-size: 1rem; color: #1e293b; margin-bottom: 6px; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px;">
                                    🧮 ${title} ${example ? `<span style="font-size:0.8rem; font-weight:400; color:#64748b;">(${example})</span>` : ''}
                                </div>
                                ${predecessor ? `<div style="margin-bottom: 6px; font-size: 0.88rem;"><span style="color: #475569; font-weight: 600;">${predLabel}</span> <span style="color: #1e293b;">${predecessor}</span></div>` : ''}
                                ${crisis ? `<div style="margin-bottom: 6px; font-size: 0.88rem; background: #fef2f2; padding: 6px 8px; border-radius: 4px; border-left: 3px solid #ef4444;"><span style="color: #991b1b; font-weight: 600;">${crisisLabel}</span> <span style="color: #7f1d1d;">${crisis}</span></div>` : ''}
                                ${resolution ? `<div style="font-size: 0.88rem; background: #f0fdf4; padding: 6px 8px; border-radius: 4px; border-left: 3px solid #22c55e;"><span style="color: #166534; font-weight: 600;">${resLabel}</span> <span style="color: #14532d;">${resolution}</span></div>` : ''}
                             </div>`;
                });
                contentDiv.innerHTML = window.DOMPurify ? DOMPurify.sanitize(html) : html;
            } else {
                const cleanText = data.result ? data.result.replace(/```json/g, '').replace(/```/g, '') : "Анализ завершен.";
                contentDiv.textContent = cleanText;
            }
            formulaWidget.saveHistory();
        }
    } catch (err) {
        if (aiMsg) {
            aiMsg.classList.remove('loading');
            const contentDiv = aiMsg.querySelector('.message-content');
            contentDiv.innerHTML = `<div style="color: #ef4444;">Ошибка разбора: ${err.message}</div>`;
            formulaWidget.saveHistory();
        }
    }
};

// Загрузка изображений формул (OCR)
window.triggerFormulaImageUpload = function() {
    const input = document.getElementById('formulaImageFileInput');
    if (input) input.click();
};

window.handleFormulaImageUpload = async function(event) {
    const file = event.target.files[0];
    if (!file) return;
    await processFormulaImageFile(file);
    event.target.value = ''; // Сброс
};

async function processFormulaImageFile(file) {
    if (!formulaWidget) return;

    // Добавляем индикатор загрузки распознавания
    const aiMsg = formulaWidget.appendMessage('ai', 'Распознаю формулу с изображения...', true);
    if (aiMsg) {
        aiMsg.classList.add('loading');
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
        const res = await fetch('/api/ai/dialectics/formula/ocr', {
            method: 'POST',
            body: formData
        });

        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.detail || 'Ошибка распознавания');
        }

        const data = await res.json();
        const latex = data.latex || '';
        
        if (aiMsg) aiMsg.remove(); // Удаляем лоадер
        
        if (latex) {
            await sendFormulaMessage(latex);
            if (window.showToast) window.showToast(window._ ? window._('toast.formula_recognized', "Формула распознана и отправлена на разбор!") : "Формула распознана и отправлена на разбор!", "success");
        } else {
            if (window.showToast) window.showToast(window._ ? window._('toast.formula_failed', "Не удалось извлечь формулу") : "Не удалось извлечь формулу", "warning");
        }
    } catch (err) {
        if (aiMsg) {
            aiMsg.classList.remove('loading');
            const contentDiv = aiMsg.querySelector('.message-content');
            contentDiv.innerHTML = `<div style="color: #ef4444;">Ошибка OCR: ${err.message}</div>`;
            formulaWidget.saveHistory();
        }
    }
}

// Вставка скриншотов из буфера обмена (Ctrl+V)
function initFormulaPasteHandler() {
    const input = document.getElementById('formulaPromptInput');
    if (input) {
        if (input.dataset.hasPasteHandler === 'true') return;
        input.dataset.hasPasteHandler = 'true';
        
        input.addEventListener('paste', async (e) => {
            const items = e.clipboardData?.items;
            if (!items) return;
            for (const item of items) {
                if (item.type.indexOf('image') !== -1) {
                    const file = item.getAsFile();
                    if (file) {
                        e.preventDefault();
                        await processFormulaImageFile(file);
                        break;
                    }
                }
            }
        });
    }
}

// Запуск инициализации
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFormulaWidget);
} else {
    initFormulaWidget();
}
// Периодическая проверка привязки Ctrl+V (в случае пересоздания виджета)
setInterval(initFormulaPasteHandler, 1000);
