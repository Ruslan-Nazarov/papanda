import AppState from './AppState.js';
import DialogService from './DialogService.js';

import { t } from '../i18n.js';
class NoteExportService {
    static exportToMarkdown() {
        const note = AppState.currentNote;
        if (!note || !note.blocks || note.blocks.length === 0) {
            DialogService.alert(t('export_word'), t('note_empty'));
            return;
        }

        let md = `# ${note.title}\n\n`;
        note.blocks.forEach(block => {
            if (block.role === 'section') {
                md += `\n---\n## ${block.title}\n---\n\n`;
            } else {
                if (block.title) {
                    md += `### ${block.title}\n`;
                }
                // Strip HTML tags for simple markdown export
                let textContent = block.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
                if (textContent) {
                    md += `${textContent}\n\n`;
                }
            }
        });

        const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `${note.title || 'Note'}.md`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    static exportToPDF() {
        // Quick simple print approach for PDF
        // In a real app we might use jsPDF
        window.print();
    }

    /** HTML одного блока → читаемый плоский текст (без разметки). */
    static _htmlToText(html) {
        return String(html || '')
            .replace(/<(br|hr)\s*\/?>/gi, '\n')
            .replace(/<\/(p|div|h[1-6]|blockquote)>/gi, '\n\n')
            .replace(/<li[^>]*>/gi, '• ')
            .replace(/<\/li>/gi, '\n')
            .replace(/<[^>]+>/g, '')
            .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&')
            .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
            .replace(/&quot;/gi, '"').replace(/&#39;/gi, "'")
            .replace(/[ \t]+/g, ' ')
            .replace(/ *\n */g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }

    /**
     * Связный текст всего объяснения: заголовок, затем абзацы блоков по
     * порядку без заголовков-ролей; блок «Теперь вы поняли» — в конце.
     * withTitles=true — оставить заголовки блоков (как в MD-экспорте).
     */
    static buildPlainText({ withTitles = false } = {}) {
        const note = AppState.currentNote;
        if (!note || !Array.isArray(note.blocks) || note.blocks.length === 0) return '';

        const blocks = [...note.blocks];
        const ai = blocks.findIndex(b => b.role === 'anchor');
        if (ai >= 0) blocks.push(blocks.splice(ai, 1)[0]);   // «понято» — в конец

        const parts = [];
        if (note.title) parts.push(note.title.trim());

        blocks.forEach(block => {
            if (block.role === 'section') {
                if (withTitles && block.title) parts.push(block.title.trim());
                return;
            }
            const text = NoteExportService._htmlToText(block.html);
            if (!text) return;
            if (block.role === 'anchor') {
                parts.push(`${t('anchor_resolved_label')}: ${text}`);
            } else if (withTitles && block.title) {
                parts.push(`${block.title.trim()}\n${text}`);
            } else {
                parts.push(text);
            }
        });
        return parts.join('\n\n').trim();
    }

    static async copyText() {
        const txt = NoteExportService.buildPlainText();
        if (!txt) { DialogService.alert(t('export_word'), t('note_empty')); return; }
        const { showToast } = await import('./ToastService.js');
        try {
            await navigator.clipboard.writeText(txt);
        } catch {
            const ta = document.createElement('textarea');
            ta.value = txt;
            ta.style.position = 'fixed'; ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        }
        showToast(t('toast_text_copied'));
    }

    static exportToTxt() {
        const txt = NoteExportService.buildPlainText();
        if (!txt) { DialogService.alert(t('export_word'), t('note_empty')); return; }
        const name = (AppState.currentNote?.title || 'explanation').trim() || 'explanation';
        const blob = new Blob([txt], { type: 'text/plain;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${name}.txt`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
}

export default NoteExportService;
