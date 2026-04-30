/**
 * UI Helpers
 * Reusable UI logic, toast notifications, date calculations.
 */

export function showToast(message, type = 'success', duration = 3000) {
    const toast = document.getElementById('toast');
    if (!toast) { 
        if (type === 'error') alert(message); 
        return; 
    }
    toast.textContent = message;
    toast.className = `${type} show`;
    setTimeout(() => { toast.className = (toast.className || '').replace('show', '').trim(); }, duration);
}

export function calculateEndDate(freq, n, startStr, weekdays = []) {
    if (!startStr || freq === 'none') return { label: '', hidden: '' };
    const start = new Date(startStr);
    let end = new Date(start);
    if (freq === 'daily') {
        end.setDate(start.getDate() + n);
    } else if (freq === 'weekly' || freq.startsWith('weekly:')) {
        const daysPerWeek = weekdays.length > 0 ? weekdays.length : 1;
        end.setDate(start.getDate() + Math.ceil(n / daysPerWeek) * 7);
    } else if (freq === 'weekdays') {
        end.setDate(start.getDate() + Math.ceil(n / 5) * 7);
    } else if (freq === 'biweekly') {
        end.setDate(start.getDate() + n * 14);
    } else if (freq === 'monthly') {
        end.setMonth(start.getMonth() + n);
    } else if (freq === 'yearly') {
        end.setFullYear(start.getFullYear() + n);
    }
    const dateStr = end.toISOString().split('T')[0];
    return { label: 'Calculated end date: ' + dateStr, hidden: dateStr };
}
