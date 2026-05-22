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

const activeLangs   = window.WS_ACTIVE_LANGS   || [];
const allLangNames  = window.WS_ALL_LANG_NAMES  || {};
const languageFlags = window.WS_LANGUAGE_FLAGS  || {};

// ── Search Modal ──────────────────────────────────────────────────────────────

let searchSelected = null;

function openSearchModal() {
    document.getElementById('searchQuery').value = '';
    document.getElementById('searchResults').innerHTML = '';

    const container = document.getElementById('searchDynamicLangs');
    container.innerHTML = '';

    const engGroup = document.createElement('div');
    engGroup.innerHTML = `<label>English</label><input type="text" name="eng" id="editEng" />`;
    container.appendChild(engGroup);

    activeLangs.forEach(code => {
        if (code === 'en') return;
        const group = document.createElement('div');
        group.innerHTML = `<label>${allLangNames[code] || code.toUpperCase()}</label><input type="text" name="lang_${code}" id="edit_${code}" />`;
        container.appendChild(group);
    });

    document.getElementById('editRu').value = '';
    document.getElementById('editMeaning').value = '';
    document.getElementById('searchStats').innerText = '';
    document.getElementById('btnDeleteWord').style.display = 'none';
    searchSelected = null;
    document.getElementById('searchWordModal').style.display = 'block';
    setTimeout(() => document.getElementById('searchQuery').focus(), 50);
}

function closeSearchModal() {
    document.getElementById('searchWordModal').style.display = 'none';
}

async function searchWord() {
    const q = document.getElementById('searchQuery').value.trim();
    if (!q) { document.getElementById('searchResults').innerHTML = ''; return; }

    const res = await fetch(`/word_lookup?q=${encodeURIComponent(q)}`);
    if (!res.ok) return;
    const data = await res.json();
    const container = document.getElementById('searchResults');
    container.innerHTML = '';

    if (!data.results || data.results.length === 0) {
        document.getElementById('editEng').value = q;
        document.getElementById('searchStats').innerText = 'Not found. Fill the form to add.';
        document.getElementById('btnDeleteWord').style.display = 'none';
        return;
    }

    data.results.forEach(w => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.style.cssText = 'display:block;width:100%;text-align:left;padding:8px;border:1px solid #eee;border-radius:6px;background:#f8f9fa;margin-bottom:6px;cursor:pointer;';
        let label = w.eng || '';
        activeLangs.forEach(code => {
            if (code !== 'en' && w[code]) {
                label += ` | ${languageFlags[code] || ''} ${w[code]}`;
            }
        });
        if (w.ru) label += ` | 🇷🇺 ${w.ru}`;
        if (w.is_learned || w.has_any_knowledge) label += ' ✅';
        btn.innerText = label;
        btn.onclick = () => selectSearchResult(w);
        container.appendChild(btn);
    });
}

function selectSearchResult(w) {
    searchSelected = w;
    document.getElementById('editEng').value = w.eng || '';
    activeLangs.forEach(code => {
        if (code === 'en') return;
        const el = document.getElementById(`edit_${code}`);
        if (el) el.value = w[code] || '';
    });
    document.getElementById('editRu').value = w.ru || '';
    document.getElementById('editMeaning').value = w.meaning || '';
    const flags = [
        w.is_known_en ? 'EN known' : '',
        w.is_known_it ? 'IT known' : '',
        w.is_known_de ? 'DE known' : '',
        w.is_learned  ? 'Learned'  : ''
    ].filter(Boolean).join(' • ');
    const last = w.last_shown ? new Date(w.last_shown).toLocaleString() : '—';
    document.getElementById('searchStats').innerText = `Shows: ${w.count || 0} • ${flags} • Last: ${last}`;
    document.getElementById('btnDeleteWord').style.display = 'inline-block';
}

async function saveSearchEdit() {
    const form = document.getElementById('searchEditForm');
    const fd = new FormData(form);
    const res = await fetch('/upsert_word', { method: 'POST', body: fd });
    if (res.ok) {
        const data = await res.json();
        selectSearchResult(data.word);
        alert('Saved');
    } else {
        alert('Error');
    }
}

async function deleteSearchWord() {
    if (!searchSelected || !searchSelected.eng) return;
    const confirmed = await customConfirm({
        title: 'Delete Word',
        message: `Delete "${searchSelected.eng}" entirely from database?`,
        buttons: [
            { label: 'Cancel', value: false, class: 'confirm-btn-secondary' },
            { label: 'Delete Entirely', value: true, class: 'confirm-btn-danger' }
        ]
    });
    if (!confirmed) return;
    const res = await fetch(`/delete_word?eng=${encodeURIComponent(searchSelected.eng)}`, { method: 'DELETE' });
    if (res.ok) { alert('Deleted'); openSearchModal(); }
    else { alert('Error deleting word'); }
}

// ── Edit Modal (Workout) ──────────────────────────────────────────────────────

function openWorkoutEditModal() {
    if (!testWords || currentIdx >= testWords.length) return;
    const word = testWords[currentIdx];
    document.getElementById('modalWordEng').innerText = 'Edit: ' + word.eng;
    document.getElementById('inputWordEng').value = word.eng;

    const container = document.getElementById('workoutDynamicLangs');
    container.innerHTML = '';
    activeLangs.forEach(code => {
        const group = document.createElement('div');
        group.innerHTML = `<label>${allLangNames[code] || code.toUpperCase()}:</label>`
            + `<input type="text" name="lang_${code}" value="${(word.translations && word.translations[code] || '').replace(/"/g, '&quot;')}" />`;
        container.appendChild(group);
    });

    document.getElementById('inputWordRu').value = word.ru || '';
    document.getElementById('inputWordMeaning').value = word.meaning || '';
    document.getElementById('editWordModal').style.display = 'block';
}

function closeEditModal() {
    document.getElementById('editWordModal').style.display = 'none';
}

async function saveWordEdit() {
    const formData = new FormData(document.getElementById('editWordForm'));
    try {
        const response = await fetch('/update_word_data', { method: 'POST', body: formData });
        if (response.ok) {
            const word = testWords[currentIdx];
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
            showNextWord();
            closeEditModal();
        } else {
            alert('Error saving changes');
        }
    } catch (e) {
        console.error('Save failed', e);
        alert('Network error');
    }
}

// ── Charts ────────────────────────────────────────────────────────────────────

function initCharts() {
    // 1. Distribution Chart
    const distCtx = document.getElementById('distChart').getContext('2d');
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
        const ctx = document.getElementById('healthChart').getContext('2d');
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

async function startKnowledgeTest() {
    if (reloadTimeout) { clearTimeout(reloadTimeout); reloadTimeout = null; }
    const oldHint = document.getElementById('reload-hint');
    if (oldHint) oldHint.remove();

    document.getElementById('test-start-view').style.display  = 'none';
    document.getElementById('test-finish-view').style.display = 'none';
    document.getElementById('test-active-view').style.display = 'block';
    document.getElementById('test-progress').style.display    = 'block';
    document.getElementById('edit-word-trigger').style.display = 'inline-block';
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
        showNextWord();
    } catch (error) {
        document.getElementById('test-log').innerText = `Error: ${error.message}`;
        document.getElementById('test-start-view').style.display  = 'block';
        document.getElementById('test-active-view').style.display = 'none';
        document.getElementById('test-progress').style.display    = 'none';
        document.getElementById('edit-word-trigger').style.display = 'none';
    }
}

function showNextWord() {
    if (currentIdx >= testWords.length) { finishTest(); return; }
    const word = testWords[currentIdx];
    document.getElementById('test-lang-header').innerText     = `Translate from ${allLangNames[word.test_lang] || word.test_lang}:`;
    document.getElementById('current-word-display').innerText = word.word_to_test || '...';
    document.getElementById('learned-icon').style.display     = word.is_learned ? 'inline-block' : 'none';

    let hintParts = [`🇷🇺 ${word.ru || '—'}`];
    activeLangs.forEach(code => {
        if (code !== word.test_lang) {
            const val = (word.translations && word.translations[code]) || word[code];
            if (val) {
                const icon = code === 'en' ? '🇬🇧' : (code === 'it' ? '🇮🇹' : (code === 'de' ? '🇩🇪' : '🏳️'));
                hintParts.push(`${icon} ${val}`);
            }
        }
    });

    document.getElementById('current-translation-display').innerText   = hintParts.join(' | ');
    document.getElementById('current-translation-display').style.visibility = 'hidden';
    document.getElementById('test-progress').innerText    = `Word ${currentIdx + 1}/${testWords.length}`;
    document.getElementById('word-show-count').innerText  = `Seen: ${word.count || 0} times`;
}

function toggleHint() {
    const hint = document.getElementById('current-translation-display');
    hint.style.visibility = (hint.style.visibility === 'hidden') ? 'visible' : 'hidden';
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
        else alert('Error: ' + (data.message || 'Unknown'));
    } catch (e) { alert('Failed. See console.'); }
}

// ── Help Tooltip ──────────────────────────────────────────────────────────────

function showHelp(event, text) {
    event.stopPropagation();
    const trigger = event.target;
    const popup   = document.getElementById('help-popup');

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
                { label: 'Cancel', value: false, class: 'confirm-btn-secondary' },
                { label: 'OK',     value: true,  class: 'confirm-btn-primary'   }
            ];
        }

        buttons.forEach(btn => {
            const button = document.createElement('button');
            button.innerText  = btn.label;
            button.className  = 'confirm-btn ' + (btn.class || 'confirm-btn-secondary');
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
    initCharts();
    if (window.WS_HAS_HISTORY) updateHealthChart();

    // Workout buttons
    updateWorkoutDisplayCount();
    document.getElementById('btn-start-test').addEventListener('click',  startKnowledgeTest);
    document.getElementById('btn-show-hint').addEventListener('click',   toggleHint);
    document.getElementById('btn-known').addEventListener('click',       () => recordResult(true));
    document.getElementById('btn-unknown').addEventListener('click',     () => recordResult(false));
    document.getElementById('btn-try-again').addEventListener('click',   startKnowledgeTest);
    document.getElementById('btn-reset-progress').addEventListener('click', resetAllProgress);

    // Search
    const openBtn = document.getElementById('openSearchModalBtn');
    if (openBtn) openBtn.addEventListener('click', openSearchModal);
    const q = document.getElementById('searchQuery');
    if (q) q.addEventListener('input', searchWord);

    // Backdrop click-to-close
    window.addEventListener('click', (e) => {
        const modal       = document.getElementById('editWordModal');
        const searchModal = document.getElementById('searchWordModal');
        const settingsModal = document.getElementById('workoutSettingsModal');
        if (e.target === modal)       closeEditModal();
        if (e.target === searchModal) closeSearchModal();
        if (e.target === settingsModal) closeWorkoutSettingsModal();
    });
});

// Expose functions called from HTML inline onclick attributes
window.showHelp           = showHelp;
window.openSearchModal    = openSearchModal;
window.saveSearchEdit     = saveSearchEdit;
window.closeSearchModal   = closeSearchModal;
window.deleteSearchWord   = deleteSearchWord;
window.openWorkoutEditModal = openWorkoutEditModal;
window.closeEditModal     = closeEditModal;
window.saveWordEdit       = saveWordEdit;
window.setHealthMode      = setHealthMode;
window.openWorkoutSettingsModal = openWorkoutSettingsModal;
window.closeWorkoutSettingsModal = closeWorkoutSettingsModal;
window.saveWorkoutSettings = saveWorkoutSettings;
