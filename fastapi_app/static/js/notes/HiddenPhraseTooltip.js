const PHRASE_SELECTOR = 'span[data-type="hidden-phrase"], .hidden-phrase-mark, .hidden-phrase';

class HiddenPhraseTooltip {
    static bindings = new WeakMap();
    static active = null;
    static hideTimer = null;
    static nextId = 0;

    static renderHint(element, text) {
        // Hints are plain text with TeX, never trusted HTML.
        element.textContent = text;
        window.renderMathInElement?.(element, {
            delimiters: [
                {left: '$$', right: '$$', display: true},
                {left: '\\[', right: '\\]', display: true},
                {left: '\\(', right: '\\)', display: false},
                {left: '$', right: '$', display: false},
            ],
            throwOnError: false,
            trust: false,
        });
    }

    static hide() {
        clearTimeout(this.hideTimer);
        const active = this.active;
        if (!active) return;
        this.active = null;
        active.cleanup();
        active.tooltip.remove();
        if (active.describedBy === null) active.phrase.removeAttribute('aria-describedby');
        else active.phrase.setAttribute('aria-describedby', active.describedBy);
    }

    static show(phrase, root, render = null) {
        clearTimeout(this.hideTimer);
        if (this.active?.phrase === phrase) return;
        this.hide();
        const hint = phrase.getAttribute('data-hint');
        if (!hint || phrase.classList.contains('is-expanded')) return;
        const tooltip = document.createElement('div');
        tooltip.className = 'hidden-phrase-tooltip';
        tooltip.id = `hidden-phrase-tooltip-${++this.nextId}`;
        tooltip.setAttribute('role', 'tooltip');
        if (render) {
            tooltip.classList.add('source-preview');
            render(tooltip, hint);
        } else this.renderHint(tooltip, hint);
        document.body.appendChild(tooltip);

        const anchor = phrase.getBoundingClientRect();
        const margin = 12;
        const belowSpace = window.innerHeight - margin - anchor.bottom - 6;
        const aboveSpace = anchor.top - margin - 6;
        const below = belowSpace >= Math.min(480, aboveSpace);
        // A long scrollable preview must leave its source button clickable.
        tooltip.style.maxHeight = `${Math.max(0, Math.min(480, below ? belowSpace : aboveSpace))}px`;
        const rect = tooltip.getBoundingClientRect();
        const left = Math.max(margin, Math.min(anchor.left + anchor.width / 2 - rect.width / 2,
            window.innerWidth - rect.width - margin));
        const top = below ? anchor.bottom + 6 : Math.max(margin, anchor.top - rect.height - 6);
        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
        const describedBy = phrase.getAttribute('aria-describedby');
        phrase.setAttribute('aria-describedby', [describedBy, tooltip.id].filter(Boolean).join(' '));

        const hide = () => this.hide();
        const onScroll = event => { if (!tooltip.contains(event.target)) hide(); };
        const onKey = event => {
            if (event.key === 'Escape' && !event.defaultPrevented) {
                event.preventDefault();
                event.stopImmediatePropagation();
                hide();
            }
        };
        const onPointer = event => { if (!tooltip.contains(event.target) && !phrase.contains(event.target)) hide(); };
        const observer = new MutationObserver(() => {
            if (!phrase.isConnected || phrase.getAttribute('data-hint') !== hint
                || phrase.classList.contains('is-expanded')) hide();
        });
        observer.observe(root, {childList: true, subtree: true, attributes: true,
            attributeFilter: ['data-hint', 'class']});
        observer.observe(document.body, {childList: true, subtree: true});
        tooltip.addEventListener('mouseenter', () => clearTimeout(this.hideTimer));
        tooltip.addEventListener('mouseleave', () => this.scheduleHide());
        document.addEventListener('scroll', onScroll, true);
        document.addEventListener('keydown', onKey, true);
        document.addEventListener('pointerdown', onPointer);
        window.addEventListener('resize', hide);
        this.active = {phrase, tooltip, root, describedBy, cleanup: () => {
            observer.disconnect();
            document.removeEventListener('scroll', onScroll, true);
            document.removeEventListener('keydown', onKey, true);
            document.removeEventListener('pointerdown', onPointer);
            window.removeEventListener('resize', hide);
        }};
    }

    static scheduleHide() {
        clearTimeout(this.hideTimer);
        this.hideTimer = setTimeout(() => this.hide(), 120);
    }

    static bind(root, {selector = PHRASE_SELECTOR, render = null} = {}) {
        if (this.bindings.has(root)) return this.bindings.get(root);
        const enter = event => {
            const phrase = event.target.closest?.(selector);
            if (phrase && root.contains(phrase)) this.show(phrase, root, render);
        };
        const leave = event => {
            const phrase = event.target.closest?.(selector);
            if (phrase && !phrase.contains(event.relatedTarget)) this.scheduleHide();
        };
        root.addEventListener('mouseover', enter);
        root.addEventListener('mouseout', leave);
        root.addEventListener('focusin', enter);
        root.addEventListener('focusout', leave);
        const dispose = () => {
            root.removeEventListener('mouseover', enter);
            root.removeEventListener('mouseout', leave);
            root.removeEventListener('focusin', enter);
            root.removeEventListener('focusout', leave);
            if (this.active?.root === root) this.hide();
            this.bindings.delete(root);
        };
        this.bindings.set(root, dispose);
        return dispose;
    }
}

export default HiddenPhraseTooltip;
