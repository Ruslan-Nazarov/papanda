/**
 * Observation Widget Controller
 * Manages the Activity Tree timeline, modals, and persistence.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Logic to handle Activity Tree Overview persistence
    if (sessionStorage.getItem('reopenObsOverview') === 'true') {
        openObsOverviewModal();
        sessionStorage.removeItem('reopenObsOverview');
    }
    
    // Initialize all time selects
    const hours = Array.from({length: 24}, (_, i) => i.toString().padStart(2, '0'));
    const mins = Array.from({length: 60}, (_, i) => i.toString().padStart(2, '0'));
    
    document.querySelectorAll('[id$="Hour"]').forEach(s => {
        hours.forEach(h => s.add(new Option(h, h)));
    });
    document.querySelectorAll('[id$="Min"]').forEach(s => {
        mins.forEach(m => s.add(new Option(m, m)));
    });
});

let isEditingFromOverview = false;

function handleTimeModeChange(prefix) {
    const mode = document.getElementById(`obs${prefix.charAt(0).toUpperCase() + prefix.slice(1)}TimeMode`).value;
    const startGroup = document.getElementById(`obs${prefix.charAt(0).toUpperCase() + prefix.slice(1)}StartTimeGroup`);
    const endGroup = document.getElementById(`obs${prefix.charAt(0).toUpperCase() + prefix.slice(1)}EndTimeGroup`);
    
    if (mode === 'none') {
        if (startGroup) startGroup.classList.add('disabled');
        if (endGroup) endGroup.classList.add('disabled');
    } else if (mode === 'exact') {
        if (startGroup) startGroup.classList.remove('disabled');
        if (endGroup) endGroup.classList.add('disabled');
    } else {
        if (startGroup) startGroup.classList.remove('disabled');
        if (endGroup) endGroup.classList.remove('disabled');
    }
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
    return `${hourEl.value}:${minEl.value}`;
}

async function logObservation(btn) {
    const id = btn.dataset.id;
    try {
        const response = await fetch(`/api/observations/${id}/log`, {
            method: 'POST'
        });
        if (response.ok) {
            if (typeof showToast === 'function') showToast('✓ Logged for today!', 'success');
            setTimeout(() => location.reload(), 500);
        }
    } catch (e) { console.error(e); }
}

async function deleteObs(btn) {
    const confirmed = await (typeof customConfirm === 'function' ? customConfirm({
        title: 'Remove Activity',
        message: 'Are you sure you want to remove this core activity entirely?',
        buttons: [
            { label: 'Cancel', value: false, class: 'confirm-btn-secondary' },
            { label: 'Remove', value: true, class: 'confirm-btn-danger' }
        ]
    }) : Promise.resolve(confirm('Are you sure?')));
    
    if (!confirmed) return;
    
    const id = btn.dataset.id;
    try {
        const response = await fetch(`/api/observations/${id}`, { method: 'DELETE' });
        if (response.ok) {
            btn.closest('.obs-item').remove();
            if (typeof showToast === 'function') showToast('✓ Removed', 'success');
        }
    } catch (e) { console.error(e); }
}

function openObsAddModal() {
    isEditingFromOverview = false;
    // Reset fields
    const textEl = document.getElementById('obsAddText');
    if (textEl) textEl.value = '';
    
    const now = new Date();
    const h = now.getHours().toString().padStart(2, '0');
    const m = now.getMinutes().toString().padStart(2, '0');
    
    setSelectTime('obsAdd', 'Start', `${h}:${m}`);
    setSelectTime('obsAdd', 'End', `${h}:${m}`);

    const addImp = document.getElementById('obsAddImportant');
    const addEx = document.getElementById('obsAddExcess');
    if (addImp) addImp.checked = true;
    if (addEx) addEx.checked = false;
    
    const modeEl = document.getElementById('obsAddTimeMode');
    if (modeEl) {
        modeEl.value = 'period';
        handleTimeModeChange('add');
    }
    
    // Reset days
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

function toggleAddDay(circle) {
    circle.classList.toggle('active');
}
function toggleEditDay(circle) {
    circle.classList.toggle('active');
}

async function saveObsAdd() {
    try {
        const textEl = document.getElementById('obsAddText');
        const text = textEl ? textEl.value.trim() : '';
        
        if (!text) { 
            if (typeof showToast === 'function') showToast('Title is required', 'error');
            return; 
        }
        
        const modeEl = document.getElementById('obsAddTimeMode');
        const mode = modeEl ? modeEl.value : 'period';
        
        const doneDays = [];
        document.querySelectorAll('.obs-weekdays-add .weekday-circle-edit.active').forEach(circle => {
            doneDays.push(parseInt(circle.dataset.day));
        });

        const priorityVal = document.getElementById('obsAddImportant')?.checked ? 5 : 0;

        const data = {
            text: text,
            created_at: getSelectTime('obsAdd', 'Start'),
            end_time: (mode === 'period') ? getSelectTime('obsAdd', 'End') : null,
            priority: priorityVal,
            no_time: (mode === 'none'),
            done_days: doneDays
        };
        
        const response = await fetch(`/api/observations/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            location.reload();
        } else {
            const errData = await response.json();
            const errMsg = 'Error: ' + (errData.detail || 'Failed to save');
            if (typeof showToast === 'function') showToast(errMsg, 'error');
        }
    } catch (e) { 
        console.error('Save error:', e);
        if (typeof showToast === 'function') showToast('System error: ' + e.message, 'error');
    }
}

function openObsOverviewModal() {
    const modal = document.getElementById('obsOverviewModal');
    if (modal) modal.style.display = 'flex';
}

function closeObsOverviewModal() {
    const modal = document.getElementById('obsOverviewModal');
    if (modal) modal.style.display = 'none';
}

function openObsEditModal(btn) {
    const idEl = document.getElementById('obsEditId');
    const textEl = document.getElementById('obsEditText');
    if (idEl) idEl.value = btn.dataset.id;
    if (textEl) textEl.value = btn.dataset.text;
    
    const startTime = btn.dataset.time;
    const endTime = btn.dataset.endTime;
    const noTime = (btn.dataset.noTime === 'true');
    
    setSelectTime('obsEdit', 'Start', startTime);
    setSelectTime('obsEdit', 'End', endTime || startTime);

    const p = parseInt(btn.dataset.priority || '1', 10);
    const imp = document.getElementById('obsEditImportant');
    const exc = document.getElementById('obsEditExcess');
    if (imp && exc) {
        if (p >= 5) { imp.checked = true; exc.checked = false; }
        else if (p === 0) { imp.checked = false; exc.checked = true; }
        else { imp.checked = true; exc.checked = false; }
    }
    
    // Determine mode
    let mode = 'exact';
    if (noTime) mode = 'none';
    else if (endTime && endTime !== '') mode = 'period';
    
    const modeEl = document.getElementById('obsEditTimeMode');
    if (modeEl) {
        modeEl.value = mode;
        handleTimeModeChange('edit');
    }
    
    // Set days
    const doneDays = JSON.parse(btn.dataset.doneDays || '[]');
    document.querySelectorAll('.obs-weekdays-edit .weekday-circle-edit').forEach(circle => {
        const day = parseInt(circle.dataset.day);
        if (doneDays.includes(day)) circle.classList.add('active');
        else circle.classList.remove('active');
    });

    const modal = document.getElementById('obsEditModal');
    if (modal) modal.style.display = 'flex';
}

function closeObsEditModal() {
    const modal = document.getElementById('obsEditModal');
    if (modal) modal.style.display = 'none';
}

async function saveObsEdit() {
    const id = document.getElementById('obsEditId').value;
    const text = document.getElementById('obsEditText').value.trim();
    if (!text) return;

    const mode = document.getElementById('obsEditTimeMode').value;
    const doneDays = [];
    document.querySelectorAll('.obs-weekdays-edit .weekday-circle-edit.active').forEach(circle => {
        doneDays.push(parseInt(circle.dataset.day));
    });

    const priorityVal = document.getElementById('obsEditImportant')?.checked ? 5 : 0;

    const data = {
        text: text,
        created_at: getSelectTime('obsEdit', 'Start'),
        end_time: (mode === 'period') ? getSelectTime('obsEdit', 'End') : null,
        priority: priorityVal,
        no_time: (mode === 'none'),
        done_days: doneDays
    };

    try {
        const response = await fetch(`/api/observations/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (response.ok) {
            if (isEditingFromOverview) {
                sessionStorage.setItem('reopenObsOverview', 'true');
            }
            location.reload();
        }
    } catch (e) { console.error(e); }
}
