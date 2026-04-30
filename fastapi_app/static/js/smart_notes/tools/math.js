/**
 * tools/math.js - Логика формул (MathLive)
 */
export const MathTool = {
    getSymbols() {
        return {
            'Основные': ['+', '-', '\\times', '\\div', '=', '\\sqrt{x}', 'x^n', '\\pi', '\\infty'],
            'Скобки': ['(x)', '[x]', '\\{x\\}', '|x|'],
            'Анализ': ['\\int', '\\sum', '\\lim_{x \\to \\infty}', '\\frac{d}{dx}'],
            'Разное': ['\\alpha', '\\beta', '\\gamma', '\\delta', '\\lambda']
        };
    },

    async initMathLive() {
        if (!window.mathliveLoaded) {
            if (window.app && window.app.logDebug) window.app.logDebug("Загрузка MathLive (ESM)...");
            const ml = await import('mathlive');
            // Настройка шрифтов сразу после загрузки модуля
            if (ml.MathfieldElement) {
                ml.MathfieldElement.fontsDirectory = 'https://cdn.jsdelivr.net/npm/mathlive@latest/dist/fonts';
            }
            window.mathliveLoaded = true;
            if (window.app && window.app.logDebug) window.app.logDebug("MathLive загружен.");
        }
    },

    renderPalette(paletteEl, cat, onInsert, onTabSwitch) {
        paletteEl.innerHTML = '';
        const symbolsMap = this.getSymbols();
        const catMap = { main: 'Основные', brackets: 'Скобки', analysis: 'Анализ', misc: 'Разное' };
        const items = symbolsMap[catMap[cat]] || [];

        items.forEach(s => {
            const btn = document.createElement('button');
            btn.className = 'math-symbol-btn';
            btn.innerHTML = `<math-field read-only>${s}</math-field>`;
            btn.onmousedown = (e) => {
                e.preventDefault();
                onInsert(s);
            };
            paletteEl.appendChild(btn);
        });

        document.querySelectorAll('.math-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.cat === cat);
            t.onclick = () => onTabSwitch(t.dataset.cat);
        });
    },

    async showContextMenu(x, y, onInsert) {
        const menu = document.getElementById('mathContextMenu');
        await this.initMathLive();

        menu.innerHTML = '';
        menu.className = 'math-context-menu';
        menu.style.display = 'flex';
        menu.style.position = 'fixed';
        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;
        menu.style.zIndex = '10000';

        // 1. Шапка с вкладками
        const header = document.createElement('div');
        header.className = 'math-ctx-header';
        
        const tabsContainer = document.createElement('div');
        tabsContainer.className = 'math-ctx-tabs';
        
        const symbols = this.getSymbols();
        const categories = Object.keys(symbols);
        
        const contentArea = document.createElement('div');
        contentArea.className = 'math-ctx-content';
        
        categories.forEach((cat, index) => {
            const tab = document.createElement('div');
            tab.className = `math-ctx-tab ${index === 0 ? 'active' : ''}`;
            tab.innerText = cat;
            tab.onmousedown = (e) => {
                e.preventDefault();
                e.stopPropagation();
                document.querySelectorAll('.math-ctx-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.renderCtxGrid(contentArea, symbols[cat], onInsert, menu);
            };
            tabsContainer.appendChild(tab);
        });
        
        header.appendChild(tabsContainer);
        menu.appendChild(header);
        menu.appendChild(contentArea);
        
        // Рендерим первую категорию
        this.renderCtxGrid(contentArea, symbols[categories[0]], onInsert, menu);

        // 2. Кнопка копирования (если кликнули по существующей формуле)
        const target = document.elementFromPoint(x, y);
        const mathField = target?.closest('math-field') || 
                         (target?.shadowRoot ? target.shadowRoot.activeElement?.closest('math-field') : null);
        
        if (mathField) {
            const copyBtn = document.createElement('div');
            copyBtn.className = 'math-ctx-copy-btn';
            copyBtn.innerHTML = '📋 Копировать LaTeX';
            copyBtn.onmousedown = (e) => {
                e.preventDefault();
                this.copyToClipboard(mathField.value);
                menu.style.display = 'none';
            };
            menu.appendChild(copyBtn);
        }
    },

    renderCtxGrid(container, items, onInsert, menu) {
        container.innerHTML = '';
        const grid = document.createElement('div');
        grid.className = 'math-ctx-grid';
        
        items.forEach(s => {
            const btn = document.createElement('button');
            btn.className = 'math-ctx-btn';
            btn.innerHTML = `<math-field read-only>${s}</math-field>`;
            btn.onmousedown = (e) => {
                e.preventDefault();
                e.stopPropagation();
                onInsert(s);
                menu.style.display = 'none';
            };
            grid.appendChild(btn);
        });
        container.appendChild(grid);
    },

    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            console.log('LaTeX copied to clipboard');
        });
    }
};
