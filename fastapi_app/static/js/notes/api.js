class NotesAPI {
    static async request(endpoint, method = 'GET', body = null) {
        const options = {
            method,
            headers: { 'Content-Type': 'application/json' },
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
    static getOpposites(processA) { return this.request('/ai/dialectics/opposites', 'POST', { process_a: processA }); }
    static getHint(stepId, currentContent, noteTitle, locale, mode = 'hint') { 
        return this.request('/ai/dialectics/hint-step', 'POST', { step_id: stepId, current_content: currentContent || '', note_title: noteTitle || '', mode: mode }); 
    }
    static explainBlock(blockHtml, noteTitle, mode) { 
        return this.request('/ai/dialectics/explain-concept', 'POST', { text: blockHtml, context_before: noteTitle || '', context_after: '', history: [] }); 
    }
    static autofillConspect(anchorText, noteTitle) {
        return this.request('/ai/dialectics/autofill-conspect', 'POST', { anchor_text: anchorText, note_title: noteTitle || '' });
    }
    static generateNextStep(contextText, targetStep) {
        return this.request('/ai/dialectics/generate-next-step', 'POST', { context_text: contextText, target_step: targetStep });
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
