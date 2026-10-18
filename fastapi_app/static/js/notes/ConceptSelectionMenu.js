import NotesAPI from './api.js';
import AppState from './AppState.js';
import HtmlSafety from './HtmlSafety.js';
import NoteText from './NoteText.js';
import NoteContextSearch from './NoteContextSearch.js';
import HiddenPhraseTooltip from './HiddenPhraseTooltip.js';
import DictModalService from './DictModalService.js';
import BlockMetaModalService from './BlockMetaModalService.js';
import { renderStreamMarkdown } from './ConceptExplainManager.js';
import { t } from '../i18n.js';

/**
 * Плавающая кнопка «✨ Что это?» при выделении текста внутри блока конспекта.
 * Стримит объяснение выделенного фрагмента через /explain-concept/stream.
 */
class ConceptSelectionMenu {
    static init() {
        this._btn = null;
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

            const rect = sel.getRangeAt(0).getBoundingClientRect();
            this._show(rect, text, content.closest('.dialectics-block'));
        }, 0);
    }

    static _show(rect, text, blockEl) {
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
            this._explain(text, blockEl);
        });
        document.body.appendChild(btn);
        this._btn = btn;
    }

    static _hide() {
        if (this._btn) { this._btn.remove(); this._btn = null; }
    }

    static _modal(fragment) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.style.zIndex = '3100';
        overlay.innerHTML = `
            <div class="modal-dialog" style="max-width:560px;width:92%;">
                <div class="modal-dialog-header">
                    <h2>${t('whatis_title')}</h2>
                    <button class="icon-btn btn-close-modal">✕</button>
                </div>
                <div class="modal-dialog-body">
                    <div class="concept-explain-fragment" style="margin-bottom:10px;padding:8px 12px;background:#eff6ff;border-radius:8px;color:#1e40af;font-size:0.9rem;"></div>
                    <div class="concept-explain-messages" style="font-size:0.95rem;line-height:1.6;color:#334155;">
                        <div class="concept-explain-answer">▍</div>
                    </div>
                </div>
                <div class="modal-dialog-footer" style="gap:10px;align-items:center;">
                    <input class="concept-explain-input" type="text" maxlength="2000" placeholder="${t('aicheck_ask_ph')}" style="flex:1;min-width:0;padding:10px 14px;border:1px solid #cbd5e1;border-radius:8px;font-size:0.95rem;">
                    <button class="concept-explain-send" type="button" style="background:#ea580c;color:#fff;border:0;padding:10px 20px;border-radius:8px;font-weight:600;cursor:pointer;">${t('send_word')}</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);
        HiddenPhraseTooltip.renderHint(overlay.querySelector('.concept-explain-fragment'), `«${fragment}»`);
        const disposePreviews = HiddenPhraseTooltip.bind(overlay, {
            selector: '.concept-explain-source', render: renderStreamMarkdown,
        });
        const controller = new AbortController();
        const close = () => {
            controller.abort();
            disposePreviews();
            overlay.remove();
            document.removeEventListener('noteOpened', close);
        };
        document.addEventListener('noteOpened', close);
        overlay.querySelector('.btn-close-modal').addEventListener('click', close);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
        return {
            close, signal: controller.signal,
            target: overlay.querySelector('.concept-explain-answer'),
            messages: overlay.querySelector('.concept-explain-messages'),
            input: overlay.querySelector('.concept-explain-input'),
            send: overlay.querySelector('.concept-explain-send'),
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
            const isLink = source.kind === 'link' && /^(https?:\/\/|internal:\/\/note\/)/.test(source.url || '');
            const button = document.createElement(isLink ? 'a' : 'button');
            if (isLink) {
                button.setAttribute('href', source.url);
                if (/^https?:/.test(source.url)) {button.target = '_blank'; button.rel = 'noopener noreferrer';}
            } else button.type = 'button';
            button.className = 'concept-explain-source';
            const kind = {dictionary: 'dict_title', link: 'whatis_link', draft: 'whatis_draft', version: 'whatis_version'}[source.kind];
            const prefix = kind ? `${t(kind)}: ` : '';
            HiddenPhraseTooltip.renderHint(button, `[${index + 1}] ${prefix}${source.title || t('block_word')}`);
            const preview = source.text + (source.reason ? `\n\n${t('ed_archive_reason')}: ${source.reason}` : '');
            button.dataset.hint = preview;
            button.style.cssText = 'display:block;margin-top:6px;text-align:left;color:#1d4ed8;background:#eff6ff;border:0;border-radius:6px;padding:6px 10px;cursor:pointer;';
            button.addEventListener('click', () => {
                if (isLink) {close(); return;}
                if (source.kind === 'dictionary') {close(); DictModalService.show(source.reference || source.title); return;}
                if (source.kind === 'link') {close(); BlockMetaModalService.showSourcesModal(source.block_id); return;}
                if (['draft', 'version'].includes(source.kind)) {
                    HiddenPhraseTooltip.hide();
                    let details = button.nextElementSibling;
                    if (!details?.classList.contains('concept-source-details')) {
                        details = document.createElement('div');
                        details.className = 'concept-source-details';
                        renderStreamMarkdown(details, preview);
                        button.after(details);
                        button.setAttribute('aria-expanded', 'true');
                    } else {details.remove(); button.setAttribute('aria-expanded', 'false');}
                    return;
                }
                const target = Array.from(document.querySelectorAll('.dialectics-block'))
                    .find(el => el.dataset.id === source.block_id);
                if (!target) return;
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
            for (const match of node.textContent.matchAll(/\[(\d+)\]/g)) {
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
        return new NoteContextSearch(note.blocks, {...options, linkedNotes}).search(query);
    }

    static async _explain(text, blockEl) {
        const noteTitle = (AppState.currentNote?.title || '').slice(0, 255);
        const title = NoteText.excerpt(NoteText.fromHtml(blockEl?.querySelector('.block-title')?.innerHTML || ''), 0, 500);
        const content = blockEl?.querySelector('.block-content');
        const fullBody = NoteText.fromHtml(content?.innerHTML || '');
        const selectionOffset = fullBody.indexOf(text);
        const start = Math.max(0, selectionOffset - 700);
        const body = NoteText.excerpt(fullBody, start, 2000);
        const { target, messages, input, send, close, signal } = this._modal(text);
        const history = [];
        let busy = false;
        const request = async (question = '') => {
            if (busy || signal.aborted) return;
            busy = true;
            send.disabled = true;
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
            try {
                const sources = await this._context({text, question, title, context: body, blockId: blockEl?.dataset.id}, signal);
                if (signal.aborted) return;
                let last = 0;
                const full = await NotesAPI.stream(
                    '/ai/dialectics/explain-concept/stream',
                    { text, note_title: noteTitle, context_before: title, context_after: body,
                        history: history.slice(-2), question, note_passages: sources },
                    (_d, acc) => {
                        const now = Date.now();
                        if (now - last > 60) { last = now; renderStreamMarkdown(answer, acc + ' ▍'); }
                    }, undefined, {signal}
                );
                if (signal.aborted) return;
                renderStreamMarkdown(answer, full || t('whatis_empty'));
                this._showSources(answer, sources, close);
                history.push(
                    { role: 'user', content: question || `Объясни выделенный фрагмент: ${text}` },
                    { role: 'assistant', content: full || t('whatis_empty') }
                );
            } catch (e) {
                if (signal.aborted) return;
                answer.innerHTML = `<span style="color:#ef4444;">${t('whatis_error')}: ${HtmlSafety.escape(e.message)}</span>`;
                if (question) input.value = question;
            } finally {
                busy = false;
                send.disabled = false;
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
        request();
    }
}

export default ConceptSelectionMenu;
