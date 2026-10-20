import NoteDocument from './NoteDocument.js';

/** Parsing and portability rules for the versioned full Markdown export. */
class NoteSnapshot {
    static MAX_BYTES = 8 * 1024 * 1024;

    /** @param {string} text @returns {import('./ApiContracts.js').NotePayload} */
    static parse(text) {
        if (new TextEncoder().encode(text).length > this.MAX_BYTES) throw new Error('snapshot_too_large');
        let json = text.trim();
        if (!json.startsWith('{')) {
            // The archive is the final fenced block. Match its exact opening fence;
            // Markdown examples and backticks inside JSON strings are not delimiters.
            const lines = json.split(/\r?\n/);
            const fence = lines.pop();
            if (!fence || !/^`{3,}$/.test(fence)) throw new Error('snapshot_invalid');
            const start = lines.lastIndexOf(`${fence}json`);
            if (start < 0) throw new Error('snapshot_invalid');
            json = lines.slice(start + 1).join('\n');
        }
        let envelope;
        try { envelope = JSON.parse(json); } catch { throw new Error('snapshot_invalid'); }
        if (!envelope || envelope.format !== 'conspect-snapshot') throw new Error('snapshot_invalid');
        if (envelope.version !== 1) throw new Error('snapshot_version');
        const note = envelope.note;
        if (note?.schema_version !== undefined && note.schema_version !== 1) throw new Error('snapshot_version');
        if (!note || typeof note !== 'object' || Array.isArray(note)
            || typeof note.title !== 'string' || !Array.isArray(note.blocks)
            || note.blocks.some(/** @param {unknown} block */ block =>
                !block || typeof block !== 'object' || Array.isArray(block))) throw new Error('snapshot_invalid');
        for (const key of ['stickers', 'dictionary', 'dictionary_tags', 'math_symbols']) {
            if (note[key] !== undefined && !Array.isArray(note[key])) throw new Error('snapshot_invalid');
        }
        if ((note.note_notice !== undefined && typeof note.note_notice !== 'string')
            || (note.status !== undefined && typeof note.status !== 'string')) throw new Error('snapshot_invalid');
        // The save endpoint validates every nested field and sanitizes HTML.
        const payload = NoteDocument.payload(note);
        payload.category_id = null;
        return payload;
    }

    /** Disconnect instance-local references, keeping their visible text.
     * Block IDs and derivation references within the document remain intact.
     * @param {import('./ApiContracts.js').NotePayload} payload */
    static detachReferences(payload) {
        /** @param {unknown} value @returns {unknown} */
        const visit = value => {
            if (typeof value === 'string') {
                // Decode HTML attributes too: entity-encoded links must not
                // accidentally open a matching ID in this installation.
                const reference = /internal:\/\/note\//gi;
                let text = value.replace(/\[((?:\\.|[^\]\\])*)\]\(internal:\/\/note\/[a-zA-Z0-9_-]+(?:\/block\/[a-zA-Z0-9_-]+)?\)/gi, '$1')
                    .replace(reference, 'archive-reference:note/');
                if (text.includes('<')) {
                    const template = document.createElement('template');
                    template.innerHTML = text;
                    let changed = false;
                    for (const element of template.content.querySelectorAll('*')) {
                        for (const attr of [...element.attributes]) {
                            const detached = attr.value.replace(reference, 'archive-reference:note/');
                            if (attr.name === 'href' && detached.startsWith('archive-reference:')) {
                                element.removeAttribute(attr.name);
                                changed = true;
                            } else if (detached !== attr.value) {
                                element.setAttribute(attr.name, detached);
                                changed = true;
                            }
                        }
                    }
                    if (changed) text = template.innerHTML;
                }
                return text;
            }
            if (Array.isArray(value)) return value.map(visit);
            if (value && typeof value === 'object') {
                return Object.fromEntries(Object.entries(value).map(([key, item]) =>
                    [key, key === 'included_conspects' ? [] : visit(item)]));
            }
            return value;
        };
        return /** @type {import('./ApiContracts.js').NotePayload} */ (visit(payload));
    }
}

export default NoteSnapshot;
