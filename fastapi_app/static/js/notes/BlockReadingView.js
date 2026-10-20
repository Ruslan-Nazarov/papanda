import AppState from './AppState.js';
import { t } from '../i18n.js';

// Reading state is independent of card reconstruction.
class BlockReadingView {
    static readingBlockId = null;
    static readingNote = null;
    static minimizedReadings = new Map();
    static readingDock = null;
    static readingDocument = null;

    static syncReadingState() {
        if (this.readingDocument !== document) {
            this.readingDocument = document;
            document.addEventListener('noteOpened', () => this.syncReadingState());
            document.addEventListener('stateDirty', () => {
                this.syncReadingState();
                this.renderReadingDock();
            });
        }
        let changed = false;
        if (this.readingNote !== AppState.currentNote) {
            this.readingBlockId = null;
            this.minimizedReadings.clear();
            this.readingNote = AppState.currentNote;
            changed = true;
        }
        const blocks = AppState.currentNote?.blocks;
        if (Array.isArray(blocks)) {
            for (const id of this.minimizedReadings.keys()) {
                if (!blocks.some(block => block.id === id && block.role !== 'section' && !block.isDraft)) {
                    this.minimizedReadings.delete(id);
                    changed = true;
                }
            }
            if (this.readingBlockId && !blocks.some(block => block.id === this.readingBlockId)) this.readingBlockId = null;
        }
        if (changed) this.renderReadingDock();
    }

    static minimizeReading(div) {
        const id = div.dataset.id;
        this.minimizedReadings.set(id, {
            top: Math.min(96, div.getBoundingClientRect().top),
            title: div.querySelector('.block-title').textContent.trim(),
        });
        if (this.readingBlockId === id) this.readingBlockId = null;
        this.setReadingView(div, false);
        div.classList.add('reading-minimized');
        this.renderReadingDock();
        [...this.readingDock.children].find(button => button.dataset.blockId === id)?.focus({preventScroll: true});
    }

    static restoreReading(id) {
        this.syncReadingState();
        const saved = this.minimizedReadings.get(id);
        const div = document.getElementById(id);
        if (!saved || !div) return;
        const previous = document.querySelector('#blocks-container .dialectics-block.reading-centered');
        if (previous && previous !== div) this.setReadingView(previous, false);
        this.minimizedReadings.delete(id);
        div.classList.remove('reading-minimized');
        this.readingBlockId = id;
        this.setReadingView(div, true);
        this.renderReadingDock();
        div.querySelector('.btn-minimize-reading').focus({preventScroll: true});
        window.scrollBy({top: div.getBoundingClientRect().top - saved.top, behavior: 'instant'});
    }

    static renderReadingDock() {
        this.readingDock?.remove();
        this.readingDock = null;
        if (!this.minimizedReadings.size) return;
        const dock = document.createElement('nav');
        dock.className = 'reading-dock';
        dock.setAttribute('aria-label', t('reading_minimized'));
        for (const [id, saved] of this.minimizedReadings) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'reading-dock-item';
            button.dataset.blockId = id;
            const block = (AppState.currentNote?.blocks || []).find(block => block.id === id);
            const title = (block?.title ?? saved.title).trim() || t('ed_untitled');
            button.title = `${t('reading_restore')}: ${title}`;
            button.setAttribute('aria-label', button.title);
            const label = document.createElement('span');
            label.textContent = title;
            const icon = document.createElement('span');
            icon.className = 'reading-dock-restore';
            icon.textContent = '↑';
            icon.setAttribute('aria-hidden', 'true');
            button.append(label, icon);
            button.addEventListener('click', () => this.restoreReading(id));
            dock.append(button);
        }
        document.body.append(dock);
        this.readingDock = dock;
    }

    static setReadingView(div, active) {
        div.classList.toggle('reading-centered', active);
        const button = div.querySelector('.btn-reading-view');
        if (!button) return;
        const label = t(active ? 'tt_return_to_column' : 'tt_read_center');
        button.title = label;
        button.setAttribute('aria-label', label);
        button.setAttribute('aria-pressed', String(active));
        button.querySelector('i').className = `ph ${active ? 'ph-arrows-in-simple' : 'ph-arrows-out-simple'}`;
    }

}

export default BlockReadingView;
