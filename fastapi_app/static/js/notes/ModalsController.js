import AppState from './AppState.js';

class ModalsController {
    static init() {
        console.log('ModalsController Initialized');
    }

    static showSectionTitleModal(app, initialTitle = '', onSave) {
        const m = app.showModal('📑 Название раздела', `
            <div style="display: flex; flex-direction: column; gap: 10px;">
                <input type="text" id="section-title-input" class="title-input" placeholder="Введите название раздела..." value="${app.constructor.escapeHtml ? app.constructor.escapeHtml(initialTitle) : initialTitle}" style="padding: 8px; font-size: 16px; border: 1px solid #ccc; border-radius: 4px;">
            </div>
        `);
        
        const input = m.dialog.querySelector('#section-title-input');
        input.focus();

        m.dialog.querySelector('.btn-ok-modal').addEventListener('click', () => {
            if (onSave) onSave(input.value);
            m.close();
        });
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                if (onSave) onSave(input.value);
                m.close();
            }
        });
    }

    static showOnboarding(app) {
        const slides = [
            `<h3>Шаг 1. Тезис и Антитезис</h3><p>Левая колонка — тезис, правая — антитезис. Это основа диалектического метода.</p>`,
            `<h3>Шаг 2. Развитие</h3><p>Каждое понятие имеет свою противоположность, что создает движение и развитие.</p>`,
            `<h3>Шаг 3. Синтез</h3><p>Центральный блок объединяет тезис и антитезис, разрешая противоречие на новом уровне.</p>`,
            `<h3>Шаг 4. Помощь AI</h3><p>Используйте кнопку ✨ на блоках, чтобы получить контекстную подсказку от ИИ.</p>`
        ];
        
        let currentSlide = 0;
        
        const renderSlide = () => `
            <div class="onboarding-slide" style="min-height: 150px; text-align: center;">
                ${slides[currentSlide]}
            </div>
            <div style="display: flex; justify-content: center; gap: 5px; margin-top: 15px;">
                ${slides.map((_, i) => `<span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${i === currentSlide ? 'var(--color-primary)' : '#ccc'};"></span>`).join('')}
            </div>
        `;

        const m = app.showModal('Как papanda вам поможет?', renderSlide());
        
        const okBtn = m.dialog.querySelector('.btn-ok-modal');
        okBtn.textContent = 'Далее';
        
        // Remove old listener
        const newOkBtn = okBtn.cloneNode(true);
        okBtn.parentNode.replaceChild(newOkBtn, okBtn);
        
        newOkBtn.addEventListener('click', () => {
            if (currentSlide < slides.length - 1) {
                currentSlide++;
                m.dialog.querySelector('.modal-dialog-body').innerHTML = renderSlide();
                if (currentSlide === slides.length - 1) {
                    newOkBtn.textContent = 'Понятно, начать работу';
                }
            } else {
                m.close();
            }
        });
    }
}

export default ModalsController;
