import AppState from './AppState.js';
import DialogService from './DialogService.js';
import HiddenPhraseTooltip from './HiddenPhraseTooltip.js';
import { t } from '../i18n.js';

class DictModalService {
    static activeClose = null;

    static textLinks(text) {
        return [...String(text || '').matchAll(/\[((?:\\.|[^\]\\])*)\]\((internal:\/\/note\/[a-zA-Z0-9_-]+(?:\/block\/[a-zA-Z0-9_-]+)?)\)/g)];
    }

    static linkLabel(label) {
        return label.replace(/\\([\\[\]])/g, '$1');
    }

    static renderText(element, text = '') {
        element.replaceChildren();
        let offset = 0;
        for (const match of this.textLinks(text)) {
            element.append(text.slice(offset, match.index));
            const link = document.createElement('a');
            link.className = 'dict-block-reference';
            link.href = match[2];
            link.textContent = this.linkLabel(match[1]);
            element.appendChild(link);
            offset = match.index + match[0].length;
        }
        element.append(text.slice(offset));
    }

    static renderMath(element) {
        // Text and internal link labels stay plain text; only delimited TeX is rendered.
        window.renderMathInElement?.(element, {
            delimiters: [
                {left: '$$', right: '$$', display: true},
                {left: '\\[', right: '\\]', display: true},
                {left: '\\(', right: '\\)', display: false},
                {left: '$', right: '$', display: false},
            ],
            throwOnError: false,
            trust: false,
        });
    }

    static updateBadges() {
        const count = AppState.currentNote?.dictionary?.length || 0;
        document.querySelectorAll('.dialectics-block .btn-dict').forEach(button => {
            button.setAttribute('aria-label', `${t('dict_title')} (${count})`);
            let badge = button.querySelector('.dict-badge');
            if (count > 0) {
                if (!badge) {
                    badge = document.createElement('span');
                    badge.className = 'dict-badge';
                    badge.setAttribute('aria-hidden', 'true');
                    button.appendChild(badge);
                }
                badge.textContent = String(count);
            } else {
                badge?.remove();
            }
        });
    }

    static show(initialWord = '') {
        this.activeClose?.();
        const previousFocus = document.activeElement;
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        const dialog = document.createElement('section');
        dialog.className = 'modal-dialog dict-modal';
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');
        dialog.setAttribute('aria-label', t('dict_title'));
        dialog.innerHTML = `
            <div class="modal-dialog-header">
                <h2>📖 ${t('dict_title')}</h2>
                <button class="icon-btn dict-close" type="button" aria-label="${t('close')}">✕</button>
            </div>
            <div class="modal-dialog-body">
                <div class="dict-view">
                    <div class="dict-toolbar">
                        <input class="dict-search" type="search" placeholder="${t('dict_search')}" aria-label="${t('dict_search')}">
                        <button class="dict-add action-btn" type="button">${t('dict_add_btn')}</button>
                    </div>
                    <div class="dict-view-switch" role="group" aria-label="${t('dict_view_label')}">
                        <button class="dict-view-list is-active" type="button" aria-pressed="true">${t('dict_view_list')}</button>
                        <button class="dict-view-graph" type="button" aria-pressed="false">${t('dict_view_graph')}</button>
                    </div>
                    <div class="dict-list"></div>
                    <div class="dict-graph" hidden>
                        <div class="dict-graph-heading">
                            <div><strong>${t('dict_graph_title')}</strong><p>${t('dict_graph_hint')}</p></div>
                            <span class="dict-graph-count"></span>
                        </div>
                        <div class="dict-graph-scroll"><div class="dict-graph-canvas"></div></div>
                        <div class="dict-graph-overflow" hidden></div>
                        <div class="dict-graph-detail"></div>
                        <div class="dict-graph-index-heading">${t('dict_graph_all')}</div>
                        <div class="dict-graph-index"></div>
                    </div>
                </div>
                <div class="dict-editor" hidden>
                    <h3 class="dict-editor-title"></h3>
                    <label>${t('dict_word_label')}<input class="dict-word" type="text" maxlength="150" placeholder="${t('dict_word_ph')}"></label>
                    <div class="dict-text-field"><label>${t('dict_definition_label')}<textarea class="dict-definition" rows="5" maxlength="10000" placeholder="${t('dict_expl_ph')}"></textarea></label></div>
                    <label for="dict-connections-input">${t('dict_connections')}</label>
                    <div class="dict-connections-field">
                        <input id="dict-connections-input" class="dict-connections" type="text" placeholder="${t('dict_conn_ph')}" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="dict-connection-options" autocomplete="off">
                        <div id="dict-connection-options" class="dict-connection-options" role="listbox" hidden></div>
                    </div>
                    <div class="dict-connection-explanations"></div>
                    <p class="dict-error" role="alert" hidden></p>
                    <div class="dict-editor-actions">
                        <button class="dict-delete" type="button" hidden>${t('dict_del_word')}</button>
                        <button class="dict-cancel" type="button">${t('cancel')}</button>
                        <button class="dict-save" type="button">${t('save')}</button>
                    </div>
                </div>
            </div>
            <div class="modal-dialog-footer"><button class="dict-done" type="button">${t('dict_done')}</button></div>
        `;
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        const view = dialog.querySelector('.dict-view');
        const editor = dialog.querySelector('.dict-editor');
        const list = dialog.querySelector('.dict-list');
        const graph = dialog.querySelector('.dict-graph');
        const graphScroll = dialog.querySelector('.dict-graph-scroll');
        const graphCanvas = dialog.querySelector('.dict-graph-canvas');
        const graphDetail = dialog.querySelector('.dict-graph-detail');
        const graphIndex = dialog.querySelector('.dict-graph-index');
        const graphOverflow = dialog.querySelector('.dict-graph-overflow');
        const listSwitch = dialog.querySelector('.dict-view-list');
        const graphSwitch = dialog.querySelector('.dict-view-graph');
        const search = dialog.querySelector('.dict-search');
        search.value = typeof initialWord === 'string' ? initialWord : '';
        const wordInput = dialog.querySelector('.dict-word');
        const definitionInput = dialog.querySelector('.dict-definition');
        const connectionsInput = dialog.querySelector('.dict-connections');
        const connectionOptions = dialog.querySelector('.dict-connection-options');
        const explanationFields = dialog.querySelector('.dict-connection-explanations');
        const error = dialog.querySelector('.dict-error');
        const deleteButton = dialog.querySelector('.dict-delete');
        const footer = dialog.querySelector('.modal-dialog-footer');
        let editingIndex = null;
        let suggestions = [];
        let activeSuggestion = -1;
        let graphActive = false;
        let selectedGraphIndex = 0;
        let linkPickerOpen = false;
        const explanationDrafts = new Map();
        const splitConnections = value => String(value || '').split(/[,;\n]/).map(part => part.trim()).filter(Boolean);
        const normalize = value => value.trim().toLocaleLowerCase();
        const findEntry = (entries, name) => entries.find(entry =>
            normalize(entry.word) === normalize(name) ||
            [...entry.word.matchAll(/\(([^()]+)\)/g)].some(match => normalize(match[1]) === normalize(name)));
        const explanationFor = (entry, name) => {
            const key = Object.keys(entry?.connection_explanations || {}).find(key => normalize(key) === normalize(name));
            return key ? entry.connection_explanations[key] : '';
        };
        const hideGraphHint = () => {
            if (HiddenPhraseTooltip.active?.root === graphCanvas) HiddenPhraseTooltip.hide();
        };
        const renderGraphHint = (tooltip, hint) => {
            tooltip.classList.add('dict-graph-tooltip');
            const separator = hint.indexOf('\n\n');
            const title = document.createElement('strong');
            title.textContent = hint.slice(0, separator);
            const content = document.createElement('p');
            this.renderText(content, hint.slice(separator + 2));
            tooltip.append(title, content);
            this.renderMath(tooltip);
            tooltip.addEventListener('click', event => {
                if (event.target.closest('a.dict-block-reference')) close();
            });
        };
        const disposeGraphHints = HiddenPhraseTooltip.bind(graphCanvas, {
            selector: '[data-hint]', render: renderGraphHint,
        });
        const addLinkButton = field => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'dict-insert-link';
            button.textContent = t('dict_helper_link');
            button.addEventListener('mousedown', event => event.preventDefault());
            button.addEventListener('click', async () => {
                if (linkPickerOpen) return;
                const original = field.value;
                let start = field.selectionStart;
                let end = field.selectionEnd;
                const existing = this.textLinks(original).find(match => start >= match.index
                    && end <= match.index + match[0].length && start < match.index + match[0].length);
                const label = existing ? this.linkLabel(existing[1]) : original.slice(start, end);
                if (existing) { start = existing.index; end = start + existing[0].length; }
                linkPickerOpen = true;
                button.disabled = true;
                try {
                    const targets = await DialogService.selectInternalLinks({
                        noteId: AppState.currentNote.id,
                        isEditing: Boolean(existing),
                        existingLinks: existing ? [{url: existing[2], text: label, label}] : [],
                    });
                    if (!overlay.isConnected || !field.isConnected || editor.hidden || field.value !== original) return;
                    if (targets !== null) {
                        const escapeLabel = value => value.replace(/[\\[\]]/g, '\\$&');
                        const replacement = targets.length ? targets.map((target, index) =>
                            `[${escapeLabel((index === 0 && label) || target.text || target.label || t('dict_link_sample'))}](${target.url})`).join(', ') : label;
                        if (original.length - (end - start) + replacement.length > field.maxLength) {
                            error.textContent = t('dict_text_too_long').replace('{limit}', String(field.maxLength));
                            error.hidden = false;
                        } else {
                            field.setRangeText(replacement, start, end, 'end');
                            field.dispatchEvent(new window.Event('input', {bubbles: true}));
                            error.hidden = true;
                        }
                    }
                    field.focus();
                } finally {
                    linkPickerOpen = false;
                    button.disabled = false;
                }
            });
            field.parentElement.after(button);
        };
        addLinkButton(definitionInput);
        const renderExplanationFields = () => {
            [...explanationFields.querySelectorAll('textarea[data-connection]')].forEach(field => {
                explanationDrafts.set(normalize(field.dataset.connection), field.value);
            });
            explanationFields.replaceChildren();
            if (!splitConnections(connectionsInput.value).length) {
                const label = document.createElement('label');
                label.textContent = t('dict_connection_explanation');
                const field = document.createElement('textarea');
                field.className = 'dict-connection-explanation';
                field.rows = 2;
                field.disabled = true;
                field.placeholder = t('dict_connection_first');
                label.appendChild(field);
                explanationFields.appendChild(label);
                return;
            }
            const seen = new Set();
            splitConnections(connectionsInput.value).forEach(name => {
                const target = findEntry(AppState.currentNote?.dictionary || [], name);
                const key = normalize(target?.word || name);
                if (seen.has(key) || (editingIndex !== null && target === AppState.currentNote.dictionary[editingIndex])) return;
                seen.add(key);
                const label = document.createElement('label');
                label.textContent = `${t('dict_connection_explanation')}: ${target?.word || name}`;
                const field = document.createElement('textarea');
                field.className = 'dict-connection-explanation';
                field.rows = 2;
                field.maxLength = 10000;
                field.dataset.connection = target?.word || name;
                const old = editingIndex === null ? null : AppState.currentNote.dictionary[editingIndex];
                field.value = explanationDrafts.get(key) ?? (explanationFor(old, target?.word || name)
                    || (target && old ? explanationFor(target, old.word) : ''));
                field.placeholder = t('dict_connection_explanation_ph');
                label.appendChild(field);
                const wrapper = document.createElement('div');
                wrapper.className = 'dict-text-field';
                wrapper.appendChild(label);
                explanationFields.appendChild(wrapper);
                addLinkButton(field);
            });
        };

        const hideSuggestions = () => {
            suggestions = [];
            activeSuggestion = -1;
            connectionOptions.replaceChildren();
            connectionOptions.hidden = true;
            connectionsInput.setAttribute('aria-expanded', 'false');
            connectionsInput.removeAttribute('aria-activedescendant');
        };
        const currentConnection = () => {
            const value = connectionsInput.value;
            const caret = connectionsInput.selectionStart ?? value.length;
            const start = Math.max(value.lastIndexOf(',', caret - 1), value.lastIndexOf(';', caret - 1), value.lastIndexOf('\n', caret - 1)) + 1;
            const nextSeparator = value.slice(caret).search(/[,;\n]/);
            const end = nextSeparator < 0 ? value.length : caret + nextSeparator;
            return {start, end, query: value.slice(start, caret).trim().toLocaleLowerCase()};
        };
        const setActiveSuggestion = index => {
            activeSuggestion = index;
            [...connectionOptions.children].forEach((option, position) => {
                option.setAttribute('aria-selected', String(position === index));
            });
            if (index < 0) connectionsInput.removeAttribute('aria-activedescendant');
            else {
                const option = connectionOptions.children[index];
                connectionsInput.setAttribute('aria-activedescendant', option.id);
                option.scrollIntoView?.({block: 'nearest'});
            }
        };
        const chooseSuggestion = index => {
            const selected = suggestions[index];
            if (!selected) return;
            const {start, end} = currentConnection();
            const value = connectionsInput.value;
            const before = value.slice(0, start);
            const after = value.slice(end);
            const suffix = after ? '' : ', ';
            connectionsInput.value = `${before}${before && !/\s$/.test(before) ? ' ' : ''}${selected.term}${suffix}${after}`;
            const caret = connectionsInput.value.length - after.length;
            connectionsInput.setSelectionRange(caret, caret);
            hideSuggestions();
            renderExplanationFields();
            connectionsInput.focus();
        };
        const renderSuggestions = () => {
            const {query} = currentConnection();
            if (!query) { hideSuggestions(); return; }
            const entries = AppState.currentNote?.dictionary || [];
            const existing = new Set(connectionsInput.value.split(/[,;\n]/).map(part => part.trim().toLocaleLowerCase()));
            const matches = [];
            const seen = new Set();
            entries.forEach((entry, index) => {
                if (index === editingIndex) return;
                const terms = [entry.word, ...[...entry.word.matchAll(/\(([^()]+)\)/g)].map(match => match[1].trim())];
                terms.forEach(term => {
                    const normalized = term.toLocaleLowerCase();
                    if (normalized.includes(query) && !seen.has(normalized) && (normalized === query || !existing.has(normalized))) {
                        seen.add(normalized);
                        matches.push({term, word: entry.word, priority: normalized.startsWith(query) ? 0 : 1});
                    }
                });
            });
            suggestions = matches.sort((a, b) => a.priority - b.priority || a.term.localeCompare(b.term)).slice(0, 8);
            connectionOptions.replaceChildren();
            suggestions.forEach((suggestion, index) => {
                const option = document.createElement('button');
                option.type = 'button';
                option.id = `dict-connection-option-${index}`;
                option.className = 'dict-connection-option';
                option.setAttribute('role', 'option');
                option.setAttribute('aria-selected', 'false');
                option.textContent = suggestion.term === suggestion.word ? suggestion.term : `${suggestion.term} — ${suggestion.word}`;
                option.addEventListener('mousedown', event => event.preventDefault());
                option.addEventListener('click', () => chooseSuggestion(index));
                connectionOptions.appendChild(option);
            });
            connectionOptions.hidden = !suggestions.length;
            connectionsInput.setAttribute('aria-expanded', String(Boolean(suggestions.length)));
            setActiveSuggestion(-1);
        };

        const close = () => {
            hideSuggestions();
            disposeGraphHints();
            overlay.remove();
            document.removeEventListener('noteOpened', close);
            document.removeEventListener('keydown', onKeydown);
            if (this.activeClose === close) this.activeClose = null;
            if (previousFocus?.isConnected) previousFocus.focus();
        };
        const showView = () => {
            hideSuggestions();
            editor.hidden = true;
            view.hidden = false;
            footer.hidden = false;
            editingIndex = null;
            renderList();
            if (graphActive) renderGraph();
            search.focus();
        };
        const showEditor = (index = null) => {
            const item = index === null ? null : AppState.currentNote.dictionary?.[index];
            if (index !== null && !item) return;
            hideGraphHint();
            editingIndex = index;
            wordInput.value = item?.word || '';
            definitionInput.value = item?.definition || '';
            connectionsInput.value = item?.connections || '';
            explanationDrafts.clear();
            explanationFields.replaceChildren();
            renderExplanationFields();
            hideSuggestions();
            error.hidden = true;
            dialog.querySelector('.dict-editor-title').textContent = t(item ? 'dict_edit_concept' : 'dict_new_concept');
            deleteButton.hidden = !item;
            view.hidden = true;
            editor.hidden = false;
            footer.hidden = true;
            wordInput.focus();
        };
        const renderList = () => {
            list.replaceChildren();
            const words = AppState.currentNote.dictionary || [];
            const wordIndexes = new Map();
            words.forEach((item, index) => {
                wordIndexes.set(item.word.trim().toLocaleLowerCase(), index);
                for (const match of item.word.matchAll(/\(([^()]+)\)/g)) {
                    const alias = match[1].trim().toLocaleLowerCase();
                    if (alias && !wordIndexes.has(alias)) wordIndexes.set(alias, index);
                }
            });
            const query = search.value.trim().toLocaleLowerCase();
            let shown = 0;
            words.forEach((entry, index) => {
                if (![entry.word, entry.definition, entry.connections, ...Object.values(entry.connection_explanations || {})].some(value =>
                    String(value || '').toLocaleLowerCase().includes(query))) return;
                shown++;
                const card = document.createElement('article');
                card.className = 'dict-entry';
                const content = document.createElement('div');
                const title = document.createElement('strong');
                title.textContent = entry.word;
                const definition = document.createElement('p');
                this.renderText(definition, entry.definition || '');
                content.append(title, definition);
                if (entry.connections) {
                    const connections = document.createElement('small');
                    connections.append(`${t('dict_connections')}: `);
                    entry.connections.split(/([,;\n])/).forEach(part => {
                        const target = wordIndexes.get(part.trim().toLocaleLowerCase());
                        if (target === undefined || !part.trim()) {
                            connections.append(part);
                            return;
                        }
                        const link = document.createElement('button');
                        link.type = 'button';
                        link.className = 'dict-link';
                        link.textContent = part.trim();
                        link.addEventListener('click', () => {
                            search.value = '';
                            renderList();
                            const targetCard = list.querySelector(`[data-dict-index="${target}"]`);
                            targetCard?.scrollIntoView?.({block: 'center'});
                            targetCard?.classList.add('dict-entry-target');
                            targetCard?.setAttribute('tabindex', '-1');
                            targetCard?.focus();
                        });
                        connections.append(link);
                    });
                    content.appendChild(connections);
                }
                Object.entries(entry.connection_explanations || {}).forEach(([name, explanation]) => {
                    if (!explanation) return;
                    const detail = document.createElement('small');
                    this.renderText(detail, `${name}: ${explanation}`);
                    content.appendChild(detail);
                });
                const edit = document.createElement('button');
                edit.type = 'button';
                edit.className = 'dict-edit';
                edit.textContent = t('tt_edit');
                edit.addEventListener('click', () => showEditor(index));
                const openGraph = document.createElement('button');
                openGraph.type = 'button';
                openGraph.className = 'dict-open-graph';
                openGraph.textContent = t('dict_view_graph');
                openGraph.setAttribute('aria-label', `${t('dict_view_graph')}: ${entry.word}`);
                openGraph.addEventListener('click', () => {
                    selectedGraphIndex = index;
                    setGraphActive(true);
                    dialog.querySelector('.modal-dialog-body').scrollTop = 0;
                    graphSwitch.focus({preventScroll: true});
                });
                const actions = document.createElement('div');
                actions.className = 'dict-entry-actions';
                actions.append(edit, openGraph);
                card.append(content, actions);
                card.dataset.dictIndex = String(index);
                list.appendChild(card);
            });
            if (!shown) {
                const empty = document.createElement('p');
                empty.className = 'dict-empty';
                empty.textContent = t(words.length ? 'dict_no_results' : 'dict_empty');
                list.appendChild(empty);
            }
            this.renderMath(list);
        };
        const graphMatches = (entry, query) => [entry.word, entry.definition, entry.connections,
            ...Object.values(entry.connection_explanations || {})].some(value =>
            String(value || '').toLocaleLowerCase().includes(query));
        const renderGraph = () => {
            if (!graphActive) return;
            hideGraphHint();
            const words = AppState.currentNote?.dictionary || [];
            const query = search.value.trim().toLocaleLowerCase();
            if (selectedGraphIndex >= words.length) selectedGraphIndex = Math.max(0, words.length - 1);
            const selected = words[selectedGraphIndex];
            graphCanvas.replaceChildren();
            graphDetail.replaceChildren();
            graphIndex.replaceChildren();
            graphOverflow.hidden = true;
            dialog.querySelector('.dict-graph-count').textContent = `${t('dict_graph_count')}: ${words.length}`;
            if (!selected) {
                const empty = document.createElement('p');
                empty.className = 'dict-graph-empty';
                empty.textContent = t('dict_empty');
                graphCanvas.appendChild(empty);
                return;
            }

            // Resolve aliases just as the list view does, and include links pointing to the focus.
            const related = new Map();
            const addRelated = (index, name) => {
                if (index === selectedGraphIndex) return;
                const key = index === null ? `missing:${normalize(name)}` : `entry:${index}`;
                if (!related.has(key)) related.set(key, {index, name: index === null ? name : words[index].word});
            };
            splitConnections(selected.connections).forEach(name => {
                const target = findEntry(words, name);
                addRelated(target ? words.indexOf(target) : null, name);
            });
            words.forEach((entry, index) => {
                if (index !== selectedGraphIndex && splitConnections(entry.connections).some(name =>
                    findEntry([selected], name) === selected)) addRelated(index, entry.word);
            });
            const explanationTo = (entry, name, target) => Object.entries(entry?.connection_explanations || {})
                .find(([key]) => normalize(key) === normalize(name) || (target && findEntry([target], key)))?.[1] || '';
            const neighbors = [...related.values()].map(neighbor => {
                const counterpart = neighbor.index === null ? null : words[neighbor.index];
                return {...neighbor, explanation: explanationTo(selected, neighbor.name, counterpart)
                    || explanationTo(counterpart, selected.word, selected)};
            });
            const visible = neighbors.slice(0, 8);
            const positions = visible.map((_, index) => {
                if (visible.length === 1) return {x: 80, y: 50};
                const angle = -Math.PI / 2 + index * 2 * Math.PI / visible.length;
                return {x: 50 + 33 * Math.cos(angle), y: 50 + 32 * Math.sin(angle)};
            });
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('viewBox', '0 0 100 100');
            svg.setAttribute('preserveAspectRatio', 'none');
            svg.setAttribute('aria-hidden', 'true');
            svg.classList.add('dict-graph-lines');
            positions.forEach(({x, y}, index) => {
                const neighbor = visible[index];
                const hint = `${selected.word} ↔ ${neighbor.name}\n\n${neighbor.explanation || t('dict_graph_no_explanation')}`;
                const edge = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                edge.classList.add('dict-graph-edge');
                edge.dataset.hint = hint;
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                for (const [key, value] of Object.entries({x1: 50, y1: 50, x2: x, y2: y})) line.setAttribute(key, value);
                const hitArea = line.cloneNode();
                hitArea.classList.add('dict-graph-edge-hit');
                edge.append(line, hitArea);
                svg.appendChild(edge);
                const marker = document.createElement('button');
                marker.type = 'button';
                marker.className = 'dict-graph-edge-info';
                // Leave room for the larger card at the center of the graph.
                marker.style.left = `${50 + (x - 50) * .55}%`;
                marker.style.top = `${50 + (y - 50) * .55}%`;
                marker.textContent = 'i';
                marker.dataset.hint = hint;
                marker.setAttribute('aria-label', `${t('dict_connection_explanation')}: ${selected.word} ↔ ${neighbor.name}`);
                marker.addEventListener('click', () => HiddenPhraseTooltip.show(marker, graphCanvas, renderGraphHint));
                graphCanvas.appendChild(marker);
            });
            graphCanvas.appendChild(svg);
            const makeNode = (name, definition, x, y, className, onClick) => {
                const node = document.createElement(onClick ? 'button' : 'span');
                if (onClick) {
                    node.type = 'button';
                    node.addEventListener('click', onClick);
                }
                node.className = `dict-graph-node ${className}`;
                node.style.left = `${x}%`;
                node.style.top = `${y}%`;
                node.textContent = name;
                node.dataset.hint = `${name}\n\n${className === 'is-missing' ? t('dict_graph_missing') : definition || t('dict_graph_no_definition')}`;
                if (!onClick) node.tabIndex = 0;
                graphCanvas.appendChild(node);
            };
            visible.forEach((neighbor, index) => {
                const {x, y} = positions[index];
                makeNode(neighbor.name, words[neighbor.index]?.definition, x, y, neighbor.index === null ? 'is-missing' : '',
                    neighbor.index === null ? null : () => {
                        selectedGraphIndex = neighbor.index;
                        renderGraph();
                        graphCanvas.querySelector('.dict-graph-node.is-selected')?.focus({preventScroll: true});
                    });
            });
            makeNode(selected.word, selected.definition, 50, 50, 'is-selected', () => graphDetail.querySelector('.dict-graph-edit')?.focus());
            if (neighbors.length > visible.length) {
                graphOverflow.textContent = `${t('dict_graph_more')} ${neighbors.length - visible.length}`;
                graphOverflow.hidden = false;
            }

            const detailTitle = document.createElement('strong');
            detailTitle.textContent = selected.word;
            const edit = document.createElement('button');
            edit.type = 'button';
            edit.className = 'dict-edit dict-graph-edit';
            edit.textContent = t('tt_edit');
            edit.addEventListener('click', () => showEditor(selectedGraphIndex));
            const detailHeader = document.createElement('div');
            detailHeader.className = 'dict-graph-detail-header';
            detailHeader.append(detailTitle, edit);
            const definition = document.createElement('p');
            this.renderText(definition, selected.definition || '');
            graphDetail.append(detailHeader, definition);
            if (neighbors.length) {
                const relationList = document.createElement('div');
                relationList.className = 'dict-graph-relations';
                neighbors.forEach(neighbor => {
                    const row = document.createElement('div');
                    const name = neighbor.index === null ? document.createElement('span') : document.createElement('button');
                    if (neighbor.index !== null) {
                        name.type = 'button';
                        name.addEventListener('click', () => {
                            selectedGraphIndex = neighbor.index;
                            renderGraph();
                            graphCanvas.querySelector('.dict-graph-node.is-selected')?.focus({preventScroll: true});
                        });
                    }
                    name.textContent = neighbor.name;
                    if (neighbor.index === null) name.title = t('dict_graph_missing');
                    row.appendChild(name);
                    const explanation = neighbor.explanation;
                    if (explanation) {
                        const caption = document.createElement('span');
                        this.renderText(caption, explanation);
                        row.appendChild(caption);
                    }
                    relationList.appendChild(row);
                });
                graphDetail.appendChild(relationList);
            } else {
                const noLinks = document.createElement('small');
                noLinks.textContent = t('dict_graph_no_links');
                graphDetail.appendChild(noLinks);
            }
            const matches = words.map((entry, index) => ({entry, index}))
                .filter(({entry}) => graphMatches(entry, query));
            if (!matches.length) {
                const empty = document.createElement('p');
                empty.className = 'dict-empty';
                empty.textContent = t('dict_no_results');
                graphIndex.appendChild(empty);
            }
            matches.forEach(({entry, index}) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'dict-graph-index-item';
                button.setAttribute('aria-pressed', String(index === selectedGraphIndex));
                button.textContent = entry.word;
                button.addEventListener('click', () => {
                    selectedGraphIndex = index;
                    renderGraph();
                    graphIndex.querySelector('[aria-pressed="true"]')?.focus({preventScroll: true});
                });
                graphIndex.appendChild(button);
            });
            this.renderMath(graph);
            graphScroll.scrollLeft = Math.max(0, (graphScroll.scrollWidth - graphScroll.clientWidth) / 2);
        };
        const setGraphActive = active => {
            hideGraphHint();
            graphActive = active;
            list.hidden = active;
            graph.hidden = !active;
            dialog.classList.toggle('dict-modal-graph', active);
            listSwitch.classList.toggle('is-active', !active);
            graphSwitch.classList.toggle('is-active', active);
            listSwitch.setAttribute('aria-pressed', String(!active));
            graphSwitch.setAttribute('aria-pressed', String(active));
            if (active) renderGraph();
            else renderList();
        };
        const onKeydown = event => {
            if (event.key !== 'Escape' || linkPickerOpen) return;
            if (HiddenPhraseTooltip.active?.root === graphCanvas) { event.preventDefault(); hideGraphHint(); return; }
            if (!connectionOptions.hidden) { event.preventDefault(); hideSuggestions(); return; }
            event.preventDefault();
            if (!editor.hidden) showView();
            else close();
        };

        dialog.querySelector('.dict-close').addEventListener('click', close);
        dialog.addEventListener('click', event => {
            if (event.target.closest('a.dict-block-reference')) close();
        });
        dialog.querySelector('.dict-done').addEventListener('click', close);
        dialog.querySelector('.dict-add').addEventListener('click', () => showEditor());
        dialog.querySelector('.dict-cancel').addEventListener('click', showView);
        listSwitch.addEventListener('click', () => setGraphActive(false));
        graphSwitch.addEventListener('click', () => setGraphActive(true));
        search.addEventListener('input', () => {
            if (graphActive) {
                const query = search.value.trim().toLocaleLowerCase();
                const first = (AppState.currentNote?.dictionary || []).findIndex(entry => graphMatches(entry, query));
                if (query && first >= 0) selectedGraphIndex = first;
                renderGraph();
            } else renderList();
        });
        connectionsInput.addEventListener('input', () => { renderSuggestions(); renderExplanationFields(); });
        connectionsInput.addEventListener('click', renderSuggestions);
        connectionsInput.addEventListener('keydown', event => {
            if (connectionOptions.hidden) return;
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault();
                setActiveSuggestion((activeSuggestion + (event.key === 'ArrowDown' ? 1 : suggestions.length - 1)) % suggestions.length);
            } else if (event.key === 'Enter') {
                event.preventDefault();
                chooseSuggestion(activeSuggestion < 0 ? 0 : activeSuggestion);
            }
        });
        connectionsInput.addEventListener('blur', () => { if (!connectionOptions.contains(document.activeElement)) hideSuggestions(); });
        overlay.addEventListener('click', event => { if (event.target === overlay) close(); });
        document.addEventListener('noteOpened', close);
        document.addEventListener('keydown', onKeydown);
        dialog.querySelector('.dict-save').addEventListener('click', () => {
            const word = wordInput.value.trim();
            if (!word) { error.textContent = t('dict_word_required'); error.hidden = false; wordInput.focus(); return; }
            const words = [...(AppState.currentNote.dictionary || [])];
            if (words.some((item, index) => index !== editingIndex && item.word.trim().toLocaleLowerCase() === word.toLocaleLowerCase())) {
                error.textContent = t('dict_duplicate'); error.hidden = false; wordInput.focus(); return;
            }
            const previous = editingIndex === null ? null : words[editingIndex];
            const explanations = Object.fromEntries([...explanationFields.querySelectorAll('textarea[data-connection]')]
                .map(field => [field.dataset.connection, field.value.trim()]));
            const entry = {word, definition: definitionInput.value.trim(),
                connections: connectionsInput.value.trim().replace(/[,;]\s*$/, ''),
                connection_explanations: explanations};
            if (editingIndex === null) words.push(entry);
            else words[editingIndex] = entry;
            selectedGraphIndex = editingIndex === null ? words.length - 1 : editingIndex;
            // Keep each resolved relationship and its explanation identical at both ends.
            const oldTargets = new Set(splitConnections(previous?.connections).map(name => findEntry(words, name)).filter(Boolean));
            const newTargets = new Set(splitConnections(entry.connections).map(name => findEntry(words, name)).filter(target => target && target !== entry));
            words.forEach((target, index) => {
                if (target === entry) return;
                const wasLinked = oldTargets.has(target);
                const isLinked = newTargets.has(target);
                if (!wasLinked && !isLinked) return;
                const targetConnections = splitConnections(target.connections).filter(name =>
                    !previous || findEntry([previous], name) !== previous);
                const targetExplanations = {...(target.connection_explanations || {})};
                if (previous) Object.keys(targetExplanations).forEach(key => {
                    if (findEntry([previous], key)) delete targetExplanations[key];
                });
                if (isLinked) {
                    targetConnections.push(word);
                    targetExplanations[word] = explanationFor(entry, target.word);
                }
                words[index] = {...target, connections: targetConnections.join(', '), connection_explanations: targetExplanations};
            });
            AppState.updateNote({dictionary: words});
            this.updateBadges();
            showView();
        });
        deleteButton.addEventListener('click', () => {
            if (editingIndex === null || !window.confirm(t('dict_delete_confirm'))) return;
            const removed = AppState.currentNote.dictionary[editingIndex];
            const words = AppState.currentNote.dictionary.filter((_, index) => index !== editingIndex).map(item => {
                const connections = splitConnections(item.connections).filter(name => !findEntry([removed], name));
                const explanations = {...(item.connection_explanations || {})};
                Object.keys(explanations).forEach(key => {
                    if (findEntry([removed], key)) delete explanations[key];
                });
                return {...item, connections: connections.join(', '), connection_explanations: explanations};
            });
            AppState.updateNote({dictionary: words});
            this.updateBadges();
            showView();
        });

        this.activeClose = close;
        renderList();
        search.focus();
    }
}

export default DictModalService;
