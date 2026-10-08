import AppState from './AppState.js';
import NotesAPI from './api.js';
import Lifecycle from './Lifecycle.js';
import { ALGORITHM_STEPS } from './BlockConstants.js';
import { showToast } from './ToastService.js';
import { t } from '../i18n.js';

class RequestDocuments {
    static upload = null;

    static init(onRenderAll) {
        if (this.lifecycle && !this.lifecycle.disposed) return;
        this.lifecycle = new Lifecycle();
        this.onRenderAll = onRenderAll;
        this.panel = document.getElementById('request-document-template')?.content.firstElementChild.cloneNode(true);
        this.lifecycle.on(this.panel, 'click', event => event.stopPropagation());
        this.lifecycle.on(this.panel, 'keydown', event => event.stopPropagation());
        this.lifecycle.on(this.panel?.querySelector('#btn-request-document'), 'click', () =>
            this.panel.querySelector('#request-document-input')?.click());
        this.lifecycle.on(this.panel?.querySelector('#request-document-input'), 'change', event => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) this.attach(file);
        });
        this.lifecycle.on(this.panel?.querySelector('#btn-remove-request-document'), 'click', () => {
            const anchor = this.anchor();
            if (anchor && !(anchor.html || '').trim() && !anchor.sourceGoal) {
                AppState.removeBlock(anchor.id);
                this.renderCanvas();
            } else if (anchor) AppState.updateBlock(anchor.id, {request_document: null});
        });
        this.lifecycle.on(document, 'stateDirty', () => this.render());
        this.lifecycle.on(document, 'noteSaved', () => this.render());
        this.lifecycle.on(document, 'noteOpened', () => {
            this.upload?.abort();
            this.upload = null;
            this.render();
        });
        this.render();
    }

    static dispose() {
        this.upload?.abort();
        this.upload = null;
        this.lifecycle?.dispose();
        this.panel?.remove();
        this.panel = null;
    }

    static anchor() {
        return AppState.currentNote.blocks.find(block => block.role === 'anchor');
    }

    static mount(container) {
        if (!this.panel) return;
        const anchor = this.anchor();
        const block = container.querySelector('.dialectics-hint-block[data-role="anchor"]')
            || (anchor && document.getElementById(anchor.id));
        if (!block) {
            this.panel.remove();
            return;
        }
        const topic = block.querySelector('.anchor-topic-input');
        if (topic) topic.insertAdjacentElement('afterend', this.panel);
        else block.appendChild(this.panel);
        this.render();
    }

    static renderCanvas() {
        const topic = document.querySelector('.anchor-topic-input')?.value || '';
        this.onRenderAll?.();
        const starter = document.querySelector('.anchor-topic-input');
        if (starter) starter.value = topic;
    }

    static async attach(file) {
        if (this.upload) return;
        if (file.size > 2 * 1024 * 1024 || !/\.(docx|txt)$/i.test(file.name)) {
            showToast(t('request_document_limits'), 'error');
            return;
        }
        const epoch = AppState.documentEpoch;
        const controller = new AbortController();
        this.upload = controller;
        this.render();
        try {
            const result = await NotesAPI.extractRequestDocument(file, controller.signal);
            if (controller.signal.aborted || AppState.documentEpoch !== epoch) return;
            let anchor = this.anchor();
            if (!anchor) {
                const step = ALGORITHM_STEPS.find(item => item.role === 'anchor');
                const id = crypto.randomUUID();
                AppState.addBlock({id, role: 'anchor', side: 'left', title: step?.title || '',
                    html: '', status: 'none', request_document: result});
                anchor = AppState.getBlock(id);
                this.renderCanvas();
            } else {
                AppState.updateBlock(anchor.id, {request_document: result});
            }
        } catch (error) {
            if (!controller.signal.aborted && AppState.documentEpoch === epoch) {
                showToast(error.message || t('request_document_error'), 'error');
            }
        } finally {
            if (this.upload === controller) {
                this.upload = null;
                this.render();
            }
        }
    }

    static render() {
        const button = this.panel?.querySelector('#btn-request-document');
        const preview = this.panel?.querySelector('#request-document-preview');
        const remove = this.panel?.querySelector('#btn-remove-request-document');
        if (!button || !preview || !remove) return;
        const attachment = this.anchor()?.request_document;
        button.disabled = Boolean(this.upload);
        button.textContent = t(this.upload ? 'request_document_reading' : attachment
            ? 'request_document_replace' : 'request_document_attach');
        remove.disabled = Boolean(this.upload);
        remove.hidden = !attachment;
        preview.hidden = !attachment;
        this.panel.querySelector('#request-document-name').textContent = attachment?.name || '';
        this.panel.querySelector('#request-document-text').textContent = attachment?.text || '';
    }
}

export default RequestDocuments;
