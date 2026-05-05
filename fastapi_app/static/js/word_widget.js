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
            const extraRow = btn.closest('tr');
            const mainRow  = extraRow?.previousElementSibling;
            if (extraRow) extraRow.style.opacity = '0.3';
            if (mainRow)  mainRow.style.opacity  = '0.3';
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
        const tbody = document.getElementById('words-tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        const activeLangs = window.P_ACTIVE_LANGUAGES || ['en', 'it', 'de'];
        data.words.forEach(word => {
            const tr1 = document.createElement('tr');
            let colsHtml = '';
            activeLangs.forEach(code => {
                colsHtml += `<td>${(word.translations && word.translations[code]) || ''}</td>`;
            });
            tr1.innerHTML = colsHtml;

            const tr2 = document.createElement('tr');
            tr2.className = 'word-extra-row';
            const meaningSpan = word.meaning
                ? `<span class="meaning-divider"></span><span style="font-style:italic;color:#888;">${word.meaning}</span>`
                : '';
            const transJson = JSON.stringify(word.translations || {}).replace(/"/g, '&quot;');
            const engSafe   = word.eng.replace(/"/g, '&quot;');
            const ruSafe    = (word.ru || '').replace(/"/g, '&quot;');
            const meanSafe  = (word.meaning || '').replace(/"/g, '&quot;');
            const engJs     = word.eng.replace(/'/g, "\\'");
            tr2.innerHTML = `
                <td colspan="${activeLangs.length}" style="padding:4px 10px;">
                    ${word.ru} ${meaningSpan}
                    <span class="edit-btn" data-eng="${engSafe}" data-translations="${transJson}" data-ru="${ruSafe}" data-meaning="${meanSafe}" onclick="openEditModalFromData(this)">✎</span>
                    <span class="edit-btn" title="Mark as fully learned" style="margin-left:10px;color:var(--color-success);" onclick="markTripletLearned('${engJs}', this)">✓</span>
                </td>`;
            tbody.appendChild(tr1);
            tbody.appendChild(tr2);
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
