/**
 * EditorKeymap.js - Горячие клавиши TipTap и перехват клавиш (Enter, Space, очистка марок)
 */
import { Extension } from '@tiptap/core';

export const ClearMarksOnEnter = Extension.create({
    name: 'clearMarksOnEnter',
    addKeyboardShortcuts() {
        return {
            Enter: ({ editor }) => {
                if (!editor.state.selection.empty) {
                    return false;
                }
                const split = editor.commands.splitBlock();
                if (split) {
                    editor.view.dispatch(editor.state.tr.setStoredMarks([]));
                    return true;
                }
                return false;
            }
        };
    }
});

export const ClearMarksOnSpace = Extension.create({
    name: 'clearMarksOnSpace',
    addKeyboardShortcuts() {
        return {
            'Space': ({ editor }) => {
                const { state, view } = editor;
                const { selection } = state;
                const { $from, empty } = selection;
                if (!empty) {
                    return false;
                }

                const hiddenPhraseType = state.schema.marks.hiddenPhrase;
                const questionMarkType = state.schema.marks.questionMark;

                const isEndOfHidden = hiddenPhraseType && $from.nodeBefore && $from.nodeBefore.marks && hiddenPhraseType.isInSet($from.nodeBefore.marks) &&
                    (!$from.nodeAfter || !$from.nodeAfter.marks || !hiddenPhraseType.isInSet($from.nodeAfter.marks));

                const isEndOfQuestion = questionMarkType && $from.nodeBefore && $from.nodeBefore.marks && questionMarkType.isInSet($from.nodeBefore.marks) &&
                    (!$from.nodeAfter || !$from.nodeAfter.marks || !questionMarkType.isInSet($from.nodeAfter.marks));

                if (isEndOfHidden || isEndOfQuestion) {
                    const tr = state.tr;
                    tr.insertText(' ');
                    let storedMarks = tr.storedMarks || state.storedMarks || $from.marks() || [];
                    storedMarks = storedMarks.filter(mark => mark.type !== hiddenPhraseType && mark.type !== questionMarkType);
                    tr.setStoredMarks(storedMarks);
                    view.dispatch(tr);
                    return true;
                }

                return false;
            }
        };
    }
});
