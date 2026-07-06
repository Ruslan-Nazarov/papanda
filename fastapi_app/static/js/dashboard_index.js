import { customConfirm, customChoice } from './modal_controller.js';
import { deleteRecordApi, fetchWithJson } from './db_api.js';
import { toggleWidget, initGrid, saveLayout } from './grid_controller.js';
import { NotificationService, showToast } from './modules/NotificationService.js';
import { ModalManager } from './modules/ModalManager.js';

import { initEventWidget } from './event_widget.js?v=2';
import { initWordWidget } from './word_widget.js?v=8';
import { initRecurrenceForm } from './recurrence_form.js';
import { initStickerWidget } from './sticker_widget.js';
import { initNoteChronoWidget } from './note_chrono_widget.js';

import { DashboardActionService } from './modules/DashboardActionService.js?v=2';
import { DragAndDropService } from './modules/DragAndDropService.js';
import { HeaderService } from './modules/HeaderService.js';

window.DragAndDropService = DragAndDropService;

window.toggleWidget = toggleWidget;
window.saveLayout = saveLayout;


window.markTaskDone = async function (form, taskId) {
    const li = form.closest('li');
    const { animateItemRemoval } = await import('./ui_helpers.js');

    try {
        const resp = await fetch(form.action, { method: 'POST', headers: { 'Accept': 'application/json' } });
        if (resp.ok) {
            const animationPromise = animateItemRemoval(li);
            if (showToast) showToast(window._("toast.task_completed"), 'success');
            if (window.HeaderService) window.HeaderService.refreshBadges();
            await animationPromise;
            if (typeof window.refreshDashboardTasks === 'function') window.refreshDashboardTasks();
        } else {
            console.error('Task mark failed');
            if (typeof window.refreshDashboardTasks === 'function') window.refreshDashboardTasks();
        }
    } catch (e) {
        console.error('Error marking task done:', e);
        if (typeof window.refreshDashboardTasks === 'function') window.refreshDashboardTasks();
    }
};

window.markHabitDone = async function (form, habitId) {
    const li = form.closest('li');
    const { animateItemRemoval } = await import('./ui_helpers.js');

    const animationPromise = animateItemRemoval(li);
    if (showToast) showToast(window._("toast.habit_completed_for_today"), 'success');

    try {
        const resp = await fetch(form.action, { method: 'POST' });
        if (!resp.ok) {
            if (typeof window.refreshDashboardHabits === 'function') window.refreshDashboardHabits();
        } else {
            if (typeof window.refreshDashboardHabits === 'function') window.refreshDashboardHabits();
        }
    } catch (e) {
        if (typeof window.refreshDashboardHabits === 'function') window.refreshDashboardHabits();
    }
    await animationPromise;
};

window.refreshDashboardTasks = async function () {
    try {
        const resp = await fetch('/api/dashboard/widget/tasks', { cache: 'no-store' });
        if (resp.ok) {
            const html = await resp.text();
            const wrapper = document.querySelector('#tasks .grid-stack-item-content');
            if (wrapper) {
                wrapper.innerHTML = html;
                if (window.DragAndDropService) window.DragAndDropService.initTasks();
            }
        }
    } catch (e) { console.error('Failed to refresh tasks', e); }
};

window.switchTaskSet = async function(setId) {
    try {
        const res = await fetch(`/api/tasks/sets/${setId}/activate`, { method: 'POST' });
        if (res.ok) {
            await window.refreshDashboardTasks();
            if (typeof safeShowToast === 'function') safeShowToast('Набор задач переключен');
        } else {
            if (typeof safeShowToast === 'function') safeShowToast('Ошибка при переключении набора', 'error');
        }
    } catch (e) {
        console.error('Switch task set error:', e);
        if (typeof safeShowToast === 'function') safeShowToast('Ошибка сети', 'error');
    }
};

window.switchTaskSetFromModal = async function(setId) {
    await window.switchTaskSet(setId);
    if (typeof window.loadDbViewModalContent === 'function') {
        await window.loadDbViewModalContent('Task');
    }
};

window.openTaskAddModal = function() {
    const catSelect = document.querySelector('select[name="common_category"]');
    if (catSelect) {
        catSelect.value = 'task';
        if (typeof syncCategoryStickerVisibility === 'function') syncCategoryStickerVisibility();
        catSelect.dispatchEvent(new Event('change'));
    }
    const input = document.querySelector('input[name="common_text"]');
    if (input) {
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => input.focus(), 300);
    }
};

window.openCreateTaskSetModal = function() {
    let modal = document.getElementById('customCreateTaskSetModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'customCreateTaskSetModal';
        modal.className = 'modal premium-modal';
        modal.style.cssText = 'display: flex; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 1000000; align-items: center; justify-content: center; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);';
        modal.innerHTML = `
            <div class="modal-content premium-card" style="max-width: 440px; width: 90%; border-radius: 24px; padding: 0; overflow: hidden; background: var(--color-bg-card, #fff); box-shadow: 0 25px 50px rgba(0,0,0,0.25); border: 1px solid var(--color-border-light, #eee);">
                <div class="modal-header" style="padding: 20px 24px; background: var(--color-bg-subtle, #f8f9fa); border-bottom: 1px solid var(--color-border-light, #eee); display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0; font-size: 1.15em; font-weight: 600; color: var(--color-text-main, #222);">📁 Создать набор задач</h3>
                    <button type="button" onclick="closeCreateTaskSetModal()" style="background: none; border: none; font-size: 1.3em; cursor: pointer; color: var(--color-text-muted, #888);">✕</button>
                </div>
                <div class="modal-body" style="padding: 24px;">
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; font-size: 0.9em; margin-bottom: 8px; font-weight: 500; color: var(--color-text-main, #333);">Название набора</label>
                        <input type="text" id="newTaskSetNameInput" class="form-control" placeholder="Например: Рабочие, Домашние, Проект X" style="width: 100%; padding: 12px 14px; border-radius: 10px; border: 1px solid var(--color-border, #ccc); font-size: 0.95em; outline: none; box-sizing: border-box; background: var(--color-bg-main, #fff); color: var(--color-text-main, #222);">
                    </div>
                    <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 0.9em; color: var(--color-text-main, #444); user-select: none;">
                        <input type="checkbox" id="cloneTaskSetCheckbox" style="width: 18px; height: 18px; cursor: pointer; accent-color: var(--color-primary, #3b82f6);">
                        <span>Скопировать текущие задачи в новый набор</span>
                    </label>
                </div>
                <div class="modal-footer" style="padding: 16px 24px; background: var(--color-bg-subtle, #f8f9fa); border-top: 1px solid var(--color-border-light, #eee); display: flex; justify-content: flex-end; gap: 12px;">
                    <button type="button" class="btn btn-secondary" style="padding: 10px 18px; border-radius: 10px; font-weight: 500; cursor: pointer; border: 1px solid var(--color-border, #ccc); background: var(--color-bg-card, #fff); color: var(--color-text-main, #333);" onclick="closeCreateTaskSetModal()">Отмена</button>
                    <button type="button" class="btn btn-primary" style="padding: 10px 20px; border-radius: 10px; font-weight: 500; cursor: pointer; background: var(--color-primary, #3b82f6); color: #fff; border: none; box-shadow: 0 4px 12px rgba(59,130,246,0.3);" onclick="submitCreateTaskSet()">Создать</button>
                </div>
            </div>
        `;
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeCreateTaskSetModal();
        });
        document.body.appendChild(modal);
        
        const input = document.getElementById('newTaskSetNameInput');
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') submitCreateTaskSet();
            if (e.key === 'Escape') closeCreateTaskSetModal();
        });
    }
    document.getElementById('newTaskSetNameInput').value = '';
    document.getElementById('cloneTaskSetCheckbox').checked = false;
    modal.style.display = 'flex';
    setTimeout(() => document.getElementById('newTaskSetNameInput').focus(), 50);
};

window.closeCreateTaskSetModal = function() {
    const modal = document.getElementById('customCreateTaskSetModal');
    if (modal) modal.style.display = 'none';
};

window.submitCreateTaskSet = function() {
    const input = document.getElementById('newTaskSetNameInput');
    const name = input ? input.value.trim() : '';
    if (!name) {
        if (typeof safeShowToast === 'function') safeShowToast('Введите название набора', 'error');
        if (input) input.focus();
        return;
    }
    const clone = document.getElementById('cloneTaskSetCheckbox')?.checked || false;
    
    fetch('/api/tasks/sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name, clone: clone })
    })
    .then(r => r.json())
    .then(data => {
        if (data.status === 'success') {
            closeCreateTaskSetModal();
            if (typeof safeShowToast === 'function') safeShowToast('Набор создан и активирован');
            window.refreshDashboardTasks();
            if (document.getElementById('dbViewModal') && document.getElementById('dbViewModal').style.display !== 'none') {
                if (typeof window.loadDbViewModalContent === 'function') window.loadDbViewModalContent('Task');
            }
        } else {
            if (typeof safeShowToast === 'function') safeShowToast('Ошибка при создании набора', 'error');
        }
    })
    .catch(e => {
        console.error('Create task set error:', e);
        if (typeof safeShowToast === 'function') safeShowToast('Ошибка сети', 'error');
    });
};

window.refreshDashboardHabits = async function () {
    try {
        const resp = await fetch('/api/dashboard/widget/habits', { cache: 'no-store' });
        if (resp.ok) {
            const html = await resp.text();
            const wrapper = document.querySelector('#habits .grid-stack-item-content');
            if (wrapper) wrapper.innerHTML = html;
        }
    } catch (e) { console.error('Failed to refresh habits', e); }
};

document.addEventListener('DOMContentLoaded', async function () {
    if (window.dbLog) window.dbLog('DOMContentLoaded fired');
    console.log("[Dashboard] Starting initialization...");

    // 1. Initialize core GridStack FIRST
    initGrid();

    // 2. Initialize feature modules with safety wrappers
    const initSafe = async (fn, name) => {
        try { await fn(); }
        catch (e) { console.error(`[Dashboard] Failed to init ${name}:`, e); }
    };

    initSafe(initEventWidget, 'EventWidget');
    initSafe(initWordWidget, 'WordWidget');
    initSafe(initRecurrenceForm, 'RecurrenceForm');
    await initSafe(initStickerWidget, 'StickerWidget');
    initSafe(initNoteChronoWidget, 'NoteChronoWidget');

    // 3. Initialize core services
    DashboardActionService.init();
    DragAndDropService.init();
    HeaderService.init();
    ModalManager.initGlobal();

    // Listen for stickers updating to refresh respective dashboard widgets in real-time
    window.addEventListener('stickersUpdated', async (e) => {
        const parentType = e.detail?.parentType;
        console.log(`[Dashboard] stickersUpdated event received for parentType: ${parentType}`);
        if (parentType === 'event') {
            if (typeof window.refreshDashboardEvents === 'function') window.refreshDashboardEvents();
            if (typeof window.loadCalendarData === 'function') {
                await window.loadCalendarData();
            }
            if (typeof window.refreshDayViewModalIfOpen === 'function') window.refreshDayViewModalIfOpen();
        } else if (parentType === 'task') {
            if (typeof window.refreshDashboardTasks === 'function') window.refreshDashboardTasks();
        } else if (parentType === 'habit') {
            if (typeof window.refreshDashboardHabits === 'function') window.refreshDashboardHabits();
        }
    });
});
