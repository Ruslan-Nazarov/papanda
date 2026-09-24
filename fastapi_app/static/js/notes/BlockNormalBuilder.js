import AppState from './AppState.js';
import DictModalService from './DictModalService.js';
import AICheckModalService from './AICheckModalService.js';
import { showToast } from './ToastService.js';
import { t } from '../i18n.js';
import BlockMathRenderer from './BlockMathRenderer.js';
import { ALGORITHM_STEPS } from './BlockConstants.js';
import BlockColorPicker from './BlockColorPicker.js';
import AIController from './AIController.js';
import LearningWorkspace from './LearningWorkspace.js';
import ParserWindowsManager from './ParserWindowsManager.js';
import HtmlSafety from './HtmlSafety.js';

class BlockNormalBuilder {
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
            if (hint && !phrase.querySelector('.hp-content')) {
                const content = document.createElement('span');
                content.className = 'hp-content';
                content.textContent = ` 💡 ${hint}`;
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

    /** Кнопка «разобрать формулу» в углу рамки .math-callout при чтении конспекта:
     *  открывает плавающее окно парсера формул с этой формулой и сразу шлёт запрос. */
    static setupFormulaParse(container) {
        if (!container) return;
        container.querySelectorAll('.math-callout').forEach(el => {
            if (el.querySelector('.formula-parse-btn')) return;
            const formula = this._extractFormula(el);
            if (!formula) return;

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'formula-parse-btn';
            btn.contentEditable = 'false';
            btn.title = t('formula_parse_tt');
            btn.setAttribute('aria-label', t('formula_parse_tt'));
            btn.textContent = '🔬';
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                ParserWindowsManager.openWindow('formula', { prefill: formula, autosend: true });
            });
            el.appendChild(btn);
        });
    }

    static _extractFormula(el) {
        const attr = el.getAttribute('formula');
        if (attr && attr.trim()) return attr.trim();
        // после KaTeX-рендера исходный TeX лежит в <annotation>
        const ann = el.querySelector('annotation[encoding="application/x-tex"]');
        if (ann && ann.textContent.trim()) return ann.textContent.trim();
        const content = el.querySelector('.math-content') || el;
        return (content.textContent || '').trim();
    }

    static openColorPicker(block, buttonEl, div) {
        BlockColorPicker.open(block, buttonEl, div);
    }

    static build(block, onRenderAll) {
        const div = document.createElement('div');
        const baseRole = typeof block.role === 'string' ? block.role.split('.')[0] : block.role;
        div.className = `dialectics-block block-${block.side || 'left'}`;
        if (block.is_pinned) {
            div.classList.add('pinned-sticky');
        }
        if (block.border_color) {
            div.style.borderLeftColor = block.border_color;
        }
        div.dataset.id = block.id;
        div.id = block.id;
        // ВАЖНО: не делаем весь блок draggable — атрибут draggable="true" в Chromium
        // отключает выделение текста внутри (user-select: none). Перетаскивание
        // навешиваем только на «ручку» .drag-handle ниже.
        div.draggable = false;

        if (block.role === 'section') {
            div.className = `dialectics-block block-section`;
            div.innerHTML = `
                <div class="block-header" style="justify-content: center; border-bottom: none; background: #e2e8f0;">
                    <span class="drag-handle" title="${t('tt_drag')}">⠿</span>
                    <h2 class="block-title" contenteditable="true" style="font-size: 1.25rem; font-weight: bold; text-align: center; width: 100%; margin: 0;"></h2>
                </div>
                <div class="block-actions">
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
            const roleLabelHTML = roleLabelText ? `<div class="block-role-label" style="position: absolute; top: -24px; left: 12px; font-size: 0.85rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; pointer-events: none; user-select: none;">${roleLabelText}</div>` : '';

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
                        ${(baseRole && baseRole.startsWith('step')) ? '<button class="btn-autofill-ai learning-block-ai" type="button" title="Получить предложение ИИ для этого шага"><span aria-hidden="true">✦</span> Предложить текст</button>' : ''}
                        <button class="btn-pin-toggle manual-only ${block.is_pinned ? 'active' : ''}" title="${t('tt_pin')}">📌</button>
                    </div>
                </div>
                ${block.tags ? `
                <div class="block-tags" style="padding: 0 16px 8px 46px; display: flex; flex-wrap: wrap; gap: 6px;">
                </div>
                ` : ''}
                <div class="block-toolbar-row" style="display: flex; align-items: center; gap: 4px;">
                    <button class="block-action-btn btn-sources manual-only" title="${t('tt_sources')}">ℹ️</button>
                    <button class="block-action-btn btn-connections manual-only" title="${t('tt_block_sources')}" style="position:relative;">
                        🔗${(block.sources && block.sources.length > 0) ? `<span style="position:absolute; top:-4px; right:-6px; background:#3b82f6; color:white; font-size:0.6rem; padding:1px 4px; border-radius:8px; font-weight:bold;">${block.sources.length}</span>` : ''}
                    </button>
                    <button class="block-action-btn btn-dict manual-only" title="${t('tt_dict')}">📖</button>
                    <button class="block-action-btn btn-hint manual-only" title="${t('tt_hacks')}">💡</button>
                    <button class="block-action-btn btn-sticker manual-only" title="${t('tt_sticker')}">🟨</button>
                    <button class="block-action-btn btn-hide manual-only" title="${t('tt_hide_phrases')}">👁️</button>
                    <div class="manual-only" style="width: 1px; height: 16px; background: #cbd5e1; margin: 0 3px;"></div>
                    <button class="block-action-btn btn-edit" title="${t('tt_edit')}">✏️</button>
                    <button class="block-action-btn btn-ai-check manual-only" title="${t('tt_ai_check')}">🔬</button>
                    <button class="block-action-btn btn-copy" title="${t('tt_copy')}">📋</button>
                    <button class="block-action-btn btn-color manual-only" title="${t('tt_frame_color')}">🎨</button>
                    ${(baseRole && baseRole.startsWith('step')) ? '<button class="block-action-btn btn-fork-step" type="button" title="Создать новый вариант от этого шага">⑂</button>' : ''}
                    <button class="block-action-btn btn-delete" title="${t('tt_delete')}">🗑️</button>
                </div>
                <div class="block-content">${HtmlSafety.rich(block.html || `<p>${t('block_text_ph')}</p>`)}</div>
            `;
        }

        div.querySelector('.block-title').textContent = block.title
            || t(block.role === 'section' ? 'section_word' : 'hint_anchor_title');
        const dot = div.querySelector('.block-status-dot');
        if (dot) {
            dot.dataset.status = block.status || 'none';
            dot.title = `${t('block_status')}: ${block.status || 'none'}`;
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
                    await AIController.generateStep(Number(baseRole.slice(4)), onRenderAll);
                    showToast(t('toast_gen_ok'));
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
            btnConnections.addEventListener('click', async () => {
                const BlockMetaModalService = (await import('./BlockMetaModalService.js')).default;
                BlockMetaModalService.showSourcesModal(block.id);
            });
        }

        // Bind Dictionary (📖)
        const btnDict = div.querySelector('.btn-dict');
        if (btnDict) {
            btnDict.addEventListener('click', () => {
                DictModalService.show(block.id);
            });
        }

        // Bind Understanding Hacks (💡)
        const btnHint = div.querySelector('.btn-hint');
        if (btnHint) {
            btnHint.addEventListener('click', async () => {
                const UnderstandingHacksService = (await import('./UnderstandingHacksService.js')).default;
                UnderstandingHacksService.show(block, btnHint);
            });
        }

        // Bind Sticker / Color
        const btnSticker = div.querySelector('.btn-sticker');
        if (btnSticker) {
            btnSticker.addEventListener('click', async () => {
                const BlockStickersManager = (await import('./BlockStickersManager.js')).default;
                BlockStickersManager.openBlockStickersPanel(block, div);
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

        div.querySelector('.btn-fork-step')?.addEventListener('click', event => {
            event.stopPropagation();
            LearningWorkspace.variants(Number(baseRole.slice(4)));
        });

        // Math rendering
        BlockMathRenderer.renderMath(div);
        this.setupFormulaParse(div);

        if (block.collapsed) {
            div.classList.add('collapsed');
            const content = div.querySelector('.block-content');
            if (content) content.style.display = 'none';
        }

        return div;
    }
}

export default BlockNormalBuilder;
