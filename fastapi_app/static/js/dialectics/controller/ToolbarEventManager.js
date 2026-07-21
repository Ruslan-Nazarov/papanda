/**
 * ToolbarEventManager.js - Менеджер событий тулбара и верхнего меню Диалектики
 */
import { DialecticsUI } from '../ui_utils.js';
import { customConfirm, customPrompt } from '../../modal_controller.js';

export const ToolbarEventManager = {
    init(engine) {
        DialecticsUI.setupDraggable(engine.dom.editor, engine.dom.dragHandle, engine.state);
        DialecticsUI.setupResizable(engine.dom.editor, document.getElementById('editorResizeHandle'));

        const bind = (id, fn) => document.getElementById(id)?.addEventListener('click', fn.bind(engine));

        bind('btnDeleteDialectics', engine.deleteGlobal);
        bind('btnSaveDialectics', () => engine.saveGlobal(false));
        bind('btnExportMarkdown', engine.exportMarkdown);
        bind('btnExportPDF', engine.exportPDF);
        bind('btnMathFormula', () => engine.editor.showMathMenu());

        bind('btnEditorSave', () => engine.saveGlobal(true));

        bind('btnPinNote', engine.pinCurrent);
        bind('btnEditorClose', async () => await engine.close(true));
        bind('btnEditorExpand', engine.toggleExpand);
        
        bind('btnLoadDialectics', async (e) => {
            engine.logDebug("btnLoadDialectics CLICKED!");
            e.preventDefault();
            e.stopPropagation();
            try {
                if (engine.state.isDirty) {
                    const confirmed = await customConfirm({
                        title: window._ ? window._('dialectics.unsaved_title') : "Внимание",
                        message: window._ ? window._('dialectics.unsaved_msg') : "Есть несохранённые изменения. Продолжить?",
                        icon: '',
                        buttons: [
                            { label: window._ ? window._('dialectics.cancel') : 'Отмена', value: false, class: 'confirm-btn-secondary' },
                            { label: window._ ? window._('dialectics.continue_btn') : 'Продолжить', value: true, class: 'confirm-btn-primary' }
                        ]
                    });
                    if (confirmed) {
                        engine.state.isDirty = false;
                        engine.showLoadModal();
                        const searchInput = document.getElementById('dialecticsSearchInput');
                        if (searchInput) {
                            searchInput.value = '';
                            searchInput.focus();
                        }
                    }
                } else {
                    engine.showLoadModal();
                    const searchInput = document.getElementById('dialecticsSearchInput');
                    if (searchInput) {
                        searchInput.value = '';
                        searchInput.focus();
                    }
                }
            } catch (err) {
                engine.logDebug("ERROR in open button: " + err.message);
                alert("Error in open button: " + err.message);
            }
        });

        const searchInput = document.getElementById('dialecticsSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => engine.searchNotes(e.target.value));
        }

        bind('btnNewDialectics', engine.createNewNote);
        bind('btnTrashDialectics', () => {
            const menu = document.getElementById('dialecticsMenuContent');
            if (menu) menu.style.display = 'none';
            engine.showTrashModal();
        });
        bind('btnGlobalParser', engine.runGlobalParser);
        bind('btnExampleDialectics', engine.loadExample);
        bind('btnPrevDialectics', engine.loadPreviousNote);
        bind('btnDialecticsReference', engine.showReferenceModal);
        bind('btnDialecticsGuide', engine.showGuideModal);
        
        bind('btnDialecticsConnections', engine.showConnectionsModal);
        bind('close-connections-btn', () => {
            if (engine.dom.connectionsModal) engine.dom.connectionsModal.style.display = 'none';
        });
        bind('add-category-btn', engine.addCategory);
        
        const connSearchInput = document.getElementById('connections-search-input');
        if (connSearchInput) {
            connSearchInput.addEventListener('input', (e) => engine.searchConnections(e.target.value));
        }

        if (engine.dom.categorySelect) {
            engine.dom.categorySelect.addEventListener('change', async (e) => {
                if (e.target.value === "__add_new__") {
                    e.target.value = "";
                    const newCatName = await customPrompt({
                        title: "Новая категория",
                        message: "Введите название новой категории:",
                        placeholder: "Например: Физика, Идеи..."
                    });
                    
                    if (newCatName && newCatName.trim()) {
                        await engine.createNewCategory(newCatName.trim());
                    }
                } else if (engine.state.currentNoteId) {
                    await engine.saveGlobal(false, "toast.dialectics_updated");
                }
            });
        }

        bind('btnViewModalEdit', () => {
            engine.hideViewModal();
            engine.loadNoteToEditor(engine.state.viewingNoteId);
        });
    }
};
