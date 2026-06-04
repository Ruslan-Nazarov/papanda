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

window.saveDashboardWordEdit = async function() {
    const form = document.getElementById('dashboardEditWordForm');
    if (!form) return;
    const formData = new FormData(form);
    try {
        const response = await fetch('/update_word_data', { method: 'POST', body: formData });
        if (response.ok) {
            // Update the testWords cache if we are in the middle of a test
            if (testWords && testWords.length > 0 && currentIdx < testWords.length) {
                const word = testWords[currentIdx];
                if (word && word.eng === formData.get('word_eng')) {
                    if (!word.translations) word.translations = {};
                    const activeLangs = window.P_ACTIVE_LANGUAGES || ['en', 'it', 'de'];
                    activeLangs.forEach(code => {
                        const val = formData.get(`lang_${code}`);
                        word.translations[code] = val;
                        word[code] = val;
                    });
                    word.ru      = formData.get('new_ru');
                    word.meaning = formData.get('new_meaning');
                    if (word.test_lang) {
                        const newVal = formData.get(`lang_${word.test_lang}`);
                        if (newVal) word.word_to_test = newVal;
                    }
                    if (typeof window.showNextWordWidget === 'function') {
                        window.showNextWordWidget();
                    }
                }
            }
            if (typeof window.refreshWords === 'function') {
                await window.refreshWords();
            }
            window.closeEditModal();
        } else {
            alert('Error saving changes');
        }
    } catch (e) {
        console.error('Save failed', e);
        alert('Network error');
    }
};

window.showAddCategory = function () {
    document.getElementById('addCategoryForm').style.display = 'block';
};
window.hideAddCategory = function () {
    document.getElementById('addCategoryForm').style.display = 'none';
};

window.markTripletLearned = async function (eng, btn) {
    try {
        // Optional: show a loading state on the button
        if (btn) btn.style.opacity = '0.5';
        
        const resp = await fetch('/mark_triplet_learned', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eng, is_learned: true })
        });
        const data = await resp.json();
        if (data.status === 'success') {
            showToast(`"${eng}" marked as learned!`);
            if (data.new_word) {
                const row = btn.closest('.word-row');
                if (row) {
                    const newRow = createWordRow(data.new_word);
                    row.replaceWith(newRow);
                }
            } else if (typeof window.refreshWords === 'function') {
                await window.refreshWords();
            }
        } else {
            showToast('Error: ' + (data.message || 'Unknown error'), 'error');
            if (btn) btn.style.opacity = '1';
        }
    } catch (e) {
        showToast('Network error', 'error');
        if (btn) btn.style.opacity = '1';
    }
};

function createWordRow(word) {
    const activeLangs = window.P_ACTIVE_LANGUAGES || ['en', 'it', 'de'];
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
    const engJs = word.eng;
    checkBtn.onclick = function() { markTripletLearned(engJs, this); };

    actions.appendChild(editBtn);
    actions.appendChild(checkBtn);
    
    row.appendChild(grid);
    row.appendChild(actions);

    return row;
}

window.refreshWords = async function () {
    try {
        const response = await fetch('/get_new_words');
        const data = await response.json();
        const container = document.getElementById('words-list');
        if (!container) return;
        container.innerHTML = '';

        data.words.forEach(word => {
            container.appendChild(createWordRow(word));
        });

        const volEl = document.getElementById('volume-count');
        const covEl = document.getElementById('coverage-count');
        const imwEl = document.getElementById('imw-count');
        if (volEl) volEl.innerText = data.count;
        if (covEl) covEl.innerText = data.coverage + '%';
        if (imwEl) imwEl.innerText = data.imw + '%';

        const winkValue = document.querySelector('#wink-display .info-widget-value-purple');
        if (winkValue) winkValue.innerText = data.wink;
        
        if (typeof window.applySentenceDots === 'function') window.applySentenceDots();

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

// ─── Brain Workout Prototype ──────────────────────────────────────────────────

window.switchWordsTab = function(tab) {
    const listTab = document.getElementById('words-tab-list');
    const workoutTab = document.getElementById('words-tab-workout');
    const btnList = document.getElementById('tab-btn-list');
    const btnWorkout = document.getElementById('tab-btn-workout');
    
    if (!listTab || !workoutTab) return;
    
    if (tab === 'list') {
        listTab.style.display = 'block';
        workoutTab.style.display = 'none';
        btnList.classList.add('active');
        btnList.style.background = 'var(--color-bg-subtle)';
        btnWorkout.classList.remove('active');
        btnWorkout.style.background = 'transparent';
    } else {
        listTab.style.display = 'none';
        workoutTab.style.display = 'block';
        btnWorkout.classList.add('active');
        btnWorkout.style.background = 'var(--color-bg-subtle)';
        btnList.classList.remove('active');
        btnList.style.background = 'transparent';
        window.resetTestWidget();
    }
};

window.resetTestWidget = function() {
    document.getElementById('test-start-view').style.display = 'block';
    document.getElementById('test-active-view').style.display = 'none';
    document.getElementById('test-finish-view').style.display = 'none';
    document.getElementById('test-progress').style.display = 'none';
    if (reloadTimeout) { clearTimeout(reloadTimeout); reloadTimeout = null; }
};

let testWords = [];
let currentIdx = 0;
let score = 0;
let reloadTimeout = null;
let workoutLimit = parseInt(localStorage.getItem('workoutLimit') || '5', 10);
let workoutMaxKnown = parseInt(localStorage.getItem('workoutMaxKnown') || '1', 10);

window.updateWorkoutDisplayCountWidget = function() {
    const el = document.getElementById('workout-count-display');
    if (el) el.innerText = workoutLimit;
};

window.openWorkoutSettingsModalWidget = function() {
    document.getElementById('settingWorkoutLimitWidget').value = workoutLimit;
    document.getElementById('settingWorkoutMaxKnownWidget').value = workoutMaxKnown;
    document.getElementById('workoutSettingsModalWidget').style.display = 'flex';
};

window.closeWorkoutSettingsModalWidget = function() {
    document.getElementById('workoutSettingsModalWidget').style.display = 'none';
};

window.saveWorkoutSettingsWidget = function() {
    const l = parseInt(document.getElementById('settingWorkoutLimitWidget').value, 10);
    const m = parseInt(document.getElementById('settingWorkoutMaxKnownWidget').value, 10);
    if (l > 0) {
        workoutLimit = l;
        localStorage.setItem('workoutLimit', workoutLimit);
    }
    if (m >= 0) {
        workoutMaxKnown = m;
        localStorage.setItem('workoutMaxKnown', workoutMaxKnown);
    }
    window.updateWorkoutDisplayCountWidget();
    window.closeWorkoutSettingsModalWidget();
};

window.startKnowledgeTestWidget = async function() {
    if (reloadTimeout) { clearTimeout(reloadTimeout); reloadTimeout = null; }

    document.getElementById('test-start-view').style.display  = 'none';
    document.getElementById('test-finish-view').style.display = 'none';
    document.getElementById('test-active-view').style.display = 'block';
    document.getElementById('test-progress').style.display    = 'block';
    document.getElementById('workout-edit-trigger').style.display = 'inline-block';
    document.getElementById('test-log').innerText = '';

    try {
        const url = `/get_test_words?limit=${workoutLimit}&max_known=${workoutMaxKnown}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        testWords  = data.words;
        currentIdx = 0;
        score      = 0;
        if (!Array.isArray(testWords) || testWords.length === 0) throw new Error('No words received.');
        showNextWordWidget();
    } catch (error) {
        document.getElementById('test-log').innerText = `Error: ${error.message}`;
        document.getElementById('test-start-view').style.display  = 'block';
        document.getElementById('test-active-view').style.display = 'none';
        document.getElementById('test-progress').style.display    = 'none';
        document.getElementById('workout-edit-trigger').style.display = 'none';
    }
};

window.openWorkoutEditWidget = function() {
    const word = testWords[currentIdx];
    if (!word) return;
    const mockBtn = document.createElement('button');
    mockBtn.dataset.eng = word.word_to_test || word.eng;
    mockBtn.dataset.ru = word.ru || '';
    mockBtn.dataset.meaning = word.meaning || '';
    
    if (word.translations) {
        mockBtn.dataset.translations = JSON.stringify(word.translations);
    } else {
        const activeLangs = window.P_ACTIVE_LANGUAGES || ['en', 'it', 'de'];
        activeLangs.forEach(lang => {
            if (word[lang]) {
                const attrKey = 'lang' + lang.charAt(0).toUpperCase() + lang.slice(1).toLowerCase();
                mockBtn.dataset[attrKey] = word[lang];
            }
        });
    }
    if (typeof window.openEditModalFromData === 'function') {
        window.openEditModalFromData(mockBtn);
    } else {
        console.error("openEditModalFromData function not found");
    }
};

window.showNextWordWidget = function() {
    if (currentIdx >= testWords.length) { finishTestWidget(); return; }
    const word = testWords[currentIdx];
    const allLangNames = window.P_ALL_LANGUAGES || {};
    const activeLangs = window.P_ACTIVE_LANGUAGES || ['en', 'it', 'de'];
    
    document.getElementById('test-lang-header').innerText     = `Translate from ${allLangNames[word.test_lang] || word.test_lang}:`;
    document.getElementById('current-word-display').innerText = word.word_to_test || '...';
    document.getElementById('learned-icon').style.display     = word.is_lang_known ? 'inline-block' : 'none';

    let hintParts = [`🇷🇺 ${word.ru || '—'}`];
    const languageFlags = window.DASHBOARD_LANG_FLAGS || {};
    activeLangs.forEach(code => {
        if (code !== word.test_lang) {
            const val = (word.translations && word.translations[code]) || word[code];
            if (val) {
                const icon = languageFlags[code] || code.toUpperCase();
                hintParts.push(`${icon} ${val}`);
            }
        }
    });

    document.getElementById('current-translation-display').innerText   = hintParts.join(' | ');
    document.getElementById('current-translation-display').style.visibility = 'hidden';
    document.getElementById('test-progress').innerText    = `Word ${currentIdx + 1}/${testWords.length}`;
    document.getElementById('word-show-count').innerText  = `Seen: ${word.count || 0} times`;
};

window.toggleHintWidget = function() {
    const hint = document.getElementById('current-translation-display');
    hint.style.visibility = (hint.style.visibility === 'hidden') ? 'visible' : 'hidden';
};

window.recordResultWidget = async function(isKnown) {
    if (testWords.length === 0 || currentIdx >= testWords.length) return;
    const word = testWords[currentIdx];
    currentIdx++;
    if (isKnown) score++;

    try {
        await fetch('/mark_word_known', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eng: word.eng, lang: word.test_lang, is_known: isKnown })
        });
        const res2 = await fetch('/record_test_result', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eng: word.eng, lang: word.test_lang, is_correct: isKnown })
        });
        if (!res2.ok) console.error('Failed to record result');
    } catch (error) {
        console.error('Network error saving test result:', error);
    }
    showNextWordWidget();
};

window.finishTestWidget = function() {
    document.getElementById('test-active-view').style.display  = 'none';
    document.getElementById('test-progress').style.display     = 'none';
    document.getElementById('workout-edit-trigger').style.display = 'none';
    document.getElementById('test-finish-view').style.display  = 'block';
    document.getElementById('test-result-summary').innerText   =
        `You knew ${score} out of ${testWords.length} words.`;
    
    // Auto refresh the list tab stats and words after a moment
    reloadTimeout = setTimeout(() => {
        if (typeof window.refreshWords === 'function') window.refreshWords();
    }, 1500);
};

// ─── Initializer ─────────────────────────────────────────────────────────────

export function initWordWidget() {
    // All handlers registered on window.* — no DOM wiring needed at init time.
    setTimeout(() => {
        const btnStart = document.getElementById('btn-start-test');
        if (btnStart && !btnStart.dataset.bound) {
            btnStart.dataset.bound = "1";
            btnStart.addEventListener('click', window.startKnowledgeTestWidget);
            document.getElementById('btn-show-hint').addEventListener('click', window.toggleHintWidget);
            document.getElementById('btn-known').addEventListener('click', () => window.recordResultWidget(true));
            document.getElementById('btn-unknown').addEventListener('click', () => window.recordResultWidget(false));
            document.getElementById('btn-try-again').addEventListener('click', window.resetTestWidget);
            window.updateWorkoutDisplayCountWidget();
        }
        if (typeof window.applySentenceDots === 'function') window.applySentenceDots();
    }, 500);
}

window.applySentenceDots = function() {
    const dataElement = document.getElementById('sentences-data');
    if (!dataElement) return;
    try {
        const rawSentences = JSON.parse(dataElement.textContent);
        const dictWordsMap = {};
        
        rawSentences.forEach(s => {
            s.words.forEach(w => {
                if (w.is_in_my_dict && w.dictionary_word) {
                    const key = w.dictionary_word.toLowerCase().trim();
                    if (!dictWordsMap[key]) {
                        dictWordsMap[key] = [];
                    }
                    dictWordsMap[key].push(s.id);
                }
            });
        });
        
        document.querySelectorAll('.words-widget .font-study').forEach(span => {
            if (span.dataset.sentenceDotApplied) return;
            const txt = span.innerText.replace(/[\n\r]+|[\s]{2,}/g, ' ').trim().toLowerCase();
            if (txt && dictWordsMap[txt]) {
                const sentenceId = dictWordsMap[txt][0];
                span.dataset.sentenceDotApplied = '1';
                span.style.position = 'relative';
                span.style.cursor = 'pointer';
                const dot = document.createElement('span');
                dot.className = 'sentence-dot';
                dot.style.cssText = 'display:inline-block; width:6px; height:6px; background:#f1c40f; border-radius:50%; vertical-align:super; margin-left:2px; box-shadow: 0 0 4px #f1c40f;';
                dot.title = 'Open Sentence Trainer';
                span.appendChild(dot);
                
                span.onclick = (e) => {
                    e.stopPropagation();
                    if (window.openLanguageLearningModalForSentence) {
                        window.openLanguageLearningModalForSentence(sentenceId);
                    }
                };
            }
        });
    } catch (e) {
        console.error("Failed to map sentence dots:", e);
    }
};
