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

/**
 * Smoothly animates the removal of a DOM element (fade out + shrink)
 */
export async function animateItemRemoval(el, callback) {
    if (!el) return;
    
    // 1. Initial fade out and slide
    el.style.transition = 'all 0.3s ease';
    el.style.opacity = '0';
    el.style.transform = 'translateX(10px)';
    
    await new Promise(r => setTimeout(r, 300));
    
    // 2. Shrink height to avoid layout jumps
    el.style.maxHeight = el.offsetHeight + 'px';
    el.style.overflow = 'hidden';
    el.style.paddingTop = '0';
    el.style.paddingBottom = '0';
    el.style.marginTop = '0';
    el.style.marginBottom = '0';
    el.style.borderBottom = 'none';
    
    // Trigger layout reflow
    el.offsetHeight; 
    
    el.style.maxHeight = '0';
    
    await new Promise(r => setTimeout(r, 300));
    
    if (callback) callback();
    else el.remove();
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

/**
 * Formats a UTC ISO string to Russian local time format
 */
export function formatLocalTime(utcString) {
    if (!utcString) return '—';
    try {
        // Ensure we have Z if it's missing to force UTC interpretation
        const dateStr = utcString.includes('Z') || utcString.includes('+') ? utcString : utcString + 'Z';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return utcString;
        return d.toLocaleString('ru-RU', { 
            day: '2-digit', month: '2-digit', year: 'numeric', 
            hour: '2-digit', minute: '2-digit' 
        });
    } catch (e) {
        return utcString;
    }
}

/**
 * Automatically find and convert all .local-time elements
 */
export function applyLocalTimeGlobally() {
    document.querySelectorAll('.local-time').forEach(el => {
        const utc = el.getAttribute('data-utc');
        if (utc) el.textContent = formatLocalTime(utc);
    });
}

// Auto-run on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyLocalTimeGlobally);
} else {
    applyLocalTimeGlobally();
}

window.formatLocalTime = formatLocalTime;
window.applyLocalTimeGlobally = applyLocalTimeGlobally;
