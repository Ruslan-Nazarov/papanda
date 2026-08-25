import AppState from './AppState.js';
import BlockDOMRenderer from './BlockDOMRenderer.js';
import NoteController from './NoteController.js';
import BlockDnDManager from './BlockDnDManager.js';
import EditorManager from './EditorManager.js';
import NoteStorageService from './NoteStorageService.js';
import NotesAPI from './api.js';
import BlockMathRenderer from './BlockMathRenderer.js';
import LoadNotesModalService from './LoadNotesModalService.js';
import ConnectionsModalService from './ConnectionsModalService.js';
import NoteExportService from './NoteExportService.js';
import NoteVersionsService from './NoteVersionsService.js';
import ParserWindowsManager from './ParserWindowsManager.js';
import FooterModalsService from './FooterModalsService.js';
import CategoryManager from './CategoryManager.js';
import TOCManager from './TOCManager.js';
import SearchManager from './SearchManager.js';
import BlockStickersManager from './BlockStickersManager.js';
import DialogService from './DialogService.js';
import { t, switchLanguage } from '../i18n.js';

// Navigation history stack for "back" button
const _navHistory = [];

class App {
    static init() {
        console.log('Notes App Initialized');
        
        // Initialize managers
        BlockDnDManager.init();
        EditorManager.init();
        NoteVersionsService.init();
        CategoryManager.init();
        TOCManager.init();
        SearchManager.init();
        BlockStickersManager.init();
        NoteController.init(); // autosave + beforeunload
        ParserWindowsManager.init();
        
        // Setup UI bindings
        this.setupBindings();
        
        // Load initial note state
        this.loadInitialState();
    }

    static showModal(title, contentHTML) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        
        const dialog = document.createElement('div');
        dialog.className = 'modal-dialog';
        
        dialog.innerHTML = `
            <div class="modal-dialog-header">
                <h2>${title}</h2>
                <button class="icon-btn btn-close-modal">✕</button>
            </div>
            <div class="modal-dialog-body">
                ${contentHTML}
            </div>
            <div class="modal-dialog-footer">
                <button class="action-btn primary btn-ok-modal">OK</button>
            </div>
        `;
        
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        
        const close = () => {
            if (document.body.contains(overlay)) document.body.removeChild(overlay);
        };
        dialog.querySelector('.btn-close-modal').addEventListener('click', close);
        dialog.querySelector('.btn-ok-modal').addEventListener('click', close);
        
        return { overlay, dialog, close };
    }

    static setupBindings() {
        // --- 1. Top Header Dropdowns & Navigation ---
        const btnMode = document.getElementById('btn-mode');
        const modeDropdown = document.getElementById('mode-dropdown');
        const btnParsersNav = document.getElementById('btn-parsers-nav');
        const parsersDropdown = document.getElementById('parsers-dropdown');
        const btnConnectionsNav = document.getElementById('btn-connections-nav');
        const btnMainMenu = document.getElementById('btn-main-menu');
        const mainMenuDropdown = document.getElementById('main-menu-dropdown');
        const btnLangMenu = document.getElementById('btn-lang-menu');
        const langMenuDropdown = document.getElementById('lang-menu-dropdown');

        const allDropdowns = [modeDropdown, parsersDropdown, mainMenuDropdown, langMenuDropdown];

        const closeAllDropdowns = () => {
            allDropdowns.forEach(d => { if (d) d.classList.add('hidden'); });
        };

        if (btnMode && modeDropdown) {
            btnMode.addEventListener('click', (e) => {
                e.stopPropagation();
                const isHidden = modeDropdown.classList.contains('hidden');
                closeAllDropdowns();
                if (isHidden) modeDropdown.classList.remove('hidden');
            });
        }

        if (btnParsersNav && parsersDropdown) {
            btnParsersNav.addEventListener('click', (e) => {
                e.stopPropagation();
                const isHidden = parsersDropdown.classList.contains('hidden');
                closeAllDropdowns();
                if (isHidden) parsersDropdown.classList.remove('hidden');
            });
        }

        if (btnConnectionsNav) {
            btnConnectionsNav.addEventListener('click', () => {
                closeAllDropdowns();
                ConnectionsModalService.show(this);
            });
        }

        if (btnMainMenu && mainMenuDropdown) {
            btnMainMenu.addEventListener('click', (e) => {
                e.stopPropagation();
                const isHidden = mainMenuDropdown.classList.contains('hidden');
                closeAllDropdowns();
                if (isHidden) mainMenuDropdown.classList.remove('hidden');
            });
        }
        if (btnLangMenu && langMenuDropdown) {
            btnLangMenu.addEventListener('click', (e) => {
                e.stopPropagation();
                const isHidden = langMenuDropdown.classList.contains('hidden');
                closeAllDropdowns();
                if (isHidden) langMenuDropdown.classList.remove('hidden');
            });
        }

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.dropdown-wrapper')) {
                closeAllDropdowns();
            }
        });

        // --- 2. Parsers Menu Actions ---
        document.getElementById('menu-item-formula-parser')?.addEventListener('click', () => {
            closeAllDropdowns();
            ParserWindowsManager.openWindow('formula');
        });

        document.getElementById('menu-item-article-parser')?.addEventListener('click', () => {
            closeAllDropdowns();
            ParserWindowsManager.openWindow('article');
        });

        // --- 3. Main Menu Actions ---
        document.getElementById('menu-item-open-note')?.addEventListener('click', async () => {
            closeAllDropdowns();
            LoadNotesModalService.show(this);
        });

        document.getElementById('menu-item-new-note')?.addEventListener('click', async () => {
            closeAllDropdowns();
            if (AppState.isDirty) {
                const confirmed = await DialogService.confirm({
                    title: 'Новый конспект',
                    message: 'Имеются несохраненные изменения. Создать новый конспект?',
                    confirmText: 'Создать'
                });
                if (!confirmed) return;
            }
            AppState.setNote({ id: null, title: 'Новый конспект', blocks: [] });
            BlockDOMRenderer.renderAll();
        });

        document.getElementById('menu-item-back-note')?.addEventListener('click', async () => {
            closeAllDropdowns();
            if (_navHistory.length >= 2) {
                // Pop current, then load previous
                _navHistory.pop();
                const prevId = _navHistory[_navHistory.length - 1];
                await NoteStorageService.loadNote(prevId);
            } else {
                await DialogService.alert('Назад', 'Нет предыдущего конспекта в истории навигации.');
            }
        });

        document.getElementById('menu-item-trash')?.addEventListener('click', async () => {
            closeAllDropdowns();
            LoadNotesModalService.show(this, 'trash');
        });

        document.getElementById('menu-item-delete-current')?.addEventListener('click', async () => {
            closeAllDropdowns();
            if (!AppState.currentNote.id) {
                AppState.setNote({ id: null, title: 'Новый конспект', blocks: [] });
                BlockDOMRenderer.renderAll();
                return;
            }
            const confirmed = await DialogService.confirm({
                title: 'В корзину',
                message: `Переместить конспект "${AppState.currentNote.title}" в корзину?`,
                isDestructive: true,
                confirmText: 'Переместить'
            });
            if (confirmed) {
                await NotesAPI.deleteNote(AppState.currentNote.id);
                this.loadInitialState();
            }
        });

        document.getElementById('menu-item-export-md')?.addEventListener('click', () => {
            closeAllDropdowns();
            NoteExportService.exportToMarkdown();
        });

        document.getElementById('menu-item-export-pdf')?.addEventListener('click', () => {
            closeAllDropdowns();
            NoteExportService.exportToPDF();
        });

        // --- 4. Mode Toggles ---
        const toggleDialectics = document.getElementById('toggle-dialectics');
        const toggleTwoColumn = document.getElementById('toggle-two-column');
        const toggleKeepTitles = document.getElementById('toggle-keep-titles');
        const toggleHideLeft = document.getElementById('toggle-hide-left');
        const toggleShowHints = document.getElementById('toggle-show-hints');
        const toggleAutoFill = document.getElementById('toggle-auto-fill');
        const toggleAutoFillStep = document.getElementById('toggle-autofill-step');
        const cont = document.getElementById('blocks-container');

        if (toggleDialectics) {
            toggleDialectics.addEventListener('change', (e) => {
                cont.classList.toggle('mode-no-dialectics', !e.target.checked);
                cont.classList.toggle('hide-dialectics-line', !e.target.checked);
                BlockDOMRenderer.renderAll();
            });
        }

        if (toggleTwoColumn) {
            toggleTwoColumn.addEventListener('change', (e) => {
                cont.classList.toggle('single-column-mode', !e.target.checked);
                if (!e.target.checked && toggleHideLeft) {
                    toggleHideLeft.checked = false;
                    cont.classList.remove('hide-left-column');
                }
            });
        }

        if (toggleKeepTitles) {
            toggleKeepTitles.addEventListener('change', (e) => {
                cont.classList.toggle('collapse-titles-only', e.target.checked);
            });
        }

        if (toggleHideLeft) {
            toggleHideLeft.addEventListener('change', (e) => {
                cont.classList.toggle('hide-left-column', e.target.checked);
                if (e.target.checked && toggleTwoColumn) {
                    toggleTwoColumn.checked = true;
                    cont.classList.remove('single-column-mode');
                }
            });
        }

        // --- 5. Internal Links Handler ---
        document.addEventListener('click', async (e) => {
            const link = e.target.closest('a[href^="internal://"]');
            if (link) {
                e.preventDefault();
                const url = link.getAttribute('href');
                const match = url.match(/^internal:\/\/note\/([a-zA-Z0-9_-]+)(?:\/block\/([a-zA-Z0-9_-]+))?/);
                if (match) {
                    const noteId = match[1];
                    const blockId = match[2];
                    
                    if (AppState.currentNote.id !== noteId) {
                        if (AppState.isDirty) {
                            const confirmed = await DialogService.confirm({
                                title: 'Переход по ссылке',
                                message: 'Имеются несохраненные изменения. Сохранить их перед переходом?',
                                confirmText: 'Сохранить и перейти',
                                cancelText: 'Перейти без сохранения'
                            });
                            if (confirmed === null) return; // User closed modal
                            if (confirmed) {
                                await NoteStorageService.saveCurrentNote();
                            }
                        }
                        
                        // Show loading or just load
                        try {
                            await NoteStorageService.loadNote(noteId);
                            import('./BlockDOMRenderer.js').then(module => {
                                module.default.renderAll();
                                if (blockId) {
                                    setTimeout(() => {
                                        const blockEl = document.getElementById(`block-${blockId}`);
                                        if (blockEl) {
                                            blockEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                            blockEl.style.boxShadow = '0 0 0 3px #3b82f6';
                                            setTimeout(() => blockEl.style.boxShadow = '', 2000);
                                        }
                                    }, 100);
                                }
                            });
                        } catch (err) {
                            DialogService.alert('Ошибка', 'Не удалось загрузить конспект.');
                        }
                    } else if (blockId) {
                        // Already in the same note, just scroll
                        const blockEl = document.getElementById(`block-${blockId}`);
                        if (blockEl) {
                            blockEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            blockEl.style.boxShadow = '0 0 0 3px #3b82f6';
                            setTimeout(() => blockEl.style.boxShadow = '', 2000);
                        }
                    }
                }
            }
        });

        if (toggleShowHints) {
            toggleShowHints.addEventListener('change', (e) => {
                cont.classList.toggle('show-hints', e.target.checked);
                AppState.toggleShowHiddenHints = e.target.checked;
                BlockDOMRenderer.renderAll();
            });
        }

        if (toggleAutoFill) {
            toggleAutoFill.addEventListener('change', (e) => {
                AppState.isAutoFillEnabled = e.target.checked;
                const rowAutofillStep = document.getElementById('row-autofill-step');
                if (rowAutofillStep) {
                    rowAutofillStep.style.display = e.target.checked ? 'flex' : 'none';
                }
                BlockDOMRenderer.renderAll();
            });
        }
        
        if (toggleAutoFillStep) {
            toggleAutoFillStep.addEventListener('change', (e) => {
                AppState.isAutoFillStepByStep = e.target.checked;
                BlockDOMRenderer.renderAll();
            });
        }

        // --- 5. Note Header Bar ---
        const btnSave = document.getElementById('btn-save');
        if (btnSave) {
            btnSave.addEventListener('click', async () => {
                try {
                    const NoteStorageService = (await import('./NoteStorageService.js')).default;
                    await NoteStorageService.saveCurrentNote();
                    
                    if (AppState.currentNote && AppState.currentNote.id) {
                        const NotesAPI = (await import('./api.js')).default;
                        const now = new Date();
                        const dateStr = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                        await NotesAPI.createCheckpoint(
                            AppState.currentNote.id,
                            `Сохранение ${dateStr}`,
                            true
                        );
                    }

                    this.updateSaveStatusUI();
                    this.updateSaveTime();
                    const { showToast } = await import('./ToastService.js');
                    showToast('Конспект и версия сохранены');
                } catch (e) {
                    console.error('Save failed:', e);
                    const { showToast } = await import('./ToastService.js');
                    showToast('Ошибка сохранения', 'error');
                }
            });
        }

        const statusDot = document.getElementById('save-status-dot');
        if (statusDot) {
            statusDot.addEventListener('click', async () => {
                const currentStatus = AppState.currentNote.status;
                const newStatus = (currentStatus === 'ready' || currentStatus === 'done') ? 'in_progress' : 'ready';
                AppState.currentNote.status = newStatus;
                this.updateSaveStatusUI();

                const { showToast } = await import('./ToastService.js');
                const isReady = (newStatus === 'ready');

                if (AppState.currentNote.id) {
                    try {
                        const NotesAPI = (await import('./api.js')).default;
                        await NotesAPI.updateNoteStatus(AppState.currentNote.id, newStatus);
                    } catch (e) {
                        console.error('Failed to update status on server:', e);
                    }
                } else {
                    AppState.markDirty();
                }

                showToast(isReady ? 'Статус конспекта: Готово' : 'Статус конспекта: Черновик (в процессе)');
            });
        }

        const btnPublish = document.getElementById('menu-item-publish');
        if (btnPublish) {
            btnPublish.addEventListener('click', async () => {
                AppState.currentNote.status = 'ready';
                this.updateSaveStatusUI();
                const { showToast } = await import('./ToastService.js');
                if (AppState.currentNote.id) {
                    try {
                        const NotesAPI = (await import('./api.js')).default;
                        await NotesAPI.updateNoteStatus(AppState.currentNote.id, 'ready');
                    } catch (e) {
                        console.error('Failed to update status on server:', e);
                    }
                } else {
                    AppState.markDirty();
                }
                showToast('Конспект опубликован на портале!');
            });
        }

        const noteTitleInput = document.getElementById('note-title');
        if (noteTitleInput) {
            noteTitleInput.addEventListener('input', (e) => {
                AppState.currentNote.title = e.target.value;
                AppState.markDirty();
            });
        }

        // --- 6. Sub Bar ---
        document.getElementById('btn-versions')?.addEventListener('click', () => {
            NoteVersionsService.show(this);
        });

        // --- 7. Canvas Divider Add Buttons ---
        const container = document.getElementById('blocks-container');
        if (container) {
            container.addEventListener('click', async (e) => {
                const btn = e.target.closest('.icon-add-btn, .section-add-btn');
                if (!btn) return;
                
                const divider = btn.closest('.block-divider');
                if (!divider) return;
                
                const index = parseInt(divider.dataset.index, 10);
                
                if (btn.classList.contains('section-add-btn')) {
                    const BlockSectionsManager = (await import('./BlockSectionsManager.js')).default;
                    BlockSectionsManager.handleAddSection(this, index);
                } else if (btn.classList.contains('left')) {
                    this.addNewBlock('left', index);
                } else if (btn.classList.contains('center')) {
                    this.addNewBlock('center', index);
                } else if (btn.classList.contains('right')) {
                    this.addNewBlock('right', index);
                }
            });
        }

        // --- 8. Footer Buttons ---
        document.getElementById('btn-footer-training')?.addEventListener('click', () => {
            FooterModalsService.showTraining(this);
        });

        document.getElementById('btn-footer-about')?.addEventListener('click', () => {
            FooterModalsService.showAbout(this);
        });

        document.getElementById('btn-footer-changelog')?.addEventListener('click', () => {
            FooterModalsService.showChangelog(this);
        });

        document.getElementById('btn-footer-contact')?.addEventListener('click', () => {
            FooterModalsService.showContact(this);
        });

        // --- 9. Scroll to Top FAB ---
        const scrollTopBtn = document.getElementById('btn-scroll-top');
        if (scrollTopBtn) {
            scrollTopBtn.addEventListener('click', () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });

            window.addEventListener('scroll', () => {
                if (window.scrollY > 150) {
                    scrollTopBtn.classList.add('visible');
                } else {
                    scrollTopBtn.classList.remove('visible');
                }
            });
        }

        // --- 10. Note State Listeners ---
        document.addEventListener('noteLoaded', () => {
            const titleInput = document.getElementById('note-title');
            if (titleInput) titleInput.value = AppState.currentNote.title || '';
            // Track navigation history
            if (AppState.currentNote.id && _navHistory[_navHistory.length - 1] !== AppState.currentNote.id) {
                _navHistory.push(AppState.currentNote.id);
                if (_navHistory.length > 50) _navHistory.shift(); // cap history
            }
            BlockDOMRenderer.renderAll();
            NoteController.updateProgress();
            this.updateSaveStatusUI();
            this.updateSaveTime();
        });

        document.addEventListener('stateDirty', () => {
            NoteController.updateProgress();
            NoteController._updateStatusIndicator();
            this.updateSaveStatusUI();
        });

        // --- 11. Language Switcher ---
        const langButtons = document.querySelectorAll('[data-lang]');
        langButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const lang = btn.dataset.lang;
                if (lang) switchLanguage(lang);
            });
        });
    }

    static updateSaveStatusUI() {
        const btnSave = document.getElementById('btn-save');
        const dot = document.getElementById('save-status-dot');

        if (btnSave) {
            if (AppState.isDirty) {
                btnSave.classList.add('is-dirty');
            } else {
                btnSave.classList.remove('is-dirty');
            }
        }

        if (dot) {
            const isReady = (AppState.currentNote && (AppState.currentNote.status === 'ready' || AppState.currentNote.status === 'done'));
            dot.classList.toggle('status-ready', isReady);
            dot.classList.toggle('status-in-progress', !isReady);
            dot.title = isReady 
                ? 'Статус: Готово (нажмите, чтобы изменить на Черновик)' 
                : 'Статус: Черновик (нажмите, чтобы изменить на Готово)';
        }
    }

    static updateSaveTime() {
        const timeEl = document.getElementById('save-time-text');
        if (timeEl) {
            const now = new Date();
            const hh = String(now.getHours()).padStart(2, '0');
            const mm = String(now.getMinutes()).padStart(2, '0');
            timeEl.textContent = `Сохранено: ${hh}:${mm}`;
        }
        this.updateSaveStatusUI();
    }

    static addNewBlock(side, index = -1, role = null, title = 'Новый блок') {
        const id = 'block-' + Math.random().toString(36).substring(2, 9);
        const block = {
            id,
            side,
            role,
            title,
            html: '',
            status: 'none',
            is_pinned: false
        };
        AppState.addBlock(block, index);
        BlockDOMRenderer.renderAll();
    }

    static async loadInitialState() {
        try {
            const notes = await NotesAPI.getNotes();
            if (notes && notes.length > 0) {
                await NoteStorageService.loadNote(notes[0].id);
            } else {
                AppState.setNote({ id: null, title: 'Тема конспекта...', blocks: [] });
            }
        } catch (e) {
            console.error('Failed to load initial state', e);
            AppState.setNote({ id: null, title: 'Тема конспекта...', blocks: [] });
        }
    }
}

// Start app
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
window.app = App;
