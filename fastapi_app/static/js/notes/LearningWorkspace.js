import AppState from './AppState.js';
import NotesAPI from './api.js';
import NoteStorageService from './NoteStorageService.js';
import BlockDOMRenderer from './BlockDOMRenderer.js';
import { showToast } from './ToastService.js';

const locale = () => (document.documentElement.lang || 'ru').slice(0, 2);
const words = {
    ru: {variants:'Варианты конспекта', ask:'Спросить ИИ', history:'Путь работы',
        close:'Закрыть', create:'Создать вариант', from:'Начиная с шага', open:'Открыть',
        compare:'Сравнить', goal:'Долгосрочная задача', send:'Отправить',
        question:'Что вы хотите уточнить по теме?', empty:'Пока нет событий',
        choose:'Почему я выбрал этот вариант', save:'Сохранить', ai:'Создан ИИ'},
    en: {variants:'Note variants', ask:'Ask AI', history:'Learning path', close:'Close',
        create:'Create variant', from:'Starting at step', open:'Open', compare:'Compare',
        goal:'Long-term challenge', send:'Send', question:'What would you like to clarify?',
        empty:'No events yet', choose:'Why I chose this variant', save:'Save', ai:'Made by AI'},
    kz: {variants:'Конспект нұсқалары', ask:'ЖИ-дан сұрау', history:'Жұмыс жолы',
        close:'Жабу', create:'Нұсқа жасау', from:'Қадамнан бастап', open:'Ашу',
        compare:'Салыстыру', goal:'Ұзақ мерзімді міндет', send:'Жіберу',
        question:'Тақырып бойынша нені нақтылағыңыз келеді?', empty:'Әзірше оқиға жоқ',
        choose:'Бұл нұсқаны неге таңдадым', save:'Сақтау', ai:'ЖИ жасаған'},
};
const w = key => (words[locale()] || words.ru)[key];
const esc = value => String(value ?? '').replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const plain = value => String(value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

export default class LearningWorkspace {
    static modal(title) {
        document.querySelector('.learning-overlay')?.remove();
        const overlay = document.createElement('div');
        overlay.className = 'learning-overlay';
        overlay.innerHTML = `<section class="learning-dialog" role="dialog" aria-modal="true">
            <header><h2>${esc(title)}</h2><button type="button" class="learning-close" aria-label="${esc(w('close'))}">×</button></header>
            <div class="learning-body"></div></section>`;
        document.body.appendChild(overlay);
        const close = () => overlay.remove();
        overlay.querySelector('.learning-close').addEventListener('click', close);
        overlay.addEventListener('click', event => { if (event.target === overlay) close(); });
        return {overlay, body: overlay.querySelector('.learning-body'), close};
    }

    static async savedNote() {
        const note = await NoteStorageService.saveCurrentNote();
        if (!note.id) throw new Error('Save the note first');
        return note;
    }

    static async variants(startStep = 1) {
        try {
            const note = await this.savedNote();
            const variants = await NotesAPI.getVariants(note.id);
            const {body, close} = this.modal(w('variants'));
            body.innerHTML = `<div class="learning-form">
                <label>${esc(w('from'))} <select id="learning-step">${[1,2,3,4,5].map(n =>
                    `<option value="${n}" ${n === startStep ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
                <input id="learning-label" maxlength="120" value="${esc(`${w('variants')} ${variants.length + 1}`)}" aria-label="${esc(w('variants'))}">
                <button id="learning-fork" class="learning-primary">${esc(w('create'))}</button></div>
                <label class="learning-goal"><input type="checkbox" id="learning-goal" ${note.long_term_goal ? 'checked' : ''}> ${esc(w('goal'))}</label>
                <div class="learning-variant-list">${variants.map(v => `<div class="learning-variant" data-id="${v.id}">
                    <div><strong>${esc(v.variant_label || v.title)}</strong>${v.variant_origin === 'ai' ? ` <small>${esc(w('ai'))}</small>` : ''}
                    <p>${esc(v.title)}</p></div><div class="learning-variant-actions">${v.variant_origin === 'ai' ? `<button data-review="${v.id}">Оценить ИИ</button>` : ''}<button data-open="${v.id}">${esc(w('open'))}</button></div></div>`).join('')}</div>
                ${variants.length > 1 ? `<button id="learning-compare">${esc(w('compare'))}</button>` : ''}`;
            body.querySelector('#learning-fork').addEventListener('click', async () => {
                try {
                    const saved = await this.savedNote();
                    const label = body.querySelector('#learning-label').value.trim();
                    if (!label) return;
                    const forked = await NotesAPI.forkVariant(saved.id, {
                        revision:saved.revision, from_step:Number(body.querySelector('#learning-step').value), label});
                    AppState.setNote(forked);
                    try { localStorage.setItem('papanda_last_note_id', forked.id); } catch {}
                    BlockDOMRenderer.renderAll();
                    close();
                } catch (error) { showToast(error.message, 'error'); }
            });
            body.querySelector('#learning-goal').addEventListener('change', async event => {
                try {
                    const saved = await this.savedNote();
                    const updated = await NotesAPI.setLongTermGoal(saved.id, saved.revision, event.target.checked);
                    AppState.setNote(updated);
                    BlockDOMRenderer.renderAll();
                } catch (error) { event.target.checked = !event.target.checked; showToast(error.message, 'error'); }
            });
            body.querySelectorAll('[data-open]').forEach(button => button.addEventListener('click', async () => {
                try {
                    await this.savedNote();
                    await NoteStorageService.loadNote(Number(button.dataset.open));
                    BlockDOMRenderer.renderAll();
                    close();
                } catch (error) { showToast(error.message, 'error'); }
            }));
            body.querySelectorAll('[data-review]').forEach(button => button.addEventListener('click', () =>
                this.reviewAI(Number(button.dataset.review))));
            body.querySelector('#learning-compare')?.addEventListener('click', () => this.compare(variants));
        } catch (error) { showToast(error.message, 'error'); }
    }

    static reviewAI(noteId) {
        const {body, close} = this.modal('Оценка полного конспекта ИИ');
        body.innerHTML = `<p>Сравните ответ ИИ со своей работой. Что помогло понять тему, где есть ошибка и какой переход остался неубедительным?</p>
            <div class="learning-review-fields"><label>Что помогло<textarea maxlength="1500"></textarea></label>
            <label>Где ИИ ошибся<textarea maxlength="1500"></textarea></label>
            <label>Что неубедительно<textarea maxlength="1500"></textarea></label></div>
            <button class="learning-primary" id="learning-review-save">Сохранить оценку</button>`;
        body.querySelector('#learning-review-save').addEventListener('click', async () => {
            const [helped, error, unconvincing] = [...body.querySelectorAll('textarea')].map(el => el.value.trim());
            if (![helped,error,unconvincing].some(Boolean)) return;
            const text = [`Помогло: ${helped || '—'}`, `Ошибки: ${error || '—'}`, `Неубедительно: ${unconvincing || '—'}`].join('\n');
            try { await NotesAPI.addActivity(noteId, {kind:'ai_full_review', text}); close(); showToast('Оценка сохранена'); }
            catch (issue) { showToast(issue.message, 'error'); }
        });
    }

    static async compare(variants) {
        const {body} = this.modal(w('compare'));
        body.innerHTML = `<div class="learning-form"><select id="compare-left">${variants.map(v => `<option value="${v.id}">${esc(v.variant_label || v.title)}</option>`).join('')}</select>
            <select id="compare-right">${variants.map((v,i) => `<option value="${v.id}" ${i === variants.length-1 ? 'selected' : ''}>${esc(v.variant_label || v.title)}</option>`).join('')}</select></div><div class="learning-compare"></div>`;
        const render = async () => {
            const [left, right] = await Promise.all([
                NotesAPI.getNote(body.querySelector('#compare-left').value),
                NotesAPI.getNote(body.querySelector('#compare-right').value)]);
            const columns = [left, right].map(note => `<div><h3>${esc(note.variant_label || note.title)}</h3>${[1,2,3,4,5].map(n => {
                const blocks = note.content_json.filter(b => b.role === `step${n}` || b.role?.startsWith(`step${n}.`));
                return `<section><strong>${n}</strong><p>${esc(blocks.map(b => plain(b.html)).join(' / ') || '—')}</p></section>`;
            }).join('')}</div>`);
            body.querySelector('.learning-compare').innerHTML = columns.join('');
        };
        body.querySelectorAll('select').forEach(el => el.addEventListener('change', () => render().catch(e => showToast(e.message, 'error'))));
        await render();
    }

    static async chat() {
        try {
            const note = await this.savedNote();
            const events = await NotesAPI.getActivity(note.id);
            const {body} = this.modal(w('ask'));
            const pairs = events.filter(e => e.kind === 'question_answer');
            body.innerHTML = `<div class="learning-chat-log">${pairs.map(e => `<div class="learning-chat-pair"><p><b>Вы:</b> ${esc(e.data.question)}</p>
                <p><b>ИИ:</b> ${esc(e.data.answer)}</p></div>`).join('')}</div>
                <div class="learning-chat-compose"><textarea maxlength="2000" placeholder="${esc(w('question'))}"></textarea>
                <button class="learning-primary">${esc(w('send'))}</button></div>`;
            const input = body.querySelector('textarea');
            body.querySelector('.learning-chat-compose button').addEventListener('click', async event => {
                const question = input.value.trim();
                if (!question) return;
                event.target.disabled = true;
                try {
                    const response = await NotesAPI.request('/ai/dialectics/topic-question', 'POST', {note_id:note.id, question});
                    const pair = document.createElement('div');
                    pair.className = 'learning-chat-pair';
                    const q = document.createElement('p'), a = document.createElement('p');
                    q.textContent = `Вы: ${question}`; a.textContent = `ИИ: ${response.answer}`;
                    pair.append(q, a); body.querySelector('.learning-chat-log').appendChild(pair);
                    input.value = '';
                    pair.scrollIntoView({block:'nearest'});
                } catch (error) { showToast(error.message, 'error'); }
                finally { event.target.disabled = false; }
            });
            input.focus();
        } catch (error) { showToast(error.message, 'error'); }
    }

    static async history() {
        try {
            const note = await this.savedNote();
            const variants = await NotesAPI.getVariants(note.id);
            const groups = await Promise.all(variants.map(async v => ({variant:v,
                events:await NotesAPI.getActivity(v.id)})));
            const events = groups.flatMap(({variant,events:items}) => items.map(e => ({...e, variant})))
                .sort((a,b) => new Date(a.created_at)-new Date(b.created_at) || a.id-b.id);
            const counts = events.reduce((acc,e) => {acc[e.kind]=(acc[e.kind]||0)+1; return acc;},{});
            const {body} = this.modal(w('history'));
            body.innerHTML = `<div class="learning-stats"><span>Обращения к ИИ: ${(counts.ai_proposed||0)+(counts.question_answer||0)}</span><span>Принято: ${(counts.ai_accepted||0)+(counts.ai_edited||0)}</span><span>Варианты: ${variants.length}</span></div>
                <div class="learning-timeline">${events.length ? events.map(e => `<article><time>${esc(new Date(e.created_at).toLocaleString())}</time>
                <strong>${esc(e.variant.variant_label || e.variant.title)}</strong><p>${esc(this.eventLabel(e))}</p>
                ${this.eventDetail(e) ? `<details><summary>Посмотреть содержание</summary><pre>${esc(this.eventDetail(e))}</pre></details>` : ''}</article>`).join('') : `<p>${esc(w('empty'))}</p>`}</div>
                <div class="learning-form"><input id="learning-reason" maxlength="2000" placeholder="${esc(w('choose'))}"><button id="learning-reason-save">${esc(w('save'))}</button></div>`;
            body.querySelector('#learning-reason-save').addEventListener('click', async () => {
                const detail = body.querySelector('#learning-reason').value.trim();
                if (!detail) return;
                try { await NotesAPI.addActivity(note.id, {kind:'variant_chosen', detail}); this.history(); }
                catch (error) { showToast(error.message, 'error'); }
            });
        } catch (error) { showToast(error.message, 'error'); }
    }

    static eventLabel(event) {
        const d = event.data || {};
        return ({variant_created:`Создан вариант от шага ${d.from_step}`,
            variant_forked:`Создан новый вариант «${d.label || ''}»`,
            ai_proposed:`ИИ предложил шаг ${d.step || ''}`,
            ai_accepted:`Предложение ИИ принято для шага ${d.step || ''}`,
            ai_edited:`Предложение ИИ изменено и принято для шага ${d.step || ''}`,
            ai_rejected:`Предложение ИИ отклонено для шага ${d.step || ''}`,
            ai_full_review:d.text ? 'Оценка полного конспекта ИИ' : 'Полный конспект ИИ сохранён отдельным вариантом',
            question_answer:`Вопрос: ${d.question || ''}`,
            variant_chosen:`Выбор варианта: ${d.detail || ''}`,
            goal_changed:d.long_term_goal ? 'Отмечена долгосрочная задача' : 'Снята отметка долгосрочной задачи'})[event.kind] || event.kind;
    }

    static eventDetail(event) {
        if (event.kind === 'question_answer') return event.data?.answer || '';
        if (event.kind === 'ai_proposed' || event.kind === 'ai_full_review') return event.data?.text || '';
        return '';
    }
}
