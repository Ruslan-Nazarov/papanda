export class DropdownController {
    static init() {
        const btnMode = document.getElementById('btn-mode');
        const modeDropdown = document.getElementById('mode-dropdown');
        const btnParsersNav = document.getElementById('btn-parsers-nav');
        const parsersDropdown = document.getElementById('parsers-dropdown');
        const btnMainMenu = document.getElementById('btn-main-menu');
        const mainMenuDropdown = document.getElementById('main-menu-dropdown');
        const btnLangMenu = document.getElementById('btn-lang-menu');
        const langMenuDropdown = document.getElementById('lang-menu-dropdown');
        const btnSkillMenu = document.getElementById('btn-skill-menu');
        const skillMenuDropdown = document.getElementById('skill-menu-dropdown');

        const allDropdowns = [modeDropdown, parsersDropdown, mainMenuDropdown, langMenuDropdown, skillMenuDropdown];

        const closeAllDropdowns = () => {
            allDropdowns.forEach(d => { if (d) d.classList.add('hidden'); });
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
        bindToggle(btnParsersNav, parsersDropdown);
        bindToggle(btnMainMenu, mainMenuDropdown);
        bindToggle(btnLangMenu, langMenuDropdown);
        bindToggle(btnSkillMenu, skillMenuDropdown);

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.dropdown-wrapper')) {
                closeAllDropdowns();
            }
        });
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
