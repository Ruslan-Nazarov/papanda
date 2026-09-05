console.log('APP JS LOADED');
import AppState from './AppState.js';
import BlockDOMRenderer from './BlockDOMRenderer.js';
import NoteController from './NoteController.js';
import BlockDnDManager from './BlockDnDManager.js';
import EditorManager from './EditorManager.js';
import NoteStorageService from './NoteStorageService.js';
import NotesAPI from './api.js';
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
import DropdownController from './DropdownController.js';
import NavHistoryManager from './NavHistoryManager.js';
import ConceptSelectionMenu from './ConceptSelectionMenu.js';
import ModeManager from './ModeManager.js';
import SkillManager from './SkillManager.js';
import OnboardingTour from './OnboardingTour.js';
import { t, switchLanguage } from '../i18n.js';

class App {
    static init() {
        // Initialize managers
        BlockDnDManager.init();
        EditorManager.init();
        NoteVersionsService.init();
        CategoryManager.init();
        TOCManager.init();
        SearchManager.init();
        BlockStickersManager.init();
        NoteController.init();
        ParserWindowsManager.init();
        DropdownController.init();
        ConceptSelectionMenu.init();
        ModeManager.init();
        SkillManager.init();

        // Setup UI bindings & listeners
        this.setupBindings();
        this.setupCopyHandler();
        
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

    static setupCopyHandler() {
        document.addEventListener('copy', (e) => {
            const selection = window.getSelection();
            if (!selection || selection.isCollapsed) return;

            const container = document.createElement('div');
            for (let i = 0; i < selection.rangeCount; i++) {
                container.appendChild(selection.getRangeAt(i).cloneContents());
            }

            if (container.querySelector('.katex, .math-callout, .math-inline')) {
                container.querySelectorAll('.katex').forEach(katexEl => {
                    const annotation = katexEl.querySelector('annotation[encoding="application/x-tex"]');
                    let formula = '';
                    if (annotation) {
                        formula = annotation.textContent.trim();
                    } else {
                        formula = katexEl.getAttribute('data-formula') || katexEl.getAttribute('formula') || '';
                    }
                    if (!formula) {
                        const mathml = katexEl.querySelector('.katex-mathml');
                        if (mathml) formula = mathml.textContent.trim();
                    }

                    if (formula) {
                        const isDisplay = katexEl.closest('.katex-display') || katexEl.classList.contains('katex-display');
                        const span = document.createElement('span');
                        span.className = 'math-inline';
                        span.setAttribute('formula', formula);
                        span.textContent = isDisplay ? `$$${formula}$$` : `$${formula}$`;
                        katexEl.parentNode.replaceChild(span, katexEl);
                    }
                });

                container.querySelectorAll('.katex-mathml, .katex-html').forEach(el => el.remove());

                const cleanHtml = container.innerHTML;
                const cleanText = container.innerText;
                if (cleanHtml && e.clipboardData) {
                    e.clipboardData.setData('text/html', cleanHtml);
                    e.clipboardData.setData('text/plain', cleanText);
                    e.preventDefault();
                }
            }
        });
    }

    static setupBindings() {
        // --- 1. Nav Buttons ---
        // Мобильный гамбургер: показать/скрыть панель шапки
        const headerRight = document.getElementById('header-right');
        const btnMobileNav = document.getElementById('btn-mobile-nav');
        if (headerRight && btnMobileNav) {
            btnMobileNav.addEventListener('click', (e) => {
                e.stopPropagation();
                headerRight.classList.toggle('mobile-open');
            });
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.top-header')) headerRight.classList.remove('mobile-open');
            });
        }

        document.getElementById('btn-connections-nav')?.addEventListener('click', () => {
            DropdownController.closeAll();
            headerRight?.classList.remove('mobile-open');
            ConnectionsModalService.show(this);
        });

        // --- 2. Parsers Menu Actions ---
        document.getElementById('menu-item-formula-parser')?.addEventListener('click', () => {
            DropdownController.closeAll();
            ParserWindowsManager.openWindow('formula');
        });

        document.getElementById('menu-item-article-parser')?.addEventListener('click', () => {
            DropdownController.closeAll();
            ParserWindowsManager.openWindow('article');
        });

        // --- 3. Main Menu Actions ---
        document.getElementById('menu-item-open-note')?.addEventListener('click', async () => {
            DropdownController.closeAll();
            LoadNotesModalService.show(this);
        });

        const startNewConspect = async () => {
            DropdownController.closeAll();
            if (AppState.isDirty) {
                const confirmed = await DialogService.confirm({
                    title: t('menu_new_note'),
                    message: t('confirm_new_note'),
                    confirmText: t('create_word')
                });
                if (!confirmed) return;
            }
            AppState.setNote({ id: null, title: t('menu_new_note'), blocks: [] });
            BlockDOMRenderer.renderAll();
        };
        document.getElementById('menu-item-new-note')?.addEventListener('click', startNewConspect);
        document.getElementById('btn-new-conspect')?.addEventListener('click', startNewConspect);

        document.getElementById('menu-item-back-note')?.addEventListener('click', async () => {
            DropdownController.closeAll();
            await NavHistoryManager.goBack();
        });

        document.getElementById('menu-item-trash')?.addEventListener('click', async () => {
            DropdownController.closeAll();
            LoadNotesModalService.show(this, 'trash');
        });

        document.getElementById('menu-item-delete-current')?.addEventListener('click', async () => {
            DropdownController.closeAll();
            if (!AppState.currentNote.id) {
                AppState.setNote({ id: null, title: '', blocks: [] });
                BlockDOMRenderer.renderAll();
                return;
            }
            const confirmed = await DialogService.confirm({
                title: t('to_trash'),
                message: `${t('confirm_to_trash_msg')} "${AppState.currentNote.title}"`,
                isDestructive: true,
                confirmText: t('move_word')
            });
            if (confirmed) {
                await NotesAPI.deleteNote(AppState.currentNote.id);
                this.loadInitialState();
            }
        });

        document.getElementById('menu-item-export-md')?.addEventListener('click', () => {
            DropdownController.closeAll();
            NoteExportService.exportToMarkdown();
        });

        document.getElementById('menu-item-export-pdf')?.addEventListener('click', () => {
            DropdownController.closeAll();
            NoteExportService.exportToPDF();
        });

        // --- 4. Mode Toggles ---
        const toggleDialectics = document.getElementById('toggle-dialectics');
        const toggleTwoColumn = document.getElementById('toggle-two-column');
        const toggleKeepTitles = document.getElementById('toggle-keep-titles');
        const toggleHideLeft = document.getElementById('toggle-hide-left');
        const toggleShowHints = document.getElementById('toggle-show-hints');
        const cont = document.getElementById('blocks-container');
        // Главный переключатель режимов и «По шагам» — в ModeManager.

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

        if (toggleShowHints) {
            toggleShowHints.addEventListener('change', (e) => {
                cont.classList.toggle('show-hints', e.target.checked);
                AppState.toggleShowHiddenHints = e.target.checked;
                BlockDOMRenderer.renderAll();
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
                                title: t('link_nav_title'),
                                message: t('link_nav_msg'),
                                confirmText: t('save_and_go'),
                                cancelText: t('go_without_save')
                            });
                            if (confirmed === null) return;
                            if (confirmed) {
                                await NoteStorageService.saveCurrentNote();
                            }
                        }
                        
                        try {
                            await NoteStorageService.loadNote(noteId);
                            BlockDOMRenderer.renderAll();
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
                        } catch (err) {
                            DialogService.alert(t('error_word'), t('note_load_failed'));
                        }
                    } else if (blockId) {
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

        // --- 6. Save & Status ---
        const btnSave = document.getElementById('btn-save');
        if (btnSave) {
            btnSave.addEventListener('click', async () => {
                try {
                    await NoteStorageService.saveCurrentNote();
                    
                    if (AppState.currentNote && AppState.currentNote.id) {
                        const now = new Date();
                        const dateStr = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                        await NotesAPI.createCheckpoint(
                            AppState.currentNote.id,
                            `${t('checkpoint_label')} ${dateStr}`,
                            true
                        );
                    }

                    this.updateSaveStatusUI();
                    this.updateSaveTime();
                    const { showToast } = await import('./ToastService.js');
                    showToast(t('note_and_version_saved'));
                } catch (e) {
                    console.error('Save failed:', e);
                    const { showToast } = await import('./ToastService.js');
                    showToast(t('save_error'), 'error');
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
                        await NotesAPI.updateNoteStatus(AppState.currentNote.id, newStatus);
                    } catch (e) {
                        console.error('Failed to update status on server:', e);
                    }
                } else {
                    AppState.markDirty();
                }

                showToast(isReady ? t('status_note_ready') : t('status_note_draft'));
            });
        }

        const noteTitleInput = document.getElementById('note-title');
        if (noteTitleInput) {
            noteTitleInput.addEventListener('input', (e) => {
                AppState.currentNote.title = e.target.value;
                AppState.markDirty();
            });
        }

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
        document.getElementById('btn-howto')?.addEventListener('click', () => {
            DropdownController.closeAll();
            document.getElementById('header-right')?.classList.remove('mobile-open');
            OnboardingTour.start();
        });
        document.getElementById('btn-footer-about')?.addEventListener('click', () => FooterModalsService.showAbout(this));
        document.getElementById('btn-footer-changelog')?.addEventListener('click', () => FooterModalsService.showChangelog(this));
        document.getElementById('btn-footer-contact')?.addEventListener('click', () => FooterModalsService.showContact(this));

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
            if (AppState.currentNote.id) {
                NavHistoryManager.push(AppState.currentNote.id);
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
            btnSave.classList.toggle('is-dirty', AppState.isDirty);
        }

        if (dot) {
            const isReady = (AppState.currentNote && (AppState.currentNote.status === 'ready' || AppState.currentNote.status === 'done'));
            dot.classList.toggle('status-ready', isReady);
            dot.classList.toggle('status-in-progress', !isReady);
            dot.title = isReady 
                ? t('status_dot_ready')
                : t('status_dot_draft');
        }
    }

    static updateSaveTime() {
        const timeEl = document.getElementById('save-time-text');
        if (timeEl) {
            const now = new Date();
            const hh = String(now.getHours()).padStart(2, '0');
            const mm = String(now.getMinutes()).padStart(2, '0');
            timeEl.textContent = `${t('saved_at')}: ${hh}:${mm}`;
        }
        this.updateSaveStatusUI();
    }

    static addNewBlock(side, index = -1, role = null, title = t('new_block_default')) {
        const id = 'block-' + crypto.randomUUID().replace(/-/g, '').substring(0, 9);
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
            const lastId = localStorage.getItem('papanda_last_note_id');
            if (lastId) {
                try {
                    const note = await NotesAPI.getNote(lastId);
                    if (note && !note.is_deleted) {
                        await NoteStorageService.loadNote(note.id);
                        return;
                    }
                } catch (e) {
                    // Fallback to list
                }
            }

            const notes = await NotesAPI.getNotes();
            if (notes && notes.length > 0) {
                await NoteStorageService.loadNote(notes[0].id);
            } else {
                AppState.setNote({ id: null, title: '', blocks: [] });
            }
        } catch (e) {
            console.error('Failed to load initial state', e);
            AppState.setNote({ id: null, title: '', blocks: [] });
        } finally {
            // Первый заход — один раз показываем обзорный тур.
            let seen = true;
            try { seen = localStorage.getItem('dialectics_onboarding_seen') === '1'; } catch {}
            if (!seen) setTimeout(() => OnboardingTour.start(), 700);
        }
    }
}

// Start app
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
window.app = App;
