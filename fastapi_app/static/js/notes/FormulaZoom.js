import { t } from '../i18n.js';
import MathSymbols from './MathSymbols.js';
import CalculationFolds from './CalculationFolds.js';

const EXCLUDED = '.tiptap, [contenteditable="true"], .formula-modal-backdrop, .formula-zoom-dialog, .hidden-phrase-tooltip, .math-symbol-tooltip';

class FormulaZoom {
    static initialized = false;
    static active = null;
    static columnObserver = null;
    static columnWidths = new WeakMap();

    static naturalWidth(element) {
        const html = element.querySelector('.katex-html');
        const bases = [...element.querySelectorAll('.katex-html > .base')];
        return Math.max(html?.scrollWidth || 0, html?.getBoundingClientRect().width || 0,
            bases.reduce((width, base) => width + base.getBoundingClientRect().width, 0));
    }

    static layout(element) {
        if (element.closest('.katex-display, .math-callout')) return;
        const host = element.closest('.math-inline') || element.closest('.math-expandable');
        const column = host?.parentElement?.closest('p, li, td, th, .block-content, .blk-body');
        if (!host || !column || !element.isConnected) return;
        const style = window.getComputedStyle(column);
        const available = column.clientWidth - (parseFloat(style.paddingLeft) || 0) - (parseFloat(style.paddingRight) || 0);
        if (available <= 0) return;
        const width = this.naturalWidth(element);
        const wrapper = element.parentElement;
        const wrapperStyle = window.getComputedStyle(wrapper);
        const controls = [...wrapper.querySelectorAll(':scope > button')];
        const controlsWidth = controls.reduce((total, button) => total + button.getBoundingClientRect().width, 0)
            + controls.length * (parseFloat(wrapperStyle.columnGap) || 0);
        // Matrices and multiline calculations get their own row. Adjacent inline
        // atoms can otherwise form one unbreakable run wider than the column.
        // Measure the formula itself so a previous block layout cannot keep it wide.
        host.classList.toggle('math-formula-wide', !!element.querySelector('math mtable')
            || width > Math.min(420, Math.max(220, available * .72))
            || width + controlsWidth + 32 > available);
    }

    static isComplex(element) {
        const math = element.querySelector('math');
        if (!math) return false;
        const fractions = math.querySelectorAll('mfrac');
        // Scripts inside a fraction shrink twice, even in a short formula.
        const smallFractionScripts = [...fractions].some(fraction => fraction.querySelector('msub, msup, msubsup'));
        const largeOperator = [...math.querySelectorAll('mo')].some(el => /[∑∏∫∮∬∭]/u.test(el.textContent));
        // Judge the rendered structure, so formatting commands do not inflate complexity.
        const structural = smallFractionScripts || fractions.length >= 2 || !!math.querySelector('mtable, mfrac mfrac, mfrac msqrt, mfrac mroot, msqrt mfrac, mroot mfrac')
            || (largeOperator && !!math.querySelector('msub, msup, msubsup, munder, munderover'))
            || [...math.querySelectorAll('mi, mn, mo, mtext')].map(el => el.textContent).join('').replace(/\s/g, '').length >= 36;
        const rect = element.getBoundingClientRect();
        const width = this.naturalWidth(element);
        const fontSize = parseFloat(window.getComputedStyle(element).fontSize) || 18;
        const column = element.closest('.block-content, .blk-body');
        const style = column && window.getComputedStyle(column);
        const available = column?.clientWidth - (parseFloat(style?.paddingLeft) || 0) - (parseFloat(style?.paddingRight) || 0);
        return structural || width >= 320 || rect.height >= fontSize * 3
            || (available > 0 && width > available - 8);
    }

    static decorate(root) {
        if (!this.initialized) {
            this.initialized = true;
            let frame;
            window.addEventListener('resize', () => {
                cancelAnimationFrame(frame);
                frame = requestAnimationFrame(() => this.scan(document));
            });
            document.fonts?.ready.then(() => this.scan(document));
            if (window.ResizeObserver) {
                this.columnObserver = new ResizeObserver(entries => {
                    for (const {target, contentRect} of entries) {
                        if (!target.isConnected) {
                            this.columnObserver.unobserve(target);
                            this.columnWidths.delete(target);
                            continue;
                        }
                        // Opening a collapsed card or changing its reading width
                        // does not emit a window resize event. Ignore height-only
                        // changes caused by the formula layout itself.
                        if (this.columnWidths.get(target) === contentRect.width) continue;
                        this.columnWidths.set(target, contentRect.width);
                        if (contentRect.width > 0) this.scan(target);
                    }
                });
            }
        }
        const columns = [...root.querySelectorAll('.block-content, .blk-body')];
        if (root.matches?.('.block-content, .blk-body')) columns.push(root);
        columns.forEach(column => this.columnObserver?.observe(column));
        this.scan(root);
        // Blocks are often rendered before they are inserted into the document.
        window.requestAnimationFrame?.(() => { if (root.isConnected) this.scan(root); });
    }

    static scan(root) {
        root.querySelectorAll('.katex').forEach(element => {
            if (element.closest(EXCLUDED)) return;
            const formula = element.querySelector('annotation[encoding="application/x-tex"]')?.textContent;
            if (!formula) return;
            let host = element.parentElement;
            const existing = host.classList.contains('math-expandable');
            if (!this.isComplex(element)) {
                if (existing) {
                    host.querySelector(':scope > .math-expand-button')?.remove();
                    host.replaceWith(element);
                }
                element.closest('.math-inline')?.classList.remove('math-formula-wide');
                return;
            }
            if (existing) {
                this.addCalculationButton(host, element);
                this.layout(element);
                return;
            }
            host = document.createElement('span');
            host.className = 'math-expandable';
            element.replaceWith(host);
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'math-expand-button';
            button.title = t('formula_expand');
            button.setAttribute('aria-label', t('formula_expand'));
            button.setAttribute('aria-haspopup', 'dialog');
            button.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6M20 4l-7 7M10 20H4v-6M4 20l7-7"/></svg>';
            button.addEventListener('click', event => {
                event.preventDefault();
                event.stopPropagation();
                this.open(formula, button);
            });
            host.append(element, button);
            this.addCalculationButton(host, element);
            this.layout(element);
        });
        CalculationFolds.decorate(root);
    }

    static addCalculationButton(host, element) {
        // Public shared pages render the same math, but have no private AI dialog.
        if (!element.closest('.dialectics-block .block-content')
            || host.querySelector(':scope > .math-calculation-button')) return;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'math-calculation-button';
        button.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h2m4 0h2M8 15h2m4 0h2M8 18h2m4 0h2"/></svg>';
        button.title = t('calculation_button');
        button.setAttribute('aria-label', t('calculation_button'));
        button.setAttribute('aria-haspopup', 'dialog');
        button.addEventListener('click', async event => {
            event.preventDefault();
            event.stopPropagation();
            button.disabled = true;
            try {
                const {default: CalculationExplanation} = await import('./CalculationExplanation.js');
                if (element.isConnected) await CalculationExplanation.open(element);
            } catch (error) {
                console.error('Calculation explanation:', error);
                button.title = t('whatis_error');
            } finally {
                button.disabled = false;
            }
        });
        host.append(button);
    }

    static open(formula, trigger) {
        this.active?.close();
        const dialog = document.createElement('dialog');
        dialog.className = 'formula-zoom-dialog';
        dialog.setAttribute('aria-labelledby', 'formula-zoom-title');
        const header = document.createElement('div');
        header.className = 'formula-zoom-header';
        const title = document.createElement('h2');
        title.id = 'formula-zoom-title';
        title.textContent = t('formula_view');
        const close = document.createElement('button');
        close.type = 'button';
        close.className = 'formula-zoom-close';
        close.textContent = '×';
        close.setAttribute('aria-label', t('close'));
        close.autofocus = true;
        header.append(title, close);
        const viewport = document.createElement('div');
        viewport.className = 'formula-zoom-viewport';
        viewport.tabIndex = 0;
        viewport.setAttribute('aria-label', t('formula_view'));
        const content = document.createElement('div');
        content.className = 'formula-zoom-content';
        const source = trigger.closest('.math-expandable')?.querySelector('.katex');
        let substitutions = [], numbers;
        try {
            const parsed = JSON.parse(source?.dataset.mathSubstitutions || '{}');
            substitutions = parsed.ranges || [];
            numbers = parsed.numbers;
        } catch { /* Source may be a plain formula. */ }
        content.innerHTML = MathSymbols.render(formula, {displayMode: true}, substitutions, numbers);
        if (source?.dataset.mathOriginal) content.querySelector('.katex').dataset.mathOriginal = source.dataset.mathOriginal;
        dialog.dataset.mathSourceBlock = trigger.closest('.dialectics-block, .blk')?.id || '';
        dialog.mathSource = source;
        viewport.append(content);
        const hint = document.createElement('p');
        hint.className = 'formula-zoom-hint';
        hint.textContent = t('formula_scroll');
        hint.hidden = true;
        const toolbar = document.createElement('div');
        toolbar.className = 'formula-zoom-toolbar';
        const label = document.createElement('span');
        label.textContent = t('formula_scale');
        const minus = document.createElement('button');
        minus.type = 'button'; minus.textContent = '−';
        minus.setAttribute('aria-label', t('formula_zoom_out'));
        const plus = document.createElement('button');
        plus.type = 'button'; plus.textContent = '+';
        plus.setAttribute('aria-label', t('formula_zoom_in'));
        const value = document.createElement('output');
        value.setAttribute('aria-live', 'polite');
        let scale = 150;
        const updateHint = () => { hint.hidden = viewport.scrollWidth <= viewport.clientWidth + 1; };
        const update = () => {
            content.style.fontSize = `${scale / 100}rem`;
            value.textContent = `${scale}%`;
            minus.disabled = scale <= 100;
            plus.disabled = scale >= 250;
            requestAnimationFrame(updateHint);
        };
        minus.addEventListener('click', () => { scale = Math.max(100, scale - 25); update(); });
        plus.addEventListener('click', () => { scale = Math.min(250, scale + 25); update(); });
        toolbar.append(label, minus, value, plus);
        dialog.append(header, viewport, hint, toolbar);
        document.body.append(dialog);
        const dismiss = () => dialog.close();
        const observer = new MutationObserver(() => { if (!trigger.isConnected) dismiss(); });
        observer.observe(document.body, {childList: true, subtree: true});
        close.addEventListener('click', dismiss);
        dialog.addEventListener('cancel', event => {
            const tooltip = dialog.querySelector('.math-symbol-tooltip');
            if (!tooltip) return;
            event.preventDefault();
            tooltip.querySelector('.math-symbol-tooltip-heading button')?.click();
        });
        // A drag used to select the equation must not dismiss the dialog.
        let backdropDown = false;
        dialog.addEventListener('pointerdown', event => { backdropDown = event.target === dialog; });
        dialog.addEventListener('click', event => { if (backdropDown && event.target === dialog) dismiss(); });
        document.addEventListener('noteOpened', dismiss);
        document.addEventListener('stateDirty', dismiss);
        window.addEventListener('resize', updateHint);
        dialog.addEventListener('close', () => {
            observer.disconnect();
            document.removeEventListener('noteOpened', dismiss);
            document.removeEventListener('stateDirty', dismiss);
            window.removeEventListener('resize', updateHint);
            dialog.remove();
            if (this.active === dialog) this.active = null;
            if (trigger.isConnected) trigger.focus({preventScroll: true});
        }, {once: true});
        this.active = dialog;
        update();
        dialog.showModal();
    }
}

export default FormulaZoom;
