/**
 * editor_setup.js - Настройка TipTap и кастомных узлов
 */
import { Node, mergeAttributes } from '@tiptap/core';
import Image from '@tiptap/extension-image';

/**
 * MathNode - Атомарный узел для формул MathLive.
 * Реализовано с интеллектуальным обновлением для сохранения позиции курсора.
 */
export const MathNode = Node.create({
    name: 'mathNode',
    group: 'inline',
    inline: true,
    atom: true,

    addAttributes() {
        return { latex: { default: '' } };
    },

    parseHTML() {
        return [{ 
            tag: 'math-field',
            getAttrs: el => ({ 
                latex: el.getAttribute('value') || el.getAttribute('latex') || el.textContent || '' 
            })
        }];
    },

    renderHTML({ HTMLAttributes }) {
        return ['math-field', mergeAttributes(HTMLAttributes, { 
            value: HTMLAttributes.latex,
            'read-only': 'true'
        })];
    },

    addNodeView() {
        return ({ node, getPos, editor }) => {
            // 1. Создаем обертку для защиты от ProseMirror
            const wrapper = document.createElement('span');
            wrapper.className = 'math-node-wrapper';
            wrapper.contentEditable = 'false';
            wrapper.style.display = 'inline-block';
            wrapper.style.verticalAlign = 'middle';

            // 2. Создаем и настраиваем MathLive
            const mathField = document.createElement('math-field');
            mathField.value = node.attrs.latex;
            mathField.setAttribute('menu-helper', 'none');
            mathField.setAttribute('virtual-keyboard-toggle-visible', 'false');
            
            // Гарантируем шрифты
            if (mathField.constructor.fontsDirectory === undefined) {
                mathField.constructor.fontsDirectory = 'https://cdn.jsdelivr.net/npm/mathlive@latest/dist/fonts';
            }

            wrapper.appendChild(mathField);

            // Отладка
            const log = (m) => { if (window.app && window.app.logDebug) window.app.logDebug(m); };

            // 3. Обработчик ввода: MathLive -> TipTap
            mathField.oninput = () => {
                if (typeof getPos === 'function') {
                    editor.view.dispatch(
                        editor.view.state.tr.setNodeMarkup(getPos(), null, {
                            latex: mathField.value
                        })
                    );
                }
            };

            // 4. Объект NodeView
            return {
                dom: wrapper,
                // Пропускаем все события внутрь обертки
                stopEvent: (event) => wrapper.contains(event.target),
                // Игнорируем внутренние мутации shadow DOM
                ignoreMutation: () => true,
                // Интеллектуальное обновление без сброса каретки
                update: (updatedNode) => {
                    if (updatedNode.type.name !== node.type.name) return false;

                    // Обновляем value только если поле НЕ в фокусе.
                    // Это критически важно для сохранения позиции каретки при вводе.
                    if (document.activeElement !== mathField && mathField.value !== updatedNode.attrs.latex) {
                        log("[MathNode] Внешнее обновление (Undo/Redo)");
                        mathField.value = updatedNode.attrs.latex;
                    }

                    return true;
                }
            };
        };
    }
});

/**
 * ResizableImage - Расширение для изображений с возможностью изменения размера
 */
export const ResizableImage = Image.extend({
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
        };
    },
    addNodeView() {
        return ({ node, getPos, editor }) => {
            const container = document.createElement('div');
            container.className = 'resizable-image-container';
            container.contentEditable = 'false';

            const img = document.createElement('img');
            img.src = node.attrs.src;
            img.style.width = node.attrs.width;
            
            const handle = document.createElement('div');
            handle.className = 'resize-handle';
            
            container.appendChild(img);
            container.appendChild(handle);

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
                    // Разрешаем события внутри контейнера (например, клик по ручке)
                    return container.contains(event.target);
                }
            };
        };
    },
});
