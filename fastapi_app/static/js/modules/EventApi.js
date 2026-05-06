/**
 * EventApi.js - Networking logic for events.
 */

export const EventApi = {
    async fetchStickers(eventId, recId = null) {
        let url = `/api/stickers/event/${eventId}/`;
        if (recId) url += `?recurrence_id=${recId}`;
        const resp = await fetch(url);
        return await resp.json();
    },

    async saveEvent(payload) {
        const resp = await fetch('/edit_event_inline', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        return await resp.json();
    },

    async toggleDone(eventId) {
        // Correct URL from routers/actions.py
        const resp = await fetch(`/toggle_event_done/${eventId}`, { method: 'POST' });
        return await resp.json();
    }
};
