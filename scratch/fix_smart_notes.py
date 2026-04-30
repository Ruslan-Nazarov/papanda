import os

file_path = r'd:/Библиотека/Исследования/Искусственный интеллект/papanda/papanda v 0.6 experiment/fastapi_app/static/js/smart_notes.js'

with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
    lines = f.readlines()

# Line numbers in the prompt were 1-indexed.
# Lines to remove: 706 to 854 (inclusive)
# In 0-indexed list: index 705 to 853 (inclusive)

start_idx = 705
end_idx = 854 # 854 because slicing is [start:end] and we want to include 853.

clean_code = """    insertGraphToNote() {
        const canvas = this.dom.graphCanvas;
        const data   = this._lastGraphData;
        if (!canvas || !data) {
            alert('Сначала постройте график в окне предпросмотра');
            return;
        }

        const funcStr = data.funcStr;
        const xMin    = String(data.xMin);
        const xMax    = String(data.xMax);

        const mkDiv = () => {
            const d = document.createElement('div');
            d.className = 'smart-graph';
            d.contentEditable = 'false';
            d.dataset.formula = funcStr;
            d.dataset.xmin    = xMin;
            d.dataset.xmax    = xMax;
            d.innerHTML = `<canvas class="inline-graph-canvas" style="max-width:100%; height:auto; background:#fff; border-radius:8px;"></canvas>`;
            d.ondblclick = () => this.editGraph(d);
            return d;
        };

        const targetNode = this.state.currentGraphNode;
        const newGraph = mkDiv();
        
        if (targetNode) {
            targetNode.replaceWith(newGraph);
            this.state.currentGraphNode = null;
            this.renderGraphInline(newGraph);
        } else {
            this.dom.rendered.focus();
            const sel = window.getSelection();
            if (sel.rangeCount) {
                const range = sel.getRangeAt(0);
                range.deleteContents();
                
                // 1. Создаем контейнер-блок на всю ширину
                const blockWrapper = document.createElement('div');
                blockWrapper.style.display = "block";
                blockWrapper.style.width = "100%";
                blockWrapper.style.margin = "20px 0";
                blockWrapper.style.clear = "both";
                blockWrapper.appendChild(newGraph);
                range.insertNode(blockWrapper);
                
                // 2. Создаем пустую строку (div) после графика
                const nextLine = document.createElement('div');
                nextLine.style.display = "block";
                nextLine.style.width = "100%";
                nextLine.style.minHeight = "1.2em";
                nextLine.innerHTML = "<br>"; 
                
                // Вставляем пустую строку после обертки графика
                blockWrapper.after(nextLine);
                
                this.renderGraphInline(newGraph);
                
                // 3. Переводим фокус на новую строку
                setTimeout(() => {
                    this.dom.rendered.focus();
                    const finalRange = document.createRange();
                    finalRange.setStart(nextLine, 0);
                    finalRange.collapse(true);
                    const finalSel = window.getSelection();
                    finalSel.removeAllRanges();
                    finalSel.addRange(finalRange);
                }, 10);
            } else {
                this.dom.rendered.appendChild(newGraph);
                this.renderGraphInline(newGraph);
            }
        }

        this.switchTab('normal');
        this.syncToMarkup();
        if (this.dom.insertGraphBtn) this.dom.insertGraphBtn.innerText = 'Вставить график';
    }

    editGraph(graphNode) {
        // Загружаем данные графика обратно в меню
        this.state.currentGraphNode = graphNode;
        this.dom.graphInput.value = graphNode.dataset.formula || 'x';
        this.dom.graphXMin.value = graphNode.dataset.xmin || '-10';
        this.dom.graphXMax.value = graphNode.dataset.xmax || '10';
        
        // Меняем текст кнопки
        if (this.dom.insertGraphBtn) this.dom.insertGraphBtn.innerText = 'Обновить график';
        
        // Переключаемся на вкладку с графиками
        this.switchTab('graph');
    }
"""

new_lines = lines[:start_idx] + [clean_code + "\n"] + lines[end_idx:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("File fixed successfully.")
