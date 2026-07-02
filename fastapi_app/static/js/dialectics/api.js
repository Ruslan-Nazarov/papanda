/**
 * api.js - Работа с сервером (Dialectics)
 */
export const DialecticsAPI = {
    async list(query = '') {
        const url = query ? `/api/dialectics?search=${encodeURIComponent(query)}` : '/api/dialectics';
        const res = await fetch(url);
        return res.ok ? await res.json() : [];
    },
    async get(id) {
        const res = await fetch(`/api/dialectics/${id}`);
        return res.ok ? await res.json() : null;
    },
    async save(payload, id = null) {
        const url = id ? `/api/dialectics/${id}` : '/api/dialectics/save';
        const method = id ? 'PATCH' : 'POST';
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        return res.ok ? await res.json() : null;
    },
    async delete(id) {
        const res = await fetch(`/api/dialectics/${id}`, { method: 'DELETE' });
        return res.ok;
    },
    async listCategories() {
        const res = await fetch('/api/dialectics/categories/all');
        return res.ok ? await res.json() : [];
    },
    async createCategory(name) {
        const res = await fetch('/api/dialectics/categories/new', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        return res.ok ? await res.json() : null;
    },
    async searchNotes(q) {
        if (!q || q.length < 2) return [];
        const res = await fetch(`/api/dialectics/search/notes?q=${encodeURIComponent(q)}`);
        return res.ok ? await res.json() : [];
    },
    async listTrash() {
        const res = await fetch('/api/dialectics/trash/list');
        return res.ok ? await res.json() : [];
    },
    async restoreTrash(id) {
        const res = await fetch(`/api/dialectics/${id}/restore`, { method: 'POST' });
        return res.ok ? await res.json() : null;
    },
    async permanentDelete(id) {
        const res = await fetch(`/api/dialectics/${id}/permanent`, { method: 'DELETE' });
        return res.ok;
    },
    async getHistory(id) {
        const res = await fetch(`/api/dialectics/${id}/history`);
        return res.ok ? await res.json() : [];
    },
    async restoreHistory(id, historyId) {
        const res = await fetch(`/api/dialectics/${id}/history/${historyId}/restore`, { method: 'POST' });
        return res.ok ? await res.json() : null;
    }
};
