import AppState from './AppState.js';
import NotesAPI from './api.js';
import { ALGORITHM_STEPS } from './BlockConstants.js';
import GlobalLoader from './GlobalLoader.js';

import { t } from '../i18n.js';
class AIController {
    static init() {
        console.log('AIController Initialized');
    }

    static buildStateForAI() {
        const blocks = AppState.currentNote.blocks;
        const anchorBlock = blocks.find(b => b.role === 'anchor');
        // После генерации тело якоря — это вывод, а не исходный вопрос; исходный
        // запрос сохраняём в sourceGoal и берём цель отсюда при перегенерации.
        const target_goal = anchorBlock
            ? (anchorBlock.sourceGoal || (anchorBlock.html || '').replace(/<[^>]+>/g, '').trim())
            : AppState.currentNote.title;
        const steps = {};
        for (let i = 1; i <= 5; i++) {
            const stepBlocks = blocks.filter(b => b.role === `step${i}` || (b.role && b.role.startsWith(`step${i}.`)));
            const content = stepBlocks.map(b => (b.html || '').replace(/<[^>]+>/g, '').trim()).join('\n\n');
            const mainStepBlock = stepBlocks.find(b => b.role === `step${i}`);
            
            steps[`step${i}`] = {
                content: content,
                status: mainStepBlock ? mainStepBlock.status : 'empty',
                title: mainStepBlock ? mainStepBlock.title : `${t('step_word')} ${i}`
            };
        }
        return { target_goal, steps };
    }

    static contentToHtml(text) {
        if (!text) return '';
        // Если доступен marked — рендерим полноценный markdown
        if (typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined') {
            // Уводим формулы из-под markdown-парсера: marked превращает \[ в [,
            // \( в (, и портит _ ^ внутри $…$. Прячем, парсим, возвращаем.
            // display=true (отдельная строка) вернём как рамку .math-callout —
            // тогда у формулы появляется рамка и кнопка «🔬 разобрать».
            const math = [];
            const stash = (display) => (m) => `@@MATH${math.push({ raw: m, display }) - 1}@@`;
            const guarded = text
                .replace(/\$\$[\s\S]+?\$\$/g, stash(true))
                .replace(/\\\[[\s\S]+?\\\]/g, stash(true))
                .replace(/\\\([\s\S]+?\\\)/g, stash(false))
                .replace(/\$[^$\n]+?\$/g, stash(false));
            let html = DOMPurify.sanitize(marked.parse(guarded));
            const escAttr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
            const escHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            html = html.replace(/@@MATH(\d+)@@/g, (_, i) => {
                const it = math[+i];
                if (!it) return '';
                if (!it.display) return it.raw;
                const tex = it.raw.replace(/^\$\$|\$\$$/g, '').replace(/^\\\[|\\\]$/g, '').trim();
                return `<div class="math-callout"><div class="math-content"><p><span class="math-inline" formula="${escAttr(tex)}">${escHtml(tex)}</span></p></div></div>`;
            });
            // <p> вокруг одинокой рамки — невалидная вложенность, разворачиваем.
            html = html.replace(/<p>\s*(<div class="math-callout">[\s\S]*?<\/div>)\s*<\/p>/g, '$1');
            return html;
        }
        // Иначе (marked/DOMPurify не загрузились): экранируем — это может быть
        // текст модели с угловыми скобками, нельзя вставлять сырым.
        const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return text
            .split(/\n\n+/)
            .map(para => para.trim())
            .filter(Boolean)
            .map(para => `<p>${esc(para).replace(/\n/g, '<br>')}</p>`)
            .join('');
    }

    static processUpdatedSteps(updatedSteps, onRenderAll) {
        if (!updatedSteps) return;
        
        let hasChanges = false;
        
        // Apply invalidations
        Object.keys(updatedSteps).forEach(stepKey => {
            const stepData = updatedSteps[stepKey];
            if (stepData.status === 'invalidated') {
                const existingIndex = AppState.currentNote.blocks.findIndex(b => b.role === stepKey);
                if (existingIndex !== -1) {
                    AppState.currentNote.blocks.splice(existingIndex, 1);
                    hasChanges = true;
                }
            } else if (stepData.content) {
                const htmlContent = this.contentToHtml(stepData.content);
                // Add or update block
                const existingBlock = AppState.currentNote.blocks.find(b => b.role === stepKey);
                if (existingBlock) {
                    existingBlock.html = htmlContent;
                    existingBlock.status = stepData.status || 'ready';
                    if (stepData.title) existingBlock.title = stepData.title;
                } else {
                    const [baseRole, subIndex] = stepKey.split('.');
                    const stepObj = ALGORITHM_STEPS.find(s => s.role === baseRole) || {};
                    // "step1.2" -> "Простейший процесс (2)" — чтобы несколько
                    // процессов одного шага визуально различались.
                    const baseTitle = stepData.title || stepObj.title || stepKey;
                    const title = subIndex ? `${baseTitle} (${subIndex})` : baseTitle;
                    const newBlock = {
                        id: 'block-' + Math.random().toString(36).substr(2, 9),
                        side: stepObj.side || 'center',
                        role: stepKey,
                        title,
                        html: htmlContent,
                        status: stepData.status || 'ready',
                        isDraft: false
                    };
                    AppState.addBlock(newBlock);
                }
                AppState.dismissHint(stepKey);
                hasChanges = true;
            }
        });
        
        if (hasChanges && onRenderAll) {
            onRenderAll();
        }
    }

    /**
     * Заголовки-суть к шагам. Приходят событием { "1": "…", "2.1": "…", … }
     * после генерации. Кладём в block.title (в блоке — h3), надпись роли над
     * блоком остаётся канонической. По ним читается схема при сворачивании.
     */
    static applyTitles(titles, onRenderAll) {
        if (!titles || typeof titles !== 'object') return;
        let changed = false;
        AppState.currentNote.blocks.forEach(b => {
            if (!b.role || !b.role.startsWith('step')) return;
            const key = b.role.slice(4); // "step2.1" -> "2.1"
            const title = (titles[key] || '').trim();
            if (title && b.title !== title) {
                b.title = title;
                AppState.updateBlock(b.id, { title });
                changed = true;
            }
        });
        if (changed && onRenderAll) onRenderAll();
    }

    /**
     * Имя конспекта + итоговый вывод для блока-якоря. Приходит событием
     * { note_title, anchor_title, anchor_summary } после генерации.
     * - note_title применяем только если автор сам не задал название;
     * - блок-якорь («Что вам нужно понять?») превращаем в вывод
     *   («Теперь вы поняли»): заголовок = anchor_title, тело = anchor_summary.
     */
    static applyNoteMeta(meta, onRenderAll) {
        if (!meta || typeof meta !== 'object') return;
        let changed = false;

        // «Не задано автором» = пусто / плейсхолдер / дефолтное имя нового конспекта.
        const curTitle = (AppState.currentNote.title || '').trim();
        const isDefaultTitle = !curTitle
            || curTitle === t('placeholder_title')
            || curTitle === t('menu_new_note')
            || curTitle === t('untitled');
        if (meta.note_title && isDefaultTitle) {
            AppState.currentNote.title = meta.note_title.trim();
            const input = document.getElementById('note-title');
            if (input) input.value = AppState.currentNote.title;
            AppState.markDirty();
            changed = true;
        }

        const anchor = AppState.currentNote.blocks.find(b => b.role === 'anchor');
        if (anchor && meta.anchor_summary) {
            const patch = {
                html: this.contentToHtml(meta.anchor_summary),
                anchorResolved: true,
            };
            // Сохранить исходный вопрос до перезаписи тела выводом.
            if (!anchor.sourceGoal) {
                patch.sourceGoal = (anchor.html || '').replace(/<[^>]+>/g, '').trim();
            }
            if (meta.anchor_title) patch.title = meta.anchor_title.trim();
            AppState.updateBlock(anchor.id, patch);
            changed = true;
        }

        if (changed && onRenderAll) onRenderAll();
    }

    /**
     * Отчёт о качестве прогона генерации. Приходит событием { report } в конце.
     * Если что-то просело (упали на резервного провайдера, судья не подтвердил,
     * блоки короткие/пропали) — показываем баннер, чтобы пользователь понимал:
     * это не ошибка метода, а нагрузка на ИИ, и стоит пересобрать.
     */
    static applyReport(report, onRenderAll) {
        AppState.currentNote.genReport = report || null;
        const host = document.getElementById('blocks-container');
        if (!host) return;
        const existing = document.getElementById('gen-degraded-banner');
        if (existing) existing.remove();
        if (!report || !report.degraded) return;

        const r = report.reasons || [];
        let key = 'gen_degraded_generic';
        if (r.includes('missing_blocks') || r.includes('truncated_blocks')) key = 'gen_degraded_truncated';
        else if (r.includes('judge_gave_up')) key = 'gen_degraded_judge';
        else if (r.includes('fallback_provider')) key = 'gen_degraded_fallback';

        const banner = document.createElement('div');
        banner.id = 'gen-degraded-banner';
        banner.className = 'gen-degraded-banner';
        banner.innerHTML = `
            <span class="gen-degraded-text">⚠️ ${t(key)}</span>
            <span class="gen-degraded-actions">
                <button class="gen-degraded-retry">${t('gen_degraded_retry_btn')}</button>
                <button class="gen-degraded-close" title="${t('tt_close') || ''}">✕</button>
            </span>`;
        host.prepend(banner);
        banner.querySelector('.gen-degraded-close').addEventListener('click', () => banner.remove());
        banner.querySelector('.gen-degraded-retry').addEventListener('click', async () => {
            banner.remove();
            try { await this.generateFull(onRenderAll); } catch (e) { console.error(e); }
        });
    }

    /**
     * Вердикт оппонента-этапа-1: тема невыводима диалектически (конвенция /
     * факт / определение / классификация / причинный механизм без
     * противоположного процесса). Вместо конспекта рисуем карточку: тип,
     * почему, и обычный краткий ответ на вопрос.
     */
    static applyNotApplicable(v, onRenderAll) {
        if (!v) return;
        AppState.currentNote.notApplicable = v;
        // Сначала перерисовать блоки (якорь), потом вставить карточку — иначе
        // renderAll внутри onRenderAll затрёт её.
        if (onRenderAll) onRenderAll();
        const host = document.getElementById('blocks-container');
        if (!host) return;
        document.getElementById('gen-degraded-banner')?.remove();
        document.getElementById('not-applicable-card')?.remove();
        const esc = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const TYPE_KEY = {
            'конвенция': 'na_type_convention',
            'произвольный факт': 'na_type_fact',
            'определение': 'na_type_definition',
            'классификация': 'na_type_classification',
            'механизм без противоположного': 'na_type_mechanism',
        };
        const typeLabel = TYPE_KEY[v.type] ? t(TYPE_KEY[v.type]) : (v.type || '');
        const card = document.createElement('div');
        card.id = 'not-applicable-card';
        card.className = 'not-applicable-card';
        card.innerHTML = `
            <div class="na-head">🚫 ${t('na_title')}</div>
            <div class="na-type">${esc(typeLabel)}</div>
            ${v.reason ? `<p class="na-reason">${esc(v.reason)}</p>` : ''}
            ${v.plain ? `<div class="na-plain"><span class="na-plain-label">${t('na_plain_label')}</span>${esc(v.plain)}</div>` : ''}
        `;
        host.prepend(card);
    }

    static async generateFull(onRenderAll) {
        GlobalLoader.show(t('ed_ai_analyzing'));
        try {
            const state = this.buildStateForAI();
            let received = 0;
            let notApplicable = false;
            await NotesAPI.stream(
                '/ai/dialectics/conspectus/generate-full/stream',
                { action: 'generate_full', context_state: state },
                null,
                (ev) => {
                    if (ev.step && ev.content) {
                        received++;
                        // Каждый шаг рисуем сразу, как только он пришёл.
                        this.processUpdatedSteps(
                            { [ev.step]: { content: ev.content, status: 'ready' } },
                            onRenderAll
                        );
                    } else if (ev.not_applicable) {
                        notApplicable = true;
                        this.applyNotApplicable(ev.not_applicable, onRenderAll);
                    } else if (ev.titles) {
                        this.applyTitles(ev.titles, onRenderAll);
                    } else if (ev.note_meta) {
                        this.applyNoteMeta(ev.note_meta, onRenderAll);
                    } else if (ev.report) {
                        this.applyReport(ev.report, onRenderAll);
                    } else if (ev.status) {
                        // Долгая операция (судья, повторная попытка) — держим пользователя в курсе.
                        GlobalLoader.show(ev.status);
                    }
                }
            );
            if (!received && !notApplicable) throw new Error(t('ai_no_steps'));
        } catch (e) {
            console.error("AI Generate Full Error:", e);
            throw e; // Let the caller handle UI feedback (e.g. toasts)
        } finally {
            GlobalLoader.hide();
        }
    }

    /**
     * Режим ИИ: пользователь задал вопрос/уточнение к блоку `pinnedStep`.
     * Этот блок фиксируется, остальные (кроме anchor) перегенерируются согласованно.
     */
    static async regenerateWithQuestion(pinnedStep, question, onRenderAll) {
        GlobalLoader.show(t('ed_ai_analyzing'));
        try {
            const state = this.buildStateForAI();
            let received = 0;
            await NotesAPI.stream(
                '/ai/dialectics/conspectus/generate-full/stream',
                {
                    action: 'generate_full',
                    context_state: state,
                    pinned_step: String(pinnedStep),
                    question: question || ''
                },
                null,
                (ev) => {
                    if (ev.step && ev.content) {
                        received++;
                        this.processUpdatedSteps(
                            { [ev.step]: { content: ev.content, status: 'ready' } },
                            onRenderAll
                        );
                    } else if (ev.titles) {
                        this.applyTitles(ev.titles, onRenderAll);
                    } else if (ev.note_meta) {
                        this.applyNoteMeta(ev.note_meta, onRenderAll);
                    } else if (ev.report) {
                        this.applyReport(ev.report, onRenderAll);
                    } else if (ev.status) {
                        GlobalLoader.show(ev.status);
                    }
                }
            );
            if (!received) throw new Error(t('ai_no_steps'));
        } finally {
            GlobalLoader.hide();
        }
    }

    static async generateStep(stepNumber, onRenderAll) {
        try {
            const state = this.buildStateForAI();
            const res = await NotesAPI.routeConspectus({
                action: 'generate_step',
                context_state: state,
                target_step: stepNumber.toString()
            });
            if (res.action_status === 'success') {
                // Если шаг вернулся несколькими процессами (stepN.k) — сносим
                // старые блоки этого шага, чтобы не остался прежний одиночный.
                const hasDotted = Object.keys(res.updated_steps)
                    .some(k => k.startsWith(`step${stepNumber}.`));
                if (hasDotted) {
                    AppState.currentNote.blocks = AppState.currentNote.blocks.filter(
                        b => b.role !== `step${stepNumber}` &&
                             !(b.role && b.role.startsWith(`step${stepNumber}.`))
                    );
                }
                this.processUpdatedSteps(res.updated_steps, onRenderAll);
            } else {
                throw new Error(res.error_message || 'Unknown error');
            }
        } catch (e) {
            console.error(`AI Generate Step ${stepNumber} Error:`, e);
            throw e;
        }
    }

    static async regenerateCascade(fromStepNumber, onRenderAll) {
        // According to instructions: if step-by-step mode, we just invalidate or generate one.
        // But if full mode, or if user wants to regenerate ALL subsequent steps based on a change:
        // We can just call generate_step sequentially.
        try {
            for (let i = fromStepNumber; i <= 5; i++) {
                await this.generateStep(i, onRenderAll);
            }
        } catch (e) {
            console.error("AI Regenerate Cascade Error:", e);
            throw e;
        }
    }
}

export default AIController;

