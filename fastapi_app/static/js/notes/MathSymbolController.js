import AppState from './AppState.js';
import MathSymbolTooltip from './MathSymbolTooltip.js';
import FormulaModalService from './FormulaModalService.js';
import BlockDOMRenderer from './BlockDOMRenderer.js';

class MathSymbolController {
    static init() {
        MathSymbolTooltip.bind(document, {
            getContext: element => {
                if (element.closest('.tiptap, .formula-modal-backdrop, .hidden-phrase-tooltip')
                    || document.querySelector('.modal-editor-floating')) return null;
                const blockId = element.closest('.dialectics-block')?.dataset.id
                    || element.closest('.formula-zoom-dialog')?.dataset.mathSourceBlock;
                const block = AppState.getBlock(blockId);
                if (!block) return null;
                return {note: AppState.currentNote.math_symbols || [], block: block.math_symbols || [], blockId,
                    blocks: AppState.currentNote.blocks.map(({id, title, math_symbols}) => ({id, title, math_symbols}))};
            },
            onEdit: async ({symbol, element, context}) => {
                const formula = element.closest('.katex')?.querySelector('annotation[encoding="application/x-tex"]')?.textContent;
                if (!formula) return;
                const epoch = AppState.documentEpoch;
                const draft = JSON.parse(JSON.stringify(context));
                const zoom = element.closest('.formula-zoom-dialog');
                if (zoom?.open) {
                    // Finish native modal focus restoration before opening the editor.
                    await new Promise(resolve => {
                        zoom.addEventListener('close', resolve, {once: true});
                        zoom.close();
                    });
                    if (epoch !== AppState.documentEpoch || !AppState.getBlock(context.blockId)) return;
                }
                const result = await FormulaModalService.open({initialFormula: formula, symbolContext: draft,
                    selectedSymbol: symbol, definitionsOnly: true});
                if (result === null || epoch !== AppState.documentEpoch || !AppState.getBlock(context.blockId)) return;
                AppState.updateNote({math_symbols: draft.note});
                AppState.updateBlock(context.blockId, {math_symbols: draft.block});
                BlockDOMRenderer.renderAll();
            },
        });
    }
}

export default MathSymbolController;
