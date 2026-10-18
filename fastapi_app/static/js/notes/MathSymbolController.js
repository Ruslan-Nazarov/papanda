import AppState from './AppState.js';
import MathSymbolTooltip from './MathSymbolTooltip.js';
import FormulaModalService from './FormulaModalService.js';
import MathDefinitionContext from './MathDefinitionContext.js';
import MathSymbols from './MathSymbols.js';
import NotesAPI from './api.js';

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
                    numberDefinitions: block.math_number_definitions || [], epoch: AppState.documentEpoch,
                    blocks: AppState.currentNote.blocks.map(({id, title, math_symbols}) => ({id, title, math_symbols}))};
            },
            onSuggest: ({target, context, signal}) => NotesAPI.request('/ai/dialectics/math-definition', 'POST',
                MathDefinitionContext.build(AppState.currentNote, context.blockId, target), signal),
            onAccept: ({symbol, target, numberDefinition, context, definition}) => {
                const block = AppState.getBlock(context.blockId);
                if (!block || context.epoch !== AppState.documentEpoch) return;
                if (symbol && !numberDefinition) {
                    const key = MathSymbols.normalize(symbol);
                    AppState.updateBlock(block.id, {math_symbols: [
                        ...(block.math_symbols || []).filter(entry => MathSymbols.normalize(entry.symbol) !== key),
                        {symbol, definition},
                    ]});
                } else {
                    AppState.updateBlock(block.id, {math_number_definitions: [
                        ...(block.math_number_definitions || []).filter(entry => !MathDefinitionContext.sameNumber(entry, target)),
                        {formula: target.formula, start: target.start, end: target.end, value: target.value, definition},
                    ]});
                }
            },
            onRemoveNumber: ({target, context}) => {
                const block = AppState.getBlock(context.blockId);
                if (!block || context.epoch !== AppState.documentEpoch) return;
                AppState.updateBlock(block.id, {math_number_definitions: (block.math_number_definitions || [])
                    .filter(entry => !MathDefinitionContext.sameNumber(entry, target))});
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
            },
        });
    }
}

export default MathSymbolController;
