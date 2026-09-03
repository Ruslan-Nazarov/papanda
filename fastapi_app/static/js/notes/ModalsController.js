import { t } from '../i18n.js';

class ModalsController {
    static init() {
        console.log('ModalsController Initialized');
    }

    static showSectionTitleModal(app, initialTitle = '', onSave) {
        const m = app.showModal(t('section_title_modal'), `
            <div style="display: flex; flex-direction: column; gap: 10px;">
                <input type="text" id="section-title-input" class="title-input" placeholder="${t('section_title_ph')}" value="${app.constructor.escapeHtml ? app.constructor.escapeHtml(initialTitle) : initialTitle}" style="padding: 8px; font-size: 16px; border: 1px solid #ccc; border-radius: 4px;">
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

}

export default ModalsController;
