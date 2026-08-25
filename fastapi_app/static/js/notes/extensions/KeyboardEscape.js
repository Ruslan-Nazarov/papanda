import { Extension } from '@tiptap/core';

export default Extension.create({
    name: 'keyboardEscape',

    addKeyboardShortcuts() {
        return {
            'ArrowDown': ({ editor }) => {
                const { state } = editor;
                const { selection, doc } = state;
                const { $to } = selection;

                // If cursor is at the very end of the document
                if ($to.pos === doc.content.size - 1 || $to.pos === doc.content.size) {
                    // Check if the last node is a special block (like customQuote or mathCallout)
                    const lastNode = doc.lastChild;
                    if (lastNode && lastNode.type.name !== 'paragraph') {
                        editor.commands.insertContentAt(doc.content.size, { type: 'paragraph' });
                        editor.commands.focus('end');
                        return true;
                    }
                }
                return false;
            },
            'ArrowUp': ({ editor }) => {
                const { state } = editor;
                const { selection, doc } = state;
                const { $from } = selection;

                // If cursor is at the very beginning of the document
                if ($from.pos === 1 || $from.pos === 0) {
                    const firstNode = doc.firstChild;
                    if (firstNode && firstNode.type.name !== 'paragraph') {
                        editor.commands.insertContentAt(0, { type: 'paragraph' });
                        editor.commands.focus('start');
                        return true;
                    }
                }
                return false;
            },
            'Mod-Enter': ({ editor }) => {
                // Universal escape: insert paragraph after current block and focus it
                const { state } = editor;
                const { $to } = state.selection;
                
                // Find the outermost block node before the root
                let depth = $to.depth;
                while (depth > 0 && $to.node(depth).type.name === 'paragraph' && $to.node(depth - 1).type.name !== 'doc') {
                    depth--;
                }
                
                const pos = $to.after(depth);
                editor.chain().insertContentAt(pos, { type: 'paragraph' }).focus(pos + 1).run();
                return true;
            },
            'Enter': ({ editor }) => {
                // If in a customQuote and pressing Enter in an empty paragraph, lift out of it
                const { state } = editor;
                const { selection } = state;
                const { $from, empty } = selection;

                if (!empty || $from.parent.type.name !== 'paragraph' || $from.parent.textContent.length > 0) {
                    return false; // let default Enter behavior handle it
                }

                // Check if we are inside a customQuote
                let inQuote = false;
                for (let i = $from.depth; i > 0; i--) {
                    if ($from.node(i).type.name === 'customQuote') {
                        inQuote = true;
                        break;
                    }
                }

                if (inQuote) {
                    return editor.commands.lift('customQuote');
                }
                
                // Same for mathCallout if they are at the end
                let inMath = false;
                for (let i = $from.depth; i > 0; i--) {
                    if ($from.node(i).type.name === 'mathCallout') {
                        inMath = true;
                        break;
                    }
                }
                if (inMath) {
                    return editor.commands.lift('mathCallout');
                }

                return false;
            }
        };
    },
});
