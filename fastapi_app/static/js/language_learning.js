import { StickerService, StickerRenderer, StickerOverview, StickerModal } from "./stickers.js?v=17";

    // Expose to window for inline HTML onclicks
    window.openParentStickers = (type, id) => StickerOverview.open(type, id);
    window.openStickerModal = (params) => StickerModal.open(params);
    
    window.openLanguageStickerModal = function() {
        const anchorNoteId = window.LANG_ANCHORS ? window.LANG_ANCHORS[currentLang] : null;
        if (anchorNoteId) {
            openParentStickers('note', anchorNoteId);
        } else {
            console.warn("No anchor note ID found for language:", currentLang);
        }
    };

    window.toggleTranslation = toggleTranslation;
    window.runFlash = runFlash;
    window.nextSentence = nextSentence;
    window.setLanguage = setLanguage;
    window.handleDisplayClick = handleDisplayClick;
    window.openLanguageLearningModal = openLanguageLearningModal;
    window.openLanguageLearningModalForSentence = openLanguageLearningModal;
    window.closeLanguageLearningModal = closeLanguageLearningModal;



    const dataElement = document.getElementById('sentences-data');
    let rawSentences = [];
    try {
        rawSentences = dataElement ? JSON.parse(dataElement.textContent) : [];
    } catch (e) {
        console.error("Failed to parse sentences JSON:", e);
    }

    let currentLang = 'English';
    let currentSentenceIndex = 0;
    let activeSentences = [];
    let currentStepIndex = -1; // -1: hidden, 0: Step 1, etc.
    let isFlashActive = false;

    // Strict Order: Predicate -> Subject -> Attribute -> Attribute_Subject -> Object -> Attribute_Object -> Circumstance -> Adverbial
    const roleOrder = ['Predicate', 'Subject', 'Attribute', 'Attribute_Subject', 'Object', 'Attribute_Object', 'Circumstance', 'Adverbial'];

    function setLanguage(lang, btn) {
        currentLang = lang;
        document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
        if (btn) btn.classList.add('active');

        activeSentences = rawSentences.filter(s => s.language === lang);
        currentSentenceIndex = 0;
        renderCurrentSentence();
        loadLanguageStickers();
    }

    function renderCurrentSentence() {
        const display = document.getElementById('sentence-display');
        if (!display) return;
        display.innerHTML = '';
        currentStepIndex = -1;

        if (activeSentences.length === 0) {
            display.innerHTML = '<div style="color: #bdc3c7;">No sentences for this language.</div>';
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

        runFlash();
    }

    async function runFlash() {
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

        // Если сейчас активна "Вспышка" (все показано), то по клику всё скрываем
        if (currentStepIndex === -2) {
            document.querySelectorAll('.word-slot').forEach(s => s.classList.remove('visible'));
            display.classList.remove('flash-mode');
            currentStepIndex = -1; // Переходим в состояние "Всё скрыто"
            isFlashActive = false;
            // Переходим сразу к первому элементу (без return)
        }

        currentStepIndex++;
        if (currentStepIndex >= roleOrder.length) return;

        const targetRole = roleOrder[currentStepIndex];
        const slots = document.querySelectorAll(`.word-slot[data-role="${targetRole}"]`);

        if (slots.length === 0) {
            handleDisplayClick(); // Пропускаем пустые роли в последовательности
        } else {
            slots.forEach(s => s.classList.add('visible'));
        }
    }

    function toggleTranslation() {
        const display = document.getElementById('sentence-display');
        display.classList.toggle('show-translation');
        document.getElementById('toggle-translation').classList.toggle('active');
    }

    function nextSentence() {
        currentSentenceIndex = (currentSentenceIndex + 1) % activeSentences.length;
        renderCurrentSentence();
    }

    async function loadLanguageStickers() {
        const anchorNoteId = window.LANG_ANCHORS ? window.LANG_ANCHORS[currentLang] : null;
        console.log("Loading stickers for anchor:", anchorNoteId);
        if (!anchorNoteId || anchorNoteId === 0) {
            console.warn("Anchor Note ID is missing or 0");
            const canvas = document.getElementById('languageStickersCanvas');
            if (canvas) canvas.innerHTML = '<div style="color: #bdc3c7; font-size: 0.8em; margin-left: 10px;">No notes yet...</div>';
            return;
        }
        const canvas = document.getElementById('languageStickersCanvas');
        if (!canvas) return;

        try {
            const stickers = await StickerService.getByParent('note', anchorNoteId);
            console.log("Stickers fetched:", stickers.length);
            canvas.innerHTML = '';
            if (!stickers || stickers.length === 0) {
                canvas.innerHTML = '<div style="color: #bdc3c7; font-size: 0.8em; margin-left: 10px;">No notes yet...</div>';
                return;
            }
            stickers.forEach(s => {
                const el = StickerRenderer.createStickerElement(s, { isWidget: true });
                canvas.appendChild(el);
            });
        } catch (err) {
            console.error("Stickers load error:", err);
            canvas.innerHTML = '<div style="color: #ff5252; font-size: 0.8em; margin-left: 10px;">Error loading notes</div>';
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
            'kz': ['қазақша', 'kazakh', 'kz', 'kk'],
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

    function openLanguageLearningModal(sentenceId = null) {
        const modal = document.getElementById('languageLearningModal');
        if (!modal) return;
        modal.style.display = 'flex';

        if (sentenceId !== null) {
            const targetSentence = rawSentences.find(s => s.id == sentenceId);
            if (targetSentence) {
                setLanguage(targetSentence.language);
                const idx = activeSentences.findIndex(s => s.id == sentenceId);
                if (idx !== -1) {
                    currentSentenceIndex = idx;
                    renderCurrentSentence();
                }
            }
        } else {
            if (activeSentences.length === 0 && rawSentences.length > 0) {
                initLanguages();
            } else {
                renderCurrentSentence();
            }
        }
    }

    function closeLanguageLearningModal() {
        const modal = document.getElementById('languageLearningModal');
        if (modal) modal.style.display = 'none';
    }

    // Module script runs after DOM is parsed, but we use DOMContentLoaded for extra safety
    document.addEventListener('DOMContentLoaded', () => {
        initLanguages();
        loadLanguageStickers();

        window.addEventListener('stickersUpdated', (e) => {
            const anchorNoteId = window.LANG_ANCHORS ? window.LANG_ANCHORS[currentLang] : null;
            if (e.detail.parentType === 'note' && e.detail.parentId == anchorNoteId) {
                loadLanguageStickers();
            }
        });
    });
