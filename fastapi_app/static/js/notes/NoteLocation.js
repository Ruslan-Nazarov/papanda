// The root page always starts with a blank note. Explicit note links still work.
class NoteLocation {
    static lastOpenedId() {
        try {
            const id = localStorage.getItem('papanda_last_note_id');
            return /^[1-9]\d*$/.test(id || '') ? id : null;
        } catch { return null; }
    }

    /** @param {string | number} id @param {string | null} [slug] */
    static remember(id, slug = null) {
        try { localStorage.setItem('papanda_last_note_id', String(id)); } catch {}
        if (slug) {
            this._setURL(id, slug);
        } else if (new URLSearchParams(window.location.search).get('note') !== String(id)) {
            // Ordinary navigation stays at /, so reopening the app starts fresh.
            // A matching explicit ?note= link keeps its bookmarkable URL.
            this._setURL(null);
        }
    }

    static clear() {
        this.forgetLastOpened();
        this.clearURL();
    }

    static forgetLastOpened() {
        try { localStorage.removeItem('papanda_last_note_id'); } catch {}
    }

    static clearURL() {
        this._setURL(null);
    }

    static initialId() {
        return new URLSearchParams(window.location.search).get('note');
    }

    static initialLibrarySlug() {
        return new URLSearchParams(window.location.search).get('conspect');
    }

    /** @param {string | number | null} id @param {string | null} [slug] */
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
