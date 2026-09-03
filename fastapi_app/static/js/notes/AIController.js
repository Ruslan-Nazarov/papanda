import AppState from './AppState.js';
import NotesAPI from './api.js';
import { ALGORITHM_STEPS } from './BlockConstants.js';

import { t } from '../i18n.js';
class AIController {
    static init() {
        console.log('AIController Initialized');
    }

    static async getHint(block, btnElement) {
        try {
            if (btnElement) btnElement.innerHTML = '⌛';
            const res = await NotesAPI.getHint(block.role || 'none', block.html, AppState.currentNote.title, 'ru');
            window.app.constructor.showModal(t('ai_hint_modal'), `<p>${res.result}</p>`);
        } catch (e) {
            window.app.constructor.showModal(t('ai_error_modal'), `<p style="color:red">${e.message}</p>`);
        } finally {
            if (btnElement) btnElement.innerHTML = '✨';
        }
    }

    static async runAI(canvas, btnElement) {
        // Fallback or specific logic (e.g. opposites) if needed, but the main logic is now algorithm generation
        try {
            if (btnElement) btnElement.innerHTML = '⌛';
            const blocks = AppState.currentNote.blocks;
            const step1 = blocks.find(b => b.role === 'step1');
            const step2 = blocks.find(b => b.role === 'step2');
            const contextParts = [];
            if (step1) contextParts.push(`Простейший процесс: ${step1.html.replace(/<[^>]+>/g, '')}`);
            if (step2) contextParts.push(`Развитие процесса: ${step2.html.replace(/<[^>]+>/g, '')}`);
            const processA = contextParts.join('\n\n') || AppState.currentNote.title;
            const res = await NotesAPI.getOpposites(processA);
            window.app.constructor.showModal(t('ai_opposite_modal'), `<div style="line-height:1.6">${res.result}</div>`);
        } catch (e) {
            window.app.constructor.showModal(t('ai_error_modal'), `<p style="color:red">${e.message}</p>`);
        } finally {
            if (btnElement) btnElement.innerHTML = '✨';
        }
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
                    const baseRole = stepKey.split('.')[0];
                    const stepObj = ALGORITHM_STEPS.find(s => s.role === baseRole) || {};
                    const newBlock = {
                        id: 'block-' + Math.random().toString(36).substr(2, 9),
                        side: stepObj.side || 'center',
                        role: stepKey,
                        title: stepData.title || stepObj.title || stepKey,
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
        try {
            const state = this.buildStateForAI();
            let received = 0;
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
                    }
                }
            );
            if (!received) throw new Error(t('ai_no_steps'));
        } catch (e) {
            console.error("AI Generate Full Error:", e);
            throw e; // Let the caller handle UI feedback (e.g. toasts)
        }
    }

    /**
     * Режим ИИ: пользователь задал вопрос/уточнение к блоку `pinnedStep`.
     * Этот блок фиксируется, остальные (кроме anchor) перегенерируются согласованно.
     */
    static async regenerateWithQuestion(pinnedStep, question, onRenderAll) {
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
                }
            }
        );
        if (!received) throw new Error(t('ai_no_steps'));
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

