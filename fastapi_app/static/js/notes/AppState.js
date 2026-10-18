import NoteStore from './NoteStore.js';

// localStorage cleanup
try {
    localStorage.removeItem('dialectics_dismissed_hints');
} catch {}

const AppState = {
    store: new NoteStore((name, detail) => {
        AppState.updateProgress();
        document.dispatchEvent(new CustomEvent(name, {detail}));
    }),
    get currentNote() { return this.store.note; },
    get isDirty() { return this.store.dirty; },
    get editRevision() { return this.store.editRevision; },
    get documentEpoch() { return this.store.epoch; },
    _dismissedHints: [],

    get dismissedHints() {
        return this._dismissedHints || [];
    },

    dismissHint(role) {
        if (!this._dismissedHints.includes(role)) {
            this._dismissedHints.push(role);
        }
    },

    // Режим работы приложения: 'ai' (ИИ генерирует конспект) | 'manual' (ручной ввод по алгоритму).
    // Управляется ModeManager; isAutoFillEnabled держим синхронно (на него завязан старый код).
    mode: 'manual',
    isAutoFillEnabled: false,
    isAutoFillStepByStep: false,

    setNote(note) {
        this._dismissedHints = [];
        return this.store.open(note);
    },

    updateNote(patch) { this.store.update(patch); },
    setViewMetadata(patch) { this.store.metadata(patch); },
    acceptSaveIdentity(note, response) { this.store.acceptIdentity(note, response); },
    acceptSaved(note, response, payload) { this.store.acceptSaved(note, response, payload); },

    normalizeBlockStatus(status) {
        return status === 'ready' || status === 'done' ? 'ready' : 'in_progress';
    },

    getBlock(blockId) {
        return (this.currentNote.blocks || []).find(b => b.id === blockId);
    },

    updateBlock(blockId, updates) { this.store.updateBlock(blockId, updates); },
    blockHistory(blockId) { return this.store.blockHistory(blockId); },
    previousBlockVersions(blockId) { return this.store.previousBlockVersions(blockId); },
    restoreBlockVersion(blockId, direction) { return this.store.restoreBlockVersion(blockId, direction); },
    addBlock(block, index = -1) { this.store.addBlock(block, index); },
    removeBlock(blockId) { this.store.removeBlock(blockId); },
    markDirty() { this.store.touch(); },

    updateProgress() {
        const blocks = this.currentNote.blocks.filter(b => b.role !== 'section' && !b.isDraft);
        if (blocks.length === 0) {
            document.dispatchEvent(new CustomEvent('progressUpdated', { detail: { percent: 0, text: '0/0' } }));
            return;
        }
        
        let readyCount = 0;
        let total = blocks.length;
        blocks.forEach(b => {
            if (this.normalizeBlockStatus(b.status) === 'ready') readyCount += 1;
            else readyCount += 0.5;
        });

        const percent = Math.round((readyCount / total) * 100);
        document.dispatchEvent(new CustomEvent('progressUpdated', { detail: { percent, text: `${Math.floor(readyCount)}/${total}` } }));
    }
};

export default AppState;
