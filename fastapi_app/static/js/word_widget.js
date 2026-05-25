/**
 * word_widget.js — Word learning widget modal logic for the Dashboard.
 * Extracted from dashboard_index.js (lines 266–313, 801–895).
 */

import { customConfirm } from './modal_controller.js';
import { showToast } from './ui_helpers.js';

// ─── Private helpers ─────────────────────────────────────────────────────────

function openEditModal(eng, translations, ru, meaning) {
    document.getElementById('modalWordEng').innerText = 'Edit: ' + eng;
    document.getElementById('inputWordEng').value = eng;

    const container = document.getElementById('dynamicLangsContainer');
    container.innerHTML = '';
    const activeLangs = window.P_ACTIVE_LANGUAGES || ['en', 'it', 'de'];
    const allLangNames = window.P_ALL_LANGUAGES || {};

    activeLangs.forEach(code => {
        const group = document.createElement('div');
        group.className = 'form-group';
        
        // Case-insensitive lookup
        const lookupCode = code.toLowerCase().trim();
        let val = '';
        
        // Try exact match first, then case-insensitive
        if (translations[code] !== undefined) {
            val = translations[code];
        } else {
            const foundKey = Object.keys(translations).find(k => k.toLowerCase().trim() === lookupCode);
            if (foundKey) val = translations[foundKey];
        }

        const normCode = lookupCode;
        const label = (allLangNames[code] || '').toLowerCase();
        // Fallback for English if empty
        if (!val && (normCode === 'en' || normCode === 'eng' || label.includes('english'))) val = eng;
        
        group.innerHTML = `<label class="form-label">${allLangNames[code] || code.toUpperCase()}</label>`
            + `<input type="text" name="lang_${code}" value="${(val || '').toString().replace(/"/g, '&quot;')}" class="form-input" />`;
        container.appendChild(group);
    });

    document.getElementById('inputWordRu').value = ru || '';
    document.getElementById('inputWordMeaning').value = meaning || '';
    document.getElementById('editWordModal').style.display = 'flex';
}

// ─── Public API ───────────────────────────────────────────────────────────────

window.openEditModalFromData = function (btn) {
    const d = btn.dataset;
    let translations = {};
    
    // Parse the general translations object if available
    try {
        if (d.translations) {
            translations = typeof d.translations === 'string' ? JSON.parse(d.translations) : d.translations;
        }
    } catch (e) { console.error('Translation parse error:', e); }

    // Merge in explicit data-lang-XX attributes (they take priority)
    const activeLangs = window.P_ACTIVE_LANGUAGES || ['en', 'it', 'de'];
    activeLangs.forEach(code => {
        const lowerCode = code.toLowerCase().trim();
        // Dataset attributes for data-lang-it becomes d.langIt
        const attrKey = 'lang' + lowerCode.charAt(0).toUpperCase() + lowerCode.slice(1);
        
        if (d[attrKey] !== undefined) {
            translations[code] = d[attrKey];
        }
    });

    if (!translations.en && d.eng) translations.en = d.eng;
    openEditModal(d.eng, translations, d.ru, d.meaning);
};

window.closeEditModal = function () {
    document.getElementById('editWordModal').style.display = 'none';
};

window.showAddCategory = function () {
    document.getElementById('addCategoryForm').style.display = 'block';
};
window.hideAddCategory = function () {
    document.getElementById('addCategoryForm').style.display = 'none';
};

window.markTripletLearned = async function (eng, btn) {
    const confirmed = await customConfirm({
        title: 'Mark as Learned',
        message: `Mark "${eng}" and its translations as fully learned?`,
        buttons: [
            { label: 'Cancel', value: false, class: 'confirm-btn-secondary' },
            { label: 'Mark Learned', value: true, class: 'confirm-btn-primary' }
        ]
    });
    if (!confirmed) return;
    try {
        const resp = await fetch('/mark_triplet_learned', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eng, is_learned: true })
        });
        const data = await resp.json();
        if (data.status === 'success') {
            const row = btn.closest('.word-row');
            if (row) {
                row.style.opacity = '0.3';
                // Also disable the edit button to indicate it's inactive
                const editBtn = row.querySelector('button[onclick*="openEditModalFromData"]');
                if (editBtn) editBtn.style.display = 'none';
            }
            btn.style.display = 'none';
            showToast(`"${eng}" marked as learned!`);
        } else {
            showToast('Error: ' + (data.message || 'Unknown error'), 'error');
        }
    } catch (e) { showToast('Network error', 'error'); }
};

window.refreshWords = async function () {
    try {
        const response = await fetch('/get_new_words');
        const data = await response.json();
        const container = document.getElementById('words-list');
        if (!container) return;
        container.innerHTML = '';

        const activeLangs = window.P_ACTIVE_LANGUAGES || ['en', 'it', 'de'];
        data.words.forEach(word => {
            const row = document.createElement('div');
            row.className = 'word-row';
            row.style.cssText = 'padding: 8px 12px; border-bottom: 1px solid var(--color-bg-app); transition: all 0.2s; position: relative; cursor: pointer;';
            row.onmouseover = function() { this.style.background='var(--color-bg-subtle)'; this.querySelector('.row-actions').style.opacity='1'; };
            row.onmouseout = function() { this.style.background='transparent'; this.querySelector('.row-actions').style.opacity='0'; };

            // Main Content Grid
            const grid = document.createElement('div');
            grid.style.cssText = `display: grid; grid-template-columns: repeat(${activeLangs.length}, 1fr); gap: 8px;`;

            // Foreign words
            activeLangs.forEach(lang => {
                const span = document.createElement('span');
                span.className = 'font-study';
                span.style.cssText = 'font-weight: 600; color: var(--color-text-dark); font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; align-self: flex-start;';
                span.textContent = (word.translations && word.translations[lang]) || '';
                grid.appendChild(span);
            });

            // Russian Subtext
            const subtext = document.createElement('div');
            subtext.style.cssText = 'grid-column: 1 / -1; margin-top: -2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
            const ruSpan = document.createElement('span');
            ruSpan.style.cssText = 'font-weight: 600; color: var(--color-text-faint); font-size: 0.7rem; line-height: 1.2; opacity: 0.7;';
            ruSpan.textContent = word.ru || '';
            subtext.appendChild(ruSpan);

            if (word.meaning) {
                const meanSpan = document.createElement('span');
                meanSpan.style.cssText = 'font-style: italic; color: var(--color-text-faint); font-size: 0.65rem; opacity: 0.5; margin-left: 6px;';
                meanSpan.textContent = '— ' + word.meaning;
                subtext.appendChild(meanSpan);
            }
            grid.appendChild(subtext);

            // Floating actions
            const actions = document.createElement('div');
            actions.className = 'row-actions';
            actions.style.cssText = 'position: absolute; right: 8px; top: 50%; transform: translateY(-50%); display: flex; gap: 4px; opacity: 0; transition: opacity 0.2s; background: var(--color-bg-subtle); padding: 4px; border-radius: 6px; box-shadow: -4px 0 12px var(--color-bg-subtle);';

            const editBtn = document.createElement('button');
            editBtn.className = 'btn-icon';
            editBtn.style.cssText = 'width: 22px; height: 22px; font-size: 0.65rem; border: 1px solid var(--color-border-light); border-radius: 4px; background: white;';
            editBtn.textContent = '\u270E'; // ✎
            editBtn.dataset.eng = word.eng;
            activeLangs.forEach(lang => {
                editBtn.dataset[`lang${lang.charAt(0).toUpperCase() + lang.slice(1)}`] = (word.translations && word.translations[lang]) || '';
            });
            editBtn.dataset.ru = word.ru || '';
            editBtn.dataset.meaning = word.meaning || '';
            editBtn.onclick = function() { openEditModalFromData(this); };

            const checkBtn = document.createElement('button');
            checkBtn.className = 'btn-icon';
            checkBtn.style.cssText = 'width: 22px; height: 22px; font-size: 0.65rem; border: 1px solid var(--color-border-light); border-radius: 4px; color: var(--color-success); background: white;';
            checkBtn.textContent = '\u2713'; // ✓
            const engJs = word.eng.replace(/'/g, "\\'");
            checkBtn.onclick = function() { markTripletLearned(engJs, this); };

            actions.appendChild(editBtn);
            actions.appendChild(checkBtn);

            row.appendChild(grid);
            row.appendChild(actions);

            container.appendChild(row);
        });

        const volEl = document.getElementById('volume-count');
        const covEl = document.getElementById('coverage-count');
        const imwEl = document.getElementById('imw-count');
        if (volEl) volEl.innerText = data.count;
        if (covEl) covEl.innerText = data.coverage + '%';
        if (imwEl) imwEl.innerText = data.imw + '%';

        const winkValue = document.querySelector('#wink-display .info-widget-value-purple');
        if (winkValue) winkValue.innerText = data.wink;

    } catch (e) { console.error('Word refresh failed', e); }
};

window.resetWordStats = async function () {
    const confirmed = await customConfirm({
        title: 'Reset Statistics',
        message: 'Reset all word learning statistics to zero? This cannot be undone.',
        buttons: [
            { label: 'Cancel', value: false, class: 'confirm-btn-secondary' },
            { label: 'Reset All', value: true, class: 'confirm-btn-danger' }
        ]
    });
    if (!confirmed) return;
    try {
        const response = await fetch('/reset_word_stats', { method: 'POST' });
        const result = await response.json();
        if (result.status === 'success') {
            await window.refreshWords();
        } else {
            alert('Reset failed: ' + result.message);
        }
    } catch (e) { console.error('Word reset failed', e); }
};

// ─── Initializer ─────────────────────────────────────────────────────────────

export function initWordWidget() {
    // All handlers registered on window.* — no DOM wiring needed at init time.
}
