import PasteMathTransformer from './PasteMathTransformer.js';
import BlockMathRenderer from './BlockMathRenderer.js';

// Keep completed paragraphs (and their KaTeX DOM) while the last paragraph grows.
// Network callbacks only queue text; parsing and math run in separate, short tasks.
class StreamMarkdownRenderer {
    constructor(container, {signal, input} = {}) {
        this.container = container;
        this.signal = signal;
        this.input = input;
        this.parts = [];
        this.text = '';
        this.lastInput = -Infinity;
        this.cursor = document.createTextNode(' ▍');
        container.replaceChildren(this.cursor);
        this.onInput = () => { this.lastInput = Date.now(); };
        this.onCompositionStart = () => { this.composing = true; };
        this.onCompositionEnd = () => { this.composing = false; this.onInput(); };
        input?.addEventListener('beforeinput', this.onInput);
        input?.addEventListener('input', this.onInput);
        input?.addEventListener('compositionstart', this.onCompositionStart);
        input?.addEventListener('compositionend', this.onCompositionEnd);
        this.onAbort = () => this.dispose();
        signal?.addEventListener('abort', this.onAbort, {once: true});
        if (signal?.aborted) this.dispose();
    }

    update(text) {
        if (this.disposed || this.finished) return;
        this.text = text;
        this.schedule();
    }

    finish(text) {
        if (this.disposed) return Promise.resolve(false);
        this.text = text;
        this.finished = true;
        this.completion ||= new Promise(resolve => { this.resolve = resolve; });
        this.schedule(0);
        return this.completion;
    }

    schedule(delay = 100) {
        if (this.disposed || this.timer != null || this.painting) return;
        this.timer = setTimeout(() => this.flush(), delay);
    }

    async flush() {
        this.timer = null;
        if (this.disposed) return;
        // Let keystrokes and IME composition finish before doing layout work.
        if (this.composing || Date.now() - this.lastInput < 180) {
            this.schedule();
            return;
        }
        this.painting = true;
        const text = this.text;
        try {
            const incoming = document.createElement('div');
            incoming.innerHTML = PasteMathTransformer.transformTextToHTML(text);
            const next = [...incoming.childNodes].map(node => ({
                source: `${node.nodeType}:${node.nodeType === 1 ? node.outerHTML : node.textContent}`, nodes: [node],
            }));
            let prefix = 0, suffix = 0;
            while (prefix < this.parts.length && prefix < next.length
                && this.parts[prefix].source === next[prefix].source) {
                next[prefix] = this.parts[prefix];
                prefix++;
            }
            while (suffix < this.parts.length - prefix && suffix < next.length - prefix
                && this.parts[this.parts.length - 1 - suffix].source === next[next.length - 1 - suffix].source) {
                next[next.length - 1 - suffix] = this.parts[this.parts.length - 1 - suffix];
                suffix++;
            }
            for (const part of this.parts.slice(prefix, this.parts.length - suffix)) {
                for (const node of part.nodes) node.remove();
            }
            const anchor = suffix ? next[next.length - suffix].nodes[0] : this.cursor;
            let start = Date.now();
            for (const part of next.slice(prefix, next.length - suffix)) {
                // A temporary wrapper also lets the renderer handle a top-level
                // math callout. Unwrap it so the final Markdown structure is intact.
                const wrapper = document.createElement('div');
                wrapper.append(...part.nodes);
                this.container.insertBefore(wrapper, anchor);
                BlockMathRenderer.renderMath(wrapper);
                part.nodes = [...wrapper.childNodes];
                wrapper.replaceWith(...part.nodes);
                if (Date.now() - start >= 8) {
                    await new Promise(resolve => setTimeout(resolve, 0));
                    if (this.disposed) return;
                    start = Date.now();
                }
            }
            this.parts = next;
            if (this.finished && text === this.text) this.dispose(true);
        } catch (error) {
            // Surface renderer failures to the request's existing error UI.
            this.dispose(false);
            this.error = error;
        } finally {
            this.painting = false;
            if (!this.disposed && text !== this.text) this.schedule();
        }
    }

    dispose(completed = false) {
        if (this.disposed) return;
        this.disposed = true;
        clearTimeout(this.timer);
        this.cursor.remove();
        this.signal?.removeEventListener('abort', this.onAbort);
        this.input?.removeEventListener('beforeinput', this.onInput);
        this.input?.removeEventListener('input', this.onInput);
        this.input?.removeEventListener('compositionstart', this.onCompositionStart);
        this.input?.removeEventListener('compositionend', this.onCompositionEnd);
        this.resolve?.(completed);
    }
}

export default StreamMarkdownRenderer;
