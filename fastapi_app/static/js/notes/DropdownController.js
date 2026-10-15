export class DropdownController {
    static init() {
        const btnMode = document.getElementById('btn-mode');
        const modeDropdown = document.getElementById('mode-dropdown');
        const btnMainMenu = document.getElementById('btn-main-menu');
        const mainMenuDropdown = document.getElementById('main-menu-dropdown');
        const btnLangMenu = document.getElementById('btn-lang-menu');
        const langMenuDropdown = document.getElementById('lang-menu-dropdown');

        const allDropdowns = [modeDropdown, mainMenuDropdown, langMenuDropdown, document.getElementById('statistics-panel')];

        const closeAllDropdowns = () => {
            allDropdowns.forEach(d => { if (d) d.classList.add('hidden'); });
            mainMenuDropdown?.querySelectorAll('details[open]').forEach(d => { d.open = false; });
        };
        this.closeAllDropdowns = closeAllDropdowns;

        const bindToggle = (btn, dropdown) => {
            if (btn && dropdown) {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const isHidden = dropdown.classList.contains('hidden');
                    closeAllDropdowns();
                    if (isHidden) dropdown.classList.remove('hidden');
                });
            }
        };

        bindToggle(btnMode, modeDropdown);
        bindToggle(btnMainMenu, mainMenuDropdown);
        bindToggle(btnLangMenu, langMenuDropdown);
        this.initStatistics();

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.dropdown-wrapper')) {
                closeAllDropdowns();
            }
        });
    }

    static initStatistics() {
        const button = document.getElementById('btn-statistics');
        const panel = document.getElementById('statistics-panel');
        if (!button || !panel) return;

        const close = () => {
            panel.classList.add('hidden');
            button.setAttribute('aria-expanded', 'false');
        };
        const position = () => {
            const anchor = button.getBoundingClientRect();
            const width = Math.min(320, window.innerWidth - 24);
            const top = anchor.bottom + 8;
            panel.style.left = `${Math.max(12, Math.min(anchor.left, window.innerWidth - width - 12))}px`;
            panel.style.top = `${top}px`;
            panel.style.maxHeight = `${Math.max(100, window.innerHeight - top - 12)}px`;
        };
        button.addEventListener('click', event => {
            event.stopPropagation();
            const opening = panel.classList.contains('hidden');
            document.querySelectorAll('.dropdown-menu').forEach(menu => menu.classList.add('hidden'));
            if (opening) { position(); panel.classList.remove('hidden'); }
            button.setAttribute('aria-expanded', String(opening));
        });
        document.addEventListener('click', event => {
            if (!event.target.closest('.statistics-wrapper')) close();
        });
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && !panel.classList.contains('hidden')) {
                close();
                button.focus();
            }
        });
        window.addEventListener('resize', () => {
            if (!panel.classList.contains('hidden')) position();
        });
        new ResizeObserver(() => {
            if (!panel.classList.contains('hidden')) position();
        }).observe(button.closest('.note-sub-bar'));
        window.addEventListener('scroll', close, {passive: true});
        document.addEventListener('noteOpened', close);
        new MutationObserver(() => {
            button.setAttribute('aria-expanded', String(!panel.classList.contains('hidden')));
        }).observe(panel, {attributes: true, attributeFilter: ['class']});
    }

    static closeAll() {
        if (this.closeAllDropdowns) {
            this.closeAllDropdowns();
        } else {
            document.querySelectorAll('.dropdown-menu').forEach(d => d.classList.add('hidden'));
        }
    }
}

export default DropdownController;
