import AppState from './AppState.js';

import { t } from '../i18n.js';
class SearchManager {
    static init() {
        const btn = document.getElementById('btn-search');
        const menu = document.getElementById('search-dropdown-menu');

        if (btn && menu) {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isHidden = menu.classList.contains('hidden');
                document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.add('hidden'));
                if (isHidden) {
                    this.render();
                    menu.classList.remove('hidden');
                    const input = menu.querySelector('#note-search-input');
                    if (input) {
                        input.focus();
                        input.select();
                    }
                }
            });

            document.addEventListener('click', (e) => {
                if (!e.target.closest('#btn-search') && !e.target.closest('#search-dropdown-menu')) {
                    menu.classList.add('hidden');
                }
            });
        }
    }

    static render() {
        const menu = document.getElementById('search-dropdown-menu');
        if (!menu) return;

        menu.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <div style="display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 1.05rem; color: #1e293b;">
                    <span style="font-size: 1.15rem;">🔍</span>
                    <span>${t('search_panel_title')}</span>
                </div>
                <button class="btn-close-search" style="background: none; border: none; font-size: 1.1rem; color: #94a3b8; cursor: pointer; padding: 2px 6px; border-radius: 4px; line-height: 1;" title="${t('close_word')}">✕</button>
            </div>
            <div style="margin-bottom: 12px;">
                <input type="text" id="note-search-input" placeholder="${t('search_input_ph')}" style="width: 100%; box-sizing: border-box; padding: 9px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.95rem; outline: none; transition: border-color 0.2s, box-shadow 0.2s; font-family: inherit;">
            </div>
            <div id="note-search-results" style="max-height: 320px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px;">
                <div class="search-empty-state" style="padding: 20px 8px 14px; text-align: center; color: #64748b; font-size: 0.9rem;">${t('search_hint')}</div>
            </div>
        `;

        const closeBtn = menu.querySelector('.btn-close-search');
        closeBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.classList.add('hidden');
        });

        const input = menu.querySelector('#note-search-input');
        const resultsContainer = menu.querySelector('#note-search-results');

        if (input && resultsContainer) {
            input.addEventListener('focus', () => {
                input.style.borderColor = '#3b82f6';
                input.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.15)';
            });
            input.addEventListener('blur', () => {
                input.style.borderColor = '#cbd5e1';
                input.style.boxShadow = 'none';
            });

            input.addEventListener('input', () => {
                const query = input.value.trim();
                this.performSearch(query, resultsContainer);
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    menu.classList.add('hidden');
                } else if (e.key === 'Enter') {
                    const firstResult = resultsContainer.querySelector('.search-result-item');
                    if (firstResult) {
                        firstResult.click();
                    }
                }
            });
        }
    }

    static performSearch(query, container) {
        if (!query) {
            container.innerHTML = `<div class="search-empty-state" style="padding: 20px 8px 14px; text-align: center; color: #64748b; font-size: 0.9rem;">${t('search_hint')}</div>`;
            return;
        }

        const blocks = AppState.currentNote.blocks || [];
        const lowerQuery = query.toLowerCase();
        const matches = [];

        blocks.forEach((b, index) => {
            const rawTitle = b.title || t('hint_anchor_title');
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = b.html || '';
            const plainText = tempDiv.textContent || tempDiv.innerText || '';

            const titleMatch = rawTitle.toLowerCase().includes(lowerQuery);
            const textMatch = plainText.toLowerCase().includes(lowerQuery);

            if (titleMatch || textMatch) {
                let snippet = '';
                if (textMatch) {
                    const idx = plainText.toLowerCase().indexOf(lowerQuery);
                    const start = Math.max(0, idx - 30);
                    const end = Math.min(plainText.length, idx + lowerQuery.length + 40);
                    const prefix = start > 0 ? '...' : '';
                    const suffix = end < plainText.length ? '...' : '';
                    snippet = prefix + this.escapeHtml(plainText.substring(start, end)) + suffix;
                    const regex = new RegExp(`(${this.escapeRegex(query)})`, 'gi');
                    snippet = snippet.replace(regex, `<mark style="background: #fef08a; padding: 1px 3px; border-radius: 3px; font-weight: 600; color: #1e293b;">$1</mark>`);
                } else {
                    snippet = this.escapeHtml(plainText.substring(0, 70)) + (plainText.length > 70 ? '...' : '');
                }

                let highlightedTitle = this.escapeHtml(rawTitle);
                if (titleMatch) {
                    const regex = new RegExp(`(${this.escapeRegex(query)})`, 'gi');
                    highlightedTitle = highlightedTitle.replace(regex, `<mark style="background: #fef08a; padding: 1px 3px; border-radius: 3px; font-weight: 600; color: #1e293b;">$1</mark>`);
                }

                matches.push({
                    id: b.id,
                    index: index + 1,
                    title: highlightedTitle,
                    snippet
                });
            }
        });

        if (matches.length === 0) {
            container.innerHTML = `<div class="search-empty-state" style="padding: 20px 8px 14px; text-align: center; color: #94a3b8; font-size: 0.9rem;">${t('search_nothing')}</div>`;
            return;
        }

        container.innerHTML = `
            <div style="font-size: 0.8rem; font-weight: 600; color: #64748b; margin-bottom: 4px; padding-left: 2px;">
                ${t('search_found')}: ${matches.length}
            </div>
            ${matches.map(m => `
                <div class="search-result-item" data-id="${m.id}" style="padding: 8px 10px; border-radius: 8px; border: 1px solid #f1f5f9; background: #f8fafc; cursor: pointer; transition: all 0.15s ease; display: flex; flex-direction: column; gap: 4px;">
                    <div style="display: flex; align-items: center; gap: 6px; font-weight: 600; font-size: 0.9rem; color: #1e293b;">
                        <span style="color: #ea580c; font-size: 0.8rem;">▪</span>
                        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${m.title}</span>
                    </div>
                    ${m.snippet ? `<div style="font-size: 0.82rem; color: #64748b; line-height: 1.4; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${m.snippet}</div>` : ''}
                </div>
            `).join('')}
        `;

        container.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('mouseenter', () => {
                item.style.background = '#e2e8f0';
                item.style.borderColor = '#cbd5e1';
            });
            item.addEventListener('mouseleave', () => {
                item.style.background = '#f8fafc';
                item.style.borderColor = '#f1f5f9';
            });
            item.addEventListener('click', () => {
                const blockId = item.dataset.id;
                const targetEl = document.querySelector(`.dialectics-block[data-id="${blockId}"]`);
                if (targetEl) {
                    targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    targetEl.style.transition = 'box-shadow 0.3s ease, transform 0.2s ease';
                    targetEl.style.boxShadow = '0 0 0 3px #ea580c, 0 10px 25px rgba(234, 88, 12, 0.2)';
                    targetEl.style.transform = 'scale(1.01)';
                    setTimeout(() => {
                        targetEl.style.boxShadow = '';
                        targetEl.style.transform = '';
                    }, 2000);
                }
            });
        });
    }

    static escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    static escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}

export default SearchManager;
