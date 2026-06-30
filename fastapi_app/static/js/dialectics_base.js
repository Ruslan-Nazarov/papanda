// Единое ядро для диалектических виджетов (Парсер формул и Парсер статей)
class DialecticsBaseWidget {
    constructor(options) {
        this.widgetId = options.widgetId;
        this.dragHandleId = options.dragHandleId;
        this.historyId = options.historyId;
        this.inputId = options.inputId;
        this.voiceBtnId = options.voiceBtnId;
        this.storageKey = options.storageKey;
        this.welcomeHtml = options.welcomeHtml;
        this.saveHistoryCallback = options.saveHistoryCallback || null;
        
        this.recognition = null;
        this.isRecording = false;
        
        this.initDrag();
        this.initVoice();
        this.initInputResize();
    }
    
    // 1. Плавное перетаскивание окна (Drag & Drop)
    initDrag() {
        const widget = document.getElementById(this.widgetId);
        const dragHandle = document.getElementById(this.dragHandleId);
        if (!widget || !dragHandle) return;
        
        let isDragging = false;
        let startX, startY, initialX, initialY;
        
        dragHandle.addEventListener('mousedown', (e) => {
            // Игнорируем перетаскивание при клике по кнопкам управления или табам
            if (e.target.closest('button') || e.target.closest('.parser-tabs') || e.target.closest('.widget-controls')) return;
            
            initialX = widget.offsetLeft;
            initialY = widget.offsetTop;
            startX = e.clientX;
            startY = e.clientY;
            isDragging = true;
            
            const drag = (e) => {
                if (!isDragging) return;
                e.preventDefault();
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                
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
            };
            
            const dragEnd = () => {
                isDragging = false;
                document.removeEventListener('mousemove', drag);
                document.removeEventListener('mouseup', dragEnd);
            };
            
            document.addEventListener('mousemove', drag);
            document.addEventListener('mouseup', dragEnd);
        });
    }
    
    // 2. Голосовой ввод (Speech Recognition)
    initVoice() {
        const voiceBtn = document.getElementById(this.voiceBtnId);
        if (!voiceBtn) return;
        
        voiceBtn.onclick = () => {
            if (!this.recognition) {
                if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
                    alert("Ваш браузер не поддерживает голосовой ввод. Пожалуйста, используйте Chrome, Edge или Safari.");
                    return;
                }
                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                this.recognition = new SpeechRecognition();
                this.recognition.lang = 'ru-RU';
                this.recognition.interimResults = true;
                this.recognition.continuous = false;
                
                this.recognition.onstart = () => {
                    this.isRecording = true;
                    voiceBtn.classList.add('recording');
                };
                this.recognition.onresult = (event) => {
                    let finalTranscript = '';
                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        if (event.results[i].isFinal) {
                            finalTranscript += event.results[i][0].transcript;
                        }
                    }
                    const input = document.getElementById(this.inputId);
                    if (finalTranscript && input) {
                        input.value += (input.value ? ' ' : '') + finalTranscript;
                        if (window.autoResizeTextarea) window.autoResizeTextarea(input);
                    }
                };
                this.recognition.onerror = () => { this.stopRecording(voiceBtn); };
                this.recognition.onend = () => { this.stopRecording(voiceBtn); };
            }
            
            if (this.isRecording) {
                this.recognition.stop();
            } else {
                this.recognition.start();
            }
        };
    }
    
    stopRecording(voiceBtn) {
        this.isRecording = false;
        voiceBtn.classList.remove('recording');
    }
    
    // 3. Автоматическое изменение высоты поля ввода
    initInputResize() {
        const input = document.getElementById(this.inputId);
        if (!input) return;
        input.addEventListener('input', () => {
            if (window.autoResizeTextarea) window.autoResizeTextarea(input);
        });
    }
    
    // 4. Парсинг и рендеринг LaTeX/KaTeX в тексте
    renderMathInText(text) {
        if (!text) return "";
        let processed = text.replace(/\\softmax\b/g, '\\operatorname{softmax}');
        // Замена блоков $$...$$ на выносные формулы
        processed = processed.replace(/\$\$(.*?)\$\$/gs, (match, formula) => {
            if (window.katex) {
                try {
                    return window.katex.renderToString(formula.trim(), { displayMode: true, throwOnError: false });
                } catch (e) {
                    return match;
                }
            }
            return match;
        });
        // Замена блоков $...$ на строчные формулы
        processed = processed.replace(/\$(.*?)\$/g, (match, formula) => {
            if (window.katex) {
                try {
                    return window.katex.renderToString(formula.trim(), { displayMode: false, throwOnError: false });
                } catch (e) {
                    return match;
                }
            }
            return match;
        });
        return processed;
    }
    
    // 5. Добавление сообщений в чат
    appendMessage(sender, text, isRawHtml = false) {
        const chatHistory = document.getElementById(this.historyId);
        if (!chatHistory) return null;
        
        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-message ${sender === 'user' ? 'user-message' : 'ai-message'}`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        if (isRawHtml) {
            contentDiv.innerHTML = text;
        } else {
            let formattedText = this.renderMathInText(text);
            formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            formattedText = formattedText.replace(/\n/g, '<br>');
            contentDiv.innerHTML = formattedText;
        }
        
        msgDiv.appendChild(contentDiv);
        chatHistory.appendChild(msgDiv);
        chatHistory.scrollTop = chatHistory.scrollHeight;
        
        this.addDeleteButton(msgDiv);
        this.saveHistory();
        return msgDiv;
    }
    
    // 6. Добавление кнопок удаления (×) для сообщений
    addDeleteButton(msgEl) {
        if (msgEl.querySelector('.msg-delete-btn')) return;
        
        const text = msgEl.textContent || "";
        // Пропускаем приветственные системные сообщения
        if (text.includes('Привет!') || 
            text.includes('Я превращаю любую статью') ||
            text.includes('Если статья посвящена трансформерам') ||
            text.includes('Можешь задавать мне вопросы') ||
            (text.includes('Статья "') && text.includes('" прикреплена.'))) {
            return;
        }
        
        const btn = document.createElement('button');
        btn.className = 'msg-delete-btn';
        btn.innerHTML = '×';
        btn.title = 'Удалить сообщение';
        btn.style.display = 'none';
        btn.onclick = (e) => {
            e.stopPropagation();
            msgEl.remove();
            this.saveHistory();
        };
        msgEl.appendChild(btn);
    }
    
    // 7. Работа с историей (localStorage)
    saveHistory() {
        const chatHist = document.getElementById(this.historyId);
        if (chatHist && this.storageKey) {
            localStorage.setItem(this.storageKey, chatHist.innerHTML);
        }
        if (this.saveHistoryCallback) {
            this.saveHistoryCallback();
        }
    }
    
    restoreHistory() {
        const chatHist = document.getElementById(this.historyId);
        if (chatHist && this.storageKey) {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                chatHist.innerHTML = saved;
                chatHist.querySelectorAll('.chat-message').forEach(msg => {
                    this.addDeleteButton(msg);
                });
                chatHist.scrollTop = chatHist.scrollHeight;
            }
        }
    }
    
    clearHistory(additionalCallback) {
        if (!confirm("Вы уверены, что хотите очистить всю историю чата?")) return;
        if (this.storageKey) {
            localStorage.removeItem(this.storageKey);
        }
        const chatHist = document.getElementById(this.historyId);
        if (chatHist) {
            chatHist.innerHTML = this.welcomeHtml;
        }
        if (additionalCallback) {
            additionalCallback();
        }
    }
}

// Экспортируем в глобальную область видимости
window.DialecticsBaseWidget = DialecticsBaseWidget;
