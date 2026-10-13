// A note notice stays plain text; only explicitly written Markdown links become anchors.
export function renderNotice(container, text) {
    container.replaceChildren();
    const pattern = /\[([^\]\n]+)\]\(([^\s)]+)\)/g;
    let offset = 0;
    for (const match of text.matchAll(pattern)) {
        container.append(text.slice(offset, match.index));
        const [, label, url] = match;
        if (/^https:\/\//i.test(url) || /^\/(?!\/)/.test(url)) {
            const link = document.createElement('a');
            link.textContent = label;
            link.href = url;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            container.append(link);
        } else container.append(match[0]);
        offset = match.index + match[0].length;
    }
    container.append(text.slice(offset));
}
