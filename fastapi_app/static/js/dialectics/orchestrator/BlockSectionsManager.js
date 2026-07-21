/**
 * BlockSectionsManager.js - Управление разделами (секциями), оглавлением (TOC) и поиском внутри конспекта
 */
import { BlockManager } from '../BlockManager.js';
import { DialecticsLogger } from '../DialecticsLogger.js';
import { OrchestratorState } from './OrchestratorState.js';

export const BlockSectionsManager = {
    addSectionBlock(engine) {
        this.openSectionTitleModal(engine, -1);
    },

    openSectionTitleModal(engine, index = null, existingBlock = null) {
        const state = OrchestratorState.getState(engine);
        state.pendingSectionIndex = index;
        state.editingSectionBlock = existingBlock;
        const modal = document.getElementById('sectionTitleModal');
        const input = document.getElementById('sectionTitleInputField');
        if (!modal || !input) return;

        if (existingBlock) {
            let title = existingBlock.dataset.title;
            if (!title) {
                const span = existingBlock.querySelector('.dialectics-block-header span:nth-child(2)');
                title = span ? span.innerText : 'Раздел';
            }
            input.value = title || '';
        } else {
            input.value = '';
        }

        modal.style.display = 'flex';
        setTimeout(() => input.focus(), 50);
    },

    closeSectionTitleModal(engine) {
        const modal = document.getElementById('sectionTitleModal');
        if (modal) modal.style.display = 'none';
        const state = OrchestratorState.getState(engine);
        state.pendingSectionIndex = null;
        state.editingSectionBlock = null;
    },

    saveSectionTitle(engine) {
        const input = document.getElementById('sectionTitleInputField');
        if (!input || !engine.dom.canvas) return;

        const title = input.value.trim() || 'Раздел';
        const state = OrchestratorState.getState(engine);

        if (state.editingSectionBlock) {
            const liveBlock = engine.resolveLiveBlock(state.editingSectionBlock) || state.editingSectionBlock;
            liveBlock.dataset.title = title;
            const span = liveBlock.querySelector('.block-title-text');
            if (span) span.innerText = title;
            const inner = liveBlock.querySelector('.dialectics-content-inner');
            if (inner) inner.innerHTML = `<p>${title}</p>`;

            if (engine.saveGlobal) engine.saveGlobal(false, "toast.dialectics_updated");
        } else {
            const blocks = BlockManager.getBlocks(engine.dom.canvas);
            const newSection = {
                id: 'block_' + Math.random().toString(36).substr(2, 9),
                side: 'section',
                isSection: true,
                title: title,
                html: `<p>${title}</p>`
            };

            if (state.pendingSectionIndex !== null && state.pendingSectionIndex !== undefined && state.pendingSectionIndex >= 0) {
                if (state.pendingSectionIndex < blocks.length) {
                    blocks.splice(state.pendingSectionIndex + 1, 0, newSection);
                } else {
                    blocks.push(newSection);
                }
            } else if (state.pendingSectionIndex === -1) {
                blocks.unshift(newSection);
            } else {
                blocks.push(newSection);
            }

            BlockManager.render(engine.dom.canvas, blocks, engine._blockCallbacks());
            if (engine.saveGlobal) engine.saveGlobal(false, "toast.dialectics_updated");
        }

        this.closeSectionTitleModal(engine);
    },

    toggleTableOfContents(engine, e) {
        if (e) e.stopPropagation();
        let menu = document.getElementById('tableOfContentsMenu');
        if (!menu) return;
        if (menu.style.display === 'none' || !menu.style.display) {
            this.updateTableOfContents(engine);
            menu.style.display = 'block';
            const closeHandler = (evt) => {
                if (!menu.contains(evt.target) && evt.target.id !== 'btnToggleTOC') {
                    menu.style.display = 'none';
                    document.removeEventListener('click', closeHandler);
                }
            };
            setTimeout(() => document.addEventListener('click', closeHandler), 10);
        } else {
            menu.style.display = 'none';
        }
    },

    updateTableOfContents(engine) {
        const listEl = document.getElementById('tableOfContentsList');
        if (!listEl || !engine.dom.canvas) return;

        const blocks = Array.from(engine.dom.canvas.querySelectorAll('.dialectics-block'));
        listEl.innerHTML = '';

        if (blocks.length === 0) {
            listEl.innerHTML = '<div style="padding: 12px; color: #94a3b8; font-size: 0.85rem; text-align: center;">В конспекте пока нет блоков и разделов.</div>';
            return;
        }

        blocks.forEach((b, idx) => {
            const isSection = b.classList.contains('block-section') || b.dataset.isSection === 'true';
            let title = b.dataset.title;
            if (!title) {
                const headerSpan = b.querySelector('.dialectics-block-header span:first-child');
                title = headerSpan ? headerSpan.innerText : (isSection ? 'Раздел' : `Блок ${idx + 1}`);
            }

            const item = document.createElement('div');
            item.setAttribute('draggable', 'true');
            item.dataset.index = idx;
            item.style.cssText = `
                display: flex; align-items: center; gap: 8px; padding: 8px 12px; 
                border-radius: 8px; cursor: grab; transition: background 0.15s;
                font-size: ${isSection ? '0.9rem' : '0.8rem'};
                font-weight: ${isSection ? '700' : '500'};
                color: ${isSection ? '#ea580c' : '#334155'};
                background: ${isSection ? '#fff7ed' : 'transparent'};
                border-left: ${isSection ? '4px solid #ea580c' : '2px solid transparent'};
            `;
            item.onmouseover = () => item.style.background = isSection ? '#ffedd5' : '#f8fafc';
            item.onmouseout = () => item.style.background = isSection ? '#fff7ed' : 'transparent';

            const icon = isSection ? '📑' : (b.classList.contains('block-left') ? '▫️' : '▪️');
            item.innerHTML = `<span style="opacity: 0.3; cursor: grab; font-size: 0.8rem;" title="Перетащите для изменения порядка">⋮⋮</span><span>${icon}</span><span style="flex-grow:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${title}</span>`;

            item.onclick = () => {
                if (engine._wasDragging) { engine._wasDragging = false; return; }
                document.getElementById('tableOfContentsMenu').style.display = 'none';
                b.scrollIntoView({ behavior: 'smooth', block: 'center' });
                b.style.transition = 'box-shadow 0.5s ease';
                const origBoxShadow = b.style.boxShadow;
                b.style.boxShadow = '0 0 0 4px #ea580c';
                setTimeout(() => { b.style.boxShadow = origBoxShadow; }, 1500);
            };

            item.addEventListener('dragstart', (e) => {
                e.stopPropagation();
                engine._wasDragging = true;
                engine._draggedTocIndex = idx;
                e.dataTransfer.effectAllowed = 'move';
                item.style.opacity = '0.5';
            });

            item.addEventListener('dragend', (e) => {
                e.stopPropagation();
                item.style.opacity = '1';
                setTimeout(() => { engine._wasDragging = false; }, 100);
                listEl.querySelectorAll('div').forEach(el => {
                    el.style.borderTop = '';
                    el.style.borderBottom = '';
                });
            });

            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = 'move';

                listEl.querySelectorAll('div').forEach(el => {
                    if (el !== item) {
                        el.style.borderTop = '';
                        el.style.borderBottom = '';
                    }
                });

                const bounding = item.getBoundingClientRect();
                const offset = e.clientY - bounding.top;
                const isAfter = offset > bounding.height / 2;
                if (isAfter) {
                    item.style.borderBottom = '2px solid #ea580c';
                    item.style.borderTop = '';
                } else {
                    item.style.borderTop = '2px solid #ea580c';
                    item.style.borderBottom = '';
                }
            });

            item.addEventListener('dragleave', (e) => {
                e.stopPropagation();
                item.style.borderTop = '';
                item.style.borderBottom = '';
            });

            item.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                item.style.borderTop = '';
                item.style.borderBottom = '';
                setTimeout(() => { engine._wasDragging = false; }, 100);

                const fromIdx = engine._draggedTocIndex;
                const toIdx = idx;
                if (fromIdx === undefined || fromIdx === null || fromIdx === toIdx) return;

                const bounding = item.getBoundingClientRect();
                const offset = e.clientY - bounding.top;
                const isAfter = offset > bounding.height / 2;

                const allBlocks = BlockManager.getBlocks(engine.dom.canvas);
                if (!allBlocks || !allBlocks[fromIdx] || !allBlocks[toIdx]) return;

                const isSectionDrag = allBlocks[fromIdx].isSection;
                let count = 1;
                if (isSectionDrag) {
                    for (let i = fromIdx + 1; i < allBlocks.length; i++) {
                        if (allBlocks[i].isSection) break;
                        count++;
                    }
                }

                let insertIdx = toIdx;
                if (isAfter) {
                    if (isSectionDrag && allBlocks[toIdx].isSection) {
                        let j = toIdx + 1;
                        while (j < allBlocks.length && !allBlocks[j].isSection) j++;
                        insertIdx = j;
                    } else {
                        insertIdx = toIdx + 1;
                    }
                }

                const chunk = allBlocks.splice(fromIdx, count);
                if (insertIdx > fromIdx) insertIdx -= count;

                allBlocks.splice(insertIdx, 0, ...chunk);

                BlockManager.render(engine.dom.canvas, allBlocks, engine._blockCallbacks());
                if (engine.saveGlobal) engine.saveGlobal(false, "toast.dialectics_updated");
                this.updateTableOfContents(engine);
            });

            listEl.appendChild(item);
        });
    },

    toggleSearchInNote(engine, e) {
        if (e) e.stopPropagation();
        let menu = document.getElementById('searchInNoteMenu');
        if (!menu) return;
        if (menu.style.display === 'none' || !menu.style.display) {
            const tocMenu = document.getElementById('tableOfContentsMenu');
            if (tocMenu) tocMenu.style.display = 'none';
            const verMenu = document.getElementById('versionsMenu');
            if (verMenu) verMenu.style.display = 'none';

            menu.style.display = 'block';
            const inputEl = document.getElementById('searchInNoteInput');
            if (inputEl) {
                inputEl.value = '';
                inputEl.focus();
            }
            const resultsEl = document.getElementById('searchInNoteResults');
            if (resultsEl) {
                resultsEl.innerHTML = '<div style="text-align: center; color: #64748b; font-size: 0.85rem; padding: 10px 0;">Введите текст для начала поиска</div>';
            }

            const closeHandler = (evt) => {
                if (!menu.contains(evt.target) && evt.target.id !== 'btnToggleSearch') {
                    menu.style.display = 'none';
                    document.removeEventListener('click', closeHandler);
                }
            };
            setTimeout(() => document.addEventListener('click', closeHandler), 10);
        } else {
            menu.style.display = 'none';
        }
    },

    performSearchInNote(engine, query) {
        const resultsEl = document.getElementById('searchInNoteResults');
        if (!resultsEl || !engine.dom.canvas) return;

        query = (query || '').trim().toLowerCase();
        if (!query) {
            resultsEl.innerHTML = '<div style="text-align: center; color: #64748b; font-size: 0.85rem; padding: 10px 0;">Введите текст для начала поиска</div>';
            return;
        }

        const blocks = Array.from(engine.dom.canvas.querySelectorAll('.dialectics-block'));
        resultsEl.innerHTML = '';
        let matchCount = 0;

        blocks.forEach((b, idx) => {
            const isSection = b.classList.contains('block-section') || b.dataset.isSection === 'true';
            let title = b.dataset.title || '';
            if (!title) {
                const titleEl = b.querySelector('.block-title-text');
                title = titleEl ? titleEl.innerText : '';
            }
            if (!title) {
                const headerSpan = b.querySelector('.dialectics-block-header span:first-child');
                title = headerSpan ? headerSpan.innerText : (isSection ? 'Раздел' : `Блок ${idx + 1}`);
            }

            const inner = b.querySelector('.dialectics-content-inner');
            const content = inner ? (inner.innerText || inner.textContent || '') : '';

            const titleMatch = title.toLowerCase().includes(query);
            const contentMatch = content.toLowerCase().includes(query);

            if (titleMatch || contentMatch) {
                matchCount++;
                const item = document.createElement('div');
                item.style.cssText = `
                    display: flex; flex-direction: column; gap: 4px; padding: 8px 12px; 
                    border-radius: 8px; cursor: pointer; transition: background 0.15s;
                    border: 1px solid #e2e8f0; background: #fff; text-align: left;
                `;
                item.onmouseover = () => item.style.background = '#f8fafc';
                item.onmouseout = () => item.style.background = '#fff';

                const icon = isSection ? '📑' : (b.classList.contains('block-left') ? '▫️' : '▪️');
                let snippet = '';
                if (contentMatch) {
                    const index = content.toLowerCase().indexOf(query);
                    const start = Math.max(0, index - 30);
                    const end = Math.min(content.length, index + query.length + 30);
                    snippet = (start > 0 ? '...' : '') + content.substring(start, end) + (end < content.length ? '...' : '');
                    snippet = snippet.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
                    const escapedQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                    snippet = snippet.replace(new RegExp(`(${escapedQuery})`, 'gi'), '<mark style="background: #fef08a; padding: 0 2px; border-radius: 2px;">$1</mark>');
                } else {
                    snippet = content.substring(0, 60) + (content.length > 60 ? '...' : '');
                }

                item.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 6px; font-weight: 700; font-size: 0.85rem; color: ${isSection ? '#ea580c' : '#1e293b'};">
                        <span>${icon}</span>
                        <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${title}</span>
                    </div>
                    ${snippet ? `<div style="font-size: 0.75rem; color: #64748b; line-height: 1.3; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;">${snippet}</div>` : ''}
                `;

                item.onclick = () => {
                    document.getElementById('searchInNoteMenu').style.display = 'none';
                    b.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    b.style.transition = 'box-shadow 0.5s ease';
                    const origBoxShadow = b.style.boxShadow;
                    b.style.boxShadow = '0 0 0 4px #3b82f6';
                    setTimeout(() => { b.style.boxShadow = origBoxShadow; }, 2000);
                };

                resultsEl.appendChild(item);
            }
        });

        if (matchCount === 0) {
            resultsEl.innerHTML = '<div style="text-align: center; color: #94a3b8; font-size: 0.85rem; padding: 20px 0;">Ничего не найдено</div>';
        }
    }
};
