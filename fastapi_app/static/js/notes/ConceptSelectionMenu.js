import NotesAPI from './api.js';
import AppState from './AppState.js';
import HtmlSafety from './HtmlSafety.js';
import NoteText from './NoteText.js';
import NoteContextSearch from './NoteContextSearch.js';
import HiddenPhraseTooltip from './HiddenPhraseTooltip.js';
import DictModalService from './DictModalService.js';
import BlockMetaModalService from './BlockMetaModalService.js';
import { renderStreamMarkdown } from './ConceptExplainManager.js';
import StreamMarkdownRenderer from './StreamMarkdownRenderer.js';
import ConceptChatInsertion from './ConceptChatInsertion.js';
import SavedConceptChat from './SavedConceptChat.js';
import BlockDOMRenderer from './BlockDOMRenderer.js';
import BlockMathRenderer from './BlockMathRenderer.js';
import { t } from '../i18n.js';

/**
 * Плавающая кнопка «✨ Что это?» при выделении текста внутри блока конспекта.
 * Стримит объяснение выделенного фрагмента через /explain-concept/stream.
 */
class ConceptSelectionMenu {
    static init() {
        this._btn = null;
        const openSaved = event => {
            const marker = event.target.closest?.(SavedConceptChat.selector);
            if (!marker || (event.type === 'keydown' && !['Enter', ' '].includes(event.key))) return;
            event.preventDefault();
            event.stopPropagation();
            this.openSaved(marker);
        };
        document.addEventListener('click', openSaved, true);
        document.addEventListener('keydown', openSaved, true);
        document.addEventListener('mouseup', (e) => this._onMouseUp(e));
        document.addEventListener('selectionchange', () => {
            const sel = window.getSelection();
            if (!sel || sel.isCollapsed) this._hide();
        });
        document.addEventListener('scroll', () => this._hide(), true);
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') this._hide(); });
    }

    static _onMouseUp(e) {
        if (e.target.closest?.('.concept-explain-btn')) return;
        // Даём браузеру дорисовать выделение.
        setTimeout(() => {
            const sel = window.getSelection();
            const text = sel ? sel.toString().trim() : '';
            if (text.length < 2 || text.length > 400) { this._hide(); return; }

            const node = sel.anchorNode;
            const anchorEl = node && (node.nodeType === 3 ? node.parentElement : node);
            const content = anchorEl?.closest?.('.block-content');
            if (!content) { this._hide(); return; }

            const range = sel.getRangeAt(0).cloneRange();
            if (!content.contains(range.startContainer) || !content.contains(range.endContainer)) { this._hide(); return; }
            const rect = range.getBoundingClientRect();
            this._show(rect, text, content.closest('.dialectics-block'), range);
        }, 0);
    }

    static _show(rect, text, blockEl, range) {
        this._hide();
        const btn = document.createElement('button');
        btn.className = 'concept-explain-btn';
        btn.textContent = t('whatis_btn');
        btn.style.cssText = [
            'position:fixed', `top:${Math.max(8, rect.top - 40)}px`,
            `left:${rect.left + rect.width / 2}px`, 'transform:translateX(-50%)',
            'z-index:3000', 'background:#3b82f6', 'color:#fff', 'border:none',
            'border-radius:8px', 'padding:6px 12px', 'font-size:0.85rem',
            'font-weight:600', 'cursor:pointer', 'box-shadow:0 4px 14px rgba(0,0,0,.22)',
            'white-space:nowrap',
        ].join(';');
        // не сбрасываем выделение при клике по кнопке
        btn.addEventListener('mousedown', (e) => e.preventDefault());
        btn.addEventListener('click', () => {
            this._hide();
            this._explain(text, blockEl, range);
        });
        document.body.appendChild(btn);
        this._btn = btn;
    }

    static _hide() {
        if (this._btn) { this._btn.remove(); this._btn = null; }
    }

    static _modal(fragment, calculation = false, {saved = false} = {}) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay concept-explain-modal' + (calculation ? ' calculation-explain-modal' : '');
        if (saved) overlay.classList.add('saved-concept-chat-modal');
        overlay.style.zIndex = '3100';
        overlay.innerHTML = `
            <div class="modal-dialog" style="max-width:${calculation || saved ? 820 : 560}px;width:92%;" role="dialog" aria-modal="true" aria-label="${t(calculation ? 'calculation_title' : 'whatis_title')}">
                <div class="modal-dialog-header">
                    <h2>${t(calculation ? 'calculation_title' : 'whatis_title')}</h2>
                    <button class="icon-btn btn-close-modal" type="button" aria-label="${t('close')}">✕</button>
                </div>
                <div class="modal-dialog-body">
                    <div class="concept-explain-fragment" style="margin-bottom:10px;padding:8px 12px;background:#eff6ff;border-radius:8px;color:#1e40af;font-size:0.9rem;"></div>
                    <div class="concept-explain-messages" style="font-size:0.95rem;line-height:1.6;color:#334155;">
                        <div class="concept-explain-answer">▍</div>
                    </div>
                </div>
                <div class="concept-explain-notice" role="status" aria-live="polite" hidden></div>
                <div class="modal-dialog-footer concept-explain-footer">
                    <input class="concept-explain-input" type="text" maxlength="2000" placeholder="${t('aicheck_ask_ph')}" style="flex:1;min-width:0;padding:10px 14px;border:1px solid #cbd5e1;border-radius:8px;font-size:0.95rem;">
                    <button class="concept-explain-send" type="button" style="background:#ea580c;color:#fff;border:0;padding:10px 20px;border-radius:8px;font-weight:600;cursor:pointer;">${t('send_word')}</button>
                    <button class="concept-explain-save" type="button" disabled>${t('whatis_save_chat')}</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);
        if (saved) overlay.querySelector('.concept-explain-footer').remove();
        const preview = overlay.querySelector('.concept-explain-fragment');
        if (calculation) {
            const formula = document.createElement('span');
            formula.className = 'math-inline';
            formula.dataset.mathDisplay = 'true';
            formula.setAttribute('formula', fragment);
            preview.append(formula);
            BlockMathRenderer.renderMath(preview);
        }
        else HiddenPhraseTooltip.renderHint(preview, `«${fragment}»`);
        const disposePreviews = HiddenPhraseTooltip.bind(overlay, {
            selector: '.concept-explain-source', render: renderStreamMarkdown,
        });
        const controller = new AbortController();
        const returnFocus = document.activeElement;
        const onKey = event => {
            if (event.key === 'Escape' && !event.defaultPrevented
                && !document.querySelector('.formula-zoom-dialog[open], .math-symbol-tooltip')) close();
            if (event.key === 'Tab') {
                const controls = [...overlay.querySelectorAll('button, a[href], input, [tabindex="0"]')]
                    .filter(element => !element.disabled && element.getClientRects().length);
                const first = controls[0], last = controls.at(-1);
                if (event.shiftKey && document.activeElement === first) {event.preventDefault(); last?.focus();}
                else if (!event.shiftKey && document.activeElement === last) {event.preventDefault(); first?.focus();}
            }
        };
        const close = () => {
            controller.abort();
            disposePreviews();
            overlay.remove();
            document.removeEventListener('noteOpened', close);
            document.removeEventListener('keydown', onKey);
            if (returnFocus?.isConnected) returnFocus.focus({preventScroll: true});
        };
        document.addEventListener('keydown', onKey);
        overlay.querySelector('.btn-close-modal').focus({preventScroll: true});
        document.addEventListener('noteOpened', close);
        overlay.querySelector('.btn-close-modal').addEventListener('click', close);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
        return {
            close, signal: controller.signal,
            target: overlay.querySelector('.concept-explain-answer'),
            messages: overlay.querySelector('.concept-explain-messages'),
            input: overlay.querySelector('.concept-explain-input'),
            send: overlay.querySelector('.concept-explain-send'),
            save: overlay.querySelector('.concept-explain-save'),
            notice: overlay.querySelector('.concept-explain-notice'),
        };
    }

    static _showSources(answer, sources, close) {
        if (!sources.length) return;
        const panel = document.createElement('div');
        panel.className = 'concept-explain-sources';
        panel.style.cssText = 'margin-top:12px;font-size:0.85rem;';
        const label = document.createElement('div');
        label.textContent = t('whatis_sources');
        panel.appendChild(label);
        sources.forEach((source, index) => {
            const remoteBlock = source.note_id && String(source.note_id) !== String(AppState.currentNote?.id)
                && source.block_id && !source.kind;
            const rawURL = remoteBlock
                ? `internal://note/${encodeURIComponent(source.note_id)}/block/${encodeURIComponent(source.block_id)}` : source.url;
            const url = rawURL ? HtmlSafety.link(rawURL) : '';
            const isLink = !!url && (source.kind === 'link' || remoteBlock);
            const button = document.createElement(isLink ? 'a' : 'button');
            if (isLink) {
                button.setAttribute('href', url);
                if (/^https?:/.test(url)) {button.target = '_blank'; button.rel = 'noopener noreferrer';}
            } else button.type = 'button';
            button.className = 'concept-explain-source';
            const kind = {dictionary: 'dict_title', link: 'whatis_link', draft: 'whatis_draft', version: 'whatis_version'}[source.kind];
            const prefix = kind ? `${t(kind)}: ` : '';
            HiddenPhraseTooltip.renderHint(button, `[${index + 1}] ${prefix}${source.title || t('block_word')}`);
            const preview = String(source.text || source.title || '') + (source.reason ? `\n\n${t('ed_archive_reason')}: ${source.reason}` : '');
            button.dataset.hint = preview;
            button.style.cssText = 'display:block;margin-top:6px;text-align:left;color:#1d4ed8;background:#eff6ff;border:0;border-radius:6px;padding:6px 10px;cursor:pointer;';
            const showDetails = () => {
                HiddenPhraseTooltip.hide();
                let details = button.nextElementSibling;
                if (details?.classList.contains('concept-source-details')) {
                    details.remove(); button.setAttribute('aria-expanded', 'false'); return;
                }
                details = document.createElement('div');
                details.className = 'concept-source-details';
                renderStreamMarkdown(details, preview);
                button.after(details);
                if (Array.isArray(source.targets)) {
                    const anchor = document.createElement('div');
                    details.append(anchor);
                    this._showSources(anchor, source.targets, close);
                }
                button.setAttribute('aria-expanded', 'true');
            };
            button.addEventListener('click', () => {
                if (isLink) {close(); return;}
                if (source.kind === 'dictionary') {close(); DictModalService.show(source.reference || source.title); return;}
                if (source.kind === 'link') {close(); BlockMetaModalService.showSourcesModal(source.block_id); return;}
                if (['draft', 'version', 'legacy'].includes(source.kind)) {showDetails(); return;}
                const target = Array.from(document.querySelectorAll('.dialectics-block'))
                    .find(el => el.dataset.id === source.block_id);
                if (!target) {showDetails(); return;}
                if (target.classList.contains('collapsed')) target.querySelector('.btn-collapse-toggle')?.click();
                close();
                target.scrollIntoView?.({behavior: 'smooth', block: 'center'});
            });
            panel.appendChild(button);
        });
        answer.after(panel);
        // Model citations use this request's source numbering. Turn only existing
        // numbers into controls; math, code and authored links stay untouched.
        const walker = document.createTreeWalker(answer, 4);
        const nodes = [];
        while (walker.nextNode()) if (!walker.currentNode.parentElement.closest('a, button, code, pre, .katex')) nodes.push(walker.currentNode);
        for (const node of nodes) {
            const fragment = document.createDocumentFragment();
            let offset = 0;
            for (const match of node.textContent.matchAll(/\[(?:source\s+)?(\d+)\]/gi)) {
                const sourceButton = panel.querySelectorAll('.concept-explain-source')[Number(match[1]) - 1];
                if (!sourceButton) continue;
                fragment.append(document.createTextNode(node.textContent.slice(offset, match.index)));
                const citation = sourceButton.cloneNode(true);
                citation.textContent = match[0];
                citation.classList.add('concept-explain-citation');
                citation.removeAttribute('style');
                citation.addEventListener('click', event => {
                    if (citation.tagName === 'A') close();
                    else {event.preventDefault(); sourceButton.click();}
                });
                fragment.append(citation);
                offset = match.index + match[0].length;
            }
            if (offset) {fragment.append(document.createTextNode(node.textContent.slice(offset))); node.replaceWith(fragment);}
        }
    }

    static openSaved(marker) {
        const data = SavedConceptChat.read(marker);
        if (!data || document.querySelector('.saved-concept-chat-modal')) return;
        marker.focus({preventScroll: true});
        const {target, messages, close} = this._modal(data.fragment, !!data.calculation, {saved: true});
        target.remove();
        if (data.legacyHTML !== undefined) {
            const legacy = document.createElement('div');
            legacy.innerHTML = HtmlSafety.rich(data.legacyHTML);
            let answer = document.createElement('div');
            messages.append(answer);
            for (const child of [...legacy.childNodes]) {
                const items = child.nodeType === 1 ? [...child.querySelectorAll('span, a')]
                    .filter(item => /^\[\d+\]\s/.test(item.textContent)) : [];
                if (child.nodeName === 'P' && items.length) {
                    BlockMathRenderer.renderMath(answer);
                    this._showSources(answer, items.map(item => this._legacySource(item)), close);
                    answer = document.createElement('div');
                    messages.append(answer);
                } else answer.append(child);
            }
            BlockMathRenderer.renderMath(answer);
            return;
        }
        for (const turn of data.turns) {
            if (turn.question) {
                const question = document.createElement('div');
                question.className = 'saved-concept-chat-question';
                HiddenPhraseTooltip.renderHint(question, turn.question);
                messages.append(question);
            }
            const answer = document.createElement('div');
            answer.className = 'concept-explain-answer';
            messages.append(answer);
            renderStreamMarkdown(answer, turn.answer);
            this._showSources(answer, turn.sources, close);
        }
    }

    static _legacySource(item) {
        const title = item.textContent.replace(/^\[\d+\]\s*/, '');
        const url = HtmlSafety.link(item.getAttribute('href'));
        if (url) return {kind: 'link', title, url, text: title};
        const matches = (AppState.currentNote?.blocks || []).filter(block => NoteText.fromHtml(block.title || '') === title);
        const sources = matches.map(block => ({block_id: block.id, title,
            text: NoteText.excerpt(NoteText.fromHtml(block.html || ''), 0, 1200)}));
        if (sources.length === 1) return sources[0];
        return {kind: 'legacy', title, text: title, targets: sources};
    }

    static async _context(query, signal) {
        const note = AppState.currentNote;
        const versions = (note.blocks || []).map(block => ({block_id: block.id,
            snapshots: AppState.previousBlockVersions(block.id)}));
        const options = {dictionary: note.dictionary || [], versions};
        const local = new NoteContextSearch(note.blocks, options);
        const queryTerms = new Set(local.terms(`${query.text} ${query.question}`));
        const links = local.links.filter(link => link.url.startsWith('internal://note/'))
            .map(link => ({link, score: (link.block_id === query.blockId ? 10 : 0)
                + local.terms(link.title).filter(term => queryTerms.has(term)).length}))
            .sort((a, b) => b.score - a.score).filter(item => item.score > 0).slice(0, 6);
        const notes = new Map();
        for (const {link} of links) {
            if (signal.aborted) return [];
            const id = link.url.match(/^internal:\/\/note\/([a-zA-Z0-9_-]+)/)?.[1];
            if (!id) continue;
            if (!notes.has(id)) notes.set(id, String(note.id) === id ? Promise.resolve(note)
                : NotesAPI.getNote(id, signal));
        }
        const ids = [...notes.keys()];
        const loaded = await Promise.allSettled(notes.values());
        if (signal.aborted) return [];
        const linkedNotes = links.flatMap(({link}) => {
            const id = link.url.match(/^internal:\/\/note\/([a-zA-Z0-9_-]+)/)?.[1];
            const result = loaded[ids.indexOf(id)];
            // Deleted or inaccessible links retain their saved label and URL.
            return result?.status === 'fulfilled' ? [{link, note: result.value}] : [];
        });
        return linkedNotes.length
            ? new NoteContextSearch(note.blocks, {...options, linkedNotes}).search(query)
            : local.search(query);
    }

    static async _explain(text, blockEl, range = null, {calculation = null} = {}) {
        const epoch = AppState.documentEpoch;
        const blockId = blockEl?.dataset.id;
        const originalHTML = AppState.getBlock(blockId)?.html;
        const noteTitle = (AppState.currentNote?.title || '').slice(0, 255);
        const title = NoteText.excerpt(NoteText.fromHtml(blockEl?.querySelector('.block-title')?.innerHTML || ''), 0, 500);
        const content = blockEl?.querySelector('.block-content');
        const fullBody = NoteText.fromHtml(content?.innerHTML || '');
        let selectionOffset = fullBody.indexOf(text);
        if (calculation && range && content?.contains(range.startContainer)) {
            const prefix = document.createRange();
            prefix.selectNodeContents(content);
            prefix.setEnd(range.startContainer, range.startOffset);
            const wrapper = document.createElement('div');
            wrapper.append(prefix.cloneContents());
            selectionOffset = NoteText.fromHtml(wrapper.innerHTML).length;
        }
        const start = Math.max(0, selectionOffset - 700);
        const body = NoteText.excerpt(fullBody, start, calculation ? 5000 : 2000);
        const anchor = ConceptChatInsertion.capture(content, originalHTML, range, text);
        const { target, messages, input, send, save, notice, close, signal } = this._modal(text, !!calculation);
        const history = [];
        const turns = [];
        let busy = false;
        const request = async (question = '') => {
            if (busy || signal.aborted) return;
            busy = true;
            send.disabled = true;
            save.disabled = true;
            let answer = target;
            if (question) {
                const userMessage = document.createElement('div');
                userMessage.style.cssText = 'margin-top:16px;font-weight:600;color:#1e293b;';
                HiddenPhraseTooltip.renderHint(userMessage, question);
                messages.appendChild(userMessage);
                answer = document.createElement('div');
                answer.className = 'concept-explain-answer';
                answer.style.marginTop = '8px';
                answer.textContent = '▍';
                messages.appendChild(answer);
                answer.scrollIntoView?.({ block: 'nearest' });
            }
            const renderer = new StreamMarkdownRenderer(answer, {signal, input});
            try {
                const found = await this._context({text, question, title, context: body, blockId: blockEl?.dataset.id}, signal);
                const sources = calculation ? [...calculation.passages, ...found]
                    .filter((item, index, all) => all.findIndex(other => other.block_id === item.block_id
                        && other.text === item.text && other.kind === item.kind) === index).slice(0, 5) : found;
                if (signal.aborted) return;
                const context = {note_title: noteTitle, context_before: title, context_after: body,
                    history: history.slice(calculation ? -6 : -2), question, note_passages: sources};
                const payload = calculation ? {...context, formula: calculation.formula,
                    original_formulas: calculation.original_formulas, math_symbols: calculation.math_symbols,
                    number_definitions: calculation.number_definitions} : {...context, text};
                const full = await NotesAPI.stream(
                    calculation ? '/ai/dialectics/explain-calculation/stream' : '/ai/dialectics/explain-concept/stream',
                    payload,
                    (_d, acc) => renderer.update(acc), undefined, {signal}
                );
                if (signal.aborted) return;
                if (!await renderer.finish(full || t('whatis_empty'))) {
                    if (renderer.error) throw renderer.error;
                    return;
                }
                this._showSources(answer, sources, close);
                history.push(
                    { role: 'user', content: question || `${calculation ? 'Разбери расчёт подробно' : 'Объясни выделенный фрагмент'}: ${text}` },
                    { role: 'assistant', content: full || t('whatis_empty') }
                );
                turns.push({question, answer: full || t('whatis_empty'), sources});
            } catch (e) {
                if (signal.aborted) return;
                answer.innerHTML = `<span style="color:#ef4444;">${t('whatis_error')}: ${HtmlSafety.escape(e.message)}</span>`;
                if (question && !input.value) input.value = question;
            } finally {
                renderer.dispose();
                busy = false;
                send.disabled = false;
                save.disabled = !turns.length;
            }
        };
        send.addEventListener('click', () => {
            const question = input.value.trim();
            if (!question || busy) return;
            input.value = '';
            request(question);
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') send.click();
        });
        save.addEventListener('click', () => {
            if (busy || signal.aborted || !turns.length) return;
            const current = AppState.getBlock(blockId);
            if (!anchor || epoch !== AppState.documentEpoch || !current || current.html !== originalHTML) {
                notice.textContent = t('whatis_save_stale');
                notice.hidden = false;
                return;
            }
            const chat = SavedConceptChat.create({version: 1, fragment: text, calculation: !!calculation,
                turns: turns.map(turn => ({...turn, sources: turn.sources.map(source => ({...source,
                    note_id: String(AppState.currentNote.id || '')}))}))});
            const html = ConceptChatInsertion.insert(anchor, chat);
            if (html === null) return;
            AppState.updateBlock(blockId, {html});
            close();
            BlockDOMRenderer.renderAll({reuseUnchanged: true});
        });
        request();
    }
}

export default ConceptSelectionMenu;
