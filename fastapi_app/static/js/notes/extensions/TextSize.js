import { Mark } from '@tiptap/core';

export const TEXT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32];

export default Mark.create({
    name: 'textSize',
    addAttributes() {
        return {size: {default: 16, rendered: false}};
    },
    parseHTML() {
        return [{tag: 'span', getAttrs: element => {
            const raw = element.getAttribute('data-text-size')
                || /(?:^|\s)text-size-(\d+)(?:\s|$)/.exec(element.className)?.[1]
                || /^(\d+)px$/.exec(element.style.fontSize)?.[1];
            return raw && TEXT_SIZES.includes(Number(raw)) ? {size: Number(raw)} : false;
        }}];
    },
    renderHTML({mark}) {
        const size = TEXT_SIZES.includes(mark.attrs.size) ? mark.attrs.size : 16;
        return ['span', {'data-text-size': String(size), class: `text-size-${size}`}, 0];
    },
});
