/**
 * tools/shapes.js - Логика фигур (Fabric.js)
 */
export const ShapeTool = {
    async init(canvasId, wrapperId) {
        try {
            const fabricModule = await import('fabric');
            const fabric = fabricModule.fabric || fabricModule;
            
            const wrapper = document.getElementById(wrapperId);
            const width = wrapper.clientWidth - 20;
            const height = 350;
            
            return new fabric.Canvas(canvasId, {
                width: width,
                height: height,
                backgroundColor: '#ffffff',
                isDrawingMode: false
            });
        } catch (e) {
            console.error("Fabric init error:", e);
            return null;
        }
    },

    setTool(canvas, tool, color) {
        if (!canvas) return;
        if (tool === 'draw') {
            canvas.isDrawingMode = true;
            canvas.freeDrawingBrush.width = 3;
            canvas.freeDrawingBrush.color = color;
        } else {
            canvas.isDrawingMode = false;
        }
    },

    async add(canvas, type, color) {
        if (!canvas) return;
        const fabricModule = await import('fabric');
        const f = fabricModule.fabric || fabricModule;
        
        const common = {
            left: 100,
            top: 100,
            fill: 'transparent',
            stroke: color,
            strokeWidth: 2,
        };

        let shape;
        if (type === 'rect') {
            shape = new f.Rect({ ...common, width: 80, height: 60 });
        } else if (type === 'circle') {
            shape = new f.Circle({ ...common, radius: 40 });
        } else if (type === 'triangle') {
            shape = new f.Triangle({ ...common, width: 80, height: 70 });
        } else if (type === 'line') {
            shape = new f.Line([50, 50, 150, 50], { stroke: color, strokeWidth: 3 });
        } else if (type === 'arrow') {
            // Линия со стрелкой (упрощенно)
            shape = new f.Group([
                new f.Line([0, 5, 100, 5], { stroke: color, strokeWidth: 3 }),
                new f.Triangle({ left: 90, top: 0, width: 15, height: 15, fill: color, angle: 90 })
            ], { left: 100, top: 100 });
        } else if (type === 'diamond') {
            shape = new f.Rect({ ...common, width: 60, height: 60, angle: 45 });
        } else if (type === 'text') {
            shape = new f.IText('A', { left: 100, top: 100, fontSize: 18, fill: color, fontWeight: 'bold' });
        }

        if (shape) {
            canvas.add(shape);
            canvas.setActiveObject(shape);
        }
    },

    exportToPNG(canvas, tiptap, onComplete) {
        if (!canvas || !tiptap) return;

        canvas.discardActiveObject();
        canvas.renderAll();

        const dataUrl = canvas.toDataURL({
            format: 'png',
            multiplier: 2
        });

        tiptap.chain()
            .focus()
            .insertContent({
                type: 'image',
                attrs: { src: dataUrl, alt: 'Canvas Drawing', width: '400px' }
            })
            .createParagraphNear()
            .focus('end')
            .run();

        if (onComplete) onComplete();
    }
};
