// Article Parser JavaScript Logic

let articleParserActive = false;
let uploadedArticleFile = null;
let recognition = null;
let isRecording = false;
let articleTextCache = ""; // To avoid sending the file every time if not needed, though we will just send it if it's there.

// Toggle visibility of the widget
window.toggleArticleParser = function() {
    if (window.WidgetManager) {
        window.WidgetManager.toggle('articleParserWidget');
        const widget = document.getElementById('articleParserWidget');
        articleParserActive = widget && widget.style.display !== 'none';
        if (!articleParserActive && isRecording) toggleVoiceInput();
        return;
    }
    const widget = document.getElementById('articleParserWidget');
    if (!widget) return;
    
    if (widget.style.display === 'none' || widget.style.display === '') {
        widget.style.display = 'flex';
        articleParserActive = true;
    } else {
        widget.style.display = 'none';
        articleParserActive = false;
        if (isRecording) {
            toggleVoiceInput();
        }
    }
};

// Switch Tabs
window.switchParserTab = function(tabName) {
    const chatTab = document.querySelector('.parser-tab[onclick*="chat"]');
    const dictTab = document.querySelector('.parser-tab[onclick*="dict"]');
    
    const uploadSec = document.getElementById('parserUploadSection');
    const chatHist = document.getElementById('parserChatHistory');
    const dictHist = document.getElementById('parserDictHistory');
    const inputArea = document.querySelector('.parser-input-area');
    
    if (tabName === 'chat') {
        chatTab.classList.add('active');
        dictTab.classList.remove('active');
        
        uploadSec.style.display = 'flex';
        chatHist.style.display = 'flex';
        inputArea.style.display = 'flex';
        dictHist.style.display = 'none';
    } else {
        dictTab.classList.add('active');
        chatTab.classList.remove('active');
        
        uploadSec.style.display = 'none';
        chatHist.style.display = 'none';
        inputArea.style.display = 'none';
        dictHist.style.display = 'flex';
    }
};

// Handle file upload selection
window.handleArticleUpload = function(input) {
    if (input.files && input.files[0]) {
        uploadedArticleFile = input.files[0];
        const btnUpload = document.querySelector('.parser-upload-section .upload-btn');
        const fileNameDisplay = document.getElementById('uploadedFileName');
        const nameText = document.querySelector('#uploadedFileName .file-name-text');
        
        nameText.textContent = uploadedArticleFile.name;
        btnUpload.style.display = 'none';
        fileNameDisplay.style.display = 'flex';
        
        appendMessage('system', `Статья "${uploadedArticleFile.name}" прикреплена. Задайте вопрос по ней!`);
    }
};

// Remove uploaded file
window.removeUploadedArticle = function() {
    uploadedArticleFile = null;
    const input = document.getElementById('articleFileInput');
    input.value = ''; // clear input
    
    document.querySelector('.parser-upload-section .upload-btn').style.display = 'flex';
    document.getElementById('uploadedFileName').style.display = 'none';
};

// Auto resize textarea
window.autoResizeTextarea = function(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = (textarea.scrollHeight) + 'px';
};

// Setup Voice Recognition
function setupSpeechRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert("Ваш браузер не поддерживает голосовой ввод. Пожалуйста, используйте Chrome, Edge или Safari.");
        return null;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SpeechRecognition();
    rec.lang = 'ru-RU'; 
    rec.interimResults = true;
    rec.continuous = false;
    
    rec.onstart = function() {
        isRecording = true;
        document.getElementById('btnParserVoice').classList.add('recording');
    };
    
    rec.onresult = function(event) {
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }
        
        const input = document.getElementById('parserPromptInput');
        if (finalTranscript) {
            input.value += (input.value ? ' ' : '') + finalTranscript;
            autoResizeTextarea(input);
        }
    };
    
    rec.onerror = function(event) {
        console.error("Speech recognition error", event.error);
        stopRecording();
    };
    
    rec.onend = function() {
        stopRecording();
    };
    
    return rec;
}

function stopRecording() {
    isRecording = false;
    document.getElementById('btnParserVoice').classList.remove('recording');
}

// Toggle Voice Input
window.toggleVoiceInput = function() {
    if (!recognition) {
        recognition = setupSpeechRecognition();
    }
    
    if (!recognition) return;
    
    if (isRecording) {
        recognition.stop();
    } else {
        recognition.start();
    }
};

// Append message to chat
function appendMessage(sender, text) {
    const chatHistory = document.getElementById('parserChatHistory');
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-message ${sender === 'user' ? 'user-message' : 'ai-message'}`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    // Parse markdown briefly (bold)
    let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formattedText = formattedText.replace(/\n/g, '<br>');
    
    contentDiv.innerHTML = formattedText;
    
    msgDiv.appendChild(contentDiv);
    chatHistory.appendChild(msgDiv);
    
    // Scroll to bottom
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

function appendToDictionary(title, content) {
    const dictHist = document.getElementById('parserDictHistory');
    
    // Remove empty state if exists
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
    let formattedText = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formattedText = formattedText.replace(/\n/g, '<br>');
    contentDiv.innerHTML = formattedText;
    
    itemDiv.appendChild(titleDiv);
    itemDiv.appendChild(contentDiv);
    
    dictHist.prepend(itemDiv); // Add to top
}

// Parse AI response for [CONCEPT: ...] blocks
function processAiResponse(rawText) {
    const conceptRegex = /\[CONCEPT:\s*(.*?)\]([\s\S]*?)\[\/CONCEPT\]/g;
    let cleanText = rawText;
    
    let match;
    while ((match = conceptRegex.exec(rawText)) !== null) {
        const title = match[1].trim();
        const content = match[2].trim();
        
        appendToDictionary(title, content);
        
        // Keep the content in the chat, but format it nicely with a badge
        const formattedBlock = `
            <div style="border-left: 3px solid #0ea5e9; padding-left: 10px; margin: 10px 0;">
                <div style="font-size: 0.85em; color: #0284c7; font-weight: 600; margin-bottom: 4px;">
                    📌 Сохранено в Словарь
                </div>
                <strong>${title}</strong><br>
                ${content.replace(/\n/g, '<br>')}
            </div>
        `;
        cleanText = cleanText.replace(match[0], formattedBlock);
    }
    
    return cleanText;
}

// Send Message
window.sendParserMessage = async function() {
    const input = document.getElementById('parserPromptInput');
    const text = input.value.trim();
    
    if (!text && !uploadedArticleFile) return;
    
    if (text) {
        appendMessage('user', text);
    }
    
    input.value = '';
    autoResizeTextarea(input);
    
    input.disabled = true;
    document.getElementById('btnParserSend').disabled = true;
    
    // Append loading state
    appendMessage('system', '⏳ Анализирую...');
    const chatHistory = document.getElementById('parserChatHistory');
    const loadingNode = chatHistory.lastChild;
    
    try {
        const formData = new FormData();
        formData.append('message', text || "Проанализируй этот документ диалектически.");
        if (uploadedArticleFile) {
            formData.append('file', uploadedArticleFile);
        }
        
        const response = await fetch('/api/ai/dialectics/article-parser', {
            method: 'POST',
            body: formData
            // Note: Don't set Content-Type header with FormData, fetch does it automatically with boundary
        });
        
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || 'Ошибка сервера');
        }
        
        const data = await response.json();
        
        // Remove loading node
        loadingNode.remove();
        
        // Process response for dictionary definitions
        const finalMessage = processAiResponse(data.result);
        appendMessage('ai', finalMessage);
        
        // If we uploaded a file, we can optionally clear it so we don't send it again and waste tokens.
        // But the user might want to ask multiple questions.
        // We will keep it for now.
        
    } catch (error) {
        loadingNode.remove();
        appendMessage('system', `❌ Ошибка: ${error.message}`);
    } finally {
        input.disabled = false;
        document.getElementById('btnParserSend').disabled = false;
        input.focus();
    }
};

// Send message on Enter (but allow Shift+Enter for new lines)
document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('parserPromptInput');
    if (input) {
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendParserMessage();
            }
        });
    }
    
    // Draggable Widget Logic
    const widget = document.getElementById('articleParserWidget');
    const dragHandle = document.getElementById('articleParserDragHandle');
    
    if (widget && dragHandle) {
        let isDragging = false;
        let startX, startY, initialX, initialY;
        
        dragHandle.addEventListener('mousedown', dragStart);
        
        function dragStart(e) {
            if (e.target.closest('button') || e.target.closest('.parser-tabs')) return; 
            
            initialX = widget.offsetLeft;
            initialY = widget.offsetTop;
            startX = e.clientX;
            startY = e.clientY;
            
            isDragging = true;
            
            document.addEventListener('mousemove', drag);
            document.addEventListener('mouseup', dragEnd);
        }
        
        function drag(e) {
            if (!isDragging) return;
            e.preventDefault();
            
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            
            // Convert right/bottom positioning to left/top to make dragging smooth
            if (widget.style.right) {
                const rect = widget.getBoundingClientRect();
                widget.style.right = 'auto';
                widget.style.bottom = 'auto';
                widget.style.left = rect.left + 'px';
                widget.style.top = rect.top + 'px';
                initialX = rect.left;
                initialY = rect.top;
            }
            
            widget.style.left = (initialX + dx) + 'px';
            widget.style.top = (initialY + dy) + 'px';
        }
        
        function dragEnd() {
            isDragging = false;
            document.removeEventListener('mousemove', drag);
            document.removeEventListener('mouseup', dragEnd);
        }
    }
});
