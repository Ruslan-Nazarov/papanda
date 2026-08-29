import NotesAPI from './api.js';
import { showToast } from './ToastService.js';
import DialogService from './DialogService.js';

class FormulaModalService {
    static currentResolve = null;

    static SYMBOLS = [
        { name: 'Fraction', latex: '\\frac{a}{b}', desc: 'fraction a/b', label: 'Fraction<br><small>\\frac{}{}</small>' },
        { name: 'Root', latex: '\\sqrt{x}', desc: 'square root', label: 'Root<br><small>\\sqrt{}</small>' },
        { name: 'Power', latex: '^{2}', desc: 'superscript power exponent', label: 'Power<br><small>^{}</small>' },
        { name: 'Subscript', latex: '_{i}', desc: 'subscript index', label: 'Subscript<br><small>_{}</small>' },
        { name: 'Integral', latex: '\\int_{a}^{b}', desc: 'integral', label: 'Integral<br><small>\\int</small>' },
        { name: 'Sum', latex: '\\sum_{i=1}^{n}', desc: 'summation sigma', label: 'Sum<br><small>\\sum_{i=1}^{n}</small>' },
        { name: 'Multiply', latex: '\\cdot', desc: 'multiply times dot', label: 'Multiply<br><small>\\cdot</small>' },
        { name: 'Matrix 2x2', latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}', desc: 'matrix pmatrix', label: 'Matrix 2x2<br><small>\\begin{pmatrix}</small>' },
        { name: 'Matrix 3x3', latex: '\\begin{pmatrix} a & b & c \\\\ d & e & f \\\\ g & h & i \\end{pmatrix}', desc: 'matrix pmatrix 3x3', label: 'Matrix 3x3<br><small>3x3</small>' },
        { name: 'Vector', latex: '\\vec{x}', desc: 'vector arrow', label: 'Vector<br><small>\\vec{}</small>' },
        { name: 'Bold Math', latex: '\\mathbf{W}', desc: 'bold matrix tensor', label: 'Bold<br><small>\\mathbf{}</small>' },
        { name: 'Limit', latex: '\\lim_{x \\to \\infty}', desc: 'limit lim', label: 'Limit<br><small>\\lim</small>' },
        { name: 'Alpha', latex: '\\alpha', desc: 'alpha greek', label: 'α<br><small>\\alpha</small>' },
        { name: 'Beta', latex: '\\beta', desc: 'beta greek', label: 'β<br><small>\\beta</small>' },
        { name: 'Gamma', latex: '\\gamma', desc: 'gamma greek', label: 'γ<br><small>\\gamma</small>' },
        { name: 'Delta', latex: '\\Delta', desc: 'delta greek triangle', label: 'Δ<br><small>\\Delta</small>' },
        { name: 'Theta', latex: '\\theta', desc: 'theta greek angle', label: 'θ<br><small>\\theta</small>' },
        { name: 'Lambda', latex: '\\lambda', desc: 'lambda greek', label: 'λ<br><small>\\lambda</small>' },
        { name: 'Pi', latex: '\\pi', desc: 'pi 3.14 greek', label: 'π<br><small>\\pi</small>' },
        { name: 'Sigma', latex: '\\sigma', desc: 'sigma standard deviation', label: 'σ<br><small>\\sigma</small>' },
        { name: 'Omega', latex: '\\Omega', desc: 'omega greek', label: 'Ω<br><small>\\Omega</small>' },
        { name: 'Tanh', latex: '\\tanh(x)', desc: 'hyperbolic tangent', label: 'tanh<br><small>\\tanh()</small>' },
        { name: 'Softmax', latex: '\\text{Softmax}(z_i) = \\frac{e^{z_i}}{\\sum e^{z_j}}', desc: 'softmax probability', label: 'Softmax<br><small>\\text{Softmax}</small>' },
        { name: 'PlusMinus', latex: '\\pm', desc: 'plus minus', label: '±<br><small>\\pm</small>' },
        { name: 'Approx', latex: '\\approx', desc: 'approximately equal', label: '≈<br><small>\\approx</small>' },
        { name: 'LessEqual', latex: '\\le', desc: 'less than or equal', label: '≤<br><small>\\le</small>' },
        { name: 'GreaterEqual', latex: '\\ge', desc: 'greater than or equal', label: '≥<br><small>\\ge</small>' },
        { name: 'NotEqual', latex: '\\ne', desc: 'not equal', label: '≠<br><small>\\ne</small>' },
        { name: 'InSet', latex: '\\in', desc: 'element of set in', label: '∈<br><small>\\in</small>' },
        { name: 'Arrow', latex: '\\to', desc: 'right arrow to implies', label: '→<br><small>\\to</small>' },
        { name: 'Partial', latex: '\\partial', desc: 'partial derivative', label: '∂<br><small>\\partial</small>' },
        { name: 'Infinity', latex: '\\infty', desc: 'infinity inf', label: '∞<br><small>\\infty</small>' }
    ];

    static open({ initialFormula = '', displayMode = false } = {}) {
        return new Promise((resolve) => {
            this.currentResolve = resolve;
            this.renderModal(initialFormula, displayMode);
        });
    }

    static close(result = null) {
        const modal = document.getElementById('formula-editor-modal');
        if (modal) modal.remove();
        if (this.currentResolve) {
            this.currentResolve(result);
            this.currentResolve = null;
        }
    }

    static renderModal(initialFormula, displayMode) {
        const existing = document.getElementById('formula-editor-modal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'formula-editor-modal';
        modal.className = 'formula-modal-backdrop';

        modal.innerHTML = `
            <div class="formula-modal-dialog">
                <div class="formula-modal-header">
                    <div class="formula-modal-title">
                        <span class="formula-modal-icon">∤</span>
                        <h3>Редактор формулы (LaTeX)</h3>
                    </div>
                    <button class="formula-modal-close" id="btn-formula-close">✕</button>
                </div>

                <div class="formula-modal-body">
                    <!-- AI Assistant Card -->
                    <div class="formula-ai-card">
                        <div class="formula-ai-header">
                            <span class="formula-ai-sparkle">✨</span>
                            <div>
                                <div class="formula-ai-title">ИИ-ассистент формул</div>
                                <div class="formula-ai-subtitle">Редактируйте формулы голосом или текстом</div>
                            </div>
                        </div>
                        <div class="formula-ai-actions">
                            <button class="formula-ai-btn formula-ai-text-btn" id="btn-formula-ai-text">
                                <span>🪄</span> Изменить текстом
                            </button>
                            <button class="formula-ai-btn formula-ai-voice-btn" id="btn-formula-ai-voice">
                                <span>🎙️</span> Изменить голосом
                            </button>
                        </div>
                    </div>

                    <!-- Formula Input & Paste -->
                    <div class="formula-input-wrapper">
                        <textarea class="formula-textarea" id="formula-input" rows="3" placeholder="Введите формулу LaTeX...">${this.escapeHtml(initialFormula)}</textarea>
                        <button class="formula-paste-btn" id="btn-formula-paste" title="Вставить из буфера">📋</button>
                    </div>

                    <!-- Live Preview -->
                    <div class="formula-preview-container">
                        <div class="formula-preview-label">Предпросмотр:</div>
                        <div class="formula-preview-box" id="formula-preview"></div>
                    </div>

                    <!-- Search Symbol -->
                    <div class="formula-search-wrapper">
                        <span class="formula-search-icon">🔍</span>
                        <input type="text" class="formula-search-input" id="formula-search" placeholder="Search symbol (e.g. fraction, integral, alpha)...">
                    </div>

                    <!-- Symbols Grid -->
                    <div class="formula-symbols-grid" id="formula-symbols-grid">
                        ${this.SYMBOLS.map(sym => `
                            <button class="formula-symbol-btn" data-latex="${this.escapeHtml(sym.latex)}" data-search="${this.escapeHtml(sym.desc + ' ' + sym.name)}">
                                ${sym.label}
                            </button>
                        `).join('')}
                    </div>
                </div>

                <div class="formula-modal-footer">
                    <button class="formula-btn-cancel" id="btn-formula-cancel">Отмена</button>
                    <button class="formula-btn-save" id="btn-formula-save">Сохранить</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const input = modal.querySelector('#formula-input');
        const preview = modal.querySelector('#formula-preview');
        const searchInput = modal.querySelector('#formula-search');
        const symbolsGrid = modal.querySelector('#formula-symbols-grid');

        // Update live preview
        const updatePreview = () => {
            const val = input.value.trim();
            if (!val) {
                preview.innerHTML = '<span class="formula-preview-empty">Здесь появится отрендеренная формула</span>';
                return;
            }
            if (window.katex) {
                try {
                    preview.innerHTML = window.katex.renderToString(val, { displayMode: true, throwOnError: false });
                } catch (e) {
                    preview.innerHTML = `<span class="formula-preview-error">Ошибка LaTeX: ${e.message}</span>`;
                }
            } else {
                preview.textContent = val;
            }
        };

        input.addEventListener('input', updatePreview);
        updatePreview();

        // Search filter
        searchInput.addEventListener('input', () => {
            const query = searchInput.value.toLowerCase().trim();
            symbolsGrid.querySelectorAll('.formula-symbol-btn').forEach(btn => {
                const searchData = (btn.dataset.search || '').toLowerCase();
                const latexData = (btn.dataset.latex || '').toLowerCase();
                if (!query || searchData.includes(query) || latexData.includes(query)) {
                    btn.style.display = 'flex';
                } else {
                    btn.style.display = 'none';
                }
            });
        });

        // Insert symbol into input at cursor position
        symbolsGrid.querySelectorAll('.formula-symbol-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const snippet = btn.dataset.latex;
                this.insertAtCursor(input, snippet);
                updatePreview();
                input.focus();
            });
        });

        // Paste from clipboard
        modal.querySelector('#btn-formula-paste').addEventListener('click', async () => {
            try {
                const text = await navigator.clipboard.readText();
                if (text) {
                    this.insertAtCursor(input, text);
                    updatePreview();
                    input.focus();
                }
            } catch (err) {
                showToast('Не удалось прочитать буфер обмена', 'warning');
            }
        });

        // AI Text Edit
        modal.querySelector('#btn-formula-ai-text').addEventListener('click', async () => {
            const currentFormula = input.value.trim();
            const prompt = await DialogService.prompt({
                title: '✨ ИИ-ассистент формул',
                message: 'Опишите словами формулу или изменение:',
                placeholder: 'Например: формула матрицы вращения или вектор внимания с коэффициентами альфа',
                icon: '🪄',
                confirmText: 'Сгенерировать'
            });

            if (!prompt) return;

            try {
                showToast('Генерация формулы...', 'info');
                let res;
                if (currentFormula) {
                    res = await NotesAPI.editMath(prompt, currentFormula);
                } else {
                    res = await NotesAPI.textMath(prompt);
                }
                const newLatex = (res && res.result && res.result.formula) || (typeof res?.result === 'string' ? res.result : '') || '';
                if (newLatex) {
                    input.value = newLatex.trim();
                    updatePreview();
                    showToast('Формула обновлена ИИ!', 'success');
                } else {
                    showToast('Не удалось распознать формулу', 'warning');
                }
            } catch (e) {
                console.error(e);
                showToast('Ошибка ИИ-ассистента формул', 'error');
            }
        });

        // AI Voice Edit (Web Speech API)
        modal.querySelector('#btn-formula-ai-voice').addEventListener('click', () => {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRecognition) {
                showToast('Распознавание речи не поддерживается в этом браузере', 'warning');
                return;
            }

            const recognition = new SpeechRecognition();
            recognition.lang = 'ru-RU';
            recognition.interimResults = false;

            const voiceBtn = modal.querySelector('#btn-formula-ai-voice');
            voiceBtn.innerHTML = '<span>🔴</span> Слушаю...';
            voiceBtn.classList.add('is-recording');

            recognition.onresult = async (event) => {
                const speechText = event.results[0][0].transcript;
                showToast(`Распознано: "${speechText}"`, 'info');
                try {
                    const currentFormula = input.value.trim();
                    let res;
                    if (currentFormula) {
                        res = await NotesAPI.editMath(speechText, currentFormula);
                    } else {
                        res = await NotesAPI.textMath(speechText);
                    }
                    const newLatex = (res && res.result && res.result.formula) || (typeof res?.result === 'string' ? res.result : '') || '';
                    if (newLatex) {
                        input.value = newLatex.trim();
                        updatePreview();
                        showToast('Формула сгенерирована голосом!', 'success');
                    }
                } catch (e) {
                    console.error(e);
                    showToast('Ошибка обработки голоса ИИ', 'error');
                }
            };

            recognition.onerror = (e) => {
                console.error('Speech error', e);
                showToast('Ошибка распознавания голоса', 'warning');
            };

            recognition.onend = () => {
                voiceBtn.innerHTML = '<span>🎙️</span> Изменить голосом';
                voiceBtn.classList.remove('is-recording');
            };

            recognition.start();
        });

        // Close & Cancel
        modal.querySelector('#btn-formula-close').addEventListener('click', () => this.close(null));
        modal.querySelector('#btn-formula-cancel').addEventListener('click', () => this.close(null));

        // Save
        modal.querySelector('#btn-formula-save').addEventListener('click', () => {
            const formula = input.value.trim();
            this.close(formula);
        });

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.close(null);
        });
    }

    static insertAtCursor(textarea, text) {
        const start = textarea.selectionStart || 0;
        const end = textarea.selectionEnd || 0;
        const val = textarea.value;
        textarea.value = val.substring(0, start) + text + val.substring(end);
        textarea.selectionStart = textarea.selectionEnd = start + text.length;
    }

    static escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
}

export default FormulaModalService;
