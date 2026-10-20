import HiddenPhraseTooltip from './HiddenPhraseTooltip.js';
import { t } from '../i18n.js';

// Each modal owns its graph selection and tooltip bindings.
class DictionaryGraph {
    static create({dialog, search, tags, getWords, graphMatches, splitConnections, normalize, findEntry, renderText, renderMath, showEditor, close}) {
        const graph = dialog.querySelector('.dict-graph');
        const graphScroll = dialog.querySelector('.dict-graph-scroll');
        const graphCanvas = dialog.querySelector('.dict-graph-canvas');
        const graphDetail = dialog.querySelector('.dict-graph-detail');
        const graphIndex = dialog.querySelector('.dict-graph-index');
        const graphOverflow = dialog.querySelector('.dict-graph-overflow');
        let selectedGraphIndex = 0;
        const hideGraphHint = () => {
            if (HiddenPhraseTooltip.active?.root === graphCanvas) HiddenPhraseTooltip.hide();
        };
        const renderGraphHint = (tooltip, hint) => {
            tooltip.classList.add('dict-graph-tooltip');
            const separator = hint.indexOf('\n\n');
            const title = document.createElement('strong');
            title.textContent = hint.slice(0, separator);
            const content = document.createElement('p');
            renderText(content, hint.slice(separator + 2));
            tooltip.append(title, content);
            renderMath(tooltip);
            tooltip.addEventListener('click', event => {
                if (event.target.closest('a.dict-block-reference')) close();
            });
        };
        const disposeGraphHints = HiddenPhraseTooltip.bind(graphCanvas, {
            selector: '[data-hint]', render: renderGraphHint,
        });
        const renderGraph = () => {
            hideGraphHint();
            const words = getWords();
            const query = search.value.trim().toLocaleLowerCase();
            if (selectedGraphIndex >= words.length) selectedGraphIndex = Math.max(0, words.length - 1);
            const matching = words.map((entry, index) => ({entry, index})).filter(({entry}) => graphMatches(entry, query));
            if (!matching.some(({index}) => index === selectedGraphIndex)) selectedGraphIndex = matching[0]?.index ?? -1;
            const selected = words[selectedGraphIndex];
            graphCanvas.replaceChildren();
            graphDetail.replaceChildren();
            graphIndex.replaceChildren();
            graphOverflow.hidden = true;
            dialog.querySelector('.dict-graph-count').textContent = `${t('dict_graph_count')}: ${matching.length} / ${words.length}`;
            if (!selected) {
                const empty = document.createElement('p');
                empty.className = 'dict-graph-empty';
                empty.textContent = t(words.length ? 'dict_no_results' : 'dict_empty');
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
                        if (!graphMatches(words[neighbor.index], query)) { search.value = ''; tags.resetFilter(); }
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
            renderText(definition, selected.definition || '');
            graphDetail.append(detailHeader, definition);
            tags.badges(selected, graphDetail);
            if (neighbors.length) {
                const relationList = document.createElement('div');
                relationList.className = 'dict-graph-relations';
                neighbors.forEach(neighbor => {
                    const row = document.createElement('div');
                    const name = neighbor.index === null ? document.createElement('span') : document.createElement('button');
                    if (neighbor.index !== null) {
                        name.type = 'button';
                        name.addEventListener('click', () => {
                            if (!graphMatches(words[neighbor.index], query)) { search.value = ''; tags.resetFilter(); }
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
                        renderText(caption, explanation);
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
            renderMath(graph);
            graphScroll.scrollLeft = Math.max(0, (graphScroll.scrollWidth - graphScroll.clientWidth) / 2);
        };
        return {
            render: renderGraph, hideHint: hideGraphHint, dispose: disposeGraphHints,
            get selectedIndex() { return selectedGraphIndex; },
            set selectedIndex(index) { selectedGraphIndex = index; },
        };
    }
}

export default DictionaryGraph;
