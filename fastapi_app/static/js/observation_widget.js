/**
 * Observation Widget Controller (Tree Refactoring)
 */

function initTimeSelects() {
    const hours = Array.from({length: 24}, (_, i) => i.toString().padStart(2, '0'));
    const mins = Array.from({length: 60}, (_, i) => i.toString().padStart(2, '0'));
    
    document.querySelectorAll('[id$="Hour"]').forEach(s => {
        if (s.options.length > 0) return;
        hours.forEach(h => s.add(new Option(h, h)));
    });
    document.querySelectorAll('[id$="Min"]').forEach(s => {
        if (s.options.length > 0) return;
        mins.forEach(m => s.add(new Option(m, m)));
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTimeSelects);
} else {
    initTimeSelects();
}

function safeShowToast(msg, type = 'info') {
    if (typeof showToast === 'function') {
        showToast(msg, type);
    } else {
        if (type === 'error') alert(msg);
        else console.log(`[${type.toUpperCase()}] ${msg}`);
    }
}

function handleTimeModeChange(prefix) {
    const p = prefix.charAt(0).toUpperCase() + prefix.slice(1);
    const mode = document.getElementById(`obs${p}TimeMode`)?.value;
    const startGroup = document.getElementById(`obs${p}StartTimeGroup`);
    const hourSelect = document.getElementById(`obs${p}StartHour`);
    const minSelect = document.getElementById(`obs${p}StartMin`);
    
    if (mode === 'none') {
        startGroup?.classList.add('disabled');
        if (hourSelect) hourSelect.disabled = true;
        if (minSelect) minSelect.disabled = true;
    } else {
        startGroup?.classList.remove('disabled');
        if (hourSelect) hourSelect.disabled = false;
        if (minSelect) minSelect.disabled = false;
    }
}

function handleObsCategoryChange(prefix) {
    const p = prefix.charAt(0).toUpperCase() + prefix.slice(1);
    const category = document.getElementById(`obs${p}Category`)?.value;
    const taskGroup = document.getElementById(`obs${p}TaskGroup`);
    
    if (category === 'task') {
        if (taskGroup) taskGroup.style.display = 'block';
        loadActiveTasks(prefix);
    } else {
        if (taskGroup) taskGroup.style.display = 'none';
    }
}

async function loadActiveTasks(prefix, selectedTaskId = null) {
    const p = prefix.charAt(0).toUpperCase() + prefix.slice(1);
    const select = document.getElementById(`obs${p}TaskSelect`);
    if (!select) return;

    try {
        const response = await fetch('/api/observations/active-tasks');
        const tasks = await response.json();
        
        const currentVal = selectedTaskId || select.value;
        select.innerHTML = '<option value="">-- Select a Task --</option>';
        tasks.forEach(task => {
            const opt = new Option(task.name, task.id);
            if (String(task.id) === String(currentVal)) opt.selected = true;
            select.add(opt);
        });
    } catch (e) { console.error(e); }
}

function setSelectTime(prefix, type, timeStr) {
    if (!timeStr) return;
    const [h, m] = timeStr.split(':');
    const hourSelect = document.getElementById(`${prefix}${type}Hour`);
    const minSelect = document.getElementById(`${prefix}${type}Min`);
    if (hourSelect) hourSelect.value = h;
    if (minSelect) minSelect.value = m;
}

function getSelectTime(prefix, type) {
    const hourEl = document.getElementById(`${prefix}${type}Hour`);
    const minEl = document.getElementById(`${prefix}${type}Min`);
    if (!hourEl || !minEl) return "00:00";
    return `${hourEl.value || '00'}:${minEl.value || '00'}`;
}

async function deleteObs(id) {
    const confirmed = await window.NotificationService.confirm('Remove this activity from the tree?', {
        isDanger: true,
        okText: 'Remove'
    });
    if (!confirmed) return;
    try {
        const response = await fetch(`/api/observations/${id}`, { method: 'DELETE' });
        if (response.ok) {
            document.querySelector(`.tree-item[data-id="${id}"]`)?.remove();
            safeShowToast('✓ Removed', 'success');
        }
    } catch (e) { console.error(e); }
}

function openObsAddModal() {
    const textEl = document.getElementById('obsAddText');
    if (textEl) textEl.value = '';
    
    const now = new Date();
    const h = now.getHours().toString().padStart(2, '0');
    const m = now.getMinutes().toString().padStart(2, '0');
    setSelectTime('obsAdd', 'Start', `${h}:${m}`);

    const catEl = document.getElementById('obsAddCategory');
    if (catEl) {
        catEl.value = 'task';
        handleObsCategoryChange('add');
    }
    
    const modeEl = document.getElementById('obsAddTimeMode');
    if (modeEl) {
        modeEl.value = 'exact';
        handleTimeModeChange('add');
    }
    
    document.querySelectorAll('.obs-weekdays-add .weekday-circle-edit').forEach(circle => {
        circle.classList.remove('active');
    });
    
    const modal = document.getElementById('obsAddModal');
    if (modal) modal.style.display = 'flex';
}

function closeObsAddModal() {
    const modal = document.getElementById('obsAddModal');
    if (modal) modal.style.display = 'none';
}

function toggleAddDay(circle) { circle.classList.toggle('active'); }
function toggleEditDay(circle) { circle.classList.toggle('active'); }

async function saveObsAdd() {
    try {
        const titleEl = document.getElementById('obsAddText');
        const text = titleEl ? titleEl.value.trim() : '';
        if (!text) { safeShowToast('Title is required', 'error'); return; }

        const mode = document.getElementById('obsAddTimeMode')?.value || 'exact';
        const category = document.getElementById('obsAddCategory')?.value || 'other';
        const taskSelect = document.getElementById('obsAddTaskSelect');
        const taskIdStr = (category === 'task' && taskSelect) ? taskSelect.value : null;
        const taskId = taskIdStr ? parseInt(taskIdStr) : null;

        if (category === 'task' && !taskId) {
            safeShowToast('Please select a linked task', 'error');
            return;
        }

        const doneDays = Array.from(document.querySelectorAll('.obs-weekdays-add .weekday-circle-edit.active'))
                             .map(c => parseInt(c.dataset.day));

        const data = {
            text: text,
            created_at: getSelectTime('obsAdd', 'Start'),
            task_id: taskId,
            no_time: (mode === 'none'),
            done_days: doneDays
        };

        const response = await fetch('/api/observations/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            location.reload();
        } else {
            const err = await response.json();
            safeShowToast(err.detail || 'Save failed', 'error');
        }
    } catch (e) { console.error(e); safeShowToast('System error', 'error'); }
}

function openObsEditModalFromTree(id) {
    const el = document.querySelector(`.tree-item[data-id="${id}"]`);
    if (!el) return;

    const idEl = document.getElementById('obsEditId');
    const textEl = document.getElementById('obsEditText');
    if (idEl) idEl.value = id;
    if (textEl) textEl.value = el.dataset.text;
    
    setSelectTime('obsEdit', 'Start', el.dataset.time);

    const taskId = el.dataset.taskId;
    const catEl = document.getElementById('obsEditCategory');
    if (catEl) {
        catEl.value = taskId ? 'task' : 'other';
        handleObsCategoryChange('edit');
        if (taskId) loadActiveTasks('edit', taskId);
    }
    
    const modeEl = document.getElementById('obsEditTimeMode');
    if (modeEl) {
        modeEl.value = (el.dataset.noTime === 'true') ? 'none' : 'exact';
        handleTimeModeChange('edit');
    }
    
    const doneDays = JSON.parse(el.dataset.doneDays || '[]');
    document.querySelectorAll('.obs-weekdays-edit .weekday-circle-edit').forEach(circle => {
        circle.classList.toggle('active', doneDays.includes(parseInt(circle.dataset.day)));
    });

    const modal = document.getElementById('obsEditModal');
    if (modal) modal.style.display = 'flex';
}

function closeObsEditModal() {
    const modal = document.getElementById('obsEditModal');
    if (modal) modal.style.display = 'none';
}

async function saveObsEdit() {
    try {
        const id = document.getElementById('obsEditId')?.value;
        const text = document.getElementById('obsEditText')?.value.trim();
        if (!text || !id) return;

        const mode = document.getElementById('obsEditTimeMode')?.value || 'exact';
        const category = document.getElementById('obsEditCategory')?.value || 'other';
        const taskSelect = document.getElementById('obsEditTaskSelect');
        const taskIdStr = (category === 'task' && taskSelect) ? taskSelect.value : null;
        const taskId = taskIdStr ? parseInt(taskIdStr) : null;

        const doneDays = Array.from(document.querySelectorAll('.obs-weekdays-edit .weekday-circle-edit.active'))
                             .map(c => parseInt(c.dataset.day));

        const data = {
            text: text,
            created_at: getSelectTime('obsEdit', 'Start'),
            task_id: taskId,
            no_time: (mode === 'none'),
            done_days: doneDays
        };

        const response = await fetch(`/api/observations/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (response.ok) {
            location.reload();
        } else {
            const err = await response.json();
            safeShowToast(err.detail || 'Update failed', 'error');
        }
    } catch (e) { console.error(e); safeShowToast('System error', 'error'); }
}

// Global exposure
window.openObsAddModal = openObsAddModal;
window.closeObsAddModal = closeObsAddModal;
window.saveObsAdd = saveObsAdd;
window.openObsEditModalFromTree = openObsEditModalFromTree;
window.closeObsEditModal = closeObsEditModal;
window.saveObsEdit = saveObsEdit;
window.deleteObs = deleteObs;
window.handleTimeModeChange = handleTimeModeChange;
window.handleObsCategoryChange = handleObsCategoryChange;
window.toggleAddDay = toggleAddDay;
window.toggleEditDay = toggleEditDay;

async function openObsOverviewModal() {
    const modal = document.getElementById('obsOverviewModal');
    const body = document.getElementById('obsOverviewBody');
    if (!modal || !body) return;

    modal.style.display = 'flex';
    body.innerHTML = '<div class="loading-spinner">Loading full tree...</div>';

    try {
        const response = await fetch('/api/observations/full-tree');
        if (response.ok) {
            body.innerHTML = await response.text();
        } else {
            body.innerHTML = '<div style="color:var(--color-danger);">Failed to load tree.</div>';
        }
    } catch (e) {
        console.error(e);
        body.innerHTML = '<div style="color:var(--color-danger);">Error loading tree.</div>';
    }
}

function closeObsOverviewModal() {
    const modal = document.getElementById('obsOverviewModal');
    if (modal) modal.style.display = 'none';
}

window.openObsOverviewModal = openObsOverviewModal;
window.closeObsOverviewModal = closeObsOverviewModal;
