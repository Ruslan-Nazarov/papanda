import AppState from './AppState.js';
import ConceptSelectionMenu from './ConceptSelectionMenu.js';
import MathSymbols from './MathSymbols.js';
import MathDefinitionContext from './MathDefinitionContext.js';

// A dedicated AI action; the dialog shares only transport, follow-ups and saving.
class CalculationExplanation {
    static open(element) {
        const blockEl = element.closest('.dialectics-block');
        const block = AppState.getBlock(blockEl?.dataset.id);
        if (!block) return;
        const target = MathDefinitionContext.target(element);
        if (!target.formula) return;
        const context = MathDefinitionContext.build(AppState.currentNote, block.id, target);
        const related = new Set([target.formula, ...target.original_formulas]
            .flatMap(formula => MathSymbols.candidates(formula).map(item => item.symbol)));
        const symbols = new Map();
        for (const entry of [...(AppState.currentNote.math_symbols || []), ...(block.math_symbols || [])]) {
            const key = MathSymbols.normalize(entry.symbol);
            if (related.has(key)) symbols.set(key, entry);
        }
        const calculation = {formula: target.formula, original_formulas: target.original_formulas,
            math_symbols: [...symbols.values()].slice(0, 80),
            number_definitions: (block.math_number_definitions || [])
                .filter(entry => [target.formula, ...target.original_formulas].includes(entry.formula)).slice(0, 80),
            passages: context.passages.slice(0, 5)};
        const range = document.createRange();
        range.selectNode(element.closest('.math-inline, .katex-display') || element);
        return ConceptSelectionMenu._explain(target.formula, blockEl, range, {calculation});
    }
}

export default CalculationExplanation;
