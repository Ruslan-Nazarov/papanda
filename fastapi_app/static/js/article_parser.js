/**
 * article_parser.js
 * Frontend logic for floating AI Article Parser widget, powered by DialecticsBaseWidget.
 */

let articleWidget = null;
let uploadedArticleFile = null;

// Инициализация виджета
function initArticleWidget() {
    articleWidget = new DialecticsBaseWidget({
        widgetId: 'articleParserWidget',
        dragHandleId: 'articleParserDragHandle',
        historyId: 'parserChatHistory',
        inputId: 'parserPromptInput',
        voiceBtnId: 'btnParserVoice',
        storageKey: 'papanda_article_chat_history',
        welcomeHtml: `
            <div class="chat-message ai-message" style="margin-bottom: 6px;">
                <div class="message-content">${window._ ? window._('dialectics.article_welcome_1', '👋 <b>Привет!</b> Я превращаю любую статью в изложение процесса, которому она посвящена.') : '👋 <b>Привет!</b> Я превращаю любую статью в изложение процесса, которому она посвящена.'}</div>
            </div>
            <div class="chat-message ai-message" style="margin-bottom: 6px;">
                <div class="message-content">${window._ ? window._('dialectics.article_welcome_2', '💡 Если статья посвящена трансформерам в машинном обучении – я превращаю ее в рассказ о том, как проходит само обучение с применением трансформеров. Другими словами, из обычной статьи я пытаюсь сделать статью <b>диалектическую</b>.') : '💡 Если статья посвящена трансформерам в машинном обучении – я превращаю ее в рассказ о том, как проходит само обучение с применением трансформеров. Другими словами, из обычной статьи я пытаюсь сделать статью <b>диалектическую</b>.'}</div>
            </div>
            <div class="chat-message ai-message">
                <div class="message-content">${window._ ? window._('dialectics.article_welcome_3', '🛠 Можешь задавать мне вопросы по статье, а еще можешь добавить любое определение из статьи в <b>Словарь</b> для быстрого доступа.') : '🛠 Можешь задавать мне вопросы по статье, а еще можешь добавить любое определение из статьи в <b>Словарь</b> для быстрого доступа.'}</div>
            </div>
        `,
        saveHistoryCallback: () => {
            const dictHist = document.getElementById('parserDictHistory');
            if (dictHist) {
                localStorage.setItem('papanda_article_dict_history', dictHist.innerHTML);
            }
        }
    });

    // Восстанавливаем сохраненную историю
    const chatHist = document.getElementById('parserChatHistory');
    const savedChat = localStorage.getItem('papanda_article_chat_history');
    if (chatHist && savedChat) {
        if (!savedChat.includes('Я превращаю любую статью')) {
            localStorage.removeItem('papanda_article_chat_history');
        } else {
            articleWidget.restoreHistory();
        }
    }

    const dictHist = document.getElementById('parserDictHistory');
    const savedDict = localStorage.getItem('papanda_article_dict_history');
    if (dictHist && savedDict) {
        dictHist.innerHTML = savedDict;
    }

    // Настраиваем отправку по Enter
    const input = document.getElementById('parserPromptInput');
    if (input) {
        if (input.dataset.hasEnterHandler !== 'true') {
            input.dataset.hasEnterHandler = 'true';
            input.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendParserMessage();
                }
            });
        }
    }
}

// Открытие и закрытие виджета парсера статей
window.toggleArticleParser = function() {
    if (window.WidgetManager) {
        window.WidgetManager.toggle('articleParserWidget');
    } else {
        const widget = document.getElementById('articleParserWidget');
        if (widget) {
            const isHidden = window.getComputedStyle(widget).display === 'none';
            widget.style.display = isHidden ? 'flex' : 'none';
        }
    }
};

// Заглушка для inline onclick-обработчика голосовой кнопки
window.toggleVoiceInput = function() {
    // Инициализируется автоматически в DialecticsBaseWidget
};

// Очистка истории чата и словаря
window.clearArticleChatHistory = function() {
    if (articleWidget) {
        articleWidget.clearHistory(() => {
            const dictHist = document.getElementById('parserDictHistory');
            if (dictHist) {
                const emptyMsg = window._ ? window._('dialectics.dict_empty', 'Словарь пуст. Спросите значение любого понятия из статьи.') : 'Словарь пуст. Спросите значение любого понятия из статьи.';
                dictHist.innerHTML = `<div class="dict-empty-state">${emptyMsg}</div>`;
            }
            localStorage.removeItem('papanda_article_dict_history');
            window.removeUploadedArticle();
            if (window.showToast) window.showToast(window._ ? window._('toast.history_cleared', "История и словарь очищены") : "История и словарь очищены", "info");
        });
    }
};

// Переключение табов "Чат" / "Словарь"
window.switchParserTab = function(tabName) {
    const chatTab = document.querySelector('.parser-tab[onclick*="chat"]');
    const dictTab = document.querySelector('.parser-tab[onclick*="dict"]');
    
    const uploadSec = document.getElementById('parserUploadSection');
    const chatHist = document.getElementById('parserChatHistory');
    const dictHist = document.getElementById('parserDictHistory');
    const inputArea = document.querySelector('.parser-input-area');
    
    if (tabName === 'chat') {
        if (chatTab) chatTab.classList.add('active');
        if (dictTab) dictTab.classList.remove('active');
        
        if (uploadSec) uploadSec.style.display = 'flex';
        if (chatHist) chatHist.style.display = 'flex';
        if (inputArea) inputArea.style.display = 'flex';
        if (dictHist) dictHist.style.display = 'none';
    } else {
        if (dictTab) dictTab.classList.add('active');
        if (chatTab) chatTab.classList.remove('active');
        
        if (uploadSec) uploadSec.style.display = 'none';
        if (chatHist) chatHist.style.display = 'none';
        if (inputArea) inputArea.style.display = 'none';
        if (dictHist) dictHist.style.display = 'flex';
    }
};

// Выбор файла для прикрепления
window.handleArticleUpload = function(input) {
    if (input.files && input.files[0]) {
        uploadedArticleFile = input.files[0];
        const btnUpload = document.querySelector('.parser-upload-section .upload-btn');
        const fileNameDisplay = document.getElementById('uploadedFileName');
        const nameText = document.querySelector('#uploadedFileName .file-name-text');
        
        if (nameText) nameText.textContent = uploadedArticleFile.name;
        if (btnUpload) btnUpload.style.display = 'none';
        if (fileNameDisplay) fileNameDisplay.style.display = 'flex';
        
        if (articleWidget) {
            articleWidget.appendMessage('system', `Статья "${uploadedArticleFile.name}" прикреплена. Задайте вопрос по ней!`);
        }
    }
};

// Удаление прикрепленного файла
window.removeUploadedArticle = function() {
    uploadedArticleFile = null;
    const input = document.getElementById('articleFileInput');
    if (input) input.value = '';
    
    const btnUpload = document.querySelector('.parser-upload-section .upload-btn');
    const fileNameDisplay = document.getElementById('uploadedFileName');
    if (btnUpload) btnUpload.style.display = 'flex';
    if (fileNameDisplay) fileNameDisplay.style.display = 'none';
};

// Добавление термина в словарь
function appendToDictionary(title, content) {
    const dictHist = document.getElementById('parserDictHistory');
    if (!dictHist || !articleWidget) return;
    
    const emptyState = dictHist.querySelector('.dict-empty-state');
    if (emptyState) {
        emptyState.remove();
    }
    
    const itemDiv = document.createElement('div');
    itemDiv.className = 'dict-item';
    
    const titleDiv = document.createElement('div');
    titleDiv.className = 'dict-item-title';
    titleDiv.textContent = title;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'dict-item-content';
    let formattedText = articleWidget.renderMathInText(content);
    formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formattedText = formattedText.replace(/\n/g, '<br>');
    contentDiv.innerHTML = formattedText;
    
    itemDiv.appendChild(titleDiv);
    itemDiv.appendChild(contentDiv);
    
    dictHist.prepend(itemDiv);
    articleWidget.saveHistory();
}

// Парсинг тегов [CONCEPT] из ответа ИИ
function processAiResponse(rawText) {
    const conceptRegex = /\[CONCEPT:\s*(.*?)\]([\s\S]*?)\[\/CONCEPT\]/g;
    let cleanText = rawText;
    
    let match;
    while ((match = conceptRegex.exec(rawText)) !== null) {
        const title = match[1].trim();
        const content = match[2].trim();
        
        appendToDictionary(title, content);
        
        const formattedBlock = `
            <div style="border-left: 3px solid #0ea5e9; padding-left: 10px; margin: 10px 0;">
                <div style="font-size: 0.85em; color: #0284c7; font-weight: 600; margin-bottom: 4px;">
                    📌 Сохранено в Словарь
                </div>
                <strong>${title}</strong><br>
                ${articleWidget ? articleWidget.renderMathInText(content).replace(/\n/g, '<br>') : content.replace(/\n/g, '<br>')}
            </div>
        `;
        cleanText = cleanText.replace(match[0], formattedBlock);
    }
    
    return cleanText;
}

// Отправка запроса по статье
window.sendParserMessage = async function() {
    const input = document.getElementById('parserPromptInput');
    if (!input || !articleWidget) return;
    
    const text = input.value.trim();
    if (!text && !uploadedArticleFile) return;
    
    if (text) {
        articleWidget.appendMessage('user', text);
    }
    
    input.value = '';
    if (window.autoResizeTextarea) autoResizeTextarea(input);
    
    input.disabled = true;
    const sendBtn = document.getElementById('btnParserSend');
    if (sendBtn) sendBtn.disabled = true;
    
    const aiMsg = articleWidget.appendMessage('ai', '⏳ Анализирую...', true);
    if (aiMsg) {
        aiMsg.classList.add('loading');
    }
    
    try {
        const formData = new FormData();
        formData.append('message', text || "Проанализируй этот документ диалектически.");
        if (uploadedArticleFile) {
            formData.append('file', uploadedArticleFile);
        }
        
        const response = await fetch('/api/ai/dialectics/article-parser', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || 'Ошибка сервера');
        }
        
        const data = await response.json();
        
        if (aiMsg) {
            aiMsg.classList.remove('loading');
            const cleanMessage = processAiResponse(data.result);
            
            const contentDiv = aiMsg.querySelector('.message-content');
            let formattedText = articleWidget.renderMathInText(cleanMessage);
            formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            formattedText = formattedText.replace(/\n/g, '<br>');
            
            contentDiv.innerHTML = formattedText;
            articleWidget.saveHistory();
        }
    } catch (error) {
        if (aiMsg) {
            aiMsg.classList.remove('loading');
            const contentDiv = aiMsg.querySelector('.message-content');
            contentDiv.textContent = `❌ Ошибка: ${error.message}`;
            articleWidget.saveHistory();
        }
    } finally {
        input.disabled = false;
        if (sendBtn) sendBtn.disabled = false;
        input.focus();
    }
};

// Запуск инициализации при загрузке страницы
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initArticleWidget);
} else {
    initArticleWidget();
}
