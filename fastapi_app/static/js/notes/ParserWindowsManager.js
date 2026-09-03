import DialogService from './DialogService.js';

import { t } from '../i18n.js';
class ParserWindowsManager {
    static init() {
        this.windows = {
            formula: {
                id: 'formula-parser-window',
                title: t('pw_formula_title'),
                isOpen: false,
                isMinimized: false,
                isMaximized: false,
                history: [],
                el: null
            },
            article: {
                id: 'article-parser-window',
                title: t('pw_article_title'),
                isOpen: false,
                isMinimized: false,
                isMaximized: false,
                activeTab: 'chat', // 'chat' or 'dict'
                history: [],
                dictWords: [],
                el: null
            }
        };

        this.ensureDock();
    }

    static ensureDock() {
        let dock = document.getElementById('parsers-dock');
        if (!dock) {
            dock = document.createElement('div');
            dock.id = 'parsers-dock';
            dock.className = 'parsers-dock hidden';
            document.body.appendChild(dock);
        }
        this.dockEl = dock;
        this.updateDock();
    }

    static updateDock() {
        if (!this.dockEl) return;
        const minimized = Object.entries(this.windows).filter(([_, w]) => w.isOpen && w.isMinimized);
        if (minimized.length === 0) {
            this.dockEl.classList.add('hidden');
            this.dockEl.innerHTML = '';
            return;
        }

        this.dockEl.classList.remove('hidden');
        this.dockEl.innerHTML = '';
        minimized.forEach(([key, w]) => {
            const btn = document.createElement('button');
            btn.className = 'dock-item-btn';
            btn.innerHTML = `${key === 'formula' ? `<span class="dock-icon">🧮</span> ${t('pw_formula_name')}` : `<span class="dock-icon">📄</span> ${t('pw_article_name')}`}`;
            btn.addEventListener('click', () => {
                this.restoreWindow(key);
            });
            this.dockEl.appendChild(btn);
        });
    }

    static openWindow(type) {
        const win = this.windows[type];
        if (!win) return;

        win.isOpen = true;
        win.isMinimized = false;

        if (!win.el) {
            win.el = type === 'formula' ? this.createFormulaWindow() : this.createArticleWindow();
            document.body.appendChild(win.el);
        }

        win.el.classList.remove('hidden', 'minimized');
        this.updateDock();
        
        // Focus input
        const input = win.el.querySelector('.parser-input');
        if (input) input.focus();
    }

    static closeWindow(type) {
        const win = this.windows[type];
        if (!win || !win.el) return;
        win.isOpen = false;
        win.isMinimized = false;
        win.el.classList.add('hidden');
        this.updateDock();
    }

    static minimizeWindow(type) {
        const win = this.windows[type];
        if (!win || !win.el) return;
        win.isMinimized = true;
        win.el.classList.add('hidden');
        this.updateDock();
    }

    static restoreWindow(type) {
        const win = this.windows[type];
        if (!win || !win.el) return;
        win.isMinimized = false;
        win.el.classList.remove('hidden');
        this.updateDock();
        const input = win.el.querySelector('.parser-input');
        if (input) input.focus();
    }

    static toggleMaximize(type) {
        const win = this.windows[type];
        if (!win || !win.el) return;
        win.isMaximized = !win.isMaximized;
        win.el.classList.toggle('maximized', win.isMaximized);
    }

    static createFormulaWindow() {
        const winEl = document.createElement('div');
        winEl.id = 'formula-parser-window';
        winEl.className = 'parser-floating-window';

        winEl.innerHTML = `
            <div class="parser-window-header">
                <div class="parser-window-title">
                    <span class="parser-header-icon">🧮</span>
                    <span>${t('pw_formula_name')}</span>
                </div>
                <div class="parser-window-controls">
                    <button class="win-btn btn-clear" title="${t('pw_clear_tt')}">🗑</button>
                    <button class="win-btn btn-minimize" title="${t('pw_min_tt')}">_</button>
                    <button class="win-btn btn-maximize" title="${t('pw_max_tt')}">□</button>
                    <button class="win-btn btn-close" title="${t('pw_close_tt')}">✕</button>
                </div>
            </div>
            <div class="parser-window-body">
                <div class="parser-chat-messages" id="formula-chat-messages">
                    <div class="parser-msg bot-msg">
                        <div class="msg-bubble">
                            ${t('pw_formula_hello')}
                        </div>
                    </div>
                </div>
            </div>
            <div class="parser-window-footer">
                <div class="parser-input-container">
                    <input type="text" class="parser-input" id="formula-input" placeholder="${t('pw_formula_input_ph')}" autocomplete="off">
                    <input type="file" id="formula-file-input" accept="image/*" style="display: none;">
                    <button class="parser-action-btn" id="formula-btn-ocr" title="${t('pw_ocr_tt')}">🖼</button>
                    <button class="parser-action-btn" id="formula-btn-voice" title="${t('pw_voice_tt')}">🎙</button>
                    <button class="parser-send-btn" id="formula-btn-send" title="${t('pw_send_tt')}">➤</button>
                </div>
            </div>
        `;

        this.attachFormulaEvents(winEl);
        this.makeDraggable(winEl);
        return winEl;
    }

    static attachFormulaEvents(winEl) {
        winEl.querySelector('.btn-close').addEventListener('click', () => this.closeWindow('formula'));
        winEl.querySelector('.btn-minimize').addEventListener('click', () => this.minimizeWindow('formula'));
        winEl.querySelector('.btn-maximize').addEventListener('click', () => this.toggleMaximize('formula'));
        winEl.querySelector('.btn-clear').addEventListener('click', () => {
            const msgs = winEl.querySelector('#formula-chat-messages');
            msgs.innerHTML = `
                <div class="parser-msg bot-msg">
                    <div class="msg-bubble">
                        ${t('pw_formula_hello')}
                    </div>
                </div>
            `;
        });

        const input = winEl.querySelector('#formula-input');
        const sendBtn = winEl.querySelector('#formula-btn-send');
        const ocrBtn = winEl.querySelector('#formula-btn-ocr');
        const fileInput = winEl.querySelector('#formula-file-input');
        const voiceBtn = winEl.querySelector('#formula-btn-voice');

        const sendFormula = async () => {
            const text = input.value.trim();
            if (!text) return;

            this.appendMessage('formula', 'user', text);
            input.value = '';

            const loadingId = this.appendLoading('formula');

            try {
                const res = await fetch('/api/ai/dialectics/parser', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ formula: text })
                });
                const data = await res.json();
                this.removeLoading(loadingId);
                const reply = typeof data.result === 'string' ? data.result : this.formatJSON(data.result);
                this.appendMessage('formula', 'bot', reply);
            } catch (err) {
                this.removeLoading(loadingId);
                this.appendMessage('formula', 'bot', `${t('pw_err_process')}${err.message}`);
            }
        };

        sendBtn.addEventListener('click', sendFormula);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') sendFormula();
        });

        ocrBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            this.appendMessage('formula', 'user', `[${t('pw_photo_uploaded')}: ${file.name}]`);
            const loadingId = this.appendLoading('formula');

            const formData = new FormData();
            formData.append('file', file);

            try {
                const res = await fetch('/api/ai/dialectics/formula/ocr', {
                    method: 'POST',
                    body: formData
                });
                const data = await res.json();
                this.removeLoading(loadingId);
                const reply = typeof data.result === 'string' ? data.result : '```json\n' + JSON.stringify(data.result, null, 2) + '\n```';
                this.appendMessage('formula', 'bot', reply);
            } catch (err) {
                this.removeLoading(loadingId);
                this.appendMessage('formula', 'bot', `${t('pw_err_ocr')}${err.message}`);
            }
        });

        voiceBtn.addEventListener('click', async () => {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                this.appendMessage('formula', 'bot', t('pw_audio_unsupported'));
                return;
            }
            // Toggle: if already recording — stop
            if (voiceBtn._mediaRecorder && voiceBtn._mediaRecorder.state === 'recording') {
                voiceBtn._mediaRecorder.stop();
                return;
            }
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const mediaRecorder = new MediaRecorder(stream);
                voiceBtn._mediaRecorder = mediaRecorder;
                const chunks = [];
                
                voiceBtn.style.background = '#fee2e2';
                voiceBtn.style.color = '#ef4444';
                voiceBtn.title = t('pw_stop_hint');
                this.appendMessage('formula', 'bot', t('pw_recording'));
                
                mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
                mediaRecorder.onstop = async () => {
                    stream.getTracks().forEach(t => t.stop());
                    voiceBtn.style.background = '';
                    voiceBtn.style.color = '';
                    voiceBtn.title = t('pw_voice_tt');
                    
                    const blob = new Blob(chunks, { type: 'audio/webm' });
                    const formData = new FormData();
                    formData.append('file', blob, 'voice.webm');
                    
                    const loadingId = this.appendLoading('formula');
                    try {
                        const res = await fetch('/api/ai/dialectics/voice-math', { method: 'POST', body: formData });
                        const data = await res.json();
                        this.removeLoading(loadingId);
                        const recognized = data.result || '';
                        if (recognized) {
                            input.value = recognized;
                            this.appendMessage('formula', 'bot', `${t('pw_recognized')}<strong>${recognized}</strong>`);
                            input.focus();
                        } else {
                            this.appendMessage('formula', 'bot', t('pw_no_formula'));
                        }
                    } catch(err) {
                        this.removeLoading(loadingId);
                        this.appendMessage('formula', 'bot', `${t('pw_err_recognize')}${err.message}`);
                    }
                };
                mediaRecorder.start();
            } catch(err) {
                this.appendMessage('formula', 'bot', `${t('pw_mic_denied')}${err.message}`);
            }
        });
    }

    static createArticleWindow() {
        const winEl = document.createElement('div');
        winEl.id = 'article-parser-window';
        winEl.className = 'parser-floating-window';

        winEl.innerHTML = `
            <div class="parser-window-header">
                <div class="parser-window-title">
                    <span class="parser-header-icon">📄</span>
                    <span>${t('pw_article_name')}</span>
                </div>
                <div class="parser-window-controls">
                    <button class="win-btn btn-clear" title="${t('pw_clear_tt')}">🗑</button>
                    <button class="win-btn btn-minimize" title="${t('pw_min_tt')}">_</button>
                    <button class="win-btn btn-maximize" title="${t('pw_max_tt')}">□</button>
                    <button class="win-btn btn-close" title="${t('pw_close_tt')}">✕</button>
                </div>
            </div>
            <div class="parser-tabs">
                <button class="parser-tab-btn active" data-tab="chat">${t('pw_tab_chat')}</button>
                <button class="parser-tab-btn" data-tab="dict">${t('pw_tab_dict')}</button>
            </div>
            <div class="parser-window-body">
                <div class="parser-tab-pane active" id="article-tab-chat">
                    <div class="parser-chat-messages" id="article-chat-messages">
                        <div class="parser-msg bot-msg">
                            <div class="msg-bubble">
                                ${t('pw_article_hello1')}
                            </div>
                        </div>
                        <div class="parser-msg bot-msg">
                            <div class="msg-bubble">
                                ${t('pw_article_hello2')}
                            </div>
                        </div>
                        <div class="parser-msg bot-msg">
                            <div class="msg-bubble">
                                ${t('pw_article_hello3')}
                            </div>
                        </div>
                    </div>
                    <div class="parser-action-pills">
                        <input type="file" id="article-file-input" accept=".pdf,.txt,.md,.doc,.docx" style="display: none;">
                        <button class="parser-dashed-btn" id="article-btn-file">${t('pw_btn_file')}</button>
                        <button class="parser-dashed-btn" id="article-btn-text">${t('pw_btn_text')}</button>
                    </div>
                </div>
                <div class="parser-tab-pane" id="article-tab-dict" style="display: none;">
                    <div class="article-dict-container">
                        <p class="empty-dict-text" id="article-dict-empty">${t('pw_dict_empty')}</p>
                        <div class="article-dict-list" id="article-dict-list"></div>
                    </div>
                </div>
            </div>
            <div class="parser-window-footer">
                <div class="parser-input-container">
                    <input type="text" class="parser-input" id="article-input" placeholder="${t('pw_article_input_ph')}" autocomplete="off">
                    <button class="parser-action-btn" id="article-btn-voice" title="${t('pw_voice_tt')}">🎙</button>
                    <button class="parser-send-btn" id="article-btn-send" title="${t('pw_send_tt')}">➤</button>
                </div>
            </div>
        `;

        this.attachArticleEvents(winEl);
        this.makeDraggable(winEl);
        return winEl;
    }

    static attachArticleEvents(winEl) {
        winEl.querySelector('.btn-close').addEventListener('click', () => this.closeWindow('article'));
        winEl.querySelector('.btn-minimize').addEventListener('click', () => this.minimizeWindow('article'));
        winEl.querySelector('.btn-maximize').addEventListener('click', () => this.toggleMaximize('article'));
        winEl.querySelector('.btn-clear').addEventListener('click', () => {
            const msgs = winEl.querySelector('#article-chat-messages');
            msgs.innerHTML = `
                <div class="parser-msg bot-msg">
                    <div class="msg-bubble">
                        ${t('pw_article_hello1')}
                    </div>
                </div>
            `;
        });

        // Tab switching
        const tabBtns = winEl.querySelectorAll('.parser-tab-btn');
        const chatPane = winEl.querySelector('#article-tab-chat');
        const dictPane = winEl.querySelector('#article-tab-dict');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const tab = btn.dataset.tab;
                if (tab === 'chat') {
                    chatPane.style.display = 'block';
                    dictPane.style.display = 'none';
                } else {
                    chatPane.style.display = 'none';
                    dictPane.style.display = 'block';
                }
            });
        });

        const input = winEl.querySelector('#article-input');
        const sendBtn = winEl.querySelector('#article-btn-send');
        const fileBtn = winEl.querySelector('#article-btn-file');
        const fileInput = winEl.querySelector('#article-file-input');
        const textBtn = winEl.querySelector('#article-btn-text');

        const sendArticleMsg = async () => {
            const text = input.value.trim();
            if (!text) return;

            this.appendMessage('article', 'user', text);
            input.value = '';

            const loadingId = this.appendLoading('article');

            try {
                const formData = new FormData();
                formData.append('message', text);

                const res = await fetch('/api/ai/dialectics/article-parser', {
                    method: 'POST',
                    body: formData
                });
                const data = await res.json();
                this.removeLoading(loadingId);
                const reply = typeof data.result === 'string' ? data.result : '```json\n' + JSON.stringify(data.result, null, 2) + '\n```';
                this.appendMessage('article', 'bot', reply);
            } catch (err) {
                this.removeLoading(loadingId);
                this.appendMessage('article', 'bot', `${t('pw_err_generic')}${err.message}`);
            }
        };

        sendBtn.addEventListener('click', sendArticleMsg);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') sendArticleMsg();
        });

        fileBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            this.appendMessage('article', 'user', `[${t('pw_file_uploaded')}: ${file.name}]`);
            const loadingId = this.appendLoading('article');

            const formData = new FormData();
            formData.append('message', t('pw_article_parse_msg'));
            formData.append('file', file);

            try {
                const res = await fetch('/api/ai/dialectics/article-parser', {
                    method: 'POST',
                    body: formData
                });
                const data = await res.json();
                this.removeLoading(loadingId);
                const reply = typeof data.result === 'string' ? data.result : '```json\n' + JSON.stringify(data.result, null, 2) + '\n```';
                this.appendMessage('article', 'bot', reply);
            } catch (err) {
                this.removeLoading(loadingId);
                this.appendMessage('article', 'bot', `${t('pw_err_file')}${err.message}`);
            }
        });

        textBtn.addEventListener('click', async () => {
            const text = await DialogService.prompt({
                title: t('pw_article_dlg_title'),
                message: t('pw_article_dlg_msg'),
                placeholder: t('pw_article_dlg_ph'),
                icon: '📄',
                confirmText: t('pw_article_dlg_confirm')
            });
            if (text && text.trim()) {
                input.value = text.trim();
                sendArticleMsg();
            }
        });
    }

    static appendMessage(type, sender, text) {
        const win = this.windows[type];
        if (!win || !win.el) return;
        const container = win.el.querySelector(`#${type}-chat-messages`);
        if (!container) return;

        const msgDiv = document.createElement('div');
        msgDiv.className = `parser-msg ${sender}-msg`;
        const parsed = (typeof marked !== 'undefined') ? marked.parse(text) : this.escapeHtml(text).replace(/\n/g, '<br>');
        const sanitized = (typeof DOMPurify !== 'undefined') ? DOMPurify.sanitize(parsed) : parsed;
        msgDiv.innerHTML = `<div class="msg-bubble">${sanitized}</div>`;
        container.appendChild(msgDiv);
        container.scrollTop = container.scrollHeight;
    }

    static appendLoading(type) {
        const win = this.windows[type];
        if (!win || !win.el) return null;
        const container = win.el.querySelector(`#${type}-chat-messages`);
        if (!container) return null;

        const loadingId = 'loading-' + Math.random().toString(36).substring(2, 9);
        const msgDiv = document.createElement('div');
        msgDiv.id = loadingId;
        msgDiv.className = 'parser-msg bot-msg loading-msg';
        msgDiv.innerHTML = `<div class="msg-bubble"><span class="typing-dot">.</span><span class="typing-dot">.</span><span class="typing-dot">.</span> ${t('pw_processing')}</div>`;
        container.appendChild(msgDiv);
        container.scrollTop = container.scrollHeight;
        return loadingId;
    }

    static removeLoading(id) {
        if (!id) return;
        const el = document.getElementById(id);
        if (el && el.parentNode) el.parentNode.removeChild(el);
    }

    static makeDraggable(el) {
        const header = el.querySelector('.parser-window-header');
        if (!header) return;

        let isDragging = false;
        let startX, startY, initialLeft, initialTop;

        header.addEventListener('mousedown', (e) => {
            if (e.target.closest('.win-btn')) return;
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            const rect = el.getBoundingClientRect();
            initialLeft = rect.left;
            initialTop = rect.top;
            el.style.bottom = 'auto';
            el.style.right = 'auto';
            el.style.left = `${initialLeft}px`;
            el.style.top = `${initialTop}px`;
            el.style.margin = '0';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            el.style.left = `${Math.max(10, initialLeft + dx)}px`;
            el.style.top = `${Math.max(10, initialTop + dy)}px`;
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
    }

    static escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    static formatJSON(obj, depth = 0) {
        if (typeof obj !== 'object' || obj === null) return String(obj);
        let md = '';
        if (Array.isArray(obj)) {
            obj.forEach((item, index) => {
                const indent = '  '.repeat(depth);
                md += `\n${indent}**${t('block_word')} ${index + 1}**:\n`;
                md += this.formatJSON(item, depth + 1);
            });
        } else {
            for (const [k, v] of Object.entries(obj)) {
                // Делаем ключи читаемыми (dialectical_analysis -> Dialectical Analysis)
                const prettyKey = k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                const indent = '  '.repeat(depth);
                if (typeof v === 'object' && v !== null) {
                    md += `${indent}- **${prettyKey}**:\n${this.formatJSON(v, depth + 1)}`;
                } else {
                    md += `${indent}- **${prettyKey}**: ${v}\n`;
                }
            }
        }
        return md;
    }
}

export default ParserWindowsManager;
