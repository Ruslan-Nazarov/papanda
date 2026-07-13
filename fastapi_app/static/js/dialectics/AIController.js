import { DialecticsAPI } from './api.js';
import { DialecticsUI } from './ui_utils.js';
import { BlockManager } from './BlockManager.js';
import { customConfirm } from '../modal_controller.js';

class AIControllerClass {
    async runHintAI(hint) {
        if (!hint || hint.id === 'anchor') {
            window.showToast("Cannot run AI on the main goal block before it is created.", "info");
            return;
        }

        const blocks = BlockManager.getBlocks(this.dom.canvas);
        const anchorBlock = blocks.find(b => b.role === 'anchor');
        
        const stripHtml = (html) => {
            const tmp = document.createElement('DIV');
            tmp.innerHTML = html;
            return tmp.textContent || tmp.innerText || '';
        };

        const goalText = anchorBlock ? stripHtml(anchorBlock.html) : '';

        // Extract context (previous blocks)
        const contextBlocks = blocks.filter(b => b.role && b.role !== 'anchor');
        const contextText = contextBlocks.map(b => `[${b.role}]: ${stripHtml(b.html)}`).join('\\n\\n');

        window.showToast("✨ " + window._("toast.ai_is_thinking", "AI is generating response..."), "info");
        try {
            const res = await fetch('/api/ai/dialectics/hint-step', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    step_id: hint.id, 
                    goal_text: goalText,
                    context_text: contextText 
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || 'API Error');
            }

            const data = await res.json();
            
            // Convert simple text to HTML paragraphs
            let aiHtml = data.result;
            if (!aiHtml.includes('<p>') && !aiHtml.includes('<div>')) {
                aiHtml = aiHtml.split('\\n').filter(p => p.trim()).map(p => `<p>${p}</p>`).join('');
            }
            
            this.openHintEditor(hint, '', aiHtml);

        } catch (error) {
            console.error("AI Error:", error);
            window.showToast("AI Error: " + error.message, "error");
        }
    }

    // Open editor to insert a new block after a specific index
    async openInsertAfter(side, index) {
        if (this.state.isDirty) {
            const confirmed = await customConfirm({
                title: window._ ? window._('dialectics.unsaved_title', 'Внимание') : "Внимание",
                message: window._ ? window._('dialectics.unsaved_msg', 'Есть несохранённые изменения. Продолжить?') : "Есть несохранённые изменения. Продолжить?",
                icon: '',
                buttons: [
                    { label: window._ ? window._('dialectics.cancel', 'Отмена') : 'Отмена', value: false, class: 'confirm-btn-secondary' },
                    { label: window._ ? window._('dialectics.continue_btn', 'Продолжить') : 'Продолжить', value: true, class: 'confirm-btn-primary' }
                ]
            });
            if (!confirmed) return;
        }
        this.state.isDirty = false;

        if (side === 'section') {
            if (this.openSectionTitleModal) {
                this.openSectionTitleModal(index);
            }
            return;
        }
        this.state.editingBlock = null;
        this.state.pendingSide = side;
        let inheritedRole = null;
        if (window.BlockManager && this.dom && this.dom.canvas) {
            const currentBlocks = window.BlockManager.getBlocks(this.dom.canvas);
            if (index !== null && index !== undefined && index >= 0 && currentBlocks[index]) {
                inheritedRole = currentBlocks[index].role || null;
                if (!inheritedRole) {
                    for (let i = index; i >= 0; i--) {
                        if (currentBlocks[i].role && currentBlocks[i].role !== 'anchor') {
                            inheritedRole = currentBlocks[i].role;
                            break;
                        }
                    }
                }
            }
        }
        if (!inheritedRole) {
            inheritedRole = side === 'right' ? 'step2' : side === 'center' ? 'step5' : 'step1';
        }
        this.state.pendingRole = inheritedRole;
        this.state.pendingBlockId = 'block_' + Math.random().toString(36).substr(2, 9);
        this.state.insertAfterIndex = index;
        const titleInput = document.getElementById('editorBlockTitleInput');
        if (titleInput) {
            titleInput.value = "";
        }
        this.open();
    }

    async runAI(block) {
        const container = block.closest('.dialectics-editor') || document;
        const getRoleText = (role) => {
            const el = container.querySelector(`[data-role="${role}"] .dialectics-content-inner`);
            return el ? (el.innerText || el.textContent).trim() : '';
        };

        const anchorText = getRoleText('anchor');
        const step1Text = getRoleText('step1');
        const step2Text = getRoleText('step2');

        let parts = [];
        if (anchorText) parts.push(`Что понять: ${anchorText}`);
        if (step1Text) parts.push(`Простейший процесс: ${step1Text}`);
        if (step2Text) parts.push(`Развитие процесса: ${step2Text}`);

        let processText = parts.join('\n\n');
        if (!processText) {
            const inner = block.querySelector('.dialectics-content-inner');
            processText = inner ? (inner.innerText || inner.textContent).trim() : '';
        }
        if (!processText) return;

        window.showToast(window._("toast.ai_is_analyzing_the_process"), "info");

        try {
            const res = await fetch('/api/ai/dialectics/opposites', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ process_a: processText })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || 'API Error');
            }

            const data = await res.json();

            const modal = document.getElementById('explainConceptModal');
            const titleEl = document.getElementById('explainConceptTitle');
            const bodyEl = document.getElementById('explainConceptBody');

            if (modal && titleEl && bodyEl) {
                const defaultFooter = document.getElementById('explainConceptDefaultFooter');
                const chatFooter = document.getElementById('explainConceptChatFooter');
                if (defaultFooter) defaultFooter.style.display = 'block';
                if (chatFooter) chatFooter.style.display = 'none';

                titleEl.innerText = window._ ? (window._('analysis_result') || 'Результат анализа') : 'Результат анализа';
                bodyEl.innerHTML = this._renderMarkdown(data.result);
                modal.style.display = 'flex';
            } else {
                // Fallback safe formatting
                const safeResult = data.result.replace(/</g, '&lt;').replace(/>/g, '&gt;');
                const formattedResult = `<div style="white-space: pre-wrap; text-align: left; font-family: monospace; font-size: 14px; background: #f8fafc; padding: 15px; border-radius: 8px; max-height: 60vh; overflow-y: auto;">${safeResult}</div>`;
                customConfirm({
                    title: 'Результат анализа',
                    message: formattedResult,
                    buttons: [
                        { label: 'Закрыть', value: true, class: 'confirm-btn-primary' }
                    ]
                });
            }

        } catch (error) {
            console.error(error);
            const modal = document.getElementById('explainConceptModal');
            const titleEl = document.getElementById('explainConceptTitle');
            const bodyEl = document.getElementById('explainConceptBody');

            if (modal && titleEl && bodyEl) {
                const defaultFooter = document.getElementById('explainConceptDefaultFooter');
                const chatFooter = document.getElementById('explainConceptChatFooter');
                if (defaultFooter) defaultFooter.style.display = 'block';
                if (chatFooter) chatFooter.style.display = 'none';

                titleEl.innerText = 'Ошибка';
                bodyEl.innerHTML = `<div style="color:#ef4444;">${error.message}</div>`;
                modal.style.display = 'flex';
            } else {
                customConfirm({
                    title: 'Ошибка',
                    message: `<div style="color: red;">${error.message}</div>`,
                    buttons: [
                        { label: 'Закрыть', value: true, class: 'confirm-btn-secondary' }
                    ]
                });
            }
        }
    }

    async runGlobalParser() {
        if (window.WidgetManager) {
            window.WidgetManager.toggle('formulaParserWidget');
        } else {
            const widget = document.getElementById('formulaParserWidget');
            if (widget) widget.style.display = 'flex';
        }
    }

    async startTextMathDictation() {
        const text = await customPrompt({
            title: window._ ? window._('dialectics.describe_formula_prompt', '✍ Describe the formula in words') : '✍ Describe the formula in words',
            message: window._ ? window._('dialectics.describe_formula_example', 'Example: "square root of x squared plus y squared"') : 'Example: "square root of x squared plus y squared"',
            placeholder: window._ ? window._('dashboard.enter_title', 'Your text...') : 'Your text...'
        });
        if (!text || !text.trim()) return;

        window.showToast(window._("toast.ai_is_generating_formula"), "info");

        try {
            const res = await fetch('/api/ai/dialectics/text-math', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: text.trim() })
            });

            if (!res.ok) throw new Error(await res.text());

            const data = await res.json();
            const latex = data.latex;

            // Insert into TipTap
            if (this.editor && this.editor.tiptap) {
                this.editor.tiptap.chain().focus().insertContent({
                    type: 'mathNode',
                    attrs: { latex: latex }
                }).run();
                window.showToast(window._("toast.formula_added"), "success");
            }
        } catch (error) {
            console.error(error);
            window.showToast(window._("toast.error_generating_formula"), "error");
        }
    }

    async startImageMathDictation() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const tiptap = this.editor && this.editor.tiptap;
            window.showToast(window._("toast.ai_is_parsing_formula", "🧮 Распознавание формулы с фото..."), "info");

            const formData = new FormData();
            formData.append("file", file);

            try {
                const res = await fetch('/api/ai/dialectics/formula/ocr', {
                    method: 'POST',
                    body: formData
                });

                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    throw new Error(errData.detail || await res.text());
                }

                const data = await res.json();
                const latex = data.latex;

                if (latex && tiptap) {
                    tiptap.chain().focus().insertContent({
                        type: 'mathNode',
                        attrs: { latex: latex }
                    }).run();
                    window.showToast(window._("toast.formula_added", "✅ Формула добавлена"), "success");
                } else if (latex) {
                    window.showToast(`LaTeX: ${latex}`, "info");
                } else {
                    window.showToast(window._("toast.error_generating_formula", "❌ Не удалось распознать формулу"), "error");
                }
            } catch (error) {
                console.error("Formula OCR error:", error);
                window.showToast(window._("toast.error_generating_formula", "❌ Ошибка при распознавании формулы"), "error");
            }
        };
        input.click();
    }

    async startVoiceMathDictation() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            const audioChunks = [];
            let isCancelled = false;

            // Capture tiptap reference NOW, before any async/await or user interaction
            const tiptap = this.editor && this.editor.tiptap;

            mediaRecorder.addEventListener("dataavailable", event => {
                audioChunks.push(event.data);
            });

            mediaRecorder.addEventListener("stop", async () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                stream.getTracks().forEach(track => track.stop());

                if (isCancelled) {
                    window.showToast(window._("toast.recording_cancelled"), "info");
                    return;
                }

                window.showToast(window._("toast.recognizing_and_generating_lat"), "info");

                const formData = new FormData();
                formData.append("file", audioBlob, "voice-math.webm");

                try {
                    const res = await fetch('/api/ai/dialectics/voice-math', {
                        method: 'POST',
                        body: formData
                    });

                    if (!res.ok) throw new Error(await res.text());

                    const data = await res.json();
                    const latex = data.latex;

                    console.log("Transcribed text:", data.transcribed_text);
                    console.log("LaTeX:", latex);

                    // Use the reference captured before recording started
                    if (tiptap) {
                        tiptap.chain().focus().insertContent({
                            type: 'mathNode',
                            attrs: { latex: latex }
                        }).run();
                        window.showToast(window._("toast.formula_added"), "success");
                    } else {
                        console.warn("tiptap not available, cannot insert formula");
                        window.showToast(`LaTeX: ${latex}`, "info");
                    }

                } catch (error) {
                    console.error(error);
                    window.showToast(window._("toast.audio_processing_error"), "error");
                }
            });

            mediaRecorder.start();

            // Show toast indicating recording
            customConfirm({
                title: '🎙 Recording',
                message: '<div style="text-align: center; color: red; font-weight: bold; animation: pulse 1.5s infinite;">Audio recording in progress... Speak the formula.</div>',
                buttons: [
                    { label: 'Stop and recognize', value: true, class: 'confirm-btn-primary' },
                    { label: 'Cancel', value: false, class: 'confirm-btn-secondary' }
                ]
            }).then((val) => {
                if (val === false) isCancelled = true;
                // Stop recording when user clicks any button
                if (mediaRecorder.state === "recording") {
                    mediaRecorder.stop();
                }
            });

        } catch (err) {
            console.error("Microphone access denied or error:", err);
            window.showToast(window._("toast.no_microphone_access"), "error");
        }
    }

    async checkAI(block) {
        const titleEl = block.querySelector('.block-title-text');
        const title = titleEl ? titleEl.innerText.trim() : '';
        const inner = block.querySelector('.dialectics-content-inner');
        const content = inner ? (inner.innerText || inner.textContent).trim() : '';
        const textToCheck = title ? `Заголовок: ${title}\n\nТекст:\n${content}` : content;

        if (!textToCheck.trim()) {
            if (window.showToast) window.showToast("Блок пуст. Нечего проверять.", "warning");
            return;
        }

        if (window.showToast) window.showToast("🤖 Анализирую текст...", "info");

        const modal = document.getElementById('explainConceptModal');
        const titleModalEl = document.getElementById('explainConceptTitle');
        const bodyEl = document.getElementById('explainConceptBody');
        const defaultFooter = document.getElementById('explainConceptDefaultFooter');
        const chatFooter = document.getElementById('explainConceptChatFooter');
        const inputEl = document.getElementById('explainConceptInput');
        const sendBtn = document.getElementById('explainConceptSendBtn');

        if (!modal || !bodyEl || !inputEl || !sendBtn) return;

        let chatHistory = [];

        titleModalEl.innerText = window._ ? (window._('dialectics.ai_checking') || 'Проверка ИИ') : 'Проверка ИИ';
        bodyEl.innerHTML = '';
        inputEl.value = '';
        inputEl.disabled = true;
        sendBtn.disabled = true;

        if (defaultFooter) defaultFooter.style.display = 'none';
        if (chatFooter) chatFooter.style.display = 'block';

        modal.style.display = 'flex';

        const appendMessage = (role, text) => {
            const msgDiv = document.createElement('div');
            if (role === 'user') {
                msgDiv.style.cssText = "margin-left: auto; margin-right: 0; max-width: 80%; background: #3b82f6; color: #fff; padding: 10px 14px; border-radius: 12px 12px 0 12px; box-shadow: 0 2px 4px rgba(59, 130, 246, 0.15); margin-bottom: 12px; word-break: break-word;";
                msgDiv.innerText = text;
            } else if (role === 'assistant') {
                msgDiv.style.cssText = "margin-left: 0; margin-right: auto; max-width: 85%; background: #f1f5f9; color: #1e293b; padding: 12px 16px; border-radius: 12px 12px 12px 0; box-shadow: 0 1px 2px rgba(0,0,0,0.05); margin-bottom: 12px; word-break: break-word;";
                msgDiv.innerHTML = this._renderMarkdown ? this._renderMarkdown(text) : text;
            } else if (role === 'loading') {
                msgDiv.id = 'explainConceptLoading';
                msgDiv.style.cssText = "margin-left: 0; margin-right: auto; max-width: 85%; background: #f1f5f9; color: #94a3b8; padding: 12px 16px; border-radius: 12px 12px 12px 0; box-shadow: 0 1px 2px rgba(0,0,0,0.05); margin-bottom: 12px; display: flex; align-items: center; gap: 8px;";
                msgDiv.innerHTML = `<span class="spinner" style="border: 2px solid #cbd5e1; border-top: 2px solid #3b82f6; border-radius: 50%; width: 14px; height: 14px; animation: spin 0.8s linear infinite; display: inline-block;"></span><span>Думаю...</span>`;
            }
            bodyEl.appendChild(msgDiv);
            bodyEl.scrollTop = bodyEl.scrollHeight;
        };

        appendMessage('loading');

        try {
            const response = await fetch('/api/ai/dialectics/check-ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: textToCheck
                })
            });

            const loadingEl = document.getElementById('explainConceptLoading');
            if (loadingEl) loadingEl.remove();

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();

            chatHistory.push({ role: 'user', content: `Проверь следующий текст:\n${textToCheck}` });
            chatHistory.push({ role: 'assistant', content: data.result });

            appendMessage('assistant', data.result);

            inputEl.disabled = false;
            sendBtn.disabled = false;
            inputEl.focus();
        } catch (err) {
            const loadingEl = document.getElementById('explainConceptLoading');
            if (loadingEl) loadingEl.remove();
            bodyEl.innerHTML = `<div style="color:#ef4444; padding:10px;">Ошибка: ${err.message}</div>`;
        }

        const formEl = document.getElementById('explainConceptForm');
        if (formEl) {
            formEl.onsubmit = async (evt) => {
                evt.preventDefault();
                const questionText = inputEl.value.trim();
                if (!questionText || inputEl.disabled) return;

                appendMessage('user', questionText);
                chatHistory.push({ role: 'user', content: questionText });

                inputEl.value = '';
                inputEl.disabled = true;
                sendBtn.disabled = true;
                appendMessage('loading');

                try {
                    const response = await fetch('/api/ai/dialectics/check-ai', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            text: textToCheck,
                            history: chatHistory
                        })
                    });

                    const loadingEl = document.getElementById('explainConceptLoading');
                    if (loadingEl) loadingEl.remove();

                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    const data = await response.json();

                    chatHistory.push({ role: 'assistant', content: data.result });
                    appendMessage('assistant', data.result);
                } catch (err) {
                    const loadingEl = document.getElementById('explainConceptLoading');
                    if (loadingEl) loadingEl.remove();

                    const errDiv = document.createElement('div');
                    errDiv.style.cssText = "margin-left: 0; margin-right: auto; max-width: 85%; color: #ef4444; padding: 10px 12px; margin-bottom: 12px;";
                    errDiv.innerText = `Ошибка: ${err.message}`;
                    bodyEl.appendChild(errDiv);
                    bodyEl.scrollTop = bodyEl.scrollHeight;
                } finally {
                    inputEl.disabled = false;
                    sendBtn.disabled = false;
                    inputEl.focus();
                }
            };
        }
    }
}

export const AIControllerMixin = {};
Object.getOwnPropertyNames(AIControllerClass.prototype).forEach(key => {
    if (key !== 'constructor') AIControllerMixin[key] = AIControllerClass.prototype[key];
});
