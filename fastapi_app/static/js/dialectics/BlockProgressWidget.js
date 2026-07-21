/**
 * BlockProgressWidget.js - Обновление виджета прогресса по блокам на холсте
 */
export const BlockProgressWidget = {
    update(blocks) {
        const container = document.getElementById('noteProgressWidget');
        if (!container) return;

        const nonSections = (blocks || []).filter(b => b && !b.isSection && b.side !== 'section' && b.role !== 'anchor');
        const total = nonSections.length;
        const ready = nonSections.filter(b => b.status === 'ready').length;
        const working = nonSections.filter(b => b.status === 'in_progress').length;

        const readyCountEl = document.getElementById('noteProgressReadyCount');
        const workingCountEl = document.getElementById('noteProgressWorkingCount');
        const totalCountEl = document.getElementById('noteProgressTotalCount');
        const percentEl = document.getElementById('noteProgressPercent');
        const readyBar = document.getElementById('noteProgressReadyBar');
        const workingBar = document.getElementById('noteProgressWorkingBar');

        if (readyCountEl) readyCountEl.innerText = ready;
        if (workingCountEl) workingCountEl.innerText = working;
        if (totalCountEl) totalCountEl.innerText = total;

        if (total === 0) {
            container.style.opacity = '0.5';
            if (percentEl) percentEl.innerText = '0%';
            if (readyBar) readyBar.style.width = '0%';
            if (workingBar) workingBar.style.width = '0%';
            return;
        }

        container.style.opacity = '1';
        const readyPercent = (ready / total) * 100;
        const workingPercent = (working / total) * 100;

        if (percentEl) {
            percentEl.innerText = Math.round(readyPercent) + '%';
        }
        if (readyBar) {
            readyBar.style.width = `${readyPercent}%`;
        }
        if (workingBar) {
            workingBar.style.width = `${workingPercent}%`;
        }
    }
};
