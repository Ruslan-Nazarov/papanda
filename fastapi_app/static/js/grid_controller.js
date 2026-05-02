console.log("!!! GRID_CONTROLLER.JS LOADED !!!");
/**
 * Grid Controller
 * Manages GridStack operations, saving layouts, and widget collapse logic.
 */

const COLLAPSE_KEY = 'papanda_collapsed_widgets';

export function getCollapsedSet() {
    try { return new Set(JSON.parse(localStorage.getItem(COLLAPSE_KEY) || '[]')); }
    catch (e) { return new Set(); }
}

export function saveCollapsedSet(set) {
    localStorage.setItem(COLLAPSE_KEY, JSON.stringify([...set]));
}

export function getItemH(gridItem) {
    const node = gridItem.gridstackNode;
    if (node && node.h) return node.h;
    return parseInt(gridItem.getAttribute('gs-h')) || 5;
}

export function toggleWidget(btn) {
    const gridItem = btn.closest('.grid-stack-item');
    if (!gridItem || !window.grid) return;

    const id = gridItem.getAttribute('gs-id');
    const collapsed = getCollapsedSet();
    const isCollapsed = gridItem.classList.contains('collapsed');

    if (!isCollapsed) {
        // Save real height before collapsing
        const h = getItemH(gridItem);
        if (h > 1) gridItem.setAttribute('data-gs-orig-h', h);
        gridItem.classList.add('collapsed');
        btn.textContent = '▲';
        window.grid.update(gridItem, { h: 1 });
        collapsed.add(id);
    } else {
        let origH = parseInt(gridItem.getAttribute('data-gs-orig-h')) || 5;
        if (origH <= 1) origH = 5;
        gridItem.classList.remove('collapsed');
        btn.textContent = '▾';
        window.grid.update(gridItem, { h: origH });
        collapsed.delete(id);
    }
    saveCollapsedSet(collapsed);
    saveLayout();
}

export function applyCollapsedState() {
    const collapsed = getCollapsedSet();
    if (collapsed.size === 0) return;
    document.querySelectorAll('.grid-stack-item[gs-id]').forEach(item => {
        const id = item.getAttribute('gs-id');
        if (!collapsed.has(id)) return;
        // Save height before collapsing for later restore
        const h = getItemH(item);
        if (h > 1) item.setAttribute('data-gs-orig-h', h);
        item.classList.add('collapsed');
        const btn = item.querySelector('button[onclick="toggleWidget(this)"]');
        if (btn) btn.textContent = '▲';
        if (window.grid) window.grid.update(item, { h: 1 });
    });
}

export function initGrid() {
    console.log("[Grid] Starting initialization...");
    const gridStackEl = document.querySelector('.grid-stack');
    if (!gridStackEl) {
        console.error("[Grid] .grid-stack element not found!");
        return null;
    }
    
    let grid = null;
    try {
        // 1. Core Init with explicit element
        grid = window.grid = GridStack.init({
            cellHeight: 45,
            margin: 10,
            handle: '.drag-handle',
            minRow: 1,
            animate: false,
            float: true
        }, gridStackEl);

        // 2. Restore Layout
        const savedLayout = window.P_DASHBOARD_LAYOUT;
        if (grid && savedLayout && typeof savedLayout === 'object' && Object.keys(savedLayout).length > 0) {
            grid.batchUpdate();
            Object.values(savedLayout).forEach(item => {
                if (!item || !item.id) return;
                const el = document.querySelector(`.grid-stack-item[gs-id="${item.id}"]`);
                if (el) grid.update(el, { x: item.x, y: item.y, w: item.w, h: item.h });
            });
            grid.commit();
        }

        applyCollapsedState();
        
        // Forced refresh
        setTimeout(() => {
            if (window.grid) window.grid.compact();
        }, 300);

        grid.on('change', saveLayout);
        return grid;
    } catch (e) {
        console.error('[Grid] Critical failure:', e);
        // Temporary alert to see the error on user's screen
        // alert('[Grid Error] ' + e.message); 
        return null;
    } finally {
        // Guarantee visibility regardless of success
        if (gridStackEl) gridStackEl.style.visibility = 'visible';
    }
}

export function saveLayout() {
    if (!window.grid) return;
    let layout = {};
    window.grid.getGridItems().forEach(el => {
        let n = el.gridstackNode;
        if (!n) return;
        const isCollapsed = el.classList.contains('collapsed');
        let h = isCollapsed ? (parseInt(el.getAttribute('data-gs-orig-h')) || n.h) : n.h;
        if (h <= 1 && !isCollapsed) h = 2;
        layout[n.id] = { id: n.id, x: n.x, y: n.y, w: n.w, h: h };
    });
    fetch('/save_dashboard_layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layout: JSON.stringify(layout) })
    });
}
