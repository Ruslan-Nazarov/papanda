import { parse } from 'mathjs';
import Lifecycle from './Lifecycle.js';
import { t } from '../i18n.js';

const functions = new Set(['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'sqrt', 'abs', 'log', 'exp']);
const operators = new Set(['+', '-', '*', '/', '^', '%']);

export function graphFunction(expression) {
    if (!expression.trim() || expression.length > 500) throw new Error('Invalid expression');
    const tree = parse(expression);
    let count = 0;
    tree.traverse(node => {
        if (++count > 100) throw new Error('Expression too complex');
        if (node.type === 'ConstantNode' && typeof node.value === 'number') return;
        if (node.type === 'ParenthesisNode') return;
        if (node.type === 'OperatorNode' && operators.has(node.op)) return;
        if (node.type === 'SymbolNode' && (['x', 'pi', 'e'].includes(node.name) || functions.has(node.name))) return;
        if (node.type === 'FunctionNode' && functions.has(node.fn.name) && node.args.length === 1) return;
        throw new Error('Unsupported expression');
    });
    const compiled = tree.compile();
    return x => {
        const value = compiled.evaluate({x});
        return typeof value === 'number' && Number.isFinite(value) ? value : NaN;
    };
}

export class EditorGraphTab {
    constructor(modalContainer) {
        this.modalContainer = modalContainer;
        this.graphDrawn = false;
        this.lifecycle = new Lifecycle();
        this.domain = 10;
    }

    init() {
        this.lifecycle.on(this.modalContainer.querySelector('#btn-draw-graph'), 'click', () => this.drawGraph());
        this.lifecycle.on(this.modalContainer.querySelector('#graph-function'), 'keydown', event => {
            if (event.key === 'Enter') this.drawGraph();
        });
        this.lifecycle.on(this.modalContainer.querySelector('#graph-canvas'), 'wheel', event => {
            event.preventDefault();
            this.domain = Math.max(0.1, Math.min(1000, this.domain * (event.deltaY > 0 ? 1.2 : 1 / 1.2)));
            this.drawGraph();
        }, {passive: false});
    }

    drawGraph() {
        if (this.lifecycle.disposed) return;
        const host = this.modalContainer.querySelector('#graph-canvas');
        try {
            const expression = this.modalContainer.querySelector('#graph-function').value;
            const fn = graphFunction(expression);
            const width = 540, height = 240, limit = this.domain;
            const create = (name, attrs) => {
                const element = document.createElementNS('http://www.w3.org/2000/svg', name);
                for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, value);
                return element;
            };
            const svg = create('svg', {viewBox: `0 0 ${width} ${height}`, role: 'img', 'aria-label': expression});
            svg.style.cssText = 'width:100%;max-height:240px;background:#fff';
            for (let i = 1; i < 10; i++) {
                svg.append(create('path', {d: `M${i * width / 10} 0V${height}M0 ${i * height / 10}H${width}`,
                    stroke: i === 5 ? '#64748b' : '#e2e8f0', fill: 'none'}));
            }
            let curve = '', previous = null;
            for (let pixel = 0; pixel <= width; pixel++) {
                const x = -limit + pixel / width * limit * 2;
                const y = height / 2 - fn(x) / limit * height / 2;
                if (!Number.isFinite(y) || y < -height || y > height * 2) {previous = null; continue;}
                curve += `${previous === null || Math.abs(y - previous) > height ? 'M' : 'L'}${pixel},${y.toFixed(2)} `;
                previous = y;
            }
            svg.append(create('path', {d: curve, fill: 'none', stroke: '#2563eb', 'stroke-width': 2}));
            const caption = document.createElement('div');
            caption.textContent = `x: −${limit.toFixed(2)} … ${limit.toFixed(2)}`;
            host.replaceChildren(svg, caption);
            this.graphDrawn = true;
        } catch {
            host.textContent = t('graph_invalid_expression');
            this.graphDrawn = false;
        }
    }

    dispose() {
        this.lifecycle.dispose();
        this.modalContainer.querySelector('#graph-canvas')?.replaceChildren();
    }
}
