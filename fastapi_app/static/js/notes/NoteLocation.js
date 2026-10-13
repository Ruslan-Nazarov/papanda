// Keep browser reloads attached to the document the user is viewing.
class NoteLocation {
    static remember(id, slug = null) {
        try { localStorage.setItem('papanda_last_note_id', String(id)); } catch {}
        this._setURL(id, slug);
    }

    static clear() {
        try { localStorage.removeItem('papanda_last_note_id'); } catch {}
        this._setURL(null);
    }

    static initialId() {
        const explicit = new URLSearchParams(window.location.search).get('note');
        if (explicit) return explicit;
        try { return localStorage.getItem('papanda_last_note_id'); } catch { return null; }
    }

    static initialLibrarySlug() {
        return new URLSearchParams(window.location.search).get('conspect');
    }

    static _setURL(id, slug = null) {
        try {
            const url = new URL(window.location.href);
            if (slug) {
                url.searchParams.set('conspect', slug);
                url.searchParams.delete('note');
                if (!url.searchParams.has('lang')) url.searchParams.set('lang', typeof document !== 'undefined' ? document.documentElement?.lang || 'ru' : 'ru');
            } else {
                url.searchParams.delete('conspect');
                if (id) url.searchParams.set('note', String(id));
                else url.searchParams.delete('note');
            }
            window.history.replaceState(null, '', url);
        } catch {}
    }
}

export default NoteLocation;
