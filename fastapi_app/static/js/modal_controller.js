/**
 * Centralized Modal Controller - Premium Edition
 * Handles generic confirmation and choice dialogs across the application.
 */

export function customConfirm({ title = 'Подтверждение', message = 'Вы уверены?', icon = '', buttons = [], watermark = '', width = '' }) {
    return new Promise((resolve) => {
        try {
            const modal = document.getElementById('customConfirmModal');
            const titleEl = document.getElementById('confirmModalTitle');
            const messageEl = document.getElementById('confirmModalMessage');
            const iconEl = document.getElementById('confirmModalIcon');
            const iconWrapper = document.getElementById('confirmModalIconWrapper');
            const footerEl = document.getElementById('confirmModalFooter');

            if (!modal || !titleEl || !messageEl || !footerEl) {
                console.warn("[customConfirm] UI elements missing, falling back to native.");
                resolve(confirm(message));
                return;
            }

            titleEl.innerText = title;
            messageEl.innerHTML = message;
            footerEl.innerHTML = '';

            if (iconWrapper && iconEl) {
                iconEl.innerHTML = icon || '';
                iconWrapper.style.display = icon ? 'flex' : 'none';
            }

            const modalContent = modal.querySelector('.modal-content');
            if (modalContent) {
                modalContent.style.position = 'relative';
                const existingWm = modalContent.querySelectorAll('.modal-watermark');
                existingWm.forEach(el => el.remove());
                
                if (width) {
                    modalContent.style.setProperty('max-width', width, 'important');
                } else {
                    modalContent.style.removeProperty('max-width');
                }

                if (watermark) {
                    const wm = document.createElement('div');
                    wm.className = 'modal-watermark';
                    wm.textContent = watermark;
                    wm.style.position = 'absolute';
                    wm.style.bottom = '5px';
                    wm.style.left = '20px';
                    wm.style.fontSize = '14px';
                    wm.style.color = '#cbd5e1';
                    wm.style.fontWeight = '600';
                    wm.style.opacity = '0.6';
                    wm.style.pointerEvents = 'none';
                    wm.style.letterSpacing = '0.5px';
                    modalContent.appendChild(wm);
                }
            }

            if (buttons.length === 0) {
                const cancelTxt = window._ ? window._('modal.cancel') || 'Отмена' : 'Отмена';
                const okTxt = window._ ? window._('modal.save_entry') || 'ОК' : 'ОК';
                buttons = [
                    { label: cancelTxt, value: false, class: 'confirm-btn-secondary' },
                    { label: okTxt, value: true, class: 'confirm-btn-primary' }
                ];
            }

            buttons.forEach(btn => {
                const button = document.createElement('button');
                button.innerText = btn.label;
                button.className = 'btn ' + (btn.class || 'confirm-btn-secondary');
                

                button.onclick = (e) => {
                    e.stopPropagation();
                    modal.classList.remove('active');
                    setTimeout(() => {
                        modal.classList.remove('active');
                    setTimeout(() => { modal.style.display = 'none'; }, 200);
                        if (modalContent) {
                            modalContent.style.removeProperty('max-width');
                            const existingWm = modalContent.querySelectorAll('.modal-watermark');
                            existingWm.forEach(el => el.remove());
                        }
                    }, 200);
                    resolve(btn.value);
                };
                footerEl.appendChild(button);
            });

            modal.style.display = 'flex';
            modal.offsetHeight;
            modal.classList.add('active');
            modal.offsetHeight; // trigger reflow
            modal.classList.add('active');
        } catch (err) {
            console.error("[customConfirm] Error:", err);
            resolve(confirm(message)); 
        }
    });
}

export function customChoice({ title = 'Select Option', messageHTML = '', options = [], okLabel = '', cancelLabel = '' }) {
    return new Promise((resolve) => {
        try {
            const modal = document.getElementById('customConfirmModal');
            const titleEl = document.getElementById('confirmModalTitle');
            const messageEl = document.getElementById('confirmModalMessage');
            const iconWrapper = document.getElementById('confirmModalIconWrapper');
            const footerEl = document.getElementById('confirmModalFooter');

            if (!modal || !titleEl || !messageEl || !footerEl) {
                resolve(null);
                return;
            }

            if (iconWrapper) iconWrapper.style.display = 'none';

            titleEl.innerText = title;
            const container = document.createElement('div');
            container.className = 'choice-container';
            
            if (messageHTML) {
                const msg = document.createElement('div');
                msg.className = 'choice-message';
                msg.innerHTML = messageHTML;
                container.appendChild(msg);
            }

            const list = document.createElement('div');
            list.className = 'choice-list';
            options.forEach((opt) => {
                const item = document.createElement('label');
                item.className = 'choice-item' + (opt.checked ? ' selected' : '');
                
                const radio = document.createElement('input');
                radio.type = 'radio';
                radio.name = 'customChoiceRadio';
                radio.value = opt.value;
                radio.checked = !!opt.checked;
                
                radio.addEventListener('change', () => {
                    document.querySelectorAll('.choice-item').forEach(el => el.classList.remove('selected'));
                    item.classList.add('selected');
                });
                
                const text = document.createElement('span');
                text.textContent = opt.label;
                
                item.appendChild(radio);
                item.appendChild(text);
                list.appendChild(item);
            });
            container.appendChild(list);
            
            messageEl.innerHTML = '';
            messageEl.appendChild(container);

            footerEl.innerHTML = '';
            const finalCancel = cancelLabel || (window._ ? window._('modal.cancel') || 'Отмена' : 'Отмена');
            const finalOk = okLabel || (window._ ? window._('modal.save_entry') || 'Готово' : 'Готово');

            const btnCancel = document.createElement('button');
            btnCancel.className = 'btn btn-secondary';
            btnCancel.innerText = finalCancel;
            btnCancel.onclick = (e) => {
                e.stopPropagation();
                modal.classList.remove('active');
                    setTimeout(() => { modal.style.display = 'none'; }, 200);
                resolve(null);
            };

            const btnOk = document.createElement('button');
            btnOk.className = 'btn btn-primary';
            btnOk.innerText = finalOk;
            btnOk.onclick = (e) => {
                e.stopPropagation();
                const selected = document.querySelector('input[name="customChoiceRadio"]:checked');
                modal.classList.remove('active');
                    setTimeout(() => { modal.style.display = 'none'; }, 200);
                resolve(selected ? selected.value : null);
            };
            
            footerEl.appendChild(btnCancel);
            footerEl.appendChild(btnOk);

            modal.style.display = 'flex';
            modal.offsetHeight;
            modal.classList.add('active');
        } catch (err) {
            console.error(err);
            resolve(null);
        }
    });
}

export function customPrompt({ title = 'Input Required', message = '', value = '', placeholder = '', okLabel = '', cancelLabel = '', watermark = '', width = '' }) {
    return new Promise((resolve) => {
        try {
            const modal = document.getElementById('customConfirmModal');
            const titleEl = document.getElementById('confirmModalTitle');
            const messageEl = document.getElementById('confirmModalMessage');
            const iconWrapper = document.getElementById('confirmModalIconWrapper');
            const footerEl = document.getElementById('confirmModalFooter');

            if (!modal || !titleEl || !messageEl || !footerEl) {
                console.warn("[customPrompt] UI elements missing, falling back to native.");
                resolve(prompt(message, value));
                return;
            }

            if (iconWrapper) iconWrapper.style.display = 'none';

            titleEl.innerText = title;
            messageEl.innerHTML = '';

            const container = document.createElement('div');
            container.className = 'prompt-container';
            container.style.textAlign = 'left';

            if (message) {
                const msg = document.createElement('div');
                msg.textContent = message;
                msg.style.marginBottom = '15px';
                msg.style.fontSize = '0.95rem';
                msg.style.color = 'var(--color-text-body)';
                container.appendChild(msg);
            }

            const input = document.createElement('input');
            input.type = 'text';
            input.value = value;
            input.placeholder = placeholder;
            input.className = 'form-input-premium';
            input.style.width = '100%';
            
            container.appendChild(input);

            const modalContent = modal.querySelector('.modal-content');
            if (modalContent) {
                modalContent.style.position = 'relative';
                const existingWm = modalContent.querySelectorAll('.modal-watermark');
                existingWm.forEach(el => el.remove());
                
                if (width) {
                    modalContent.style.setProperty('max-width', width, 'important');
                } else {
                    modalContent.style.removeProperty('max-width');
                }

                if (watermark) {
                    const wm = document.createElement('div');
                    wm.className = 'modal-watermark';
                    wm.textContent = watermark;
                    wm.style.position = 'absolute';
                    wm.style.bottom = '5px';
                    wm.style.left = '20px';
                    wm.style.fontSize = '14px';
                    wm.style.color = '#cbd5e1';
                    wm.style.fontWeight = '600';
                    wm.style.opacity = '0.6';
                    wm.style.pointerEvents = 'none';
                    wm.style.letterSpacing = '0.5px';
                    modalContent.appendChild(wm);
                }
            }

            messageEl.appendChild(container);

            footerEl.innerHTML = '';
            
            const cleanUp = () => {
                modal.classList.remove('active');
                    setTimeout(() => { modal.style.display = 'none'; }, 200);
                if (modalContent) {
                    modalContent.style.removeProperty('max-width');
                    const existingWm = modalContent.querySelectorAll('.modal-watermark');
                    existingWm.forEach(el => el.remove());
                }
            };

            const finalCancel = cancelLabel || (window._ ? window._('modal.cancel') || 'Отмена' : 'Отмена');
            const finalOk = okLabel || (window._ ? window._('modal.save_entry') || 'Создать' : 'Создать');

            const btnCancel = document.createElement('button');
            btnCancel.className = 'btn btn-secondary';
            btnCancel.innerText = finalCancel;
            btnCancel.onclick = (e) => {
                e.stopPropagation();
                cleanUp();
                resolve(null);
            };

            const btnOk = document.createElement('button');
            btnOk.className = 'btn btn-primary';
            btnOk.innerText = finalOk;
            
            const submit = () => {
                cleanUp();
                resolve(input.value);
            };

            btnOk.onclick = (e) => {
                e.stopPropagation();
                submit();
            };

            input.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    submit();
                } else if (e.key === 'Escape') {
                    cleanUp();
                    resolve(null);
                }
            };

            footerEl.appendChild(btnCancel);
            footerEl.appendChild(btnOk);

            modal.style.display = 'flex';
            modal.offsetHeight;
            modal.classList.add('active');
            setTimeout(() => input.focus(), 100);
        } catch (err) {
            console.error("[customPrompt] Error:", err);
            resolve(prompt(message, value));
        }
    });
}

export function customLatexPrompt({ title = 'Edit formula (LaTeX)', value = '', okLabel = 'Save', cancelLabel = 'Cancel' }) {
    return new Promise((resolve) => {
        try {
            const modal = document.getElementById('customConfirmModal');
            const titleEl = document.getElementById('confirmModalTitle');
            const messageEl = document.getElementById('confirmModalMessage');
            const footerEl = document.getElementById('confirmModalFooter');

            if (!modal || !titleEl || !messageEl || !footerEl) {
                resolve(prompt(title, value));
                return;
            }
            const iconWrapper = document.getElementById('confirmModalIconWrapper');
            if (iconWrapper) iconWrapper.style.display = 'none';

            titleEl.innerText = title;
            messageEl.innerHTML = '';

            const container = document.createElement('div');
            container.className = 'latex-prompt-container';
            container.style.textAlign = 'left';
            container.style.display = 'flex';
            container.style.flexDirection = 'column';
            container.style.gap = '10px';

            const inputRow = document.createElement('div');
            inputRow.style.cssText = 'display: flex; gap: 8px; align-items: center; width: 100%;';

            const input = document.createElement('input');
            input.type = 'text';
            input.value = value;
            input.className = 'form-input-premium';
            input.style.flex = '1';
            input.style.fontFamily = 'monospace';

            const btnCopy = document.createElement('button');
            btnCopy.type = 'button';
            btnCopy.title = 'Копировать LaTeX';
            btnCopy.innerHTML = '📋';
            btnCopy.style.cssText = 'background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 14px; font-size: 1.1rem; cursor: pointer; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 1px 2px rgba(0,0,0,0.05);';
            btnCopy.onmouseover = () => { btnCopy.style.background = '#f1f5f9'; btnCopy.style.borderColor = '#94a3b8'; };
            btnCopy.onmouseout = () => { btnCopy.style.background = '#f8fafc'; btnCopy.style.borderColor = '#cbd5e1'; };
            btnCopy.onclick = () => {
                navigator.clipboard.writeText(input.value).then(() => {
                    const originalHTML = btnCopy.innerHTML;
                    btnCopy.innerHTML = '✅';
                    btnCopy.style.borderColor = '#22c55e';
                    setTimeout(() => { btnCopy.innerHTML = originalHTML; btnCopy.style.borderColor = '#cbd5e1'; }, 1500);
                }).catch(err => {
                    console.error('Copy failed:', err);
                });
            };

            inputRow.appendChild(input);
            inputRow.appendChild(btnCopy);

            const searchInput = document.createElement('input');
            searchInput.type = 'text';
            searchInput.placeholder = '🔍 Search symbol (e.g. fraction, integral, alpha)...';
            searchInput.className = 'form-input-premium';
            searchInput.style.width = '100%';
            searchInput.style.fontSize = '0.85rem';
            searchInput.style.padding = '6px 12px';

            const symbolsGrid = document.createElement('div');
            symbolsGrid.style.display = 'grid';
            symbolsGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(120px, 1fr))';
            symbolsGrid.style.gap = '6px';
            symbolsGrid.style.maxHeight = '150px';
            symbolsGrid.style.overflowY = 'auto';
            symbolsGrid.style.padding = '4px';
            symbolsGrid.style.border = '1px solid #e2e8f0';
            symbolsGrid.style.borderRadius = '6px';
            symbolsGrid.style.background = '#f8fafc';

            const commonSymbols = [
                { name: 'Fraction', code: '\\frac{}{}', tags: ['fraction', 'division'] },
                { name: 'Root', code: '\\sqrt{}', tags: ['root', 'square', 'sqrt'] },
                { name: 'Power', code: '^{}', tags: ['power', 'index', 'upper'] },
                { name: 'Subscript', code: '_{}', tags: ['index', 'lower', 'subscript'] },
                { name: 'Integral', code: '\\int', tags: ['integral'] },
                { name: 'Sum', code: '\\sum_{i=1}^{n}', tags: ['sum'] },
                { name: 'Infinity', code: '\\infty', tags: ['infinity'] },
                { name: 'Multiplication', code: '\\cdot', tags: ['multiplication', 'dot'] },
                { name: 'Cross (mult.)', code: '\\times', tags: ['multiplication', 'cross', 'times'] },
                { name: 'Less or equal', code: '\\le', tags: ['less', 'equal', 'le', 'leq'] },
                { name: 'Greater or equal', code: '\\ge', tags: ['greater', 'equal', 'ge', 'geq'] },
                { name: 'Not equal', code: '\\neq', tags: ['not equal', 'neq'] },
                { name: 'Approximately', code: '\\approx', tags: ['approximately', 'approx'] },
                { name: 'Belongs', code: '\\in', tags: ['belongs', 'in'] },
                { name: 'Alpha', code: '\\alpha', tags: ['alpha', 'letter'] },
                { name: 'Beta', code: '\\beta', tags: ['beta', 'letter'] },
                { name: 'Gamma', code: '\\gamma', tags: ['gamma', 'letter'] },
                { name: 'Delta', code: '\\delta', tags: ['delta', 'letter'] },
                { name: 'Pi', code: '\\pi', tags: ['pi', 'letter'] },
                { name: 'Left arrow', code: '\\leftarrow', tags: ['arrow', 'left'] },
                { name: 'Right arrow', code: '\\rightarrow', tags: ['arrow', 'right'] }
            ];

            const renderSymbols = (query = '') => {
                symbolsGrid.innerHTML = '';
                const q = query.toLowerCase().trim();
                const filtered = commonSymbols.filter(s => 
                    s.name.toLowerCase().includes(q) || 
                    s.code.toLowerCase().includes(q) ||
                    s.tags.some(t => t.includes(q))
                );

                if (filtered.length === 0) {
                    symbolsGrid.innerHTML = '<div style="font-size:0.8rem; color:#64748b; padding:8px; grid-column: 1 / -1; text-align:center;">Nothing found</div>';
                    return;
                }

                filtered.forEach(sym => {
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'btn btn-sm btn-secondary';
                    btn.style.cssText = 'background: white; border: 1px solid #cbd5e1; border-radius: 4px; padding: 4px; font-size: 0.8rem; cursor: pointer; text-align: left; display: flex; flex-direction: column; gap: 2px; transition: all 0.2s;';
                    btn.innerHTML = `<span style="font-weight: 600; color: #334155;">${sym.name}</span><span style="font-family: monospace; color: #64748b; font-size: 0.75rem;">${sym.code}</span>`;
                    
                    btn.onmouseover = () => btn.style.borderColor = '#6366f1';
                    btn.onmouseout = () => btn.style.borderColor = '#cbd5e1';
                    
                    btn.onclick = (e) => {
                        e.preventDefault();
                        const start = input.selectionStart;
                        const end = input.selectionEnd;
                        const val = input.value;
                        input.value = val.substring(0, start) + sym.code + val.substring(end);
                        // Move cursor inside brackets if present
                        let cursorOffset = sym.code.length;
                        if (sym.code.includes('{}')) cursorOffset = sym.code.indexOf('{}') + 1;
                        else if (sym.code.includes('\\right)')) cursorOffset = sym.code.indexOf('\\right)') - 1;
                        
                        input.focus();
                        input.setSelectionRange(start + cursorOffset, start + cursorOffset);
                    };
                    symbolsGrid.appendChild(btn);
                });
            };

            searchInput.addEventListener('input', (e) => renderSymbols(e.target.value));
            renderSymbols();

            const aiBar = document.createElement('div');
            aiBar.style.cssText = 'background: linear-gradient(135deg, #1e293b 0%, #334155 100%); padding: 14px 16px; border-radius: 12px; border: 1px solid rgba(139, 92, 246, 0.3); box-shadow: 0 4px 15px rgba(15, 23, 42, 0.15); margin-bottom: 6px; display: flex; flex-direction: column; gap: 10px;';
            
            const headerRow = document.createElement('div');
            headerRow.style.cssText = 'display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 4px;';
            
            const aiTitle = document.createElement('div');
            aiTitle.style.cssText = 'display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 0.95rem; background: linear-gradient(90deg, #c084fc, #f472b6); -webkit-background-clip: text; -webkit-text-fill-color: transparent;';
            aiTitle.innerHTML = '<span style="-webkit-text-fill-color: initial; font-size: 1.1rem;">✨</span> ИИ-ассистент формул';

            const aiSubtitle = document.createElement('span');
            aiSubtitle.innerText = 'Редактируйте формулы голосом или текстом';
            aiSubtitle.style.cssText = 'font-size: 0.75rem; color: #94a3b8; font-weight: 400;';

            headerRow.appendChild(aiTitle);
            headerRow.appendChild(aiSubtitle);

            const btnRow = document.createElement('div');
            btnRow.style.cssText = 'display: flex; gap: 10px; flex-wrap: wrap;';

            const btnAiText = document.createElement('button');
            btnAiText.type = 'button';
            btnAiText.innerHTML = '✍️ Изменить текстом';
            btnAiText.style.cssText = 'flex: 1; min-width: 140px; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 8px; padding: 8px 12px; font-size: 0.85rem; cursor: pointer; transition: all 0.2s ease; color: #f8fafc; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 6px;';
            btnAiText.onmouseover = () => { btnAiText.style.background = 'rgba(255, 255, 255, 0.15)'; btnAiText.style.borderColor = '#c084fc'; };
            btnAiText.onmouseout = () => { btnAiText.style.background = 'rgba(255, 255, 255, 0.08)'; btnAiText.style.borderColor = 'rgba(255, 255, 255, 0.15)'; };

            const btnAiVoice = document.createElement('button');
            btnAiVoice.type = 'button';
            btnAiVoice.innerHTML = '🎙 Изменить голосом';
            btnAiVoice.style.cssText = 'flex: 1; min-width: 140px; background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); border: none; border-radius: 8px; padding: 8px 12px; font-size: 0.85rem; cursor: pointer; transition: all 0.2s ease; color: #ffffff; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 2px 10px rgba(168, 85, 247, 0.25);';
            btnAiVoice.onmouseover = () => { btnAiVoice.style.boxShadow = '0 4px 15px rgba(168, 85, 247, 0.4)'; };
            btnAiVoice.onmouseout = () => { btnAiVoice.style.boxShadow = '0 2px 10px rgba(168, 85, 247, 0.25)'; };

            btnRow.appendChild(btnAiText);
            btnRow.appendChild(btnAiVoice);

            const statusSpan = document.createElement('div');
            statusSpan.style.cssText = 'font-size: 0.8rem; color: #cbd5e1; font-style: italic; width: 100%; min-height: 18px; display: flex; align-items: center; justify-content: center; text-align: center;';

            btnAiText.onclick = async (e) => {
                e.preventDefault();
                const instruction = prompt('Опишите, как изменить формулу (например: "добавить над суммой фигурную скобку и подпись N"):');
                if (!instruction || !instruction.trim()) return;

                statusSpan.innerHTML = '⏳ ИИ переделывает формулу...';
                statusSpan.style.color = '#94a3b8';
                btnAiText.disabled = true;
                btnAiVoice.disabled = true;

                try {
                    const res = await fetch('/api/ai/dialectics/edit-math', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ current_latex: input.value, instruction: instruction.trim() })
                    });
                    if (!res.ok) throw new Error(await res.text());
                    const data = await res.json();
                    if (data.latex) {
                        input.value = data.latex;
                        statusSpan.innerHTML = '✅ Формула успешно обновлена!';
                        statusSpan.style.color = '#34d399';
                    }
                } catch (err) {
                    console.error(err);
                    statusSpan.innerHTML = '❌ Ошибка обновления формулы';
                    statusSpan.style.color = '#f87171';
                } finally {
                    btnAiText.disabled = false;
                    btnAiVoice.disabled = false;
                }
            };

            let mediaRecorder = null;
            let audioStream = null;
            let audioChunks = [];

            const cleanUpAudio = () => {
                if (mediaRecorder && mediaRecorder.state === 'recording') {
                    mediaRecorder.onstop = null;
                    mediaRecorder.stop();
                }
                if (audioStream) {
                    audioStream.getTracks().forEach(t => t.stop());
                }
            };

            btnAiVoice.onclick = async (e) => {
                e.preventDefault();
                if (mediaRecorder && mediaRecorder.state === 'recording') {
                    mediaRecorder.stop();
                    return;
                }

                try {
                    audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    mediaRecorder = new MediaRecorder(audioStream);
                    audioChunks = [];

                    mediaRecorder.ondataavailable = event => audioChunks.push(event.data);
                    mediaRecorder.onstop = async () => {
                        if (audioStream) audioStream.getTracks().forEach(t => t.stop());
                        btnAiVoice.innerHTML = '⏳ Обработка ИИ...';
                        btnAiVoice.style.background = 'rgba(255, 255, 255, 0.15)';
                        btnAiVoice.style.color = '#ffffff';
                        statusSpan.innerHTML = '⏳ ИИ распознает речь и меняет формулу...';
                        statusSpan.style.color = '#94a3b8';
                        btnAiText.disabled = true;
                        btnAiVoice.disabled = true;

                        const blob = new Blob(audioChunks, { type: 'audio/webm' });
                        const formData = new FormData();
                        formData.append('current_latex', input.value);
                        formData.append('file', blob, 'edit-voice-math.webm');

                        try {
                            const res = await fetch('/api/ai/dialectics/edit-voice-math', {
                                method: 'POST',
                                body: formData
                            });
                            if (!res.ok) throw new Error(await res.text());
                            const data = await res.json();
                            if (data.latex) {
                                input.value = data.latex;
                                statusSpan.innerHTML = `✅ Голос распознан: "${data.transcribed_text}"`;
                                statusSpan.style.color = '#34d399';
                            }
                        } catch (err) {
                            console.error(err);
                            statusSpan.innerHTML = '❌ Ошибка обработки голоса';
                            statusSpan.style.color = '#f87171';
                        } finally {
                            btnAiText.disabled = false;
                            btnAiVoice.disabled = false;
                            btnAiVoice.innerHTML = '🎙 Изменить голосом';
                            btnAiVoice.style.background = 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)';
                        }
                    };

                    mediaRecorder.start();
                    btnAiVoice.innerHTML = '🔴 Остановить запись';
                    btnAiVoice.style.background = 'linear-gradient(135deg, #ef4444 0%, #f43f5e 100%)';
                    statusSpan.innerHTML = '🎙 Говорите инструкцию по изменению формулы...';
                    statusSpan.style.color = '#f87171';
                } catch (err) {
                    console.error(err);
                    statusSpan.innerHTML = '❌ Нет доступа к микрофону';
                    statusSpan.style.color = '#f87171';
                }
            };

            aiBar.appendChild(headerRow);
            aiBar.appendChild(btnRow);
            aiBar.appendChild(statusSpan);

            container.appendChild(aiBar);
            container.appendChild(inputRow);
            container.appendChild(searchInput);
            container.appendChild(symbolsGrid);
            messageEl.appendChild(container);

            footerEl.innerHTML = '';
            
            const btnCancel = document.createElement('button');
            btnCancel.className = 'btn btn-secondary';
            btnCancel.innerText = cancelLabel;
            btnCancel.onclick = (e) => {
                e.stopPropagation();
                cleanUpAudio();
                modal.classList.remove('active');
                    setTimeout(() => { modal.style.display = 'none'; }, 200);
                resolve(null);
            };

            const btnOk = document.createElement('button');
            btnOk.className = 'btn btn-primary';
            btnOk.innerText = okLabel;
            
            const submit = () => {
                cleanUpAudio();
                modal.classList.remove('active');
                    setTimeout(() => { modal.style.display = 'none'; }, 200);
                resolve(input.value);
            };

            btnOk.onclick = (e) => {
                e.stopPropagation();
                submit();
            };

            input.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    submit();
                } else if (e.key === 'Escape') {
                    modal.classList.remove('active');
                    setTimeout(() => { modal.style.display = 'none'; }, 200);
                    resolve(null);
                }
            };

            footerEl.appendChild(btnCancel);
            footerEl.appendChild(btnOk);

            modal.style.display = 'flex';
            modal.offsetHeight;
            modal.classList.add('active');
            setTimeout(() => input.focus(), 100);
        } catch (err) {
            console.error("[customLatexPrompt] Error:", err);
            resolve(prompt(title, value));
        }
    });
}

