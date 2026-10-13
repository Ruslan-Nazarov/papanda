import AppState from './AppState.js';
import HtmlSafety from './HtmlSafety.js';
import { showToast } from './ToastService.js';

import { t } from '../i18n.js';
// Sticker color palette
const STICKER_COLORS = [
    { color: '#fef9c3', label: t('stk_yellow') },
    { color: '#fce7f3', label: t('stk_pink') },
    { color: '#dbeafe', label: t('stk_blue') },
    { color: '#dcfce7', label: t('stk_green') },
    { color: '#ede9fe', label: t('stk_purple') },
    { color: '#fed7aa', label: t('stk_orange') },
    { color: '#ccfbf1', label: t('stk_teal') },
    { color: '#f1f5f9', label: t('stk_gray') },
];

function formatDate(iso) {
    if (!iso) return '';
    let s = String(iso).trim();
    if (!s.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(s)) {
        s = s.replace(' ', 'T') + 'Z';
    }
    const d = new Date(s);
    if (isNaN(d.getTime())) return String(iso);
    return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getFullYear()).slice(-2)}`;
}

class BlockStickersManager {
    static init() {
        const btn = document.getElementById('btn-note-stickers');
        const menu = document.getElementById('note-stickers-dropdown-menu');

        if (btn && menu) {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isHidden = menu.classList.contains('hidden');
                document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.add('hidden'));
                if (isHidden) {
                    this.renderNoteStickersInDropdown();
                    menu.classList.remove('hidden');
                    this._positionNoteMenu(menu);
                }
            });

            document.addEventListener('click', (e) => {
                if (!e.target.closest('#btn-note-stickers') && !e.target.closest('#note-stickers-dropdown-menu')) {
                    menu.classList.add('hidden');
                }
                // Close any open block-level sticker panel on outside click
                if (!e.target.closest('.sticker-panel') && !e.target.closest('.btn-sticker')) {
                    document.querySelectorAll('.dialectics-block .sticker-panel').forEach(p => this._closeBlockPanel(p));
                }
            });
            window.addEventListener('resize', () => menu.classList.add('hidden'));
        }

        document.addEventListener('noteOpened', () => {
            this._updateNoteBtn();
        });

        this._updateNoteBtn();
    }

    // ── Block stickers ─────────────────────────────────────────────────────────

    static _closeBlockPanel(panel) {
        panel.closest('.dialectics-block')?.querySelector('.btn-sticker')?.setAttribute('aria-expanded', 'false');
        panel.remove();
    }

    static toggleBlockStickersPanel(block, anchorEl) {
        const panel = anchorEl.querySelector('.sticker-panel');
        if (panel) {
            this._closeBlockPanel(panel);
        } else {
            this.openBlockStickersPanel(block, anchorEl);
        }
    }

    /**
     * Open the sticker panel anchored below a block element.
     * @param {object} block  - AppState block object
     * @param {HTMLElement} anchorEl - the .dialectics-block element
     */
    static openBlockStickersPanel(block, anchorEl) {
        // Remove any existing block sticker panels
        document.querySelectorAll('.dialectics-block .sticker-panel').forEach(p => this._closeBlockPanel(p));



        const panel = this._buildPanel(
            t('stk_block_notes'),
            block.stickers || [],
            (sticker) => {
                AppState.updateBlock(block.id, {stickers: [...(block.stickers || []), sticker]});
                // Re-render panel to show new sticker
                this.openBlockStickersPanel(block, anchorEl);
                // Update badge on block
                this._updateBadge(anchorEl, block.stickers.length);
            },
            (stickerId) => {
                AppState.updateBlock(block.id, {stickers: (block.stickers || []).filter(s => s.id !== stickerId)});
                this.openBlockStickersPanel(block, anchorEl);
                this._updateBadge(anchorEl, block.stickers.length);
            },
            () => this._closeBlockPanel(panel),
            (sticker) => {
                AppState.updateBlock(block.id, {stickers: (block.stickers || []).map(s => s.id === sticker.id ? sticker : s)});
                this.openBlockStickersPanel(block, anchorEl);
            }
        );

        // Position below anchor element
        anchorEl.style.position = 'relative';
        anchorEl.appendChild(panel);
        anchorEl.querySelector('.btn-sticker')?.setAttribute('aria-expanded', 'true');
        panel.querySelector('.sticker-panel-title-input')?.focus();
    }

    /**
     * Render the sticker panel inside a specific container (e.g., modal tab).
     * @param {object} block  - AppState block object
     * @param {HTMLElement} containerEl - the container to render in
     */
    static renderBlockStickersInContainer(block, containerEl) {
        containerEl.innerHTML = '';


        const panel = this._buildPanel(
            t('stk_block_notes'),
            block.stickers || [],
            (sticker) => {
                AppState.updateBlock(block.id, {stickers: [...(block.stickers || []), sticker]});
                this.renderBlockStickersInContainer(block, containerEl);
                const blockEl = document.querySelector(`.dialectics-block[data-id="${block.id}"]`);
                if (blockEl) this._updateBadge(blockEl, block.stickers.length);
            },
            (stickerId) => {
                AppState.updateBlock(block.id, {stickers: (block.stickers || []).filter(s => s.id !== stickerId)});
                this.renderBlockStickersInContainer(block, containerEl);
                const blockEl = document.querySelector(`.dialectics-block[data-id="${block.id}"]`);
                if (blockEl) this._updateBadge(blockEl, block.stickers.length);
            },
            () => {},
            (sticker) => {
                AppState.updateBlock(block.id, {stickers: (block.stickers || []).map(s => s.id === sticker.id ? sticker : s)});
                this.renderBlockStickersInContainer(block, containerEl);
            }
        );
        
        // Remove close button as it is in a tab
        const closeBtn = panel.querySelector('.sticker-panel-close');
        if (closeBtn) closeBtn.remove();
        
        panel.style.boxShadow = 'none';
        panel.style.border = 'none';
        panel.style.marginTop = '0';
        
        containerEl.appendChild(panel);
    }

    static _updateBadge(blockEl, count) {
        const button = blockEl.querySelector('.btn-sticker');
        if (!button) return;
        button.setAttribute('aria-label', `${t('tt_sticker')} (${count})`);
        let badge = button.querySelector('.sticker-badge');
        if (count > 0) {
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'sticker-badge';
                badge.setAttribute('aria-hidden', 'true');
                button.appendChild(badge);
            }
            badge.textContent = String(count);
        } else if (badge) {
            badge.remove();
        }
    }

    // ── Note stickers ──────────────────────────────────────────────────────────

    /**
     * Render note-level stickers in the dropdown anchored under the sub-bar button.
     */
    static renderNoteStickersInDropdown() {
        const menu = document.getElementById('note-stickers-dropdown-menu');
        if (!menu) return;

        menu.innerHTML = '';


        const panel = this._buildPanel(
            t('stk_note_notes'),
            AppState.currentNote.stickers || [],
            (sticker) => {
                AppState.updateNote({stickers: [...(AppState.currentNote.stickers || []), sticker]});
                this.renderNoteStickersInDropdown();
                this._updateNoteBtn();
            },
            (stickerId) => {
                AppState.updateNote({stickers: (AppState.currentNote.stickers || []).filter(s => s.id !== stickerId)});
                this.renderNoteStickersInDropdown();
                this._updateNoteBtn();
            },
            () => {
                menu.classList.add('hidden');
            },
            (sticker) => {
                AppState.updateNote({stickers: (AppState.currentNote.stickers || []).map(s => s.id === sticker.id ? sticker : s)});
                this.renderNoteStickersInDropdown();
            }
        );

        panel.classList.add('sticker-panel--note');
        panel.style.margin = '0';
        panel.style.boxShadow = 'none';
        panel.style.border = 'none';
        panel.style.borderRadius = '16px';
        menu.appendChild(panel);
        if (!menu.classList.contains('hidden')) this._positionNoteMenu(menu);
    }

    static _positionNoteMenu(menu) {
        menu.style.marginLeft = '0';
        const rect = menu.getBoundingClientRect();
        const left = Math.max(12, Math.min(rect.left, window.innerWidth - rect.width - 12));
        menu.style.marginLeft = `${left - rect.left}px`;
        menu.style.maxHeight = `${Math.max(120, window.innerHeight - rect.top - 12)}px`;
    }

    /**
     * Open the note-level stickers panel in its dropdown.
     */
    static openNoteStickersPanel() {
        const menu = document.getElementById('note-stickers-dropdown-menu');
        if (!menu) return;
        document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.add('hidden'));
        this.renderNoteStickersInDropdown();
        menu.classList.remove('hidden');
        this._positionNoteMenu(menu);
    }

    static _updateNoteBtn() {
        const btn = document.getElementById('btn-note-stickers');
        if (!btn) return;
        const count = AppState.currentNote.stickers?.length || 0;
        btn.innerHTML = count > 0 
            ? `<span class="sub-icon" style="color: #eab308;">🟨</span> ${t('stk_bar_title')} <span class="sticker-sub-badge" style="background: #fef08a; color: #854d0e; font-size: 0.75rem; font-weight: 700; padding: 1px 6px; border-radius: 10px; margin-left: 2px;">${count}</span>`
            : `<span class="sub-icon" style="color: #eab308;">🟨</span> ${t('stk_bar_title')}`;
    }

    // ── Shared panel builder ───────────────────────────────────────────────────

    static _buildPanel(title, stickers, onAdd, onDelete, onClose, onUpdate) {
        let selectedColor = STICKER_COLORS[0].color;
        let editingId = null;

        const panel = document.createElement('div');
        panel.className = 'sticker-panel';
        panel.addEventListener('click', e => e.stopPropagation());

        panel.innerHTML = `
            <div class="sticker-panel-header">
                <span>🟨 ${title}</span>
                <button class="sticker-panel-close" title="${t('close_word')}">✕</button>
            </div>
            <div class="sticker-panel-form">
                <input type="text" class="sticker-panel-title-input" placeholder="${t('stk_title_ph')}" maxlength="60">
                <textarea class="sticker-panel-text-input" placeholder="${t('stk_text_ph')}" rows="4"></textarea>
                <div class="sticker-color-picker">
                    ${STICKER_COLORS.map((c, i) => `
                        <button class="sticker-color-btn ${i === 0 ? 'selected' : ''}"
                            style="background: ${c.color};"
                            data-color="${c.color}"
                            title="${c.label}"></button>
                    `).join('')}
                    <button class="sticker-cancel-btn" type="button" hidden>${t('cancel')}</button>
                    <button class="sticker-add-btn" type="button">OK</button>
                </div>
            </div>
            <div class="sticker-panel-list">
                ${this._renderStickerGrid(stickers)}
            </div>
        `;

        const form = panel.querySelector('.sticker-panel-form');
        const titleInput = panel.querySelector('.sticker-panel-title-input');
        const textInput = panel.querySelector('.sticker-panel-text-input');
        const saveButton = panel.querySelector('.sticker-add-btn');
        const cancelButton = panel.querySelector('.sticker-cancel-btn');
        const selectColor = color => {
            selectedColor = color;
            panel.querySelectorAll('.sticker-color-btn').forEach(btn =>
                btn.classList.toggle('selected', btn.dataset.color === color));
            form.style.background = color;
        };
        const resetForm = () => {
            editingId = null;
            titleInput.value = '';
            textInput.value = '';
            selectColor(STICKER_COLORS[0].color);
            form.style.removeProperty('background');
            saveButton.textContent = 'OK';
            cancelButton.hidden = true;
            panel.querySelectorAll('.sticker-card').forEach(card => card.classList.remove('is-editing'));
        };

        // Color picker
        panel.querySelectorAll('.sticker-color-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                selectColor(btn.dataset.color);
            });
        });

        panel.querySelectorAll('.sticker-edit-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const sticker = stickers.find(s => s.id === btn.dataset.id);
                if (!sticker) return;
                editingId = sticker.id;
                titleInput.value = sticker.title || '';
                textInput.value = sticker.text || '';
                selectColor(sticker.color || STICKER_COLORS[0].color);
                saveButton.textContent = t('save');
                cancelButton.hidden = false;
                panel.querySelectorAll('.sticker-card').forEach(card =>
                    card.classList.toggle('is-editing', card.contains(btn)));
                titleInput.focus();
            });
        });
        cancelButton.addEventListener('click', resetForm);

        panel.querySelectorAll('.sticker-copy-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const sticker = stickers.find(s => s.id === btn.dataset.id);
                if (!sticker) return;
                const content = [sticker.title?.trim(), sticker.text?.trim()].filter(Boolean).join('\n\n');
                try {
                    if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
                    await navigator.clipboard.writeText(content);
                } catch {
                    const input = document.createElement('textarea');
                    input.value = content;
                    input.style.position = 'fixed';
                    input.style.opacity = '0';
                    document.body.appendChild(input);
                    let copied;
                    try {
                        input.select();
                        copied = document.execCommand('copy');
                    } catch {
                        copied = false;
                    } finally {
                        input.remove();
                    }
                    if (!copied) { showToast(t('stk_copy_failed'), 'error'); return; }
                }
                showToast(t('stk_copied'));
            });
        });

        // Add or update sticker
        saveButton.addEventListener('click', () => {
            const text = textInput.value.trim();
            if (!text) return;
            if (editingId) {
                const original = stickers.find(s => s.id === editingId);
                if (original) onUpdate({...original, title: titleInput.value.trim(), text, color: selectedColor});
                return;
            }
            const sticker = {
                id: 'st-' + Math.random().toString(36).slice(2, 9),
                title: titleInput.value.trim(),
                text,
                color: selectedColor,
                created_at: new Date().toISOString()
            };
            onAdd(sticker);
        });

        // Close
        panel.querySelector('.sticker-panel-close').addEventListener('click', () => {
            if (onClose) onClose();
            else panel.remove();
        });

        // Delete existing stickers
        panel.querySelectorAll('.sticker-delete-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (editingId === btn.dataset.id) resetForm();
                onDelete(btn.dataset.id);
            });
        });

        return panel;
    }

    static _renderStickerGrid(stickers) {
        if (!stickers || stickers.length === 0) return `<p class="sticker-empty" style="text-align: center; color: #94a3b8; font-size: 0.9rem; padding: 12px 0;">${t('stk_empty')}</p>`;
        return `<div class="sticker-grid">${stickers.map(s => `
            <div class="sticker-card" style="background: ${/^#[0-9a-fA-F]{6}$/.test(s.color) ? s.color : '#fef9c3'}">
                ${s.title ? `<div class="sticker-card-title">${HtmlSafety.escape(s.title)}</div>` : ''}
                <div class="sticker-card-text">${HtmlSafety.escape(s.text)}</div>
                <div class="sticker-card-footer">
                    <span class="sticker-card-date">${HtmlSafety.escape(formatDate(s.created_at))}</span>
                    <span class="sticker-card-actions">
                        <button class="sticker-copy-btn" type="button" data-id="${HtmlSafety.escape(s.id)}" title="${t('stk_copy')}" aria-label="${t('stk_copy')}">⧉</button>
                        <button class="sticker-edit-btn" type="button" data-id="${HtmlSafety.escape(s.id)}" title="${t('tt_edit')}" aria-label="${t('tt_edit')}">✎</button>
                        <button class="sticker-delete-btn" type="button" data-id="${HtmlSafety.escape(s.id)}" title="${t('tt_delete')}" aria-label="${t('tt_delete')}">✕</button>
                    </span>
                </div>
            </div>
        `).join('')}</div>`;
    }
}

export default BlockStickersManager;
