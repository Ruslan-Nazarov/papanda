import AppState from './AppState.js';
import { t } from '../i18n.js';

class DictModalService {
    static activeClose = null;

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

    static show() {
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
                    <div class="dict-list"></div>
                </div>
                <div class="dict-editor" hidden>
                    <h3 class="dict-editor-title"></h3>
                    <label>${t('dict_word_label')}<input class="dict-word" type="text" maxlength="150" placeholder="${t('dict_word_ph')}"></label>
                    <label>${t('dict_definition_label')}<textarea class="dict-definition" rows="5" maxlength="10000" placeholder="${t('dict_expl_ph')}"></textarea></label>
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
            <div class="modal-dialog-footer"><button class="dict-done action-btn primary" type="button">${t('dict_done')}</button></div>
        `;
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        const view = dialog.querySelector('.dict-view');
        const editor = dialog.querySelector('.dict-editor');
        const list = dialog.querySelector('.dict-list');
        const search = dialog.querySelector('.dict-search');
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
                explanationFields.appendChild(label);
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
            search.focus();
        };
        const showEditor = (index = null) => {
            const item = index === null ? null : AppState.currentNote.dictionary?.[index];
            if (index !== null && !item) return;
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
                definition.textContent = entry.definition || '';
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
                    detail.textContent = `${name}: ${explanation}`;
                    content.appendChild(detail);
                });
                const edit = document.createElement('button');
                edit.type = 'button';
                edit.className = 'dict-edit';
                edit.textContent = t('tt_edit');
                edit.addEventListener('click', () => showEditor(index));
                card.append(content, edit);
                card.dataset.dictIndex = String(index);
                list.appendChild(card);
            });
            if (!shown) {
                const empty = document.createElement('p');
                empty.className = 'dict-empty';
                empty.textContent = t(words.length ? 'dict_no_results' : 'dict_empty');
                list.appendChild(empty);
            }
        };
        const onKeydown = event => {
            if (event.key !== 'Escape') return;
            if (!connectionOptions.hidden) { event.preventDefault(); hideSuggestions(); return; }
            event.preventDefault();
            if (!editor.hidden) showView();
            else close();
        };

        dialog.querySelector('.dict-close').addEventListener('click', close);
        dialog.querySelector('.dict-done').addEventListener('click', close);
        dialog.querySelector('.dict-add').addEventListener('click', () => showEditor());
        dialog.querySelector('.dict-cancel').addEventListener('click', showView);
        search.addEventListener('input', renderList);
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
