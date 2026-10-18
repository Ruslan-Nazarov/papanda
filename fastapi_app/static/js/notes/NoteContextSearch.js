import NoteText from './NoteText.js';

// Search stays on the device. Only bounded excerpts go into the model context.
const STOP_WORDS = new Set(('и в во на с со к по из за от до у а но или для при это этой этот эти ' +
    'как что чтобы где когда почему зачем какой какая какие такое здесь уже только есть был была ' +
    'его ее их мы вы он она они не о об же то да все чем между через над под ' +
    'the a an and or of to in on at for from with is are was were it this that these those ' +
    'what why how when where which explain about does do be by as you your ' +
    'және бұл осы үшін не қалай қайда мен').split(' '));

class NoteContextSearch {
    constructor(blocks, {dictionary = [], versions = [], linkedNotes = []} = {}) {
        this.chunks = [];
        this.frequencies = new Map();
        this.links = [];
        for (const block of blocks || []) {
            if (!block.id || block.role === 'section') continue;
            const title = NoteText.excerpt(NoteText.fromHtml(block.title || ''), 0, 500);
            const metadata = {block_id: String(block.id), title};
            this.add({...metadata, ...(block.isDraft ? {kind: 'draft'} : {})}, NoteText.fromHtml(block.html || ''));
            for (const [index, draft] of (block.rejected_drafts || []).entries()) {
                this.add({...metadata, kind: 'draft', reference: String(draft.id || index + 1),
                    title: NoteText.excerpt(`${title} · ${index + 1}`, 0, 500), reason: (draft.reason || '').slice(0, 2000)},
                NoteText.fromHtml(draft.html || ''));
            }
            for (const source of block.sources || []) {
                const url = typeof source.url === 'string' ? source.url.slice(0, 2000) : '';
                const link = {...metadata, kind: 'link', url,
                    title: NoteText.excerpt(source.title || url || title, 0, 500),
                    reference: source.quote ? 'saved_quote' : 'saved_link'};
                this.links.push(link);
                this.add(link, `${link.title}\n${url}\n${source.quote || ''}`);
            }
            const template = document.createElement('template');
            template.innerHTML = block.html || '';
            for (const anchor of template.content.querySelectorAll('a[href]')) {
                let targets = [];
                try {
                    const parsed = JSON.parse(anchor.getAttribute('data-internal-links') || '[]');
                    if (Array.isArray(parsed)) targets = parsed;
                } catch { /* A malformed multi-link still has its primary href. */ }
                targets = [{url: anchor.getAttribute('href'), text: anchor.textContent}, ...targets];
                for (const target of targets) {
                    const url = typeof target?.url === 'string' ? target.url : '';
                    if (!/^(https?:\/\/|internal:\/\/note\/[a-zA-Z0-9_-]+(?:\/block\/[a-zA-Z0-9_-]+)?$)/.test(url)) continue;
                    if (this.links.some(link => link.url === url && link.block_id === metadata.block_id)) continue;
                    const link = {...metadata, kind: 'link', url: url.slice(0, 2000),
                        title: NoteText.excerpt(String(target.text || anchor.textContent || title), 0, 500)};
                    this.links.push(link);
                    this.add(link, `${link.title}\n${link.url}\n${NoteText.excerpt(NoteText.fromHtml(block.html || ''), 0, 600)}`);
                }
            }
        }
        for (const entry of dictionary) {
            this.add({block_id: '', kind: 'dictionary', title: NoteText.excerpt(entry.word || '', 0, 500),
                reference: (entry.word || '').slice(0, 500)},
            `${entry.word || ''}\n${entry.definition || ''}\n${entry.connections || ''}\n` +
                Object.entries(entry.connection_explanations || {}).map(([word, explanation]) => `${word}: ${explanation}`).join('\n'));
        }
        for (const {block_id, snapshots} of versions) {
            snapshots.forEach((snapshot, index) => this.add({block_id: String(block_id), kind: 'version',
                title: NoteText.excerpt(NoteText.fromHtml(snapshot.title || ''), 0, 500), reference: String(index + 1)},
            NoteText.fromHtml(snapshot.html || '')));
        }
        for (const {link, note} of linkedNotes) {
            const match = link.url.match(/\/block\/([a-zA-Z0-9_-]+)$/);
            for (const block of note.content_json || note.blocks || []) {
                if (block.isDraft || block.role === 'section' || (match && String(block.id) !== match[1])) continue;
                this.add({...link, title: NoteText.excerpt(`${note.title || ''} → ${NoteText.fromHtml(block.title || '')}`, 0, 500),
                    reference: 'linked_content'}, NoteText.fromHtml(block.html || ''));
            }
        }
        this.averageLength = this.chunks.reduce((sum, chunk) => sum + chunk.length, 0) / (this.chunks.length || 1);
    }

    add(metadata, text) {
        const {title} = metadata;
        const ranges = NoteText.mathRanges(text);
        const seen = new Set();
        // Overlap preserves definitions crossing a chunk boundary, including
        // material near the end of a long block.
        for (let offset = 0; offset < text.length; offset += 1020) {
            // Excerpts also appear in previews: never expose half a formula
            // or an unmatched closing delimiter at a chunk boundary.
            const excerpt = NoteText.excerpt(text, offset, 1200, ranges);
            if (!excerpt || seen.has(excerpt)) continue;
            seen.add(excerpt);
            const terms = new Map();
            for (const term of this.terms(title + '\n' + excerpt + '\n' + (metadata.reason || ''))) {
                terms.set(term, (terms.get(term) || 0) + 1);
            }
            for (const term of terms.keys()) this.frequencies.set(term, (this.frequencies.get(term) || 0) + 1);
            this.chunks.push({...metadata, text: excerpt, terms,
                length: Array.from(terms.values()).reduce((sum, count) => sum + count, 0)});
            if (offset + 1200 >= text.length) break;
        }
    }

    terms(text) {
        return (text.toLowerCase().replace(/ё/g, 'е').match(/[\p{L}\p{N}_]+/gu) || [])
            .filter(word => word.length > 2 && !STOP_WORDS.has(word))
            // A light prefix match covers common inflections (скрытый/скрытых,
            // состояние/состояния). This is lexical search, not embeddings.
            .map(word => /^[а-я]+$/.test(word) ? word.slice(0, 5) : word.replace(/s$/, ''));
    }

    search({text = '', question = '', title = '', context = '', blockId = ''}) {
        const weights = new Map();
        for (const [value, weight] of [[context, 0.35], [title, 1], [text, 3], [question, 5]]) {
            for (const term of new Set(this.terms(value))) weights.set(term, Math.max(weights.get(term) || 0, weight));
        }
        const ranked = this.chunks.filter(chunk => chunk.kind || chunk.block_id !== String(blockId)).map(chunk => {
            let score = 0;
            for (const [term, weight] of weights) {
                const frequency = chunk.terms.get(term) || 0;
                if (!frequency) continue;
                const idf = Math.log(1 + (this.chunks.length - this.frequencies.get(term) + 0.5) /
                    (this.frequencies.get(term) + 0.5));
                score += weight * idf * frequency * 2.2 /
                    (frequency + 1.2 * (0.25 + 0.75 * chunk.length / (this.averageLength || 1)));
            }
            // The selected block's earlier text is useful even when terminology
            // changed during a rewrite. Keep it available for comparison.
            if (['draft', 'version'].includes(chunk.kind) && chunk.block_id === String(blockId)) score += 2;
            if (chunk.kind === 'dictionary') score *= 1.4;
            if (chunk.kind === 'link' && chunk.reference === 'linked_content') score *= 1.2;
            if (chunk.kind === 'link' && chunk.reference === 'saved_quote') score *= 1.1;
            return {chunk, score};
        }).filter(hit => hit.score > 0).sort((a, b) => b.score - a.score);
        const result = [];
        const counts = new Map();
        const firstOfKind = new Set();
        const diverse = ranked.filter(({chunk}) => {
            const kind = chunk.kind || 'block';
            if (firstOfKind.has(kind)) return false;
            firstOfKind.add(kind);
            return true;
        });
        for (const {chunk} of [...diverse, ...ranked.filter(hit => !diverse.includes(hit))]) {
            // Allow two passages from a block, leaving room for other blocks.
            const key = `${chunk.kind || 'block'}:${chunk.block_id}:${chunk.reference || chunk.url || ''}`;
            if ((counts.get(key) || 0) >= 2) continue;
            const {terms: _terms, length: _length, ...source} = chunk;
            result.push(source);
            counts.set(key, (counts.get(key) || 0) + 1);
            if (result.length === 5) break;
        }
        return result;
    }
}

export default NoteContextSearch;
