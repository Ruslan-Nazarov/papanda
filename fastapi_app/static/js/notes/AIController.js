import AppState from './AppState.js';
import Lifecycle from './Lifecycle.js';
import NotesAPI from './api.js';
import { ALGORITHM_STEPS } from './BlockConstants.js';
import GlobalLoader from './GlobalLoader.js';
import HtmlSafety from './HtmlSafety.js';
import GenerationChanges from './GenerationChanges.js';
import BlockDOMParser from './BlockDOMParser.js';
import DialogService from './DialogService.js';
import NoteStorageService from './NoteStorageService.js';
import ProposalReview from './ProposalReview.js';
import { showToast } from './ToastService.js';

import { t } from '../i18n.js';
class AIController {
    static _activeRun = null;
    static _initialized = false;

    static init() {
        if (this._initialized) return;
        this._initialized = true;
        this.lifecycle = new Lifecycle();
        this.lifecycle.on(document, 'noteOpened', () => this._activeRun?.controller.abort());
    }

    static dispose() {
        this._activeRun?.controller.abort();
        this.lifecycle?.dispose();
        this._initialized = false;
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
                status: stepBlocks.length ? (stepBlocks.every(b => b.status === 'ready') ? 'ready' : 'in_progress') : 'empty',
                title: mainStepBlock ? mainStepBlock.title : `${t('step_word')} ${i}`
            };
        }
        for (const block of blocks) {
            if (GenerationChanges.base(block.role) && block.role.includes('.')) {
                steps[block.role] = {content: (block.html || '').replace(/<[^>]+>/g, '').trim(),
                    status: block.status, title: block.title || ''};
            }
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
                if (!it.display) return escHtml(it.raw);
                const tex = it.raw.replace(/^\$\$|\$\$$/g, '').replace(/^\\\[|\\\]$/g, '').trim();
                return `<div class="math-callout"><div class="math-content"><p><span class="math-inline" formula="${escAttr(tex)}">${escHtml(tex)}</span></p></div></div>`;
            });
            // <p> вокруг одинокой рамки — невалидная вложенность, разворачиваем.
            html = html.replace(/<p>\s*(<div class="math-callout">[\s\S]*?<\/div>)\s*<\/p>/g, '$1');
            return HtmlSafety.rich(html);
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

    static processUpdatedSteps(updatedSteps, onRenderAll, replaceBases) {
        if (!updatedSteps) return;
        const next = GenerationChanges.build(AppState.currentNote,
            {updated_steps: updatedSteps, replace_bases: replaceBases},
            text => this.contentToHtml(text), ALGORITHM_STEPS);
        if (JSON.stringify(next.blocks) === JSON.stringify(AppState.currentNote.blocks)) return;
        AppState.updateNote({blocks: next.blocks});
        for (const key of Object.keys(updatedSteps)) AppState.dismissHint(key);
        if (onRenderAll) onRenderAll();
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
            AppState.updateNote({title: meta.note_title.trim()});
            const input = document.getElementById('note-title');
            if (input) input.value = AppState.currentNote.title;
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
            if (!anchor.sourceTitle) patch.sourceTitle = anchor.title;
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
        AppState.setViewMetadata({genReport: report || null});
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
        AppState.setViewMetadata({notApplicable: v});
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
        return this._runGeneration({action: 'generate_full'}, onRenderAll);
    }

    static async regenerateWithQuestion(pinnedStep, question, onRenderAll) {
        return this._runGeneration({action: 'generate_full', pinned_step: String(pinnedStep),
            question: question || ''}, onRenderAll);
    }

    static async generateStep(stepNumber, onRenderAll) {
        return this._runGeneration({action: 'generate_step', target_step: String(stepNumber)}, onRenderAll);
    }

    static _unchanged(run) {
        return AppState.currentNote === run.note && AppState.documentEpoch === run.epoch
            && AppState.editRevision === run.editRevision && AppState.currentNote.revision === run.revision;
    }

    static async _offerCopy(run, result) {
        const confirmed = await DialogService.confirm({title: t('gen_conflict_title'),
            message: t('gen_conflict_message'), confirmText: t('save_conflict_copy')});
        if (!confirmed) return;
        await NoteStorageService.saveCurrentNote();
        const current = await NotesAPI.getNote(run.note.id);
        const fork = await NotesAPI.forkVariant(current.id, {revision:current.revision, from_step:1,
            label:`Предложение ИИ · ${new Date().toLocaleString()}`, origin:'ai'});
        const copy = GenerationChanges.build({...fork, blocks:fork.content_json}, result,
            text => this.contentToHtml(text), ALGORITHM_STEPS);
        await NotesAPI.updateNote(fork.id, {revision:fork.revision, title:copy.title, blocks:copy.blocks,
            stickers:fork.stickers || [], category_id:fork.category_id, status:'in_progress'});
        showToast(t('gen_copy_saved'));
    }

    static async _runGeneration(parameters, onRenderAll) {
        this.init();
        this._activeRun?.controller.abort();
        BlockDOMParser.syncDOMToState();
        await NoteStorageService.saveCurrentNote();
        const note = AppState.currentNote;
        const run = {note, snapshot: JSON.parse(JSON.stringify(note)), epoch: AppState.documentEpoch,
            editRevision: AppState.editRevision, revision: note.revision, controller: new AbortController()};
        this._activeRun = run;
        const cancel = () => run.controller.abort();
        GlobalLoader.show(t('ed_ai_analyzing'), cancel);
        try {
            const payload = {...parameters, context_state: this.buildStateForAI(),
                source_revision: run.revision ?? null};
            const result = parameters.action === 'generate_step'
                ? await NotesAPI.routeConspectus(payload, run.controller.signal)
                : await NotesAPI.stream('/ai/dialectics/conspectus/generate-full/stream', payload, null, ev => {
                    if (ev.type === 'status' && this._activeRun === run) {
                        const keys = {planning: 'gen_status_planning', generating: 'ed_ai_analyzing',
                            judging: 'gen_status_judging', repairing: 'gen_status_fix_transition',
                            postprocess: 'gen_status_postprocess'};
                        GlobalLoader.show(t(keys[ev.status.phase] || 'ed_ai_analyzing'), cancel);
                    }
                }, {signal: run.controller.signal, returnTerminal: true});
            if (this._activeRun !== run || run.controller.signal.aborted) return null;
            if (!result || !['completed', 'partial', 'not_applicable'].includes(result.status)) {
                throw new Error(result?.error_message || t('ai_no_steps'));
            }
            BlockDOMParser.syncDOMToState();
            if (result.status === 'not_applicable') {
                if (this._unchanged(run)) this.applyNotApplicable(result.verdict, onRenderAll);
                return result;
            }
            if (!Object.keys(result.updated_steps || {}).length) throw new Error(t('ai_no_steps'));
            if (result.source_revision !== (run.revision ?? null)) throw new Error(t('gen_conflict_title'));
            if (AppState.currentNote !== run.note) return result;
            const full = parameters.action === 'generate_full';
            await NotesAPI.addActivity(note.id, {kind:'ai_proposed', step:full ? null : Number(parameters.target_step),
                detail:result.status, run_id:result.run_id,
                text:Object.entries(result.updated_steps).map(([role,value]) => `${role}: ${value.content}`).join('\n\n').slice(0, 50000)});
            GlobalLoader.hide();
            const choice = await ProposalReview.show(result, full);
            if (choice.decision === 'reject') {
                await NotesAPI.addActivity(note.id, {kind:'ai_rejected', step:full ? null : Number(parameters.target_step),
                    run_id:result.run_id});
                return result;
            }
            BlockDOMParser.syncDOMToState();
            if (this._activeRun !== run || run.controller.signal.aborted) return null;
            const reviewed = {...result, updated_steps: choice.updated_steps};
            if (!this._unchanged(run)) {
                await this._offerCopy(run, reviewed);
                return result;
            }
            if (full) {
                const fork = await NotesAPI.forkVariant(note.id, {revision:run.revision, from_step:1,
                    label:`ИИ · ${new Date().toLocaleString()}`, origin:'ai'});
                const next = GenerationChanges.build({...fork, blocks:fork.content_json}, reviewed,
                    text => this.contentToHtml(text), ALGORITHM_STEPS);
                const saved = await NotesAPI.updateNote(fork.id, {revision:fork.revision,
                    title:next.title, blocks:next.blocks, stickers:fork.stickers || [],
                    category_id:fork.category_id, status:'in_progress'});
                await NotesAPI.addActivity(fork.id, {kind:'ai_full_review', run_id:result.run_id});
                AppState.setNote(saved);
                try { localStorage.setItem('papanda_last_note_id', saved.id); } catch {}
                const input = document.getElementById('note-title');
                if (input) input.value = saved.title;
                if (onRenderAll) onRenderAll();
            } else {
                const next = GenerationChanges.build(note, reviewed,
                    text => this.contentToHtml(text), ALGORITHM_STEPS);
                if (choice.decision === 'edited') {
                    next.blocks.forEach(block => { if (choice.updated_steps[block.role]) block.author = 'human_ai'; });
                }
                AppState.updateNote({title:next.title, blocks:next.blocks});
                const input = document.getElementById('note-title');
                if (input) input.value = next.title;
                if (onRenderAll) onRenderAll();
                await NoteStorageService.saveCurrentNote();
                await NotesAPI.addActivity(note.id, {kind:choice.decision === 'edited' ? 'ai_edited' : 'ai_accepted',
                    step:Number(parameters.target_step), run_id:result.run_id});
            }
            this._activeRun = null;
            return result;
        } catch (error) {
            if (error.name === 'AbortError') {
                if (this._activeRun === run) showToast(t('gen_cancelled'));
                return null;
            }
            throw error;
        } finally {
            if (this._activeRun === run || this._activeRun === null) {
                this._activeRun = null;
                GlobalLoader.hide();
            }
        }
    }

    static async regenerateCascade(fromStepNumber, onRenderAll) {
        // According to instructions: if step-by-step mode, we just invalidate or generate one.
        // But if full mode, or if user wants to regenerate ALL subsequent steps based on a change:
        // We can just call generate_step sequentially.
        try {
            for (let i = fromStepNumber; i <= 5; i++) {
                if (!await this.generateStep(i, onRenderAll)) break;
            }
        } catch (e) {
            console.error("AI Regenerate Cascade Error:", e);
            throw e;
        }
    }
}

export default AIController;

