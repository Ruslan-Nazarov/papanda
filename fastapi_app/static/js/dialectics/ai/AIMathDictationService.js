import { DialecticsAPI } from '../api.js';
import { DialecticsUI } from '../ui_utils.js';
import { BlockManager } from '../BlockManager.js';
import { customConfirm } from '../../modal_controller.js';

class AIMathDictationClass {
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

}
export const AIMathDictationMixin = {};
Object.getOwnPropertyNames(AIMathDictationClass.prototype).forEach(k => { if (k !== 'constructor') AIMathDictationMixin[k] = AIMathDictationClass.prototype[k]; });
