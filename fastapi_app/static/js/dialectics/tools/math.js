/**
 * tools/math.js - Логика формул (MathLive)
 */
export const MathTool = {
    getSymbols() {
        return {
            'Основные': ['+', '-', '\\times', '\\div', '=', '\\pm', '\\sqrt{x}', '\\sqrt[n]{x}', 'x^n', 'x_n', '\\pi', '\\infty', '\\%'],
            'Анализ': ['\\int', '\\int_a^b', '\\sum', '\\sum_{i=1}^n', '\\lim_{x \\to \\infty}', '\\frac{d}{dx}', '\\partial', '\\nabla', '\\Delta'],
            'Матстатистика': ['P(A)', '\\bar{x}', '\\sigma', '\\sigma^2', '\\mu', '\\chi^2', '\\lambda', '\\rho', '\\Phi(x)', 'E(X)', 'D(X)'],
            'Разное': ['\\alpha', '\\beta', '\\gamma', '\\delta', '\\epsilon', '\\zeta', '\\eta', '\\theta', '\\iota', '\\kappa', '\\lambda', '\\mu', '\\nu', '\\xi', '\\pi', '\\rho', '\\sigma', '\\tau', '\\phi', '\\chi', '\\psi', '\\omega']
        };
    },

    async initMathLive() {
        if (!window.mathliveLoaded) {
            if (window.app && window.app.logDebug) window.app.logDebug("Загрузка MathLive (ESM)...");
            const ml = await import('mathlive');
            // Настройка шрифтов сразу после загрузки модуля
            if (ml.MathfieldElement) {
                ml.MathfieldElement.fontsDirectory = 'https://cdn.jsdelivr.net/npm/mathlive@latest/dist/fonts';
                
                // Настройка глобальных шорткатов
                ml.MathfieldElement.inlineShortcuts = {
                    ...ml.MathfieldElement.inlineShortcuts,
                    "п": "+",
                    "м": "-",
                    "у": "\\times",
                    "д": "\\div",
                    "р": "=",
                    "к": "\\sqrt{#@}",
                    "и": "\\int",
                    "с": "\\sum",
                    "пч": "\\partial",
                    "б": "\\infty"
                };
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
        menu.className = 'math-floating-menu'; // New class for horizontal floating menu
        menu.style.display = 'flex';
        menu.style.flexDirection = 'column';
        menu.style.position = 'fixed';
        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;
        menu.style.zIndex = '20000';

        const symbols = this.getSymbols();
        const categories = Object.keys(symbols);
        
        // Tab Row
        const tabsContainer = document.createElement('div');
        tabsContainer.className = 'math-float-tabs';
        
        const contentArea = document.createElement('div');
        contentArea.className = 'math-float-content';
        
        categories.forEach((cat, index) => {
            const tab = document.createElement('div');
            tab.className = `math-float-tab ${index === 0 ? 'active' : ''}`;
            tab.innerText = cat;
            tab.onmousedown = (e) => {
                e.preventDefault();
                e.stopPropagation();
                tabsContainer.querySelectorAll('.math-float-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.renderCtxGrid(contentArea, symbols[cat], onInsert, menu);
            };
            tabsContainer.appendChild(tab);
        });
        
        menu.appendChild(tabsContainer);
        menu.appendChild(contentArea);
        
        this.renderCtxGrid(contentArea, symbols[categories[0]], onInsert, menu);

        // Click outside listener to close
        const closeMenu = (e) => {
            if (!menu.contains(e.target)) {
                menu.style.display = 'none';
                document.removeEventListener('mousedown', closeMenu);
            }
        };
        setTimeout(() => document.addEventListener('mousedown', closeMenu), 10);
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
