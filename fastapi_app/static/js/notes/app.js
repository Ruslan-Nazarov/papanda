import '../runtime.js';
import AppState from './AppState.js';
import BlockDOMRenderer from './BlockDOMRenderer.js';
import NoteController from './NoteController.js';
import BlockDnDManager from './BlockDnDManager.js';
import EditorManager from './EditorManager.js';
import NoteStorageService from './NoteStorageService.js';
import NoteLocation from './NoteLocation.js';
import NotesAPI from './api.js';
import LoadNotesModalService from './LoadNotesModalService.js';
import ConnectionsModalService from './ConnectionsModalService.js';
import NoteExportService from './NoteExportService.js';
import NoteVersionsService from './NoteVersionsService.js';
import FooterModalsService from './FooterModalsService.js';
import CategoryManager from './CategoryManager.js';
import TOCManager from './TOCManager.js';
import SearchManager from './SearchManager.js';
import BlockStickersManager from './BlockStickersManager.js';
import DialogService from './DialogService.js';
import DropdownController from './DropdownController.js';
import ConceptSelectionMenu from './ConceptSelectionMenu.js';
import ModeManager from './ModeManager.js';
import OnboardingTour from './OnboardingTour.js';
import AIDiary from './AIDiary.js';
import AIController from './AIController.js';
import LibraryPublisher from './LibraryPublisher.js';
import RequestDocuments from './RequestDocuments.js';
import MaterialsPanel from './MaterialsPanel.js';
import QuestionsManager from './QuestionsManager.js';
import NoteNoticeManager from './NoteNoticeManager.js';
import MathSymbolController from './MathSymbolController.js';
import { showToast } from './ToastService.js';
import { t, switchLanguage } from '../i18n.js';

class App {
    static init() {
        if (this.initialized) return;
        this.initialized = true;
        AIDiary.init();
        // Initialize managers
        BlockDnDManager.init();
        EditorManager.init();
        MathSymbolController.init();
        NoteVersionsService.init();
        CategoryManager.init();
        TOCManager.init();
        SearchManager.init();
        BlockStickersManager.init();
        NoteController.init();
        DropdownController.init();
        ConceptSelectionMenu.init();
        ModeManager.init();

        // Setup UI bindings & listeners
        this.setupBindings();
        LibraryPublisher.init();
        RequestDocuments.init(() => BlockDOMRenderer.renderAll());
        MaterialsPanel.init();
        QuestionsManager.init();
        NoteNoticeManager.init();
        this.setupCopyHandler();
        
        // Load initial note state
        this.loadInitialState();
    }

    static showModal(title, contentHTML, {className = ''} = {}) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        
        const dialog = document.createElement('div');
        dialog.className = `modal-dialog ${className}`.trim();
        
        dialog.innerHTML = `
            <div class="modal-dialog-header">
                <h2>${title}</h2>
                <button class="icon-btn btn-close-modal" type="button" aria-label="${t('close')}"><i class="ph ph-x" aria-hidden="true"></i></button>
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

            if (container.querySelector('.katex, .math-callout, .math-inline, .table-fold')) {
                container.querySelectorAll('.math-expand-button, .table-fold-toggle, .table-fold-all').forEach(el => el.remove());
                container.querySelectorAll('.math-expandable, .table-fold, .table-fold-body').forEach(el => el.replaceWith(...el.childNodes));
                container.querySelectorAll('.katex').forEach(katexEl => {
                    const annotation = katexEl.querySelector('annotation[encoding="application/x-tex"]');
                    let formula;
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
        document.getElementById('btn-ai-diary')?.addEventListener('click', () => AIDiary.open());
        document.getElementById('menu-item-ai-diary')?.addEventListener('click', () => {
            DropdownController.closeAll(); AIDiary.open();
        });
        document.getElementById('menu-item-ai-full')?.addEventListener('click', async () => {
            DropdownController.closeAll();
            try { await AIController.generateFull(() => BlockDOMRenderer.renderAll()); }
            catch (error) { const {showToast} = await import('./ToastService.js'); showToast(error.message, 'error'); }
        });
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

        // --- 3. Main Menu Actions ---
        document.getElementById('menu-item-open-note')?.addEventListener('click', async () => {
            DropdownController.closeAll();
            LoadNotesModalService.show(this);
        });

        const lastNoteButton = document.getElementById('menu-item-last-note');
        const refreshLastNoteButton = () => {
            if (lastNoteButton) {
                const lastId = NoteLocation.lastOpenedId();
                lastNoteButton.disabled = !lastId || lastId === String(AppState.currentNote.id);
            }
        };
        document.getElementById('btn-main-menu')?.addEventListener('click', refreshLastNoteButton);
        refreshLastNoteButton();
        lastNoteButton?.addEventListener('click', async () => {
            DropdownController.closeAll();
            const lastId = NoteLocation.lastOpenedId();
            if (!lastId || lastId === String(AppState.currentNote.id)) return;
            try {
                await NoteStorageService.openNote(lastId);
            } catch (error) {
                if (error.status === 404 && NoteLocation.lastOpenedId() === lastId) {
                    NoteLocation.forgetLastOpened();
                    refreshLastNoteButton();
                }
                showToast(t('note_load_failed'), 'error');
            }
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
            try {
                await NoteStorageService.createNewNote();
            } catch {
                await DialogService.alert(t('error_word'), t('error_saving'));
            }
        };
        document.getElementById('menu-item-new-note')?.addEventListener('click', startNewConspect);
        document.getElementById('btn-new-conspect')?.addEventListener('click', startNewConspect);

        document.getElementById('menu-item-trash')?.addEventListener('click', async () => {
            DropdownController.closeAll();
            LoadNotesModalService.show(this, 'trash');
        });

        document.getElementById('btn-delete-current')?.addEventListener('click', async () => {
            const noteId = AppState.currentNote.id;
            if (!noteId) return;
            const confirmed = await DialogService.confirm({
                title: t('to_trash'),
                message: `${t('confirm_to_trash_msg')} "${AppState.currentNote.title}"`,
                isDestructive: true,
                confirmText: t('move_word')
            });
            if (confirmed) {
                try {
                    if (AppState.currentNote.id !== noteId) return;
                    if (AppState.isDirty) await NoteStorageService.saveCurrentNote();
                    if (AppState.currentNote.id !== noteId) return;
                    await NotesAPI.deleteNote(noteId);
                    if (AppState.currentNote.id === noteId) {
                        if (NoteLocation.lastOpenedId() === String(noteId)) NoteLocation.forgetLastOpened();
                        await NoteStorageService.createNewNote({preserveChanges: false});
                    }
                } catch (error) {
                    await DialogService.alert(t('error_word'), error.status === 409
                        ? t('version_material_delete_blocked') : t('trash_move_failed'));
                }
            }
        });

        document.getElementById('menu-item-copy-text')?.addEventListener('click', () => {
            DropdownController.closeAll();
            NoteExportService.copyText();
        });

        document.getElementById('menu-item-export-txt')?.addEventListener('click', () => {
            DropdownController.closeAll();
            NoteExportService.exportToTxt();
        });

        document.getElementById('menu-item-export-md')?.addEventListener('click', () => {
            DropdownController.closeAll();
            NoteExportService.exportToMarkdown();
        });

        document.getElementById('menu-item-export-md-full')?.addEventListener('click', () => {
            DropdownController.closeAll();
            NoteExportService.exportFullMarkdown();
        });

        document.getElementById('menu-item-export-pdf')?.addEventListener('click', () => {
            DropdownController.closeAll();
            NoteExportService.exportToPDF();
        });

        document.getElementById('menu-item-share')?.addEventListener('click', async () => {
            DropdownController.closeAll();
            const { showToast } = await import('./ToastService.js');
            try {
                const saved = await NoteStorageService.saveCurrentNote();
                if (!saved.id) { showToast(t('share_need_content'), 'error'); return; }
                const path = saved.library_slug
                    ? '/?' + new URLSearchParams({conspect: saved.library_slug, lang: document.documentElement.lang})
                    : (await NotesAPI.request(`/dialectics/${saved.id}/share`, 'POST')).path;
                const url = window.location.origin + path;
                App.showModal(t('share_title'), `
                    <p style="margin:0 0 10px; color:#475569;">${t('share_hint')}</p>
                    <div style="display:flex; gap:8px;">
                        <input type="text" readonly value="${url}" id="share-url-input"
                               style="flex:1; padding:9px 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:0.9rem;">
                        <button class="action-btn primary" id="share-copy-btn">${t('share_copy')}</button>
                    </div>`);
                const inp = document.getElementById('share-url-input');
                inp?.select();
                document.getElementById('share-copy-btn')?.addEventListener('click', async () => {
                    try { await navigator.clipboard.writeText(url); showToast(t('share_copied')); }
                    catch { inp?.select(); document.execCommand('copy'); showToast(t('share_copied')); }
                });
            } catch (e) {
                console.error('Share failed', e);
                showToast(e.message || t('toast_gen_err'), 'error');
            }
        });

        // --- 4. Mode Toggles ---
        const toggleDialectics = document.getElementById('toggle-dialectics');
        const toggleTwoColumn = document.getElementById('toggle-two-column');
        const toggleKeepTitles = document.getElementById('toggle-keep-titles');
        const toggleHideLeft = document.getElementById('toggle-hide-left');
        const collapsedLeftNotice = document.getElementById('left-column-collapsed-notice');
        const cont = document.getElementById('blocks-container');
        const setLeftColumnCollapsed = (collapsed) => {
            toggleHideLeft.checked = collapsed;
            cont.classList.toggle('hide-left-column', collapsed);
            collapsedLeftNotice.hidden = !collapsed;
        };
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
                    setLeftColumnCollapsed(false);
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
                setLeftColumnCollapsed(e.target.checked);
                if (e.target.checked && toggleTwoColumn) {
                    toggleTwoColumn.checked = true;
                    cont.classList.remove('single-column-mode');
                }
            });
        }

        document.getElementById('btn-restore-left')?.addEventListener('click', () => setLeftColumnCollapsed(false));

        // --- 5. Internal Links Handler ---
        document.addEventListener('mouseover', (e) => {
            const link = e.target.closest('a[href^="internal://"]');
            if (link) link.setAttribute('data-link-hint', t('internal_link_hint'));
        });
        document.addEventListener('focusin', (e) => {
            const link = e.target.closest('a[href^="internal://"]');
            if (link) link.setAttribute('data-link-hint', t('internal_link_hint'));
        });
        document.addEventListener('click', async (e) => {
            const link = e.target.closest('a[href^="internal://"]');
            if (link) {
                if (link.closest('.tiptap[contenteditable="true"]')) return;
                e.preventDefault();
                let url = link.getAttribute('href');
                const multiple = link.getAttribute('data-internal-links');
                if (multiple) {
                    try {
                        const targets = JSON.parse(multiple).filter(item => item?.url?.startsWith('internal://note/'));
                        if (targets.length > 1) url = await DialogService.chooseInternalDestination(targets);
                    } catch { /* Fall back to the primary link. */ }
                }
                if (!url) return;
                const match = url.match(/^internal:\/\/note\/([a-zA-Z0-9_-]+)(?:\/block\/([a-zA-Z0-9_-]+))?/);
                if (match) {
                    const noteId = match[1];
                    const blockId = match[2];
                    
                    if (String(AppState.currentNote.id) !== noteId) {
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
                                    const blockEl = document.getElementById(blockId);
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
                        const blockEl = document.getElementById(blockId);
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
                    const saved = await NoteController.saveCurrentNote();
                    
                    if (saved.id) {
                        const now = new Date();
                        const dateStr = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                        await NotesAPI.createCheckpoint(
                            saved.id,
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
                AppState.updateNote({status: newStatus});
                this.updateSaveStatusUI();

                const { showToast } = await import('./ToastService.js');
                const isReady = (newStatus === 'ready');

                try {
                    await NoteStorageService.saveCurrentNote();
                } catch (e) {
                    showToast(e.status === 409 ? t('save_conflict_title') : t('error_saving'), 'error');
                    return;
                }

                showToast(isReady ? t('status_note_ready') : t('status_note_draft'));
            });
        }

        const noteTitleInput = document.getElementById('note-title');
        if (noteTitleInput) {
            noteTitleInput.addEventListener('input', (e) => {
                AppState.updateNote({title: e.target.value});
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
        document.addEventListener('noteOpened', () => {
            const languages = AppState.currentNote.available_languages || [];
            document.querySelectorAll('[data-lang]').forEach(button => {
                button.hidden = languages.length > 0 && !languages.includes(button.dataset.lang);
            });
            // Убираем плашки предыдущего конспекта (просадка генерации / тема невыводима).
            document.getElementById('not-applicable-card')?.remove();
            document.getElementById('gen-degraded-banner')?.remove();
            const titleInput = document.getElementById('note-title');
            if (titleInput) titleInput.value = AppState.currentNote.title || '';
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
        document.addEventListener('noteSaved', () => {
            this.updateSaveStatusUI();
            this.updateSaveTime();
        });

        // --- 11. Language Switcher ---
        const langButtons = document.querySelectorAll('[data-lang]');
        langButtons.forEach(btn => {
            btn.addEventListener('click', async () => {
                const lang = btn.dataset.lang;
                if (lang) {
                    if (AppState.isDirty) await NoteStorageService.saveCurrentNote();
                    switchLanguage(lang);
                }
            });
        });
    }

    static updateSaveStatusUI() {
        const btnSave = document.getElementById('btn-save');
        const btnDelete = document.getElementById('btn-delete-current');
        const dot = document.getElementById('save-status-dot');

        if (btnSave) {
            btnSave.classList.toggle('is-dirty', AppState.isDirty);
        }
        if (btnDelete) btnDelete.disabled = !AppState.currentNote.id;

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
            status: 'in_progress',
            is_pinned: false
        };
        AppState.addBlock(block, index);
        BlockDOMRenderer.renderAll();
    }

    static async loadInitialState() {
        try {
            const librarySlug = NoteLocation.initialLibrarySlug();
            if (librarySlug) {
                const note = await NotesAPI.request(`/dialectics/library/${encodeURIComponent(librarySlug)}/open`);
                await NoteStorageService.loadNote(note.id);
                document.getElementById('public-conspect')?.remove();
                document.body.classList.remove('public-loading');
                return;
            }
            const requestedId = NoteLocation.initialId();
            if (requestedId) {
                try {
                    const note = await NotesAPI.getNote(requestedId);
                    if (note && !note.is_deleted) {
                        await NoteStorageService.loadNote(note.id);
                        return;
                    }
                } catch (e) {
                    // A transient load failure must not silently become a new note.
                    if (e.status !== 404) throw e;
                    if (NoteLocation.lastOpenedId() === String(requestedId)) NoteLocation.forgetLastOpened();
                    NoteLocation.clearURL();
                }
            }
            AppState.setNote({ id: null, title: '', blocks: [] });
        } catch (e) {
            console.error('Failed to load initial state', e);
            document.documentElement.classList.remove('public-js');
            showToast(t('versions_load_failed'), 'error');
        } finally {
            // Первый заход — один раз показываем обзорный тур.
            let seen = true;
            try { seen = localStorage.getItem('dialectics_onboarding_seen') === '1'; } catch {}
            if (!seen && !NoteLocation.initialLibrarySlug()) setTimeout(() => OnboardingTour.start(), 700);
        }
    }
}

// Start app
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
window.app = App;
