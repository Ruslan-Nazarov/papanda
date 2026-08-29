export class EditorGraphTab {
    constructor(modalContainer) {
        this.modalContainer = modalContainer;
        this.graphDrawn = false;
    }

    init() {
        const btnDraw = this.modalContainer.querySelector('#btn-draw-graph');
        if (btnDraw) {
            btnDraw.addEventListener('click', () => this.drawGraph());
        }
    }

    drawGraph() {
        if (typeof functionPlot !== 'undefined') {
            const fnInput = this.modalContainer.querySelector('#graph-function');
            const fn = fnInput ? fnInput.value : 'x^2';
            try {
                functionPlot({
                    target: '#graph-canvas',
                    width: 560,
                    height: 240,
                    grid: true,
                    data: [{ fn: fn }]
                });
                this.graphDrawn = true;
            } catch (e) {
                console.error("Ошибка построения графика:", e);
            }
        }
    }
}
