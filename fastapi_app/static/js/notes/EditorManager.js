import StarterKit from '@tiptap/starter-kit';
import { Editor } from '@tiptap/core';
import Underline from '@tiptap/extension-underline';
import InternalLink from './extensions/InternalLink.js';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import { t } from '../i18n.js';
import AppState from './AppState.js';
import QuestionMark from './extensions/QuestionMark.js';
import HiddenPhrase from './extensions/HiddenPhrase.js';
import CustomQuote from './extensions/CustomQuote.js';
import MathCallout from './extensions/MathCallout.js';
import MathInline from './extensions/MathInline.js';
import KeyboardEscape from './extensions/KeyboardEscape.js';
import DialogService from './DialogService.js';
import { ALGORITHM_STEPS } from './BlockConstants.js';

class EditorManager {
    static currentEditor = null;
    static currentBlockId = null;

    static init() {
        document.addEventListener('openEditor', (e) => {
            const { blockId, el, openWithAiTab, aiRole } = e.detail;
            this.openModalEditor(blockId, el, { openWithAiTab, aiRole });
        });
    }

    static openModalEditor(blockId, blockEl, options = {}) {
        if (this.currentEditor) {
            this.closeModal(false);
        }

        this.currentBlockId = blockId;
        const block = AppState.currentNote.blocks.find(b => b.id === blockId);
        if (!block) return;

        const currentTitle = block.title || '';
        const currentTags = block.tags || '';
        const currentHtml = block.html || '';
        const showAiTab = !!options.openWithAiTab;
        const aiRole = options.aiRole;

        const modalContainer = document.getElementById('modal-container');
        
        // Calculate position (right of the block by default, strictly fitting on screen)
        const rect = blockEl.getBoundingClientRect();
        const modalWidth = Math.min(580, window.innerWidth - 32);
        
        // Horizontal placement: right side if fits, else left side, else centered
        let left = rect.right + 16;
        if (left + modalWidth > window.innerWidth - 16) {
            left = rect.left - modalWidth - 16;
            if (left < 16) {
                left = Math.max(16, Math.round((window.innerWidth - modalWidth) / 2));
            }
        }
        
        // Vertical placement: fit strictly in viewport without needing to scroll down
        const minTop = 64; // below top bar
        const estimatedHeight = Math.min(520, window.innerHeight - minTop - 20);
        const maxTop = Math.max(minTop, window.innerHeight - estimatedHeight - 16);
        let top = Math.min(Math.max(rect.top, minTop), maxTop);

        modalContainer.innerHTML = `
            <div class="modal-editor-floating" style="top: ${top}px; left: ${left}px; position: fixed; z-index: 1000;">
                <div class="modal-header">
                    <h2>${t('editor')}</h2>
                    <div class="modal-toolbar format-group">
                        <button class="format-btn" data-format="bold"><b>B</b></button>
                        <button class="format-btn" data-format="italic"><i>I</i></button>
                        <button class="format-btn" data-format="underline" style="text-decoration: underline;">U</button>
                        <button class="format-btn" data-format="strike" style="text-decoration: line-through;">S</button>
                        <button class="format-btn" data-format="code">&lt;&gt;</button>
                        <button class="format-btn" data-format="quote">"</button>
                        <button class="format-btn" data-format="question" style="color: #ef4444; font-weight: bold;">?</button>
                        <button class="format-btn" data-format="hidden" style="color: #7c3aed;">👁</button>
                        <button class="format-btn" data-format="link">🔗</button>
                        <button class="format-btn" data-format="math" style="color: #2563eb; font-weight: bold;">∑</button>
                        <button class="format-btn format-btn-clear" data-format="clear"></button>
                    </div>
                    <div class="modal-header-actions">
                        <button class="window-btn btn-expand" title="${t('expand')}" style="background: transparent; color: #64748b; font-size: 1.2rem; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; margin-right: 4px;">⤢</button>
                        <button class="window-btn btn-close" id="btn-modal-close" title="${t('close')}">✕</button>
                    </div>
                </div>
                
                <div class="modal-tabs">
                    <div class="modal-tab ${!showAiTab ? 'active' : ''}" data-tab="text">${t('tab_text')}</div>
                    <div class="modal-tab ${showAiTab ? 'active' : ''}" data-tab="ai">✨ AI</div>
                    <div class="modal-tab" data-tab="stickers">🟨 ${t('tab_notes')}</div>
                    <div class="modal-tab" data-tab="graphs">${t('tab_graphs')}</div>
                    <div class="modal-tab" data-tab="shapes">${t('tab_shapes')}</div>
                </div>

                <div class="modal-body">
                    <div id="tab-text" class="tab-content" style="${!showAiTab ? 'display: block;' : 'display: none;'}">
                        <div class="editor-field">
                            <label>${t('title').toLowerCase()}:</label>
                            <input type="text" class="modal-title-input" value="${this.escapeHtml(currentTitle)}">
                        </div>
                        <div class="editor-field">
                            <label>${t('tags').toLowerCase()}:</label>
                            <input type="text" class="modal-tags-input" value="${this.escapeHtml(currentTags)}">
                        </div>
                        <div class="modal-tiptap-content"></div>
                    </div>
                    
                    <div id="tab-ai" class="tab-content" style="${showAiTab ? 'display: block;' : 'display: none;'}">
                        <div class="ai-subtabs" style="display: flex; gap: 8px; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
                            <button class="ai-subtab-btn active" data-subtab="ai-hint" style="background: none; border: none; font-weight: bold; color: #3b82f6; cursor: pointer; padding: 4px 8px;">Как найти ответ</button>
                            <button class="ai-subtab-btn" data-subtab="ai-example" style="background: none; border: none; font-weight: normal; color: #64748b; cursor: pointer; padding: 4px 8px;">Пример ответа</button>
                        </div>
                        <div id="ai-area-hint" class="ai-subtab-content" style="display: block;">
                            <div class="ai-response-area" id="ai-response-hint" style="margin-bottom: 12px; min-height: 150px; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc; font-size: 0.95rem;">
                                <em style="color: #94a3b8;">⏳ Загрузка подсказки...</em>
                            </div>
                        </div>
                        <div id="ai-area-example" class="ai-subtab-content" style="display: none;">
                            <div class="ai-response-area" id="ai-response-example" contenteditable="true" style="margin-bottom: 12px; min-height: 150px; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem;">
                                <em style="color: #94a3b8;">⏳ Загрузка примера...</em>
                            </div>
                            <button class="btn-primary" id="btn-ai-copy-text" style="width: 100%; padding: 10px; font-size: 1rem;">📋 Вставить в Текст</button>
                        </div>
                    </div>
                    
                    <div id="tab-stickers" class="tab-content" style="display: none; min-height: 250px;"><!-- filled by JS --></div>
                    
                    <div id="tab-graphs" class="tab-content" style="display: none;">
                        <div class="graph-editor">
                            <div style="margin-bottom: 8px; display: flex; gap: 8px; align-items: center;">
                                <label>f(x) =</label>
                                <input type="text" id="graph-function" value="x^2" class="modal-title-input" style="width: 200px;">
                                <button id="btn-draw-graph" class="btn-primary" style="padding: 6px 12px;">Нарисовать</button>
                            </div>
                            <div id="graph-canvas" class="canvas-container"></div>
                        </div>
                    </div>
                    
                    <style>
                        .shape-tool-btn, .shape-action-btn {
                            background: transparent;
                            border: 1px solid #e2e8f0;
                            border-radius: 6px;
                            width: 32px;
                            height: 32px;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            cursor: pointer;
                            font-size: 14px;
                            color: #475569;
                            transition: 0.2s;
                        }
                        .shape-tool-btn:hover, .shape-action-btn:hover {
                            background: #f1f5f9;
                        }
                        .shape-tool-btn.active {
                            background: #3b82f6;
                            color: white;
                            border-color: #3b82f6;
                        }
                        #btn-insert-shapes:hover {
                            background-color: #059669 !important;
                        }
                    </style>
                    <div id="tab-shapes" class="tab-content" style="display: none; padding: 0 16px 16px 16px;">
                        <div class="shapes-editor" style="display: flex; flex-direction: column; gap: 8px;">
                            <div class="shapes-toolbar-wrapper" style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; background: #ffffff;">
                                <div class="shapes-toolbar-row1" style="display: flex; gap: 6px; margin-bottom: 12px; flex-wrap: wrap;">
                                    <button class="shape-tool-btn active" id="btn-shape-select" title="Выделение"><i class="ph ph-cursor"></i></button>
                                    <button class="shape-tool-btn" id="btn-shape-draw" title="Рисование"><i class="ph ph-pencil-simple"></i></button>
                                    <button class="shape-tool-btn" id="btn-add-rect" title="Прямоугольник"><i class="ph ph-square"></i></button>
                                    <button class="shape-tool-btn" id="btn-add-circle" title="Круг"><i class="ph ph-circle"></i></button>
                                    <button class="shape-tool-btn" id="btn-add-triangle" title="Равнобедренный треугольник"><i class="ph ph-triangle"></i></button>
                                    <button class="shape-tool-btn" id="btn-add-rtriangle" title="Прямоугольный треугольник"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21V3l18 18H3z"></path></svg></button>
                                    <button class="shape-tool-btn" id="btn-add-diamond" title="Ромб"><i class="ph ph-diamond"></i></button>
                                    <button class="shape-tool-btn" id="btn-add-line" title="Линия"><i class="ph ph-line-segment"></i></button>
                                    <button class="shape-tool-btn" id="btn-add-arrow" title="Стрелка"><i class="ph ph-arrow-right"></i></button>
                                    <button class="shape-tool-btn" id="btn-add-text" title="Текст"><i class="ph ph-text-t"></i></button>
                                </div>
                                <div class="shapes-toolbar-row2" style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                                    <div style="display: flex; align-items: center; border: 1px solid #cbd5e1; border-radius: 6px; padding: 2px;">
                                        <input type="color" id="shape-color-fill" title="Цвет заливки" value="#ffffff" style="width: 24px; height: 24px; border: none; cursor: pointer; padding: 0;">
                                        <button class="shape-action-btn" id="btn-fill-transparent" title="Без заливки" style="padding: 2px 4px; font-size: 16px;"><i class="ph ph-prohibit"></i></button>
                                    </div>
                                    <input type="color" id="shape-color-stroke" title="Цвет контура" value="#1e293b" style="width: 28px; height: 28px; border-radius: 6px; border: 1px solid #94a3b8; cursor: pointer; padding: 0;">
                                    
                                    <input type="range" id="shape-stroke-width" min="1" max="20" value="2" title="Толщина линии" style="width: 60px;">
                                    
                                    <div style="width: 1px; height: 24px; background: #e2e8f0; margin: 0 4px;"></div>
                                    
                                    <button class="shape-action-btn" id="btn-shape-grid" title="Сетка"><i class="ph ph-grid-four"></i></button>
                                    <button class="shape-action-btn" id="btn-shape-copy" title="Дублировать"><i class="ph ph-copy"></i></button>
                                    <button class="shape-action-btn" id="btn-shape-lock" title="Блокировать"><i class="ph ph-lock-key"></i></button>
                                    <button class="shape-action-btn" id="btn-shape-undo" title="Отменить шаг"><i class="ph ph-arrow-u-up-left"></i></button>
                                    <button class="shape-action-btn" id="btn-shape-delete" title="Удалить"><i class="ph ph-trash"></i></button>
                                    <button class="shape-action-btn" id="btn-clear-canvas" title="Очистить все"><i class="ph ph-eraser"></i></button>
                                </div>
                            </div>
                            <div class="canvas-container" style="border: 1px dashed #cbd5e1; border-radius: 8px; background: #f8fafc; overflow: hidden; display: flex; justify-content: center; align-items: center; position: relative;">
                                <canvas id="shapes-canvas" width="540" height="220"></canvas>
                            </div>
                            <button class="btn-primary" id="btn-insert-shapes" style="width: 100%; margin-top: 8px; padding: 12px; font-weight: bold; background-color: #10b981; border: none; border-radius: 8px; color: white; cursor: pointer; transition: 0.2s;">Вставить в текст</button>
                        </div>
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button class="btn-primary btn-ok" id="btn-modal-ok">OK</button>
                </div>
            </div>
        `;
        
        modalContainer.classList.remove('hidden');

        const tiptapContainer = modalContainer.querySelector('.modal-tiptap-content');
        this.currentEditor = new Editor({
            element: tiptapContainer,
            extensions: [
                StarterKit.configure({
                    blockquote: false,
                }), 
                Underline,
                InternalLink.configure({ openOnClick: false }),
                Placeholder.configure({ placeholder: 'Напишите текст...' }),
                QuestionMark, 
                HiddenPhrase, 
                MathCallout,
                MathInline,
                CustomQuote,
                KeyboardEscape,
                Image.configure({
                    allowBase64: true,
                    inline: true
                })
            ],
            content: currentHtml,
            autofocus: !showAiTab
        });

        // ФИКС #9: Активное состояние кнопок форматирования
        const updateFormatButtons = () => {
            modalContainer.querySelectorAll('.format-btn[data-format]').forEach(btn => {
                const format = btn.dataset.format;
                const formatMap = { 
                    bold: 'bold', 
                    italic: 'italic', 
                    underline: 'underline', 
                    strike: 'strike', 
                    code: 'code', 
                    quote: 'customQuote',
                    math: 'mathCallout'
                };
                if (formatMap[format] && this.currentEditor) {
                    btn.classList.toggle('is-active', this.currentEditor.isActive(formatMap[format]));
                }
            });
        };
        this.currentEditor.on('transaction', updateFormatButtons);

        const btnExpand = modalContainer.querySelector('.btn-expand');
        if (btnExpand) {
            btnExpand.addEventListener('click', () => {
                const floatingModal = modalContainer.querySelector('.modal-editor-floating');
                if (floatingModal) {
                    floatingModal.classList.toggle('expanded');
                }
            });
        }

        modalContainer.querySelectorAll('.format-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const format = btn.dataset.format;
                if (!this.currentEditor) return;
                
                if (format === 'bold') this.currentEditor.chain().focus().toggleBold().run();
                if (format === 'italic') this.currentEditor.chain().focus().toggleItalic().run();
                if (format === 'underline') this.currentEditor.chain().focus().toggleUnderline().run();
                if (format === 'strike') this.currentEditor.chain().focus().toggleStrike().run();
                if (format === 'question') {
                    const isEditing = this.currentEditor.isActive('questionMark');
                    const { state } = this.currentEditor;
                    const { from, to } = state.selection;
                    const selectedText = state.doc.textBetween(from, to, ' ');

                    if (!isEditing && (!selectedText || selectedText.trim().length === 0)) return;

                    const existingText = isEditing ? this.currentEditor.getAttributes('questionMark').text : '';

                    DialogService.prompt({
                        title: isEditing ? 'Редактировать вопрос' : 'Вопрос к тексту',
                        message: 'В чём заключается вопрос или неясность?:',
                        defaultValue: existingText,
                        placeholder: 'Например: Не совсем ясен вывод формулы...',
                        icon: '❓',
                        confirmText: 'Сохранить'
                    }).then(questionText => {
                        if (questionText === null) return;
                        if (questionText === '') {
                            this.currentEditor.chain().focus().unsetQuestionMark().run();
                        } else {
                            this.currentEditor.chain().focus().setQuestionMark({ text: questionText }).run();
                        }
                    });
                }
                if (format === 'hidden') {
                    const isEditing = this.currentEditor.isActive('hiddenPhrase');
                    const { state } = this.currentEditor;
                    const { from, to } = state.selection;
                    const selectedText = state.doc.textBetween(from, to, ' ');

                    if (!isEditing && (!selectedText || selectedText.trim().length === 0)) return;

                    this.openAddHiddenPhraseModal();
                }
                if (format === 'code') this.currentEditor.chain().focus().toggleCode().run();
                if (format === 'quote') this.currentEditor.chain().focus().toggleCustomQuote().run();
                if (format === 'clear') this.currentEditor.chain().focus().unsetAllMarks().run();
                if (format === 'math') {
                    this.currentEditor.chain().focus().toggleMathCallout().run();
                }
                if (format === 'link') {
                    const isEditing = this.currentEditor.isActive('link');
                    const { state } = this.currentEditor;
                    const { from, to } = state.selection;
                    const selectedText = state.doc.textBetween(from, to, ' ');

                    if (!isEditing && (!selectedText || selectedText.trim().length === 0)) return;

                    DialogService.selectInternalLink(isEditing).then(url => {
                        if (url === null) return;
                        if (url === '') {
                            this.currentEditor.chain().focus().extendMarkRange('link').unsetLink().run();
                        } else {
                            this.currentEditor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
                        }
                    });
                }
            });
        });

        let graphDrawn = false;
        const drawGraph = () => {
            if (typeof functionPlot !== 'undefined') {
                const fn = modalContainer.querySelector('#graph-function').value;
                try {
                    functionPlot({
                        target: '#graph-canvas',
                        width: 560,
                        height: 240,
                        grid: true,
                        data: [{ fn: fn }]
                    });
                } catch(e) { console.error("Ошибка построения графика:", e); }
            }
        };
        modalContainer.querySelector('#btn-draw-graph').addEventListener('click', drawGraph);

        let fabricCanvas = null;
        let isGridVisible = false;
        let canvasHistory = [];
        let historyIndex = -1;
        let isHistoryAction = false;
        let currentFill = 'transparent';

        const saveHistory = () => {
            if (isHistoryAction) return;
            if (historyIndex < canvasHistory.length - 1) {
                canvasHistory = canvasHistory.slice(0, historyIndex + 1);
            }
            canvasHistory.push(JSON.stringify(fabricCanvas));
            historyIndex++;
        };

        const undoAction = () => {
            if (historyIndex > 0) {
                isHistoryAction = true;
                historyIndex--;
                fabricCanvas.loadFromJSON(canvasHistory[historyIndex], () => {
                    fabricCanvas.renderAll();
                    isHistoryAction = false;
                });
            }
        };

        const toggleGrid = () => {
            isGridVisible = !isGridVisible;
            if (isGridVisible) {
                const gridPattern = new fabric.Pattern({
                    source: function() {
                        const patternCanvas = document.createElement('canvas');
                        patternCanvas.width = 20;
                        patternCanvas.height = 20;
                        const ctx = patternCanvas.getContext('2d');
                        ctx.strokeStyle = '#e2e8f0';
                        ctx.beginPath();
                        ctx.moveTo(0.5, 0.5);
                        ctx.lineTo(20.5, 0.5);
                        ctx.moveTo(0.5, 0.5);
                        ctx.lineTo(0.5, 20.5);
                        ctx.stroke();
                        return patternCanvas;
                    }(),
                    repeat: 'repeat'
                });
                fabricCanvas.backgroundColor = gridPattern;
            } else {
                fabricCanvas.backgroundColor = '';
            }
            fabricCanvas.requestRenderAll();
        };

        const initFabric = () => {
            if (!fabricCanvas && typeof fabric !== 'undefined') {
                fabricCanvas = new fabric.Canvas('shapes-canvas', { width: 540, height: 220, isDrawingMode: false });
                
                const block = AppState.getBlock(this.currentBlockId);
                if (block && block.shapesData) {
                    try {
                        fabricCanvas.loadFromJSON(block.shapesData, () => {
                            fabricCanvas.renderAll();
                            saveHistory();
                        });
                    } catch (e) {
                        console.error('Failed to load shapesData', e);
                        saveHistory();
                    }
                } else {
                    saveHistory();
                }

                fabricCanvas.on('object:added', saveHistory);
                fabricCanvas.on('object:modified', saveHistory);
                fabricCanvas.on('object:removed', saveHistory);

                const getFill = () => currentFill;
                const getStroke = () => modalContainer.querySelector('#shape-color-stroke').value;
                const getStrokeWidth = () => parseInt(modalContainer.querySelector('#shape-stroke-width').value) || 2;

                modalContainer.querySelector('#btn-shape-select').addEventListener('click', (e) => {
                    fabricCanvas.isDrawingMode = false;
                    modalContainer.querySelectorAll('.shape-tool-btn').forEach(btn => btn.classList.remove('active'));
                    e.currentTarget.classList.add('active');
                });
                modalContainer.querySelector('#btn-shape-draw').addEventListener('click', (e) => {
                    fabricCanvas.isDrawingMode = true;
                    fabricCanvas.freeDrawingBrush.color = getStroke();
                    fabricCanvas.freeDrawingBrush.width = getStrokeWidth();
                    modalContainer.querySelectorAll('.shape-tool-btn').forEach(btn => btn.classList.remove('active'));
                    e.currentTarget.classList.add('active');
                });

                modalContainer.querySelector('#btn-add-rect').addEventListener('click', () => {
                    fabricCanvas.add(new fabric.Rect({ left: 100, top: 80, fill: getFill(), stroke: getStroke(), strokeWidth: getStrokeWidth(), width: 60, height: 60 }));
                });
                modalContainer.querySelector('#btn-add-circle').addEventListener('click', () => {
                    fabricCanvas.add(new fabric.Circle({ left: 150, top: 100, fill: getFill(), stroke: getStroke(), strokeWidth: getStrokeWidth(), radius: 30 }));
                });
                modalContainer.querySelector('#btn-add-triangle').addEventListener('click', () => {
                    fabricCanvas.add(new fabric.Triangle({ left: 180, top: 100, fill: getFill(), stroke: getStroke(), strokeWidth: getStrokeWidth(), width: 60, height: 60 }));
                });
                modalContainer.querySelector('#btn-add-rtriangle').addEventListener('click', () => {
                    fabricCanvas.add(new fabric.Polygon([{x: 0, y: 0}, {x: 0, y: 60}, {x: 60, y: 60}], { left: 200, top: 100, fill: getFill(), stroke: getStroke(), strokeWidth: getStrokeWidth() }));
                });
                modalContainer.querySelector('#btn-add-diamond').addEventListener('click', () => {
                    fabricCanvas.add(new fabric.Polygon([{x: 30, y: 0}, {x: 60, y: 30}, {x: 30, y: 60}, {x: 0, y: 30}], { left: 230, top: 100, fill: getFill(), stroke: getStroke(), strokeWidth: getStrokeWidth() }));
                });
                modalContainer.querySelector('#btn-add-line').addEventListener('click', () => {
                    fabricCanvas.add(new fabric.Line([50, 50, 150, 150], { stroke: getStroke(), strokeWidth: getStrokeWidth() }));
                });
                modalContainer.querySelector('#btn-add-arrow').addEventListener('click', () => {
                    const line = new fabric.Line([50, 50, 150, 150], { stroke: getStroke(), strokeWidth: getStrokeWidth() });
                    const triangle = new fabric.Triangle({ width: 10, height: 15, fill: getStroke(), left: 150, top: 150, originX: 'center', originY: 'center', selectable: false, angle: 45 });
                    const group = new fabric.Group([line, triangle]);
                    fabricCanvas.add(group);
                });
                modalContainer.querySelector('#btn-add-text').addEventListener('click', () => {
                    fabricCanvas.add(new fabric.IText('Текст', { left: 50, top: 50, fontSize: 24, fill: getStroke() }));
                });
                
                modalContainer.querySelector('#btn-shape-copy').addEventListener('click', () => {
                    const active = fabricCanvas.getActiveObject();
                    if(active) {
                        active.clone(cloned => {
                            cloned.set({ left: cloned.left + 15, top: cloned.top + 15, evented: true });
                            if (cloned.type === 'activeSelection') {
                                cloned.canvas = fabricCanvas;
                                cloned.forEachObject(obj => fabricCanvas.add(obj));
                                cloned.setCoords();
                            } else {
                                fabricCanvas.add(cloned);
                            }
                            fabricCanvas.setActiveObject(cloned);
                            fabricCanvas.requestRenderAll();
                            saveHistory();
                        });
                    }
                });
                modalContainer.querySelector('#btn-shape-delete').addEventListener('click', () => {
                    const active = fabricCanvas.getActiveObjects();
                    if(active.length) {
                        active.forEach(obj => fabricCanvas.remove(obj));
                        fabricCanvas.discardActiveObject();
                    }
                });
                modalContainer.querySelector('#btn-clear-canvas').addEventListener('click', () => {
                    fabricCanvas.clear();
                    isGridVisible = false;
                    saveHistory();
                });
                modalContainer.querySelector('#btn-shape-undo').addEventListener('click', undoAction);
                modalContainer.querySelector('#btn-shape-grid').addEventListener('click', toggleGrid);
                modalContainer.querySelector('#btn-shape-lock').addEventListener('click', () => {
                    const active = fabricCanvas.getActiveObjects();
                    if(active.length) {
                        active.forEach(obj => {
                            const isLocked = obj.lockMovementX;
                            obj.set({
                                lockMovementX: !isLocked, lockMovementY: !isLocked,
                                lockRotation: !isLocked, lockScalingX: !isLocked, lockScalingY: !isLocked,
                                hasControls: isLocked
                            });
                        });
                        fabricCanvas.requestRenderAll();
                    }
                });

                modalContainer.querySelector('#btn-fill-transparent').addEventListener('click', () => {
                    currentFill = 'transparent';
                    const active = fabricCanvas.getActiveObjects();
                    active.forEach(obj => { if(obj.type !== 'i-text' && obj.type !== 'line') obj.set('fill', 'transparent'); });
                    fabricCanvas.requestRenderAll();
                });

                modalContainer.querySelector('#shape-color-fill').addEventListener('change', (e) => {
                    currentFill = e.target.value;
                    const active = fabricCanvas.getActiveObjects();
                    active.forEach(obj => { if(obj.type !== 'i-text' && obj.type !== 'line' && obj.type !== 'group') obj.set('fill', currentFill); });
                    fabricCanvas.requestRenderAll();
                });
                modalContainer.querySelector('#shape-color-stroke').addEventListener('change', (e) => {
                    const color = e.target.value;
                    const active = fabricCanvas.getActiveObjects();
                    active.forEach(obj => { 
                        if(obj.type === 'i-text') obj.set('fill', color); 
                        else if(obj.type === 'group') { obj.getObjects().forEach(sub => { sub.set('stroke', color); sub.set('fill', color); }); }
                        else obj.set('stroke', color); 
                    });
                    fabricCanvas.freeDrawingBrush.color = color;
                    fabricCanvas.requestRenderAll();
                });
                modalContainer.querySelector('#shape-stroke-width').addEventListener('input', (e) => {
                    const width = parseInt(e.target.value);
                    const active = fabricCanvas.getActiveObjects();
                    active.forEach(obj => { 
                        if(obj.type !== 'i-text') {
                            if(obj.type === 'group') { obj.getObjects().forEach(sub => sub.set('strokeWidth', width)); }
                            else obj.set('strokeWidth', width);
                        }
                    });
                    fabricCanvas.freeDrawingBrush.width = width;
                    fabricCanvas.requestRenderAll();
                });

                modalContainer.querySelector('#btn-insert-shapes').addEventListener('click', () => {
                    const dataUrl = fabricCanvas.toDataURL({ format: 'png', quality: 1 });
                    if (this.currentEditor) {
                        this.currentEditor.commands.insertContent(`<img src="${dataUrl}">`);
                    }
                    modalContainer.querySelector('[data-tab="text"]').click();
                });
            }
        };

        const initStickersTab = async () => {
            const BlockStickersManager = (await import('./BlockStickersManager.js')).default;
            const container = modalContainer.querySelector('#tab-stickers');
            if (block && container) {
                BlockStickersManager.renderBlockStickersInContainer(block, container);
            }
        };

        const aiResponseHint = modalContainer.querySelector('#ai-response-hint');
        const aiResponseExample = modalContainer.querySelector('#ai-response-example');
        
        // AI Subtabs logic
        const aiSubtabs = modalContainer.querySelectorAll('.ai-subtab-btn');
        const aiSubContents = modalContainer.querySelectorAll('.ai-subtab-content');
        aiSubtabs.forEach(btn => {
            btn.addEventListener('click', () => {
                aiSubtabs.forEach(b => { b.classList.remove('active'); b.style.fontWeight = 'normal'; b.style.color = '#64748b'; });
                aiSubContents.forEach(c => c.style.display = 'none');
                btn.classList.add('active');
                btn.style.fontWeight = 'bold';
                btn.style.color = '#3b82f6';
                const subtabId = btn.dataset.subtab.replace('ai-', 'ai-area-');
                const targetContent = modalContainer.querySelector(`#${subtabId}`);
                if (targetContent) targetContent.style.display = 'block';
            });
        });

        const runAiAction = async (action, role) => {
            if (action === 'hint') {
                if (aiResponseHint) aiResponseHint.innerHTML = `<em style="color:#94a3b8;">⏳ ИИ готовит подсказку...</em>`;
                if (aiResponseExample) aiResponseExample.innerHTML = `<em style="color:#94a3b8;">⏳ ИИ генерирует пример...</em>`;
                
                try {
                    const NotesAPI = (await import('./api.js')).default;
                    const AppState = (await import('./AppState.js')).default;
                    const currentContent = AppState.currentNote.blocks
                        .filter(b => b.html && b.html.trim().length > 0 && !b.isDraft)
                        .map(b => `[${b.title}]:\n${b.html.replace(/<[^>]+>/g, '')}`)
                        .join('\n\n');
                    const noteTitle = AppState.currentNote.title;
                    
                    // Fetch both hint and example concurrently
                    const [hintRes, exampleRes] = await Promise.all([
                        NotesAPI.getHint(role || 'step1', currentContent, noteTitle, 'ru', 'hint').catch(e => ({ result: 'Ошибка: ' + e.message })),
                        NotesAPI.getHint(role || 'step1', currentContent, noteTitle, 'ru', 'example').catch(e => ({ result: 'Ошибка: ' + e.message }))
                    ]);
                    
                    const formatResult = (res) => {
                        let html = res.result || '<em style="color: #94a3b8;">AI не вернул ответ.</em>';
                        if (res.result && typeof marked !== 'undefined') {
                            html = DOMPurify.sanitize(marked.parse(res.result));
                        }
                        return html;
                    };
                    
                    if (aiResponseHint) aiResponseHint.innerHTML = formatResult(hintRes);
                    if (aiResponseExample) aiResponseExample.innerHTML = formatResult(exampleRes);
                } catch (err) {
                    if (aiResponseHint) aiResponseHint.innerHTML = `<em style="color:#ef4444;">Ошибка: ${err.message}</em>`;
                    if (aiResponseExample) aiResponseExample.innerHTML = `<em style="color:#ef4444;">Ошибка: ${err.message}</em>`;
                }
            } else {
                // Fallback for other AI actions
                const aiResponseArea = aiResponseHint || modalContainer.querySelector('#ai-response-area');
                if (!aiResponseArea) return;
                aiResponseArea.innerHTML = `<em style="color:#94a3b8;">⏳ ИИ думает...</em>`;
                try {
                    const ConceptExplainManager = (await import('./ConceptExplainManager.js')).default;
                    await ConceptExplainManager.handleAiAction(
                        action,
                        this.currentEditor,
                        { set innerHTML(v) { aiResponseArea.innerHTML = v; }, querySelector: () => null },
                        null,
                        null,
                        () => {},
                        { role }
                    );
                } catch (err) {
                    aiResponseArea.innerHTML = `<em style="color:#ef4444;">Ошибка запроса к AI: ${err.message}</em>`;
                }
            }
        };

        modalContainer.querySelector('#btn-ai-copy-text')?.addEventListener('click', () => {
            const html = aiResponseExample ? aiResponseExample.innerHTML : '';
            if (this.currentEditor && html) {
                this.currentEditor.commands.setContent(html);
            }
            modalContainer.querySelector('[data-tab="text"]').click();
        });

        if (showAiTab) {
            setTimeout(() => runAiAction('hint', aiRole), 100);
        }

        const tabs = modalContainer.querySelectorAll('.modal-tab');
        const contents = modalContainer.querySelectorAll('.tab-content');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                contents.forEach(c => c.style.display = 'none');
                
                tab.classList.add('active');
                const tabId = tab.dataset.tab;
                modalContainer.querySelector(`#tab-${tabId}`).style.display = 'block';
                
                if (tabId === 'graphs' && !graphDrawn) {
                    setTimeout(drawGraph, 50);
                    graphDrawn = true;
                }
                if (tabId === 'shapes') initFabric();
                if (tabId === 'stickers') initStickersTab();
            });
        });

        // Make modal draggable by header
        const modalEl = modalContainer.querySelector('.modal-editor-floating');
        const headerEl = modalContainer.querySelector('.modal-header');
        if (modalEl && headerEl) {
            let isDragging = false;
            let startX = 0, startY = 0, initialLeft = 0, initialTop = 0;

            headerEl.style.cursor = 'grab';

            headerEl.addEventListener('mousedown', (e) => {
                if (e.target.closest('button') || e.target.closest('input') || e.target.closest('.modal-toolbar')) return;
                isDragging = true;
                headerEl.style.cursor = 'grabbing';
                startX = e.clientX;
                startY = e.clientY;
                initialLeft = modalEl.offsetLeft;
                initialTop = modalEl.offsetTop;
                e.preventDefault();
            });

            document.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                let newLeft = Math.max(8, Math.min(window.innerWidth - modalEl.offsetWidth - 8, initialLeft + dx));
                let newTop = Math.max(8, Math.min(window.innerHeight - modalEl.offsetHeight - 8, initialTop + dy));
                modalEl.style.left = `${newLeft}px`;
                modalEl.style.top = `${newTop}px`;
            });

            document.addEventListener('mouseup', () => {
                if (isDragging) {
                    isDragging = false;
                    headerEl.style.cursor = 'grab';
                }
            });
        }

        // Minimize toggle
        let isMinimized = false;
        modalContainer.querySelector('.btn-min')?.addEventListener('click', () => {
            isMinimized = !isMinimized;
            const tabsEl = modalContainer.querySelector('.modal-tabs');
            const bodyEl = modalContainer.querySelector('.modal-body');
            const footerEl = modalContainer.querySelector('.modal-footer');
            if (tabsEl) tabsEl.style.display = isMinimized ? 'none' : 'flex';
            if (bodyEl) bodyEl.style.display = isMinimized ? 'none' : 'block';
            if (footerEl) footerEl.style.display = isMinimized ? 'none' : 'flex';
        });

        modalContainer.querySelector('#btn-modal-close').addEventListener('click', () => {
            this.closeModal(false);
        });

        modalContainer.querySelector('#btn-modal-ok').addEventListener('click', () => {
            const newTitle = modalContainer.querySelector('.modal-title-input').value;
            const newTags = modalContainer.querySelector('.modal-tags-input').value;
            const newHtml = this.currentEditor.getHTML();
            
            let shapesData = null;
            if (fabricCanvas) {
                shapesData = JSON.stringify(fabricCanvas.toJSON());
            } else {
                const block = AppState.getBlock(this.currentBlockId);
                shapesData = block ? block.shapesData : null;
            }
            
            const block = AppState.getBlock(this.currentBlockId);
            const isAnchor = block && (block.role === 'step1' || block.role === 'anchor');
            
            AppState.updateBlock(this.currentBlockId, {
                title: newTitle,
                tags: newTags,
                html: newHtml,
                shapesData: shapesData,
                status: 'ready',
                isDraft: false
            });
            this.closeModal(true);

            if (isAnchor && AppState.isAutoFillEnabled) {
                import('./api.js').then(module => {
                    const NotesAPI = module.default;
                    const anchorText = newHtml.replace(/<[^>]+>/g, '').trim();
                    const noteTitle = AppState.currentNote.title;
                    if (anchorText) {
                        if (AppState.isAutoFillStepByStep) {
                            NotesAPI.generateNextStep(anchorText, 'step1').then(res => {
                                if (res && res.result && res.result['step1']) {
                                    const stepObj = ALGORITHM_STEPS.find(s => s.role === 'step1') || {};
                                    const newBlock = {
                                        id: 'block-' + Math.random().toString(36).substr(2, 9),
                                        side: stepObj.side || 'left',
                                        role: 'step1',
                                        title: stepObj.title || 'step1',
                                        html: `<p>${res.result['step1']}</p>`,
                                        status: 'ready',
                                        isDraft: false
                                    };
                                    AppState.addBlock(newBlock);
                                    AppState.dismissHint('step1');
                                    import('./BlockDOMRenderer.js').then(m => m.default.renderAll());
                                    
                                    setTimeout(() => {
                                        const blockEl = document.getElementById(newBlock.id);
                                        if (blockEl) {
                                            blockEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                            blockEl.style.boxShadow = '0 0 0 3px #10b981';
                                            setTimeout(() => blockEl.style.boxShadow = '', 2000);
                                        }
                                    }, 100);
                                }
                            }).catch(e => {
                                console.error('Autofill step failed', e);
                                import('./ToastService.js').then(m => m.showToast('Ошибка автозаполнения', 'error'));
                            });
                        } else {
                            NotesAPI.autofillConspect(anchorText, noteTitle).then(res => {
                                if (res && res.result && typeof res.result === 'object') {
                                    const steps = ['step1', 'step2', 'step3', 'step4', 'step5'];
                                    let delay = 600;
                                    
                                    steps.forEach((step, index) => {
                                        if (res.result[step]) {
                                            setTimeout(() => {
                                                const stepObj = ALGORITHM_STEPS.find(s => s.role === step) || {};
                                                const newBlock = {
                                                    id: 'block-' + Math.random().toString(36).substr(2, 9),
                                                    side: stepObj.side || 'center',
                                                    role: step,
                                                    title: stepObj.title || step,
                                                    html: `<p>${res.result[step]}</p>`,
                                                    status: 'ready',
                                                    isDraft: false
                                                };
                                                AppState.addBlock(newBlock);
                                                AppState.dismissHint(step);
                                                import('./BlockDOMRenderer.js').then(m => m.default.renderAll());
                                                
                                                setTimeout(() => {
                                                    const blockEl = document.getElementById(newBlock.id);
                                                    if (blockEl) {
                                                        blockEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                        blockEl.style.boxShadow = '0 0 0 3px #10b981';
                                                        setTimeout(() => blockEl.style.boxShadow = '', 2000);
                                                    }
                                                }, 100);
                                            }, delay * (index + 1));
                                        }
                                    });
                                }
                            }).catch(e => {
                                console.error('Autofill failed', e);
                                import('./ToastService.js').then(m => m.showToast('Ошибка автозаполнения', 'error'));
                            });
                        }
                    }
                });
            }
        });
    }

    static closeModal(save) {
        const modalContainer = document.getElementById('modal-container');
        modalContainer.innerHTML = '';
        modalContainer.classList.add('hidden');
        
        if (this.currentEditor) {
            this.currentEditor.destroy();
            this.currentEditor = null;
        }
        
        const blockId = this.currentBlockId;
        this.currentBlockId = null;

        if (blockId) {
            const block = AppState.currentNote.blocks.find(b => b.id === blockId);
            
            if (save) {
                if (block) {
                    block.isDraft = false;
                    block.status = 'ready';
                }
                import('./BlockDOMRenderer.js').then(module => {
                    module.default.renderAll();
                });
            } else {
                if (block && block.isDraft) {
                    AppState.removeBlock(blockId);
                }
                import('./BlockDOMRenderer.js').then(module => {
                    module.default.renderAll();
                });
            }
        }
    }

    static openAddHiddenPhraseModal() {
        if (!this.currentEditor) return;

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.style.zIndex = '1200';

        const dialog = document.createElement('div');
        dialog.className = 'modal-dialog';
        dialog.style.maxWidth = '480px';
        dialog.style.width = '90%';
        dialog.style.borderRadius = '16px';
        dialog.style.overflow = 'hidden';
        dialog.style.boxShadow = '0 20px 40px rgba(0,0,0,0.18)';
        dialog.style.background = '#ffffff';

        const { state } = this.currentEditor;
        const { from, to } = state.selection;
        const selectedText = state.doc.textBetween(from, to, ' ');
        
        const isEditing = this.currentEditor.isActive('hiddenPhrase');
        const existingHint = isEditing ? this.currentEditor.getAttributes('hiddenPhrase').hint : '';

        dialog.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #f1f5f9; background: #ffffff;">
                <div style="display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 1.15rem; color: #1e293b;">
                    <span style="font-size: 1.25rem;">👁</span>
                    <span>${isEditing ? 'Редактировать скрытую фразу' : 'Добавить скрытую фразу'}</span>
                </div>
                <button class="btn-close-hp" style="background: none; border: none; font-size: 1.1rem; color: #94a3b8; cursor: pointer; padding: 4px 8px; border-radius: 6px;">✕</button>
            </div>
            <div style="padding: 20px;">
                <div style="font-size: 0.92rem; color: #334155; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
                    <span style="color: #64748b;">✍</span>
                    <span>Введите текст пояснения или сноски, который будет разворачиваться по клику:</span>
                </div>
                <input type="text" id="hp-explanation-input" placeholder="Например: наука о всеобщих законах развития..." value="${this.escapeHtml(existingHint)}" style="width: 100%; padding: 10px 14px; border: 1.5px solid #f97316; border-radius: 10px; font-size: 0.95rem; outline: none; box-sizing: border-box; margin-bottom: 20px;">
                <div style="display: flex; justify-content: flex-end; gap: 10px;">
                    <button class="btn-cancel-hp" style="background: #2563eb; color: white; border: none; padding: 8px 24px; border-radius: 8px; font-weight: 600; font-size: 0.92rem; cursor: pointer;">Отмена</button>
                    <button class="btn-save-hp" style="background: #ea580c; color: white; border: none; padding: 8px 24px; border-radius: 8px; font-weight: 600; font-size: 0.92rem; cursor: pointer;">Сохранить</button>
                </div>
            </div>
        `;

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        const input = dialog.querySelector('#hp-explanation-input');
        input.focus();

        const close = () => {
            if (document.body.contains(overlay)) document.body.removeChild(overlay);
        };

        dialog.querySelector('.btn-close-hp').addEventListener('click', close);
        dialog.querySelector('.btn-cancel-hp').addEventListener('click', close);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) close();
        });

        const handleSave = async () => {
            const hintText = input.value.trim();
            if (hintText) {
                if (isEditing || (selectedText && selectedText.trim().length > 0)) {
                    this.currentEditor.chain().focus().setHiddenPhrase({ hint: hintText }).run();
                } else {
                    const placeholder = await DialogService.prompt({
                        title: 'Скрытая фраза',
                        message: 'Введите слово или фразу для скрытого пояснения:',
                        defaultValue: 'сноска',
                        confirmText: 'Вставить'
                    }) || 'сноска';
                    this.currentEditor.chain().focus().insertContent({
                        type: 'text',
                        text: placeholder,
                        marks: [{ type: 'hiddenPhrase', attrs: { hint: hintText } }]
                    }).run();
                }
            } else if (isEditing) {
                this.currentEditor.chain().focus().unsetHiddenPhrase().run();
            }
            close();
        };

        dialog.querySelector('.btn-save-hp').addEventListener('click', handleSave);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') close();
        });
    }

    static escapeHtml(unsafe) {
        if(!unsafe) return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

export default EditorManager;
