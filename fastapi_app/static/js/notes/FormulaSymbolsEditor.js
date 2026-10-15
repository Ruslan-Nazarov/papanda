import MathSymbols from './MathSymbols.js';
import { t } from '../i18n.js';

// An isolated modal draft. Applying a formula does not save an outer block editor.
class FormulaSymbolsEditor {
    constructor(container, context, selected = '') {
        this.context = context;
        this.note = structuredClone(context.note || []);
        this.block = structuredClone(context.block || []);
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
