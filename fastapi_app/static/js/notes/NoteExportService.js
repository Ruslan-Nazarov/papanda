import AppState from './AppState.js';
import DialogService from './DialogService.js';
import NoteText from './NoteText.js';
import SaveCoordinator from './SaveCoordinator.js';

import { t } from '../i18n.js';
class NoteExportService {
    static exportToMarkdown() {
        this._exportMarkdown(false);
    }

    static exportFullMarkdown() {
        this._exportMarkdown(true);
    }

    static _exportMarkdown(full) {
        SaveCoordinator._sync(AppState.currentNote);
        const note = AppState.currentNote;
        if (!note || (!note.title?.trim() && !note.blocks?.length && !note.stickers?.length && !note.note_notice && !note.dictionary?.length)) {
            DialogService.alert(t('export_word'), t('note_empty'));
            return;
        }
        const md = full ? this.buildSnapshotMarkdown(note) : this.buildMarkdown(note);
        const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `${note.title || 'Note'}${full ? '-full' : ''}.md`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    /** Just the text of the note, in block order. */
    static buildMarkdown(note) {
        const lines = [`# ${note.title || ''}`, ''];
        if (note.note_notice) lines.push(`> ${note.note_notice.trim().replace(/\n/g, '\n> ')}`, '');
        for (const block of note.blocks || []) {
            if (block.role === 'section') {
                lines.push('---', `## ${block.title || ''}`, '');
                continue;
            }
            if (block.title) lines.push(`### ${block.title}`, '');
            const body = this._htmlToMarkdown(block.html);
            if (body) lines.push(body, '');
        }
        return lines.join('\n');
    }

    /** Readable Markdown followed by the complete editor state for archival. */
    static buildSnapshotMarkdown(note) {
        const snapshot = JSON.parse(JSON.stringify(note));
        const lines = [`# ${snapshot.title || ''}`, ''];
        if (snapshot.note_notice) lines.push(`> ${snapshot.note_notice.trim().replace(/\n/g, '\n> ')}`, '');
        for (const block of snapshot.blocks || []) {
            if (block.role === 'section') {
                lines.push('---', `## ${block.title || ''}`, '');
                continue;
            }
            if (block.title) lines.push(`### ${block.title}`, '');
            const body = this._htmlToMarkdown(block.html);
            if (body) lines.push(body, '');

            const template = document.createElement('template');
            template.innerHTML = block.html || '';
            const questions = [...template.content.querySelectorAll('.question-mark-text[data-question]')]
                .map(mark => mark.getAttribute('data-question')?.trim()).filter(Boolean);
            if (questions.length) lines.push(`**${t('questions_title')}**`, ...[...new Set(questions)].map(q => `- ${q}`), '');
            for (const sticker of block.stickers || []) {
                lines.push(`> 🟨 ${sticker.title || t('tab_notes')}: ${sticker.text || ''}`, '');
            }
        }
        for (const sticker of snapshot.stickers || []) {
            lines.push(`### 🟨 ${sticker.title || t('tab_notes')}`, '', sticker.text || '', '');
        }

        // A fence longer than any backtick run in user data keeps the JSON intact.
        const json = JSON.stringify({format: 'conspect-snapshot', version: 1, note: snapshot}, null, 2);
        let fenceLength = 3;
        for (const match of json.matchAll(/`+/g)) fenceLength = Math.max(fenceLength, match[0].length + 1);
        const fence = '`'.repeat(fenceLength);
        lines.push('---', `## ${t('snapshot_data_title')}`, '', t('snapshot_data_description'), '', `${fence}json`, json, fence, '');
        return lines.join('\n');
    }

    static exportToPDF() {
        // Quick simple print approach for PDF
        // In a real app we might use jsPDF
        window.print();
    }

    /** HTML одного блока → читаемый плоский текст (без разметки). */
    static _htmlToText(html) {
        const template = document.createElement('template');
        template.innerHTML = html || '';
        template.content.querySelectorAll('li').forEach(item => item.prepend('• '));
        return NoteText.fromHtml(template.innerHTML);
    }

    /** Preserve editable rich blocks when producing the readable Markdown export. */
    static _htmlToMarkdown(html) {
        const template = document.createElement('template');
        template.innerHTML = html || '';
        const inline = node => {
            if (node.nodeType === 3) return node.nodeValue || '';
            if (node.nodeType !== 1) return '';
            const tag = node.tagName.toLowerCase();
            if (tag === 'br') return '<br>';
            if (node.matches('.math-inline[formula]')) return '$' + node.getAttribute('formula') + '$';
            const body = [...node.childNodes].map(inline).join('');
            if (node.matches('span[data-type="hidden-phrase"], .hidden-phrase-mark')) {
                const hint = (node.getAttribute('data-hint') || '').trim();
                return hint ? body + ' (' + hint + ')' : body;
            }
            if (tag === 'strong' || tag === 'b') return '**' + body + '**';
            if (tag === 'em' || tag === 'i') return '*' + body + '*';
            if (tag === 'code') return '`' + body + '`';
            if (tag === 'a' && node.getAttribute('href')) return '[' + body + '](' + node.getAttribute('href') + ')';
            return body;
        };
        const content = node => [...node.childNodes].map(inline).join('').trim();
        const blocks = node => [...node.children].map(block).filter(Boolean).join('\n\n');
        const block = node => {
            const tag = node.tagName.toLowerCase();
            if (node.matches('.math-callout')) {
                const formula = node.querySelector('.math-inline[formula]');
                if (formula && node.textContent.trim() === formula.textContent.trim()) {
                    return '$$\n' + formula.getAttribute('formula') + '\n$$';
                }
                return blocks(node);
            }
            if (tag === 'table') {
                const rows = [...node.querySelectorAll('tr')].map(tr =>
                    [...tr.children].filter(cell => /^(TH|TD)$/.test(cell.tagName))
                        .map(cell => content(cell).replace(/\|/g, '\\|').replace(/\n/g, '<br>')));
                if (!rows.length) return '';
                const width = Math.max(...rows.map(row => row.length));
                const line = row => '| ' + Array.from({length: width}, (_, i) => row[i] || '').join(' | ') + ' |';
                return [line(rows[0]), line(Array(width).fill('---')), ...rows.slice(1).map(line)].join('\n');
            }
            if (tag === 'ul' || tag === 'ol') {
                return [...node.children].filter(child => child.tagName === 'LI')
                    .map((li, index) => (tag === 'ol' ? (index + 1) + '. ' : '- ') + content(li)).join('\n');
            }
            if (tag === 'pre') return '```\n' + node.textContent.replace(/\n$/, '') + '\n```';
            if (/^h[1-6]$/.test(tag)) return '#'.repeat(Number(tag[1])) + ' ' + content(node);
            if (tag === 'p' || tag === 'li') return content(node);
            if (tag === 'blockquote') return blocks(node).split('\n').map(line => '> ' + line).join('\n');
            return blocks(node) || content(node);
        };
        return blocks(template.content).trim();
    }

    /**
     * Связный текст всего конспекта: заголовок, затем абзацы блоков по
     * порядку без заголовков-ролей; блок «Теперь вы поняли» — в конце.
     * withTitles=true — оставить заголовки блоков (как в MD-экспорте).
     */
    static buildPlainText({ withTitles = false } = {}) {
        const note = AppState.currentNote;
        if (!note || (!note.blocks?.length && !note.stickers?.length && !note.note_notice)) return '';

        const blocks = [...(note.blocks || [])];
        const ai = blocks.findIndex(b => b.role === 'anchor');
        if (ai >= 0) blocks.push(blocks.splice(ai, 1)[0]);   // «понято» — в конец

        const parts = [];
        if (note.title) parts.push(note.title.trim());
        if (note.note_notice) parts.push(note.note_notice.trim());

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
        for (const sticker of note.stickers || []) parts.push([sticker.title, sticker.text].filter(Boolean).join('\n'));
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
