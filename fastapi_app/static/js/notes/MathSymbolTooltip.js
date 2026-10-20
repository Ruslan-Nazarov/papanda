import MathSymbols from './MathSymbols.js';
import HiddenPhraseTooltip from './HiddenPhraseTooltip.js';
import MathComputedValues from './MathComputedValues.js';
import MathDefinitionContext from './MathDefinitionContext.js';
import MathDefinitionSuggestion from './MathDefinitionSuggestion.js';
import MathProvenanceView from './MathProvenanceView.js';
import { t } from '../i18n.js';

const TARGET = '[data-math-symbol], [data-math-value], [data-math-number], .katex[data-math-original]';

class MathSymbolTooltip {
    static active = null;
    static dispose = null;
    static hideTimer = null;
    static highlighted = [];
    static highlightModes = {value: true, provenance: true};

    static highlight(element) {
        this.highlighted.forEach(node => node.classList.remove('math-number-match', 'math-provenance-match'));
        this.highlighted = [];
        const targets = element.matches('[data-math-number]') ? [element] : [...element.querySelectorAll('[data-math-number]')];
        const scope = element.closest('.formula-zoom-dialog, .dialectics-block, .blk');
        if (targets.length !== 1 || !scope) return;
        try {
            const selected = JSON.parse(MathSymbols.decode(targets[0].dataset.mathNumber));
            const groups = {value: [], provenance: []};
            if (selected.provenance?.length) {
                groups.provenance = MathProvenanceView.targets(targets[0], selected);
            }
            const key = MathSymbols.numberKey(selected.value);
            const matches = [];
            scope.querySelectorAll('[data-math-number]').forEach(node => {
                if (node.closest('.tiptap, [contenteditable="true"], .math-symbol-tooltip')) return;
                const number = JSON.parse(MathSymbols.decode(node.dataset.mathNumber));
                if (MathSymbols.numberKey(number.value) === key) matches.push(node);
            });
            // The hovered number alone is not a match: require another occurrence.
            if (matches.length >= 2) groups.value = matches;
            this.highlighted = [...new Set([...groups.value, ...groups.provenance])];
            this.setHighlightGroup(groups, 'value', this.highlightModes.value);
            this.setHighlightGroup(groups, 'provenance', this.highlightModes.provenance);
            return groups;
        } catch { /* Ignore invalid metadata in imported HTML. */ }
    }

    static setHighlightGroup(groups, kind, enabled) {
        const className = kind === 'value' ? 'math-number-match' : 'math-provenance-match';
        groups[kind].forEach(node => node.classList.toggle(className, enabled));
    }

    static highlightControls(groups) {
        if (!groups || !Object.values(groups).some(nodes => nodes.length)) return null;
        const controls = document.createElement('fieldset');
        controls.className = 'math-highlight-controls';
        const legend = document.createElement('legend');
        legend.textContent = t('ms_highlight_controls'); controls.append(legend);
        for (const kind of ['value', 'provenance']) {
            const label = document.createElement('label');
            label.className = `math-highlight-option math-highlight-${kind}`;
            const input = document.createElement('input');
            input.type = 'checkbox'; input.dataset.highlightKind = kind;
            input.disabled = !groups[kind].length;
            input.checked = !input.disabled && this.highlightModes[kind];
            const sample = document.createElement('span');
            sample.className = 'math-highlight-sample'; sample.setAttribute('aria-hidden', 'true');
            const text = document.createElement('span'); text.textContent = t(`ms_highlight_${kind}`);
            input.addEventListener('change', () => {
                this.highlightModes[kind] = input.checked;
                this.setHighlightGroup(groups, kind, input.checked);
            });
            label.append(input, sample, text); controls.append(label);
        }
        return controls;
    }

    static hide() {
        clearTimeout(this.hideTimer);
        this.hideTimer = null;
        this.highlighted.forEach(node => node.classList.remove('math-number-match', 'math-provenance-match'));
        this.highlighted = [];
        if (!this.active) return;
        const {element, popup, previous, cleanup} = this.active;
        this.active = null;
        cleanup();
        popup.remove();
        if (previous === null) element.removeAttribute('aria-describedby');
        else element.setAttribute('aria-describedby', previous);
    }

    static bind(root, {getContext, onEdit, onSuggest, onAccept, onRemoveNumber} = {}) {
        this.dispose?.();
        let touchTarget = null;
        const touchStart = event => {
            const touch = event.touches.length === 1 ? event.touches[0] : null;
            const element = touch && document.elementFromPoint(touch.clientX, touch.clientY)?.closest(TARGET);
            touchTarget = element && root.contains(element) ? {element, time: Date.now()} : null;
        };
        const cancelTouch = () => { touchTarget = null; };
        const schedule = () => {
            clearTimeout(this.hideTimer);
            if (!this.active?.pinned) this.hideTimer = setTimeout(() => this.hide(), 160);
        };
        const target = event => event.target.closest?.(TARGET);
        const show = (element, pinned = false) => {
            const context = getContext?.(element);
            if (!context) return;
            if (this.active?.element === element) {
                this.active.pinned ||= pinned;
                clearTimeout(this.hideTimer);
                return;
            }
            if (this.active?.pinned && !pinned) return;
            this.hide();
            let symbol, substitution, number, originals = [];
            try {
                if (element.dataset.mathNumber) {
                    number = JSON.parse(MathSymbols.decode(element.dataset.mathNumber));
                    if (number.symbol) {
                        substitution = {...number, value: number.expressionValue || number.value};
                        symbol = number.symbol;
                        if (number.original) originals = [number.original];
                    }
                } else if (element.dataset.mathValue) {
                    substitution = JSON.parse(MathSymbols.decode(element.dataset.mathValue));
                    symbol = substitution.symbol;
                    if (substitution.original) originals = [substitution.original];
                } else if (element.dataset.mathSymbol) symbol = MathSymbols.decode(element.dataset.mathSymbol);
                else originals = JSON.parse(MathSymbols.decode(element.dataset.mathOriginal));
            } catch { return; }
            const mathTarget = MathDefinitionContext.target(element, symbol, number, originals);
            const numberEntry = number && (context.numberDefinitions || []).find(item => MathDefinitionContext.sameNumber(item, mathTarget));
            const entry = numberEntry ? {...numberEntry, scope: 'block'} : symbol && (MathSymbols.resolve(symbol, context.note, context.block)
                || (number?.sourceSymbol && MathSymbols.resolve(number.sourceSymbol, context.note, context.block)));
            const values = symbol && !substitution ? MathComputedValues.forElement(symbol, element) : [];
            if (!entry && !onEdit && !values.length && !substitution && !originals.length && !number) return;
            const highlightGroups = this.highlight(element);
            const popup = document.createElement('div');
            popup.className = 'math-symbol-tooltip';
            popup.id = 'math-symbol-tooltip';
            popup.setAttribute('role', 'dialog');
            popup.setAttribute('aria-label', t('ms_definition'));
            const heading = document.createElement('div');
            heading.className = 'math-symbol-tooltip-heading';
            const label = document.createElement('span');
            if (symbol) label.innerHTML = window.katex.renderToString(substitution ? `${symbol} = ${substitution.value}` : symbol,
                {throwOnError: false, trust: false});
            else if (number) label.innerHTML = window.katex.renderToString(number.value, {throwOnError: false, trust: false});
            else label.textContent = t('ms_original_formula');
            const close = document.createElement('button');
            close.type = 'button'; close.textContent = '×'; close.setAttribute('aria-label', t('close'));
            close.addEventListener('click', () => this.hide());
            heading.append(label, close);
            const text = document.createElement('div');
            text.className = 'math-symbol-definition';
            HiddenPhraseTooltip.renderHint(text, entry?.definition || (number?.provenanceRole === 'constant' ? t('ms_provenance_constant') : substitution ? t('ms_substituted_value')
                : number ? t('ms_number_unassigned') : t('ms_undefined')));
            const origin = document.createElement('small');
            origin.textContent = entry ? t(entry.scope === 'block' ? 'ms_block' : 'ms_note') : '';
            popup.append(heading);
            const highlightControls = this.highlightControls(highlightGroups);
            if (highlightControls) popup.append(highlightControls);
            if (symbol || number) popup.append(text, origin);
            MathProvenanceView.mount(popup, element, number || substitution, () => this.hide());
            if (originals.length) {
                const section = document.createElement('section');
                section.className = 'math-symbol-original';
                if (symbol) {
                    const title = document.createElement('small');
                    title.textContent = t('ms_original_formula');
                    section.append(title);
                }
                for (const formula of originals) {
                    const row = document.createElement('div');
                    row.className = 'math-symbol-value-formula';
                    row.innerHTML = window.katex.renderToString(formula, {throwOnError: false, trust: false});
                    section.append(row);
                }
                popup.append(section);
            }
            if (values.length) {
                const section = document.createElement('details');
                section.className = 'math-symbol-values';
                const title = document.createElement('summary');
                title.textContent = `${t(values.length === 1 ? 'ms_computed_value' : 'ms_computed_values')} (${values.length})`;
                const list = document.createElement('ol');
                for (const value of values) {
                    const item = document.createElement('li');
                    const result = document.createElement('div');
                    result.className = 'math-symbol-value-formula';
                    result.innerHTML = window.katex.renderToString(`${value.symbol} ${value.relation} ${value.value}`,
                        {throwOnError: false, trust: false});
                    item.append(result);
                    const source = document.createElement('small');
                    source.textContent = value.blockNumber
                        ? `${t('ms_source_block')} ${value.blockNumber}${value.blockTitle ? `: ${value.blockTitle}` : ''}`
                        : t('ms_calculation');
                    item.append(source);
                    list.appendChild(item);
                }
                section.append(title, list);
                popup.appendChild(section);
            }
            if (onEdit && symbol && !substitution && !originals.length) {
                const edit = document.createElement('button');
                edit.type = 'button'; edit.className = 'math-symbol-edit';
                edit.textContent = t(entry ? 'ms_edit' : 'ms_add');
                edit.addEventListener('click', () => {
                    this.hide(); onEdit({symbol: entry?.symbol || symbol, element, context});
                });
                popup.appendChild(edit);
            }
            let cancelSuggestion;
            if (onSuggest && onAccept && (!entry || numberEntry) && (symbol || number)) {
                const selection = {symbol, number, numberDefinition: numberEntry, element, context, target: mathTarget};
                cancelSuggestion = MathDefinitionSuggestion.mount(popup, {
                    initial: numberEntry?.definition || '',
                    suggest: signal => onSuggest({...selection, signal}),
                    accept: definition => onAccept({...selection, definition}),
                    remove: numberEntry && onRemoveNumber ? () => onRemoveNumber(selection) : null,
                    pin: () => { clearTimeout(this.hideTimer); if (this.active) this.active.pinned = true; },
                    position: () => position(),
                });
            }
            (element.closest('dialog[open]') || document.body).appendChild(popup);
            let anchorRect;
            const position = () => {
                const rect = element.getBoundingClientRect(), size = popup.getBoundingClientRect();
                anchorRect = {top: rect.top, left: rect.left, bottom: rect.bottom, right: rect.right};
                popup.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - size.width - 8))}px`;
                popup.style.top = `${rect.bottom + size.height + 8 < window.innerHeight ? rect.bottom + 6 : Math.max(8, rect.top - size.height - 6)}px`;
            };
            position();
            popup.addEventListener('toggle', position, true);
            const previous = element.getAttribute('aria-describedby');
            element.setAttribute('aria-describedby', [previous, popup.id].filter(Boolean).join(' '));
            popup.addEventListener('mouseenter', () => clearTimeout(this.hideTimer));
            popup.addEventListener('mouseleave', schedule);
            popup.addEventListener('focusin', () => { if (this.active) this.active.pinned = true; });
            const observer = new MutationObserver(() => { if (!element.isConnected) this.hide(); });
            observer.observe(document.body, {childList: true, subtree: true});
            this.active = {element, popup, previous, pinned, position, get anchorRect() { return anchorRect; },
                cleanup: () => { observer.disconnect(); cancelSuggestion?.(); }};
        };
        const enter = event => { const el = target(event); if (el && root.contains(el)) show(el); };
        const leave = event => { const el = target(event); if (el && !el.contains(event.relatedTarget)) schedule(); };
        const click = event => {
            // Mobile browsers may retarget a tap on h to the tiny adjacent index.
            // The original touch coordinate preserves the symbol actually touched.
            const el = touchTarget && Date.now() - touchTarget.time < 1000
                && touchTarget.element.isConnected ? touchTarget.element : target(event);
            touchTarget = null;
            if (el && root.contains(el) && getContext?.(el)) { event.preventDefault(); event.stopPropagation(); show(el, true); }
            else if (this.active && !this.active.popup.contains(event.target)) this.hide();
        };
        const key = event => {
            if (event.key === 'Escape' && this.active) {
                event.preventDefault();
                event.stopImmediatePropagation(); this.hide();
            }
            else if (['Enter', ' '].includes(event.key) && target(event)) {
                event.preventDefault(); event.stopPropagation(); show(target(event), true);
            }
        };
        const scroll = event => {
            if (!this.active || this.active.popup.contains(event.target)) return;
            // Native dialogs and scrollIntoView can deliver a scroll notification
            // after hover has already measured the final position. It is not a
            // new movement of this target and must not dismiss its new tooltip.
            const rect = this.active.element.getBoundingClientRect();
            if (['top', 'left', 'bottom', 'right'].some(key => Math.abs(rect[key] - this.active.anchorRect[key]) > .5)) this.hide();
        };
        const hide = () => { this.hide(); MathProvenanceView.clearNavigation(); };
        const resize = () => this.active?.position();
        root.addEventListener('mouseover', enter);
        root.addEventListener('mouseout', leave);
        root.addEventListener('focusin', enter);
        root.addEventListener('focusout', leave);
        root.addEventListener('click', click, true);
        root.addEventListener('touchstart', touchStart, {capture: true, passive: true});
        root.addEventListener('touchmove', cancelTouch, {capture: true, passive: true});
        root.addEventListener('touchcancel', cancelTouch, true);
        document.addEventListener('keydown', key, true);
        document.addEventListener('scroll', scroll, true);
        document.addEventListener('noteOpened', hide);
        document.addEventListener('stateDirty', hide);
        window.addEventListener('resize', resize);
        this.dispose = () => {
            this.hide();
            MathProvenanceView.clearNavigation();
            root.removeEventListener('mouseover', enter); root.removeEventListener('mouseout', leave);
            root.removeEventListener('focusin', enter); root.removeEventListener('focusout', leave);
            root.removeEventListener('click', click, true); document.removeEventListener('keydown', key, true);
            root.removeEventListener('touchstart', touchStart, true); root.removeEventListener('touchmove', cancelTouch, true);
            root.removeEventListener('touchcancel', cancelTouch, true);
            document.removeEventListener('scroll', scroll, true); document.removeEventListener('noteOpened', hide);
            document.removeEventListener('stateDirty', hide); window.removeEventListener('resize', resize);
            this.dispose = null;
        };
        return this.dispose;
    }
}

export default MathSymbolTooltip;
