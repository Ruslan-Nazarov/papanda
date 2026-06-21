/**
 * StickerRenderer.js - Stateless UI generation for stickers
 */

export class StickerRenderer {
    /**
     * Format sticker content (handles text, math, checklists)
     */
    static formatStickerContent(s) {
        if (!s.text) return '';

        let text = s.text;
        const trimmedText = text.trim();
        
        // Check if it's a list sticker
        if (s.type === 'list' || (trimmedText.startsWith('{') && trimmedText.includes('"items"'))) {
            try {
                const data = JSON.parse(trimmedText);
                if (data && data.items && Array.isArray(data.items)) {
                    let html = '<ul class="sticker-list">';
                    // Limit to 2 items to guarantee the 'more' button appears for anything extra
                    const items = (s.isWidget) ? data.items.slice(0, 2) : data.items;
                    
                    items.forEach((item, index) => {
                        // Double-failsafe: never render more than 2 in widget mode
                        if (s.isWidget && index >= 2) return;

                        const isDone = item.done === true || item.done === 'true';
                        let originalText = item.text || '';
                        let itemText = this.renderStickerMath(originalText);
                        let safeTitle = originalText.replace(/"/g, '&quot;');
                        
                        html += `
                            <li class="sticker-list-item ${isDone ? 'done' : ''}" data-index="${index}" title="${safeTitle}">
                                <span class="sticker-check-icon">${isDone ? '✓' : ''}</span>
                                <span class="sticker-item-text">${itemText}</span>
                            </li>`;
                    });
                    html += '</ul>';
                    if (s.isWidget && data.items.length > 2) {
                        html += `<button class="sticker-more-capsule">+${data.items.length - 2} more</button>`;
                    }
                    return html;
                }
            } catch (e) {
                console.error("Error parsing sticker JSON:", e);
            }
        }
        
        return `<div class="sticker-text">${this.renderStickerMath(text).replace(/\n/g, '<br>')}</div>`;
    }

    static renderStickerMath(text) {
        if (typeof katex === 'undefined') return text;
        
        const mathRegex = /(\$\$[\s\S]+?\$$|\$[\s\S]+?\$)/g;
        return text.replace(mathRegex, (match) => {
            const isBlock = match.startsWith('$$');
            const latex = match.replace(/\$/g, '');
            try {
                return katex.renderToString(latex, { throwOnError: false, displayMode: isBlock });
            } catch(e) { return match; }
        });
    }

    /**
     * Create a standardized DOM element for a sticker
     */
    static createStickerElement(note, options = {}) {
        const noteDiv = document.createElement('div');
        
        // Hard-default to widget mode for safety
        let isWidget = (options.isWidget !== undefined) ? options.isWidget : true;
        
        // Only auto-disable widget mode if it wasn't explicitly provided
        if (options.isWidget === undefined && document.querySelector('.modal.active')) {
            isWidget = false;
        }
        
        // Add base class and list class if needed
        let classes = ['sticker-thought'];
        if (note.type === 'list') classes.push('sticker-list-note');
        if (options.additionalClasses) classes = classes.concat(options.additionalClasses);
        noteDiv.className = classes.join(' ');
        
        noteDiv.dataset.id = note.id || '';
        noteDiv.dataset.type = note.type || 'text';
        noteDiv.dataset.color = note.color || 'var(--color-sticker-default)';
        noteDiv.dataset.title = note.title || '';
        
        noteDiv.style.backgroundColor = note.color || 'var(--color-sticker-default)';
        noteDiv.style.setProperty('background-color', note.color || 'var(--color-sticker-default)', 'important');
        
        noteDiv.onclick = (e) => {
            if (options.onClick) {
                options.onClick(e, note);
            } else if (typeof window.openStickerModal === 'function') {
                window.openStickerModal({ id: note.id, element: noteDiv });
            }
        };

        let html = '';
        
        // Delete button
        if (options.onDelete) {
            html += `<button class="sticker-del-btn" title="Archive">×</button>`;
        } else {
            html += `<button class="sticker-del-btn" onclick="event.stopPropagation(); archiveStickerGlobal(this, '${note.id}')" title="Archive">×</button>`;
        }

        if (note.title) html += `<div class="sticker-title">${note.title}</div>`;

        html += this.formatStickerContent({ ...note, isWidget: isWidget });

        if (note.created_at || isWidget) {
            const dateObj = note.created_at ? new Date(note.created_at) : new Date();
            const dd = String(dateObj.getDate()).padStart(2, '0');
            const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
            const yy = String(dateObj.getFullYear()).slice(-2);
            html += `<div class="sticker-meta">${dd}.${mm}.${yy}</div>`;
        }

        // Add Linked Note Card
        if (note.note_id && note.note && !options.hideNoteCard) {
            const noteText = note.note.note || '';
            const shortNote = noteText.length > 60 ? noteText.substring(0, 57) + '...' : noteText;
            const escapedNoteText = noteText.replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/\n/g, '\\n');
            html += `
                <div class="sticker-note-card" onclick="event.stopPropagation(); expandNoteOnSticker(${note.note_id}, this, '${escapedNoteText}')">
                    <div class="note-card-icon">📄</div>
                    <div class="note-card-content">
                        <div class="note-card-label">Linked Note</div>
                        <div class="note-card-preview">${shortNote}</div>
                    </div>
                </div>
            `;
        }

        noteDiv.innerHTML = html;
        
        if (options.onDelete) {
            const delBtn = noteDiv.querySelector('.sticker-del-btn');
            if (delBtn) delBtn.onclick = (e) => {
                e.stopPropagation();
                options.onDelete(e, note);
            };
        }

        return noteDiv;
    }
}
