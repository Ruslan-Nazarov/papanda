/** Заголовок выбора модели ИИ (шапка «Модель»). Читаем прямо из localStorage,
 *  чтобы не тянуть ModelManager в каждый модуль. */
export function modelHeader() {
    try {
        const m = localStorage.getItem('dialectics_model');
        return m && m !== 'auto' ? { 'X-Model-Prefer': m } : {};
    } catch { return {}; }
}

class NotesAPI {
    static async request(endpoint, method = 'GET', body = null) {
        const options = {
            method,
            headers: { 'Content-Type': 'application/json', ...modelHeader() },
        };
        if (body) options.body = JSON.stringify(body);

        try {
            const res = await fetch(`/api${endpoint}`, options);
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.detail || `HTTP Error ${res.status}`);
            }
            return await res.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    /**
     * Стрим ответа ИИ через SSE.
     *   onDelta(chunkText, accumulatedText) — на каждый текстовый кусок ({delta})
     *   onEvent(evObject) — на любой кадр (для {step,content} и т.п.)
     * Возвращает полный накопленный текст. Кадры: {delta}|{step,content}|{done}|{error}.
     */
    static async stream(endpoint, body, onDelta, onEvent) {
        const res = await fetch(`/api${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...modelHeader() },
            body: JSON.stringify(body),
        });
        if (!res.ok || !res.body) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || `HTTP Error ${res.status}`);
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let full = '';
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const parts = buffer.split('\n\n');
            buffer = parts.pop();
            for (const part of parts) {
                const line = part.trim();
                if (!line.startsWith('data:')) continue;
                let ev;
                try { ev = JSON.parse(line.slice(5).trim()); } catch { continue; }
                if (ev.error) throw new Error(ev.error);
                if (onEvent) onEvent(ev);
                if (ev.delta) { full += ev.delta; if (onDelta) onDelta(ev.delta, full); }
            }
        }
        return full;
    }

    static getNotes(search = '', categoryId = '') {
        let url = '/dialectics?';
        if (search) url += `search=${encodeURIComponent(search)}&`;
        if (categoryId) url += `category_id=${encodeURIComponent(categoryId)}&`;
        return this.request(url); 
    }
    static getNote(id) { return this.request(`/dialectics/${id}`); }
    static createNote(data) { return this.request('/dialectics/save', 'POST', data); }
    static updateNote(id, data) { return this.request(`/dialectics/${id}`, 'PATCH', data); }
    static updateNoteStatus(id, status) { return this.request(`/dialectics/${id}/status?status=${status}`, 'POST'); }
    static deleteNote(id) { return this.request(`/dialectics/${id}`, 'DELETE'); }
    // Trash
    static getTrash() { return this.request('/dialectics/trash/list'); }
    static restoreNote(id) { return this.request(`/dialectics/${id}/restore`, 'POST'); }
    static permanentDelete(id) { return this.request(`/dialectics/${id}/permanent`, 'DELETE'); }
    
    // Versions
    static getVersions(noteId) { return this.request(`/dialectics/${noteId}/versions`); }
    static createCheckpoint(noteId, title, isManual = true) { 
        return this.request(`/dialectics/${noteId}/checkpoint`, 'POST', { title, is_manual: isManual }); 
    }
    static restoreVersion(noteId, versionId) { return this.request(`/dialectics/${noteId}/versions/${versionId}/restore`, 'POST'); }
    static pinVersion(noteId, versionId) { return this.request(`/dialectics/${noteId}/versions/${versionId}/pin`, 'POST'); }
    static deleteVersion(noteId, versionId) { return this.request(`/dialectics/${noteId}/versions/${versionId}`, 'DELETE'); }
    // AI
    static routeConspectus(payload) {
        return this.request('/ai/dialectics/conspectus/route', 'POST', payload);
    }
    static textMath(text) {
        return this.request('/ai/dialectics/text-math', 'POST', { text });
    }
    static editMath(instruction, formula) {
        return this.request('/ai/dialectics/edit-math', 'POST', { instruction, formula });
    }

    // Connections
    static getConnections(noteId) { return this.request(`/dialectics/${noteId}/connections`); }
    static createConnection(noteId, targetNoteId, label = 'related') { 
        return this.request(`/dialectics/${noteId}/connections`, 'POST', { note_id_to: targetNoteId, label }); 
    }
    static deleteConnection(connectionId) { 
        return this.request(`/dialectics/connections/${connectionId}`, 'DELETE'); 
    }
    // Categories
    static getCategories() { return this.request('/dialectics/categories/all'); }
    static createCategory(name) { return this.request('/dialectics/categories/new', 'POST', { name }); }
    static updateCategory(id, name) { return this.request(`/dialectics/categories/${id}`, 'PUT', { name }); }
    static deleteCategory(id) { return this.request(`/dialectics/categories/${id}`, 'DELETE'); }
}

export default NotesAPI;
