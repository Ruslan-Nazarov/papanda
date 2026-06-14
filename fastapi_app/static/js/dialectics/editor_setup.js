/**
 * editor_setup.js - Настройка TipTap и кастомных узлов
 */
import { Node, mergeAttributes } from '@tiptap/core';
import Image from '@tiptap/extension-image';
import katex from 'katex';
import { customPrompt, customLatexPrompt } from '../modal_controller.js';

export const ResizableImage = Image.extend({
    draggable: true,
    inline: false,
    group: 'block',
    addAttributes() {
        return {
            ...this.parent?.(),
            width: {
                default: '400px',
                parseHTML: element => element.style.width || element.getAttribute('width') || '400px',
                renderHTML: attributes => ({
                    width: attributes.width,
                    style: `width: ${attributes.width}; height: auto; cursor: pointer;`,
                }),
            },
            fabricData: {
                default: null,
                parseHTML: element => element.getAttribute('data-fabric'),
                renderHTML: attributes => {
                    if (!attributes.fabricData) return {};
                    return { 'data-fabric': attributes.fabricData };
                }
            }
        };
    },
    addNodeView() {
        return ({ node, getPos, editor }) => {
            const container = document.createElement('div');
            container.className = 'resizable-image-container';
            container.contentEditable = 'false';
            container.style.display = 'block';
            container.draggable = true;
            container.setAttribute('data-drag-handle', '');

            const img = document.createElement('img');
            img.src = node.attrs.src;
            img.style.width = node.attrs.width;

            const handle = document.createElement('div');
            handle.className = 'resize-handle';

            container.appendChild(img);
            container.appendChild(handle);

            img.ondblclick = () => {
                if (node.attrs.fabricData && window.app && window.app.editor) {
                    window.app.editor.switchTab('shapes');
                    const c = window.app.editor.fabricCanvas;
                    if (c) {
                        try {
                            const jsonStr = decodeURIComponent(atob(node.attrs.fabricData));
                            c.loadFromJSON(jsonStr, () => {
                                c.renderAll();
                            });
                        } catch (e) {
                            console.error("Failed to parse fabricData", e);
                        }
                    }
                }
            };

            let isResizing = false;
            let startX, startWidth;

            handle.onmousedown = (e) => {
                e.preventDefault();
                e.stopPropagation();
                isResizing = true;
                startX = e.clientX;
                startWidth = img.offsetWidth;
                container.classList.add('resizing');

                const onMouseMove = (ev) => {
                    if (!isResizing) return;
                    const newWidth = Math.max(50, startWidth + (ev.clientX - startX));
                    img.style.width = `${newWidth}px`;
                };

                const onMouseUp = () => {
                    isResizing = false;
                    container.classList.remove('resizing');
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);

                    if (typeof getPos === 'function') {
                        editor.view.dispatch(
                            editor.view.state.tr.setNodeMarkup(getPos(), null, {
                                ...node.attrs,
                                width: img.style.width,
                            })
                        );
                    }
                };

                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            };

            return {
                dom: container,
                update: (updatedNode) => {
                    if (updatedNode.type.name !== node.type.name) return false;

                    if (updatedNode.attrs.src !== node.attrs.src) {
                        img.src = updatedNode.attrs.src;
                    }
                    if (updatedNode.attrs.width !== node.attrs.width) {
                        img.style.width = updatedNode.attrs.width;
                    }
                    return true;
                },
                ignoreMutation: () => true,
                stopEvent: (event) => {
                    // Разрешаем события внутри контейнера для ручки изменения размера
                    return handle.contains(event.target);
                }
            };
        };
    },
});

export const MathNode = Node.create({
    name: 'mathNode',
    group: 'inline',
    inline: true,
    atom: true,

    addAttributes() {
        return {
            latex: {
                default: ''
            }
        };
    },

    parseHTML() {
        return [
            {
                tag: 'span[data-type="mathNode"]',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ['span', mergeAttributes(HTMLAttributes, { 'data-type': 'mathNode' })];
    },

    addNodeView() {
        return ({ node, getPos, editor }) => {
            const dom = document.createElement('span');
            dom.classList.add('math-node');
            dom.setAttribute('data-type', 'mathNode');
            
            try {
                katex.render(node.attrs.latex, dom, {
                    throwOnError: false,
                    displayMode: false
                });
            } catch (err) {
                dom.textContent = node.attrs.latex;
                dom.style.color = 'red';
            }
            
            dom.ondblclick = async (e) => {
                e.stopPropagation();
                const newLatex = await customLatexPrompt({
                    title: '✍ Редактировать формулу (LaTeX)',
                    value: node.attrs.latex,
                    okLabel: 'Сохранить',
                    cancelLabel: 'Отмена'
                });
                
                if (newLatex !== null && typeof getPos === 'function') {
                    editor.view.dispatch(
                        editor.view.state.tr.setNodeMarkup(getPos(), null, {
                            ...node.attrs,
                            latex: newLatex,
                        })
                    );
                }
            };
            
            return {
                dom,
            };
        };
    },
});
