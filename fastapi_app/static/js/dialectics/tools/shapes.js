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
            
            const canvas = new fabric.Canvas(canvasId, {
                width: width,
                height: height,
                backgroundColor: '#ffffff',
                isDrawingMode: false
            });

            // Dimension Badge logic
            const updateBadge = (obj) => {
                let badge = document.getElementById('shapeDimBadge');
                if (!badge) {
                    badge = document.createElement('div');
                    badge.id = 'shapeDimBadge';
                    badge.style.position = 'absolute';
                    badge.style.bottom = '10px';
                    badge.style.left = '10px';
                    badge.style.background = 'rgba(0,0,0,0.7)';
                    badge.style.color = '#fff';
                    badge.style.padding = '4px 8px';
                    badge.style.borderRadius = '4px';
                    badge.style.fontSize = '12px';
                    badge.style.pointerEvents = 'none';
                    badge.style.zIndex = '10';
                    wrapper.appendChild(badge);
                }
                
                if (!obj) {
                    badge.style.display = 'none';
                    return;
                }
                
                let text = '';
                if (obj.type === 'line') {
                    const w = Math.round(obj.width * obj.scaleX);
                    const h = Math.round(obj.height * obj.scaleY);
                    const len = Math.round(Math.sqrt(w*w + h*h));
                    let angle = Math.round(obj.angle % 360);
                    if (angle < 0) angle += 360;
                    text = `Length: ${len} | Angle: ${angle}°`;
                } else if (obj.type === 'circle') {
                    const r = Math.round(obj.radius * obj.scaleX);
                    text = `R: ${r}`;
                } else if (obj.type !== 'i-text' && obj.type !== 'text') {
                    const w = Math.round(obj.width * obj.scaleX);
                    const h = Math.round(obj.height * obj.scaleY);
                    let angle = Math.round(obj.angle % 360);
                    if (angle < 0) angle += 360;
                    text = `W: ${w} H: ${h} | Angle: ${angle}°`;
                }
                
                if (text) {
                    badge.innerText = text;
                    badge.style.display = 'block';
                } else {
                    badge.style.display = 'none';
                }
            };

            const hideBadge = () => {
                const badge = document.getElementById('shapeDimBadge');
                if (badge) badge.style.display = 'none';
            };

            canvas.on('object:scaling', (e) => updateBadge(e.target));
            canvas.on('object:rotating', (e) => updateBadge(e.target));
            canvas.on('object:moving', (e) => updateBadge(e.target));
            canvas.on('selection:created', () => updateBadge(canvas.getActiveObject()));
            canvas.on('selection:updated', () => updateBadge(canvas.getActiveObject()));
            canvas.on('selection:cleared', hideBadge);

            return canvas;
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

    async toggleGrid(canvas) {
        if (!canvas) return;
        const fabricModule = await import('fabric');
        const f = fabricModule.fabric || fabricModule;

        if (canvas._hasGrid) {
            canvas.setBackgroundColor('#ffffff', canvas.renderAll.bind(canvas));
            canvas._hasGrid = false;
        } else {
            canvas._hasGrid = true;
            const gridSize = 20;
            const patternCanvas = document.createElement('canvas');
            patternCanvas.width = gridSize;
            patternCanvas.height = gridSize;
            const ctx = patternCanvas.getContext('2d');
            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(gridSize, 0);
            ctx.lineTo(gridSize, gridSize);
            ctx.lineTo(0, gridSize);
            ctx.stroke();

            const pattern = new f.Pattern({
                source: patternCanvas,
                repeat: 'repeat'
            });

            canvas.setBackgroundColor(pattern, canvas.renderAll.bind(canvas));
        }
    },

    async copySelectedShape(canvas) {
        if (!canvas) return;
        const activeObject = canvas.getActiveObject();
        if (!activeObject) return;

        activeObject.clone(function(cloned) {
            canvas.discardActiveObject();
            cloned.set({
                left: cloned.left + 20,
                top: cloned.top + 20,
                evented: true,
            });
            if (cloned.type === 'activeSelection') {
                cloned.canvas = canvas;
                cloned.forEachObject(function(obj) {
                    obj.set({ evented: true, selectable: true });
                    canvas.add(obj);
                });
                cloned.setCoords();
            } else {
                cloned.set({ evented: true, selectable: true });
                canvas.add(cloned);
            }
            canvas.setActiveObject(cloned);
            canvas.renderAll();
        });
    },

    _paramDefs: {
        'right-triangle': {
            title: 'Right Triangle',
            fields: [
                { key: 'a', label: 'Leg a (vertical)', default: 100, min: 10, max: 500 },
                { key: 'b', label: 'Leg b (horizontal)', default: 100, min: 10, max: 500 },
            ]
        },
        'triangle': {
            title: 'Isosceles Triangle',
            fields: [
                { key: 'base', label: 'Base', default: 120, min: 10, max: 500 },
                { key: 'height', label: 'Height', default: 100, min: 10, max: 500 },
            ]
        },
        'rect': {
            title: 'Rectangle',
            fields: [
                { key: 'width', label: 'Width', default: 120, min: 10, max: 500 },
                { key: 'height', label: 'Height', default: 80, min: 10, max: 500 },
            ]
        },
        'circle': {
            title: 'Circle',
            fields: [
                { key: 'radius', label: 'Radius', default: 50, min: 5, max: 250 },
            ]
        },
        'line': {
            title: 'Line Segment',
            fields: [
                { key: 'length', label: 'Length', default: 100, min: 5, max: 500 },
                { key: 'angle', label: 'Angle (°) — 0 = horizontal', default: 0, min: -360, max: 360 },
            ]
        },
        'diamond': {
            title: 'Rhombus',
            fields: [
                { key: 'side', label: 'Side', default: 80, min: 10, max: 400 },
            ]
        },
        'arrow': {
            title: 'Arrow',
            fields: [
                { key: 'length', label: 'Length', default: 100, min: 20, max: 500 },
            ]
        },
    },

    async add(canvas, type, color) {
        if (!canvas) return;

        if (type === 'text') {
            const fabricModule = await import('fabric');
            const f = fabricModule.fabric || fabricModule;
            const shape = new f.IText('Text', { 
                left: 100, top: 100, fontSize: 24, fill: '#1f2937', 
                fontWeight: 'bold', fontFamily: 'serif', fontStyle: 'italic', 
                originX: 'center', originY: 'center' 
            });
            canvas.add(shape);
            canvas.setActiveObject(shape);
            canvas.renderAll();
            return;
        }

        this._showParamDialog(canvas, type, color);
    },

    _showParamDialog(canvas, type, color) {
        const def = this._paramDefs[type];
        if (!def) return;

        let dialog = document.getElementById('shapeParamDialog');
        if (dialog) {
            dialog.remove();
        }

        dialog = document.createElement('div');
        dialog.id = 'shapeParamDialog';
        dialog.style.position = 'absolute';
        dialog.style.top = '0';
        dialog.style.left = '0';
        dialog.style.width = '100%';
        dialog.style.height = '100%';
        dialog.style.backgroundColor = 'rgba(0,0,0,0.3)';
        dialog.style.display = 'none';
        dialog.style.justifyContent = 'center';
        dialog.style.alignItems = 'center';
        dialog.style.zIndex = '9999';

        dialog.innerHTML = `
            <div style="background:white; padding:20px; border-radius:12px; width:300px; box-shadow:0 10px 25px rgba(0,0,0,0.2); font-family:sans-serif;">
                <h3 id="shapeParamTitle" style="margin-top:0; margin-bottom:15px; font-size:16px; color:#1e293b;"></h3>
                <div id="shapeParamFields"></div>
                <div style="margin-top:15px; display:flex; align-items:center; gap:8px;">
                    <input type="checkbox" id="shapeParamFill" style="width:16px; height:16px; cursor:pointer;">
                    <label for="shapeParamFill" style="font-size:14px; color:#475569; cursor:pointer; user-select:none;">With fill</label>
                </div>
                <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
                    <button id="shapeParamCancel" style="padding:8px 12px; border:none; background:#f1f5f9; color:#475569; border-radius:6px; cursor:pointer;">Cancel</button>
                    <button id="shapeParamBuild" style="padding:8px 12px; border:none; background:#3b82f6; color:white; border-radius:6px; cursor:pointer;">Create</button>
                </div>
            </div>
        `;
        
        if (canvas && canvas.wrapperEl) {
            canvas.wrapperEl.appendChild(dialog);
        } else {
            document.body.appendChild(dialog);
        }

        const titleEl = document.getElementById('shapeParamTitle');
        const fieldsDiv = document.getElementById('shapeParamFields');
        if (!titleEl || !fieldsDiv) return;

        titleEl.textContent = def.title;
        fieldsDiv.innerHTML = def.fields.map(fld => `
            <div style="margin-bottom:10px;">
                <label style="display:block; font-size:12px; color:#64748b; margin-bottom:4px;">${fld.label}</label>
                <input type="number" id="sp_${fld.key}" value="${fld.default}" style="width:100%; padding:6px; border:1px solid #cbd5e1; border-radius:4px; font-size:14px; box-sizing:border-box;">
            </div>
        `).join('');

        dialog.style.display = 'flex';
        dialog._ctx = { canvas, type, color, def, tool: this };

        const fillCheckbox = document.getElementById('shapeParamFill');
        if (fillCheckbox) {
            if (type === 'line' || type === 'arrow') {
                fillCheckbox.parentElement.style.display = 'none';
            } else {
                fillCheckbox.parentElement.style.display = 'flex';
                fillCheckbox.checked = false; // default empty
            }
        }

        const cancelBtn = document.getElementById('shapeParamCancel');
        const buildBtn = document.getElementById('shapeParamBuild');
        const newCancel = cancelBtn.cloneNode(true);
        const newBuild = buildBtn.cloneNode(true);
        cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);
        buildBtn.parentNode.replaceChild(newBuild, buildBtn);

        newCancel.addEventListener('click', () => { dialog.style.display = 'none'; });
        newBuild.addEventListener('click', () => {
            const { canvas: c, type: t, color: col, def: d, tool } = dialog._ctx;
            const params = {};
            d.fields.forEach(fld => {
                const el = document.getElementById('sp_' + fld.key);
                params[fld.key] = el ? (parseFloat(el.value) || fld.default) : fld.default;
            });
            const withFill = fillCheckbox ? fillCheckbox.checked : false;
            dialog.style.display = 'none';
            tool.buildParametric(c, t, col, params, withFill);
        });
        fieldsDiv.addEventListener('keydown', (e) => { if (e.key === 'Enter') newBuild.click(); });
        setTimeout(() => { const first = fieldsDiv.querySelector('input'); if (first) first.select(); }, 50);
    },

    async buildParametric(canvas, type, color, params, withFill) {
        if (!canvas) return;
        const fabricModule = await import('fabric');
        const f = fabricModule.fabric || fabricModule;

        const ox = 100, oy = 100;
        const fill = withFill ? color : 'transparent';

        const makeLine = (x1, y1, x2, y2) => {
            if (Math.abs(x1 - x2) < 0.001) x2 += 0.01;
            if (Math.abs(y1 - y2) < 0.001) y2 += 0.01;
            return new f.Line([x1, y1, x2, y2], {
                stroke: color, strokeWidth: 2.5, strokeUniform: true,
                strokeLineCap: 'round', strokeLineJoin: 'round',
                selectable: true, perPixelTargetFind: true, targetFindTolerance: 12,
                snapAngle: 15, snapThreshold: 7
            });
        };

        let objs = [];

        const commonArgs = {
            fill: withFill ? color + '33' : 'transparent',
            stroke: color, 
            strokeWidth: 2.5, 
            strokeUniform: true,
            strokeLineJoin: 'round',
            selectable: true,
            perPixelTargetFind: true
        };

        if (type === 'right-triangle') {
            const { a, b } = params;
            objs.push(new f.Polygon([
                {x: 0, y: 0},
                {x: 0, y: a},
                {x: b, y: a}
            ], { left: ox, top: oy, ...commonArgs }));
        } else if (type === 'triangle') {
            const { base, height } = params;
            objs.push(new f.Triangle({
                left: ox, top: oy, width: base, height: height, ...commonArgs
            }));
        } else if (type === 'rect') {
            const { width: w, height: h } = params;
            objs.push(new f.Rect({
                left: ox, top: oy, width: w, height: h, ...commonArgs
            }));
        } else if (type === 'circle') {
            const r = params.radius;
            objs.push(new f.Circle({
                left: ox, top: oy, radius: r, ...commonArgs
            }));
        } else if (type === 'line') {
            const { length: len, angle } = params;
            const rad = (angle * Math.PI) / 180;
            const ex = ox + len * Math.cos(rad);
            const ey = oy + len * Math.sin(rad);
            objs.push(makeLine(ox, oy, ex, ey));
        } else if (type === 'diamond') {
            const s = params.side;
            const hw = s * Math.cos(Math.PI / 6);
            const hh = s * Math.sin(Math.PI / 6);
            objs.push(new f.Polygon([
                {x: hw, y: 0},
                {x: hw * 2, y: hh},
                {x: hw, y: hh * 2},
                {x: 0, y: hh}
            ], { left: ox, top: oy, ...commonArgs }));
        } else if (type === 'arrow') {
            const len = params.length;
            const ex = ox + len;
            objs.push(makeLine(ox, oy, ex, oy));
            objs.push(new f.Triangle({
                left: ex, top: oy - 6, width: 12, height: 12, fill: color, angle: 90, selectable: true
            }));
        }

        objs.forEach(o => canvas.add(o));
        if (objs.length > 1) {
            canvas.setActiveObject(new f.ActiveSelection(objs, { canvas }));
        } else if (objs.length === 1) {
            canvas.setActiveObject(objs[0]);
        }
        canvas.renderAll();
    },

    exportToPNG(canvas, tiptap, onComplete) {
        if (!canvas || !tiptap) return;

        canvas.discardActiveObject();
        canvas.renderAll();

        const objects = canvas.getObjects();
        if (objects.length === 0) {
            if (onComplete) onComplete();
            return;
        }

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        objects.forEach(obj => {
            const bound = obj.getBoundingRect();
            minX = Math.min(minX, bound.left);
            minY = Math.min(minY, bound.top);
            maxX = Math.max(maxX, bound.left + bound.width);
            maxY = Math.max(maxY, bound.top + bound.height);
        });

        const pad = 15;
        minX = Math.max(0, minX - pad);
        minY = Math.max(0, minY - pad);
        const w = maxX - minX + pad * 2;
        const h = maxY - minY + pad * 2;

        const dataUrl = canvas.toDataURL({
            format: 'png',
            multiplier: 2,
            left: minX,
            top: minY,
            width: w,
            height: h
        });

        const jsonStr = JSON.stringify(canvas.toJSON());
        const base64Str = btoa(encodeURIComponent(jsonStr));

        tiptap.chain()
            .focus()
            .insertContent({
                type: 'image',
                attrs: {
                    src: dataUrl,
                    alt: 'Drawing',
                    title: 'Canvas Drawing',
                    width: Math.round(w) + 'px',
                    fabricData: base64Str
                }
            })
            .createParagraphNear()
            .focus('end')
            .run();

        if (onComplete) onComplete();
    }
};
