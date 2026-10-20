import MathSymbols from './MathSymbols.js';
import MathProvenance from './MathProvenance.js';
import MathExpression from './MathExpression.js';
import { t } from '../i18n.js';

class MathProvenanceView {
    static returnButton = null;
    static destination = null;

    static numbers(element, step) {
        return [...element.querySelectorAll('[data-math-number]')].filter(node => {
            try {
                const number = JSON.parse(MathSymbols.decode(node.dataset.mathNumber));
                return number.start >= step.start && number.end <= step.end;
            } catch { return false; }
        });
    }

    static targets(element, number) {
        const targets = [element];
        for (const step of number.provenance || []) {
            const record = MathProvenance.record(element, step.ref);
            if (!record) continue;
            if (step.kind === 'rule' || step.kind === 'expansion') {
                record.element.querySelectorAll('[data-math-symbol]').forEach(node => {
                    if (MathExpression.key(MathSymbols.decode(node.dataset.mathSymbol)) === MathExpression.key(number.sourceSymbol || '')) targets.push(node);
                });
            } else targets.push(...this.numbers(record.element, step));
        }
        return [...new Set(targets)];
    }

    static clearNavigation() {
        this.returnButton?.remove(); this.returnButton = null;
        this.destination?.classList.remove('math-provenance-destination'); this.destination = null;
    }

    static reveal(element) {
        for (let parent = element.parentElement; parent; parent = parent.parentElement) {
            if (parent.matches('details')) parent.open = true;
            if (parent.matches('.dialectics-block.collapsed')) parent.querySelector('.btn-collapse-toggle')?.click();
            if (parent.matches('.calculation-fold-body[hidden]')) parent.parentElement.querySelector('.calculation-fold-toggle')?.click();
        }
        element.scrollIntoView?.({block: 'center', inline: 'nearest', behavior: 'instant'});
        element.focus?.({preventScroll: true});
    }

    static mount(popup, element, number, hide) {
        const grouped = new Map();
        const current = (element.closest('.formula-zoom-dialog')?.mathSource || element.closest('.katex'))?.dataset.mathProvenanceId;
        for (const step of number?.provenance || []) {
            if (!MathProvenance.record(element, step.ref)) continue;
            if (number.provenance.length > 1 && step.kind === 'source' && step.ref === current) continue;
            const key = JSON.stringify([step.ref, step.kind, step.expression]);
            if (!grouped.has(key)) grouped.set(key, {...step, ranges: []});
            grouped.get(key).ranges.push(step);
        }
        const steps = [...grouped.values()];
        if (!steps.length && !number?.provenanceAmbiguous) return false;
        const section = document.createElement('section');
        section.className = 'math-provenance';
        const title = document.createElement('strong');
        title.textContent = t('ms_provenance');
        section.append(title);
        if (number.provenanceAmbiguous) {
            const message = document.createElement('p');
            message.textContent = t('ms_provenance_ambiguous'); section.append(message);
        }
        const list = document.createElement('ol');
        for (const step of steps) {
            const record = MathProvenance.record(element, step.ref);
            const item = document.createElement('li');
            item.dataset.provenanceKind = step.kind;
            const caption = document.createElement('small');
            caption.textContent = t(`ms_provenance_${step.kind}`);
            const formula = document.createElement('div');
            formula.className = 'math-symbol-value-formula';
            const tex = step.expression || record.formula;
            formula.innerHTML = MathSymbols.render(tex, {}, [], MathSymbols.numbers(tex));
            if (!step.expression) step.ranges.forEach(range => this.numbers(formula, range).forEach(node => node.classList.add('math-provenance-focus')));
            const jump = document.createElement('button');
            jump.type = 'button'; jump.className = 'math-provenance-jump';
            jump.textContent = t('ms_provenance_jump');
            jump.addEventListener('click', () => {
                const current = MathProvenance.record(element, step.ref);
                if (!current) { jump.disabled = true; return; }
                const destination = this.numbers(current.element, step)[0] || current.element;
                const zoom = element.closest('.formula-zoom-dialog[open]');
                const origin = zoom?.mathSource
                    ? this.numbers(zoom.mathSource, number)[0] : element;
                hide();
                if (zoom) zoom.close();
                const navigate = () => {
                    this.reveal(destination);
                    this.clearNavigation();
                    destination.classList.add('math-provenance-destination'); this.destination = destination;
                    const back = document.createElement('button');
                    back.type = 'button'; back.className = 'math-provenance-return';
                    back.textContent = t('ms_provenance_return');
                    back.addEventListener('click', () => {
                        hide(); destination.classList.remove('math-provenance-destination');
                        this.clearNavigation();
                        if (origin?.isConnected) this.reveal(origin);
                    });
                    this.returnButton = back; document.body.append(back);
                };
                if (zoom) window.requestAnimationFrame(navigate); else navigate();
            });
            item.append(caption, formula, jump); list.append(item);
        }
        section.append(list); popup.append(section); return true;
    }
}

export default MathProvenanceView;
