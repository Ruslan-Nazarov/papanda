/**
 * Centralized Modal Controller - Premium Edition
 * Handles generic confirmation and choice dialogs across the application.
 */

export function customConfirm({ title = 'Confirmation', message = 'Are you sure?', icon = '', buttons = [] }) {
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

            if (buttons.length === 0) {
                buttons = [
                    { label: 'Cancel', value: false, class: 'confirm-btn-secondary' },
                    { label: 'OK', value: true, class: 'confirm-btn-primary' }
                ];
            }

            buttons.forEach(btn => {
                const button = document.createElement('button');
                button.innerText = btn.label;
                button.className = 'btn ' + (btn.class || 'confirm-btn-secondary');
                

                button.onclick = (e) => {
                    e.stopPropagation();
                    modal.style.display = 'none';
                    resolve(btn.value);
                };
                footerEl.appendChild(button);
            });

            modal.style.display = 'flex';
        } catch (err) {
            console.error("[customConfirm] Error:", err);
            resolve(confirm(message)); 
        }
    });
}

export function customChoice({ title = 'Select Option', messageHTML = '', options = [], okLabel = 'Confirm', cancelLabel = 'Cancel' }) {
    return new Promise((resolve) => {
        try {
            const modal = document.getElementById('customConfirmModal');
            const titleEl = document.getElementById('confirmModalTitle');
            const messageEl = document.getElementById('confirmModalMessage');
            const footerEl = document.getElementById('confirmModalFooter');

            if (!modal || !titleEl || !messageEl || !footerEl) {
                resolve(null);
                return;
            }

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
            const btnCancel = document.createElement('button');
            btnCancel.className = 'btn btn-secondary';
            btnCancel.innerText = cancelLabel;
            btnCancel.onclick = (e) => {
                e.stopPropagation();
                modal.style.display = 'none';
                resolve(null);
            };

            const btnOk = document.createElement('button');
            btnOk.className = 'btn btn-primary';
            btnOk.innerText = okLabel;
            btnOk.onclick = (e) => {
                e.stopPropagation();
                const selected = document.querySelector('input[name="customChoiceRadio"]:checked');
                modal.style.display = 'none';
                resolve(selected ? selected.value : null);
            };
            
            footerEl.appendChild(btnCancel);
            footerEl.appendChild(btnOk);

            modal.style.display = 'flex';
        } catch (err) {
            console.error(err);
            resolve(null);
        }
    });
}

export function customPrompt({ title = 'Input Required', message = '', value = '', placeholder = '', okLabel = 'OK', cancelLabel = 'Cancel' }) {
    return new Promise((resolve) => {
        try {
            const modal = document.getElementById('customConfirmModal');
            const titleEl = document.getElementById('confirmModalTitle');
            const messageEl = document.getElementById('confirmModalMessage');
            const footerEl = document.getElementById('confirmModalFooter');

            if (!modal || !titleEl || !messageEl || !footerEl) {
                console.warn("[customPrompt] UI elements missing, falling back to native.");
                resolve(prompt(message, value));
                return;
            }

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
            messageEl.appendChild(container);

            footerEl.innerHTML = '';
            
            const btnCancel = document.createElement('button');
            btnCancel.className = 'btn btn-secondary';
            btnCancel.innerText = cancelLabel;
            btnCancel.onclick = (e) => {
                e.stopPropagation();
                modal.style.display = 'none';
                resolve(null);
            };

            const btnOk = document.createElement('button');
            btnOk.className = 'btn btn-primary';
            btnOk.innerText = okLabel;
            
            const submit = () => {
                modal.style.display = 'none';
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
                    modal.style.display = 'none';
                    resolve(null);
                }
            };

            footerEl.appendChild(btnCancel);
            footerEl.appendChild(btnOk);

            modal.style.display = 'flex';
            setTimeout(() => input.focus(), 100);
        } catch (err) {
            console.error("[customPrompt] Error:", err);
            resolve(prompt(message, value));
        }
    });
}

export function customLatexPrompt({ title = 'Редактировать формулу (LaTeX)', value = '', okLabel = 'Сохранить', cancelLabel = 'Отмена' }) {
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

            titleEl.innerText = title;
            messageEl.innerHTML = '';

            const container = document.createElement('div');
            container.className = 'latex-prompt-container';
            container.style.textAlign = 'left';
            container.style.display = 'flex';
            container.style.flexDirection = 'column';
            container.style.gap = '10px';

            const input = document.createElement('input');
            input.type = 'text';
            input.value = value;
            input.className = 'form-input-premium';
            input.style.width = '100%';
            input.style.fontFamily = 'monospace';

            const searchInput = document.createElement('input');
            searchInput.type = 'text';
            searchInput.placeholder = '🔍 Поиск символа (например: дробь, интеграл, альфа)...';
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
                { name: 'Дробь', code: '\\frac{}{}', tags: ['дробь', 'деление', 'fraction'] },
                { name: 'Корень', code: '\\sqrt{}', tags: ['корень', 'квадратный', 'root', 'sqrt'] },
                { name: 'Степень', code: '^{}', tags: ['степень', 'индекс', 'верхний', 'power'] },
                { name: 'Нижний индекс', code: '_{}', tags: ['индекс', 'нижний', 'subscript'] },
                { name: 'Интеграл', code: '\\int', tags: ['интеграл', 'integral'] },
                { name: 'Сумма', code: '\\sum_{i=1}^{n}', tags: ['сумма', 'sum'] },
                { name: 'Бесконечность', code: '\\infty', tags: ['бесконечность', 'infinity'] },
                { name: 'Умножение', code: '\\cdot', tags: ['умножение', 'точка', 'dot'] },
                { name: 'Крест (умн.)', code: '\\times', tags: ['умножение', 'крест', 'times'] },
                { name: 'Меньше или равно', code: '\\le', tags: ['меньше', 'равно', 'le', 'leq'] },
                { name: 'Больше или равно', code: '\\ge', tags: ['больше', 'равно', 'ge', 'geq'] },
                { name: 'Не равно', code: '\\neq', tags: ['не равно', 'neq'] },
                { name: 'Приблизительно', code: '\\approx', tags: ['приблизительно', 'approx'] },
                { name: 'Принадлежит', code: '\\in', tags: ['принадлежит', 'in'] },
                { name: 'Альфа', code: '\\alpha', tags: ['альфа', 'alpha', 'буква'] },
                { name: 'Бета', code: '\\beta', tags: ['бета', 'beta', 'буква'] },
                { name: 'Пи', code: '\\pi', tags: ['пи', 'pi', 'буква'] },
                { name: 'Большие скобки', code: '\\left( \\right)', tags: ['скобки', 'круглые'] }
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
                    symbolsGrid.innerHTML = '<div style="font-size:0.8rem; color:#64748b; padding:8px; grid-column: 1 / -1; text-align:center;">Ничего не найдено</div>';
                    return;
                }

                filtered.forEach(sym => {
                    const btn = document.createElement('button');
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

            container.appendChild(input);
            container.appendChild(searchInput);
            container.appendChild(symbolsGrid);
            messageEl.appendChild(container);

            footerEl.innerHTML = '';
            
            const btnCancel = document.createElement('button');
            btnCancel.className = 'btn btn-secondary';
            btnCancel.innerText = cancelLabel;
            btnCancel.onclick = (e) => {
                e.stopPropagation();
                modal.style.display = 'none';
                resolve(null);
            };

            const btnOk = document.createElement('button');
            btnOk.className = 'btn btn-primary';
            btnOk.innerText = okLabel;
            
            const submit = () => {
                modal.style.display = 'none';
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
                    modal.style.display = 'none';
                    resolve(null);
                }
            };

            footerEl.appendChild(btnCancel);
            footerEl.appendChild(btnOk);

            modal.style.display = 'flex';
            setTimeout(() => input.focus(), 100);
        } catch (err) {
            console.error("[customLatexPrompt] Error:", err);
            resolve(prompt(title, value));
        }
    });
}

