import { t } from '../i18n.js';
import HiddenPhraseTooltip from './HiddenPhraseTooltip.js';

// A suggestion stays a draft until the reader explicitly saves it.
class MathDefinitionSuggestion {
    static mount(popup, {initial = '', suggest, accept, remove, pin, position}) {
        const section = document.createElement('section');
        section.className = 'math-definition-suggestion';
        const toolbar = document.createElement('div');
        toolbar.className = 'math-definition-toolbar';
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'math-symbol-suggest';
        button.textContent = t(initial ? 'ms_edit' : 'ms_ai_find');
        const status = document.createElement('div');
        status.className = 'math-definition-status';
        status.setAttribute('role', 'status');
        status.setAttribute('aria-live', 'polite');
        const result = document.createElement('div');
        result.className = 'math-definition-result';
        result.hidden = true;
        toolbar.append(status, button);
        section.append(toolbar, result);
        popup.append(section);
        let controller;
        const isActive = () => popup.isConnected && !controller?.signal.aborted;
        const showDraft = (definition, sources = [], reason = '') => {
            result.replaceChildren();
            result.hidden = false;
            popup.classList.add('has-definition-draft');
            const preview = document.createElement('div');
            preview.className = 'math-definition-preview';
            HiddenPhraseTooltip.renderHint(preview, definition);
            const editor = document.createElement('div');
            editor.className = 'math-definition-editor';
            editor.hidden = true;
            const label = document.createElement('label');
            label.textContent = t('ms_ai_proposal');
            const input = document.createElement('textarea');
            input.className = 'math-definition-proposal';
            input.maxLength = 5000; input.rows = 5; input.value = definition;
            label.append(input);
            editor.append(label);
            const resize = () => {
                input.style.height = 'auto';
                input.style.height = `${input.scrollHeight + 2}px`;
                position();
            };
            const change = document.createElement('button');
            change.type = 'button'; change.className = 'math-definition-edit';
            change.textContent = t('ms_ai_edit_text');
            change.setAttribute('aria-expanded', 'false');
            const toggleEditor = () => {
                editor.hidden = !editor.hidden;
                preview.hidden = !editor.hidden;
                change.textContent = t(editor.hidden ? 'ms_ai_edit_text' : 'ms_ai_preview');
                change.setAttribute('aria-expanded', String(!editor.hidden));
                if (editor.hidden) HiddenPhraseTooltip.renderHint(preview, input.value);
                else { resize(); input.focus({preventScroll: true}); }
                position();
            };
            change.addEventListener('click', toggleEditor);
            const save = document.createElement('button');
            save.type = 'button'; save.className = 'math-definition-accept';
            save.textContent = t('ms_ai_save');
            const valid = () => { save.disabled = !input.value.trim(); };
            input.addEventListener('input', () => { valid(); resize(); });
            valid();
            save.addEventListener('click', () => { if (isActive() && input.value.trim()) accept(input.value.trim()); });
            result.append(preview, editor);
            if (sources.length || reason) {
                const details = document.createElement('details');
                details.className = 'math-definition-sources';
                const summary = document.createElement('summary');
                summary.textContent = t('ms_ai_sources');
                if (sources.length) {
                    const count = document.createElement('span');
                    count.className = 'math-definition-source-count';
                    count.textContent = String(sources.length);
                    summary.append(count);
                }
                details.append(summary);
                if (reason) {
                    const explanation = document.createElement('p');
                    explanation.className = 'math-definition-reason';
                    HiddenPhraseTooltip.renderHint(explanation, reason);
                    details.append(explanation);
                }
                for (const source of sources) {
                    const passage = document.createElement('div');
                    passage.className = 'math-definition-source';
                    const title = document.createElement('small');
                    title.textContent = source.title || `${t('ms_source_block')}: ${source.block_id}`;
                    const quote = document.createElement('blockquote');
                    HiddenPhraseTooltip.renderHint(quote, source.quote);
                    passage.append(title, quote);
                    details.append(passage);
                }
                details.addEventListener('toggle', position);
                result.append(details);
            }
            const actions = document.createElement('div');
            actions.className = 'math-definition-actions';
            actions.append(change, save);
            const scope = document.createElement('small');
            scope.className = 'math-definition-save-scope';
            scope.textContent = t('ms_ai_save_scope');
            result.append(actions, scope);
            if (initial && remove) {
                const erase = document.createElement('button');
                erase.type = 'button'; erase.className = 'formula-definition-delete';
                erase.textContent = t('ms_delete');
                erase.addEventListener('click', () => { if (isActive()) remove(); });
                result.append(erase);
            }
            if (initial) toggleEditor();
        };
        button.addEventListener('click', async () => {
            pin();
            if (initial) {
                button.hidden = true; showDraft(initial); position(); return;
            }
            controller?.abort();
            controller = new AbortController();
            button.disabled = true;
            section.dataset.state = 'searching';
            status.textContent = t('ms_ai_searching');
            section.setAttribute('aria-busy', 'true');
            position();
            try {
                const data = await suggest(controller.signal);
                if (!isActive()) return;
                section.dataset.state = data.status;
                status.textContent = t(data.status === 'found' ? 'ms_ai_found'
                    : data.status === 'uncertain' ? 'ms_ai_uncertain' : 'ms_ai_not_found');
                if (data.status !== 'not_found' && data.definition) showDraft(data.definition, data.sources || [], data.reason);
                else if (data.reason) {
                    const reason = document.createElement('div');
                    reason.className = 'math-definition-reason';
                    HiddenPhraseTooltip.renderHint(reason, data.reason);
                    status.append(reason);
                }
            } catch (error) {
                if (isActive() && error.name !== 'AbortError') {
                    section.dataset.state = 'error';
                    status.textContent = t('ms_ai_error');
                }
            } finally {
                if (isActive()) {
                    button.disabled = false;
                    button.textContent = t('ms_ai_retry');
                    section.removeAttribute('aria-busy');
                    position();
                }
            }
        });
        return () => controller?.abort();
    }
}

export default MathDefinitionSuggestion;
