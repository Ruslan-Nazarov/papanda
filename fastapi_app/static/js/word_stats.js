/**
 * word_stats.js — All interactive logic for the Word Statistics page.
 * Extracted from word_stats.html inline <script> (lines 766–1400).
 *
 * Depends on: Chart.js (loaded via CDN in <head>)
 * Global constants injected by Jinja before this script loads:
 *   window.WS_ACTIVE_LANGS, window.WS_ALL_LANG_NAMES, window.WS_LANGUAGE_FLAGS
 *   window.WS_DISTRIBUTION, window.WS_DAILY_SHOWS_LABELS, window.WS_DAILY_SHOWS_DATA
 *   window.WS_KNOWN_COUNTS, window.WS_TOTAL_COUNT
 *   window.WS_HISTORY_LABELS, window.WS_HISTORY_TOTAL_SUCCESS, window.WS_HISTORY_RETENTION
 *   window.WS_HISTORY_LANG_SUCCESS, window.WS_HISTORY_LANG_RETENTION, window.WS_HAS_HISTORY
 */

const activeLangs   = window.WS_ACTIVE_LANGS   || window.P_ACTIVE_LANGUAGES || window.DASHBOARD_ACTIVE_LANGS || [];
const allLangNames  = window.WS_ALL_LANG_NAMES || window.P_ALL_LANGUAGES || window.DASHBOARD_ALL_LANGUAGES || {};
const languageFlags = window.WS_LANGUAGE_FLAGS || window.P_LANGUAGE_FLAGS || window.DASHBOARD_LANGUAGE_FLAGS || { en: '🇬🇧', ru: '🇷🇺', it: '🇮🇹', de: '🇩🇪', kz: '🇰🇿', zh: '🇨🇳' };

// ── Search Modal ──────────────────────────────────────────────────────────────

let searchSelected = null;

function openDictionarySearch() {
    document.getElementById('searchQuery').value = '';
    document.getElementById('searchResults').innerHTML = '';
    searchSelected = null;
    document.getElementById('searchWordModal').style.display = 'flex';
    setTimeout(() => document.getElementById('searchQuery').focus(), 50);
}

function closeSearchModal() {
    document.getElementById('searchWordModal').style.display = 'none';
}

async function searchWord() {
    const q = document.getElementById('searchQuery').value.trim();
    if (!q) { 
        document.getElementById('searchResults').innerHTML = ''; 
        document.getElementById('searchWordCard').style.display = 'none';
        return; 
    }

    const res = await fetch(`/word_lookup?q=${encodeURIComponent(q)}`);
    if (!res.ok) return;
    const data = await res.json();
    const container = document.getElementById('searchResults');
    container.innerHTML = '';

    if (!data.results || data.results.length === 0) {
        container.innerHTML = '<div style="color: var(--color-text-faint); font-size: 0.85rem; padding: 8px 0;">No words found in your dictionary.</div>';
        return;
    }

    data.results.forEach(w => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.style.cssText = 'display:flex;width:100%;text-align:left;padding:10px 12px;border:1px solid var(--color-border-light);border-radius:8px;background:white;margin-bottom:6px;cursor:pointer;gap:8px;align-items:center;transition:background 0.15s;';
        btn.onmouseover = () => btn.style.background = 'var(--color-bg-subtle)';
        btn.onmouseout  = () => btn.style.background = 'white';

        const engSpan = document.createElement('span');
        engSpan.style.cssText = 'font-weight: 700; color: var(--color-text-dark); font-size: 0.95rem; flex-shrink: 0;';
        engSpan.textContent = w.eng || '';

        const transSpan = document.createElement('span');
        transSpan.style.cssText = 'font-size: 0.82rem; color: var(--color-text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
        const parts = [];
        activeLangs.forEach(code => {
            if (code.toLowerCase() !== 'en' && w[code]) {
                const lowerCode = code.toLowerCase();
                const flag = languageFlags[code] || languageFlags[lowerCode] || window.P_LANGUAGE_FLAGS?.[lowerCode] || window.DASHBOARD_LANGUAGE_FLAGS?.[lowerCode] || '';
                parts.push(flag ? `${flag} ${w[code]}` : w[code]);
            }
        });
        if (w.ru && !activeLangs.map(l => l.toLowerCase()).includes('ru')) {
            parts.push(`🇷🇺 ${w.ru}`);
        }
        transSpan.textContent = parts.join(' · ');

        const badge = w.is_learned ? document.createElement('span') : null;
        if (badge) {
            badge.textContent = '✅';
            badge.style.cssText = 'margin-left: auto; flex-shrink: 0; font-size: 0.85rem;';
        }

        btn.appendChild(engSpan);
        btn.appendChild(transSpan);
        if (badge) btn.appendChild(badge);
        btn.onclick = () => selectSearchResult(w);
        container.appendChild(btn);
    });
}

function selectSearchResult(w) {
    searchSelected = w;
    closeSearchModal();
    
    // Build translations object
    const trans = w.translations || {};
    activeLangs.forEach(code => {
        if (w[code]) trans[code] = w[code];
    });
    
    document.getElementById('wsModalWordEng').innerText = 'Edit: ' + w.eng;
    document.getElementById('wsInputWordEng').value = w.eng;
    
    const container = document.getElementById('wsWorkoutDynamicLangs');
    container.innerHTML = '';
    activeLangs.forEach(code => {
        const group = document.createElement('div');
        group.className = 'form-group';
        const val = (trans[code] || '').toString().replace(/"/g, '&quot;');
        const langName = allLangNames[code] || allLangNames[code.toLowerCase()] || code.toUpperCase();
        group.innerHTML = `<label class="form-label">${langName}:</label>`
            + `<input type="text" name="lang_${code}" value="${val}" class="form-input" />`;
        container.appendChild(group);
    });
    
    document.getElementById('wsInputWordRu').value = w.ru || '';
    document.getElementById('wsInputWordMeaning').value = w.meaning || '';
    
    // Show delete button when editing from search
    document.getElementById('btnDeleteWordModal').style.display = 'block';
    
    document.getElementById('wordStatsEditModal').style.display = 'flex';
}

async function deleteSearchWord() {
    if (!searchSelected || !searchSelected.eng) return;
    const confirmed = await customConfirm({
        title: 'Delete Word',
        message: `Delete "${searchSelected.eng}" entirely from dictionary?`,
        buttons: [
            { label: 'Cancel', value: false, class: 'confirm-btn-secondary' },
            { label: 'Delete', value: true, class: 'confirm-btn-danger' }
        ]
    });
    if (!confirmed) return;
    const res = await fetch(`/delete_word?eng=${encodeURIComponent(searchSelected.eng)}`, { method: 'DELETE' });
    if (res.ok) { 
        window.closeWordStatsEdit();
        openDictionarySearch(); 
    }
    else { alert(window._("toast.error_deleting_word")); }
}


// ── Edit Modal (Workout) ──────────────────────────────────────────────────────

function openWorkoutEditModal() {
    if (!testWords || currentIdx >= testWords.length) return;
    const word = testWords[currentIdx];
    document.getElementById('wsModalWordEng').innerText = 'Edit: ' + word.eng;
    document.getElementById('wsInputWordEng').value = word.eng;

    const container = document.getElementById('wsWorkoutDynamicLangs');
    container.innerHTML = '';
    activeLangs.forEach(code => {
        const group = document.createElement('div');
        group.className = 'form-group';
        const langName = allLangNames[code] || allLangNames[code.toLowerCase()] || code.toUpperCase();
        group.innerHTML = `<label class="form-label">${langName}:</label>`
            + `<input type="text" name="lang_${code}" value="${(word.translations && word.translations[code] || '').replace(/"/g, '&quot;')}" class="form-input" />`;
        container.appendChild(group);
    });

    document.getElementById('wsInputWordRu').value = word.ru || '';
    document.getElementById('wsInputWordMeaning').value = word.meaning || '';
    
    // Hide delete button when editing from workout
    document.getElementById('btnDeleteWordModal').style.display = 'none';
    
    document.getElementById('wordStatsEditModal').style.display = 'flex';
}

window.closeWordStatsEdit = function() {
    document.getElementById('wordStatsEditModal').style.display = 'none';
};

window.saveWordStatsEdit = async function() {
    const formData = new FormData(document.getElementById('editWordForm'));
    try {
        const response = await fetch('/update_word_data', { method: 'POST', body: formData });
        if (response.ok) {
            // Update the testWords cache if we are in the middle of a test
            if (typeof testWords !== 'undefined' && testWords && currentIdx < testWords.length) {
                const word = testWords[currentIdx];
                if (word) {
                    if (!word.translations) word.translations = {};
                    activeLangs.forEach(code => {
                        const val = formData.get(`lang_${code}`);
                        word.translations[code] = val;
                        if (code === 'it') word.it = val;
                        if (code === 'de') word.de = val;
                    });
                    word.ru      = formData.get('new_ru');
                    word.meaning = formData.get('new_meaning');
                    if (word.test_lang) {
                        const newVal = formData.get(`lang_${word.test_lang}`);
                        if (newVal) word.word_to_test = newVal;
                    }
                    if (typeof showNextWord === 'function') {
                        showNextWord();
                    }
                }
            } else if (typeof searchSelected !== 'undefined' && searchSelected) {
                // Update search card if needed
                const ruField = document.getElementById('searchCardRu');
                if (ruField) ruField.textContent = formData.get('new_ru') ? `🇷🇺 ${formData.get('new_ru')}` : '';
            }
            window.closeWordStatsEdit();
        } else {
            alert(window._("toast.error_saving_changes"));
        }
    } catch (e) {
        console.error('Save failed', e);
        alert(window._("toast.network_error"));
    }
};

window.deleteSearchWord = async function() {
    if (!searchSelected) return;
    const confirmed = await customConfirm({
        title: 'Delete Word',
        message: `Are you sure you want to delete "${searchSelected.eng}"?`,
        buttons: [
            { label: 'Cancel', value: false, class: 'confirm-btn-secondary' },
            { label: 'Delete', value: true, class: 'confirm-btn-danger' }
        ]
    });
    if (!confirmed) return;
    try {
        const res = await fetch('/delete_word_data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eng: searchSelected.eng })
        });
        if (res.ok) {
            window.closeWordStatsEdit();
        } else {
            alert(window._("toast.delete_failed"));
        }
    } catch (e) {
        alert(window._("toast.network_error"));
    }
};

// ── Charts ────────────────────────────────────────────────────────────────────

function initCharts() {
    // 1. Distribution Chart
    const distCanvas = document.getElementById('distChart');
    if (!distCanvas) return; // not loaded yet
    const distCtx = distCanvas.getContext('2d');
    new Chart(distCtx, {
        type: 'bar',
        data: {
            labels: window.WS_DISTRIBUTION.keys,
            datasets: [{
                label: 'Number of Words',
                data: window.WS_DISTRIBUTION.values,
                backgroundColor: ['#eee', '#FFE5B4', '#F2D2BD', '#FADBD8', '#D4E6F1', '#D5F5E3'],
                borderWidth: 0,
                borderRadius: 8
            }]
        },
        options: {
            maintainAspectRatio: false, responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, grid: { display: false } }, x: { grid: { display: false } } }
        }
    });

    // 2. Daily Word Shows Chart
    const dailyCtx = document.getElementById('dailyShowsChart').getContext('2d');
    new Chart(dailyCtx, {
        type: 'bar',
        data: {
            labels: window.WS_DAILY_SHOWS_LABELS,
            datasets: [{
                label: 'Words shown',
                data: window.WS_DAILY_SHOWS_DATA,
                backgroundColor: 'rgba(242, 153, 74, 0.7)',
                borderColor: '#F2994A',
                borderWidth: 1, borderRadius: 4
            }]
        },
        options: {
            maintainAspectRatio: false, responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: '#f0f0f0' }, ticks: { precision: 0 } },
                x: { grid: { display: false } }
            }
        }
    });

    // 3. Knowledge by Language Chart
    const pieCtx = document.getElementById('knowledgePieChart').getContext('2d');
    new Chart(pieCtx, {
        type: 'bar',
        data: {
            labels: window.WS_KNOWN_COUNTS.langs,
            datasets: [{
                label: 'Known Words',
                data: window.WS_KNOWN_COUNTS.values,
                backgroundColor: ['#3498DB', '#2ECC71', '#F1C40F'],
                borderWidth: 0, borderRadius: 5
            }]
        },
        options: {
            indexAxis: 'y',
            plugins: { legend: { display: false } },
            scales: {
                x: { beginAtZero: true, max: window.WS_TOTAL_COUNT, grid: { color: '#f8f8f8' } },
                y: { grid: { display: false } }
            },
            maintainAspectRatio: false, responsive: true
        }
    });
}

// ── Brain Workout Efficiency Chart ────────────────────────────────────────────

let healthChart = null;
let currentHealthMode = 'abs';

const langColors = {
    'en': '#3498db', 'it': '#2ecc71', 'de': '#e67e22', 'ru': '#e74c3c',
    'kz': '#1abc9c', 'es': '#f1c40f', 'fr': '#9b59b6', 'la': '#95a5a6'
};

function getLangColor(lang, index) {
    if (langColors[lang]) return langColors[lang];
    const palette = ['#16a085', '#27ae60', '#2980b9', '#8e44ad', '#2c3e50', '#f39c12', '#d35400', '#c0392b'];
    return palette[index % palette.length];
}

function setHealthMode(mode) {
    currentHealthMode = mode;
    document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('toggle-' + mode).classList.add('active');
    updateHealthChart();
}

function updateHealthChart() {
    const healthDataAbs = { avg: window.WS_HISTORY_TOTAL_SUCCESS, langs: window.WS_HISTORY_LANG_SUCCESS };
    const healthDataPct = { avg: window.WS_HISTORY_RETENTION,     langs: window.WS_HISTORY_LANG_RETENTION };

    const dataSet      = currentHealthMode === 'abs' ? healthDataAbs : healthDataPct;
    const labelSuffix  = currentHealthMode === 'abs' ? ' (Count)'    : ' (%)';
    const yAxisTitle   = currentHealthMode === 'abs' ? 'Words Remembered' : 'Success Rate %';

    const datasets = [{
        label: 'Global Success' + labelSuffix,
        data: dataSet.avg,
        borderColor: '#2c3e50',
        backgroundColor: 'rgba(44, 62, 80, 0.05)',
        borderDash: [5, 5],
        fill: true, tension: 0.4, borderWidth: 3, pointRadius: 4
    }];

    Object.keys(dataSet.langs).forEach((lang, idx) => {
        datasets.push({
            label: lang.toUpperCase() + labelSuffix,
            data: dataSet.langs[lang],
            borderColor: getLangColor(lang, idx),
            backgroundColor: 'transparent',
            fill: false, tension: 0.3, borderWidth: 2, pointRadius: 3
        });
    });

    if (healthChart) {
        healthChart.data.datasets = datasets;
        healthChart.options.scales.y.title.text = yAxisTitle;
        if (currentHealthMode === 'pct') healthChart.options.scales.y.max = 100;
        else delete healthChart.options.scales.y.max;
        healthChart.update();
    } else {
        const hcCanvas = document.getElementById('healthChart');
        if (!hcCanvas) return;
        const ctx = hcCanvas.getContext('2d');
        healthChart = new Chart(ctx, {
            type: 'line',
            data: { labels: window.WS_HISTORY_LABELS, datasets },
            options: {
                responsive: true, maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                scales: { y: { beginAtZero: true, title: { display: true, text: yAxisTitle } } },
                plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } }
            }
        });
    }
}

// ── Brain Workout Test ────────────────────────────────────────────────────────

let testWords = [];
let currentIdx = 0;
let score = 0;
let reloadTimeout = null;

// Settings
let workoutLimit = parseInt(localStorage.getItem('workoutLimit') || '5', 10);
let workoutMaxKnown = parseInt(localStorage.getItem('workoutMaxKnown') || '1', 10);

function updateWorkoutDisplayCount() {
    const el = document.getElementById('workout-count-display');
    if (el) el.innerText = workoutLimit;
}

function openWorkoutSettingsModal() {
    document.getElementById('settingWorkoutLimit').value = workoutLimit;
    document.getElementById('settingWorkoutMaxKnown').value = workoutMaxKnown;
    document.getElementById('workoutSettingsModal').style.display = 'block';
}

function closeWorkoutSettingsModal() {
    document.getElementById('workoutSettingsModal').style.display = 'none';
}

function saveWorkoutSettings() {
    const l = parseInt(document.getElementById('settingWorkoutLimit').value, 10);
    const m = parseInt(document.getElementById('settingWorkoutMaxKnown').value, 10);
    if (l > 0) {
        workoutLimit = l;
        localStorage.setItem('workoutLimit', workoutLimit);
    }
    if (m >= 0) {
        workoutMaxKnown = m;
        localStorage.setItem('workoutMaxKnown', workoutMaxKnown);
    }
    updateWorkoutDisplayCount();
    closeWorkoutSettingsModal();
}

async function startKnowledgeTest(e) {
    if (reloadTimeout) { clearTimeout(reloadTimeout); reloadTimeout = null; }
    const oldHint = document.getElementById('reload-hint');
    if (oldHint) oldHint.remove();
    document.getElementById('test-log').innerText = '';

    const btn = e && e.target && e.target.tagName === 'BUTTON' ? e.target : null;
    if (btn) { btn.disabled = true; btn.style.opacity = '0.6'; }

    try {
        const url = `/get_test_words?limit=${workoutLimit}&max_known=${workoutMaxKnown}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        testWords  = data.words;
        currentIdx = 0;
        score      = 0;
        if (!Array.isArray(testWords) || testWords.length === 0) throw new Error('No words received.');

        document.getElementById('test-start-view').style.display  = 'none';
        document.getElementById('test-finish-view').style.display = 'none';
        document.getElementById('test-active-view').style.display = 'block';
        const progressEl = document.getElementById('test-progress');
        if (progressEl) progressEl.style.display = 'block';

        showNextWord();
    } catch (error) {
        document.getElementById('test-log').innerText = `Error: ${error.message}`;
        document.getElementById('test-start-view').style.display  = 'block';
        document.getElementById('test-active-view').style.display = 'none';
        const progressEl = document.getElementById('test-progress');
        if (progressEl) progressEl.style.display = 'none';
        const editTriggerEl = document.getElementById('edit-word-trigger');
        if (editTriggerEl) editTriggerEl.style.display = 'none';
    } finally {
        if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
    }
}

function showNextWord() {
    if (currentIdx >= testWords.length) { finishTest(); return; }
    const word = testWords[currentIdx];
    document.getElementById('test-lang-header').innerText     = `Translate from ${allLangNames[word.test_lang] || word.test_lang}:`;
    document.getElementById('current-word-display').innerText = word.word_to_test || '...';
    const learnedIconEl = document.getElementById('learned-icon');
    if (learnedIconEl) learnedIconEl.style.display = word.is_lang_known ? 'inline-block' : 'none';
    const editTriggerEl = document.getElementById('edit-word-trigger');
    if (editTriggerEl) editTriggerEl.style.display = 'inline-block';

    let hintParts = [`🇷🇺 ${word.ru || '—'}`];
    activeLangs.forEach(code => {
        if (code !== word.test_lang) {
            const val = (word.translations && word.translations[code]) || word[code];
            if (val) {
                const icon = languageFlags[code] || '🏳️';
                hintParts.push(`${icon} ${val}`);
            }
        }
    });

    document.getElementById('current-translation-display').innerText   = hintParts.join(' | ');
    const autoToggle = document.getElementById('toggle-auto-hint');
    document.getElementById('current-translation-display').style.visibility = (autoToggle && autoToggle.checked) ? 'visible' : 'hidden';
    const progressEl = document.getElementById('test-progress');
    if (progressEl) {
        progressEl.style.visibility = 'visible';
        progressEl.innerText = `Word ${currentIdx + 1}/${testWords.length}`;
    }
    const showCountEl = document.getElementById('word-show-count');
    if (showCountEl) {
        showCountEl.style.visibility = 'visible';
        showCountEl.innerText = `Seen: ${word.count || 0} times`;
    }
}

function onAutoHintToggle() {
    const autoToggle = document.getElementById('toggle-auto-hint');
    const hint = document.getElementById('current-translation-display');
    if (hint && autoToggle) {
        hint.style.visibility = autoToggle.checked ? 'visible' : 'hidden';
    }
}

async function recordResult(isKnown) {
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
        if (!res2.ok) console.error('Failed to record test result:', await res2.text());
    } catch (error) {
        console.error('Network error saving test result:', error);
    }
    showNextWord();
}

function finishTest() {
    document.getElementById('test-active-view').style.display  = 'none';
    document.getElementById('test-progress').style.display     = 'none';
    document.getElementById('edit-word-trigger').style.display = 'none';
    document.getElementById('test-finish-view').style.display  = 'block';
    document.getElementById('test-result-summary').innerText   =
        `You confirmed knowledge of ${score} out of ${testWords.length} words.`;

    const hint = document.createElement('div');
    hint.id = 'reload-hint';
    hint.style.cssText = 'font-size:0.8em;color:#888;margin-top:10px;';
    hint.innerText = 'Refreshing stats in 1s...';
    document.getElementById('test-finish-view').appendChild(hint);
    reloadTimeout = setTimeout(() => location.reload(), 1000);
}

async function resetAllProgress() {
    const confirmed = await customConfirm({
        title: 'Reset Progress',
        message: 'Reset ALL word progress? This cannot be undone.',
        buttons: [
            { label: 'Cancel', value: false, class: 'confirm-btn-secondary' },
            { label: 'Reset All', value: true, class: 'confirm-btn-danger' }
        ]
    });
    if (!confirmed) return;
    try {
        const res = await fetch('/reset_word_stats', { method: 'POST' });
        const data = await res.json();
        if (data.status === 'success') location.reload();
        else alert(window._("toast.error") + (data.message || 'Unknown'));
    } catch (e) { alert(window._("toast.failed_see_console")); }
}

// ── Help Tooltip ──────────────────────────────────────────────────────────────

function showHelp(event, text) {
    event.stopPropagation();
    const trigger = event.target;
    const popup   = document.getElementById('help-popup');

    if (popup.parentNode !== document.body) {
        document.body.appendChild(popup);
    }

    popup.innerText           = text;
    popup.style.display       = 'block';
    popup.style.visibility    = 'hidden';

    const rect       = trigger.getBoundingClientRect();
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollTop  = window.pageYOffset || document.documentElement.scrollTop;

    const left = rect.left + scrollLeft + (rect.width / 2) - (popup.offsetWidth / 2);
    const top  = rect.top  + scrollTop  - popup.offsetHeight - 10;

    popup.style.left       = left + 'px';
    popup.style.top        = top  + 'px';
    popup.style.visibility = 'visible';

    if (rect.top < popup.offsetHeight + 20) {
        popup.style.top = (rect.bottom + scrollTop + 10) + 'px';
        popup.classList.add('popup-below');
    } else {
        popup.classList.remove('popup-below');
    }

    const hideHandler = function () {
        popup.style.display = 'none';
        document.removeEventListener('click', hideHandler);
    };
    setTimeout(() => document.addEventListener('click', hideHandler), 10);
}

// ── Custom Confirm (local copy for word_stats, independent of modal_controller) ──

function customConfirm({ title = 'Confirmation', message = 'Are you sure?', buttons = [] }) {
    return new Promise((resolve) => {
        const modal     = document.getElementById('customConfirmModal');
        const titleEl   = document.getElementById('confirmModalTitle');
        const messageEl = document.getElementById('confirmModalMessage');
        const footerEl  = document.getElementById('confirmModalFooter');

        titleEl.innerText  = title;
        messageEl.innerHTML = message;
        footerEl.innerHTML  = '';

        if (buttons.length === 0) {
            buttons = [
                { label: 'Cancel', value: false, class: 'btn btn-secondary' },
                { label: 'OK',     value: true,  class: 'btn btn-primary'   }
            ];
        }

        buttons.forEach(btn => {
            const button = document.createElement('button');
            button.innerText  = btn.label;
            button.className  = btn.class || 'btn btn-secondary';
            button.onclick    = () => {
                modal.style.setProperty('display', 'none', 'important');
                resolve(btn.value);
            };
            footerEl.appendChild(button);
        });

        modal.style.setProperty('display', 'flex', 'important');
    });
}

// ── Init ──────────────────────────────────────────────────────────────────────

window.addEventListener('DOMContentLoaded', () => {
    // We do NOT init charts here anymore because they are initialized dynamically
    // when the word stats modal is opened.

    // Workout buttons
    updateWorkoutDisplayCount();

    // Attach events using event delegation or check if element exists, 
    // since some elements might be dynamically loaded in the modal
    document.addEventListener('click', (e) => {
        if(e.target.closest('#btn-start-test')) startKnowledgeTest();
        if(e.target.closest('#btn-known')) recordResult(true);
        if(e.target.closest('#btn-unknown')) recordResult(false);
        if(e.target.closest('#btn-try-again')) startKnowledgeTest();
        if(e.target.closest('#btn-reset-progress')) resetAllProgress();
        if(e.target.closest('#openSearchModalBtn')) openDictionarySearch();
    });

    document.addEventListener('input', (e) => {
        if(e.target.closest('#searchQuery')) searchWord();
    });

});

// Expose functions called from HTML inline onclick attributes
window.showHelp           = showHelp;
window.openDictionarySearch = openDictionarySearch;
window.closeSearchModal   = closeSearchModal;
window.deleteSearchWord   = deleteSearchWord;
window.openWorkoutEditModal = openWorkoutEditModal;
window.closeEditModal     = window.closeWordStatsEdit;
window.setHealthMode      = setHealthMode;
window.openWorkoutSettingsModal = openWorkoutSettingsModal;
window.closeWorkoutSettingsModal = closeWorkoutSettingsModal;
window.saveWorkoutSettings = saveWorkoutSettings;
window.onAutoHintToggle    = onAutoHintToggle;
window.toggleHint          = toggleHint;
window.startKnowledgeTest  = startKnowledgeTest;
window.recordResult        = recordResult;
