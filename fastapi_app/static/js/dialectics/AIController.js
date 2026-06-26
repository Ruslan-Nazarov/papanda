import { DialecticsAPI } from './api.js';
import { DialecticsUI } from './ui_utils.js';
import { BlockManager } from './BlockManager.js';

export const AIControllerMixin = {
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
    openInsertAfter(side, index) {
        this.state.editingBlock = null;
        this.state.pendingSide = side;
        this.state.pendingRole = null;
        this.state.pendingBlockId = 'block_' + Math.random().toString(36).substr(2, 9);
        this.state.insertAfterIndex = index;
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
        const formula = await customPrompt({
            title: '✨ AI Formula Parser',
            message: 'Enter math formula for dialectical parsing:',
            placeholder: 'e.g. E = mc^2 or Hψ = Eψ',
            watermark: 'made of Iasmin',
            width: '500px'
        });
        if (!formula || !formula.trim()) return;

        window.showToast(window._("toast.ai_is_parsing_formula"), "info");

        try {
            const res = await fetch('/api/ai/dialectics/parser', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ formula: formula.trim() })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || 'API Error');
            }

            const data = await res.json();

            // Parse JSON response
            let parsed;
            try {
                parsed = JSON.parse(data.result);
            } catch (e) {
                // Sometimes LLM wraps JSON in markdown blocks
                const match = data.result.match(/```(?:json)?\n([\s\S]*?)\n```/);
                if (match) {
                    parsed = JSON.parse(match[1]);
                } else {
                    throw new Error("Failed to parse JSON response from AI.");
                }
            }

            // Create formatted HTML for the parsed JSON
            const formatBlock = (title, content, typeClass) => `
                <div class="parser-block ${typeClass}">
                    <div class="parser-block-title">${title}</div>
                    <div class="parser-block-content">${content || '—'}</div>
                </div>
            `;

            const htmlContent = `
                <div class="parser-modal-container">
                    <h3 class="parser-modal-header">
                        Formula Analysis: <span class="parser-modal-formula">${formula}</span>
                    </h3>
                    ${formatBlock("Preceding Operation (Thesis)", parsed.predecessor, "thesis")}
                    ${formatBlock("Crisis of Notation Complexity (Antithesis)", parsed.crisis_of_notation, "antithesis")}
                    ${formatBlock("Resolution (Synthesis)", parsed.resolution, "synthesis")}
                </div>
            `;

            customConfirm({
                title: 'Parser Result',
                message: htmlContent,
                icon: '🧮',
                watermark: 'made of Iasmin',
                width: '650px',
                buttons: [
                    { label: 'Close', value: true, class: 'confirm-btn-primary' }
                ]
            });

        } catch (error) {
            console.error(error);
            customConfirm({
                title: 'Parser Error',
                message: `<div style="color: red;">${error.message}</div>`,
                buttons: [
                    { label: 'Close', value: true, class: 'confirm-btn-secondary' }
                ]
            });
        }
    }

    async startTextMathDictation() {
        const text = await customPrompt({
            title: '✍ Describe the formula in words',
            message: 'Example: "square root of x squared plus y squared"',
            placeholder: 'Your text...'
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

    async startVoiceMathDictation() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            const audioChunks = [];
            let isCancelled = false;

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
                // append file
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

};
