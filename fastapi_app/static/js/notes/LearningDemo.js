import { lt as t } from './LearningI18n.js';
import LearningWorkspace from './LearningWorkspace.js';
import NotesAPI from './api.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// These are interface fixtures, not real student work or published reviews.
const examples = [
    {id:1, title:t('example_a_title'), subject:t('physics'), explanation:t('example_a_text'), clearer:t('example_a_clearer'), unclear:t('example_a_unclear')},
    {id:2, title:t('example_b_title'), subject:t('physics'), explanation:t('example_b_text'), clearer:t('example_b_clearer'), unclear:t('example_b_unclear')},
    {id:3, title:t('example_c_title'), subject:t('biology'), explanation:t('example_c_text'), clearer:t('example_c_clearer'), unclear:t('example_c_unclear')},
];
const links = [
    {from:1,to:2,kind:t('link_development'),reason:t('link_development_reason')},
    {from:1,to:3,kind:t('alternative'),reason:t('link_alternative_reason')},
];

export default class LearningDemo {
    static async open(tab = 'catalog') {
        const {body} = LearningWorkspace.modal(t('community'));
        const notes = await NotesAPI.getNotes().catch(() => []);
        body.innerHTML = `<p class="learning-demo-notice">${t('demo_notice')}</p>
            <nav class="learning-demo-tabs">${[
                ['catalog',t('catalog')],['map',t('map')],['portfolio',t('portfolio')],
                ['teacher',t('teacher')],['employer',t('employer')]
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
        host.innerHTML = `<label class="learning-demo-search">${t('search')} <input type="search" placeholder="${t('search_placeholder')}"></label>
            <div class="learning-demo-cards"></div><div class="learning-demo-detail"></div>`;
        const cards = host.querySelector('.learning-demo-cards');
        const render = () => {
            const query = host.querySelector('input').value.trim().toLowerCase();
            cards.innerHTML = examples.filter(item => `${item.title} ${item.subject}`.toLowerCase().includes(query))
                .map(item => `<button class="learning-demo-card" data-example="${item.id}"><small>${t('example')} · ${esc(item.subject)}</small>
                    <strong>${esc(item.title)}</strong><span>${esc(item.explanation)}</span></button>`).join('') || `<p>${t('no_examples')}</p>`;
            cards.querySelectorAll('[data-example]').forEach(button => button.addEventListener('click', () =>
                this.detail(host.querySelector('.learning-demo-detail'), Number(button.dataset.example))));
        };
        host.querySelector('input').addEventListener('input', render);
        render();
    }

    static detail(host, id) {
        const item = examples.find(value => value.id === id);
        if (!item) return;
        host.innerHTML = `<h3>${esc(item.title)} <small>${t('demo')}</small></h3><p>${esc(item.explanation)}</p>
            <h4>${t('clarity_example')}</h4><p><b>${t('clearer')}:</b> ${esc(item.clearer)}</p>
            <p><b>${t('unclear')}:</b> ${esc(item.unclear)}</p>
            <h4>${t('your_review')}</h4><fieldset class="learning-demo-rating"><legend>${t('rating_question')}</legend>
            ${[1,2,3,4,5].map(n => `<label><input type="radio" name="demo-rating" value="${n}"> ${n}</label>`).join('')}</fieldset>
            <label class="learning-demo-field">${t('clearer')}?<textarea placeholder="${t('your_explanation')}"></textarea></label>
            <label class="learning-demo-field">${t('unclear')}?<textarea placeholder="${t('author_question')}"></textarea></label>
            <button type="button" class="learning-demo-disabled" disabled>${t('send_after_accounts')}</button>
            <p class="learning-demo-hint">${t('error_report_hint')}</p>`;
    }

    static map(host) {
        host.innerHTML = `<p>${t('map_intro')}</p>
            <div class="learning-demo-map"><button data-node="1"><small>${t('demo_note')}</small><strong>${esc(examples[0].title)}</strong></button>
            <div class="learning-demo-map-branches"><div><span aria-hidden="true">→</span><button data-node="2"><small>${t('continuation')}</small><strong>${esc(examples[1].title)}</strong></button></div>
            <div><span aria-hidden="true">→</span><button data-node="3"><small>${t('alternative')}</small><strong>${esc(examples[2].title)}</strong></button></div></div></div>
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
        host.innerHTML = `<h3>${t('portfolio_title')}</h3><p>${t('portfolio_intro')}</p>
            <div class="learning-portfolio-tree">${families.size ? [...families.values()].map(group => `<section>
                <h4>${esc(group[0].title)} ${group.some(n => n.long_term_goal) ? `<small>${t('goal')}</small>` : ''}</h4>
                <ul>${group.map(note => `<li><span>${esc(note.variant_label || t('original_note'))}</span>
                    ${note.variant_origin === 'ai' ? `<small>${t('ai_short')}</small>` : ''}</li>`).join('')}</ul></section>`).join('')
                : `<p>${t('saved_notes_empty')}</p>`}</div>
            <div class="learning-demo-review"><strong>${t('timeline_example')}</strong><p>${t('timeline_text')}</p></div>
            <div class="learning-demo-review"><button class="learning-demo-disabled" type="button">${t('select_publish')}</button>
            <p class="learning-demo-hint">${t('publish_hint')}</p></div>`;
    }

    static teacher(host, notes) {
        host.innerHTML = `<h3>${t('teacher_title')}</h3><p>${t('teacher_intro')}</p>
            <div class="learning-demo-review"><strong>${t('work')}: ${esc(notes[0]?.title || examples[0].title)}</strong>
            <ol><li>${t('timeline_goal')}</li><li>${t('timeline_variant')}</li><li>${t('timeline_ai')}</li><li>${t('timeline_choice')}</li></ol>
            <p>${t('timeline_hint')}</p></div>`;
    }

    static employer(host, notes) {
        host.innerHTML = `<h3>${t('employer_title')}</h3><p>${t('employer_intro')}</p>
            <div class="learning-demo-review"><strong>${t('selected_work')}: ${esc(notes[0]?.title || examples[0].title)}</strong>
            <p>${t('employer_contents')}</p>
            <button class="learning-demo-disabled" type="button">${t('access')}</button><p class="learning-demo-hint">${t('access_hint')}</p></div>`;
    }
}
