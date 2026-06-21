const ROLES = [
    "Predicate", "Subject", "Attribute", "Attribute_Subject", "Attribute_Object", 
    "Object", "Circumstance", "Adverbial", "Conjunction", ""
];

function generateRoleOptions(selected) {
    return ROLES.map(r => `<option value="${r}" ${r === selected ? 'selected' : ''}>${r || 'None'}</option>`).join('');
}

window.openSentenceEditor = function(isNew) {
    const modal = document.getElementById('sentenceEditorModal');
    if (!modal) return;
    
    const title = document.getElementById('se-modal-title');
    const idInput = document.getElementById('se-id');
    const langInput = document.getElementById('se-lang');
    const sentInput = document.getElementById('se-sentence');
    const list = document.getElementById('se-words-list');
    const status = document.getElementById('se-status');
    
    status.innerText = '';
    list.innerHTML = '';
    
    if (isNew) {
        title.innerText = 'New Sentence';
        idInput.value = '';
        sentInput.value = '';
        // try to guess language from current ui if available
        langInput.value = window.currentLang || 'English'; 
    } else {
        title.innerText = 'Edit Sentence';
        // We need to get the current sentence data from rawSentences
        if (typeof window.rawSentences !== 'undefined' && typeof window.currentSentenceIndex !== 'undefined') {
            const activeSents = window.rawSentences.filter(s => s.language === window.currentLang);
            const current = activeSents[window.currentSentenceIndex];
            if (current) {
                idInput.value = current.id || '';
                langInput.value = current.language || '';
                sentInput.value = current.sentence || '';
                
                if (current.words && Array.isArray(current.words)) {
                    current.words.forEach(w => window.seAddWordBlock(w));
                }
            } else {
                alert(window._("toast.no_sentence_selected"));
                return;
            }
        } else {
            alert(window._("toast.sentence_data_not_found_in_con"));
            return;
        }
    }
    
    modal.style.display = 'flex';
};

window.closeSentenceEditor = function() {
    const modal = document.getElementById('sentenceEditorModal');
    if (modal) modal.style.display = 'none';
};

window.seAddWordBlock = function(wordData = null) {
    const list = document.getElementById('se-words-list');
    const div = document.createElement('div');
    div.className = 'se-word-block';
    
    const data = wordData || { text: '', dictionary_word: '', translation: '', role: '', label: '', parts: [] };
    const partsStr = (data.parts || []).join(',');
    
    div.innerHTML = `
        <span class="remove-word-btn" onclick="this.parentElement.remove()">✕</span>
        
        <div class="se-word-field">
            <label>Text</label>
            <input type="text" class="sw-text" value="${data.text.replace(/"/g, '&quot;')}">
        </div>
        <div class="se-word-field">
            <label>Dictionary Form</label>
            <input type="text" class="sw-dict" value="${(data.dictionary_word||'').replace(/"/g, '&quot;')}">
        </div>
        <div class="se-word-field">
            <label>Translation</label>
            <input type="text" class="sw-trans" value="${(data.translation||'').replace(/"/g, '&quot;')}">
        </div>
        <div class="se-word-field">
            <label>Role</label>
            <select class="sw-role">${generateRoleOptions(data.role)}</select>
        </div>
        <div class="se-word-field" style="flex: 0 0 100px;">
            <label>Label</label>
            <input type="text" class="sw-label" value="${(data.label||'').replace(/"/g, '&quot;')}" placeholder="e.g. V, N">
        </div>
        <div class="se-word-field" style="flex: 1 1 100%;">
            <label>Parts (comma separated: root,suffix,ending)</label>
            <input type="text" class="sw-parts" value="${partsStr.replace(/"/g, '&quot;')}">
        </div>
    `;
    list.appendChild(div);
};

window.seParseWords = function() {
    const sent = document.getElementById('se-sentence').value.trim();
    if (!sent) return;
    
    const words = sent.split(/\s+/);
    const list = document.getElementById('se-words-list');
    list.innerHTML = '';
    
    words.forEach(w => {
        // basic cleanup for parts guessing
        let clean = w.replace(/[.,!?;:"'—–-]$/, '');
        window.seAddWordBlock({
            text: w,
            dictionary_word: clean.toLowerCase(),
            parts: [clean],
            role: '',
            label: '',
            translation: ''
        });
    });
};

window.seSaveSentence = async function() {
    const status = document.getElementById('se-status');
    status.style.color = '#333';
    status.innerText = 'Saving...';
    
    const id = document.getElementById('se-id').value;
    const lang = document.getElementById('se-lang').value.trim();
    const sent = document.getElementById('se-sentence').value.trim();
    
    if (!lang || !sent) {
        status.style.color = '#e74c3c';
        status.innerText = 'Language and Sentence are required.';
        return;
    }
    
    const blocks = document.querySelectorAll('.se-word-block');
    const words = [];
    
    blocks.forEach(b => {
        const partsStr = b.querySelector('.sw-parts').value;
        const parts = partsStr.split(',').map(p => p.trim()).filter(p => p.length > 0);
        
        words.push({
            text: b.querySelector('.sw-text').value,
            dictionary_word: b.querySelector('.sw-dict').value,
            translation: b.querySelector('.sw-trans').value,
            role: b.querySelector('.sw-role').value,
            label: b.querySelector('.sw-label').value,
            parts: parts
        });
    });
    
    if (words.length === 0) {
        status.style.color = '#e74c3c';
        status.innerText = 'Add at least one word.';
        return;
    }
    
    const payload = {
        language: lang,
        sentence: sent,
        words: words
    };
    if (id) payload.id = id;
    
    try {
        const resp = await fetch('/api/sentences/upsert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const data = await resp.json();
        if (resp.ok) {
            status.style.color = '#2ecc71';
            status.innerText = 'Saved!';
            
            // Reload the sentence trainer data
            // We can just fetch from /api/sentences and update window.rawSentences
            const getResp = await fetch('/api/sentences');
            if (getResp.ok) {
                const getData = await getResp.json();
                if (window.rawSentences) {
                    window.rawSentences = getData.sentences || [];
                    if (window.setLanguage) {
                        window.setLanguage(lang);
                    }
                }
            }
            
            setTimeout(() => window.closeSentenceEditor(), 1000);
        } else {
            status.style.color = '#e74c3c';
            status.innerText = 'Error: ' + data.message;
        }
    } catch (err) {
        status.style.color = '#e74c3c';
        status.innerText = 'Error: ' + err.message;
    }
};
