export function renderStreamMarkdown(container, fullText) {
    if (typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined') {
        container.innerHTML = DOMPurify.sanitize(marked.parse(fullText));
    } else {
        container.textContent = fullText;
    }
}
