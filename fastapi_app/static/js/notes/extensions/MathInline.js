import { Node, mergeAttributes } from '@tiptap/core';
import FormulaModalService from '../FormulaModalService.js';
import MathSymbols from '../MathSymbols.js';

export default Node.create({
    name: 'mathInline',

    group: 'inline',

    inline: true,

    atom: true,

    addAttributes() {
        return {
            formula: {
                default: '',
                // TipTap's default attribute parser coerces "1", "-1" and "0"
                // to numbers, which are not valid text children in a DOM spec.
                parseHTML: element => element.getAttribute('formula')
                    ?? element.getAttribute('data-formula') ?? element.textContent.trim(),
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'span.math-inline',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        const formula = String(HTMLAttributes.formula ?? '');
        return ['span', mergeAttributes(HTMLAttributes, { class: 'math-inline', 'data-formula': formula, formula }), formula];
    },

    addNodeView() {
        return ({ node, getPos, editor }) => {
            const dom = document.createElement('span');
            dom.classList.add('math-inline', 'math-inline-rendered');
            dom.setAttribute('data-formula', node.attrs.formula);
            dom.setAttribute('title', 'Кликните для редактирования формулы');
            dom.contentEditable = false;

            const render = () => {
                const formula = String(node.attrs.formula ?? '');
                if (window.katex && formula) {
                    try {
                        dom.innerHTML = MathSymbols.render(formula, { displayMode: false });
                    } catch (e) {
                        dom.textContent = formula;
                    }
                } else {
                    dom.textContent = formula || '(формула)';
                }
            };

            render();

            dom.addEventListener('click', (e) => {
                e.stopPropagation();
                FormulaModalService.open({ initialFormula: node.attrs.formula,
                    symbolContext: editor.storage.mathSymbols }).then(newFormula => {
                    if (newFormula === null) return;
                    const pos = getPos();
                    if (typeof pos !== 'number') return;
                    if (newFormula === '') {
                        editor.chain().focus().deleteRange({ from: pos, to: pos + 1 }).run();
                    } else {
                        editor.chain().focus().command(({ tr }) => {
                            tr.setNodeMarkup(pos, undefined, { formula: newFormula });
                            return true;
                        }).run();
                    }
                });
            });

            return {
                dom,
                update: (updatedNode) => {
                    if (updatedNode.type.name !== this.name) return false;
                    node = updatedNode;
                    render();
                    return true;
                }
            };
        };
    },

    addCommands() {
        return {
            insertMathInline: options => ({ commands }) => {
                return commands.insertContent({
                    type: this.name,
                    attrs: options,
                });
            },
        };
    },
});
