import AppState from './AppState.js';

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
                }
            });

            document.addEventListener('click', (e) => {
                if (!e.target.closest('#btn-note-stickers') && !e.target.closest('#note-stickers-dropdown-menu')) {
                    menu.classList.add('hidden');
                }
                // Close any open block-level sticker panel on outside click
                if (!e.target.closest('.sticker-panel') && !e.target.closest('.btn-sticker')) {
                    document.querySelectorAll('.dialectics-block .sticker-panel').forEach(p => p.remove());
                }
            });
        }

        document.addEventListener('noteLoaded', () => {
            this._updateNoteBtn();
        });

        this._updateNoteBtn();
    }

    // ── Block stickers ─────────────────────────────────────────────────────────

    /**
     * Open the sticker panel anchored below a block element.
     * @param {object} block  - AppState block object
     * @param {HTMLElement} anchorEl - the .dialectics-block element
     */
    static openBlockStickersPanel(block, anchorEl) {
        // Remove any existing block sticker panels
        document.querySelectorAll('.dialectics-block .sticker-panel').forEach(p => p.remove());

        if (!block.stickers) block.stickers = [];

        const panel = this._buildPanel(
            t('stk_block_notes'),
            block.stickers,
            (sticker) => {
                block.stickers.push(sticker);
                AppState.markDirty();
                // Re-render panel to show new sticker
                this.openBlockStickersPanel(block, anchorEl);
                // Update badge on block
                this._updateBadge(anchorEl, block.stickers.length);
            },
            (stickerId) => {
                block.stickers = block.stickers.filter(s => s.id !== stickerId);
                AppState.markDirty();
                this.openBlockStickersPanel(block, anchorEl);
                this._updateBadge(anchorEl, block.stickers.length);
            },
            () => panel.remove()
        );

        // Position below anchor element
        anchorEl.style.position = 'relative';
        anchorEl.appendChild(panel);
        panel.querySelector('.sticker-panel-title-input')?.focus();
    }

    /**
     * Render the sticker panel inside a specific container (e.g., modal tab).
     * @param {object} block  - AppState block object
     * @param {HTMLElement} containerEl - the container to render in
     */
    static renderBlockStickersInContainer(block, containerEl) {
        containerEl.innerHTML = '';
        if (!block.stickers) block.stickers = [];

        const panel = this._buildPanel(
            t('stk_block_notes'),
            block.stickers,
            (sticker) => {
                block.stickers.push(sticker);
                AppState.markDirty();
                this.renderBlockStickersInContainer(block, containerEl);
                const blockEl = document.querySelector(`.dialectics-block[data-id="${block.id}"]`);
                if (blockEl) this._updateBadge(blockEl, block.stickers.length);
            },
            (stickerId) => {
                block.stickers = block.stickers.filter(s => s.id !== stickerId);
                AppState.markDirty();
                this.renderBlockStickersInContainer(block, containerEl);
                const blockEl = document.querySelector(`.dialectics-block[data-id="${block.id}"]`);
                if (blockEl) this._updateBadge(blockEl, block.stickers.length);
            },
            () => {}
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
        let badge = blockEl.querySelector('.sticker-badge');
        if (count > 0) {
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'sticker-badge';
                blockEl.querySelector('.block-header')?.appendChild(badge);
            }
            badge.textContent = `🟨 ${count}`;
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
        if (!AppState.currentNote.stickers) AppState.currentNote.stickers = [];

        const panel = this._buildPanel(
            t('stk_note_notes'),
            AppState.currentNote.stickers,
            (sticker) => {
                AppState.currentNote.stickers.push(sticker);
                AppState.markDirty();
                this.renderNoteStickersInDropdown();
                this._updateNoteBtn();
            },
            (stickerId) => {
                AppState.currentNote.stickers = AppState.currentNote.stickers.filter(s => s.id !== stickerId);
                AppState.markDirty();
                this.renderNoteStickersInDropdown();
                this._updateNoteBtn();
            },
            () => {
                menu.classList.add('hidden');
            }
        );

        panel.classList.add('sticker-panel--note');
        panel.style.margin = '0';
        panel.style.boxShadow = 'none';
        panel.style.border = 'none';
        panel.style.borderRadius = '16px';
        menu.appendChild(panel);
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

    static _buildPanel(title, stickers, onAdd, onDelete, onClose) {
        let selectedColor = STICKER_COLORS[0].color;

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
                    <button class="sticker-add-btn">OK</button>
                </div>
            </div>
            <div class="sticker-panel-list">
                ${this._renderStickerGrid(stickers)}
            </div>
        `;

        // Color picker
        panel.querySelectorAll('.sticker-color-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                panel.querySelectorAll('.sticker-color-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                selectedColor = btn.dataset.color;
                // Preview color on form
                panel.querySelector('.sticker-panel-form').style.background = selectedColor;
            });
        });

        // Add sticker
        panel.querySelector('.sticker-add-btn').addEventListener('click', () => {
            const text = panel.querySelector('.sticker-panel-text-input').value.trim();
            if (!text) return;
            const sticker = {
                id: 'st-' + Math.random().toString(36).slice(2, 9),
                title: panel.querySelector('.sticker-panel-title-input').value.trim(),
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
            btn.addEventListener('click', () => onDelete(btn.dataset.id));
        });

        return panel;
    }

    static _renderStickerGrid(stickers) {
        if (!stickers || stickers.length === 0) return `<p class="sticker-empty" style="text-align: center; color: #94a3b8; font-size: 0.9rem; padding: 12px 0;">${t('stk_empty')}</p>`;
        return `<div class="sticker-grid">${stickers.map(s => `
            <div class="sticker-card" style="background: ${s.color || '#fef9c3'}">
                ${s.title ? `<div class="sticker-card-title">${s.title}</div>` : ''}
                <div class="sticker-card-text">${s.text}</div>
                <div class="sticker-card-footer">
                    <span class="sticker-card-date">${formatDate(s.created_at)}</span>
                    <button class="sticker-delete-btn" data-id="${s.id}" title="${t('tt_delete')}">✕</button>
                </div>
            </div>
        `).join('')}</div>`;
    }
}

export default BlockStickersManager;
