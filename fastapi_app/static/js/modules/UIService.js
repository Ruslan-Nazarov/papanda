/**
 * UIService.js - Handles global UI interactions, search animations, and shared component logic.
 */

export const UIService = {
    init() {
        this.initSearch();
        this.initStickerColorPicker();
    },

    /**
     * Initializes the interactive search bar behavior.
     */
    initSearch() {
        const searchInput = document.querySelector('.search-wrapper input');
        const searchWrapper = document.querySelector('.search-wrapper');
        const searchIcon = document.querySelector('.search-icon-btn');

        if (searchIcon && searchInput && searchWrapper) {
            searchIcon.addEventListener('click', (e) => {
                if (!searchWrapper.classList.contains('has-query') && !searchWrapper.classList.contains('focused')) {
                    if (searchInput.value.trim() === '') {
                        e.preventDefault();
                        searchInput.focus();
                    }
                }
            });

            searchInput.addEventListener('focus', () => searchWrapper.classList.add('focused'));
            searchInput.addEventListener('blur', () => searchWrapper.classList.remove('focused'));
        }
    },

    /**
     * Initializes global sticker color picker dots.
     */
    initStickerColorPicker() {
        const dots = document.querySelectorAll('#eventStickerColorPicker .color-dot');
        if (dots.length === 0) return;

        dots.forEach(dot => {
            dot.addEventListener('click', () => {
                dots.forEach(d => d.classList.remove('active'));
                dot.classList.add('active');
                // We trigger a custom event or set a global if needed, 
                // but usually the service reads it from the active class.
                window.currentStickerColor = dot.dataset.color;
            });
        });
    }
};
