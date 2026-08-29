import AppState from './AppState.js';
import { showToast } from './ToastService.js';

export class BlockColorPicker {
    static open(block, buttonEl, div) {
        const existing = document.getElementById('block-color-picker-popover');
        if (existing) {
            existing.remove();
            return;
        }

        const colors = [
            { name: 'Синий', color: '#3b82f6' },
            { name: 'Фиолетовый', color: '#8b5cf6' },
            { name: 'Изумрудный', color: '#10b981' },
            { name: 'Оранжевый', color: '#f97316' },
            { name: 'Янтарный', color: '#f59e0b' },
            { name: 'Розовый', color: '#ec4899' },
            { name: 'Красный', color: '#ef4444' },
            { name: 'Бирюзовый', color: '#06b6d4' },
            { name: 'Серый', color: '#64748b' }
        ];

        const rect = buttonEl.getBoundingClientRect();
        const popover = document.createElement('div');
        popover.id = 'block-color-picker-popover';
        popover.style.position = 'absolute';
        popover.style.top = `${rect.bottom + window.scrollY + 6}px`;
        popover.style.left = `${Math.max(10, rect.left + window.scrollX - 80)}px`;
        popover.style.background = '#ffffff';
        popover.style.border = '1px solid #e2e8f0';
        popover.style.borderRadius = '12px';
        popover.style.boxShadow = '0 10px 25px rgba(0,0,0,0.12)';
        popover.style.padding = '10px 12px';
        popover.style.zIndex = '1200';
        popover.style.display = 'flex';
        popover.style.flexDirection = 'column';
        popover.style.gap = '8px';
        popover.style.width = '180px';

        const colorGrid = colors.map(c => `
            <button class="color-dot-btn" data-color="${c.color}" title="${c.name}" style="width: 22px; height: 22px; border-radius: 50%; background: ${c.color}; border: 2px solid ${block.border_color === c.color ? '#1e293b' : 'transparent'}; cursor: pointer; transition: transform 0.15s;"></button>
        `).join('');

        popover.innerHTML = `
            <div style="font-size: 0.78rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Цвет рамки</div>
            <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px;">
                ${colorGrid}
            </div>
            <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid #f1f5f9; padding-top: 6px; margin-top: 2px;">
                <span style="font-size: 0.75rem; color: #94a3b8;">Свой цвет:</span>
                <input type="color" id="custom-block-color-picker" value="${block.border_color || '#3b82f6'}" style="width: 26px; height: 26px; border: none; border-radius: 4px; cursor: pointer; padding: 0; background: transparent;">
            </div>
        `;

        document.body.appendChild(popover);

        const close = (e) => {
            if (!popover.contains(e.target) && e.target !== buttonEl) {
                popover.remove();
                document.removeEventListener('click', close);
            }
        };
        setTimeout(() => document.addEventListener('click', close), 10);

        popover.querySelectorAll('.color-dot-btn').forEach(btn => {
            btn.addEventListener('mouseenter', () => btn.style.transform = 'scale(1.2)');
            btn.addEventListener('mouseleave', () => btn.style.transform = 'scale(1)');
            btn.addEventListener('click', () => {
                const color = btn.dataset.color;
                block.border_color = color;
                AppState.updateBlock(block.id, { border_color: color });
                div.style.borderLeftColor = color;
                showToast('Цвет рамки изменён');
                popover.remove();
            });
        });

        const customPicker = popover.querySelector('#custom-block-color-picker');
        if (customPicker) {
            customPicker.addEventListener('input', (e) => {
                const color = e.target.value;
                block.border_color = color;
                AppState.updateBlock(block.id, { border_color: color });
                div.style.borderLeftColor = color;
            });
            customPicker.addEventListener('change', () => {
                showToast('Цвет рамки изменён');
                popover.remove();
            });
        }
    }
}

export default BlockColorPicker;
