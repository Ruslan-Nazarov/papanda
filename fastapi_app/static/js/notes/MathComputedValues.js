import MathSymbols from './MathSymbols.js';

// Index explicit numeric results already written in the document. No evaluation
// or inference: z = h W + b is a use, while h = tanh(...) ≈ [1, 2] is a result.
class MathComputedValues {
    static clean(value) {
        return String(value || '').replace(/\\(?:left|right)\b/g, '')
            .replace(/\\(?:,|;|!|:|quad\b|qquad\b|enspace\b|thinspace\b)/g, ' ')
            .replace(/−/g, '-').trim();
    }

    static literalEnd(text, start = 0, depth = 0) {
        if (depth > 20) return -1;
        let pos = start;
        while (/\s/.test(text[pos] || '') && pos < text.length) pos++;
        if (/[+-]/.test(text[pos] || '')) {
            pos++;
            while (/\s/.test(text[pos] || '') && pos < text.length) pos++;
        }
        const number = text.slice(pos).match(/^(?:\d+(?:[.,]\d+)?\.?|\.\d+)(?:[eE][+-]?\d+)?/);
        if (number) {
            pos += number[0].length;
            const scientific = text.slice(pos).match(/^\s*\\(?:times|cdot)\s*10\s*\^\s*(?:\{[+-]?\d+\}|[+-]?\d+)/);
            return pos + (scientific?.[0].length || 0);
        }
        const fraction = text.slice(pos).match(/^\\(?:dfrac|tfrac|frac)\s*/);
        if (fraction) {
            pos += fraction[0].length;
            for (let arg = 0; arg < 2; arg++) {
                while (/\s/.test(text[pos] || '') && pos < text.length) pos++;
                const end = MathSymbols.groupEnd(text, pos);
                if (text[pos] !== '{' || end <= pos || !this.isLiteral(text.slice(pos + 1, end - 1), depth + 1)) return -1;
                pos = end;
            }
            return pos;
        }
        const root = text.slice(pos).match(/^\\sqrt\s*/);
        if (root) {
            pos += root[0].length;
            if (text[pos] === '[') {
                const end = MathSymbols.groupEnd(text, pos);
                if (end <= pos || !/^\d+$/.test(text.slice(pos + 1, end - 1))) return -1;
                pos = end;
            }
            const end = MathSymbols.groupEnd(text, pos);
            return text[pos] === '{' && end > pos && this.isLiteral(text.slice(pos + 1, end - 1), depth + 1) ? end : -1;
        }
        if (text.slice(pos).match(/^\\pi(?![A-Za-z])/)) return pos + 3;
        const matrix = text.slice(pos).match(/^\\begin\{(pmatrix|bmatrix|Bmatrix|vmatrix|Vmatrix|matrix|smallmatrix)\}/);
        if (matrix) {
            const contentStart = pos + matrix[0].length;
            const close = `\\end{${matrix[1]}}`;
            const end = text.indexOf(close, contentStart);
            return end >= 0 && this.sequence(text.slice(contentStart, end), depth + 1) ? end + close.length : -1;
        }
        const close = text[pos] === '[' ? ']' : text[pos] === '(' ? ')' : text[pos] === '{' ? '}' : '';
        if (close) {
            const open = text[pos];
            let level = 1, end = pos + 1;
            for (; end < text.length && level; end++) {
                if (text[end] === open) level++;
                if (text[end] === close) level--;
            }
            if (!level && this.sequence(text.slice(pos + 1, end - 1), depth + 1)) return end;
        }
        return -1;
    }

    static sequence(text, depth) {
        let pos = 0, count = 0;
        while (pos < text.length) {
            const end = this.literalEnd(text, pos, depth);
            if (end <= pos) return false;
            pos = end; count++;
            if (!text.slice(pos).trim()) break;
            const separator = text.slice(pos).match(/^(?:\s*(?:,|;|&|\\\\)\s*|\s+)/);
            if (!separator) return false;
            pos += separator[0].length;
        }
        return count > 0;
    }

    static isLiteral(value, depth = 0) {
        const text = this.clean(value);
        const end = this.literalEnd(text, 0, depth);
        return end > 0 && !text.slice(end).trim();
    }

    static symbol(value) {
        const text = value.trim();
        const atoms = MathSymbols.atoms(text);
        const atom = atoms[0];
        return atoms.length === 1 && atom.start === 0 && atom.end === text.length
            && !/^[=+−*-]$/.test(atom.symbol) ? atom : null;
    }

    static statements(formula) {
        const text = formula.replace(/\\(?:begin|end)\{(?:aligned|align\*?|gathered|gather\*?|split)\}/g, '');
        const statements = [];
        let parts = [], relations = [], offset = 0, level = 0, environment = 0;
        const piece = value => value.trim().replace(/^&+\s*|\s*&+$/g, '').trim();
        const flush = end => {
            parts.push(piece(text.slice(offset, end)));
            if (relations.length) statements.push({parts, relations});
            parts = []; relations = [];
        };
        for (let i = 0; i < text.length;) {
            const env = text.slice(i).match(/^\\(begin|end)\{[^}]+\}/);
            if (env) { environment += env[1] === 'begin' ? 1 : -1; i += env[0].length; continue; }
            const spacing = text.slice(i).match(/^\\(?:quad|qquad)\b/);
            const row = text.startsWith('\\\\', i);
            const nextAssignment = text[i] === ',' && /^\s*(?:[A-Za-z]|\\[A-Za-z]+)(?:[^=,;]*)(?:=|\\approx)/.test(text.slice(i + 1));
            if (!level && !environment && (row || spacing || text[i] === ';' || nextAssignment)) {
                flush(i);
                i += row ? 2 : spacing ? spacing[0].length : 1;
                offset = i; continue;
            }
            if (!level && !environment) {
                const relation = text.slice(i).match(/^(?:\\(?:approx|simeq|coloneqq|coloneq)(?![A-Za-z])|:=|=|≈|≃)/);
                if (relation) {
                    parts.push(piece(text.slice(offset, i)));
                    relations.push(/approx|simeq|≈|≃/.test(relation[0]) ? '\\approx' : '=');
                    i += relation[0].length; offset = i; continue;
                }
            }
            if (text[i] === '\\') {
                const command = text.slice(i).match(/^\\(?:[A-Za-z]+|.)/);
                i += command?.[0].length || 1; continue;
            }
            if ('{[('.includes(text[i])) level++;
            if ('}])'.includes(text[i])) level--;
            i++;
        }
        flush(text.length);
        return statements;
    }

    static extract(formula) {
        const results = [];
        for (const {parts, relations} of this.statements(formula)) {
            for (let left = 0; left < parts.length - 1; left++) {
                const symbol = this.symbol(parts[left]);
                if (!symbol) continue;
                for (let right = parts.length - 1; right > left; right--) {
                    const value = parts[right].trim().replace(/[.,;]\s*$/, '').trim();
                    if (!this.isLiteral(value)) continue;
                    results.push({symbol: symbol.symbol, value,
                        relation: relations.slice(left, right).includes('\\approx') ? '\\approx' : '='});
                    break;
                }
            }
        }
        return results;
    }

    static matches(query, result) {
        const key = MathSymbols.normalize(query);
        if (key === result) return true;
        const requested = this.symbol(key), candidate = this.symbol(result);
        if (!requested || !candidate || MathSymbols.normalize(requested.base) !== MathSymbols.normalize(candidate.base)) return false;
        const subscript = atom => atom.scripts.length === 1 && atom.latex.slice(atom.base.length).trimStart().startsWith('_');
        if (!subscript(candidate)) return false;
        if (!requested.scripts.length) return true;
        return subscript(requested) && /^(?:[A-Za-z]|\\[A-Za-z]+)$/.test(requested.indices[0])
            && /^\d+$/.test(candidate.indices[0]);
    }

    static forElement(symbol, element) {
        element = element.closest('.formula-zoom-dialog')?.mathSource || element;
        const root = element.closest('#blocks-container') || element.ownerDocument;
        const formulas = [...root.querySelectorAll('.block-content .katex, .blk > .blk-body .katex')]
            .filter(node => !node.closest('.tiptap, .hp-content, .math-symbol-tooltip, details, pre, code'));
        const current = formulas.indexOf(element.closest('.katex'));
        if (current < 0) return [];
        const results = [], seen = new Set();
        for (const [index, node] of formulas.slice(0, current + 1).entries()) {
            const formula = node.querySelector('annotation[encoding="application/x-tex"]')?.textContent;
            if (!formula) continue;
            const block = node.closest('.dialectics-block, .blk');
            const title = block?.querySelector('.block-title, .blk-title')?.textContent.trim() || '';
            const paragraph = node.closest('p, li') || node.closest('.math-inline, .math-content') || node;
            const range = node.ownerDocument.createRange();
            range.setStart(paragraph, 0); range.setEndBefore(node);
            const prefix = range.cloneContents();
            prefix.querySelectorAll('.katex').forEach(el => el.remove());
            let context = prefix.textContent.trim();
            if (!context) {
                const previous = paragraph.previousElementSibling?.cloneNode(true);
                previous?.querySelectorAll('.katex').forEach(el => el.remove());
                context = previous?.textContent.trim() || '';
            }
            context = context.replace(/\s+/g, ' ').slice(-150);
            for (const result of this.extract(formula)) {
                if (!this.matches(symbol, result.symbol)) continue;
                const key = JSON.stringify([result.symbol, this.clean(result.value).replace(/\s/g, '')]);
                if (seen.has(key)) continue;
                seen.add(key);
                results.push({...result, blockId: block?.id || '', title, context, position: index});
            }
        }
        return results;
    }
}

export default MathComputedValues;
