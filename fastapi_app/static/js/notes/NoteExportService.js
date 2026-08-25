import AppState from './AppState.js';
import DialogService from './DialogService.js';

class NoteExportService {
    static exportToMarkdown() {
        const note = AppState.currentNote;
        if (!note || !note.blocks || note.blocks.length === 0) {
            DialogService.alert('Экспорт', 'Конспект пуст.');
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
}

export default NoteExportService;
