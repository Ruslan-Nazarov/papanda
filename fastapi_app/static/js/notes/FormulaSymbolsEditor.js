import MathSymbols from './MathSymbols.js';
import { t } from '../i18n.js';

// An isolated modal draft. Applying a formula does not save an outer block editor.
class FormulaSymbolsEditor {
    constructor(container, context, selected = '') {
        this.context = context;
        this.note = structuredClone(context.note || []);
        this.block = structuredClone(context.block || []);
        this.original = {note: structuredClone(this.note), block: structuredClone(this.block)};
        this.selected = MathSymbols.normalize(selected);
        this.scope = 'note';
        container.innerHTML = `<details class="formula-definitions">
            <summary>${t('ms_title')}</summary>
            <div class="formula-definition-chips" role="group" aria-label="${t('ms_choose')}"></div>
            <p class="formula-definition-empty">${t('ms_empty')}</p>
            <div class="formula-definition-fields" hidden>
                <label>${t('ms_definition')}<textarea class="formula-definition-text" rows="3" maxlength="5000"></textarea></label>
                <label>${t('ms_scope')}<select class="formula-definition-scope"><option value="note">${t('ms_note')}</option><option value="block">${t('ms_block')}</option></select></label>
                <p class="formula-definition-origin"></p>
                <div class="formula-definition-check" role="status" aria-live="polite" aria-atomic="true"></div>
                <button class="formula-definition-delete" type="button">${t('ms_delete')}</button>
            </div>
        </details>`;
        this.root = container.querySelector('details');
        this.chips = container.querySelector('.formula-definition-chips');
        this.fields = container.querySelector('.formula-definition-fields');
        this.input = container.querySelector('textarea');
        this.select = container.querySelector('select');
        this.empty = container.querySelector('.formula-definition-empty');
        this.origin = container.querySelector('.formula-definition-origin');
        this.check = container.querySelector('.formula-definition-check');
        this.select.disabled = !context.blockId;
        this.input.setAttribute('aria-label', t('ms_definition'));
        this.select.setAttribute('aria-label', t('ms_scope'));
        this.input.addEventListener('input', () => this.store());
        this.select.addEventListener('change', () => { this.scope = this.select.value; this.fill(); });
        container.querySelector('.formula-definition-delete').addEventListener('click', () => {
            this.input.value = '';
            this.store();
            this.fill();
        });
        if (selected) this.root.open = true;
    }

    store() {
        if (!this.selected) return;
        const entries = this.scope === 'block' ? this.block : this.note;
        const index = entries.findIndex(entry => MathSymbols.normalize(entry.symbol) === this.selected);
        if (index >= 0) entries.splice(index, 1);
        if (this.input.value.trim()) entries.push({symbol: this.selected, definition: this.input.value.trim()});
        this.checkDefinitions();
    }

    existingDefinitions(symbol, scope) {
        const key = MathSymbols.normalize(symbol);
        const base = value => MathSymbols.normalize(MathSymbols.atoms(value)[0]?.base || value);
        const sources = [
            {entries: this.note, scope: 'note', label: t('ms_note')},
            {entries: this.block, scope: 'block', label: t('ms_block'), current: true},
            ...(this.context.blocks || []).filter(block => block.id !== this.context.blockId).map((block, index) => ({
                entries: block.math_symbols || [], scope: 'block',
                label: `${t('ms_source_block')}: ${block.title || index + 1}`,
            })),
        ];
        const matches = [];
        for (const source of sources) {
            let entries = source.entries;
            // Keep the saved meaning visible while its replacement is being typed.
            if (source.scope === scope && (scope === 'note' || source.current)) {
                entries = entries.filter(entry => MathSymbols.normalize(entry.symbol) !== key)
                    .concat(this.original[scope].filter(entry => MathSymbols.normalize(entry.symbol) === key));
            }
            for (const entry of entries) {
                const entryKey = MathSymbols.normalize(entry.symbol);
                if (!entry.definition?.trim() || base(entryKey) !== base(key)) continue;
                // Indexed siblings (h_1 and h_2) are related but independent.
                const overlaps = entryKey === key || entryKey === base(key) || key === base(entryKey);
                const affectsScope = scope === 'note' || source.scope === 'note' || source.current;
                matches.push({...entry, source: source.label, overlaps: overlaps && affectsScope});
            }
        }
        return matches;
    }

    checkDefinitions() {
        const clean = value => value.trim().replace(/\s+/g, ' ');
        const current = this.input.value;
        const differs = (entry, value) => !!value.trim() && entry.overlaps && clean(entry.definition) !== clean(value);
        const matches = this.existingDefinitions(this.selected, this.scope);
        const conflict = matches.some(entry => differs(entry, current));
        this.check.dataset.state = conflict ? 'conflict' : 'info';
        this.check.replaceChildren();
        const heading = document.createElement('strong');
        heading.textContent = t(conflict ? 'ms_conflict' : matches.length ? 'ms_existing' : 'ms_no_matches');
        this.check.appendChild(heading);
        if (conflict) {
            const help = document.createElement('p');
            help.textContent = t('ms_conflict_help');
            this.check.appendChild(help);
        }
        if (matches.length) {
            const list = document.createElement('ul');
            for (const entry of matches) {
                const row = document.createElement('li');
                row.classList.toggle('has-conflict', differs(entry, current));
                const source = document.createElement('small');
                source.textContent = `${entry.source} · ${entry.symbol}`;
                const definition = document.createElement('p');
                definition.textContent = entry.definition;
                row.append(source, definition);
                if (clean(entry.definition) !== clean(current)) {
                    const use = document.createElement('button');
                    use.type = 'button';
                    use.className = 'formula-definition-reuse';
                    use.textContent = t('ms_use_existing');
                    use.addEventListener('click', () => {
                        this.input.value = entry.definition;
                        this.store();
                        this.input.focus();
                    });
                    row.appendChild(use);
                }
                list.appendChild(row);
            }
            this.check.appendChild(list);
        }
        this.chips.querySelectorAll('button').forEach(button => {
            const symbol = button.dataset.symbol;
            const resolved = MathSymbols.resolve(symbol, this.note, this.block);
            const scope = symbol === this.selected ? this.scope : resolved?.scope || 'note';
            const own = (scope === 'block' ? this.block : this.note)
                .find(entry => MathSymbols.normalize(entry.symbol) === symbol);
            const existing = this.existingDefinitions(symbol, scope);
            const state = existing.some(entry => differs(entry, own?.definition || '')) ? 'conflict'
                : existing.length || resolved ? 'defined' : '';
            button.dataset.definitionState = state;
            button.title = state ? t(state === 'conflict' ? 'ms_conflict' : 'ms_existing') : '';
        });
    }

    fill() {
        this.select.value = this.scope;
        const own = (this.scope === 'block' ? this.block : this.note)
            .find(entry => MathSymbols.normalize(entry.symbol) === this.selected);
        const inherited = MathSymbols.resolve(this.selected, this.note);
        this.input.value = own?.definition || '';
        this.input.placeholder = this.scope === 'block' && inherited ? inherited.definition : t('ms_placeholder');
        this.origin.textContent = this.scope === 'block' ? t('ms_local_help') : t('ms_global_help');
        this.chips.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.symbol === this.selected)));
        this.checkDefinitions();
    }

    update(formula) {
        const candidates = MathSymbols.candidates(formula);
        if (!candidates.some(entry => entry.symbol === this.selected)) this.selected = candidates[0]?.symbol || '';
        this.chips.replaceChildren();
        for (const entry of candidates) {
            const button = document.createElement('button');
            button.type = 'button';
            button.dataset.symbol = entry.symbol;
            button.setAttribute('aria-label', entry.symbol);
            if (window.katex) button.innerHTML = window.katex.renderToString(entry.latex, {throwOnError: false, trust: false});
            else button.textContent = entry.latex;
            button.addEventListener('click', () => {
                this.selected = entry.symbol;
                this.scope = MathSymbols.resolve(entry.symbol, this.note, this.block)?.scope || 'note';
                this.fill();
            });
            this.chips.appendChild(button);
        }
        this.empty.hidden = !!candidates.length;
        this.fields.hidden = !candidates.length;
        this.scope = MathSymbols.resolve(this.selected, this.note, this.block)?.scope || 'note';
        this.fill();
    }

    apply() {
        this.context.note = structuredClone(this.note);
        this.context.block = structuredClone(this.block);
    }
}

export default FormulaSymbolsEditor;
