import { showToast } from './ToastService.js';

const HACKS_DATA = [
    {
        title: "Количественный подход к формуле",
        category: "Базовый",
        icon: "📊",
        badgeColor: "#0284c7",
        badgeBg: "#e0f2fe",
        borderColor: "#2563eb",
        text: "Если сразу сложно понять формулу, то сначала изучите ее количественно, сведите к суммированию, а затем уже изучите качественно."
    },
    {
        title: "Поиск простейшего отношения",
        category: "Диалектика",
        icon: "🔬",
        badgeColor: "#7c3aed",
        badgeBg: "#f3e8ff",
        borderColor: "#7c3aed",
        text: "Найдите элементарную неделимую клеточку процесса — отношение двух элементов, из которого логически разворачивается вся сложная система."
    },
    {
        title: "Выделение противоположностей",
        category: "Метод",
        icon: "🔄",
        badgeColor: "#d97706",
        badgeBg: "#fef3c7",
        borderColor: "#f59e0b",
        text: "Сформулируйте исследуемый процесс и найдите то, что отрицает его сущность, но при этом существует в неразрывном единстве с ним."
    },
    {
        title: "Переход от абстрактного к конкретному",
        category: "Мышление",
        icon: "🧩",
        badgeColor: "#059669",
        badgeBg: "#d1fae5",
        borderColor: "#10b981",
        text: "Начните с самого общего и простого определения. Затем шаг за шагом добавляйте реальные условия, ограничения и взаимосвязи."
    },
    {
        title: "Анализ предельных состояний",
        category: "Лайфхак",
        icon: "⚡",
        badgeColor: "#dc2626",
        badgeBg: "#fee2e2",
        borderColor: "#ef4444",
        text: "Мысленно устремите один из ключевых параметров к нулю или к бесконечности. Как при этом ведёт себя вся система? Что исчезает, а что остаётся?"
    },
    {
        title: "Формула как сценарий процесса",
        category: "Формулы",
        icon: "🧮",
        badgeColor: "#2563eb",
        badgeBg: "#dbeafe",
        borderColor: "#3b82f6",
        text: "Воспринимайте математическую формулу не как застывший набор символов, а как динамический сценарий взаимодействия действующих сил и величин."
    },
    {
        title: "Разрешение, а не компромисс",
        category: "Синтез",
        icon: "💡",
        badgeColor: "#9333ea",
        badgeBg: "#fae8ff",
        borderColor: "#a855f7",
        text: "Синтез не должен быть механической смесью тезиса и антитезиса. Истинный синтез переводит систему на новый уровень, где исходное противоречие снимается."
    }
];

class UnderstandingHacksService {
    static show(block, anchorEl) {
        // Remove any existing hacks modal
        const existing = document.getElementById('hacks-popover-dialog');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'hacks-popover-dialog';
        overlay.className = 'modal-overlay';
        overlay.style.zIndex = '1100';

        const dialog = document.createElement('div');
        dialog.className = 'modal-dialog';
        dialog.style.maxWidth = '460px';
        dialog.style.width = '90%';
        dialog.style.borderRadius = '16px';
        dialog.style.overflow = 'hidden';
        dialog.style.boxShadow = '0 20px 40px rgba(0,0,0,0.18)';
        dialog.style.background = '#ffffff';

        const cardsHTML = HACKS_DATA.map((h, i) => `
            <div class="hack-card-item" data-index="${i}" style="background: #ffffff; border: 1px solid #e2e8f0; border-left: 4px solid ${h.borderColor}; border-radius: 12px; padding: 14px 16px; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                    <strong style="font-size: 0.98rem; font-weight: 700; color: #1e293b; line-height: 1.3;">${h.title}</strong>
                    <span style="background: ${h.badgeBg}; color: ${h.badgeColor}; font-size: 0.78rem; font-weight: 600; padding: 2px 8px; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; margin-left: 8px;">
                        <span>${h.icon}</span> ${h.category}
                    </span>
                </div>
                <p style="margin: 0; font-size: 0.88rem; color: #475569; line-height: 1.5;">${h.text}</p>
            </div>
        `).join('');

        dialog.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; border-bottom: 1px solid #f1f5f9; background: #ffffff;">
                <div style="display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 1.05rem; color: #1e293b;">
                    <span style="font-size: 1.2rem;">💡</span>
                    <span>Хаки понимания</span>
                </div>
                <button class="btn-close-hacks" style="background: none; border: none; font-size: 1.1rem; color: #94a3b8; cursor: pointer; padding: 4px 8px; border-radius: 6px;">✕</button>
            </div>

            <div style="padding: 16px; display: flex; flex-direction: column; gap: 12px; max-height: 420px; overflow-y: auto; background: #fafafa;">
                ${cardsHTML}
            </div>

            <div style="padding: 10px 16px; background: #ffffff; border-top: 1px solid #f1f5f9; text-align: center; font-size: 0.8rem; color: #94a3b8;">
                Нажмите на карточку, чтобы скопировать совет
            </div>
        `;

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        const close = () => {
            if (document.body.contains(overlay)) document.body.removeChild(overlay);
        };

        dialog.querySelector('.btn-close-hacks').addEventListener('click', close);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) close();
        });

        // Bind click to copy on cards
        dialog.querySelectorAll('.hack-card-item').forEach(card => {
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-2px)';
                card.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
            });
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'translateY(0)';
                card.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)';
            });

            card.addEventListener('click', async () => {
                const idx = parseInt(card.dataset.index, 10);
                const hack = HACKS_DATA[idx];
                if (hack) {
                    try {
                        await navigator.clipboard.writeText(`${hack.title}:\n${hack.text}`);
                    } catch {
                        const ta = document.createElement('textarea');
                        ta.value = `${hack.title}:\n${hack.text}`;
                        document.body.appendChild(ta);
                        ta.select();
                        document.execCommand('copy');
                        document.body.removeChild(ta);
                    }
                    showToast('📋 Совет скопирован в буфер');
                    card.style.borderColor = '#10b981';
                    setTimeout(() => {
                        card.style.borderColor = hack.borderColor;
                    }, 1200);
                }
            });
        });
    }
}

export default UnderstandingHacksService;
