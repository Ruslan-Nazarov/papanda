import MathSymbols from './MathSymbols.js';
import HiddenPhraseTooltip from './HiddenPhraseTooltip.js';
import MathComputedValues from './MathComputedValues.js';
import { t } from '../i18n.js';

const TARGET = '[data-math-symbol], [data-math-value], .katex[data-math-original]';

class MathSymbolTooltip {
    static active = null;
    static dispose = null;
    static hideTimer = null;

    static hide() {
        clearTimeout(this.hideTimer);
        if (!this.active) return;
        const {element, popup, previous, cleanup} = this.active;
        this.active = null;
        cleanup();
        popup.remove();
        if (previous === null) element.removeAttribute('aria-describedby');
        else element.setAttribute('aria-describedby', previous);
    }

    static bind(root, {getContext, onEdit} = {}) {
        this.dispose?.();
        let touchTarget = null;
        const touchStart = event => {
            const touch = event.touches.length === 1 ? event.touches[0] : null;
            const element = touch && document.elementFromPoint(touch.clientX, touch.clientY)?.closest(TARGET);
            touchTarget = element && root.contains(element) ? {element, time: Date.now()} : null;
        };
        const cancelTouch = () => { touchTarget = null; };
        const schedule = () => {
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
            let symbol, substitution, originals = [];
            try {
                if (element.dataset.mathValue) {
                    substitution = JSON.parse(MathSymbols.decode(element.dataset.mathValue));
                    symbol = substitution.symbol;
                    if (substitution.original) originals = [substitution.original];
                } else if (element.dataset.mathSymbol) symbol = MathSymbols.decode(element.dataset.mathSymbol);
                else originals = JSON.parse(MathSymbols.decode(element.dataset.mathOriginal));
            } catch { return; }
            const entry = symbol && MathSymbols.resolve(symbol, context.note, context.block);
            const values = symbol && !substitution ? MathComputedValues.forElement(symbol, element) : [];
            if (!entry && !onEdit && !values.length && !substitution && !originals.length) return;
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
            else label.textContent = t('ms_original_formula');
            const close = document.createElement('button');
            close.type = 'button'; close.textContent = '×'; close.setAttribute('aria-label', t('close'));
            close.addEventListener('click', () => this.hide());
            heading.append(label, close);
            const text = document.createElement('div');
            text.className = 'math-symbol-definition';
            HiddenPhraseTooltip.renderHint(text, entry?.definition || (substitution ? t('ms_substituted_value') : t('ms_undefined')));
            const origin = document.createElement('small');
            origin.textContent = entry ? t(entry.scope === 'block' ? 'ms_block' : 'ms_note') : '';
            popup.append(heading);
            if (symbol) popup.append(text, origin);
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
            if (onEdit && !substitution && !originals.length) {
                const edit = document.createElement('button');
                edit.type = 'button'; edit.className = 'math-symbol-edit';
                edit.textContent = t(entry ? 'ms_edit' : 'ms_add');
                edit.addEventListener('click', () => {
                    this.hide(); onEdit({symbol: entry?.symbol || symbol, element, context});
                });
                popup.appendChild(edit);
            }
            (element.closest('dialog[open]') || document.body).appendChild(popup);
            const position = () => {
                const rect = element.getBoundingClientRect(), size = popup.getBoundingClientRect();
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
            this.active = {element, popup, previous, pinned, cleanup: () => observer.disconnect()};
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
                if (this.active.element.closest('dialog')) event.preventDefault();
                event.stopImmediatePropagation(); this.hide();
            }
            else if (['Enter', ' '].includes(event.key) && target(event)) {
                event.preventDefault(); event.stopPropagation(); show(target(event), true);
            }
        };
        const scroll = event => { if (this.active && !this.active.popup.contains(event.target)) this.hide(); };
        const hide = () => this.hide();
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
        window.addEventListener('resize', hide);
        this.dispose = () => {
            this.hide();
            root.removeEventListener('mouseover', enter); root.removeEventListener('mouseout', leave);
            root.removeEventListener('focusin', enter); root.removeEventListener('focusout', leave);
            root.removeEventListener('click', click, true); document.removeEventListener('keydown', key, true);
            root.removeEventListener('touchstart', touchStart, true); root.removeEventListener('touchmove', cancelTouch, true);
            root.removeEventListener('touchcancel', cancelTouch, true);
            document.removeEventListener('scroll', scroll, true); document.removeEventListener('noteOpened', hide);
            document.removeEventListener('stateDirty', hide); window.removeEventListener('resize', hide);
            this.dispose = null;
        };
        return this.dispose;
    }
}

export default MathSymbolTooltip;
