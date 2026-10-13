class BlockCodeRenderer {
    static mergeAdjacent(container) {
        if (!container) return;
        container.querySelectorAll('pre').forEach(pre => {
            if (!pre.parentNode) return;
            const parts = [pre.querySelector('code')?.textContent ?? pre.textContent];
            let next = pre.nextElementSibling;
            while (next?.tagName === 'PRE') {
                parts.push(next.querySelector('code')?.textContent ?? next.textContent);
                const following = next.nextElementSibling;
                next.remove();
                next = following;
            }
            if (parts.length < 2) return;
            const code = pre.querySelector('code') || document.createElement('code');
            code.textContent = parts.map(part => part.replace(/\n$/, '')).join('\n');
            pre.replaceChildren(code);
        });
    }

    static lines(paragraph) {
        const copy = paragraph.cloneNode(true);
        copy.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
        return copy.textContent.replace(/\u00a0/g, ' ').trimEnd();
    }

    static startsCode(line) {
        return /^(?:#(?:include|define|ifdef|ifndef|pragma)\b|\/\/|\/\*|(?:int\d*_t|uint\d*_t|void|float|double|char|bool|size_t|const|let|var|function|def|import)\b.*[=({;])/.test(line.trimStart());
    }

    static continuesCode(line) {
        return /^(?:#|\/\/|\/\*|\*|[{}]|(?:return|if|else|for|while|int\d*_t|uint\d*_t|void|float|double|char|bool|size_t|const|let|var)\b)/.test(line.trimStart())
            || (!/[А-Яа-яЁё]/.test(line) && /[;{}]\s*$/.test(line));
    }

    static render(container) {
        if (!container) return;
        this.mergeAdjacent(container);
        const paragraphs = [...container.children];
        for (let i = 0; i < paragraphs.length; i++) {
            const first = paragraphs[i];
            if (first.tagName !== 'P' || !this.startsCode(this.lines(first))) continue;
            const group = [first];
            while (i + 1 < paragraphs.length) {
                const next = paragraphs[i + 1];
                if (next.tagName !== 'P' || !this.continuesCode(this.lines(next))) break;
                group.push(next);
                i++;
            }
            const pre = document.createElement('pre');
            pre.className = 'block-code';
            const code = document.createElement('code');
            code.textContent = group.map(paragraph => this.lines(paragraph)).join('\n');
            pre.appendChild(code);
            first.replaceWith(pre);
            group.slice(1).forEach(paragraph => paragraph.remove());
        }
    }
}

export default BlockCodeRenderer;
