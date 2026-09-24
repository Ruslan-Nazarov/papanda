import ApiContracts from './ApiContracts.js';

class NotesAPI {
    static async request(endpoint, method = 'GET', body = null, signal = undefined) {
        const options = {
            method,
            headers: { 'Content-Type': 'application/json' },
            signal,
        };
        if (body) options.body = JSON.stringify(body);

        try {
            const res = await fetch(`/api${endpoint}`, options);
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                const error = new Error(typeof errorData.detail === 'string' ? errorData.detail : `HTTP Error ${res.status}`);
                error.status = res.status;
                throw error;
            }
            const result = await res.json();
            return result;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    /**
     * Стрим ответа ИИ через SSE.
     *   onDelta(chunkText, accumulatedText) — на каждый текстовый кусок ({delta})
     *   onEvent(evObject) — на любой кадр (для {step,content} и т.п.)
     * Проверяет run_id/sequence и terminal; returnTerminal возвращает результат конспекта.
     */
    static async stream(endpoint, body, onDelta, onEvent, options = {}) {
        const res = await fetch(`/api${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: options.signal,
        });
        if (!res.ok || !res.body) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || `HTTP Error ${res.status}`);
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let full = '';
        let runId = null, sequence = 0, terminal = null;
        const consume = part => {
            const data = part.split(/\r?\n/).filter(line => line.startsWith('data:'))
                .map(line => line.slice(5).trimStart()).join('\n');
            if (!data) return;
            const ev = JSON.parse(data);
            if (!ev || typeof ev !== 'object' || Array.isArray(ev) || terminal
                || !Number.isInteger(ev.sequence) || ev.sequence !== sequence + 1
                || typeof ev.run_id !== 'string' || !ev.run_id
                || (runId && runId !== ev.run_id)
                || (!runId && ev.type !== 'started')) throw new Error('Invalid generation stream');
            const types = ['started', 'status', 'step', 'titles', 'note_meta', 'report', 'not_applicable', 'delta', 'terminal'];
            if (!types.includes(ev.type)) throw new Error('Unknown generation event');
            if (runId && ev.type === 'started') throw new Error('Duplicate stream start');
            runId = ev.run_id;
            sequence = ev.sequence;
            if (ev.type === 'terminal') {
                if (!['completed', 'partial', 'failed', 'cancelled', 'not_applicable'].includes(ev.status)) {
                    throw new Error('Invalid generation outcome');
                }
                terminal = ev;
                if (options.returnTerminal && (!ev.result || ev.result.run_id !== ev.run_id
                    || ev.result.status !== ev.status)) throw new Error('Invalid terminal result');
            }
            if (onEvent) onEvent(ev);
            if (ev.type === 'delta') {
                if (typeof ev.delta !== 'string') throw new Error('Invalid text delta');
                full += ev.delta;
                if (onDelta) onDelta(ev.delta, full);
            }
        };
        try {
            for (;;) {
                const { done, value } = await reader.read();
                buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
                const parts = buffer.split(/\r?\n\r?\n/);
                buffer = parts.pop();
                for (const part of parts) consume(part);
                if (done) break;
            }
            if (buffer.trim()) consume(buffer);
            if (!terminal) throw new Error('Generation stream interrupted before completion');
            if (['failed', 'cancelled'].includes(terminal.status)
                || (terminal.status === 'partial' && !options.returnTerminal)) {
                throw Object.assign(new Error(terminal.result?.error_message || 'Generation incomplete'),
                    {result: terminal.result, partialText: full});
            }
            return options.returnTerminal ? ApiContracts.generationResponse(terminal.result) : full;
        } finally {
            await reader.cancel().catch(() => {});
            reader.releaseLock();
        }
    }

    static getNotes(search = '', categoryId = '') {
        let url = '/dialectics?';
        if (search) url += `search=${encodeURIComponent(search)}&`;
        if (categoryId) url += `category_id=${encodeURIComponent(categoryId)}&`;
        return this.request(url); 
    }
    static getNote(id) { return this.request(`/dialectics/${id}`).then(ApiContracts.noteResponse); }
    static createNote(data) { return this.request('/dialectics/save', 'POST', data).then(ApiContracts.noteResponse); }
    static updateNote(id, data) { return this.request(`/dialectics/${id}`, 'PATCH', data).then(ApiContracts.noteResponse); }
    static updateNoteStatus(id, status, revision) { return this.updateNote(id, {status, revision}); }
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
    static restoreVersion(noteId, versionId, revision) { return this.request(`/dialectics/${noteId}/versions/${versionId}/restore`, 'POST', {revision}); }
    static pinVersion(noteId, versionId, pin = true) { return this.request(`/dialectics/${noteId}/versions/${versionId}/${pin ? 'pin' : 'unpin'}`, 'POST'); }
    static deleteVersion(noteId, versionId) { return this.request(`/dialectics/${noteId}/versions/${versionId}`, 'DELETE'); }
    // AI
    static routeConspectus(payload, signal) {
        return this.request('/ai/dialectics/conspectus/route', 'POST', payload, signal).then(ApiContracts.generationResponse);
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
