import AppState from './AppState.js';
import { t } from '../i18n.js';

class QuestionsManager {
    static init() {
        const button = document.getElementById('btn-questions');
        const menu = document.getElementById('questions-panel');
        if (!button || !menu) return;

        button.addEventListener('click', event => {
            event.stopPropagation();
            const opening = menu.classList.contains('hidden');
            document.querySelectorAll('.dropdown-menu').forEach(dropdown => dropdown.classList.add('hidden'));
            if (opening) {
                this.render();
                menu.classList.remove('hidden');
                this.position();
            }
            button.setAttribute('aria-expanded', String(opening));
        });

        document.addEventListener('click', event => {
            if (!event.target.closest('.questions-wrapper')) this.close();
        });
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape') this.close();
        });
        window.addEventListener('resize', () => {
            if (!menu.classList.contains('hidden')) this.position();
        });
        document.addEventListener('noteOpened', () => { this.close(); this.refresh(); });
        for (const name of ['stateDirty', 'noteSaved']) document.addEventListener(name, () => this.refresh());
        this.refresh();
    }

    static close() {
        document.getElementById('questions-panel')?.classList.add('hidden');
        document.getElementById('btn-questions')?.setAttribute('aria-expanded', 'false');
    }

    static position() {
        const panel = document.getElementById('questions-panel');
        const button = document.getElementById('btn-questions');
        if (!panel || !button) return;
        panel.style.position = panel.style.left = panel.style.right = panel.style.top = panel.style.width = '';
        const anchor = button.getBoundingClientRect();
        const width = Math.min(380, window.innerWidth - 24);
        if (anchor.right >= width + 12) return;
        if (anchor.left + width <= window.innerWidth - 12) {
            panel.style.left = '0';
            panel.style.right = 'auto';
            return;
        }
        panel.style.position = 'fixed';
        panel.style.left = '12px';
        panel.style.right = '12px';
        panel.style.top = `${anchor.bottom + 6}px`;
        panel.style.width = 'auto';
    }

    static getQuestions() {
        return (AppState.currentNote.blocks || []).filter(block => !block.isDraft).flatMap(block => {
            const content = document.createElement('template');
            content.innerHTML = block.html || '';
            const questions = [...content.content.querySelectorAll('.question-mark-text[data-question]')]
                .map(mark => mark.getAttribute('data-question')?.trim())
                .filter(Boolean);
            if (questions.length === 0) return [];
            const title = (block.title || '').replace(/\s+/g, ' ').trim();
            return [{ id: block.id, title: title || t('block_word'), questions: [...new Set(questions)] }];
        });
    }

    static refresh() {
        const count = document.querySelector('#btn-questions .questions-count');
        if (!count) return;
        const questions = this.getQuestions();
        count.textContent = String(questions.length);
        count.hidden = questions.length === 0;
        if (!document.getElementById('questions-panel')?.classList.contains('hidden')) this.render(questions);
    }

    static render(questions = this.getQuestions()) {
        const menu = document.getElementById('questions-panel');
        if (!menu) return;
        menu.replaceChildren();

        const header = document.createElement('div');
        header.className = 'questions-header';
        const heading = document.createElement('strong');
        heading.textContent = `${t('questions_title')} (${questions.length})`;
        const close = document.createElement('button');
        close.type = 'button';
        close.className = 'questions-close';
        close.setAttribute('aria-label', t('close_word'));
        close.textContent = '✕';
        close.addEventListener('click', () => this.close());
        header.append(heading, close);
        menu.append(header);

        const list = document.createElement('div');
        list.className = 'questions-list';
        if (questions.length === 0) {
            const empty = document.createElement('p');
            empty.className = 'questions-empty';
            empty.textContent = t('questions_empty');
            list.append(empty);
        }
        questions.forEach(question => {
            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'questions-item';
            const title = document.createElement('strong');
            title.textContent = question.title;
            item.append(title);
            question.questions.forEach(text => {
                const line = document.createElement('span');
                line.textContent = `❓ ${text}`;
                item.append(line);
            });
            item.addEventListener('click', () => {
                const target = [...document.querySelectorAll('.dialectics-block')]
                    .find(block => block.dataset.id === String(question.id));
                this.close();
                if (!target) return;
                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                target.classList.add('question-target');
                setTimeout(() => target.classList.remove('question-target'), 2000);
            });
            list.append(item);
        });
        menu.append(list);
    }
}

export default QuestionsManager;
