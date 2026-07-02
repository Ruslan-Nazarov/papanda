/**
 * tools/graph.js - Логика графиков
 */
export const GraphTool = {
    async init() {
        if (window.functionPlotLoaded) return;

        const loadScript = (src) => new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) return resolve();
            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            script.onload = resolve;
            script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
            document.head.appendChild(script);
        });

        try {
            if (window.app?.logDebug) window.app.logDebug("Loading dependencies (D3 + FunctionPlot)...");

            // 1. Загружаем D3 (локально)
            await loadScript('/static/libs/d3.min.js');

            // 2. Загружаем FunctionPlot (локально)
            await loadScript('/static/libs/function-plot.js');

            this.isLoaded = true;
            if (window.app?.logDebug) window.app.logDebug("Graph libraries initialized.");
        } catch (e) {
            console.error("GraphTool init error:", e);
            if (window.app?.logDebug) window.app.logDebug(`Load error: ${e.message}`);
        }
    },

    plot(target, formula) {
        const inputStr = formula.trim();
        target.innerHTML = '';

        if (!this.isLoaded) {
            target.innerHTML = `<div style="color:red; padding:20px;">Error: Graph library is not loaded.</div>`;
            return;
        }

        if (!window.d3) {
            target.innerHTML = `<div style="color:red; padding:20px;">Error: D3 library not found.</div>`;
            return;
        }

        if (window.app && window.app.logDebug) {
            window.app.logDebug(`Plotting: ${inputStr}`);
        }

        // Try to parse points (e.g. "[5,7]" or "1,2; 3,4" or "5, 7")
        let points = [];
        const isPointsInput = !/[a-wy-z]/i.test(inputStr) && (inputStr.includes(',') || inputStr.includes('[') || inputStr.includes('('));

        if (isPointsInput) {
            const pointRegex = /(-?\d*\.?\d+)\s*,\s*(-?\d*\.?\d+)/g;
            let match;
            while ((match = pointRegex.exec(inputStr)) !== null) {
                const x = parseFloat(match[1]);
                const y = parseFloat(match[2]);
                if (!isNaN(x) && !isNaN(y)) {
                    points.push([x, y]);
                }
            }
        }

        let config;
        if (points.length > 0) {
            // Find domain and range
            const xs = points.map(p => p[0]);
            const ys = points.map(p => p[1]);
            const minX = Math.min(...xs);
            const maxX = Math.max(...xs);
            const minY = Math.min(...ys);
            const maxY = Math.max(...ys);
            
            const paddingX = Math.max(2, (maxX - minX) * 0.2);
            const paddingY = Math.max(2, (maxY - minY) * 0.2);
            
            const xDomain = [minX - paddingX, maxX + paddingX];
            const yDomain = [minY - paddingY, maxY + paddingY];

            const plotData = [];
            if (points.length > 1) {
                plotData.push({
                    points: points,
                    fnType: 'points',
                    graphType: 'polyline',
                    color: '#3b82f6'
                });
            }
            plotData.push({
                points: points,
                fnType: 'points',
                graphType: 'scatter',
                color: '#ef4444'
            });

            config = {
                target: target,
                width: target.clientWidth > 100 ? target.clientWidth - 20 : 450,
                height: 300,
                grid: true,
                xAxis: { domain: xDomain },
                yAxis: { domain: yDomain },
                data: plotData
            };
        } else {
            const fn = inputStr || 'x^2';
            config = {
                target: target,
                width: target.clientWidth > 100 ? target.clientWidth - 20 : 450,
                height: 300,
                grid: true,
                data: [{ 
                    fn: fn,
                    range: [-10, 10],
                    color: '#3b82f6'
                }]
            };
        }

        try {
            window.functionPlot(config);
            if (window.app && window.app.logDebug) window.app.logDebug("Success calling functionPlot");
        } catch (e) {
            if (window.app && window.app.logDebug) window.app.logDebug(`Error in functionPlot: ${e.message}`);
            try {
                if (e.message.includes("new") || e.message.includes("constructor")) {
                    const instance = new window.functionPlot(config);
                    if (instance && typeof instance.build === 'function') {
                        instance.build();
                    }
                } else {
                    throw e;
                }
            } catch (e2) {
                console.error("Plot error:", e2);
                target.innerHTML = `<div style="color:red; padding:20px;">Render error: ${e2.message}</div>`;
            }
        }
    },

    async exportToPNG(svg, tiptap, onComplete) {
        try {
            if (!svg.getAttribute('xmlns')) {
                svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            }

            const svgData = new XMLSerializer().serializeToString(svg);
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new window.Image();
            
            const rect = svg.getBoundingClientRect();
            const w = rect.width || 400;
            const h = rect.height || 300;
            
            canvas.width = w * 2;
            canvas.height = h * 2;

            const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);

            img.onload = () => {
                ctx.fillStyle = "white";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                const dataUrl = canvas.toDataURL('image/png');
                
                tiptap.chain()
                    .focus()
                    .insertContent({
                        type: 'image',
                        attrs: { src: dataUrl, alt: 'Function Graph', width: '400px' }
                    })
                    .createParagraphNear()
                    .focus('end')
                    .run();

                URL.revokeObjectURL(url);
                if (onComplete) onComplete();
            };

            img.src = url;
        } catch (e) {
            console.error("Graph export error:", e);
        }
    }
};
