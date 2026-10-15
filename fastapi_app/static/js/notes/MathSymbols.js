// TeX atoms, not substring replacements: indexed expressions retain their
// complete meaning, with independent targets for symbols inside their scripts.
const SYMBOL_COMMANDS = new Set(('alpha beta gamma delta epsilon varepsilon zeta eta theta vartheta iota kappa lambda mu nu xi pi varpi rho varrho sigma varsigma tau upsilon phi varphi chi psi omega Gamma Delta Theta Lambda Xi Pi Sigma Upsilon Phi Psi Omega partial nabla infty ell Re Im sin cos tan cot sinh cosh tanh log ln exp min max det dim gcd lim sum prod int iint oint cdot times div pm mp le leq ge geq ne neq approx equiv in notin subset subseteq supset supseteq to mapsto rightarrow leftarrow Rightarrow Leftrightarrow forall exists top intercal').split(' '));
const ATOM_WRAPPERS = new Set(['mathbf', 'mathit', 'mathrm', 'mathcal', 'mathbb', 'mathsf', 'mathtt', 'boldsymbol', 'vec', 'hat', 'bar', 'overline', 'tilde', 'dot', 'ddot', 'operatorname']);
const RAW_ARGUMENTS = new Map([['text', 1], ['textrm', 1], ['textbf', 1], ['textit', 1], ['begin', 1], ['end', 1], ['color', 1], ['textcolor', 1], ['htmlData', 2], ['htmlClass', 2], ['htmlId', 2], ['htmlStyle', 2], ['href', 2], ['url', 1]]);

class MathSymbols {
    // Hex is also safe inside TeX's raw arguments (% would start a comment).
    static encode(symbol) { return Array.from(symbol, char => char.codePointAt(0).toString(16)).join('-'); }
    static decode(value) {
        if (!/^[a-f0-9]+(?:-[a-f0-9]+)*$/.test(value)) throw new Error('Invalid symbol key');
        return value.split('-').map(part => String.fromCodePoint(parseInt(part, 16))).join('');
    }
    static normalize(symbol) {
        return String(symbol || '').trim().replace(/\s+/g, '')
            .replace(/([_^])([^{}\\])/g, '$1{$2}');
    }

    static groupEnd(text, start) {
        const close = text[start] === '{' ? '}' : text[start] === '[' ? ']' : null;
        if (!close) return start;
        let depth = 0;
        for (let i = start; i < text.length; i++) {
            if (text[i] === '\\') { i++; continue; }
            if (text[i] === text[start]) depth++;
            if (text[i] === close && --depth === 0) return i + 1;
        }
        return start;
    }

    static atoms(formula) {
        const text = String(formula || '');
        const atoms = [];
        for (let i = 0; i < text.length;) {
            const start = i;
            let eligible = /[A-Za-z\u0370-\u03ff=+−*-]/.test(text[i]);
            if (text[i] === '%') { const end = text.indexOf('\n', i); i = end < 0 ? text.length : end; continue; }
            if (text[i] === '\\') {
                const match = text.slice(i).match(/^\\([A-Za-z]+|.)/);
                if (!match) { i++; continue; }
                const name = match[1];
                i += match[0].length;
                eligible = SYMBOL_COMMANDS.has(name);
                const count = ATOM_WRAPPERS.has(name) ? 1 : RAW_ARGUMENTS.get(name) || 0;
                for (let arg = 0; arg < count; arg++) {
                    while (/\s/.test(text[i] || '') && i < text.length) i++;
                    const end = this.groupEnd(text, i);
                    if (end === i) break;
                    i = end;
                }
                if (ATOM_WRAPPERS.has(name)) eligible = true;
                // Delimiters and optional root degrees are syntax, not identifiers.
                if (['left', 'right', 'middle', 'big', 'Big', 'bigl', 'bigr', 'Bigl', 'Bigr'].includes(name)) {
                    const delimiter = text.slice(i).match(/^\s*(?:\\[A-Za-z]+|\\.|.)/);
                    if (delimiter) i += delimiter[0].length;
                }
                if (name === 'sqrt' && text[i] === '[') i = this.groupEnd(text, i) || i + 1;
            } else i++;
            if (!eligible) continue;
            const base = text.slice(start, i);
            const indices = [];
            const scripts = [];
            while (true) {
                let pos = i;
                while (pos < text.length && /\s/.test(text[pos])) pos++;
                if (!['_', '^'].includes(text[pos])) break;
                const modifierStart = pos, operator = text[pos];
                pos++;
                while (pos < text.length && /\s/.test(text[pos])) pos++;
                const end = this.groupEnd(text, pos);
                if (end > pos) {
                    indices.push(text.slice(pos + 1, end - 1));
                    scripts.push({start: pos, end, braced: true, modifierStart, operator});
                    i = end;
                }
                else {
                    const single = text.slice(pos).match(/^(?:\\[A-Za-z]+|[A-Za-z0-9])/);
                    if (!single) break;
                    indices.push(single[0]); i = pos + single[0].length;
                    scripts.push({start: pos, end: i, braced: false, modifierStart, operator});
                }
            }
            atoms.push({symbol: this.normalize(text.slice(start, i)), latex: text.slice(start, i), base, start, end: i, indices, scripts});
        }
        return atoms;
    }

    static candidates(formula) {
        const symbols = new Map();
        const visit = (text, depth = 0) => {
            if (depth > 16) return;
            for (const atom of this.atoms(text)) {
                symbols.set(atom.symbol, atom.latex);
                if (atom.indices.length) symbols.set(this.normalize(atom.base), atom.base);
                for (const script of atom.scripts) if (this.isTranspose(atom, script, text)) {
                    const operand = text.slice(atom.start, script.modifierStart);
                    symbols.set(this.normalize(operand), operand);
                }
                for (const index of atom.indices) visit(index, depth + 1);
            }
        };
        visit(formula);
        return [...symbols].map(([symbol, latex]) => ({symbol, latex}));
    }

    static isTranspose(atom, script, formula) {
        const content = script.braced ? formula.slice(script.start + 1, script.end - 1)
            : formula.slice(script.start, script.end);
        return script.operator === '^' && /^(?:\\top|\\intercal|\\(?:mathsf|mathrm)\{T\})$/.test(content.trim());
    }

    static resolve(symbol, note = [], block = []) {
        const key = this.normalize(symbol);
        const base = this.normalize(this.atoms(symbol)[0]?.base || symbol);
        for (const [entries, scope] of [[block, 'block'], [note, 'note']]) {
            const entry = entries.find(item => this.normalize(item.symbol) === key)
                || entries.find(item => this.normalize(item.symbol) === base);
            if (entry) return {...entry, scope};
        }
        return null;
    }

    static annotate(formula, allowed, depth = 0) {
        if (depth > 16) return formula;
        let annotated = '', offset = 0;
        for (const atom of this.atoms(formula)) {
            let latex = atom.base, cursor = atom.start + atom.base.length;
            for (const script of atom.scripts) {
                if (this.isTranspose(atom, script, formula)) {
                    const operand = this.normalize(formula.slice(atom.start, script.modifierStart));
                    const operandId = this.encode(operand);
                    allowed.add(operandId);
                    latex = `\\htmlData{math-symbol=${operandId}}{${latex}${formula.slice(cursor, script.modifierStart)}}`;
                    cursor = script.modifierStart;
                }
                latex += formula.slice(cursor, script.start);
                const content = script.braced ? formula.slice(script.start + 1, script.end - 1)
                    : formula.slice(script.start, script.end);
                // A bare _t must become _{...} so the wrapper stays in the script.
                latex += `{${this.annotate(content, allowed, depth + 1)}}`;
                cursor = script.end;
            }
            latex += formula.slice(cursor, atom.end);
            const id = this.encode(atom.symbol);
            allowed.add(id);
            annotated += formula.slice(offset, atom.start) + `\\htmlData{math-symbol=${id}}{${latex}}`;
            offset = atom.end;
        }
        return annotated + formula.slice(offset);
    }

    static render(formula, options = {}, substitutions = []) {
        const allowed = new Set();
        const allowedValues = new Set();
        let prepared = '', offset = 0;
        for (const replacement of [...substitutions].sort((a, b) => a.start - b.start)) {
            if (!Number.isInteger(replacement.start) || !Number.isInteger(replacement.end)
                || replacement.start < offset || replacement.end <= replacement.start || replacement.end > formula.length) continue;
            const id = this.encode(JSON.stringify(replacement));
            allowedValues.add(id);
            prepared += formula.slice(offset, replacement.start) + `\\htmlData{math-value=${id}}{${formula.slice(replacement.start, replacement.end)}}`;
            offset = replacement.end;
        }
        prepared += formula.slice(offset);
        const annotated = this.annotate(prepared, allowed);
        const html = window.katex.renderToString(annotated, {...options, throwOnError: false,
            strict: false, trust: context => context.command === '\\htmlData'
                && Object.keys(context.attributes).length === 1
                && (allowed.has(context.attributes['data-math-symbol']) || allowedValues.has(context.attributes['data-math-value']))});
        // Preserve original TeX for copying, export and subsequent rendering.
        const template = document.createElement('template');
        template.innerHTML = html;
        if (template.content.querySelector('.katex-error')) {
            return window.katex.renderToString(formula, {...options, throwOnError: false, trust: false});
        }
        const annotation = template.content.querySelector('annotation[encoding="application/x-tex"]');
        if (annotation) annotation.textContent = formula;
        template.content.querySelectorAll('[data-math-symbol]').forEach(el => {
            el.setAttribute('role', 'button');
            el.setAttribute('tabindex', '0');
            el.setAttribute('aria-label', this.decode(el.dataset.mathSymbol));
        });
        template.content.querySelectorAll('[data-math-value]').forEach(el => {
            const value = JSON.parse(this.decode(el.dataset.mathValue));
            el.setAttribute('role', 'button');
            el.setAttribute('tabindex', '0');
            el.setAttribute('aria-label', `${value.symbol} = ${value.value}`);
        });
        template.content.querySelector('.katex')?.setAttribute('data-symbols-rendered', 'true');
        return template.innerHTML;
    }

    static decorate(root) {
        if (!window.katex) return;
        root.querySelectorAll('.katex:not([data-symbols-rendered])').forEach(el => {
            const formula = el.querySelector('annotation[encoding="application/x-tex"]')?.textContent;
            if (!formula || !this.atoms(formula).length) return;
            const template = document.createElement('template');
            template.innerHTML = this.render(formula, {displayMode: !!el.closest('.katex-display')});
            const rendered = template.content.querySelector('.katex');
            if (rendered && !template.content.querySelector('.katex-error')) el.replaceWith(rendered);
        });
    }
}

export default MathSymbols;
