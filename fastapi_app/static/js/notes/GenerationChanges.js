import { t } from '../i18n.js';

// Build a complete replacement before touching the active document.
class GenerationChanges {
    static base(role) {
        return /^step([1-5])(?:\.[1-9][0-9]*)?$/.exec(role || '')?.[1] || null;
    }

    static build(note, result, toHtml, definitions = []) {
        const copy = JSON.parse(JSON.stringify(note));
        const updates = result.updated_steps || {};
        const bases = new Set(result.replace_bases || Object.keys(updates).map(key => this.base(key)).filter(Boolean));
        if ([...bases].some(base => !/^[1-5]$/.test(base))) throw new Error('Invalid replacement family');
        const groups = new Map([...bases].sort().map(base => [base, []]));
        const ordered = Object.entries(updates).sort(([a], [b]) => a.localeCompare(b, undefined, {numeric: true}));
        for (const [role, value] of ordered) {
            const base = this.base(role);
            if (!base || !bases.has(base)) throw new Error('Invalid generated step family');
            if (value.status === 'invalidated') continue;
            if (typeof value.content !== 'string' || !value.content.trim()) throw new Error('Empty generated block');
            const previous = copy.blocks.find(block => block.role === role);
            const definition = definitions.find(step => step.role === 'step' + base) || {};
            const suffix = role.split('.')[1];
            const title = value.title || previous?.title || definition.title || role;
            groups.get(base).push({...previous,
                id: previous?.id || 'block-' + crypto.randomUUID(),
                schema_version: 1, side: previous?.side || definition.side || 'center',
                role, title: suffix && !previous && !value.title ? title + ' (' + suffix + ')' : title,
                html: toHtml(value.content), status: value.status === 'ready' ? 'ready' : 'in_progress',
                isDraft: false, author: 'ai'});
        }
        const seen = new Set(), blocks = [];
        const insert = base => {
            if (!seen.has(base)) {
                blocks.push(...groups.get(base));
                seen.add(base);
            }
        };
        for (const block of copy.blocks) {
            const base = this.base(block.role);
            if (base) for (const pending of groups.keys()) if (+pending <= +base) insert(pending);
            if (!bases.has(base)) blocks.push(block);
        }
        for (const base of groups.keys()) insert(base);
        copy.blocks = blocks;
        for (const block of blocks) {
            const title = result.step_titles?.[block.role?.slice(4)];
            if (this.base(block.role) && typeof title === 'string' && title.trim()) block.title = title.trim();
        }
        const meta = result.note_meta || {};
        const currentTitle = copy.title?.trim() || '';
        if ((!currentTitle || ['placeholder_title', 'menu_new_note', 'untitled'].some(key => t(key) === currentTitle))
            && meta.note_title) copy.title = meta.note_title.trim();
        const anchor = blocks.find(block => block.role === 'anchor');
        if (anchor && meta.anchor_summary) {
            anchor.sourceGoal ||= (anchor.html || '').replace(/<[^>]+>/g, '').trim();
            anchor.html = toHtml(meta.anchor_summary);
            anchor.anchorResolved = true;
            if (meta.anchor_title) anchor.title = meta.anchor_title;
        }
        return copy;
    }
}

export default GenerationChanges;
