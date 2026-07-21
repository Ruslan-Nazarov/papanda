/**
 * ConceptExplainManager.js - Управление всплывающими объяснениями концепций и словарем терминов (Что это?)
 */
import { BlockManager } from '../BlockManager.js';

export const ConceptExplainMixin = {
    _renderMarkdown(text) {
        if (!text) return '';
        let html = text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        html = html.replace(/```([\s\S]*?)```/g, '<pre style="background:#1e293b; color:#f8fafc; padding:8px; border-radius:6px; overflow-x:auto;"><code>$1</code></pre>');
        html = html.replace(/`([^`]+)`/g, '<code style="background:#e2e8f0; color:#0f172a; padding:2px 4px; border-radius:4px;">$1</code>');
        html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color:#2563eb; text-decoration:underline;">$1</a>');
        html = html.replace(/\n/g, '<br>');
        return html;
    },

    setupExplainTooltip() {
        if (!document.getElementById('explain-concept-styles')) {
            const style = document.createElement('style');
            style.id = 'explain-concept-styles';
            style.innerHTML = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }

        const contextMenu = document.createElement('div');
        contextMenu.className = 'dialectics-context-menu';
        contextMenu.style.display = 'none';
        
        const explainOption = document.createElement('div');
        explainOption.className = 'dialectics-context-menu-item';
        explainOption.innerHTML = 'Что это?';
        
        contextMenu.appendChild(explainOption);
        document.body.appendChild(contextMenu);

        let selectedText = '';
        let contextBefore = '';
        let contextAfter = '';
        let chatHistory = [];

        const getBlockContainer = (element) => {
            let curr = element;
            while (curr && curr !== document.body) {
                if (
                    curr.classList.contains('tiptap-editor') ||
                    curr.classList.contains('ProseMirror') ||
                    curr.classList.contains('dialectics-content-inner') ||
                    curr.id === 'inlineEditor' ||
                    ['P', 'DIV', 'LI', 'BLOCKQUOTE', 'PRE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(curr.tagName)
                ) {
                    return curr;
                }
                curr = curr.parentElement;
            }
            return element;
        };

        const getContext = (sel) => {
            if (!sel || !sel.rangeCount) return { before: '', after: '' };
            try {
                const range = sel.getRangeAt(0);
                const container = range.commonAncestorContainer;
                const element = container.nodeType === 3 ? container.parentElement : container;
                const blockContainer = getBlockContainer(element);

                const preRange = document.createRange();
                preRange.selectNodeContents(blockContainer);
                preRange.setEnd(range.startContainer, range.startOffset);
                const before = preRange.toString();

                const postRange = document.createRange();
                postRange.selectNodeContents(blockContainer);
                postRange.setStart(range.endContainer, range.endOffset);
                const after = postRange.toString();

                return { before, after };
            } catch (err) {
                console.error("Error getting context:", err);
                return { before: '', after: '' };
            }
        };

        const isInsideDialecticsArea = (element) => {
            return element.closest('.dialectics-content-inner') ||
                   element.closest('.tiptap-editor') ||
                   element.closest('.ProseMirror') ||
                   element.closest('#inlineEditor');
        };

        const bodyEl = document.getElementById('explainConceptBody');
        const appendMessage = (role, text) => {
            if (!bodyEl) return;
            const msgDiv = document.createElement('div');
            if (role === 'user') {
                msgDiv.style.cssText = "margin-left: auto; margin-right: 0; max-width: 80%; background: #3b82f6; color: #fff; padding: 10px 14px; border-radius: 12px 12px 0 12px; box-shadow: 0 2px 4px rgba(59, 130, 246, 0.15); margin-bottom: 12px; word-break: break-word;";
                msgDiv.innerText = text;
            } else if (role === 'assistant') {
                msgDiv.style.cssText = "margin-left: 0; margin-right: auto; max-width: 85%; background: #f1f5f9; color: #1e293b; padding: 12px 16px; border-radius: 12px 12px 12px 0; box-shadow: 0 1px 2px rgba(0,0,0,0.05); margin-bottom: 12px; word-break: break-word;";
                msgDiv.innerHTML = this._renderMarkdown(text);
            } else if (role === 'loading') {
                msgDiv.id = 'explainConceptLoading';
                msgDiv.style.cssText = "margin-left: 0; margin-right: auto; max-width: 85%; background: #f1f5f9; color: #94a3b8; padding: 12px 16px; border-radius: 12px 12px 12px 0; box-shadow: 0 1px 2px rgba(0,0,0,0.05); margin-bottom: 12px; display: flex; align-items: center; gap: 8px;";
                msgDiv.innerHTML = `<span class="spinner" style="border: 2px solid #cbd5e1; border-top: 2px solid #3b82f6; border-radius: 50%; width: 14px; height: 14px; animation: spin 0.8s linear infinite; display: inline-block;"></span><span>Думаю...</span>`;
            }
            bodyEl.appendChild(msgDiv);
            bodyEl.scrollTop = bodyEl.scrollHeight;
        };

        document.addEventListener('contextmenu', (e) => {
            const selection = window.getSelection();
            if (!selection || !selection.rangeCount || selection.isCollapsed) {
                contextMenu.style.display = 'none';
                return;
            }

            const range = selection.getRangeAt(0);
            const container = range.commonAncestorContainer;
            const element = container.nodeType === 3 ? container.parentElement : container;

            if (!isInsideDialecticsArea(element)) {
                contextMenu.style.display = 'none';
                return;
            }

            selectedText = selection.toString().trim();
            if (!selectedText) {
                contextMenu.style.display = 'none';
                return;
            }

            const ctx = getContext(selection);
            contextBefore = ctx.before;
            contextAfter = ctx.after;

            e.preventDefault();
            let left = e.pageX;
            let top = e.pageY;
            if (left + 160 > window.innerWidth) left = window.innerWidth - 160;
            if (top + 50 > window.innerHeight + window.scrollY) top = e.pageY - 50;

            contextMenu.style.left = `${left}px`;
            contextMenu.style.top = `${top}px`;
            contextMenu.style.display = 'block';
        });

        document.addEventListener('click', (e) => {
            if (!contextMenu.contains(e.target)) {
                contextMenu.style.display = 'none';
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') contextMenu.style.display = 'none';
        });

        explainOption.addEventListener('click', async () => {
            contextMenu.style.display = 'none';
            if (!selectedText) return;

            const modal = document.getElementById('explainConceptModal');
            const titleEl = document.getElementById('explainConceptTitle');
            const inputEl = document.getElementById('explainConceptChatInput');
            const sendBtn = document.getElementById('btnSendConceptQuestion');
            const defaultFooter = document.getElementById('explainConceptDefaultFooter');
            const chatFooter = document.getElementById('explainConceptChatFooter');

            if (!modal || !bodyEl || !inputEl || !sendBtn) return;

            titleEl.innerText = `📖 Что значит: «${selectedText}»`;
            bodyEl.innerHTML = '';
            inputEl.value = '';
            chatHistory = [];

            if (defaultFooter) defaultFooter.style.display = 'none';
            if (chatFooter) chatFooter.style.display = 'block';

            modal.style.display = 'flex';
            appendMessage('loading');

            try {
                const response = await fetch('/api/ai/dialectics/explain-concept', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        text: selectedText,
                        context_before: contextBefore,
                        context_after: contextAfter
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
                appendMessage('assistant', `⚠️ Ошибка получения ответа: ${err.message}`);
            }
        });

        const sendFollowUp = async () => {
            const inputEl = document.getElementById('explainConceptChatInput');
            const sendBtn = document.getElementById('btnSendConceptQuestion');
            if (!inputEl || !sendBtn) return;

            const questionText = inputEl.value.trim();
            if (!questionText || inputEl.disabled) return;

            inputEl.value = '';
            appendMessage('user', questionText);
            chatHistory.push({ role: 'user', content: questionText });

            inputEl.disabled = true;
            sendBtn.disabled = true;
            appendMessage('loading');

            try {
                const response = await fetch('/api/ai/dialectics/explain-concept', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        text: selectedText,
                        context_before: contextBefore,
                        context_after: contextAfter,
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
                appendMessage('assistant', `⚠️ Ошибка получения ответа: ${err.message}`);
            } finally {
                inputEl.disabled = false;
                sendBtn.disabled = false;
                inputEl.focus();
            }
        };

        const sendBtn = document.getElementById('btnSendConceptQuestion');
        if (sendBtn) {
            sendBtn.onclick = sendFollowUp;
        }

        const inputEl = document.getElementById('explainConceptChatInput');
        const formEl = inputEl?.closest('form');
        if (formEl) {
            formEl.onsubmit = (e) => {
                e.preventDefault();
                sendFollowUp();
            };
        } else if (inputEl) {
            inputEl.onkeydown = (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendFollowUp();
                }
            };
        }
    },

    showWordDefinition(wordName) {
        const blocks = BlockManager.getBlocks(document.getElementById('dialecticsCanvas'));
        let foundWord = null;
        let foundBlockId = null;
        for (const b of blocks) {
            if (b.words) {
                const w = b.words.find(x => x.word.toLowerCase() === wordName.toLowerCase());
                if (w) {
                    foundWord = w;
                    foundBlockId = b.id;
                    break;
                }
            }
        }

        if (!foundWord) {
            if (window.showToast) window.showToast("Слово не найдено в словаре этого конспекта", "warning");
            return;
        }

        const modal = document.getElementById('explainConceptModal');
        const titleEl = document.getElementById('explainConceptTitle');
        const bodyEl = document.getElementById('explainConceptBody');
        if (!modal || !bodyEl) return;

        const defaultFooter = document.getElementById('explainConceptDefaultFooter');
        const chatFooter = document.getElementById('explainConceptChatFooter');
        if (defaultFooter) defaultFooter.style.display = 'block';
        if (chatFooter) chatFooter.style.display = 'none';

        titleEl.innerText = `📖 ${foundWord.word}`;

        let connHtml = '';
        if (foundWord.connections) {
            const parts = foundWord.connections.split(',').map(x => x.trim()).filter(Boolean);
            if (parts.length > 0) {
                connHtml = `<div style="margin-top: 16px; padding-top: 12px; border-top: 1px dashed #e2e8f0;">
                    <strong style="color: #475569; font-size: 0.85rem; display: block; margin-bottom: 6px;">Связи:</strong>
                    <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                `;
                parts.forEach(p => {
                    connHtml += `<span onclick="window.app && window.app.showWordDefinition('${p.replace(/'/g, "\\'")}')" style="cursor: pointer; background: #f1f5f9; border: 1px solid #cbd5e1; color: #475569; border-radius: 12px; padding: 2px 8px; font-size: 0.8rem; font-weight: 500; display: inline-flex; align-items: center; gap: 4px;">📖 ${p}</span>`;
                });
                connHtml += `</div></div>`;
            }
        }

        bodyEl.innerHTML = `
            <div style="font-size: 1rem; color: #1e293b; line-height: 1.6;">
                ${foundWord.definition.replace(/\n/g, '<br>')}
            </div>
            ${connHtml}
            <div style="margin-top: 20px; text-align: right;">
                <button class="btn btn-secondary" onclick="document.getElementById('explainConceptModal').style.display='none'; const el = document.querySelector('[data-block-id=\\'${foundBlockId}\\']'); if (el) { el.scrollIntoView({behavior: 'smooth', block: 'center'}); el.style.boxShadow = '0 0 20px rgba(59, 130, 246, 0.5)'; setTimeout(() => el.style.boxShadow = '', 2000); }" style="font-size: 0.85rem; padding: 6px 12px; border-radius: 6px; background: #3b82f6; color: white; border: none; cursor: pointer; font-weight: 600;">🔍 ${(window._ && window._('dialectics.go_to_block')) || 'Перейти к блоку'}</button>
            </div>
        `;

        modal.style.display = 'flex';
    }
};
