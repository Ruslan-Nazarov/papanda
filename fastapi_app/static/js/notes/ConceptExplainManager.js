import PasteMathTransformer from './PasteMathTransformer.js';
import BlockMathRenderer from './BlockMathRenderer.js';

export function renderStreamMarkdown(container, fullText) {
    // Preserve TeX before Markdown consumes backslashes, underscores and tables.
    container.innerHTML = PasteMathTransformer.transformTextToHTML(fullText);
    BlockMathRenderer.renderMath(container);
}
