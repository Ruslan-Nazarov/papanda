/**
 * EditorSync.js
 * Centralized utility to sync fields between a widget and an expanded modal editor.
 */
export const EditorSync = {
    /**
     * Sync values from source elements to target elements.
     * @param {Object} mapping - Key is source ID, value is target ID.
     */
    sync(mapping) {
        for (const [sourceId, targetId] of Object.entries(mapping)) {
            const source = document.getElementById(sourceId);
            const target = document.getElementById(targetId);
            if (source && target) {
                if (source.type === 'checkbox') {
                    target.checked = source.checked;
                } else {
                    target.value = source.value;
                }
            }
        }
    },

    /**
     * Clears the values of the given elements.
     * @param {Array} ids - List of element IDs to clear.
     */
    clear(ids) {
        for (const id of ids) {
            const el = document.getElementById(id);
            if (el) {
                if (el.type === 'checkbox') el.checked = false;
                else el.value = '';
            }
        }
    }
};

window.EditorSync = EditorSync;
