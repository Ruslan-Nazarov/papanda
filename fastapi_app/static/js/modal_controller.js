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
