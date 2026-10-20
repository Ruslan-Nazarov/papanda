import MathComputedValues from './MathComputedValues.js';
import MathExpression from './MathExpression.js';

const MAX_CELLS = 512;
const MAX_STEPS = 24;

// Deterministic, chronological data flow. Values verify a structural match;
// they never select a source. References are render-only, never saved in notes.
class MathProvenance {
    static documents = new WeakMap();

    static decimal(value) {
        const match = String(value).replace(/[\s()]/g, '').replace(/−/g, '-').match(/^([+-]?)(\d*)(?:\.(\d*))?(?:e([+-]?\d+))?$/i);
        if (!match || !(match[2] || match[3])) return null;
        let digits = (match[2] + (match[3] || '')).replace(/^0+/, '');
        let exponent = Number(match[4] || 0) - (match[3]?.length || 0);
        if (!Number.isSafeInteger(exponent) || Math.abs(exponent) > 10000) return null;
        if (!digits) return '0';
        while (digits.endsWith('0')) { digits = digits.slice(0, -1); exponent++; }
        return `${match[1] === '-' ? '-' : ''}${digits}e${exponent}`;
    }

    static steps(items) {
        const result = [], seen = new Set();
        for (const item of items.flat()) {
            if (!item) continue;
            const key = JSON.stringify(item);
            if (seen.has(key)) continue;
            seen.add(key); result.push(item);
            if (result.length === MAX_STEPS) break;
        }
        return result;
    }

    constructor(elements) {
        this.facts = new Map();
        this.coordinates = new Map();
        this.rules = new Map();
        this.whole = new Set();
        this.zero = new Set();
        this.work = 0;
        this.records = elements.map((element, index) => {
            const formula = element.querySelector('annotation[encoding="application/x-tex"]')?.textContent || '';
            let hash = 2166136261;
            for (let i = 0; i < formula.length; i++) hash = Math.imul(hash ^ formula.charCodeAt(i), 16777619);
            return {element, formula, id: `p${index}-${(hash >>> 0).toString(36)}`, statements: MathComputedValues.statements(formula).map(statement => ({
                ...statement, trees: statement.parts.map((part, i) => MathExpression.parse(part.replace(/[.,;]\s*$/, '').trimEnd(), statement.ranges[i].start)),
            }))};
        });
        for (const record of this.records) for (const statement of record.statements) {
            if (statement.trees[0]?.kind === 'symbol' && statement.trees.slice(1).some(tree => tree?.kind === 'array')) this.whole.add(statement.trees[0].value);
        }
        // Index conventions are syntax, not future numeric facts. Propagate a
        // zero-based convention only along connected formula dependencies.
        const connections = [];
        for (const record of this.records) for (const statement of record.statements) {
            const lhs = this.name(statement.trees[0]);
            if (!lhs) continue;
            if (lhs.indices?.includes(0)) this.zero.add(lhs.name);
            for (const tree of statement.trees.slice(1)) {
                this.indexConventions(tree);
                for (const symbol of this.symbols(tree)) connections.push([lhs.name, this.name(symbol)?.name || symbol.value]);
            }
        }
        for (let pass = 0; pass < connections.length && pass < 64; pass++) {
            let changed = false;
            for (const [a, b] of connections) if (this.zero.has(a) !== this.zero.has(b)) {
                this.zero.add(a); this.zero.add(b); changed = true;
            }
            if (!changed) break;
        }
    }

    symbols(node) {
        if (!node) return [];
        if (node.kind === 'symbol') return [node];
        return [...this.symbols(node.left), ...this.symbols(node.right), ...(node.args || []).flatMap(child => this.symbols(child)),
            ...(node.rows || []).flat().flatMap(child => this.symbols(child))];
    }

    indexConventions(node) {
        if (!node) return;
        const info = this.name(node);
        if (info?.indices?.includes(0)) this.zero.add(info.name);
        if (node.kind === 'sum' && this.cellValue(node.lower) === '0') {
            for (const symbol of this.symbols(node.left)) {
                const source = this.name(symbol);
                if (source?.labels?.includes(node.variable)) this.zero.add(source.name);
            }
        }
        this.indexConventions(node.left); this.indexConventions(node.right);
        node.args?.forEach(child => this.indexConventions(child)); node.rows?.flat().forEach(child => this.indexConventions(child));
    }

    name(node) {
        if (!node) return null;
        if (node.kind === 'coordinate' && node.left.kind === 'symbol') return {name: node.left.value, indices: node.indices};
        if (node.kind !== 'symbol') return null;
        const match = node.value.match(/^(.*)_\{((?:\d+|[A-Za-z])(?:,(?:\d+|[A-Za-z]))?)\}$/);
        if (match && !this.whole.has(node.value) && (match[2].includes(',') || this.whole.has(match[1]) || match[2] === '0')) {
            return /^\d+(?:,\d+)?$/.test(match[2]) ? {name: match[1], indices: match[2].split(',').map(Number)}
                : {name: match[1], labels: match[2].split(',')};
        }
        return {name: node.value};
    }

    base(name) { return this.zero.has(name) ? 0 : 1; }

    coordinate(name, row, column, tensor) {
        const base = this.base(name);
        return tensor.vector || tensor.cols === 1 ? `(${name})_{${(tensor.rows === 1 ? column : row) + base}}`
            : `(${name})_{${row + base},${column + base}}`;
    }

    position(info, tensor) {
        if (!info.indices) return tensor.rows === 1 && tensor.cols === 1 ? 0 : -1;
        const indices = info.indices.map(index => index - this.base(info.name));
        let row, column;
        if (indices.length === 2) [row, column] = indices;
        else if (tensor.rows === 1) [row, column] = [0, indices[0]];
        else if (tensor.cols === 1) [row, column] = [indices[0], 0];
        else return -1;
        return row >= 0 && row < tensor.rows && column >= 0 && column < tensor.cols ? row * tensor.cols + column : -1;
    }

    scalar(cell) { return {rows: 1, cols: 1, cells: [cell]}; }

    cellValue(node) {
        if (!node) return null;
        if (node.kind === 'number') return MathProvenance.decimal(node.value);
        if (node.kind === 'ref') return node.numeric;
        if (node.kind === 'unary') {
            const value = this.cellValue(node.left);
            return value === null ? null : node.value === '-' && value !== '0' ? (value.startsWith('-') ? value.slice(1) : '-' + value) : value;
        }
        return null;
    }

    substitute(node, bindings) {
        if (!node) return node;
        const result = {...node};
        if (node.kind === 'symbol') {
            if (bindings.has(node.value)) return {...node, kind: 'number', value: String(bindings.get(node.value))};
            result.value = node.value.replace(/_\{([^{}]+)\}/g, (_, labels) => `_{${labels.split(',').map(label => bindings.has(label) ? bindings.get(label) : label).join(',')}}`);
        }
        const scope = node.kind === 'sum' ? new Map(bindings) : bindings;
        if (node.kind === 'sum') scope.delete(node.variable);
        if (node.left) result.left = this.substitute(node.left, scope);
        if (node.right) result.right = this.substitute(node.right, bindings);
        if (node.lower) result.lower = this.substitute(node.lower, bindings);
        if (node.upper) result.upper = this.substitute(node.upper, bindings);
        if (node.args) result.args = node.args.map(child => this.substitute(child, bindings));
        if (node.rows) result.rows = node.rows.map(row => row.map(child => this.substitute(child, bindings)));
        return result;
    }

    integer(node) {
        if (!node) return null;
        let value;
        if (node.kind === 'number') value = Number(node.value);
        else if (node.kind === 'symbol') value = Number(this.facts.get(node.value)?.cells[0]?.numeric ?? NaN);
        else if (node.kind === 'unary') { const child = this.integer(node.left); value = child === null ? NaN : node.value === '-' ? -child : child; }
        else if (node.kind === 'binary') {
            const a = this.integer(node.left), b = this.integer(node.right);
            if (a === null || b === null) return null;
            value = node.value === '+' ? a + b : node.value === '-' ? a - b : node.value === '*' ? a * b : NaN;
        }
        return Number.isSafeInteger(value) && Math.abs(value) <= 10000 ? value : null;
    }

    expand(node, visiting = new Set(), depth = 0) {
        if (!node || depth > 32 || ++this.work > 20000) return null;
        const expand = child => this.expand(child, visiting, depth + 1);
        if (node.kind === 'sum') {
            const lower = this.integer(node.lower), upper = this.integer(node.upper);
            if (lower === null || upper === null || upper < lower || upper - lower >= MAX_CELLS) return null;
            const terms = [];
            for (let k = lower; k <= upper; k++) {
                const term = expand(this.substitute(node.left, new Map([[node.variable, k]])));
                if (!term || term.cells.length !== 1) return null;
                terms.push(term.cells[0]);
            }
            return this.scalar(terms.slice(1).reduce((left, right) => ({kind: 'binary', value: '+', left, right}), terms[0]));
        }
        if (node.kind === 'number') return this.scalar(node);
        if (node.kind === 'symbol' || node.kind === 'coordinate') {
            const info = this.name(node);
            if (!info) {
                if (node.kind !== 'coordinate') return null;
                const tensor = expand(node.left);
                if (!tensor) return null;
                const name = this.symbols(node.left)[0]?.value || '';
                const position = this.position({name, indices: node.indices}, tensor);
                return position < 0 ? null : this.scalar(tensor.cells[position]);
            }
            if (info.indices) {
                const direct = this.coordinates.get(info.name)?.get(info.indices.join(','));
                if (direct) return this.scalar(direct);
            }
            let tensor = this.facts.get(info.name);
            if (!tensor && !visiting.has(info.name)) {
                const rules = this.rules.get(info.name);
                if (rules?.length === 1) {
                    visiting.add(info.name); tensor = expand(rules[0].tree); visiting.delete(info.name);
                }
            }
            if (!tensor) return info.indices ? null : this.scalar({kind: 'ref', symbol: info.name, sourceSymbol: node.latex || info.name, steps: []});
            const coordinates = this.coordinates.get(info.name);
            if (coordinates) {
                tensor = {...tensor, cells: [...tensor.cells]};
                for (const [indices, cell] of coordinates) {
                    const position = this.position({name: info.name, indices: indices.split(',').map(Number)}, tensor);
                    if (position >= 0 && (!this.facts.has(info.name) || this.cellValue(tensor.cells[position]) === cell.numeric)) tensor.cells[position] = cell;
                }
            }
            if (!info.indices) return tensor;
            const position = this.position(info, tensor);
            return position < 0 ? null : this.scalar(tensor.cells[position]);
        }
        if (node.kind === 'array') {
            const cells = node.rows.flat().map(child => expand(child));
            if (cells.length > MAX_CELLS || cells.some(cell => !cell || cell.rows !== 1 || cell.cols !== 1)) return null;
            return {rows: node.rows.length, cols: node.rows[0].length, vector: node.vector, cells: cells.map(cell => cell.cells[0])};
        }
        if (node.kind === 'transpose') {
            const tensor = expand(node.left);
            return tensor && {rows: tensor.cols, cols: tensor.rows, vector: tensor.vector,
                cells: Array.from({length: tensor.cells.length}, (_, index) => tensor.cells[(index % tensor.rows) * tensor.cols + Math.floor(index / tensor.rows)])};
        }
        if (node.kind === 'unary') {
            const tensor = expand(node.left);
            return tensor && {...tensor, cells: tensor.cells.map(left => ({...node, left}))};
        }
        if (node.kind === 'call') {
            if (node.value === 'relu') return expand({kind: 'call', value: 'max', args: [{kind: 'number', value: '0'}, ...node.args]});
            const args = node.args.map(child => expand(child));
            if (args.some(arg => !arg)) return null;
            let shape = args.reduce((a, b) => a.cells.length >= b.cells.length ? a : b);
            if (args.some(arg => arg.cells.length !== 1 && (arg.rows !== shape.rows || arg.cols !== shape.cols))) return null;
            shape = {...shape, cells: shape.cells.map((_, index) => ({kind: 'call', value: node.value,
                args: args.map(arg => arg.cells[arg.cells.length === 1 ? 0 : index])}))};
            return shape;
        }
        if (node.kind !== 'binary') return null;
        const a = expand(node.left), b = expand(node.right);
        if (!a || !b) return null;
        const binary = (left, right, value = node.value) => ({kind: 'binary', value, left, right});
        if (node.value === '*' && a.cells.length > 1 && b.cells.length > 1) {
            if (a.cols !== b.rows || a.rows * b.cols > MAX_CELLS || a.rows * b.cols * a.cols > 20000) return null;
            const cells = [];
            for (let i = 0; i < a.rows; i++) for (let j = 0; j < b.cols; j++) {
                const terms = Array.from({length: a.cols}, (_, k) => binary(a.cells[i * a.cols + k], b.cells[k * b.cols + j]));
                cells.push(terms.slice(1).reduce((left, right) => binary(left, right, '+'), terms[0]));
            }
            return {rows: a.rows, cols: b.cols, cells};
        }
        // Row/column vectors broadcast only across the matching matrix axis.
        const shape = a.cells.length >= b.cells.length ? a : b;
        const at = (tensor, row, col) => {
            if (tensor.cells.length === 1) return tensor.cells[0];
            if (tensor.rows === shape.rows && tensor.cols === shape.cols) return tensor.cells[row * tensor.cols + col];
            if (['+', '-'].includes(node.value) && tensor.vector && tensor.rows === 1 && tensor.cols === shape.cols) return tensor.cells[col];
            if (['+', '-'].includes(node.value) && tensor.vector && tensor.cols === 1 && tensor.rows === shape.rows) return tensor.cells[row];
            return null;
        };
        const cells = shape.cells.map((_, index) => {
            const row = Math.floor(index / shape.cols), col = index % shape.cols;
            const left = at(a, row, col), right = at(b, row, col);
            return left && right ? binary(left, right) : null;
        });
        return cells.every(Boolean) ? {...shape, cells} : null;
    }

    tex(node) {
        if (node.kind === 'ref') return node.symbol;
        if (node.kind === 'number') return node.value;
        if (node.kind === 'unary') return `${node.value}(${this.tex(node.left)})`;
        if (node.kind === 'call') return `\\${node.value}(${node.args.map(child => this.tex(child)).join(',')})`;
        const a = this.tex(node.left), b = this.tex(node.right);
        if (node.value === '/') return `\\frac{${a}}{${b}}`;
        if (node.value === '^') return `(${a})^{${b}}`;
        const factor = (child, text) => child.kind === 'binary' && ['+', '-'].includes(child.value) ? `(${text})` : text;
        if (node.value === '*') return `${factor(node.left, a)}\\cdot${factor(node.right, b)}`;
        return `${a}${node.value}${node.value === '-' ? factor(node.right, b) : b}`;
    }

    expansion(lhs, tree) {
        const terms = [];
        const split = (node, sign = '') => {
            if (node.kind === 'binary' && ['+', '-'].includes(node.value) && sign !== '-') {
                split(node.left, sign); split(node.right, node.value);
            } else terms.push(sign + (sign === '-' && node.kind === 'binary' ? `(${this.tex(node)})` : this.tex(node)));
        };
        split(tree);
        return terms.length === 1 ? `${lhs}=${terms[0]}`
            : `\\begin{aligned}${lhs}&=${terms.join('\\\\&\\quad ')}\\end{aligned}`;
    }

    match(expected, actual, formula) {
        const bindings = [], constants = [];
        const visit = (a, b) => {
            if (!a || !b) return false;
            if (a.kind === 'ref') {
                if (b.kind === 'symbol' && MathExpression.key(b.value) === MathExpression.key(a.symbol)) return true;
                const numeric = this.cellValue(b);
                if (numeric === null || (a.numeric !== undefined && a.numeric !== numeric)) return false;
                bindings.push({start: b.start, end: b.end, value: formula.slice(b.start, b.end), symbol: a.symbol,
                    sourceSymbol: a.sourceSymbol, steps: a.steps || []});
                return true;
            }
            if (a.kind === 'number') {
                if (this.cellValue(a) !== this.cellValue(b)) return false;
                constants.push({start: b.start, end: b.end}); return true;
            }
            if (a.kind === 'binary' && a.value === '+' && b.kind === 'binary' && b.value === '-') {
                // A negative bias may be written +(-b) or -b. Keep the minus in
                // the target range, so both the displayed value and source agree.
                const sign = formula.slice(b.left.end, b.right.start);
                const minus = Math.max(sign.lastIndexOf('-'), sign.lastIndexOf('−'));
                if (minus < 0) return false;
                return visit(a.left, b.left) && visit(a.right, {kind: 'unary', value: '-', left: b.right,
                    start: b.left.end + minus, end: b.right.end});
            }
            if (a.kind !== b.kind || a.value !== b.value) return false;
            if (a.kind === 'call') return a.args.length === b.args.length && a.args.every((arg, i) => visit(arg, b.args[i]));
            return (!a.left || visit(a.left, b.left)) && (!a.right || visit(a.right, b.right));
        };
        return visit(expected, actual) ? {bindings, constants} : null;
    }

    step(record, kind, node, extra = {}) {
        return {ref: record.id, kind, start: node.start, end: node.end, ...extra};
    }

    apply(numbers, range, steps, extra = {}) {
        const selected = numbers.filter(number => number.start >= range.start && number.end <= range.end);
        if (selected.length !== 1 || MathProvenance.decimal(range.value ?? selected[0].value) === null) return;
        if (/^[−-]\s*[\d.]/.test(range.value || '') && range.start < selected[0].start) {
            Object.assign(selected[0], {start: range.start, end: range.end, value: range.value});
        }
        Object.assign(selected[0], extra, {provenance: MathProvenance.steps(steps)});
    }

    process(record, numbers) {
        this.work = 0;
        const replacements = [];
        for (const statement of record.statements) {
            const lhs = statement.trees[0], info = this.name(lhs);
            if (!info) continue;
            const sourceSymbol = !info.indices && !info.labels ? lhs.latex || info.name : info.name;
            let dependencies = [], defined = false;
            const ownRules = [];
            for (let part = 1; part < statement.trees.length; part++) {
                const actual = statement.trees[part];
                if (!actual) continue;
                const candidates = [...(this.rules.get(info.name) || []), ...ownRules];
                const matches = [];
                for (const candidate of candidates) {
                    if (candidate.info.indices && candidate.info.indices.join(',') !== info.indices?.join(',')) continue;
                    if (candidate.info.labels && (!info.indices || candidate.info.labels.length !== info.indices.length)) continue;
                    const tree = candidate.info.labels
                        ? this.substitute(candidate.tree, new Map(candidate.info.labels.map((label, i) => [label, info.indices[i]]))) : candidate.tree;
                    const tensor = this.expand(tree);
                    if (!tensor) continue;
                    let expected;
                    if (info.indices && !candidate.info.indices && !candidate.info.labels) {
                        const position = this.position(info, tensor);
                        if (position < 0) continue;
                        expected = tensor.cells[position];
                    } else if (tensor.cells.length === 1) expected = tensor.cells[0];
                    else if (actual.kind === 'array' && tensor.rows === actual.rows.length && tensor.cols === actual.rows[0].length) {
                        const cells = actual.rows.flat(), found = tensor.cells.map((cell, i) => this.match(cell, cells[i], record.formula));
                        if (found.every(Boolean)) matches.push({candidate, expected: null,
                            bindings: found.flatMap(item => item.bindings), constants: found.flatMap(item => item.constants)});
                        continue;
                    } else continue;
                    const found = this.match(expected, actual, record.formula);
                    if (found) matches.push({...found, candidate, expected});
                }
                const signatures = new Set(matches.map(match => JSON.stringify(match.bindings.map(binding => [binding.start, binding.end, binding.symbol]))));
                if (signatures.size === 1 && matches.length) {
                    const match = matches.at(-1);
                    const rule = this.step(match.candidate.record, 'rule', match.candidate.tree);
                    const expansion = match.expected && info.indices && !match.candidate.info.indices
                        ? {...rule, kind: 'expansion', expression: this.expansion(record.formula.slice(lhs.start, lhs.end), match.expected)} : null;
                    for (const binding of match.bindings) {
                        const steps = MathProvenance.steps([rule, expansion, ...binding.steps]);
                        this.apply(numbers, binding, steps, {symbol: binding.symbol, sourceSymbol: binding.sourceSymbol});
                        replacements.push({...binding, original: match.candidate.record.formula, provenance: steps});
                    }
                    for (const constant of match.constants) {
                        this.apply(numbers, constant, [rule, expansion].filter(Boolean), {provenanceRole: 'constant'});
                        numbers.filter(number => number.start >= constant.start && number.end <= constant.end).forEach(number => {
                            delete number.symbol; delete number.sourceSymbol; delete number.original;
                        });
                    }
                    dependencies = MathProvenance.steps([rule, expansion, ...match.bindings.flatMap(binding => binding.steps)]);
                } else if (signatures.size > 1) {
                    numbers.filter(number => number.start >= actual.start && number.end <= actual.end).forEach(number => {
                        delete number.symbol; delete number.sourceSymbol; delete number.original;
                        number.provenanceAmbiguous = true;
                    });
                }
                if (this.symbols(actual).length) ownRules.push({tree: actual, record, info});
                const thresholds = node => {
                    if (!node) return;
                    if (node.kind === 'call' && ['max', 'min'].includes(node.value) && this.cellValue(node.args[0]) === '0') {
                        const constant = node.args[0];
                        this.apply(numbers, constant, [this.step(record, 'calculation', constant)], {provenanceRole: 'constant'});
                        numbers.filter(number => number.start >= constant.start && number.end <= constant.end).forEach(number => {
                            delete number.symbol; delete number.sourceSymbol; delete number.original;
                        });
                    }
                    thresholds(node.left); thresholds(node.right); node.args?.forEach(thresholds); node.rows?.flat().forEach(thresholds);
                };
                thresholds(actual);
                // Explicit values are facts. Expressions such as max(0,x) are
                // not evaluated or silently substituted for an unwritten result.
                const tensor = this.expand(actual);
                const literal = tensor && !this.symbols(actual).length && tensor.cells.every(cell => this.cellValue(cell) !== null);
                if (!literal) continue;
                defined = true;
                const cells = tensor.cells.map((cell, index) => {
                    const row = Math.floor(index / tensor.cols), column = index % tensor.cols;
                    const symbol = info.indices || tensor.cells.length === 1 ? MathExpression.key(record.formula.slice(lhs.start, lhs.end))
                        : this.coordinate(info.name, row, column, tensor);
                    const indices = info.indices || (tensor.vector || tensor.cols === 1
                        ? [(tensor.rows === 1 ? column : row) + this.base(info.name)] : [row + this.base(info.name), column + this.base(info.name)]);
                    const prior = !info.indices && this.coordinates.get(info.name)?.get(indices.join(','));
                    const numeric = this.cellValue(cell);
                    const source = this.step(record, statement.trees.length > 2 || info.indices ? 'calculation' : 'source', cell, {symbol});
                    const steps = MathProvenance.steps([source, ...(prior?.numeric === numeric ? prior.steps : dependencies)]);
                    const target = {start: cell.start, end: cell.end, value: record.formula.slice(cell.start, cell.end)};
                    this.apply(numbers, target, steps, {symbol, sourceSymbol});
                    return {kind: 'ref', symbol, sourceSymbol, numeric, steps};
                });
                if (info.indices) {
                    if (cells.length !== 1) continue;
                    if (!this.coordinates.has(info.name)) this.coordinates.set(info.name, new Map());
                    this.coordinates.get(info.name).set(info.indices.join(','), cells[0]);
                } else {
                    this.facts.set(info.name, {...tensor, cells});
                    this.coordinates.delete(info.name);
                }
            }
            if (ownRules.length) {
                if (!info.indices && !defined) { this.facts.delete(info.name); this.coordinates.delete(info.name); }
                const existing = this.rules.get(info.name) || [];
                for (const rule of ownRules) if (!existing.some(prior => prior.record.formula === record.formula && prior.tree.start === rule.tree.start)) existing.push(rule);
                this.rules.set(info.name, existing.slice(-16));
            }
        }
        return replacements;
    }

    publish(document) {
        MathProvenance.documents.set(document, new Map(this.records.map(record => [record.id, record])));
    }

    static record(element, reference) {
        const record = this.documents.get(element.ownerDocument)?.get(reference);
        if (!record?.element.isConnected) return null;
        if (record.element.querySelector('annotation[encoding="application/x-tex"]')?.textContent !== record.formula) return null;
        return record;
    }
}

export default MathProvenance;
