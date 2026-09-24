import { inferRoleFromTitle, ALGORITHM_STEPS } from './BlockConstants.js';

const clone = value => JSON.parse(JSON.stringify(value));

// Stable document identity for in-flight saves, read-only views for consumers.
class NoteStore {
    #records = new WeakMap();
    #current;
    #epoch = 0;
    #notify;

    constructor(notify = () => {}) {
        this.#notify = notify;
        this.open({id: null, title: '', blocks: []}, false);
    }

    #readonly(object, cache = new WeakMap()) {
        if (!object || typeof object !== 'object') return object;
        if (!cache.has(object)) cache.set(object, new Proxy(object, {
            get: (target, key) => this.#readonly(Reflect.get(target, key), cache),
            set() {throw new TypeError('Use NoteStore commands to change a document');},
            deleteProperty() {throw new TypeError('Use NoteStore commands to change a document');},
            defineProperty() {throw new TypeError('Use NoteStore commands to change a document');},
        }));
        return cache.get(object);
    }

    get note() { return this.#current.view; }
    get dirty() { return this.#current.dirty; }
    get editRevision() { return this.#current.revision; }
    get epoch() { return this.#epoch; }

    open(note, notify = true) {
        const blocks = note.content_json || note.blocks || [];
        const data = {id: note.id ?? null, revision: note.revision ?? null, schema_version: note.schema_version || 1,
            title: note.title || '', category_id: note.category_id ?? null, status: note.status || 'none',
            stickers: clone(note.stickers || []),
            blocks: clone(Array.isArray(blocks) ? blocks : []).map(block => ({...block,
                status: block.status === 'draft' ? 'in_progress' : block.status || 'none',
                role: block.role || inferRoleFromTitle(block),
                side: (block.role || inferRoleFromTitle(block)) === 'anchor' ? 'left' : block.side
                    || ALGORITHM_STEPS.find(step => step.role === inferRoleFromTitle(block))?.side || 'center'}))};
        const record = {data, view: this.#readonly(data), dirty: false, revision: 0};
        this.#current = record;
        this.#records.set(record.view, record);
        this.#epoch++;
        if (notify) this.#notify('noteOpened', record.view);
        return record.view;
    }

    touch() {
        this.#current.dirty = true;
        this.#current.revision++;
        this.#notify('stateDirty', this.note);
    }

    update(patch) {
        if (!Object.entries(patch).some(([key, value]) => JSON.stringify(this.#current.data[key]) !== JSON.stringify(value))) return;
        Object.assign(this.#current.data, clone(patch));
        this.touch();
    }

    updateBlock(id, patch) {
        const block = this.#current.data.blocks.find(item => item.id === id);
        if (!block || !Object.entries(patch).some(([key, value]) => JSON.stringify(block[key]) !== JSON.stringify(value))) return;
        Object.assign(block, clone(patch));
        this.touch();
    }

    addBlock(block, index = -1) {
        const blocks = this.#current.data.blocks;
        blocks.splice(index >= 0 && index <= blocks.length ? index : blocks.length, 0, clone(block));
        this.touch();
        this.#notify('blockAdded', this.note.blocks.find(item => item.id === block.id));
    }

    removeBlock(id) { this.update({blocks: this.note.blocks.filter(block => block.id !== id)}); }

    metadata(patch) { Object.assign(this.#current.data, clone(patch)); }

    acceptIdentity(note, response) {
        const record = this.#records.get(note);
        if (record) Object.assign(record.data, {id: response.id, revision: response.revision});
    }

    acceptSaved(note, response, payload) {
        const record = this.#records.get(note);
        if (!record) return;
        // Existing render handlers retain block views across autosaves.
        const previous = new Map(record.data.blocks.map(block => [block.id, block]));
        const blocks = clone(response.content_json || response.blocks || payload.blocks).map(block => {
            const target = previous.get(block.id);
            if (!target) return block;
            for (const key of Object.keys(target)) if (!(key in block)) delete target[key];
            return Object.assign(target, block);
        });
        Object.assign(record.data, clone({title: response.title ?? note.title,
            stickers: response.stickers ?? note.stickers ?? [],
            category_id: response.category_id ?? null, status: response.status || note.status}));
        record.data.blocks = blocks;
        record.dirty = false;
        if (record === this.#current) this.#notify('noteSaved', note);
    }
}

export default NoteStore;
