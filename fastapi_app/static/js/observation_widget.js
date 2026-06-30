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
            if (typeof closeObsEditModal === 'function') closeObsEditModal();
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
            safeShowToast('✓ Activity saved successfully', 'success');
            closeObsAddModal();
            refreshDashboardObservations();
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
            safeShowToast('✓ Activity updated successfully', 'success');
            closeObsEditModal();
            refreshDashboardObservations();
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

async function refreshDashboardObservations() {
    const widget = document.querySelector('.observation-widget');
    if (!widget) return;
    try {
        const response = await fetch('/api/dashboard/widget/observations', { cache: 'no-store' });
        if (response.ok) {
            const html = await response.text();
            const temp = document.createElement('div');
            temp.innerHTML = html;
            const newWidget = temp.querySelector('.observation-widget');
            if (newWidget) {
                widget.innerHTML = newWidget.innerHTML;
                setTimeout(scrollToCurrentTime, 100);
            }
        }
    } catch (e) { console.error('Failed to refresh dashboard observations', e); }
}

async function switchObservationSet(setId) {
    try {
        const res = await fetch(`/api/observations/sets/${setId}/activate`, { method: 'POST' });
        if (res.ok) {
            await refreshDashboardObservations();
            safeShowToast('Набор переключен');
        } else {
            safeShowToast('Ошибка при переключении набора', 'error');
        }
    } catch (e) {
        console.error('Switch set error:', e);
        safeShowToast('Ошибка сети', 'error');
    }
}

function openCreateObservationSetModal() {
    let modal = document.getElementById('customCreateSetModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'customCreateSetModal';
        modal.className = 'modal premium-modal';
        modal.style.cssText = 'display: flex; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 1000000; align-items: center; justify-content: center; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);';
        modal.innerHTML = `
            <div class="modal-content premium-card" style="max-width: 440px; width: 90%; border-radius: 24px; padding: 0; overflow: hidden; background: var(--color-bg-card, #fff); box-shadow: 0 25px 50px rgba(0,0,0,0.25); border: 1px solid var(--color-border-light, #eee);">
                <div class="modal-header" style="padding: 20px 24px; background: var(--color-bg-subtle, #f8f9fa); border-bottom: 1px solid var(--color-border-light, #eee); display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0; font-size: 1.15em; font-weight: 600; color: var(--color-text-main, #222);">📁 Создать набор активностей</h3>
                    <button type="button" onclick="closeCreateObservationSetModal()" style="background: none; border: none; font-size: 1.3em; cursor: pointer; color: var(--color-text-muted, #888);">✕</button>
                </div>
                <div class="modal-body" style="padding: 24px;">
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; font-size: 0.9em; margin-bottom: 8px; font-weight: 500; color: var(--color-text-main, #333);">Название набора</label>
                        <input type="text" id="newObservationSetNameInput" class="form-control" placeholder="Например: Выходные, Отпуск, Будни" style="width: 100%; padding: 12px 14px; border-radius: 10px; border: 1px solid var(--color-border, #ccc); font-size: 0.95em; outline: none; box-sizing: border-box; background: var(--color-bg-main, #fff); color: var(--color-text-main, #222);">
                    </div>
                    <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 0.9em; color: var(--color-text-main, #444); user-select: none;">
                        <input type="checkbox" id="cloneObservationSetCheckbox" style="width: 18px; height: 18px; cursor: pointer; accent-color: var(--color-primary, #3b82f6);">
                        <span>Скопировать текущие активности в новый набор</span>
                    </label>
                </div>
                <div class="modal-footer" style="padding: 16px 24px; background: var(--color-bg-subtle, #f8f9fa); border-top: 1px solid var(--color-border-light, #eee); display: flex; justify-content: flex-end; gap: 12px;">
                    <button type="button" class="btn btn-secondary" style="padding: 10px 18px; border-radius: 10px; font-weight: 500; cursor: pointer; border: 1px solid var(--color-border, #ccc); background: var(--color-bg-card, #fff); color: var(--color-text-main, #333);" onclick="closeCreateObservationSetModal()">Отмена</button>
                    <button type="button" class="btn btn-primary" style="padding: 10px 20px; border-radius: 10px; font-weight: 500; cursor: pointer; background: var(--color-primary, #3b82f6); color: #fff; border: none; box-shadow: 0 4px 12px rgba(59,130,246,0.3);" onclick="submitCreateObservationSet()">Создать</button>
                </div>
            </div>
        `;
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeCreateObservationSetModal();
        });
        document.body.appendChild(modal);
        
        const input = document.getElementById('newObservationSetNameInput');
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') submitCreateObservationSet();
            if (e.key === 'Escape') closeCreateObservationSetModal();
        });
    }
    document.getElementById('newObservationSetNameInput').value = '';
    document.getElementById('cloneObservationSetCheckbox').checked = false;
    modal.style.display = 'flex';
    setTimeout(() => document.getElementById('newObservationSetNameInput').focus(), 50);
}

function closeCreateObservationSetModal() {
    const modal = document.getElementById('customCreateSetModal');
    if (modal) modal.style.display = 'none';
}

function submitCreateObservationSet() {
    const input = document.getElementById('newObservationSetNameInput');
    const name = input ? input.value.trim() : '';
    if (!name) {
        safeShowToast('Введите название набора', 'error');
        if (input) input.focus();
        return;
    }
    const clone = document.getElementById('cloneObservationSetCheckbox')?.checked || false;
    
    fetch('/api/observations/sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name, clone: clone })
    })
    .then(r => r.json())
    .then(data => {
        if (data.status === 'success') {
            closeCreateObservationSetModal();
            safeShowToast('Набор создан и активирован');
            refreshDashboardObservations();
        } else {
            safeShowToast('Ошибка при создании набора', 'error');
        }
    })
    .catch(e => {
        console.error('Create set error:', e);
        safeShowToast('Ошибка сети', 'error');
    });
}

window.refreshDashboardObservations = refreshDashboardObservations;
window.switchObservationSet = switchObservationSet;
window.openCreateObservationSetModal = openCreateObservationSetModal;
window.closeCreateObservationSetModal = closeCreateObservationSetModal;
window.submitCreateObservationSet = submitCreateObservationSet;

function scrollToCurrentTime() {
    const container = document.querySelector('.observation-tree-container');
    if (!container) return;

    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();

    const items = Array.from(document.querySelectorAll('.observation-widget .tree-item[data-no-time="false"]'));
    if (items.length === 0) return;

    let targetItem = null;
    let firstFutureItem = null;

    for (const item of items) {
        const timeStr = item.dataset.time;
        if (!timeStr) continue;
        const [h, m] = timeStr.split(':').map(Number);
        const itemMins = h * 60 + m;
        
        if (itemMins <= currentMins) {
            targetItem = item;
        } else if (!firstFutureItem) {
            firstFutureItem = item;
        }
    }

    if (!targetItem) {
        targetItem = firstFutureItem;
    }

    if (targetItem) {
        // Only scroll the widget container, not the whole page
        const scrollContainer = targetItem.closest('.widget-body') || container;
        if (scrollContainer) {
            const itemTop = targetItem.offsetTop;
            const containerHeight = scrollContainer.clientHeight;
            const itemHeight = targetItem.clientHeight;
            
            scrollContainer.scrollTo({
                top: itemTop - (containerHeight / 2) + (itemHeight / 2),
                behavior: 'smooth'
            });
        }
        
        const card = targetItem.querySelector('.tree-card');
        if (card) {
            card.style.transition = 'box-shadow 0.5s ease';
            card.style.boxShadow = '0 0 0 2px var(--color-primary)';
            setTimeout(() => {
                card.style.boxShadow = '';
            }, 2000);
        }
    }
}

window.scrollToCurrentTime = scrollToCurrentTime;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(scrollToCurrentTime, 500));
} else {
    setTimeout(scrollToCurrentTime, 500);
}

