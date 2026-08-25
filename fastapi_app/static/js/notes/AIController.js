import AppState from './AppState.js';
import NotesAPI from './api.js';

class AIController {
    static init() {
        console.log('AIController Initialized');
    }

    static async getHint(block, btnElement) {
        try {
            btnElement.innerHTML = '⌛';
            const res = await NotesAPI.getHint(block.role || 'none', block.html, AppState.currentNote.title, 'ru');
            window.app.constructor.showModal('✨ AI Подсказка', `<p>${res.result}</p>`);
        } catch (e) {
            window.app.constructor.showModal('Ошибка AI', `<p style="color:red">${e.message}</p>`);
        } finally {
            btnElement.innerHTML = '✨';
        }
    }

    /**
     * §8: Special "opposites" mode for step3 hint block.
     * Collects step1 + step2 content from AppState and calls the opposites AI.
     */
    static async runAI(canvas, btnElement) {
        try {
            if (btnElement) btnElement.innerHTML = '⌛';

            const blocks = AppState.currentNote.blocks;
            const step1 = blocks.find(b => b.role === 'step1');
            const step2 = blocks.find(b => b.role === 'step2');

            // Build context from step1 and step2
            const contextParts = [];
            if (step1) contextParts.push(`Простейший процесс: ${step1.html.replace(/<[^>]+>/g, '')}`);
            if (step2) contextParts.push(`Развитие процесса: ${step2.html.replace(/<[^>]+>/g, '')}`);
            const processA = contextParts.join('\n\n') || AppState.currentNote.title;

            const res = await NotesAPI.getOpposites(processA);
            window.app.constructor.showModal('✨ AI — Противоположный процесс', `<div style="line-height:1.6">${res.result}</div>`);
        } catch (e) {
            window.app.constructor.showModal('Ошибка AI', `<p style="color:red">${e.message}</p>`);
        } finally {
            if (btnElement) btnElement.innerHTML = '✨';
        }
    }
}

export default AIController;

