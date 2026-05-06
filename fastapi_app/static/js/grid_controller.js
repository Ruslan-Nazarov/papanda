console.log("!!! GRID_CONTROLLER.JS LOADED !!!");
/**
 * Grid Controller
 * Manages GridStack operations, saving layouts, and widget collapse logic.
 */

export function getItemH(gridItem) {
    const node = gridItem.gridstackNode;
    if (node && node.h) return node.h;
    return parseInt(gridItem.getAttribute('gs-h')) || 5;
}

export function getCollapsedSet(context = 'dashboard') {
    const key = context === 'dashboard' ? 'papanda_collapsed_widgets' : `papanda_collapsed_${context}`;
    try { return new Set(JSON.parse(localStorage.getItem(key) || '[]')); }
    catch (e) { return new Set(); }
}

export function saveCollapsedSet(set, context = 'dashboard') {
    const key = context === 'dashboard' ? 'papanda_collapsed_widgets' : `papanda_collapsed_${context}`;
    localStorage.setItem(key, JSON.stringify([...set]));
}

export function toggleWidget(btn, context = 'dashboard') {
    const gridItem = btn.closest('.grid-stack-item');
    if (!gridItem || !window.grid) return;

    const id = gridItem.getAttribute('gs-id');
    const collapsed = getCollapsedSet(context);
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
    saveCollapsedSet(collapsed, context);
    saveLayout({ context });
}

export function applyCollapsedState(context = 'dashboard') {
    const collapsed = getCollapsedSet(context);
    if (collapsed.size === 0) return;
    document.querySelectorAll('.grid-stack-item[gs-id]').forEach(item => {
        const id = item.getAttribute('gs-id');
        if (!collapsed.has(id)) return;
        // Save height before collapsing for later restore
        const h = getItemH(item);
        if (h > 1) item.setAttribute('data-gs-orig-h', h);
        item.classList.add('collapsed');
        const btn = item.querySelector('.widget-collapse-btn');
        if (btn) btn.textContent = '▲';
        if (window.grid) window.grid.update(item, { h: 1 });
    });
}

export function initGrid(options = {}) {
    const context = options.context || 'dashboard';
    const selector = options.selector || '.grid-stack';
    const gridStackEl = document.querySelector(selector);
    if (!gridStackEl) return null;
    
    let grid = null;
    try {
        grid = window.grid = GridStack.init({
            cellHeight: 45,
            margin: 10,
            handle: '.widget-header',
            minRow: 1,
            animate: false,
            float: true
        }, gridStackEl);

        // 2. Restore Layout
        const layoutKey = context === 'dashboard' ? 'P_DASHBOARD_LAYOUT' : `P_${context.toUpperCase()}_LAYOUT`;
        const savedLayout = options.layout || window[layoutKey];
        
        if (grid && savedLayout && typeof savedLayout === 'object' && Object.keys(savedLayout).length > 0) {
            const items = Object.values(savedLayout).map(item => ({
                id: item.id,
                x: parseInt(item.x),
                y: parseInt(item.y),
                w: parseInt(item.w),
                h: parseInt(item.h)
            }));
            grid.load(items, true); 
        }

        applyCollapsedState(context);
        
        setTimeout(() => {
            if (grid) {
                grid.on('change', () => saveLayout({ context }));
                grid.on('dragstop', () => saveLayout({ context }));
                grid.on('resizestop', () => saveLayout({ context }));
            }
        }, 1000);

        return grid;
    } catch (e) {
        console.error(`[Grid:${context}] Critical failure:`, e);
        return null;
    } finally {
        if (gridStackEl) gridStackEl.style.visibility = 'visible';
    }
}

export function saveLayout(options = {}) {
    const context = options.context || 'dashboard';
    if (!window.grid) return;
    
    const savedData = window.grid.save(false); 
    const layoutKey = context === 'dashboard' ? 'P_DASHBOARD_LAYOUT' : `P_${context.toUpperCase()}_LAYOUT`;
    const existingLayout = window[layoutKey] || {};
    let layout = {};
    
    savedData.forEach(item => {
        if (!item.id) return;
        
        const el = document.getElementById(item.id);
        const isCollapsed = el ? el.classList.contains('collapsed') : false;
        let h = isCollapsed ? (parseInt(el.getAttribute('data-gs-orig-h')) || item.h) : item.h;
        
        const oldItemData = existingLayout[item.id] || {};
        
        layout[item.id] = {
            ...oldItemData,
            id: item.id,
            x: item.x,
            y: item.y,
            w: item.w,
            h: h
        };
    });
    
    window[layoutKey] = layout;
    
    const saveUrl = `/save_dashboard_layout?context=${context}`;
    
    fetch(saveUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layout: JSON.stringify(layout) })
    });
}
