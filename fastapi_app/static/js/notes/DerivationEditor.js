import AppState from './AppState.js';
import Lifecycle from './Lifecycle.js';
import HtmlSafety from './HtmlSafety.js';
import { EditorTiptapSetup } from './EditorTiptapSetup.js';
import { t } from '../i18n.js';

// The pair and document epoch belong to the editor session, not to the moving line.
class DerivationEditor {
    static session = null;

    static close() {
        this.session?.dispose();
        this.session = null;
    }

    static open(sourceId, targetId, opener) {
        this.close();
        const source = AppState.getBlock(sourceId), target = AppState.getBlock(targetId);
        if (!source || !target) return;
        const epoch = AppState.documentEpoch;
        const session = new Lifecycle();
        this.session = session;
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay derivation-overlay';
        overlay.innerHTML = `
            <section class="derivation-dialog" role="dialog" aria-modal="true" aria-labelledby="derivation-title" aria-describedby="derivation-prompt">
                <header><h2 id="derivation-title">${t('derivation_title')}</h2><button type="button" class="derivation-close" aria-label="${t('close_word')}">✕</button></header>
                <div class="derivation-pair"><div class="derivation-source"></div><span aria-hidden="true">→</span><div class="derivation-target"></div></div>
                <p id="derivation-prompt">${t('derivation_prompt')}</p>
                <div class="derivation-toolbar" role="toolbar" aria-label="${t('derivation_format')}">
                    <button type="button" class="format-btn" data-format="bold" title="${t('derivation_bold')}" aria-label="${t('derivation_bold')}"><b>B</b></button>
                    <button type="button" class="format-btn" data-format="italic" title="${t('derivation_italic')}" aria-label="${t('derivation_italic')}"><i>I</i></button>
                    <button type="button" class="format-btn" data-format="math" title="${t('derivation_math')}" aria-label="${t('derivation_math')}">∑</button>
                </div>
                <div class="derivation-content"></div>
                <footer><button type="button" class="derivation-remove">${t('derivation_remove')}</button><div><button type="button" class="derivation-cancel">${t('cancel')}</button><button type="button" class="derivation-save">${t('save')}</button></div></footer>
            </section>`;
        overlay.querySelector('.derivation-source').textContent = source.title || t('derivation_untitled');
        overlay.querySelector('.derivation-target').textContent = target.title || t('derivation_untitled');
        document.body.appendChild(overlay);
        session.own(() => { overlay.remove(); if (opener?.isConnected) opener.focus({preventScroll: true}); });
        const link = (target.derivations || []).find(item => item.source_id === sourceId);
        const editor = EditorTiptapSetup.createEditor(overlay.querySelector('.derivation-content'), HtmlSafety.rich(link?.html || ''));
        editor.view.dom.setAttribute('aria-label', t('derivation_prompt'));
        session.own(() => editor.destroy());
        EditorTiptapSetup.bindFormatButtons(overlay, () => editor, session);
        editor.on('update', () => document.dispatchEvent(new Event('editingActivity')));
        const alive = () => epoch === AppState.documentEpoch && AppState.getBlock(sourceId) && AppState.getBlock(targetId);
        const save = remove => {
            if (alive()) {
                const derivations = (AppState.getBlock(targetId).derivations || []).filter(item => item.source_id !== sourceId);
                if (!remove && !editor.isEmpty) derivations.push({source_id: sourceId, html: HtmlSafety.rich(editor.getHTML())});
                AppState.updateBlock(targetId, {derivations});
            }
            this.close();
        };
        overlay.querySelector('.derivation-remove').hidden = !link;
        session.on(overlay.querySelector('.derivation-save'), 'click', () => save(false));
        session.on(overlay.querySelector('.derivation-remove'), 'click', () => save(true));
        for (const el of overlay.querySelectorAll('.derivation-close, .derivation-cancel')) session.on(el, 'click', () => this.close());
        session.on(document, 'noteOpened', () => this.close());
        session.on(document, 'stateDirty', () => { if (!alive()) this.close(); });
        session.on(document, 'keydown', event => {
            if (event.target.closest('.formula-modal-backdrop')) return;
            if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); this.close(); }
            if (event.key === 'Tab') {
                const controls = [...overlay.querySelectorAll('button, [contenteditable="true"]')].filter(el => !el.hidden && el.getClientRects().length);
                const first = controls[0], last = controls.at(-1);
                if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
                else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
            }
        }, true);
    }
}

export default DerivationEditor;
