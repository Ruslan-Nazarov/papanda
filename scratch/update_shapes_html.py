import re

file_path = r'd:/Библиотека/Исследования/Искусственный интеллект/papanda/papanda v 0.6 experiment/fastapi_app/templates/smart_notes.html'

with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

new_shapes_html = """                <div id="editor-shapes" style="display: none;" class="special-editor-area">
                    <div class="shapes-layout">
                        <div class="shapes-sidebar">
                            <div class="shape-tool-group">
                                <label>Фигуры</label>
                                <button class="shape-btn" type="button" onclick="app.setShapeType('triangle')" title="Треугольник">▲</button>
                                <button class="shape-btn" type="button" onclick="app.setShapeType('square')" title="Квадрат">■</button>
                                <button class="shape-btn" type="button" onclick="app.setShapeType('circle')" title="Круг">●</button>
                            </div>
                            <div class="shape-tool-group">
                                <label>Инструменты</label>
                                <button class="shape-btn" type="button" onclick="app.setShapeTool('arrow')" title="Стрелка">↗</button>
                                <button class="shape-btn" type="button" onclick="app.setShapeTool('text')" title="Подпись">T</button>
                            </div>
                            <button id="btnInsertShape" type="button" class="btn-insert-special" style="margin-top:auto;" onclick="app.insertShapeToNote()">Вставить</button>
                        </div>
                        <div class="shapes-canvas-area">
                            <svg id="shapesSvg" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet" style="background: white; border: 1px solid #e2e8f0; border-radius: 8px;">
                                <defs>
                                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                                        <polygon points="0 0, 10 3.5, 0 7" fill="#475569" />
                                    </marker>
                                </defs>
                                <g id="shapesGroup"></g>
                            </svg>
                            <div class="shapes-hint">Выберите фигуру и кликните на холст</div>
                        </div>
                    </div>
                </div>"""

# Find the editor-shapes div and replace it
content = re.sub(r'<div id="editor-shapes"[\s\S]*?</div>\s*</div>', new_shapes_html, content, 1)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("HTML updated with Shapes layout.")
