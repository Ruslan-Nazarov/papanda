// @ts-check
/** @typedef {{id: string, side: string, html?: string, role?: string|null, status?: string, [key: string]: unknown}} NoteBlock */
/** @typedef {{id: string, title: string, text: string, color: string, created_at?: string|null}} NoteSticker */
/** @typedef {{id: number, revision: number, title: string, content_json: NoteBlock[], stickers?: NoteSticker[], category_id: number|null, status: string}} NoteResponse */
/** @typedef {'completed'|'partial'|'failed'|'cancelled'|'not_applicable'} RunStatus */
/** @typedef {{content: string, status: string, author?: string}} GeneratedStep */
/** @typedef {{run_id: string, status: RunStatus, source_revision: number|null, updated_steps: Record<string, GeneratedStep>, replace_bases: string[]}} GenerationResponse */

/** @param {unknown} value @returns {Record<string, unknown>} */
function object(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('Expected API object');
    return /** @type {Record<string, unknown>} */ (value);
}

/** @param {unknown} value @returns {NoteResponse} */
export function noteResponse(value) {
    const note = object(value);
    if (!Number.isInteger(note.id) || !Number.isInteger(note.revision) || Number(note.revision) < 1
        || typeof note.title !== 'string' || !Array.isArray(note.content_json)) throw new TypeError('Invalid note response');
    for (const item of note.content_json) {
        const block = object(item);
        if (typeof block.id !== 'string' || typeof block.side !== 'string') throw new TypeError('Invalid note block');
    }
    if (note.stickers !== undefined) {
        if (!Array.isArray(note.stickers)) throw new TypeError('Invalid note stickers');
        for (const item of note.stickers) {
            const sticker = object(item);
            if (typeof sticker.id !== 'string' || typeof sticker.title !== 'string'
                || typeof sticker.text !== 'string' || !/^#[a-fA-F0-9]{6}$/.test(String(sticker.color))) {
                throw new TypeError('Invalid note sticker');
            }
        }
    }
    return /** @type {NoteResponse} */ (note);
}

/** @param {unknown} value @returns {GenerationResponse} */
export function generationResponse(value) {
    const result = object(value);
    if (typeof result.run_id !== 'string' || !['completed', 'partial', 'failed', 'cancelled', 'not_applicable'].includes(String(result.status))
        || !(result.source_revision === null || Number.isInteger(result.source_revision))
        || !Array.isArray(result.replace_bases) || result.replace_bases.some(key => !/^[1-5]$/.test(key))) {
        throw new TypeError('Invalid generation response');
    }
    for (const [key, item] of Object.entries(object(result.updated_steps))) {
        const step = object(item);
        if (!/^step[1-5](?:\.[1-9][0-9]*)?$/.test(key) || typeof step.content !== 'string'
            || !['in_progress', 'ready'].includes(String(step.status))) throw new TypeError('Invalid generated step');
    }
    return /** @type {GenerationResponse} */ (result);
}

const ApiContracts = {noteResponse, generationResponse};
export default ApiContracts;
