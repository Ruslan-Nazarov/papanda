/**
 * NoteExportService.js - Экспорт конспекта в Markdown/PDF и управление статусом готовности конспекта
 */
import { DialecticsAPI } from '../api.js';
import { BlockManager } from '../BlockManager.js';

export const NoteExportService = {
    updateStatusButtonDisplay(ctx, status = 'none') {
        if (ctx.state) ctx.state.currentNoteStatus = status;
        const btn = document.getElementById('currentNoteStatusBtn');
        if (!btn) return;
        btn.className = `note-status-circle status-${status}`;
        let tooltip = 'Статус: Не указано (нажмите для смены)';
        if (status === 'in_progress') tooltip = 'В работе';
        else if (status === 'ready') tooltip = 'Готовый конспект';
        btn.title = tooltip;
    },

    async toggleCurrentNoteStatus(ctx, e) {
        if (e) e.stopPropagation();
        const current = (ctx.state && ctx.state.currentNoteStatus) || 'none';
        let next = 'none';
        if (current === 'none') next = 'in_progress';
        else if (current === 'in_progress') next = 'ready';
        else if (current === 'ready') next = 'none';
        
        ctx.updateStatusButtonDisplay(next);
        if (ctx.state && ctx.state.currentNoteId) {
            await DialecticsAPI.updateStatus(ctx.state.currentNoteId, next);
            if (window.showToast) {
                let msg = 'Статус изменён: Не указано';
                if (next === 'in_progress') msg = 'Статус изменён: В работе';
                if (next === 'ready') msg = 'Статус изменён: Готовый конспект';
                window.showToast(msg, 'success');
            }
        } else {
            if (window.showToast) {
                let msg = 'Статус установлен: Не указано (сохранится с конспектом)';
                if (next === 'in_progress') msg = 'Статус установлен: В работе (сохранится с конспектом)';
                if (next === 'ready') msg = 'Статус установлен: Готовый конспект (сохранится с конспектом)';
                window.showToast(msg, 'info');
            }
        }
    },

    exportMarkdown(ctx) {
        const title = ctx.dom.title?.value || (window._ ? window._('dialectics.topic_placeholder') : "Конспект");
        const blocks = BlockManager.getBlocks(ctx.dom.canvas);
        if (!blocks || blocks.length === 0) {
            window.showToast(window._ ? window._('toast.no_blocks_to_export') || "Нет блоков для экспорта!" : "Нет блоков для экспорта!", "warning");
            return;
        }

        const htmlToMd = (html) => {
            if (!html) return '';
            const temp = document.createElement('div');
            temp.innerHTML = html;
            
            for (let i = 1; i <= 6; i++) {
                temp.querySelectorAll(`h${i}`).forEach(el => {
                    el.outerHTML = `\n${'#'.repeat(i)} ${el.innerText.trim()}\n\n`;
                });
            }
            temp.querySelectorAll('strong, b').forEach(el => {
                el.outerHTML = `**${el.innerText.trim()}**`;
            });
            temp.querySelectorAll('em, i').forEach(el => {
                el.outerHTML = `*${el.innerText.trim()}*`;
            });
            temp.querySelectorAll('code').forEach(el => {
                el.outerHTML = `\`${el.innerText.trim()}\``;
            });
            temp.querySelectorAll('a').forEach(el => {
                el.outerHTML = `[${el.innerText.trim()}](${el.getAttribute('href') || ''})`;
            });
            temp.querySelectorAll('img').forEach(el => {
                const alt = el.getAttribute('alt') || 'image';
                const src = el.getAttribute('src') || '';
                el.outerHTML = `\n![${alt}](${src})\n`;
            });
            temp.querySelectorAll('ul').forEach(ul => {
                let listMd = '\n';
                ul.querySelectorAll('li').forEach(li => {
                    listMd += `- ${li.innerText.trim()}\n`;
                });
                ul.outerHTML = listMd + '\n';
            });
            temp.querySelectorAll('ol').forEach(ol => {
                let listMd = '\n';
                ol.querySelectorAll('li').forEach((li, idx) => {
                    listMd += `${idx + 1}. ${li.innerText.trim()}\n`;
                });
                ol.outerHTML = listMd + '\n';
            });
            temp.querySelectorAll('p').forEach(el => {
                el.outerHTML = `${el.innerText.trim()}\n\n`;
            });
            temp.querySelectorAll('br').forEach(el => {
                el.outerHTML = '\n';
            });
            
            return temp.innerText.replace(/\n{3,}/g, '\n\n').trim();
        };

        let md = `# ${title}\n\n`;
        const categorySelect = ctx.dom.categorySelect || document.getElementById('dialecticsCategorySelect');
        if (categorySelect && categorySelect.selectedIndex > 0 && categorySelect.value !== "") {
            md += `**Категория:** ${categorySelect.options[categorySelect.selectedIndex].text}\n\n`;
        }
        md += `---\n\n`;

        blocks.forEach(block => {
            if (block.isSection || block.side === 'section') {
                md += `## ${block.title || 'Раздел'}\n\n`;
            } else {
                let sideLabel = '';
                if (block.side === 'left') sideLabel = '🔴 ТЕЗИС / ВОПРОС';
                else if (block.side === 'right') sideLabel = '🔵 АНТИТЕЗИС / ОТВЕТ';
                else if (block.side === 'center') sideLabel = '🟣 СИНТЕЗ / ВЫВОД';
                
                if (block.title) {
                    md += `### ${block.title}\n`;
                }
                if (sideLabel) {
                    md += `*${sideLabel}*\n\n`;
                }
                const contentMd = htmlToMd(block.html);
                if (contentMd) {
                    md += `${contentMd}\n\n`;
                }
                if (block.sources && block.sources.length > 0) {
                    md += `**Источники:**\n`;
                    block.sources.forEach(src => {
                        if (src.title || src.url) {
                            md += `- [${src.title || src.url}](${src.url || '#'}) ${src.quote ? `"${src.quote}"` : ''}\n`;
                        }
                    });
                    md += `\n`;
                }
                md += `---\n\n`;
            }
        });

        const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const safeTitle = (title || 'dialectics_note').replace(/[^a-zA-Z0-9а-яА-Яw\-_ ]/g, '_');
        a.download = `${safeTitle}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        window.showToast(window._ ? window._('toast.export_md_success') || "Конспект экспортирован в Markdown!" : "Конспект экспортирован в Markdown!", "success");
    },

    exportPDF(ctx) {
        const title = ctx.dom.title?.value || (window._ ? window._('dialectics.topic_placeholder') : "Конспект");
        const blocks = BlockManager.getBlocks(ctx.dom.canvas);
        if (!blocks || blocks.length === 0) {
            window.showToast(window._ ? window._('toast.no_blocks_to_export') || "Нет блоков для экспорта!" : "Нет блоков для экспорта!", "warning");
            return;
        }

        const categorySelect = ctx.dom.categorySelect || document.getElementById('dialecticsCategorySelect');
        let categoryText = '';
        if (categorySelect && categorySelect.selectedIndex > 0 && categorySelect.value !== "") {
            categoryText = categorySelect.options[categorySelect.selectedIndex].text;
        }

        let htmlContent = '';
        blocks.forEach(block => {
            if (block.isSection || block.side === 'section') {
                htmlContent += `<div class="section-title">${block.title || 'Раздел'}</div>`;
            } else {
                let sideClass = 'block-left';
                let roleClass = 'role-left';
                let roleText = 'Тезис / Вопрос';
                if (block.side === 'right') {
                    sideClass = 'block-right';
                    roleClass = 'role-right';
                    roleText = 'Антитезис / Ответ';
                } else if (block.side === 'center') {
                    sideClass = 'block-center';
                    roleClass = 'role-center';
                    roleText = 'Синтез / Вывод';
                }

                htmlContent += `<div class="block-card ${sideClass}">`;
                htmlContent += `<div class="block-role ${roleClass}">${block.role || roleText}</div>`;
                if (block.title) {
                    htmlContent += `<div class="block-title">${block.title}</div>`;
                }
                htmlContent += `<div class="block-content">${block.html || ''}</div>`;
                if (block.sources && block.sources.length > 0) {
                    htmlContent += `<div class="block-sources"><strong>Источники:</strong><ul>`;
                    block.sources.forEach(src => {
                        if (src.title || src.url) {
                            htmlContent += `<li><a href="${src.url || '#'}" target="_blank">${src.title || src.url}</a> ${src.quote ? `— "${src.quote}"` : ''}</li>`;
                        }
                    });
                    htmlContent += `</ul></div>`;
                }
                htmlContent += `</div>`;
            }
        });

        const printWin = window.open('', '_blank');
        if (!printWin) {
            window.showToast("Пожалуйста, разрешите всплывающие окна для экспорта в PDF", "error");
            return;
        }

        const fullHtml = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${title}</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
    <style>
        @page {
            margin: 20mm;
            size: A4;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #1e293b;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background: #fff;
        }
        .header {
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 16px;
            margin-bottom: 24px;
        }
        .title {
            font-size: 28px;
            font-weight: 800;
            color: #0f172a;
            margin: 0 0 8px 0;
        }
        .category-badge {
            display: inline-block;
            background: #f1f5f9;
            color: #475569;
            padding: 4px 12px;
            border-radius: 16px;
            font-size: 14px;
            font-weight: 600;
        }
        .section-title {
            font-size: 20px;
            font-weight: 700;
            color: #1e293b;
            margin-top: 32px;
            margin-bottom: 16px;
            padding-bottom: 8px;
            border-bottom: 1px solid #cbd5e1;
            page-break-after: avoid;
            page-break-inside: avoid;
        }
        .block-card {
            margin-bottom: 16px;
            padding: 16px 20px;
            border-radius: 8px;
            page-break-inside: avoid;
            box-sizing: border-box;
        }
        .block-left { border-left: 5px solid #ea580c; background: #fffaf5; }
        .block-right { border-left: 5px solid #2563eb; background: #f8fafc; }
        .block-center { border-left: 5px solid #9333ea; background: #faf5ff; }
        .block-role {
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
        }
        .role-left { color: #ea580c; }
        .role-right { color: #2563eb; }
        .role-center { color: #9333ea; }
        .block-title {
            font-size: 16px;
            font-weight: 700;
            margin: 0 0 8px 0;
            color: #0f172a;
        }
        .block-content { font-size: 14px; }
        .block-content p { margin: 0 0 8px 0; }
        .block-content p:last-child { margin-bottom: 0; }
        .block-content img { max-width: 100%; height: auto; border-radius: 4px; margin: 8px 0; }
        .block-sources {
            margin-top: 12px;
            padding-top: 8px;
            border-top: 1px dashed #cbd5e1;
            font-size: 12px;
            color: #64748b;
        }
        .block-sources ul { margin: 4px 0 0 0; padding-left: 20px; }
    </style>
</head>
<body>
    <div class="header">
        <h1 class="title">${title}</h1>
        ${categoryText ? `<div class="category-badge">${categoryText}</div>` : ''}
    </div>
    <div class="content">
        ${htmlContent}
    </div>
    <script>
        window.onload = function() {
            setTimeout(function() {
                window.print();
            }, 500);
        };
    </script>
</body>
</html>`;

        printWin.document.open();
        printWin.document.write(fullHtml);
        printWin.document.close();
        window.showToast(window._ ? window._('toast.export_pdf_success') || "Открыто окно для печати в PDF!" : "Открыто окно для печати в PDF!", "info");
    }
};
