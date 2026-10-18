import MathSymbols from './MathSymbols.js';
import NoteText from './NoteText.js';
import NoteContextSearch from './NoteContextSearch.js';

class MathDefinitionContext {
    static target(element, symbol, number, originals = []) {
        const math = element.closest('.katex');
        const formula = math?.querySelector('annotation[encoding="application/x-tex"]')?.textContent || '';
        if (!originals.length && math?.dataset.mathOriginal) {
            try {
                const parsed = JSON.parse(MathSymbols.decode(math.dataset.mathOriginal));
                if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) originals = parsed;
            }
            catch { /* Imported metadata may be incomplete. */ }
        }
        return {formula, symbol: symbol || '', value: number?.value || '',
            ...(number ? {start: number.start, end: number.end} : {}),
            original_formulas: originals.slice(0, 3)};
    }

    static sameNumber(entry, target) {
        return entry.formula === target.formula && entry.start === target.start
            && entry.end === target.end && entry.value === target.value;
    }

    static build(note, blockId, target) {
        // Reuse formula-safe excerpts, including definitions far down a long block.
        // Drafts are excluded: an abandoned explanation must not become evidence.
        const blocks = note.blocks.filter(block => !block.isDraft && block.role !== 'section').map(block => {
            const definitions = [...(note.math_symbols || []), ...(block.math_symbols || [])];
            const text = definitions.map(entry => `$${entry.symbol}$: ${entry.definition}`).join('\n');
            const wrapper = document.createElement('p');
            wrapper.textContent = text;
            return {...block, rejected_drafts: [], sources: [], html: (block.html || '') + wrapper.outerHTML};
        });
        const index = new NoteContextSearch(blocks);
        const current = blocks.find(block => block.id === blockId);
        const lexical = index.search({text: target.symbol + ' ' + target.value,
            title: NoteText.fromHtml(current?.title || ''), context: target.formula, blockId});
        const keys = new Set([target.symbol, MathSymbols.atoms(target.symbol)[0]?.base].filter(Boolean).map(value => MathSymbols.normalize(value)));
        const related = new Set([target.formula, ...(target.original_formulas || [])]
            .flatMap(formula => MathSymbols.candidates(formula).map(item => item.symbol)));
        const currentIndex = blocks.findIndex(block => block.id === blockId);
        const plainSymbols = [target.symbol, MathSymbols.atoms(target.symbol)[0]?.base].filter(Boolean)
            .map(value => new RegExp(`(?<![\\p{L}\\p{N}_\\\\])${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}_])`, 'u'));
        const exact = chunk => {
            if (target.value && chunk.text.includes(target.value)) return 10;
            if (plainSymbols.some(pattern => pattern.test(chunk.text))) return 8;
            // Single-letter symbols are meaningful here; ordinary prose search
            // deliberately excludes them. Compare complete TeX atoms, not substrings.
            const symbols = NoteText.mathRanges(chunk.text).flatMap(range => MathSymbols.candidates(chunk.text.slice(range.start, range.end)));
            if (symbols.some(item => keys.has(item.symbol))) return 8;
            return symbols.some(item => related.has(item.symbol)) ? 2 : 0;
        };
        const ranked = index.chunks.filter(chunk => !chunk.kind).map(chunk => {
            const lexicalRank = lexical.findIndex(item => item.block_id === chunk.block_id && item.text === chunk.text);
            const distance = Math.abs(blocks.findIndex(block => block.id === chunk.block_id) - currentIndex);
            return {chunk, score: exact(chunk) + (chunk.block_id === blockId ? 3 : 0)
                + (distance === 1 ? 1 : 0)
                + (chunk.text.includes(target.formula) ? 12 : 0)
                + (lexicalRank < 0 ? 0 : 5 - lexicalRank)};
        }).sort((a, b) => b.score - a.score);
        const passages = [], counts = new Map();
        // Reserve room for the selected occurrence's context before distant matches.
        const local = ranked.filter(hit => hit.chunk.block_id === blockId).slice(0, 2);
        for (const {chunk, score} of [...local, ...ranked]) {
            if (!score || (counts.get(chunk.block_id) || 0) >= 2
                || passages.some(item => item.block_id === chunk.block_id && item.text === chunk.text)) continue;
            passages.push({block_id: chunk.block_id, title: chunk.title, text: chunk.text});
            counts.set(chunk.block_id, (counts.get(chunk.block_id) || 0) + 1);
            if (passages.length === 8) break;
        }
        return {note_title: (note.title || '').slice(0, 255), block_id: blockId, ...target, passages};
    }
}

export default MathDefinitionContext;
