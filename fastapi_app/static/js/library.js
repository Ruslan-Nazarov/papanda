document.querySelector('.library-copy')?.addEventListener('click', async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    try {
        const response = await fetch(`/api/library/${button.dataset.publicationId}/copy`, {method: 'POST'});
        if (!response.ok) throw new Error();
        const note = await response.json();
        // Explicit URL survives disabled localStorage and opens exactly this copy.
        window.location.assign(`/?note=${note.id}`);
    } catch {
        document.getElementById('library-copy-status').textContent = button.dataset.error;
        button.disabled = false;
    }
});
