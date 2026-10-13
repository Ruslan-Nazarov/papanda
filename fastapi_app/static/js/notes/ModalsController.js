import { t } from '../i18n.js';

class ModalsController {
    static init() {
        console.log('ModalsController Initialized');
    }

    static showSectionTitleModal(app, initialTitle = '', onSave) {
        const m = app.showModal(t('section_title_modal'), `
            <div style="display: flex; flex-direction: column; gap: 10px;">
                <input type="text" id="section-title-input" class="title-input" placeholder="${t('section_title_ph')}" style="padding: 8px; font-size: 16px; border: 1px solid #ccc; border-radius: 4px;">
            </div>
        `);
        
        const input = m.dialog.querySelector('#section-title-input');
        input.value = initialTitle;
        input.focus();

        const submit = () => {
            const title = input.value.trim();
            if (!title) { input.focus(); return; }
            onSave?.(title);
            m.close();
        };
        m.dialog.querySelector('.btn-ok-modal').addEventListener('click', event => {
            // The generic modal also closes on OK; validate and save first.
            event.stopImmediatePropagation();
            submit();
        }, true);
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                submit();
            }
        });
    }

}

export default ModalsController;
