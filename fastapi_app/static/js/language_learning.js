import { StickerService, StickerRenderer, StickerOverview, StickerModal } from "./stickers.js";

// Global exports for inline onclicks
window.openParentStickers = (type, id) => StickerOverview.open(type, id);
window.openStickerModal = (params) => StickerModal.open(params);
window.toggleTranslation = toggleTranslation;
window.runFlash = runFlash;
window.nextSentence = nextSentence;
window.setLanguage = setLanguage;
window.handleDisplayClick = handleDisplayClick;

let rawSentences = [];
let currentLang = 'English';
let currentSentenceIndex = 0;
let activeSentences = [];
let currentStepIndex = -1; // -1: hidden, 0: Step 1, etc.
let isFlashActive = false;
let isInitialized = false;

// Strict Order
const roleOrder = ['Predicate', 'Subject', 'Attribute_Subject', 'Object', 'Attribute_Object', 'Adverbial'];

function setLanguage(lang, btn) {
    currentLang = lang;
    document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    
    activeSentences = rawSentences.filter(s => s.language === lang);
    currentSentenceIndex = 0;
    renderCurrentSentence();
}

function renderCurrentSentence() {
    const display = document.getElementById('sentence-display');
    if (!display) return;
    display.innerHTML = '';
    currentStepIndex = -1;
    
    if (activeSentences.length === 0) {
        display.innerHTML = '<div style="color: #bdc3c7;">Нет предложений для этого языка.</div>';
        return;
    }

    const s = activeSentences[currentSentenceIndex];
    s.words.forEach((w, idx) => {
        const slot = document.createElement('div');
        slot.className = `word-slot role-${w.role}`;
        slot.dataset.role = w.role;
        
        const label = document.createElement('div');
        label.className = 'word-label';
        label.innerText = w.label;
        
        const box = document.createElement('div');
        box.className = 'word-box';
        
        if (w.parts && w.parts.length > 0) {
            w.parts.forEach((p, pIdx) => {
                const span = document.createElement('span');
                span.className = 'word-part' + (pIdx > 0 ? (pIdx === 1 ? ' ending' : ' suffix') : '');
                let textToSet = p;
                if (pIdx === 0 && w.text && w.text.length > 0 && textToSet.length > 0) {
                    const firstChar = w.text.charAt(0);
                    if (firstChar === firstChar.toUpperCase() && firstChar !== firstChar.toLowerCase()) {
                        textToSet = textToSet.charAt(0).toUpperCase() + textToSet.slice(1);
                    } else if (firstChar === firstChar.toLowerCase() && firstChar !== firstChar.toUpperCase()) {
                        textToSet = textToSet.charAt(0).toLowerCase() + textToSet.slice(1);
                    }
                }
                span.innerText = textToSet;
                box.appendChild(span);
            });
        } else {
            box.innerText = w.text || '';
        }
        
        const trans = document.createElement('div');
        trans.className = 'word-translation';
        trans.innerText = w.translation;
        
        slot.appendChild(label);
        slot.appendChild(box);
        slot.appendChild(trans);
        display.appendChild(slot);
    });

    // Update counter
    const progressSpan = document.getElementById('sentence-progress');
    if (progressSpan) {
        progressSpan.innerText = `Sentence ${currentSentenceIndex + 1} / ${activeSentences.length}`;
        progressSpan.style.display = 'inline-block';
    }
}

function runFlash() {
    if (activeSentences.length === 0) return;
    
    isFlashActive = true;
    const display = document.getElementById('sentence-display');
    display.classList.add('flash-mode');
    
    document.querySelectorAll('.word-slot').forEach(s => s.classList.add('visible'));
    currentStepIndex = -2; // Special state: All visible (Flash phase)
}

function handleDisplayClick() {
    if (activeSentences.length === 0) return;
    const display = document.getElementById('sentence-display');

    if (currentStepIndex === -2) {
        document.querySelectorAll('.word-slot').forEach(s => s.classList.remove('visible'));
        display.classList.remove('flash-mode');
        currentStepIndex = -1;
        isFlashActive = false;
        return;
    }

    currentStepIndex++;
    if (currentStepIndex >= roleOrder.length) return;
    
    const targetRole = roleOrder[currentStepIndex];
    const slots = document.querySelectorAll(`.word-slot[data-role="${targetRole}"]`);
    
    if (slots.length === 0) {
        handleDisplayClick(); // Skip empty roles
    } else {
        slots.forEach(s => s.classList.add('visible'));
    }
}

function toggleTranslation() {
    const display = document.getElementById('sentence-display');
    if (display) {
        display.classList.toggle('show-translation');
        document.getElementById('toggle-translation').classList.toggle('active');
    }
}

function nextSentence() {
    currentSentenceIndex = (currentSentenceIndex + 1) % activeSentences.length;
    renderCurrentSentence();
}

async function loadLanguageStickers() {
    const anchorNoteId = window.LANG_LEARN_ANCHOR_ID;
    if (!anchorNoteId || anchorNoteId === 0) return;

    const canvas = document.getElementById('languageStickersCanvas');
    if (!canvas) return;
    
    try {
        const stickers = await StickerService.getByParent('note', anchorNoteId);
        canvas.innerHTML = '';
        if (!stickers || stickers.length === 0) {
            canvas.innerHTML = '<div style="color: #bdc3c7; font-size: 0.8em; margin-left: 10px;">Заметок пока нет...</div>';
            return;
        }
        stickers.forEach(s => {
            const el = StickerRenderer.createStickerElement(s, { isWidget: true });
            canvas.appendChild(el);
        });
    } catch (err) {
        console.error("Stickers load error:", err);
        canvas.innerHTML = '<div style="color: #ff5252; font-size: 0.8em; margin-left: 10px;">Ошибка загрузки заметок</div>';
    }
}

function isLanguageActive(langName) {
    const activeCodes = window.P_ACTIVE_LANGUAGES || window.DASHBOARD_ACTIVE_LANGS || ['en', 'it', 'de'];
    const normName = langName.toLowerCase();
    
    const mapping = {
        'en': ['english'],
        'de': ['deutsch', 'german'],
        'it': ['italiano', 'italian'],
        'fr': ['français', 'french'],
        'es': ['español', 'spanish'],
        'kz': ['қазақша', 'kazakh', 'kz'],
        'kk': ['қазақша', 'kazakh', 'kk'],
        'la': ['latina', 'latin']
    };
    
    return activeCodes.some(code => {
        const lowerCode = code.toLowerCase();
        if (normName.includes(lowerCode)) return true;
        const aliases = mapping[lowerCode] || [];
        return aliases.some(alias => normName.includes(alias) || alias.includes(normName));
    });
}

function initLanguages() {
    const selector = document.getElementById('lang-selector');
    if (!selector || rawSentences.length === 0) return;

    let languages = [...new Set(rawSentences.map(s => s.language))]
        .filter(lang => isLanguageActive(lang));

    if (languages.length === 0) {
        languages = [...new Set(rawSentences.map(s => s.language))];
    }
    selector.innerHTML = '';
    
    languages.forEach((lang, idx) => {
        const btn = document.createElement('button');
        btn.className = 'lang-btn' + (idx === 0 ? ' active' : '');
        btn.innerText = lang;
        btn.onclick = (e) => setLanguage(lang, e.target);
        selector.appendChild(btn);
    });

    if (languages.length > 0) {
        setLanguage(languages[0]);
    }
}

export function openLanguageLearningModal() {
    const modal = document.getElementById('languageLearningModal');
    if (modal) {
        modal.style.display = 'flex';
        
        if (!isInitialized) {
            const dataElement = document.getElementById('sentences-data');
            if (dataElement) {
                try {
                    rawSentences = JSON.parse(dataElement.textContent);
                } catch (e) {
                    console.error("Failed to parse sentences JSON:", e);
                }
            }
            initLanguages();
            loadLanguageStickers();
            isInitialized = true;
        }
    }
}

window.openLanguageLearningModal = openLanguageLearningModal;

export function openLanguageLearningModalForSentence(sentenceId) {
    const modal = document.getElementById('languageLearningModal');
    if (modal) {
        modal.style.display = 'flex';
        
        if (!isInitialized) {
            const dataElement = document.getElementById('sentences-data');
            if (dataElement) {
                try {
                    rawSentences = JSON.parse(dataElement.textContent);
                } catch (e) {
                    console.error("Failed to parse sentences JSON:", e);
                }
            }
            initLanguages();
            loadLanguageStickers();
            isInitialized = true;
        }

        // Find the sentence
        const sentence = rawSentences.find(s => s.id === sentenceId);
        if (sentence) {
            // Set language to the sentence's language
            setLanguage(sentence.language, null);
            // setLanguage changes activeSentences and sets currentSentenceIndex = 0
            // Find index of our sentence in activeSentences
            const idx = activeSentences.findIndex(s => s.id === sentenceId);
            if (idx !== -1) {
                currentSentenceIndex = idx;
                renderCurrentSentence();
            }
        }
    }
}
window.openLanguageLearningModalForSentence = openLanguageLearningModalForSentence;

export function closeLanguageLearningModal() {
    const modal = document.getElementById('languageLearningModal');
    if (modal) modal.style.display = 'none';
}

window.closeLanguageLearningModal = closeLanguageLearningModal;

document.addEventListener('DOMContentLoaded', () => {
    window.addEventListener('stickersUpdated', (e) => {
        if (e.detail.parentType === 'note' && e.detail.parentId == window.LANG_LEARN_ANCHOR_ID) {
            loadLanguageStickers();
        }
    });
});
