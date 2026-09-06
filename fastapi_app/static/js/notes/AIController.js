import AppState from './AppState.js';
import NotesAPI from './api.js';
import { ALGORITHM_STEPS } from './BlockConstants.js';
import SkillManager from './SkillManager.js';
import GlobalLoader from './GlobalLoader.js';

import { t } from '../i18n.js';
class AIController {
    static init() {
        console.log('AIController Initialized');
    }

    static buildStateForAI() {
        const blocks = AppState.currentNote.blocks;
        const anchorBlock = blocks.find(b => b.role === 'anchor');
        const target_goal = anchorBlock ? (anchorBlock.html || '').replace(/<[^>]+>/g, '').trim() : AppState.currentNote.title;
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
            const math = [];
            const stash = (m) => `@@MATH${math.push(m) - 1}@@`;
            const guarded = text
                .replace(/\$\$[\s\S]+?\$\$/g, stash)
                .replace(/\\\[[\s\S]+?\\\]/g, stash)
                .replace(/\\\([\s\S]+?\\\)/g, stash)
                .replace(/\$[^$\n]+?\$/g, stash);
            let html = DOMPurify.sanitize(marked.parse(guarded));
            html = html.replace(/@@MATH(\d+)@@/g, (_, i) => math[+i] || '');
            return html;
        }
        // Иначе: каждый двойной перевод строки → отдельный <p>, одинарный → <br>
        return text
            .split(/\n\n+/)
            .map(para => para.trim())
            .filter(Boolean)
            .map(para => `<p>${para.replace(/\n/g, '<br>')}</p>`)
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


    static async generateFull(onRenderAll) {
        GlobalLoader.show(t('ed_ai_analyzing'));
        try {
            const state = this.buildStateForAI();
            let received = 0;
            await NotesAPI.stream(
                '/ai/dialectics/conspectus/generate-full/stream',
                { action: 'generate_full', context_state: state, skill: SkillManager.getSkill() },
                null,
                (ev) => {
                    if (ev.step && ev.content) {
                        received++;
                        // Каждый шаг рисуем сразу, как только он пришёл.
                        this.processUpdatedSteps(
                            { [ev.step]: { content: ev.content, status: 'ready' } },
                            onRenderAll
                        );
                    } else if (ev.status) {
                        // Долгая операция (судья, повторная попытка) — держим пользователя в курсе.
                        GlobalLoader.show(ev.status);
                    }
                }
            );
            if (!received) throw new Error(t('ai_no_steps'));
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
                    question: question || '',
                    skill: SkillManager.getSkill()
                },
                null,
                (ev) => {
                    if (ev.step && ev.content) {
                        received++;
                        this.processUpdatedSteps(
                            { [ev.step]: { content: ev.content, status: 'ready' } },
                            onRenderAll
                        );
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
                target_step: stepNumber.toString(),
                skill: SkillManager.getSkill()
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

