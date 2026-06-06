/**
 * Database API Helper
 * Centralizes Fetch API calls for CRUD operations.
 */

export async function deleteRecordApi(modelName, recordId, deleteMode = 'only', eventDate = null) {
    let url, options;
    if (modelName === 'Event') {
        const formData = new FormData();
        formData.append('delete_mode', deleteMode);
        if (eventDate) formData.append('event_date', eventDate);
        url = `/delete_event/${recordId}`;
        options = { 
            method: 'POST', 
            body: formData,
            headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }
        };
    } else {
        url = `/delete_record/${modelName}/${recordId}`;
        options = { 
            method: 'POST',
            headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }
        };
    }

    const resp = await fetch(url, options);
    if (!resp.ok) {
        const errorText = await resp.text();
        throw new Error(`Error: ${resp.status}. ${errorText.substring(0, 100)}`);
    }
    return resp;
}

export async function fetchWithJson(url, payload) {
    const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    return resp;
}
