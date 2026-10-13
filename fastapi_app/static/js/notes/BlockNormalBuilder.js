import AppState from './AppState.js';
import AICheckModalService from './AICheckModalService.js';
import { showToast } from './ToastService.js';
import { t } from '../i18n.js';
import BlockMathRenderer from './BlockMathRenderer.js';
import BlockCodeRenderer from './BlockCodeRenderer.js';
import { ALGORITHM_STEPS, ALGORITHM_TEXTS } from './BlockConstants.js';
import BlockColorPicker from './BlockColorPicker.js';
import AIController from './AIController.js';
import HtmlSafety from './HtmlSafety.js';
import BlockStickersManager from './BlockStickersManager.js';
import DictModalService from './DictModalService.js';

class BlockNormalBuilder {
    static activeAuthorHelp = null;
    static activeRoleHelp = null;

    static setupHiddenPhrases(container) {
        if (!container) return;
        const phrases = container.querySelectorAll('span[data-type="hidden-phrase"], .hidden-phrase-mark');
        phrases.forEach(phrase => {
            const hint = phrase.getAttribute('data-hint') || '';
            
            if (!phrase.querySelector('.hp-arrow')) {
                const arrow = document.createElement('span');
                arrow.className = 'hp-arrow';
                arrow.textContent = phrase.classList.contains('is-expanded') ? ' ▴' : ' ▾';
                phrase.appendChild(arrow);
            }
            if (hint) {
                const content = phrase.querySelector('.hp-content') || document.createElement('span');
                content.className = 'hp-content';
                content.textContent = ` 👁 ${hint}`;
                phrase.appendChild(content);
            }

            phrase.onclick = (e) => {
                e.stopPropagation();
                const isExpanded = phrase.classList.toggle('is-expanded');
                const arrow = phrase.querySelector('.hp-arrow');
                if (arrow) arrow.textContent = isExpanded ? ' ▴' : ' ▾';
            };
        });
    }

    static openColorPicker(block, buttonEl, div) {
        BlockColorPicker.open(block, buttonEl, div);
    }

    static build(block, onRenderAll) {
        const div = document.createElement('div');
        const baseRole = typeof block.role === 'string' ? block.role.split('.')[0] : block.role;
        const author = ['ai', 'ai_checked', 'ai_edited', 'human'].includes(block.author) ? block.author : '';
        div.className = `dialectics-block block-${block.side || 'left'}`;
        if (block.is_pinned) {
            div.classList.add('pinned-sticky');
        }
        if (block.border_color && block.role !== 'section') {
            BlockColorPicker.applyColor(div, block.border_color);
        }
        div.dataset.id = block.id;
        div.id = block.id;
        // ВАЖНО: не делаем весь блок draggable — атрибут draggable="true" в Chromium
        // отключает выделение текста внутри (user-select: none). Перетаскивание
        // навешиваем только на «ручку» .drag-handle ниже.
        div.draggable = false;

        if (block.role === 'section') {
            div.className = 'dialectics-block block-center block-section';
            if (block.border_color) BlockColorPicker.applyColor(div, block.border_color);
            div.innerHTML = `
                <div class="block-header section-header">
                    <span class="drag-handle" title="${t('tt_drag')}">⠿</span>
                    <span class="section-label">${t('section_word')} <span class="section-number"></span></span>
                    <h2 class="block-title" contenteditable="true"></h2>
                </div>
                <div class="block-actions">
                    <button class="block-action-btn btn-color manual-only" type="button" title="${t('tt_frame_color')}" aria-label="${t('tt_frame_color')}">🎨</button>
                    <button class="block-action-btn btn-delete" title="${t('tt_delete')}">🗑</button>
                </div>
            `;
        } else {
            // Роль может быть под-шагом ("step2.1", "step2.2" — несколько
            // развивающих процессов); ярлык над блоком берём по базовому шагу.
            const stepObj = ALGORITHM_STEPS.find(s => s.role === baseRole);
            // Якорь после генерации: «Что вам нужно понять?» → «Теперь вы поняли».
            const roleLabelText = (baseRole === 'anchor' && block.anchorResolved)
                ? t('anchor_resolved_label')
                : (stepObj ? stepObj.title : '');
            const roleHelpText = stepObj && baseRole !== 'anchor' ? ALGORITHM_TEXTS[baseRole] : '';
            const safeRoleLabel = HtmlSafety.escape(roleLabelText);
            const roleLabelHTML = roleLabelText ? `<div class="block-role-label">
                <span>${safeRoleLabel}</span>
                ${roleHelpText ? `<button class="block-role-help-button" type="button" aria-label="${HtmlSafety.escape(t('role_help_open'))}: ${safeRoleLabel}" aria-expanded="false" title="${HtmlSafety.escape(t('role_help_open'))}"><span aria-hidden="true">i</span></button>` : ''}
            </div>${roleHelpText ? `<div class="block-role-explainer" role="note" hidden>
                        <button class="block-role-help-close" type="button" aria-label="${t('close')}">×</button>
                        <strong>${safeRoleLabel}</strong>
                        <div class="block-role-explainer-text">${HtmlSafety.rich(roleHelpText)}</div>
                    </div>` : ''}` : '';

            div.innerHTML = `
                ${roleLabelHTML}
                <div class="block-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <div class="block-header-left">
                        <span class="drag-handle" title="${t('tt_drag')}">⠿</span>
                        <span class="block-number"></span>
                        <div class="block-status-dot"></div>
                        <button class="btn-collapse-toggle" title="${t('tt_collapse')}">${block.collapsed ? '▶' : '▼'}</button>
                        <h3 class="block-title" contenteditable="true"></h3>
                    </div>
                    <div class="block-header-right" style="display: flex; align-items: center; gap: 4px;">
                        <button class="btn-autofill-ai ai-block-button ai-block-icon" type="button" aria-label="${t('ai_generate_step')}" data-tooltip="${t('ai_generate_step')}"><span aria-hidden="true">✦</span></button>
                        <button class="btn-pin-toggle manual-only ${block.is_pinned ? 'active' : ''}" title="${t('tt_pin')}">📌</button>
                    </div>
                </div>
                ${block.tags ? `
                <div class="block-tags" style="padding: 0 16px 8px 46px; display: flex; flex-wrap: wrap; gap: 6px;">
                </div>
                ` : ''}
                <div class="block-toolbar-row" style="display: flex; align-items: center; gap: 4px;">
                    <button class="block-action-btn btn-sources manual-only" title="${t('tt_sources')}">ℹ️</button>
                    <button class="block-action-btn btn-dict manual-only" type="button" title="${t('dict_title')}" aria-label="${t('dict_title')}">📖</button>
                    <button class="block-action-btn btn-connections manual-only" type="button" title="${t('tt_block_sources')}">🔗</button>
                    ${(block.rejected_drafts?.length || 0) ? `<button class="block-action-btn btn-draft-archive" type="button" title="${t('ed_archive_title')} (${block.rejected_drafts.length})" aria-label="${t('ed_archive_title')} (${block.rejected_drafts.length})"><i class="ph ph-archive" aria-hidden="true"></i><span class="draft-archive-toolbar-count">${block.rejected_drafts.length}</span></button>` : ''}
                    <button class="block-action-btn btn-sticker manual-only" title="${t('tt_sticker')}" aria-expanded="false">🟨</button>
                    <button class="block-action-btn btn-hide manual-only" title="${t('tt_hide_phrases')}">👁️</button>
                    <div class="manual-only" style="width: 1px; height: 16px; background: #cbd5e1; margin: 0 3px;"></div>
                    <button class="block-action-btn btn-edit" title="${t('tt_edit')}">✏️</button>
                    <button class="block-action-btn btn-clear-format" type="button" title="${t('ed_clear_format')}" aria-label="${t('ed_clear_format')}">🧹</button>
                    <button class="block-action-btn btn-ai-check manual-only" title="${t('tt_ai_check')}">🔬</button>
                    <button class="block-action-btn btn-copy" title="${t('tt_copy')}">📋</button>
                    <button class="block-action-btn btn-color manual-only" title="${t('tt_frame_color')}">🎨</button>
                    <button class="block-action-btn btn-delete" title="${t('tt_delete')}">🗑️</button>
                    <div class="block-author-control" data-author="${author}">
                        <button class="block-author-help-button" type="button" aria-label="${t('block_author_help_title')}" aria-expanded="false" title="${t('block_author_help_title')}"><span aria-hidden="true">i</span></button>
                        <select class="block-author-select" aria-label="${t('block_author_label')}" title="${t('block_author_label')}">
                            <option value="">${t('block_author_unset')}</option>
                            <option value="ai">${t('block_author_ai')}</option>
                            <option value="ai_checked">${t('block_author_ai_checked')}</option>
                            <option value="ai_edited">${t('block_author_ai_edited')}</option>
                            <option value="human">${t('block_author_human')}</option>
                        </select>
                        <div class="block-author-explainer" role="note" aria-label="${t('block_author_help_title')}" hidden>
                            <button class="block-author-help-close" type="button" aria-label="${t('close')}">×</button>
                            <strong class="block-author-explainer-title">${t('block_author_help_title')}</strong>
                            <p>${t('block_author_help_intro')}</p>
                            <dl>
                                <div><dt data-author="ai">${t('block_author_ai')}</dt><dd>${t('block_author_ai_help')}</dd></div>
                                <div><dt data-author="ai_checked">${t('block_author_ai_checked')}</dt><dd>${t('block_author_ai_checked_help')}</dd></div>
                                <div><dt data-author="ai_edited">${t('block_author_ai_edited')}</dt><dd>${t('block_author_ai_edited_help')}</dd></div>
                                <div><dt data-author="human">${t('block_author_human')}</dt><dd>${t('block_author_human_help')}</dd></div>
                            </dl>
                        </div>
                    </div>
                </div>
                <div class="block-content">${HtmlSafety.rich(block.html || `<p>${t('block_text_ph')}</p>`)}</div>
            `;
        }

        // Old automatic anchor titles stay in saved notes; update only their display.
        const oldQuestion = ['Что вам нужно понять?', 'Что вам надо объяснить?',
            'What do you need to explain?', 'Нені түсіндіру керек?'];
        const oldResult = ['Теперь вы поняли', 'Now you understand', 'Енді түсіндіңіз'];
        const displayTitle = baseRole === 'anchor' && oldQuestion.includes(block.title)
            ? t('hint_anchor_title')
            : baseRole === 'anchor' && oldResult.includes(block.title)
                ? t('anchor_resolved_label') : block.title;
        div.querySelector('.block-title').textContent = displayTitle
            || t(block.role === 'section' ? 'section_word' : 'hint_anchor_title');
        const dot = div.querySelector('.block-status-dot');
        if (dot) {
            dot.dataset.status = block.status || 'none';
            dot.title = `${t('block_status')}: ${block.status || 'none'}`;
        }
        const roleHelpButton = div.querySelector('.block-role-help-button');
        if (roleHelpButton) {
            const label = roleHelpButton.closest('.block-role-label');
            const explainer = div.querySelector('.block-role-explainer');
            const onOutside = event => { if (!label.contains(event.target) && !explainer.contains(event.target)) closeRoleHelp(); };
            const placeRoleHelp = () => {
                const anchor = roleHelpButton.getBoundingClientRect();
                const panel = explainer.getBoundingClientRect();
                const margin = 12;
                const below = window.innerHeight - anchor.bottom;
                const above = anchor.top;
                const showAbove = below < panel.height + margin && above > below;
                explainer.style.left = `${Math.max(margin, Math.min(anchor.left, window.innerWidth - panel.width - margin))}px`;
                explainer.style.top = `${showAbove
                    ? Math.max(margin, anchor.top - panel.height - 8)
                    : Math.min(window.innerHeight - panel.height - margin, anchor.bottom + 8)}px`;
            };
            const onEscape = event => {
                if (event.key !== 'Escape') return;
                closeRoleHelp();
                roleHelpButton.focus();
            };
            const closeRoleHelp = () => {
                explainer.hidden = true;
                roleHelpButton.setAttribute('aria-expanded', 'false');
                div.classList.remove('role-help-open');
                document.removeEventListener('pointerdown', onOutside);
                document.removeEventListener('keydown', onEscape);
                window.removeEventListener('resize', placeRoleHelp);
                window.removeEventListener('scroll', closeRoleHelp, true);
                if (this.activeRoleHelp === closeRoleHelp) this.activeRoleHelp = null;
            };
            roleHelpButton.addEventListener('click', () => {
                if (!explainer.hidden) { closeRoleHelp(); return; }
                this.activeRoleHelp?.();
                explainer.hidden = false;
                placeRoleHelp();
                roleHelpButton.setAttribute('aria-expanded', 'true');
                div.classList.add('role-help-open');
                this.activeRoleHelp = closeRoleHelp;
                document.addEventListener('pointerdown', onOutside);
                document.addEventListener('keydown', onEscape);
                window.addEventListener('resize', placeRoleHelp);
                window.addEventListener('scroll', closeRoleHelp, true);
            });
            explainer.querySelector('.block-role-help-close').addEventListener('click', closeRoleHelp);
        }
        const authorSelect = div.querySelector('.block-author-select');
        if (authorSelect) {
            authorSelect.value = author;
            authorSelect.addEventListener('change', () => {
                const selected = authorSelect.value;
                AppState.updateBlock(block.id, {author: selected || null});
                authorSelect.closest('.block-author-control').dataset.author = selected;
                this.activeAuthorHelp?.();
            });
        }
        const helpButton = div.querySelector('.block-author-help-button');
        if (helpButton) {
            const control = helpButton.closest('.block-author-control');
            const explainer = control.querySelector('.block-author-explainer');
            const onOutside = event => { if (!control.contains(event.target)) closeHelp(); };
            const placeHelp = () => {
                explainer.classList.remove('is-above', 'is-floating');
                explainer.style.removeProperty('left');
                explainer.style.removeProperty('top');
                const bounds = explainer.getBoundingClientRect();
                if (bounds.bottom <= window.innerHeight - 12) return;
                const controlBounds = control.getBoundingClientRect();
                if (controlBounds.top >= bounds.height + 20) {
                    explainer.classList.add('is-above');
                    return;
                }
                explainer.classList.add('is-floating');
                explainer.style.left = `${Math.max(12, Math.min(controlBounds.right - bounds.width, window.innerWidth - bounds.width - 12))}px`;
                explainer.style.top = `${Math.max(12, window.innerHeight - bounds.height - 12)}px`;
            };
            const onEscape = event => {
                if (event.key !== 'Escape') return;
                event.preventDefault();
                event.stopPropagation();
                closeHelp();
                helpButton.focus();
            };
            const closeHelp = () => {
                explainer.hidden = true;
                helpButton.setAttribute('aria-expanded', 'false');
                div.classList.remove('author-help-open');
                explainer.classList.remove('is-above', 'is-floating');
                explainer.style.removeProperty('left');
                explainer.style.removeProperty('top');
                document.removeEventListener('pointerdown', onOutside);
                document.removeEventListener('keydown', onEscape, true);
                window.removeEventListener('resize', placeHelp);
                if (this.activeAuthorHelp === closeHelp) this.activeAuthorHelp = null;
            };
            helpButton.addEventListener('click', () => {
                if (!explainer.hidden) { closeHelp(); return; }
                this.activeAuthorHelp?.();
                explainer.hidden = false;
                placeHelp();
                helpButton.setAttribute('aria-expanded', 'true');
                div.classList.add('author-help-open');
                this.activeAuthorHelp = closeHelp;
                document.addEventListener('pointerdown', onOutside);
                document.addEventListener('keydown', onEscape, true);
                window.addEventListener('resize', placeHelp);
            });
            explainer.querySelector('.block-author-help-close').addEventListener('click', closeHelp);
        }
        const tags = div.querySelector('.block-tags');
        if (tags) {
            String(block.tags).split(',').map(tag => tag.trim()).filter(Boolean).forEach(tag => {
                const span = document.createElement('span');
                span.style.cssText = 'background:#e2e8f0;color:#475569;font-size:.75rem;padding:2px 8px;border-radius:12px;font-weight:500';
                span.textContent = `#${tag}`;
                tags.appendChild(span);
            });
        }

        // Перетаскивание блока — только за «ручку».
        const dragHandleEl = div.querySelector('.drag-handle');
        if (dragHandleEl) {
            dragHandleEl.setAttribute('draggable', 'true');
            dragHandleEl.addEventListener('dragstart', (e) => {
                // Тащим сам блок как превью, но инициируем с ручки.
                try { e.dataTransfer.setDragImage(div, 20, 20); } catch (_) {}
            });
        }

        // Setup hidden phrases interactivity inside block content
        this.setupHiddenPhrases(div);

        // Bind delete
        div.querySelector('.btn-delete')?.addEventListener('click', () => {
            AppState.removeBlock(block.id);
            if (onRenderAll) onRenderAll();
        });

        // Bind Pin toggle
        const pinBtn = div.querySelector('.btn-pin-toggle');
        if (pinBtn) {
            pinBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                AppState.updateBlock(block.id, {is_pinned: !block.is_pinned});
                div.classList.toggle('pinned-sticky', block.is_pinned);
                pinBtn.classList.toggle('active', block.is_pinned);
            });
        }

        // Bind Autofill AI
        const btnAutofill = div.querySelector('.btn-autofill-ai');
        if (btnAutofill) {
            btnAutofill.addEventListener('click', async (e) => {
                e.stopPropagation();

                showToast(t('toast_gen_started'));
                
                try {
                    const result = await AIController.generateBlock(block.id, onRenderAll);
                    if (result) showToast(t('toast_gen_ok'));
                } catch (err) {
                    // 429 (дневной лимит демо) и т.п. приходят осмысленным текстом.
                    const msg = (err && err.message && !/^HTTP Error/.test(err.message))
                        ? err.message : t('toast_gen_err');
                    showToast(msg, 'error');
                }
            });
        }


        // Bind Collapse toggle
        const collapseBtn = div.querySelector('.btn-collapse-toggle');
        if (collapseBtn) {
            collapseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                AppState.updateBlock(block.id, {collapsed: !block.collapsed});
                div.classList.toggle('collapsed', block.collapsed);
                collapseBtn.textContent = block.collapsed ? '▶' : '▼';
                const content = div.querySelector('.block-content');
                if (content) content.style.display = block.collapsed ? 'none' : 'block';
            });
        }

        // Bind editor — карандаш всегда открывает редактор (в любом режиме и статусе)
        const btnEdit = div.querySelector('.btn-edit');
        if (btnEdit) {
            btnEdit.addEventListener('click', () => {
                document.dispatchEvent(new CustomEvent('openEditor', { detail: { blockId: block.id, el: div } }));
            });
        }
        div.querySelector('.btn-clear-format')?.addEventListener('click', async () => {
            const current = AppState.getBlock(block.id);
            if (!current?.html) return;
            const { EditorTiptapSetup } = await import('./EditorTiptapSetup.js');
            const html = EditorTiptapSetup.clearBlockHtml(current.html);
            if (html === current.html || AppState.getBlock(block.id) !== current) return;
            AppState.updateBlock(block.id, {html});
            onRenderAll?.();
        });
        div.querySelector('.btn-draft-archive')?.addEventListener('click', () => {
            document.dispatchEvent(new CustomEvent('openEditor', { detail: { blockId: block.id, el: div } }));
            document.querySelector('#modal-container .editor-draft-archive')?.scrollIntoView({block: 'nearest'});
        });

        const blockContent = div.querySelector('.block-content');
        if (blockContent) {
            blockContent.addEventListener('dblclick', () => {
                // Двойной клик выделяет слово под курсором — это не считаем "выделением".
                // Не открываем редактор только если пользователь выделил фразу (есть пробелы).
                const sel = (window.getSelection().toString() || '').trim();
                if (sel.includes(' ') || sel.includes('\n')) return;
                window.getSelection().removeAllRanges();
                document.dispatchEvent(new CustomEvent('openEditor', { detail: { blockId: block.id, el: div } }));
            });
        }

        // Bind title
        const titleEl = div.querySelector('.block-title');
        if (titleEl) {
            titleEl.addEventListener('blur', () => {
                AppState.updateBlock(block.id, { title: titleEl.textContent });
            });
        }

        // Bind status dot
        const statusEl = div.querySelector('.block-status-dot');
        if (statusEl) {
            statusEl.addEventListener('click', (e) => {
                e.stopPropagation();
                const statuses = ['none', 'ready'];
                const next = statuses[(statuses.indexOf(block.status || 'none') + 1) % 2];
                AppState.updateBlock(block.id, {status: next});
                statusEl.dataset.status = next;
                if (onRenderAll) onRenderAll();
            });
        }

        const btnDict = div.querySelector('.btn-dict');
        if (btnDict) {
            const count = AppState.currentNote?.dictionary?.length || 0;
            btnDict.setAttribute('aria-label', `${t('dict_title')} (${count})`);
            if (count > 0) {
                const badge = document.createElement('span');
                badge.className = 'dict-badge';
                badge.setAttribute('aria-hidden', 'true');
                badge.textContent = String(count);
                btnDict.appendChild(badge);
            }
            btnDict.addEventListener('click', () => DictModalService.show());
        }

        // Bind Step Info (ℹ️)
        const btnSources = div.querySelector('.btn-sources');
        if (btnSources) {
            btnSources.addEventListener('click', async () => {
                const BlockMetaModalService = (await import('./BlockMetaModalService.js')).default;
                BlockMetaModalService.showInfoModal(block.id);
            });
        }

        // Bind Block Sources / Links (🔗)
        const btnConnections = div.querySelector('.btn-connections');
        if (btnConnections) {
            const count = block.sources?.length || 0;
            btnConnections.setAttribute('aria-label', `${t('tt_block_sources')} (${count})`);
            if (count) btnConnections.insertAdjacentHTML('beforeend', `<span class="sources-badge" aria-hidden="true">${count}</span>`);
            btnConnections.addEventListener('click', async () => {
                const BlockMetaModalService = (await import('./BlockMetaModalService.js')).default;
                BlockMetaModalService.showSourcesModal(block.id);
            });
        }

        // Bind Sticker / Color
        const btnSticker = div.querySelector('.btn-sticker');
        if (btnSticker) {
            BlockStickersManager._updateBadge(div, block.stickers?.length || 0);
            btnSticker.addEventListener('click', (e) => {
                e.stopPropagation();
                BlockStickersManager.toggleBlockStickersPanel(block, div);
            });
        }

        // Bind Hide / Eye toggle for hidden phrases (👁️)
        const btnHide = div.querySelector('.btn-hide');
        if (btnHide) {
            btnHide.addEventListener('click', (e) => {
                e.stopPropagation();
                const phrases = div.querySelectorAll('span[data-type="hidden-phrase"], .hidden-phrase-mark');
                if (phrases.length === 0) {
                    showToast(t('toast_no_hidden'));
                    return;
                }
                const anyCollapsed = Array.from(phrases).some(p => !p.classList.contains('is-expanded'));
                phrases.forEach(p => {
                    p.classList.toggle('is-expanded', anyCollapsed);
                    const arrow = p.querySelector('.hp-arrow');
                    if (arrow) arrow.textContent = anyCollapsed ? ' ▴' : ' ▾';
                });
            });
        }


        // Bind AI Check (🔬)
        const btnAiCheck = div.querySelector('.btn-ai-check');
        if (btnAiCheck) {
            btnAiCheck.addEventListener('click', () => {
                AICheckModalService.show(block.id);
            });
        }

        // Bind Copy (📋)
        const btnCopy = div.querySelector('.btn-copy');
        if (btnCopy) {
            btnCopy.addEventListener('click', async (e) => {
                e.stopPropagation();
                const contentEl = div.querySelector('.block-content');
                const titleText = (block.title || '').trim();
                const bodyText = contentEl ? contentEl.innerText.trim() : (block.html || '').replace(/<[^>]+>/g, '').trim();
                const fullText = titleText ? `${titleText}\n\n${bodyText}` : bodyText;
                
                try {
                    await navigator.clipboard.writeText(fullText);
                } catch {
                    const ta = document.createElement('textarea');
                    ta.value = fullText;
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand('copy');
                    document.body.removeChild(ta);
                }
                showToast(t('toast_copied'));
            });
        }

        // Bind Color Picker (🎨)
        const btnColor = div.querySelector('.btn-color');
        if (btnColor) {
            btnColor.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openColorPicker(block, btnColor, div);
            });
        }

        // Preserve existing unfenced code snippets as readable code blocks.
        BlockCodeRenderer.render(div.querySelector('.block-content'));
        // Math rendering
        BlockMathRenderer.renderMath(div);

        if (block.collapsed) {
            div.classList.add('collapsed');
            const content = div.querySelector('.block-content');
            if (content) content.style.display = 'none';
        }

        return div;
    }
}

export default BlockNormalBuilder;
