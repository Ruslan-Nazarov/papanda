import NotesAPI from './api.js';
import AppState from './AppState.js';
import HtmlSafety from './HtmlSafety.js';
import StreamMarkdownRenderer from './StreamMarkdownRenderer.js';
import SaveCoordinator from './SaveCoordinator.js';
import DialogService from './DialogService.js';
import { t } from '../i18n.js';

class ArticleExpositionModal {
    static show(source, block, {sourceIndex = block.sources?.indexOf(source), onSaved} = {}) {
        const note = AppState.currentNote, epoch = AppState.documentEpoch;
        const sourceKey = value => JSON.stringify(['url', 'title', 'quote', 'selection'].map(key => value?.[key] || ''));
        const originalKey = sourceKey(source);
        const previous = document.activeElement;
        const parent = previous?.closest('.modal-overlay');
        const wasInert = parent?.inert;
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay article-exposition-overlay';
        overlay.innerHTML = `
            <div class="modal-dialog article-exposition-modal" role="dialog" aria-modal="true" aria-label="${t('article_exposition_title')}">
                <div class="modal-dialog-header">
                    <h2>${t('article_exposition_title')}</h2>
                    <button class="icon-btn btn-close-modal" type="button" aria-label="${t('close')}">✕</button>
                </div>
                <div class="modal-dialog-body">
                    <div class="article-exposition-source">
                        <strong>${HtmlSafety.escape(source.title || source.url)}</strong>
                        ${HtmlSafety.link(source.url) ? `<a href="${HtmlSafety.escape(HtmlSafety.link(source.url))}" target="_blank" rel="noopener noreferrer">${HtmlSafety.escape(source.url)}</a>` : ''}
                    </div>
                    <p class="article-exposition-status" role="status" aria-live="polite"></p>
                    <p class="article-exposition-saved" role="status" hidden></p>
                    <div class="article-exposition-answer"></div>
                    <p class="article-exposition-error" role="alert" hidden></p>
                </div>
                <div class="modal-dialog-footer">
                    <button class="block-sources-secondary article-exposition-retry" type="button" hidden>${t('article_exposition_retry')}</button>
                    <button class="block-sources-secondary article-exposition-copy" type="button" disabled>${t('article_exposition_copy')}</button>
                    <button class="block-sources-primary article-exposition-save" type="button" disabled>${t('save')}</button>
                    <button class="block-sources-primary article-exposition-close" type="button">${t('close')}</button>
                </div>
            </div>`;
        const answer = overlay.querySelector('.article-exposition-answer');
        const status = overlay.querySelector('.article-exposition-status');
        const error = overlay.querySelector('.article-exposition-error');
        const copy = overlay.querySelector('.article-exposition-copy');
        const retry = overlay.querySelector('.article-exposition-retry');
        const save = overlay.querySelector('.article-exposition-save');
        const saved = overlay.querySelector('.article-exposition-saved');
        const payload = {
            url: source.url || '', title: source.title || '', quote: source.quote || '',
            selection: source.selection || '',
            note_title: AppState.currentNote?.title || '', block_title: block.title || '',
        };
        let controller = new AbortController(), renderer, fullText = '', scope = 'excerpt', selection = '', saving = false;
        const showScope = () => {
            status.textContent = t(scope === 'section' ? 'article_exposition_section'
                : scope === 'article' ? 'article_exposition_full' : 'article_exposition_excerpt')
                + (scope === 'section' && selection ? ` ${selection}` : '');
            status.hidden = false;
        };
        const close = () => {
            controller?.abort();
            renderer?.dispose();
            overlay.remove();
            document.removeEventListener('noteOpened', close);
            if (parent) parent.inert = wasInert;
            if (previous?.isConnected) previous.focus({preventScroll: true});
            else parent?.querySelector(`.btn-explain-src[data-idx="${sourceIndex}"]`)?.focus({preventScroll: true});
        };
        const run = async () => {
            controller.abort();
            renderer?.dispose();
            controller = new AbortController();
            const {signal} = controller;
            fullText = '';
            answer.replaceChildren();
            answer.setAttribute('aria-busy', 'true');
            status.textContent = t('article_exposition_loading');
            status.hidden = false;
            error.hidden = true;
            retry.hidden = true;
            retry.textContent = t('article_exposition_retry');
            saved.hidden = true;
            save.disabled = true;
            copy.disabled = true;
            copy.textContent = t('article_exposition_copy');
            renderer = new StreamMarkdownRenderer(answer, {signal});
            try {
                const text = await NotesAPI.stream('/ai/dialectics/explain-article/stream', payload,
                    (_delta, accumulated) => {
                        if (!signal.aborted) renderer.update(accumulated);
                    }, event => {
                        if (!signal.aborted && event.type === 'status' && event.status === 'article_loaded') {
                            scope = event.source_scope;
                            selection = event.selection || '';
                            showScope();
                        }
                    }, {signal});
                if (signal.aborted) return;
                if (!text.trim()) throw new Error(t('article_exposition_empty'));
                await renderer.finish(text);
                if (signal.aborted) return;
                if (renderer.error) throw renderer.error;
                fullText = text;
                copy.disabled = false;
                save.disabled = false;
            } catch (failure) {
                if (signal.aborted) return;
                // Retain any received text while making an incomplete result explicit.
                await renderer.finish(failure.partialText || renderer.text || '');
                if (signal.aborted) return;
                error.textContent = failure.status === 404 ? t('article_exposition_server_old')
                    : `${t('article_exposition_error')} ${failure.message}`;
                if (status.textContent === t('article_exposition_loading')) status.hidden = true;
                error.hidden = false;
                retry.hidden = false;
            } finally {
                answer.setAttribute('aria-busy', 'false');
            }
        };
        overlay.querySelector('.btn-close-modal').addEventListener('click', close);
        overlay.querySelector('.article-exposition-close').addEventListener('click', close);
        overlay.addEventListener('click', event => {if (event.target === overlay) close();});
        overlay.addEventListener('keydown', event => {
            if (event.key === 'Escape' && !event.defaultPrevented
                && !document.querySelector('.formula-zoom-dialog[open]')) {
                event.preventDefault();
                event.stopPropagation();
                close();
            }
            if (event.key === 'Tab') {
                const controls = [...overlay.querySelectorAll('button, a[href]')]
                    .filter(element => !element.disabled && !element.hidden);
                const first = controls[0], last = controls.at(-1);
                if (event.shiftKey && document.activeElement === first) {event.preventDefault(); last?.focus();}
                else if (!event.shiftKey && document.activeElement === last) {event.preventDefault(); first?.focus();}
            }
        });
        retry.addEventListener('click', run);
        save.addEventListener('click', async () => {
            if (saving || save.disabled) return;
            saving = true;
            try {
                const confirmed = await DialogService.confirm({
                    title: t('article_exposition_save_title'), message: t('article_exposition_save_confirm'),
                    confirmText: t('save'), focusCancel: true,
                });
                if (!confirmed || controller.signal.aborted) return;
                const current = AppState.getBlock(block.id);
                if (AppState.currentNote !== note || AppState.documentEpoch !== epoch
                    || sourceKey(current?.sources?.[sourceIndex]) !== originalKey) {
                    throw new Error(t('article_exposition_source_changed'));
                }
                save.disabled = true;
                retry.disabled = true;
                const sources = current.sources.map((item, index) => index === sourceIndex
                    ? {...item, exposition: {text: fullText, scope, selection}} : item);
                AppState.updateBlock(block.id, {sources});
                await SaveCoordinator.saveCurrentNote();
                if (controller.signal.aborted) return;
                saved.textContent = t('article_exposition_saved');
                saved.hidden = false;
                error.hidden = true;
                retry.textContent = t('article_exposition_regenerate');
                retry.hidden = false;
                onSaved?.();
            } catch (failure) {
                if (controller.signal.aborted) return;
                save.disabled = false;
                error.textContent = `${t('article_exposition_save_error')} ${failure.message}`;
                error.hidden = false;
            } finally {
                saving = false;
                retry.disabled = false;
                if (!controller.signal.aborted) (save.disabled ? overlay.querySelector('.article-exposition-close') : save).focus({preventScroll: true});
            }
        });
        copy.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(fullText);
                copy.textContent = t('article_exposition_copied');
            } catch {
                error.textContent = t('article_exposition_copy_error');
                error.hidden = false;
            }
        });
        document.addEventListener('noteOpened', close);
        document.body.appendChild(overlay);
        overlay.querySelector('.btn-close-modal').focus({preventScroll: true});
        if (parent) parent.inert = true;
        if (source.exposition?.text) {
            fullText = source.exposition.text;
            scope = source.exposition.scope;
            selection = source.exposition.selection || '';
            showScope();
            saved.textContent = t('article_exposition_saved');
            saved.hidden = false;
            copy.disabled = false;
            retry.textContent = t('article_exposition_regenerate');
            retry.hidden = false;
            renderer = new StreamMarkdownRenderer(answer, {signal: controller.signal});
            void renderer.finish(fullText);
        } else void run();
    }
}

export default ArticleExpositionModal;
