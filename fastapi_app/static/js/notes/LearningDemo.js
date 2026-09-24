import LearningWorkspace from './LearningWorkspace.js';
import NotesAPI from './api.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// These are interface fixtures, not real student work or published reviews.
const examples = [
    {id:1, title:'Пример темы А', subject:'Физика', explanation:'Как исходный процесс приводит к новому способу описания явления.', clearer:'Стала понятнее связь между исходным процессом и результатом.', unclear:'Нужно подробнее раскрыть шаг противоречия.'},
    {id:2, title:'Пример темы Б', subject:'Физика', explanation:'Продолжение рассуждения из темы А.', clearer:'Стало понятнее, зачем нужен следующий шаг.', unclear:'Не хватает конкретного примера.'},
    {id:3, title:'Пример темы В', subject:'Биология', explanation:'Другое объяснение сходного перехода процессов.', clearer:'Прояснилось различие между процессами.', unclear:'Требуется уточнить исходное условие.'},
];
const links = [
    {from:1,to:2,kind:'Развитие продолжается',reason:'Результат первого объяснения становится исходным процессом для второго.'},
    {from:1,to:3,kind:'Другое объяснение',reason:'Конспект рассматривает похожий переход в другом предмете.'},
];

export default class LearningDemo {
    static async open(tab = 'catalog') {
        const {body} = LearningWorkspace.modal('Учебное сообщество · демо');
        const notes = await NotesAPI.getNotes().catch(() => []);
        body.innerHTML = `<p class="learning-demo-notice">Демонстрация будущего интерфейса. Примеры, отзывы и роли вымышлены. Ваши конспекты не публикуются здесь.</p>
            <nav class="learning-demo-tabs">${[
                ['catalog','Каталог'],['map','Карта учебника'],['portfolio','Портфолио'],
                ['teacher','Преподаватель'],['employer','Работодатель']
            ].map(([id,name]) => `<button type="button" data-tab="${id}" class="${tab===id?'active':''}">${name}</button>`).join('')}</nav>
            <div class="learning-demo-content"></div>`;
        const content = body.querySelector('.learning-demo-content');
        const select = name => {
            tab = name;
            body.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
            if (name === 'catalog') this.catalog(content);
            if (name === 'map') this.map(content);
            if (name === 'portfolio') this.portfolio(content, notes);
            if (name === 'teacher') this.teacher(content, notes);
            if (name === 'employer') this.employer(content, notes);
        };
        body.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => select(b.dataset.tab)));
        select(tab);
    }

    static catalog(host) {
        host.innerHTML = `<label class="learning-demo-search">Поиск по теме <input type="search" placeholder="Тема или предмет"></label>
            <div class="learning-demo-cards"></div><div class="learning-demo-detail"></div>`;
        const cards = host.querySelector('.learning-demo-cards');
        const render = () => {
            const query = host.querySelector('input').value.trim().toLowerCase();
            cards.innerHTML = examples.filter(item => `${item.title} ${item.subject}`.toLowerCase().includes(query))
                .map(item => `<button class="learning-demo-card" data-example="${item.id}"><small>Пример · ${esc(item.subject)}</small>
                    <strong>${esc(item.title)}</strong><span>${esc(item.explanation)}</span></button>`).join('') || '<p>Нет примеров по этому запросу.</p>';
            cards.querySelectorAll('[data-example]').forEach(button => button.addEventListener('click', () =>
                this.detail(host.querySelector('.learning-demo-detail'), Number(button.dataset.example))));
        };
        host.querySelector('input').addEventListener('input', render);
        render();
    }

    static detail(host, id) {
        const item = examples.find(value => value.id === id);
        if (!item) return;
        host.innerHTML = `<h3>${esc(item.title)} <small>демо</small></h3><p>${esc(item.explanation)}</p>
            <h4>Оценка понятности · пример</h4><p><b>Что стало понятнее:</b> ${esc(item.clearer)}</p>
            <p><b>Что осталось неясным:</b> ${esc(item.unclear)}</p>
            <h4>Ваша оценка · макет формы</h4><fieldset class="learning-demo-rating"><legend>Насколько понятнее стал процесс?</legend>
            ${[1,2,3,4,5].map(n => `<label><input type="radio" name="demo-rating" value="${n}"> ${n}</label>`).join('')}</fieldset>
            <label class="learning-demo-field">Что стало понятнее?<textarea placeholder="Ваше объяснение"></textarea></label>
            <label class="learning-demo-field">Что осталось неясным?<textarea placeholder="Вопрос автору"></textarea></label>
            <button type="button" class="learning-demo-disabled" disabled>Отправка после появления аккаунтов</button>
            <p class="learning-demo-hint">Сообщение о фактической ошибке будет отдельным от оценки понятности.</p>`;
    }

    static map(host) {
        host.innerHTML = `<p>Карта показывает, как конспекты объясняют переход от одного процесса к другому.</p>
            <div class="learning-demo-map"><button data-node="1"><small>Демо-конспект</small><strong>${esc(examples[0].title)}</strong></button>
            <div class="learning-demo-map-branches"><div><span aria-hidden="true">→</span><button data-node="2"><small>Продолжение</small><strong>${esc(examples[1].title)}</strong></button></div>
            <div><span aria-hidden="true">→</span><button data-node="3"><small>Другое объяснение</small><strong>${esc(examples[2].title)}</strong></button></div></div></div>
            <div class="learning-demo-links">${links.map((link,i) => `<button data-link="${i}">${esc(examples.find(x=>x.id===link.from).title)} → ${esc(examples.find(x=>x.id===link.to).title)} · ${esc(link.kind)}</button>`).join('')}</div>
            <div class="learning-demo-detail"></div>`;
        host.querySelectorAll('[data-node]').forEach(button => button.addEventListener('click', () =>
            this.detail(host.querySelector('.learning-demo-detail'), Number(button.dataset.node))));
        host.querySelectorAll('[data-link]').forEach(button => button.addEventListener('click', () => {
            const link = links[Number(button.dataset.link)];
            host.querySelector('.learning-demo-detail').innerHTML = `<h3>${esc(link.kind)}</h3><p>${esc(link.reason)}</p>`;
        }));
    }

    static portfolio(host, notes) {
        const families = new Map();
        for (const note of notes.slice(0,30)) {
            const key = note.family_id ? `family-${note.family_id}` : `note-${note.id}`;
            if (!families.has(key)) families.set(key, []);
            families.get(key).push(note);
        }
        host.innerHTML = `<h3>Моё портфолио · макет</h3><p>Темы и реальные названия ваших локальных вариантов показаны только вам. Демонстрационная хронология ниже обозначает будущий вид портфолио.</p>
            <div class="learning-portfolio-tree">${families.size ? [...families.values()].map(group => `<section>
                <h4>${esc(group[0].title)} ${group.some(n => n.long_term_goal) ? '<small>Долгосрочная задача</small>' : ''}</h4>
                <ul>${group.map(note => `<li><span>${esc(note.variant_label || 'Исходный конспект')}</span>
                    ${note.variant_origin === 'ai' ? '<small>ИИ</small>' : ''}</li>`).join('')}</ul></section>`).join('')
                : '<p>Сохранённые конспекты появятся здесь.</p>'}</div>
            <div class="learning-demo-review"><strong>Пример хронологии</strong><p>Цель → первая попытка → новый вариант → предложение ИИ → выбор варианта.</p></div>
            <div class="learning-demo-review"><button class="learning-demo-disabled" type="button">Выбрать вариант для публикации</button>
            <p class="learning-demo-hint">Публикация в общий каталог появится после аккаунтов. Реальную ссылку на отдельный конспект можно создать в основном меню.</p></div>`;
    }

    static teacher(host, notes) {
        host.innerHTML = `<h3>Вид преподавателя · макет</h3><p>Преподаватель сможет просмотреть хронологию, сравнить ранний и поздний варианты и оценить обоснование выбора. Автоматической оценки понимания здесь нет.</p>
            <div class="learning-demo-review"><strong>Работа: ${esc(notes[0]?.title || examples[0].title)}</strong>
            <ol><li>Поставлена задача понять тему</li><li>Создан альтернативный вариант исходного процесса</li><li>Проверено предложение ИИ</li><li>Выбран вариант и объяснено решение</li></ol>
            <p>Эта хронология — пример интерфейса. Настоящие события можно посмотреть в «Путь работы».</p></div>`;
    }

    static employer(host, notes) {
        host.innerHTML = `<h3>Вид работодателя · макет</h3><p>Студент сам выберет, какие конспекты и обоснования решений показывать. Черновики и весь журнал действий не входят в портфолио автоматически.</p>
            <div class="learning-demo-review"><strong>Выбранная работа: ${esc(notes[0]?.title || examples[0].title)}</strong>
            <p>Описание цели · итоговый конспект · важные альтернативы · объяснение выбора · отзывы о понятности.</p>
            <button class="learning-demo-disabled" type="button">Настроить доступ</button><p class="learning-demo-hint">Доступ появится после аккаунтов.</p></div>`;
    }
}
