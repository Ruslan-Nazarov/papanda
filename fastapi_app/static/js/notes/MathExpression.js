import MathSymbols from './MathSymbols.js';

// A deliberately bounded TeX grammar. Unsupported syntax fails closed; nothing
// is evaluated as JavaScript. Every node keeps its original character range.
class MathExpression {
    static cache = new Map();
    static key(text) {
        return MathSymbols.normalize(text).replace(/^\\(?:mathbf|boldsymbol|vec|mathit|mathrm)\{([^{}]*)\}/, '$1');
    }

    static parse(text, offset = 0) {
        if (!text || text.length > 12000) return null;
        const key = `${offset}:${text}`;
        if (this.cache.has(key)) return this.cache.get(key);
        const result = this.read(text, offset);
        if (this.cache.size >= 512) this.cache.clear();
        this.cache.set(key, result);
        return result;
    }

    static read(text, offset, nesting = 0) {
        if (nesting > 16) return null;
        const tokens = [], atoms = new Map(MathSymbols.atoms(text).map(atom => [atom.start, atom]));
        for (let pos = 0; pos < text.length;) {
            const start = pos, rest = text.slice(pos);
            const space = rest.match(/^(?:\s+|\\(?:left|right|displaystyle|textstyle)\b|\\(?:[,;!:]|quad\b|qquad\b))/);
            if (space) { pos += space[0].length; continue; }
            if (/^\\sum(?![A-Za-z])/.test(rest)) {
                pos += 4;
                const bounds = {};
                for (let bound = 0; bound < 2; bound++) {
                    while (/\s/.test(text[pos] || '') && pos < text.length) pos++;
                    const tag = text[pos++];
                    if (!['_', '^'].includes(tag)) return null;
                    while (/\s/.test(text[pos] || '') && pos < text.length) pos++;
                    const end = MathSymbols.argumentEnd(text, pos);
                    if (end <= pos) return null;
                    bounds[tag] = {value: text.slice(pos, end).replace(/^\{|\}$/g, ''), start: pos + (text[pos] === '{' ? 1 : 0)};
                    pos = end;
                }
                const lower = bounds._?.value.match(/^([A-Za-z])\s*=\s*(.+)$/);
                if (!lower || !bounds['^']) return null;
                const lowStart = bounds._.start + bounds._.value.indexOf(lower[2]);
                tokens.push({kind: 'sum', variable: lower[1], lower: this.read(lower[2], lowStart, nesting + 1),
                    upper: this.read(bounds['^'].value, bounds['^'].start, nesting + 1), start, end: pos}); continue;
            }
            const env = rest.match(/^\\(begin|end)\{(?:bmatrix|pmatrix|matrix|smallmatrix|Bmatrix)\}/);
            if (env) { pos += env[0].length; tokens.push({kind: env[1] === 'begin' ? 'matrix' : 'endmatrix', start, end: pos}); continue; }
            if (rest.startsWith('\\\\')) { pos += 2; tokens.push({kind: 'row', start, end: pos}); continue; }
            const number = rest.match(/^(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?/);
            if (number) { pos += number[0].length; tokens.push({kind: 'number', value: number[0], start, end: pos}); continue; }
            const fn = rest.match(/^(?:\\operatorname\{(ReLU|relu|max|min|tanh|sin|cos|exp|log)\}|\\(max|min|tanh|sin|cos|tan|sinh|cosh|exp|log|ln)\b|(ReLU|relu|max|min|tanh)\b)/);
            if (fn) { pos += fn[0].length; tokens.push({kind: 'function', value: (fn[1] || fn[2] || fn[3]).toLowerCase(), start, end: pos}); continue; }
            const command = rest.match(/^\\(frac|dfrac|tfrac|sqrt)\b/);
            if (command) { pos += command[0].length; tokens.push({kind: command[1] === 'sqrt' ? 'root' : 'fraction', start, end: pos}); continue; }
            const op = rest.match(/^(?:\\(?:cdot|times|div)(?![A-Za-z])|[+−\-*/^])/);
            if (op) { pos += op[0].length; tokens.push({kind: 'op', value: {'\\cdot': '*', '\\times': '*', '\\div': '/', '−': '-'}[op[0]] || op[0], start, end: pos}); continue; }
            if (rest[0] === '_') {
                let end = MathSymbols.groupEnd(text, pos + 1);
                if (end <= pos + 1) end = pos + 1 + (text.slice(pos + 1).match(/^\d+/)?.[0].length || 0);
                const value = text.slice(pos + 1, end).replace(/[{}\s]/g, '');
                if (!/^\d+(?:,\d+)?$/.test(value)) return null;
                pos = end; tokens.push({kind: 'index', value: value.split(',').map(Number), start, end: pos}); continue;
            }
            if ('(){}[],;&'.includes(rest[0])) { pos++; tokens.push({kind: rest[0], start, end: pos}); continue; }
            const atom = atoms.get(pos);
            if (!atom || /^[=+−*-]$/.test(atom.symbol)) return null;
            const power = atom.scripts.find(script => script.operator === '^');
            pos = power?.modifierStart ?? atom.end;
            tokens.push({kind: 'symbol', value: this.key(text.slice(start, pos)), latex: MathSymbols.normalize(text.slice(start, pos)), start, end: pos});
            if (power && MathSymbols.isTranspose(atom, power, text)) {
                tokens.push({kind: 'transpose', start: pos, end: atom.end}); pos = atom.end;
            }
        }
        let index = 0, depth = 0;
        const binary = (left, right, value) => ({kind: 'binary', left, right, value, start: left.start, end: right.end});
        const container = (token, close) => {
            const rows = [[]];
            while (tokens[index] && tokens[index].kind !== close) {
                rows.at(-1).push(sum());
                const next = tokens[index];
                if (next?.kind === close) break;
                if (!['row', ',', ';', '&'].includes(next?.kind)) throw new Error('Expected separator');
                if (next.kind === 'row') rows.push([]);
                index++;
            }
            const end = tokens[index++];
            if (end?.kind !== close || !rows[0].length || rows.some(row => row.length !== rows[0].length)) throw new Error('Invalid array');
            return {kind: 'array', rows, start: token.start, end: end.end, vector: token.kind !== 'matrix'};
        };
        const primary = () => {
            if (++depth > 48) throw new Error('Expression too deep');
            const token = tokens[index++];
            if (!token) throw new Error('Incomplete expression');
            let result;
            if (['number', 'symbol'].includes(token.kind)) result = token;
            else if (token.kind === '[' || token.kind === 'matrix') result = container(token, token.kind === '[' ? ']' : 'endmatrix');
            else if (['(', '{'].includes(token.kind)) {
                const first = sum(), close = token.kind === '(' ? ')' : '}';
                if ([',', ';'].includes(tokens[index]?.kind)) {
                    const values = [first];
                    while ([',', ';'].includes(tokens[index]?.kind)) { index++; values.push(sum()); }
                    const end = tokens[index++];
                    if (end?.kind !== close) throw new Error('Unclosed tuple');
                    result = {kind: 'array', rows: [values], vector: true, start: token.start, end: end.end};
                } else {
                    const end = tokens[index++];
                    if (end?.kind !== close) throw new Error('Unclosed group');
                    result = {...first, start: token.start, end: end.end};
                }
            } else if (token.kind === 'fraction') {
                const left = primary(), right = primary(); result = {...binary(left, right, '/'), start: token.start};
            } else if (token.kind === 'sum') {
                if (!token.lower || !token.upper) throw new Error('Unsupported bounds');
                const left = product(); result = {...token, left, end: left.end};
            } else if (['function', 'root'].includes(token.kind)) {
                const argument = primary();
                result = {kind: 'call', value: token.value || 'sqrt', args: ['max', 'min'].includes(token.value) && argument.kind === 'array'
                    ? argument.rows.flat() : [argument], start: token.start, end: argument.end};
            } else throw new Error('Unsupported expression');
            while (['index', 'transpose'].includes(tokens[index]?.kind)) {
                const suffix = tokens[index++];
                result = {kind: suffix.kind === 'index' ? 'coordinate' : 'transpose', left: result, indices: suffix.value,
                    start: result.start, end: suffix.end};
            }
            depth--; return result;
        };
        const power = () => {
            const left = primary();
            if (tokens[index]?.kind === 'op' && tokens[index].value === '^') { index++; return binary(left, unary(), '^'); }
            return left;
        };
        const unary = () => {
            const token = tokens[index];
            if (token?.kind === 'op' && ['+', '-'].includes(token.value)) {
                index++; const left = unary(); return {kind: 'unary', value: token.value, left, start: token.start, end: left.end};
            }
            return power();
        };
        const product = () => {
            let left = unary();
            while (tokens[index]) {
                const token = tokens[index];
                if (token.kind === 'op' && ['*', '/'].includes(token.value)) { index++; left = binary(left, unary(), token.value); }
                else if (['number', 'symbol', 'function', 'root', 'fraction', 'sum', '(', '{', '[', 'matrix'].includes(token.kind)) left = binary(left, unary(), '*');
                else break;
            }
            return left;
        };
        const sum = () => {
            let left = product();
            while (tokens[index]?.kind === 'op' && ['+', '-'].includes(tokens[index].value)) {
                const op = tokens[index++].value; left = binary(left, product(), op);
            }
            return left;
        };
        try {
            const result = sum();
            if (index !== tokens.length) return null;
            const shift = node => {
                node.start += offset; node.end += offset;
                if (node.left) shift(node.left);
                if (node.right) shift(node.right);
                if (node.lower) shift(node.lower);
                if (node.upper) shift(node.upper);
                node.args?.forEach(shift); node.rows?.flat().forEach(shift);
            };
            shift(result); return result;
        } catch { return null; }
    }
}

export default MathExpression;
