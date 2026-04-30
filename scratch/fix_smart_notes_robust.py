import os

file_path = r'd:/Библиотека/Исследования/Искусственный интеллект/papanda/papanda v 0.6 experiment/fastapi_app/static/js/smart_notes.js'

with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Define the new constructor and init with better error handling
new_constructor_and_init = """    constructor() {
        console.log("🛠️ Constructing SmartNoteEngine...");
        this.state = {
            currentNoteId: null,
            currentEditTarget: null,
            pendingSide: null,
            isExpanded: false,
            isDragging: false,
            dragOffset: { x: 0, y: 0 },
            backupPos: { top: '', left: '' },
            activeTab: 'normal',
            recentSymbols: [],
            currentGraphNode: null
        };

        const get = (id) => {
            const el = document.getElementById(id);
            if (!el) console.warn(`⚠️ Element #${id} not found!`);
            return el;
        };

        this.dom = {
            canvas: get('noteCanvas'),
            editor: get('inlineEditor'),
            textarea: get('editor-textarea'),
            rendered: get('editor-rendered'),
            graph: get('editor-graph'),
            shapes: get('editor-shapes'),
            title: get('globalNoteTitle'),
            deleteBtn: get('btnDeleteNote'),
            wordCount: get('wordCount'),
            mathMenu: get('mathContextMenu'),
            backdrop: get('expandedBackdrop'),
            expandBtn: get('btnEditorExpand'),
            tabNormal: get('tab-normal'),
            tabMarkup: get('tab-markup'),
            tabGraph: get('tab-graph'),
            tabShapes: get('tab-shapes'),
            dragHandle: get('editorDragHandle'),
            menuBasicBtn: get('btnMenuBasic'),
            menuBracketsBtn: get('btnMenuBrackets'),
            menuOtherBtn: get('btnMenuOther'),
            categoryBasic: get('category-basic'),
            categoryBrackets: get('category-brackets'),
            categoryOther: get('category-other'),
            boldBtn: get('btnBoldFormat'),
            insertGraphBtn: get('btnInsertGraph'),
            graphInput: get('graphInput'),
            graphXMin: get('graphXMin'),
            graphXMax: get('graphXMax'),
            graphCanvas: get('previewGraphCanvas'),
            floatingWindow: get('graphFloatingWindow'),
            floatingCanvas: get('floatingGraphCanvas'),
            floatingHeader: get('graphWindowHeader')
        };
        
        this.chartInstance = null;
        this._lastGraphData = null;

        try {
            this.init();
        } catch (e) {
            console.error("❌ SmartNoteEngine initialization failed:", e);
        }
    }

    init() {
        console.log("🚀 Initializing SmartNoteEngine...");
        this._setupLibraries();
        
        if (this.dom.canvas) this._bindGlobalEvents();
        if (this.dom.editor) {
            this._bindEditorEvents();
            this._bindDragEvents();
            this._bindResizeEvents();
        }
        if (this.dom.floatingWindow) this._bindFloatingWindowEvents();
        
        this.loadRecentSymbols();
        this.renderRecentMenu();

        console.log("✅ SmartNoteEngine initialized and ready.");
    }"""

# Define improved open and setPosition
new_open_and_pos = """    open() {
        console.log("📂 Opening editor...");
        if (!this.dom.editor) return;

        if (window.getSelection) {
            const sel = window.getSelection();
            if (sel.empty) sel.empty();
            else if (sel.removeAllRanges) sel.removeAllRanges();
        }
        
        this.dom.editor.style.display = 'flex';
        this.dom.editor.style.visibility = 'visible';
        this.dom.editor.style.opacity = '1';
        this.dom.editor.classList.remove('expanded-mode');
        
        this.switchTab('normal');
        this.updateCounter();
        
        requestAnimationFrame(() => this.checkHasSelection());
    }

    close() {
        if (this.dom.editor) {
            this.dom.editor.style.display = 'none';
            this.dom.editor.classList.remove('expanded-mode');
        }
        if (this.dom.backdrop) this.dom.backdrop.style.display = 'none';
        this.state.isExpanded = false;
    }

    setPosition(x, y) {
        const interfaceEl = document.querySelector('.note-interface');
        if (!interfaceEl || !this.dom.editor) return;

        const parent = interfaceEl.getBoundingClientRect();
        let top = y - parent.top;
        let left = x - parent.left;

        // Ensure within bounds
        const editorWidth = 480; 
        const editorHeight = 400;

        if (left + editorWidth > parent.width) left = parent.width - editorWidth - 20;
        if (left < 0) left = 20;
        
        if (top + editorHeight > parent.height) top = parent.height - editorHeight - 20;
        if (top < 0) top = 20;

        this.dom.editor.style.top = `${top}px`;
        this.dom.editor.style.left = `${left}px`;
        console.log(`📍 Positioned editor at: ${top}, ${left}`);
    }"""

# Replace in content
# For constructor and init (lines 6 to ~80)
# For open, close, setPosition (lines ~318 to ~347)

import re

# Find constructor block
content = re.sub(r'constructor\s*\(\)\s*\{[\s\S]*?init\(\)\s*\{[\s\S]*?console\.log\(".*?"\);\s*\}', new_constructor_and_init, content, 1)

# Find open/close/setPosition block
content = re.sub(r'open\(\)\s*\{[\s\S]*?setPosition\(x, y\)\s*\{[\s\S]*?this\.dom\.editor\.style\.left = \`\$\{left\}px\`;\s*\}', new_open_and_pos, content, 1)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("File updated with robust initialization and positioning.")
