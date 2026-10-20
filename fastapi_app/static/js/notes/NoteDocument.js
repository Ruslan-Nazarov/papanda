// The writable document contract shared by saves and generated copies.
// Identity, revision, publication tokens and UI state belong to their callers.
class NoteDocument {
    /** @param {Partial<import('./ApiContracts.js').NotePayload>} note
     * @returns {import('./ApiContracts.js').NotePayload} */
    static payload(note) {
        /** @type {import('./ApiContracts.js').NotePayload} */
        const payload = {
            title: note.title || '', note_notice: note.note_notice || '',
            blocks: note.blocks || [], stickers: note.stickers || [],
            dictionary: note.dictionary || [], dictionary_tags: note.dictionary_tags || [],
            math_symbols: note.math_symbols || [],
            category_id: note.category_id ?? null, status: note.status || 'in_progress',
        };
        return JSON.parse(JSON.stringify(payload));
    }
}

export default NoteDocument;
