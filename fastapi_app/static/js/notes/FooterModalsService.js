import { t } from '../i18n.js';
class FooterModalsService {

    static showAbout(app) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';

        const dialog = document.createElement('div');
        dialog.className = 'modal-dialog about-modal';
        dialog.style.maxWidth = '500px';
        dialog.style.width = '90%';

        dialog.innerHTML = `
            <div class="modal-dialog-header">
                <h2 style="font-size: 1.2rem; font-weight: 700; color: #1e293b;">${t('about_title')}</h2>
                <button class="icon-btn btn-close-modal">✕</button>
            </div>
            <div class="modal-dialog-body" style="padding: 20px; font-size: 0.95rem; line-height: 1.6; color: #334155;">
                <p>${t('about_body')}</p>
                <div style="margin-top: 14px; padding: 12px; background: #f8fafc; border-radius: 8px; font-size: 0.85rem; color: #64748b;">
                    designed and developed by <strong>ruslan nazarov</strong><br>
                    License: <strong>CC BY-NC 4.0</strong>
                </div>
            </div>
        `;

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        const close = () => {
            if (document.body.contains(overlay)) document.body.removeChild(overlay);
        };
        dialog.querySelector('.btn-close-modal').addEventListener('click', close);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) close();
        });
    }

    static showChangelog(app) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';

        const dialog = document.createElement('div');
        dialog.className = 'modal-dialog changelog-modal';
        dialog.style.maxWidth = '520px';
        dialog.style.width = '90%';

        dialog.innerHTML = `
            <div class="modal-dialog-header">
                <h2 style="display: flex; align-items: center; gap: 8px; font-size: 1.2rem; font-weight: 700; color: #1e293b;">
                    <span>📝</span>
                    <span>${t('changelog_title')}</span>
                </h2>
                <button class="icon-btn btn-close-modal">✕</button>
            </div>
            <div class="modal-dialog-body" style="padding: 20px; font-size: 0.95rem; line-height: 1.6; color: #334155; max-height: 400px; overflow-y: auto;">
                <div style="color: #64748b;">
                    ${t('changelog_loading')}
                </div>
            </div>
        `;

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        fetch('/api/changelog')
            .then(res => {
                if (!res.ok) throw new Error('Not found');
                return res.text();
            })
            .then(text => {
                const pre = document.createElement('pre');
                pre.style.cssText = 'white-space:pre-wrap;font-family:inherit';
                pre.textContent = text;
                dialog.querySelector('.modal-dialog-body').replaceChildren(pre);
            })
            .catch(() => {
                dialog.querySelector('.modal-dialog-body').innerHTML = `<div style="color: #64748b;">${t('changelog_not_found')}</div>`;
            });

        const close = () => {
            if (document.body.contains(overlay)) document.body.removeChild(overlay);
        };
        dialog.querySelector('.btn-close-modal').addEventListener('click', close);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) close();
        });
    }

    static showContact(app) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';

        const dialog = document.createElement('div');
        dialog.className = 'modal-dialog contact-modal';
        dialog.style.maxWidth = '460px';
        dialog.style.width = '90%';

        dialog.innerHTML = `
            <div class="modal-dialog-header">
                <h2 style="display: flex; align-items: center; gap: 8px; font-size: 1.2rem; font-weight: 700; color: #1e293b;">
                    <span>💬</span>
                    <span>${t('contact_title')}</span>
                </h2>
                <button class="icon-btn btn-close-modal">✕</button>
            </div>
            <div class="modal-dialog-body" style="padding: 20px; display: flex; flex-direction: column; gap: 12px;">
                
                <!-- Telegram card -->
                <a href="https://t.me/ruslan_nazarov" target="_blank" class="contact-card" style="text-decoration: none; background: #e0f2fe; border: 1px solid #bae6fd; border-radius: 12px; padding: 14px 16px; display: flex; align-items: center; gap: 14px; transition: all 0.2s;">
                    <div style="width: 42px; height: 42px; border-radius: 50%; background: #0284c7; color: white; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style="margin-right: 2px; margin-top: 1px;">
                            <path d="M21.926 3.197a1.268 1.268 0 0 0-1.309-.234L2.482 10.155c-.865.347-.853 1.565.018 1.902l4.982 1.93 1.93 4.982c.337.871 1.555.883 1.902.018l7.192-18.135a1.268 1.268 0 0 0-.581-1.655zM9.61 13.292l6.23-5.362-7.53 4.364 1.3 1z" fill="white"/>
                            <path d="M12.01 15.692l1.58 4.077 5.76-14.52-7.34 10.443z" fill="white" opacity="0.85"/>
                        </svg>
                    </div>
                    <div>
                        <div style="font-weight: 700; color: #0369a1; font-size: 1.05rem;">Telegram</div>
                        <div style="color: #0c4a6e; font-size: 0.9rem; margin-top: 2px;">@ruslan_nazarov (${t('contact_tg_note')})</div>
                    </div>
                </a>

                <!-- Email card -->
                <a href="mailto:runaz2007@gmail.com" class="contact-card" style="text-decoration: none; background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 14px 16px; display: flex; align-items: center; gap: 14px; transition: all 0.2s;">
                    <div style="width: 42px; height: 42px; border-radius: 50%; background: #dc2626; color: white; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                            <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                        </svg>
                    </div>
                    <div>
                        <div style="font-weight: 700; color: #b91c1c; font-size: 1.05rem;">Email</div>
                        <div style="color: #7f1d1d; font-size: 0.9rem; margin-top: 2px;">runaz2007@gmail.com (${t('contact_email_note')})</div>
                    </div>
                </a>

            </div>
        `;

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        const close = () => {
            if (document.body.contains(overlay)) document.body.removeChild(overlay);
        };
        dialog.querySelector('.btn-close-modal').addEventListener('click', close);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) close();
        });
    }
}

export default FooterModalsService;
