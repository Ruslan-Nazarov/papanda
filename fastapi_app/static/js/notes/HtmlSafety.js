class HtmlSafety {
    static escape(value) {
        return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    static rich(value) {
        if (typeof DOMPurify === 'undefined') return this.escape(value);
        return DOMPurify.sanitize(String(value ?? ''), {
            ADD_ATTR: ['formula', 'author'],
            // Retain the editor's internal note links, without enabling arbitrary schemes.
            ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|internal):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
        });
    }

    static link(value) {
        const url = String(value ?? '').trim();
        return /^(?:https?:\/\/|mailto:|internal:\/\/note\/)/i.test(url)
            && !/[\u0000-\u001f\u007f]/.test(url) ? url : '';
    }
}

export default HtmlSafety;
