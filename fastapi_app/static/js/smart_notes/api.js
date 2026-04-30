/**
 * api.js - Работа с сервером
 */
export const NoteAPI = {
    async list(query = '') {
        const url = query ? `/api/smart_notes?search=${encodeURIComponent(query)}` : '/api/smart_notes';
        const res = await fetch(url);
        return res.ok ? await res.json() : [];
    },
    async get(id) {
        const res = await fetch(`/api/smart_notes/${id}`);
        return res.ok ? await res.json() : null;
    },
    async save(payload, id = null) {
        const url = id ? `/api/smart_notes/${id}` : '/api/smart_notes/save';
        const method = id ? 'PUT' : 'POST';
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        return res.ok ? await res.json() : null;
    },
    async delete(id) {
        const res = await fetch(`/api/smart_notes/${id}`, { method: 'DELETE' });
        return res.ok;
    }
};
