import { t } from '../i18n.js';
import BlockMathRenderer from './BlockMathRenderer.js';

/**
 * Историческая справка к блоку (значок 📜). Не отдельный блок, а раскрывающаяся
 * плашка прямо под панелью кнопок блока. Показывается только у тех шагов, где
 * модель нашла важный исторический контекст или расхождение логики с историей
 * (см. историческая_справка_промпт.md, событие __history_notes__).
 */
class HistoryNoteService {
    static toggle(block, btnEl, blockDiv) {
        const existing = blockDiv.querySelector(':scope > .history-note-pop');
        if (existing) {
            this._collapse(existing, btnEl);
            return;
        }
        if (!block || !block.historyNote) return;

        const pop = document.createElement('div');
        pop.className = 'history-note-pop';
        pop.innerHTML = `
            <div class="history-note-inner">
                <div class="history-note-head">
                    <span class="history-note-badge">📜 ${t('history_note_title')}</span>
                    <button class="history-note-close" title="${t('close_word') || 'Закрыть'}">✕</button>
                </div>
                <div class="block-content history-note-body"><p></p></div>
            </div>
        `;
        pop.querySelector('.history-note-body p').textContent = block.historyNote;

        const toolbar = blockDiv.querySelector('.block-toolbar-row');
        if (toolbar && toolbar.parentNode) {
            toolbar.parentNode.insertBefore(pop, toolbar.nextSibling);
        } else {
            blockDiv.appendChild(pop);
        }

        try { BlockMathRenderer.renderMath(pop); } catch (_) {}

        // Раскрытие через grid-template-rows 0fr→1fr — без замера высоты в JS.
        // Форсируем reflow начального состояния, затем включаем класс: так
        // переход запускается и когда вкладка в фоне (rAF там может не сработать).
        void pop.getBoundingClientRect();
        pop.classList.add('is-open');

        btnEl.classList.add('pulsing', 'active');

        pop.querySelector('.history-note-close').addEventListener('click', (e) => {
            e.stopPropagation();
            this._collapse(pop, btnEl);
        });
    }

    static _collapse(pop, btnEl) {
        pop.classList.remove('is-open');
        btnEl.classList.remove('pulsing', 'active');
        const done = () => { if (pop.parentNode) pop.remove(); };
        pop.addEventListener('transitionend', (e) => {
            if (e.propertyName === 'grid-template-rows') done();
        });
        setTimeout(done, 420);
    }
}

export default HistoryNoteService;
