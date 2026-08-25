import AppState from './AppState.js';
import BlockDOMRenderer from './BlockDOMRenderer.js';
import DialogService from './DialogService.js';

class FooterModalsService {
    static showTraining(app) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';

        const dialog = document.createElement('div');
        dialog.className = 'modal-dialog training-modal';
        dialog.style.maxWidth = '520px';
        dialog.style.width = '90%';

        dialog.innerHTML = `
            <div class="modal-dialog-header">
                <h2 style="display: flex; align-items: center; gap: 8px; font-size: 1.25rem; font-weight: 700; color: #1e293b;">
                    <span>🎓</span>
                    <span>Обучение</span>
                </h2>
                <button class="icon-btn btn-close-modal">✕</button>
            </div>
            <div class="modal-dialog-body" style="padding: 20px; display: flex; flex-direction: column; gap: 18px; max-height: 75vh; overflow-y: auto;">
                
                <!-- Section 1: Конспекты -->
                <div>
                    <div style="font-size: 0.8rem; font-weight: 700; color: #f97316; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">
                        <span>📝</span> КОНСПЕКТЫ
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        <div class="training-card" id="train-method" style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; cursor: pointer; display: flex; align-items: center; gap: 14px; transition: all 0.2s;">
                            <span style="font-size: 1.6rem;">📖</span>
                            <div>
                                <div style="font-weight: 700; color: #1e293b; font-size: 1rem;">Метод</div>
                                <div style="color: #64748b; font-size: 0.85rem; margin-top: 2px;">Пошаговая инструкция по методу диалектического конспекта</div>
                            </div>
                        </div>

                        <div class="training-card" id="train-example" style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; cursor: pointer; display: flex; align-items: center; gap: 14px; transition: all 0.2s;">
                            <span style="font-size: 1.6rem;">💡</span>
                            <div>
                                <div style="font-weight: 700; color: #1e293b; font-size: 1rem;">Пример</div>
                                <div style="color: #64748b; font-size: 0.85rem; margin-top: 2px;">Загрузить демонстрационный готовый разбор проблемы</div>
                            </div>
                        </div>

                        <div class="training-card" id="train-guide" style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; cursor: pointer; display: flex; align-items: center; gap: 14px; transition: all 0.2s;">
                            <span style="font-size: 1.6rem;">🗂</span>
                            <div>
                                <div style="font-weight: 700; color: #1e293b; font-size: 1rem;">Руководство по всем функциям</div>
                                <div style="color: #64748b; font-size: 0.85rem; margin-top: 2px;">Справочник по интерфейсу и функциям приложения</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Section 2: Видеоуроки -->
                <div>
                    <div style="font-size: 0.8rem; font-weight: 700; color: #f97316; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">
                        <span>📺</span> ВИДЕОУРОКИ
                    </div>
                    <div class="training-card" id="train-youtube" style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; cursor: pointer; display: flex; align-items: center; gap: 14px; transition: all 0.2s;">
                        <span style="font-size: 1.6rem; color: #ef4444;">▶️</span>
                        <div>
                            <div style="font-weight: 700; color: #1e293b; font-size: 1rem;">YouTube-плейлист</div>
                            <div style="color: #64748b; font-size: 0.85rem; margin-top: 2px;">Смотреть подробные видеоуроки по работе с системой</div>
                        </div>
                    </div>
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

        dialog.querySelector('#train-example').addEventListener('click', () => {
            AppState.setNote({
                id: null,
                title: 'Демонстрационный пример: Диалектика мышления',
                blocks: [
                    {
                        id: 'demo-b1',
                        side: 'left',
                        role: 'anchor',
                        title: 'Что нужно понять?',
                        html: '<p>Как развивается мышление через противоречия?</p>',
                        status: 'ready'
                    },
                    {
                        id: 'demo-b2',
                        side: 'left',
                        role: 'step1',
                        title: 'Тезис: Накопление фактов',
                        html: '<p>Первичный процесс — сбор эмпирических данных и наблюдений.</p>',
                        status: 'ready'
                    },
                    {
                        id: 'demo-b3',
                        side: 'right',
                        role: 'step2',
                        title: 'Антитезис: Критика и сомнение',
                        html: '<p>Факты противоречат друг другу, требуя критического переосмысления.</p>',
                        status: 'ready'
                    },
                    {
                        id: 'demo-b4',
                        side: 'center',
                        role: 'step5',
                        title: 'Синтез: Новая теория',
                        html: '<p>Формирование целостной концепции, разрешающей противоречия.</p>',
                        status: 'ready'
                    }
                ]
            });
            BlockDOMRenderer.renderAll();
            close();
        });

        dialog.querySelector('#train-method').addEventListener('click', () => {
            DialogService.alert('Метод конспекта', 'Метод диалектического конспекта: разделите изучаемый предмет на противоположные процессы (Тезис / Антитезис) и найдите их разрешение в Синтезе.', { icon: '🎓' });
        });

        dialog.querySelector('#train-guide').addEventListener('click', () => {
            DialogService.alert('Руководство', 'Руководство по функциям: используйте две колонки для фиксации противоречий, плавающие парсеры для формул и статей, и сохраняйте версии.', { icon: '📖' });
        });

        dialog.querySelector('#train-youtube').addEventListener('click', () => {
            window.open('https://youtube.com', '_blank');
        });
    }

    static showAbout(app) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';

        const dialog = document.createElement('div');
        dialog.className = 'modal-dialog about-modal';
        dialog.style.maxWidth = '500px';
        dialog.style.width = '90%';

        dialog.innerHTML = `
            <div class="modal-dialog-header">
                <h2 style="font-size: 1.2rem; font-weight: 700; color: #1e293b;">О проекте</h2>
                <button class="icon-btn btn-close-modal">✕</button>
            </div>
            <div class="modal-dialog-body" style="padding: 20px; font-size: 0.95rem; line-height: 1.6; color: #334155;">
                <p><strong>papanda</strong> — среда для создания структурированных диалектических конспектов, выявления противоположностей и синтеза знаний.</p>
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
                    <span>История изменений</span>
                </h2>
                <button class="icon-btn btn-close-modal">✕</button>
            </div>
            <div class="modal-dialog-body" style="padding: 20px; font-size: 0.95rem; line-height: 1.6; color: #334155; max-height: 400px; overflow-y: auto;">
                <div style="color: #64748b;">
                    Загрузка...
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
                dialog.querySelector('.modal-dialog-body').innerHTML = `<pre style="white-space: pre-wrap; font-family: inherit;">${text}</pre>`;
            })
            .catch(() => {
                dialog.querySelector('.modal-dialog-body').innerHTML = '<div style="color: #64748b;">Changelog not found.</div>';
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
                    <span>Написать разработчику</span>
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
                        <div style="color: #0c4a6e; font-size: 0.9rem; margin-top: 2px;">@ruslan_nazarov (Быстрый ответ)</div>
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
                        <div style="color: #7f1d1d; font-size: 0.9rem; margin-top: 2px;">runaz2007@gmail.com (Подробные письма)</div>
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
