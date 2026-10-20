import AppState from './AppState.js';
import {t} from '../i18n.js';

// Tag settings belong to the note; article assignments contain stable IDs.
class DictionaryTags {
    constructor(dialog, changed) {
        this.dialog = dialog;
        this.changed = changed;
        this.filter = '';
        this.selected = new Set();
        this.renderFilters();
        this.renderSettings();
        this.renderPicker();
    }

    get catalog() { return AppState.currentNote?.dictionary_tags || []; }
    get words() { return AppState.currentNote?.dictionary || []; }

    button(label, className, action) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = className;
        button.textContent = label;
        button.addEventListener('click', action);
        return button;
    }

    chip(tag, action) {
        const chip = this.button(tag.name, 'dict-tag', action);
        if (/^#[0-9a-f]{6}$/i.test(tag.color)) chip.style.setProperty('--tag-color', tag.color);
        chip.dataset.tagId = tag.id;
        return chip;
    }

    matches(entry) {
        return !this.filter || (this.filter === '__untagged' ? !entry.tags?.length : entry.tags?.includes(this.filter));
    }

    names(entry) {
        return this.catalog.filter(tag => entry.tags?.includes(tag.id)).map(tag => tag.name);
    }

    resetFilter() { this.filter = ''; this.renderFilters(); }

    badges(entry, target) {
        const row = document.createElement('div');
        row.className = 'dict-entry-tags';
        this.catalog.filter(tag => entry.tags?.includes(tag.id)).forEach(tag => {
            row.appendChild(this.chip(tag, () => {
                this.filter = tag.id;
                this.renderFilters();
                this.changed();
            }));
        });
        if (row.childElementCount) target.appendChild(row);
    }

    renderFilters() {
        const row = this.dialog.querySelector('.dict-tag-filters');
        row.replaceChildren();
        const choices = [{id: '', name: t('dict_tags_all')}, ...this.catalog, {id: '__untagged', name: t('dict_tags_none')}];
        choices.forEach(tag => {
            const count = this.words.filter(entry => !tag.id || (tag.id === '__untagged' ? !entry.tags?.length : entry.tags?.includes(tag.id))).length;
            const button = this.chip({...tag, name: `${tag.name} · ${count}`}, () => {
                this.filter = tag.id;
                this.renderFilters();
                this.changed();
            });
            button.setAttribute('aria-pressed', String(this.filter === tag.id));
            row.appendChild(button);
        });
    }

    refresh() {
        this.renderFilters();
        this.renderSettings();
        this.renderPicker();
        this.changed();
    }

    saveTag(id, name, color, error) {
        name = name.trim();
        if (!name || name.length > 60 || this.catalog.some(tag => tag.id !== id && tag.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
            error.textContent = t('dict_tags_invalid');
            return null;
        }
        if (!id && this.catalog.length >= 100) { error.textContent = t('dict_tags_limit'); return null; }
        const tag = {id: id || crypto.randomUUID(), name, color};
        const catalog = id ? this.catalog.map(item => item.id === id ? tag : item) : [...this.catalog, tag];
        AppState.updateNote({dictionary_tags: catalog});
        error.textContent = '';
        return tag;
    }

    creationForm(target, assign = false) {
        const row = document.createElement('form');
        row.className = 'dict-tag-create';
        const name = document.createElement('input');
        name.type = 'text';
        name.maxLength = 60;
        name.placeholder = t('dict_tags_new');
        name.setAttribute('aria-label', t('dict_tags_new'));
        const color = document.createElement('input');
        color.type = 'color';
        color.value = '#2563eb';
        color.setAttribute('aria-label', t('dict_tags_color'));
        const add = document.createElement('button');
        add.type = 'submit';
        add.textContent = t('dict_tags_create');
        const error = document.createElement('p');
        error.className = 'dict-tag-error';
        error.setAttribute('role', 'alert');
        row.append(name, color, add);
        row.addEventListener('submit', event => {
            event.preventDefault();
            const tag = this.saveTag(null, name.value, color.value, error);
            if (!tag) return;
            if (assign) this.selected.add(tag.id);
            this.refresh();
            target.querySelector('input[type=text]')?.focus();
        });
        target.append(row, error);
    }

    renderSettings() {
        const target = this.dialog.querySelector('.dict-tag-settings-body');
        target.replaceChildren();
        const hint = document.createElement('p');
        hint.className = 'dict-tag-hint';
        hint.textContent = t('dict_tags_settings_hint');
        target.appendChild(hint);
        this.catalog.forEach(tag => {
            const row = document.createElement('form');
            row.className = 'dict-tag-setting';
            row.dataset.tagId = tag.id;
            const name = document.createElement('input');
            name.type = 'text';
            name.value = tag.name;
            name.maxLength = 60;
            name.setAttribute('aria-label', t('dict_tags_name'));
            const color = document.createElement('input');
            color.type = 'color';
            color.value = tag.color;
            color.setAttribute('aria-label', `${t('dict_tags_color')}: ${tag.name}`);
            const save = document.createElement('button');
            save.type = 'submit';
            save.textContent = t('save');
            const remove = this.button(t('delete'), 'dict-tag-remove', () => {
                if (!window.confirm(t('dict_tags_delete_confirm').replace('{name}', tag.name))) return;
                AppState.updateNote({dictionary_tags: this.catalog.filter(item => item.id !== tag.id),
                    dictionary: this.words.map(entry => ({...entry, tags: (entry.tags || []).filter(id => id !== tag.id)}))});
                this.selected.delete(tag.id);
                if (this.filter === tag.id) this.filter = '';
                this.refresh();
            });
            remove.setAttribute('aria-label', `${t('delete')}: ${tag.name}`);
            const error = document.createElement('p');
            error.className = 'dict-tag-error';
            error.setAttribute('role', 'alert');
            row.append(name, color, save, remove);
            row.addEventListener('submit', event => {
                event.preventDefault();
                if (this.saveTag(tag.id, name.value, color.value, error)) this.refresh();
            });
            target.append(row, error);
        });
        this.creationForm(target);
    }

    edit(entry) {
        this.selected = new Set(entry?.tags || []);
        this.renderPicker();
    }

    renderPicker() {
        const target = this.dialog.querySelector('.dict-tag-picker');
        target.replaceChildren();
        const options = document.createElement('div');
        options.className = 'dict-tag-options';
        this.catalog.forEach(tag => {
            const chip = this.chip(tag, () => {
                if (this.selected.has(tag.id)) this.selected.delete(tag.id);
                else this.selected.add(tag.id);
                chip.setAttribute('aria-pressed', String(this.selected.has(tag.id)));
            });
            chip.setAttribute('aria-pressed', String(this.selected.has(tag.id)));
            options.appendChild(chip);
        });
        target.appendChild(options);
        this.creationForm(target, true);
    }
}

export default DictionaryTags;
