/**
 * StickerService.js - API interaction for stickers
 */

export class StickerService {
    static async getById(id) {
        const res = await fetch(`/api/stickers/${id}/`);
        if (!res.ok) throw new Error('Failed to fetch sticker');
        return await res.json();
    }

    static async getByParent(parentType, parentId, secondaryId = null) {
        let url = `/api/stickers/${parentType}/${parentId}/`;
        if (secondaryId) url += `?recurrence_id=${secondaryId}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch parent stickers');
        return await res.json();
    }

    static async save(id, payload) {
        const url = id ? `/api/stickers/${id}/` : '/api/stickers/';
        const method = id ? 'PATCH' : 'POST';
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.detail || 'Failed to save sticker');
        }
        return await res.json();
    }

    static async archive(id) {
        const res = await fetch(`/api/stickers/${id}/archive/`, { method: 'POST' });
        if (!res.ok) throw new Error('Failed to archive sticker');
        return true;
    }

    static async hardDelete(id) {
        const res = await fetch(`/api/stickers/${id}/`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete sticker');
        return true;
    }

    static async searchNotes(query = '') {
        const url = query ? `/api/stickers/notes_search?query=${encodeURIComponent(query)}` : '/api/stickers/notes_search';
        const res = await fetch(url);
        if (!res.ok) throw new Error('Note search failed');
        return await res.json();
    }
}
