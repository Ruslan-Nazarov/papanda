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
    }
};
