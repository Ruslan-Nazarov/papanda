import { t } from '../i18n.js';

// Keep the conversation as data: reading decorations and event handlers are rebuilt.
class SavedConceptChat {
    static selector = 'span[data-type="concept-chat"]';

    static attributes(data) {
        const title = data.calculation ? t('calculation_title') : t('whatis_title');
        return {'data-type': 'concept-chat', 'data-chat': JSON.stringify(data),
            class: 'concept-chat-marker', role: 'button', tabindex: '0',
            'aria-haspopup': 'dialog', 'aria-label': title, title};
    }

    static create(data) {
        const marker = document.createElement('span');
        for (const [name, value] of Object.entries(this.attributes(data))) marker.setAttribute(name, value);
        marker.textContent = '💬';
        return marker;
    }

    static read(marker) {
        try {
            const data = JSON.parse(marker.getAttribute('data-chat') || '');
            if (data?.version !== 1 || typeof data.fragment !== 'string') return null;
            if (typeof data.legacyHTML === 'string') return data;
            if (!Array.isArray(data.turns) || !data.turns.length || data.turns.some(turn =>
                typeof turn?.question !== 'string' || typeof turn.answer !== 'string'
                || !Array.isArray(turn.sources) || turn.sources.some(source => !source || typeof source !== 'object'))) return null;
            return data;
        } catch { return null; }
    }

    static compactLegacy(root) {
        // Older versions saved an ordinary quote. Preserve its complete HTML;
        // source IDs cannot be recovered from it, so resolve its labels on opening.
        const titles = new Map([
            [t('calculation_title'), true], [t('whatis_title'), false],
            ['Подробный разбор расчёта · ИИ', true], ['✨ Что это?', false],
            ['Detailed calculation · AI', true], ['✨ What is this?', false],
            ['Есептеуді толық талдау · ЖИ', true], ['✨ Бұл не?', false],
        ]);
        for (const quote of root.querySelectorAll('blockquote.custom-quote')) {
            if (quote.getAttribute('author')) continue;
            const content = quote.querySelector(':scope > .quote-content') || quote;
            const heading = content.firstElementChild;
            if (!heading?.matches('p') || !heading.querySelector('strong')) continue;
            const text = heading.textContent;
            const title = [...titles.keys()].find(value => text.startsWith(`${value}: «`) && text.endsWith('»'));
            if (!title) continue;
            const copy = content.cloneNode(true);
            copy.firstElementChild.remove();
            const marker = this.create({version: 1, fragment: text.slice(title.length + 3, -1),
                calculation: titles.get(title), legacyHTML: copy.innerHTML});
            const previous = quote.previousElementSibling;
            if (previous?.matches('p') && quote.previousSibling === previous) previous.append(marker);
            else {
                const paragraph = document.createElement('p');
                paragraph.append(marker);
                quote.before(paragraph);
            }
            quote.remove();
        }
    }
}

export default SavedConceptChat;
