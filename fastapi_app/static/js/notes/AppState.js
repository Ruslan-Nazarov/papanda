// localStorage cleanup
try {
    localStorage.removeItem('dialectics_dismissed_hints');
} catch {}

const AppState = {
    currentNote: {
        id: null,
        title: '',
        blocks: [],
        category_id: null,
        status: 'none'
    },
    isDirty: false,
    editRevision: 0,
    documentEpoch: 0,
    _dismissedHints: [],

    get dismissedHints() {
        return this._dismissedHints || [];
    },

    dismissHint(role) {
        if (!this._dismissedHints.includes(role)) {
            this._dismissedHints.push(role);
        }
    },

    // Flag to show all hints including dismissed ones (toggled via UI)
    toggleShowHiddenHints: false,
    
    // Режим работы приложения: 'ai' (ИИ генерирует конспект) | 'manual' (ручной ввод по алгоритму).
    // Управляется ModeManager; isAutoFillEnabled держим синхронно (на него завязан старый код).
    mode: 'manual',
    isAutoFillEnabled: false,
    isAutoFillStepByStep: false,

    setNote(note) {
        this.documentEpoch += 1;
        this.editRevision = 0;
        const blocks = note.content_json || note.blocks || [];
        this.currentNote = {
            id: note.id,
            revision: note.revision ?? null,
            schema_version: note.schema_version || 1,
            title: note.title || '',
            blocks: Array.isArray(blocks) ? blocks.map(block => ({
                ...block, status: this.normalizeBlockStatus(block.status)
            })) : [],
            category_id: note.category_id,
            status: note.status || 'none'
        };
        this._dismissedHints = [];
        this.isDirty = false;
        this.updateProgress();
        document.dispatchEvent(new CustomEvent('noteLoaded', { detail: this.currentNote }));
    },

    normalizeBlockStatus(status) {
        return status === 'draft' ? 'in_progress' : (status || 'none');
    },

    getBlock(blockId) {
        return (this.currentNote.blocks || []).find(b => b.id === blockId);
    },

    updateBlock(blockId, updates) {
        const block = this.getBlock(blockId);
        if (block) {
            Object.assign(block, updates);
            this.markDirty();
        }
    },
    
    addBlock(block, index = -1) {
        if (index >= 0 && index <= this.currentNote.blocks.length) {
            this.currentNote.blocks.splice(index, 0, block);
        } else {
            this.currentNote.blocks.push(block);
        }
        this.markDirty();
        document.dispatchEvent(new CustomEvent('blockAdded', { detail: block }));
    },
    
    removeBlock(blockId) {
        this.currentNote.blocks = this.currentNote.blocks.filter(b => b.id !== blockId);
        this.markDirty();
    },

    markDirty() {
        this.editRevision += 1;
        this.isDirty = true;
        this.updateProgress();
        document.dispatchEvent(new Event('stateDirty'));
    },

    updateProgress() {
        const blocks = this.currentNote.blocks.filter(b => b.role !== 'section' && !b.isDraft);
        if (blocks.length === 0) {
            document.dispatchEvent(new CustomEvent('progressUpdated', { detail: { percent: 0, text: '0/0' } }));
            return;
        }
        
        let readyCount = 0;
        let total = blocks.length;
        blocks.forEach(b => {
            if (b.status === 'ready' || b.status === 'done') readyCount += 1;
            else if (b.status === 'in_progress') readyCount += 0.5;
        });

        const percent = Math.round((readyCount / total) * 100);
        document.dispatchEvent(new CustomEvent('progressUpdated', { detail: { percent, text: `${Math.floor(readyCount)}/${total}` } }));
    }
};

export default AppState;
