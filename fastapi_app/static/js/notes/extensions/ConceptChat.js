import { Node } from '@tiptap/core';
import SavedConceptChat from '../SavedConceptChat.js';

export default Node.create({
    name: 'conceptChat',
    group: 'inline',
    inline: true,
    atom: true,
    addAttributes() {
        return {chat: {default: '', parseHTML: element => element.getAttribute('data-chat') || '',
            renderHTML: () => ({})}};
    },
    parseHTML() {
        return [{tag: SavedConceptChat.selector, getAttrs: element => SavedConceptChat.read(element) ? null : false}];
    },
    renderHTML({node}) {
        const data = JSON.parse(node.attrs.chat);
        return ['span', SavedConceptChat.attributes(data), '💬'];
    },
});
