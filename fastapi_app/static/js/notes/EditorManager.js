import { t } from '../i18n.js';
import AppState from './AppState.js';
import { ALGORITHM_STEPS } from './BlockConstants.js';

import { EditorTiptapSetup } from './EditorTiptapSetup.js';
import { EditorShapesTab } from './EditorShapesTab.js';
import { EditorGraphTab } from './EditorGraphTab.js';
import { EditorAITab } from './EditorAITab.js';
import { EditorDragBehavior } from './EditorDragBehavior.js';

class EditorManager {
    static currentEditor = null;
    static currentBlockId = null;
    static shapesTab = null;
    static graphTab = null;
    static aiTab = null;

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
        
        // Calculate position (right of block or centered fitting on screen)
        const rect = blockEl.getBoundingClientRect();
        const modalWidth = Math.min(580, window.innerWidth - 32);
        
        let left = rect.right + 16;
        if (left + modalWidth > window.innerWidth - 16) {
            left = rect.left - modalWidth - 16;
            if (left < 16) {
                left = Math.max(16, Math.round((window.innerWidth - modalWidth) / 2));
            }
        }
        
        const minTop = 64;
        const estimatedHeight = Math.min(520, window.innerHeight - minTop - 20);
        const maxTop = Math.max(minTop, window.innerHeight - estimatedHeight - 16);
        let top = Math.min(Math.max(rect.top, minTop), maxTop);

        modalContainer.innerHTML = this.renderEditorHTML({
            top, left, showAiTab, currentTitle, currentTags
        });
        
        modalContainer.classList.remove('hidden');

        // 1. TipTap
        const tiptapContainer = modalContainer.querySelector('.modal-tiptap-content');
        this.currentEditor = EditorTiptapSetup.createEditor(tiptapContainer, currentHtml, !showAiTab);
        EditorTiptapSetup.bindFormatButtons(modalContainer, () => this.currentEditor);

        // 2. Tabs
        this.shapesTab = new EditorShapesTab(modalContainer, blockId, () => this.currentEditor);
        this.graphTab = new EditorGraphTab(modalContainer);
        this.aiTab = new EditorAITab(modalContainer, () => this.currentEditor, aiRole);
        this.aiTab.init(showAiTab);
        this.graphTab.init();

        // 3. Dragging
        const modalEl = modalContainer.querySelector('.modal-editor-floating');
        const headerEl = modalContainer.querySelector('.modal-header');
        EditorDragBehavior.makeDraggable(modalEl, headerEl);

        // 4. Modal Expand & Minimize
        modalContainer.querySelector('.btn-expand')?.addEventListener('click', () => {
            modalEl?.classList.toggle('expanded');
        });

        // 5. Tab Switching
        this.setupTabSwitching(modalContainer, block);

        // 6. Action buttons
        modalContainer.querySelector('#btn-modal-close')?.addEventListener('click', () => this.closeModal(false));
        modalContainer.querySelector('#btn-modal-ok')?.addEventListener('click', () => this.handleSave());
    }

    static setupTabSwitching(modalContainer, block) {
        const tabs = modalContainer.querySelectorAll('.modal-tab');
        const contents = modalContainer.querySelectorAll('.tab-content');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', async () => {
                tabs.forEach(t => t.classList.remove('active'));
                contents.forEach(c => c.style.display = 'none');
                
                tab.classList.add('active');
                const tabId = tab.dataset.tab;
                const targetContent = modalContainer.querySelector(`#tab-${tabId}`);
                if (targetContent) targetContent.style.display = 'block';
                
                if (tabId === 'graphs' && this.graphTab && !this.graphTab.graphDrawn) {
                    setTimeout(() => this.graphTab.drawGraph(), 50);
                }
                if (tabId === 'shapes' && this.shapesTab) {
                    this.shapesTab.init();
                }
                if (tabId === 'stickers') {
                    const BlockStickersManager = (await import('./BlockStickersManager.js')).default;
                    const container = modalContainer.querySelector('#tab-stickers');
                    if (block && container) {
                        BlockStickersManager.renderBlockStickersInContainer(block, container);
                    }
                }
            });
        });
    }

    static handleSave() {
        const modalContainer = document.getElementById('modal-container');
        const newTitle = modalContainer.querySelector('.modal-title-input')?.value || '';
        const newTags = modalContainer.querySelector('.modal-tags-input')?.value || '';
        const newHtml = this.currentEditor ? this.currentEditor.getHTML() : '';
        
        let shapesData = null;
        if (this.shapesTab && this.shapesTab.fabricCanvas) {
            shapesData = this.shapesTab.getJSON();
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
            this.triggerAutofill(newHtml);
        }
    }

    static async triggerAutofill(newHtml) {
        const anchorText = newHtml.replace(/<[^>]+>/g, '').trim();
        if (!anchorText) return;
        const { default: AIController } = await import('./AIController.js');
        const { default: BlockDOMRenderer } = await import('./BlockDOMRenderer.js');

        // Создаем глобальный индикатор загрузки
        const loaderId = 'ai-global-loader';
        let loader = document.getElementById(loaderId);
        if (!loader) {
            loader = document.createElement('div');
            loader.id = loaderId;
            loader.style.cssText = 'position:fixed; bottom:20px; right:20px; background:#8b5cf6; color:white; padding:12px 24px; border-radius:8px; z-index:9999; box-shadow:0 4px 12px rgba(0,0,0,0.15); font-weight:bold; font-family:sans-serif; display:flex; align-items:center; gap:10px; transition: opacity 0.3s;';
            document.body.appendChild(loader);
        }
        loader.innerHTML = `<span style="animation: spin 1s linear infinite; display:inline-block;">⏳</span> ${t('ed_ai_analyzing')}`;
        loader.style.display = 'flex';
        
        // Добавляем стиль для спиннера, если его еще нет
        if (!document.getElementById('ai-spinner-style')) {
            const style = document.createElement('style');
            style.id = 'ai-spinner-style';
            style.textContent = '@keyframes spin { 100% { transform: rotate(360deg); } }';
            document.head.appendChild(style);
        }

        try {
            if (AppState.isAutoFillStepByStep) {
                await AIController.generateStep(1, () => BlockDOMRenderer.renderAll());
            } else {
                await AIController.generateFull(() => BlockDOMRenderer.renderAll());
            }
        } catch (e) {
            console.error('Autofill failed', e);
            alert(t('ed_ai_gen_error') + e.message);
        } finally {
            if (loader) loader.style.display = 'none';
        }
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
        this.shapesTab = null;
        this.graphTab = null;
        this.aiTab = null;

        if (blockId) {
            const block = AppState.currentNote.blocks.find(b => b.id === blockId);
            if (save) {
                if (block) {
                    block.isDraft = false;
                    block.status = 'ready';
                }
            } else {
                if (block && block.isDraft) {
                    AppState.removeBlock(blockId);
                }
            }
            import('./BlockDOMRenderer.js').then(module => {
                module.default.renderAll();
            });
        }
    }

    static renderEditorHTML({ top, left, showAiTab, currentTitle, currentTags }) {
        return `
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
                        <button class="format-btn" data-format="question" style="color: #ef4444; font-weight: bold;" title="${t('ed_tt_question')}">?</button>
                        <button class="format-btn" data-format="hidden" style="color: #7c3aed;" title="${t('ed_tt_hidden')}">👁</button>
                        <button class="format-btn" data-format="link">🔗</button>
                        <button class="format-btn" data-format="math" style="color: #2563eb; font-weight: bold;" title="${t('ed_tt_math')}">∑</button>
                        <button class="format-btn" data-format="latex" style="color: #8b5cf6; font-weight: 800; font-size: 0.78rem; letter-spacing: -0.5px;" title="${t('ed_tt_latex')}">LTX</button>
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
                            <button class="ai-subtab-btn active" data-subtab="ai-hint" style="background: none; border: none; font-weight: bold; color: #3b82f6; cursor: pointer; padding: 4px 8px;">${t('ed_ai_howto')}</button>
                            <button class="ai-subtab-btn" data-subtab="ai-example" style="background: none; border: none; font-weight: normal; color: #64748b; cursor: pointer; padding: 4px 8px;">${t('ed_ai_example')}</button>
                        </div>
                        <div id="ai-area-hint" class="ai-subtab-content" style="display: block;">
                            <div class="ai-response-area" id="ai-response-hint" style="margin-bottom: 12px; min-height: 150px; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc; font-size: 0.95rem;">
                                <em style="color: #94a3b8;">${t('ed_ai_hint_loading')}</em>
                            </div>
                        </div>
                        <div id="ai-area-example" class="ai-subtab-content" style="display: none;">
                            <div class="ai-response-area" id="ai-response-example" contenteditable="true" style="margin-bottom: 12px; min-height: 150px; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem;">
                                <em style="color: #94a3b8;">${t('ed_ai_example_loading')}</em>
                            </div>
                            <button class="btn-primary" id="btn-ai-copy-text" style="width: 100%; padding: 10px; font-size: 1rem;">${t('ed_ai_paste_text')}</button>
                        </div>
                    </div>
                    
                    <div id="tab-stickers" class="tab-content" style="display: none; min-height: 250px;"></div>
                    
                    <div id="tab-graphs" class="tab-content" style="display: none;">
                        <div class="graph-editor">
                            <div style="margin-bottom: 8px; display: flex; gap: 8px; align-items: center;">
                                <label>f(x) =</label>
                                <input type="text" id="graph-function" value="x^2" class="modal-title-input" style="width: 200px;">
                                <button id="btn-draw-graph" class="btn-primary" style="padding: 6px 12px;">${t('ed_draw')}</button>
                            </div>
                            <div id="graph-canvas" class="canvas-container"></div>
                        </div>
                    </div>
                    
                    <div id="tab-shapes" class="tab-content" style="display: none; padding: 0 16px 16px 16px;">
                        <div class="shapes-editor" style="display: flex; flex-direction: column; gap: 8px;">
                            <div class="shapes-toolbar-wrapper" style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; background: #ffffff;">
                                <div class="shapes-toolbar-row1" style="display: flex; gap: 6px; margin-bottom: 12px; flex-wrap: wrap;">
                                    <button class="shape-tool-btn active" id="btn-shape-select" title="${t('sh_select')}"><i class="ph ph-cursor"></i></button>
                                    <button class="shape-tool-btn" id="btn-shape-draw" title="${t('sh_draw')}"><i class="ph ph-pencil-simple"></i></button>
                                    <button class="shape-tool-btn" id="btn-add-rect" title="${t('sh_rect')}"><i class="ph ph-square"></i></button>
                                    <button class="shape-tool-btn" id="btn-add-circle" title="${t('sh_circle')}"><i class="ph ph-circle"></i></button>
                                    <button class="shape-tool-btn" id="btn-add-triangle" title="${t('sh_triangle')}"><i class="ph ph-triangle"></i></button>
                                    <button class="shape-tool-btn" id="btn-add-rtriangle" title="${t('sh_rtriangle')}"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21V3l18 18H3z"></path></svg></button>
                                    <button class="shape-tool-btn" id="btn-add-diamond" title="${t('sh_diamond')}"><i class="ph ph-diamond"></i></button>
                                    <button class="shape-tool-btn" id="btn-add-line" title="${t('sh_line')}"><i class="ph ph-line-segment"></i></button>
                                    <button class="shape-tool-btn" id="btn-add-arrow" title="${t('sh_arrow')}"><i class="ph ph-arrow-right"></i></button>
                                    <button class="shape-tool-btn" id="btn-add-text" title="${t('sh_text')}"><i class="ph ph-text-t"></i></button>
                                </div>
                                <div class="shapes-toolbar-row2" style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                                    <div style="display: flex; align-items: center; border: 1px solid #cbd5e1; border-radius: 6px; padding: 2px;">
                                        <input type="color" id="shape-color-fill" title="${t('sh_fill_color')}" value="#ffffff" style="width: 24px; height: 24px; border: none; cursor: pointer; padding: 0;">
                                        <button class="shape-action-btn" id="btn-fill-transparent" title="${t('sh_no_fill')}" style="padding: 2px 4px; font-size: 16px;"><i class="ph ph-prohibit"></i></button>
                                    </div>
                                    <input type="color" id="shape-color-stroke" title="${t('sh_stroke_color')}" value="#1e293b" style="width: 28px; height: 28px; border-radius: 6px; border: 1px solid #94a3b8; cursor: pointer; padding: 0;">
                                    
                                    <input type="range" id="shape-stroke-width" min="1" max="20" value="2" title="${t('sh_stroke_width')}" style="width: 60px;">
                                    
                                    <div style="width: 1px; height: 24px; background: #e2e8f0; margin: 0 4px;"></div>
                                    
                                    <button class="shape-action-btn" id="btn-shape-grid" title="${t('sh_grid')}"><i class="ph ph-grid-four"></i></button>
                                    <button class="shape-action-btn" id="btn-shape-copy" title="${t('sh_dup')}"><i class="ph ph-copy"></i></button>
                                    <button class="shape-action-btn" id="btn-shape-lock" title="${t('sh_lock')}"><i class="ph ph-lock-key"></i></button>
                                    <button class="shape-action-btn" id="btn-shape-undo" title="${t('sh_undo')}"><i class="ph ph-arrow-u-up-left"></i></button>
                                    <button class="shape-action-btn" id="btn-shape-delete" title="${t('sh_delete')}"><i class="ph ph-trash"></i></button>
                                    <button class="shape-action-btn" id="btn-clear-canvas" title="${t('sh_clear')}"><i class="ph ph-eraser"></i></button>
                                </div>
                            </div>
                            <div class="canvas-container" style="border: 1px dashed #cbd5e1; border-radius: 8px; background: #f8fafc; overflow: hidden; display: flex; justify-content: center; align-items: center; position: relative;">
                                <canvas id="shapes-canvas" width="540" height="220"></canvas>
                            </div>
                            <button class="btn-primary" id="btn-insert-shapes" style="width: 100%; margin-top: 8px; padding: 12px; font-weight: bold; background-color: #10b981; border: none; border-radius: 8px; color: white; cursor: pointer; transition: 0.2s;">${t('sh_insert')}</button>
                        </div>
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button class="btn-primary btn-ok" id="btn-modal-ok">OK</button>
                </div>
            </div>
        `;
    }

    static escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

export default EditorManager;
