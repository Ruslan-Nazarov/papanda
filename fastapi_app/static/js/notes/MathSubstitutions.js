import MathSymbols from './MathSymbols.js';
import MathComputedValues from './MathComputedValues.js';
import MathProvenance from './MathProvenance.js';

const SUBSTITUTION_EXCLUDED = '.tiptap, [contenteditable="true"], .hp-content, .hidden-phrase-tooltip, .math-symbol-tooltip, .formula-modal-backdrop, .formula-zoom-dialog, details, pre, code';
const FUNCTIONS = new Set(['\\sin', '\\cos', '\\tan', '\\tanh', '\\sinh', '\\cosh', '\\log', '\\ln', '\\exp']);

// Match expression structure, never numerical coincidence or evaluated arithmetic.
// Every numeric target retains its exact range in the original, unmodified TeX.
class MathSubstitutions {
    static scheduled = false;
    static descriptions = new Map();

    static parse(text) {
        if (!text || text.length > 2000) return null;
        const atoms = new Map(MathSymbols.atoms(text).map(atom => [atom.start, atom]));
        const tokens = [];
        for (let pos = 0; pos < text.length;) {
            const start = pos, rest = text.slice(pos);
            const space = rest.match(/^(?:\s+|\\(?:left|right|displaystyle|textstyle)\b|\\(?:[,;!:]|quad\b|qquad\b))/);
            if (space) { pos += space[0].length; continue; }
            const number = rest.match(/^(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?/);
            if (number) { pos += number[0].length; tokens.push({kind: 'number', value: number[0], start, end: pos}); continue; }
            if (rest[0] === '[' || rest.startsWith('\\begin{')) {
                const end = MathComputedValues.literalEnd(text, pos);
                if (end <= pos) return null;
                tokens.push({kind: 'number', value: text.slice(pos, end), start, end}); pos = end; continue;
            }
            const operator = rest.match(/^(?:\\(?:cdot|times|div)(?![A-Za-z])|[+−\-*/^])/);
            if (operator) {
                pos += operator[0].length;
                const value = {'\\cdot': '*', '\\times': '*', '\\div': '/', '−': '-'}[operator[0]] || operator[0];
                tokens.push({kind: 'op', value, start, end: pos}); continue;
            }
            if ('(){}'.includes(rest[0])) { pos++; tokens.push({kind: rest[0], start, end: pos}); continue; }
            const command = rest.match(/^\\(?:frac|dfrac|tfrac|sqrt)\b/);
            if (command) { pos += command[0].length; tokens.push({kind: command[0].includes('frac') ? 'fraction' : 'root', start, end: pos}); continue; }
            const atom = atoms.get(pos);
            if (!atom || !MathComputedValues.symbol(atom.latex)) return null;
            if (FUNCTIONS.has(atom.base) && !atom.scripts.length) {
                pos = atom.end; tokens.push({kind: 'function', value: atom.base, start, end: pos}); continue;
            }
            if (atom.base.startsWith('\\') && /^(?:\\sum|\\prod|\\int|\\lim)$/.test(atom.base)) return null;
            const power = atom.scripts.find(script => script.operator === '^' && !MathSymbols.isTranspose(atom, script, text));
            pos = power?.modifierStart ?? atom.end;
            tokens.push({kind: 'symbol', value: MathSymbols.normalize(text.slice(start, pos)), start, end: pos});
        }
        let index = 0, depth = 0;
        const node = (kind, left, right, value) => ({kind, left, right, value, start: left.start, end: right?.end ?? left.end});
        const primary = () => {
            if (++depth > 48) throw new Error('Expression too deep');
            const token = tokens[index++];
            if (!token) throw new Error('Incomplete expression');
            let result;
            if (['number', 'symbol'].includes(token.kind)) result = token;
            else if (['(', '{'].includes(token.kind)) {
                result = sum();
                const close = tokens[index++];
                if (close?.kind !== (token.kind === '(' ? ')' : '}')) throw new Error('Unbalanced expression');
                result = {...result, start: token.start, end: close.end};
            } else if (token.kind === 'fraction') {
                const left = primary(), right = primary();
                result = {...node('op', left, right, '/'), start: token.start};
            } else if (['function', 'root'].includes(token.kind)) {
                const argument = primary();
                result = {...node('function', argument, null, token.value || '\\sqrt'), start: token.start};
            } else throw new Error('Unsupported expression');
            depth--;
            return result;
        };
        const power = () => {
            const left = primary();
            return tokens[index]?.value === '^' ? (index++, node('op', left, unary(), '^')) : left;
        };
        const unary = () => {
            const token = tokens[index];
            if (token?.kind === 'op' && ['+', '-'].includes(token.value)) {
                index++;
                const operand = unary();
                return {...node('unary', operand, null, token.value), start: token.start};
            }
            return power();
        };
        const product = () => {
            let left = unary();
            while (index < tokens.length) {
                const next = tokens[index];
                if (next.kind === 'op' && ['*', '/'].includes(next.value)) { index++; left = node('op', left, unary(), next.value); }
                else if (['number', 'symbol', 'function', 'root', 'fraction', '(', '{'].includes(next.kind)) left = node('op', left, unary(), '*');
                else break;
            }
            return left;
        };
        const sum = () => {
            let left = product();
            while (tokens[index]?.kind === 'op' && ['+', '-'].includes(tokens[index].value)) {
                const value = tokens[index++].value;
                left = node('op', left, product(), value);
            }
            return left;
        };
        try { const result = sum(); return index === tokens.length ? result : null; } catch { return null; }
    }

    static literalKey(value) {
        const clean = MathComputedValues.clean(value).replace(/\s/g, '');
        const scalar = clean.replace(/^\((.*)\)$/, '$1');
        return /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?$/i.test(scalar) ? String(Number(scalar)) : clean;
    }

    static compatible(original, current) {
        if (MathSymbols.normalize(original) === MathSymbols.normalize(current)) return true;
        const a = MathComputedValues.symbol(original), b = MathComputedValues.symbol(current);
        const base = value => MathSymbols.normalize(value).replace(/\\(?:mathbf|boldsymbol|vec|mathit|mathrm)\{([^{}]*)\}/g, '$1');
        if (!a || !b || base(a.base) !== base(b.base)) return false;
        const label = value => value.replace(/\\(?:text|mathrm|mathbf|mathit)\{([^{}]*)\}/g, '$1').replace(/[{}\s]/g, '');
        if (a.scripts.some(s => s.operator !== '_') || b.scripts.some(s => s.operator !== '_')) return false;
        const left = label(a.indices.join(',')), right = label(b.indices.join(','));
        return left === right || (!left && /^\d+$/.test(right))
            || (!!left && right.endsWith(',' + left) && /^\d+$/.test(right.slice(0, -left.length - 1)));
    }

    static describe(formula) {
        if (this.descriptions.has(formula)) return this.descriptions.get(formula);
        const result = MathComputedValues.statements(formula).map(statement => {
            const parts = statement.parts.map((text, index) => {
                const start = statement.ranges[index].start;
                const expression = text.replace(/[.,;]\s*$/, '').trimEnd();
                return {text: expression, start, tree: this.parse(expression)};
            });
            return {...statement, parts, lhs: this.resultSymbol(parts[0].text)};
        });
        if (this.descriptions.size >= 256) this.descriptions.clear();
        this.descriptions.set(formula, result);
        return result;
    }

    static resultSymbol(text) {
        const symbol = MathComputedValues.symbol(text)?.symbol;
        if (symbol) return symbol;
        // A coordinate of a product is an explicit result too: (x_1 W_hx)_2.
        const clean = text.replace(/\\(?:left|right)\b/g, '').trim();
        return /^\(.+\)_(?:\{[\d,\s]+\}|\d+)$/.test(clean) && MathSymbols.atoms(clean).length
            ? MathSymbols.normalize(clean) : null;
    }

    static numericMeanings(formula, ranges, known) {
        const numbers = MathSymbols.numbers(formula);
        for (const range of ranges) {
            const tokens = numbers.filter(number => number.start >= range.start && number.end <= range.end);
            const value = MathComputedValues.clean(range.value);
            const matrix = value.match(/^\\begin\{([^}]+)\}([\s\S]*?)\\end\{\1\}$/);
            const vector = !matrix && /^(?:\[.*\]|\([^)]*[,;][^)]*\))$/.test(value);
            const scalar = !matrix && !vector && tokens.length === 1
                && MathSymbols.numberKey(value.replace(/^\((.*)\)$/, '$1')) === MathSymbols.numberKey(tokens[0].value);
            if (!matrix && !vector && !scalar) continue;
            // Only plain numeric cells receive coordinates. Fractions and roots
            // retain their whole-expression hint instead of labelling numerator digits.
            const cells = matrix ? matrix[2].split(/\\\\|&/).map(cell => MathComputedValues.clean(cell))
                : vector ? value.slice(1, -1).split(/[,;]/).map(cell => cell.trim()) : [value];
            if ((matrix || vector) && (cells.length !== tokens.length
                || cells.some(cell => !/^[+−-]?\s*(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(cell)))) continue;
            const columns = matrix ? matrix[2].split('\\\\')[0].split('&').length : 1;
            tokens.forEach((number, index) => {
                const coordinate = matrix && columns > 1 ? `${Math.floor(index / columns) + 1},${index % columns + 1}` : `${index + 1}`;
                number.symbol = scalar ? range.symbol : `(${range.symbol})_{${coordinate}}`;
                number.sourceSymbol = range.symbol;
                if (scalar) number.expressionValue = range.value;
                if (range.original) number.original = range.original;
                const key = MathSymbols.numberKey(number.value);
                if (!known.has(key)) known.set(key, new Map());
                known.get(key).set(number.symbol, {symbol: number.symbol, sourceSymbol: number.sourceSymbol, original: number.original});
            });
        }
        for (const number of numbers) {
            if (number.symbol) continue;
            let meanings = known.get(MathSymbols.numberKey(number.value));
            // A negative bias is often written as z - 0.112436 rather than
            // z + (-0.112436). Keep its sign when that explicit value is known.
            const minus = formula.slice(0, number.start).match(/[−-]\s*$/);
            if (!meanings && minus) {
                meanings = known.get('-' + MathSymbols.numberKey(number.value));
                if (meanings?.size === 1) {
                    number.start -= minus[0].length;
                    number.value = formula.slice(number.start, number.end);
                }
            }
            if (meanings?.size === 1) Object.assign(number, meanings.values().next().value);
        }
        return numbers;
    }

    static match(template, actual, text, facts) {
        const ranges = [], bindings = new Map();
        const visit = (a, b) => {
            if (!a || !b) return false;
            if (a.kind === 'symbol') {
                const value = text.slice(b.start, b.end);
                if (!MathComputedValues.isLiteral(value)) return b.kind === 'symbol' && this.compatible(a.value, b.value);
                const key = this.literalKey(value);
                const known = facts.get(a.value);
                // A scalar coordinate may replace a vector in a coordinate-wise
                // example. A previous whole vector does not constrain that scalar.
                const vector = value => /^(?:\[|\([^)]*[,;]|\\begin\{)/.test(value || '');
                if ((bindings.has(a.value) && bindings.get(a.value) !== key)
                    || (known !== undefined && known !== key && !(vector(known) && !vector(key)))) return false;
                bindings.set(a.value, key);
                ranges.push({start: b.start, end: b.end, symbol: a.value, value});
                return true;
            }
            if (a.kind !== b.kind || a.value !== b.value) {
                return a.kind === 'number' && b.kind === 'number' && this.literalKey(a.value) === this.literalKey(b.value);
            }
            return (!a.left || visit(a.left, b.left)) && (!a.right || visit(a.right, b.right));
        };
        return visit(template, actual) && ranges.length ? ranges : null;
    }

    static addSource(source, {templates, facts}) {
        for (const statement of this.describe(source)) {
            if (!statement.lhs) continue;
            for (const part of statement.parts.slice(1)) {
                if (part.tree && !MathComputedValues.isLiteral(part.text)) templates.push({lhs: statement.lhs, part,
                    original: `${statement.parts[0].text} ${statement.relations[0]} ${part.text}`});
            }
        }
        for (const result of MathComputedValues.extract(source)) facts.set(result.symbol, this.literalKey(result.value));
    }

    static analyze(formula, previous = [], context = null) {
        const sources = context || {templates: [], facts: new Map()};
        previous.forEach(source => this.addSource(source, sources));
        // A formula may extend its own chain, without leaking partial templates
        // into the chronological context shared by the rest of the document.
        const templates = [...sources.templates], facts = sources.facts, ranges = [], originals = [];
        for (const statement of this.describe(formula)) {
            if (!statement.lhs) continue;
            for (const part of statement.parts.slice(1)) {
                if (part.start < 0 || !part.tree) continue;
                const literal = MathComputedValues.isLiteral(part.text);
                const matches = templates.filter(template => this.compatible(template.lhs, statement.lhs)
                    && (!literal || template.part.tree.kind !== 'symbol')).map(template => {
                    const found = this.match(template.part.tree, part.tree, part.text, facts);
                    return found ? {found, original: template.original} : null;
                }).filter(Boolean);
                const meanings = new Map();
                const spans = [];
                let ambiguous = false;
                for (const match of matches) for (const range of match.found) {
                    const key = `${range.start}:${range.end}`;
                    if (meanings.has(key) && meanings.get(key) !== range.symbol) ambiguous = true;
                    if (spans.some(prior => range.start < prior.end && range.end > prior.start
                        && (range.start !== prior.start || range.end !== prior.end || range.symbol !== prior.symbol))) ambiguous = true;
                    meanings.set(key, range.symbol);
                    spans.push(range);
                }
                if (matches.length && !ambiguous) {
                    const match = matches.reduce((best, item) => item.found.length >= best.found.length ? item : best);
                    originals.push(match.original);
                    ranges.push(...match.found.map(range => ({...range, start: range.start + part.start, end: range.end + part.start, original: match.original})));
                } else if (literal) {
                    ranges.push({start: part.start, end: part.start + part.text.length, symbol: statement.lhs, value: part.text});
                }
                if (!literal) templates.push({lhs: statement.lhs, part,
                    original: `${statement.parts[0].text} ${statement.relations[0]} ${part.text}`});
            }
        }
        return {ranges, originals: [...new Set(originals)]};
    }

    static refresh(root) {
        const context = {templates: [], facts: new Map()};
        const known = new Map();
        const scope = root.closest?.('#blocks-container') || root;
        const elements = [...scope.querySelectorAll('.block-content .katex, .blk-body .katex')]
            .filter(element => !element.closest(SUBSTITUTION_EXCLUDED));
        const provenance = new MathProvenance(elements);
        provenance.records.forEach(record => {
            const {element, formula} = record;
            if (!formula) return;
            const result = this.analyze(formula, [], context);
            const numbers = this.numericMeanings(formula, result.ranges, known);
            const linked = provenance.process(record, numbers);
            // Structural links take precedence over legacy value hints. Keep
            // non-overlapping legacy ranges for unsupported scalar notation.
            result.ranges = result.ranges.filter(range => !linked.some(link => link.start < range.end && link.end > range.start)
                && !numbers.some(number => (number.provenanceAmbiguous || number.provenanceRole === 'constant')
                    && number.start < range.end && number.end > range.start))
                .concat(linked).sort((a, b) => a.start - b.start);
            this.addSource(formula, context);
            const signature = JSON.stringify({...result, numbers});
            element.dataset.mathProvenanceId = record.id;
            if (element.dataset.mathSubstitutions === signature) return;
            if (!result.ranges.length && !numbers.length && !element.dataset.mathSubstitutions) return;
            const template = document.createElement('template');
            template.innerHTML = MathSymbols.render(formula, {displayMode: !!element.closest('.katex-display')}, result.ranges, numbers);
            const rendered = template.content.querySelector('.katex');
            if (!rendered || template.content.querySelector('.katex-error')) return;
            rendered.dataset.mathSubstitutions = signature;
            rendered.dataset.mathProvenanceId = record.id;
            if (result.originals.length) rendered.dataset.mathOriginal = MathSymbols.encode(JSON.stringify(result.originals));
            element.replaceWith(rendered);
            record.element = rendered;
        });
        provenance.publish(elements[0]?.ownerDocument || root.ownerDocument || root);
    }

    static decorate(root) {
        // Dialog answers have no substitutions from note blocks. Rendering one
        // must not re-analyze every equation in the underlying note each time.
        if (!root.querySelector('.block-content .katex, .blk-body .katex')) return;
        this.refresh(root);
        this.scheduleRefresh();
    }

    static scheduleRefresh() {
        if (this.scheduled || !window.requestAnimationFrame) return;
        this.scheduled = true;
        window.requestAnimationFrame(() => {
            this.scheduled = false;
            this.refresh(document);
        });
    }
}

export default MathSubstitutions;
