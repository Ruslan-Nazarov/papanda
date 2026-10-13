import { t } from '../i18n.js';
import HtmlSafety from './HtmlSafety.js';

const statuses = new Set(['completed', 'partial', 'failed', 'cancelled', 'not_applicable']);

class AIDiaryView {
    static requestFields(request) {
        try {
            const value = JSON.parse(request);
            return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
        } catch {
            return null;
        }
    }

    static requestPreview(request) {
        const fields = AIDiaryView.requestFields(request);
        if (!fields) return request;
        for (const key of ['text', 'question', 'prompt', 'goal', 'topic', 'message']) {
            if (typeof fields[key] === 'string' && fields[key].trim()) return fields[key];
        }
        return Object.entries(fields).find(([key, value]) => !key.startsWith('context_')
            && typeof value === 'string' && value.trim())?.[1] || t('ai_diary_request');
    }

    static requestFieldLabel(key) {
        const known = {text: 'ai_diary_field_text', context_before: 'ai_diary_context_before',
            context_after: 'ai_diary_context_after', history: 'ai_diary_field_history'};
        return known[key] ? t(known[key]) : key.replaceAll('_', ' ');
    }

    static appendRequest(section, request) {
        const fields = AIDiaryView.requestFields(request);
        if (!fields) {
            const content = document.createElement('pre');
            content.textContent = request;
            section.appendChild(content);
            return;
        }
        const list = document.createElement('div');
        list.className = 'ai-diary-request-fields';
        for (const [key, value] of Object.entries(fields)) {
            if (value == null || value === '' || (Array.isArray(value) && !value.length)) continue;
            const context = ['context_before', 'context_after', 'history'].includes(key);
            const field = document.createElement(context ? 'details' : 'div');
            field.className = `ai-diary-request-field${key === 'text' ? ' is-primary' : ''}`;
            const label = document.createElement(context ? 'summary' : 'span');
            label.className = 'ai-diary-field-label';
            label.textContent = AIDiaryView.requestFieldLabel(key);
            const content = document.createElement('div');
            content.className = 'ai-diary-field-value';
            content.textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
            field.append(label, content);
            list.appendChild(field);
        }
        if (!list.childElementCount) {
            const content = document.createElement('pre');
            content.textContent = request;
            section.appendChild(content);
        } else section.appendChild(list);
    }

    static date(value) {
        if (!value || typeof value !== 'string') return null;
        // Compatibility with responses saved before UTC offsets were explicit.
        const iso = value.replace(' ', 'T');
        const date = new Date(/[zZ]$|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : iso + 'Z');
        return Number.isNaN(date.getTime()) ? null : date;
    }

    static title(data) {
        if (data.step) return `${t('ai_diary_step')} ${data.step}`;
        if (data.operation === 'generate_full') return t('ai_diary_full');
        const operation = data.operation || '';
        if (operation.includes('explain')) return t('ai_diary_explain');
        if (operation.includes('check')) return t('ai_diary_check');
        if (/formula|math/.test(operation)) return t('ai_diary_formula');
        return t('ai_diary_request');
    }

    constructor(title) {
        this.events = [];
        this.expanded = new Set();
        this.locale = {ru: 'ru-RU', en: 'en-US', kz: 'kk-KZ'}[document.documentElement.lang] || 'ru-RU';
        const esc = HtmlSafety.escape;
        this.overlay = document.createElement('div');
        this.overlay.className = 'ai-diary-overlay';
        this.overlay.innerHTML = `<section class="ai-diary-dialog" role="dialog" aria-modal="true" aria-labelledby="ai-diary-title" aria-describedby="ai-diary-note">
            <header class="ai-diary-header"><div class="ai-diary-heading-icon" aria-hidden="true"><i class="ph ph-clock-counter-clockwise"></i></div><div class="ai-diary-heading"><h2 id="ai-diary-title">${t('ai_diary_title')}</h2><p id="ai-diary-note"><span>${t('ai_diary_scope')}</span> <strong>${esc(title || t('untitled'))}</strong></p></div><button type="button" class="ai-diary-close" aria-label="${t('close')}">×</button></header>
            <div class="ai-diary-tools"><label class="ai-diary-search"><i class="ph ph-magnifying-glass" aria-hidden="true"></i><input type="search" placeholder="${t('ai_diary_search')}" aria-label="${t('ai_diary_search')}"></label><select class="ai-diary-filter" aria-label="${t('ai_diary_filter')}"><option value="all">${t('ai_diary_all')}</option><option value="completed">${t('ai_diary_completed')}</option><option value="issues">${t('ai_diary_issues')}</option></select><button type="button" class="ai-diary-refresh" aria-label="${t('ai_diary_refresh')}" title="${t('ai_diary_refresh')}"><i class="ph ph-arrow-clockwise" aria-hidden="true"></i></button></div>
            <div class="ai-diary-info"><span class="ai-diary-count" role="status" aria-live="polite"></span><span class="ai-diary-zone"></span></div>
            <div class="ai-diary-scroll"><div class="ai-diary-entries"></div><div class="ai-diary-message" role="status"><i class="ph ph-notebook" aria-hidden="true"></i><h3></h3><p></p><button type="button" class="ai-diary-retry" hidden>${t('ai_diary_refresh')}</button></div></div>
            <footer class="ai-diary-footer">${t('ai_diary_time_hint')}</footer>
        </section>`;
        this.closeButton = this.overlay.querySelector('.ai-diary-close');
        this.search = this.overlay.querySelector('input');
        this.filter = this.overlay.querySelector('select');
        this.refreshButton = this.overlay.querySelector('.ai-diary-refresh');
        this.retryButton = this.overlay.querySelector('.ai-diary-retry');
        this.entries = this.overlay.querySelector('.ai-diary-entries');
        this.message = this.overlay.querySelector('.ai-diary-message');
        this.count = this.overlay.querySelector('.ai-diary-count');
        const zone = this.overlay.querySelector('.ai-diary-zone');
        const offset = new Intl.DateTimeFormat(this.locale, {timeZoneName: 'shortOffset'})
            .formatToParts(new Date()).find(part => part.type === 'timeZoneName')?.value || '';
        zone.textContent = `${t('ai_diary_local_time')} · ${offset}`;
        zone.title = Intl.DateTimeFormat().resolvedOptions().timeZone;
    }

    showMessage(title, body = '') {
        this.message.hidden = false;
        this.message.querySelector('h3').textContent = title;
        this.message.querySelector('p').textContent = body;
    }

    setLoading() {
        this.refreshButton.disabled = this.search.disabled = this.filter.disabled = true;
        this.retryButton.hidden = true;
        this.entries.replaceChildren();
        this.count.textContent = '';
        this.showMessage(t('ai_diary_loading'));
    }

    setError() {
        this.refreshButton.disabled = false;
        this.retryButton.hidden = false;
        this.showMessage(t('ai_diary_load_failed'), t('ai_diary_retry_hint'));
    }

    setEvents(events) {
        this.events = events.map(event => ({...event, data: event.data || {},
            date: AIDiaryView.date(event.data?.started_at) || AIDiaryView.date(event.created_at)}))
            .sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0) || b.id - a.id);
        if (this.events.length && !this.expanded.size) this.expanded.add(this.events[0].id);
        this.refreshButton.disabled = this.search.disabled = this.filter.disabled = false;
        this.render();
    }

    render() {
        const query = this.search.value.trim().toLocaleLowerCase(this.locale);
        const events = this.events.filter(event => {
            const data = event.data;
            const status = this.filter.value;
            return (status === 'all' || (status === 'completed' ? data.status === 'completed'
                : ['failed', 'partial', 'cancelled', 'not_applicable'].includes(data.status)))
                && [AIDiaryView.title(data), data.request, data.question, data.text, data.answer]
                    .filter(Boolean).join('\n').toLocaleLowerCase(this.locale).includes(query);
        });
        this.count.textContent = `${t('ai_diary_shown')} ${events.length} / ${this.events.length}`;
        this.entries.replaceChildren();
        this.message.hidden = Boolean(events.length);
        this.retryButton.hidden = true;
        if (!events.length) this.showMessage(t(this.events.length ? 'ai_diary_no_results' : 'ai_diary_empty'),
            t(this.events.length ? 'ai_diary_search_hint' : 'ai_diary_empty_hint'));
        let lastDay = '';
        for (const event of events) {
            const day = event.date?.toLocaleDateString(this.locale, {day: 'numeric', month: 'long', year: 'numeric'}) || t('ai_diary_unknown_time');
            if (day !== lastDay) {
                const heading = document.createElement('h3');
                heading.className = 'ai-diary-day';
                heading.textContent = day;
                this.entries.appendChild(heading);
                lastDay = day;
            }
            this.entries.appendChild(this.entry(event));
        }
    }

    entry(event) {
        const esc = HtmlSafety.escape, data = event.data;
        const article = document.createElement('article');
        article.className = 'ai-diary-entry';
        const status = statuses.has(data.status) ? data.status : 'saved';
        const request = [data.request, data.question].filter(Boolean).join('\n\n');
        const answer = data.answer || data.text || '';
        const preview = (AIDiaryView.requestPreview(request) || answer || t('ai_diary_no_text')).replace(/\s+/g, ' ').trim();
        const clock = event.date?.toLocaleTimeString(this.locale, {hour: '2-digit', minute: '2-digit', hour12: false}) || '—';
        const fullTime = event.date?.toLocaleString(this.locale, {dateStyle: 'long', timeStyle: 'long'}) || '';
        const timing = t(data.started_at ? 'ai_diary_started' : 'ai_diary_recorded');
        const duration = typeof data.duration_ms === 'number' && data.duration_ms >= 0
            ? ` · ${new Intl.NumberFormat(this.locale, {maximumFractionDigits: 1}).format(data.duration_ms / 1000)} ${t('ai_diary_seconds')}` : '';
        article.innerHTML = `<details class="ai-diary-detail"><summary><span class="ai-diary-entry-icon" aria-hidden="true"><i class="ph ph-sparkle"></i></span><span class="ai-diary-entry-summary"><span class="ai-diary-entry-top"><strong>${esc(AIDiaryView.title(data))}</strong><span class="ai-diary-status ${status}">${t('ai_diary_' + status)}</span></span><span class="ai-diary-preview">${esc(preview)}</span><span class="ai-diary-entry-time">${timing} <time title="${esc(fullTime)}">${clock}</time>${duration}</span></span><i class="ph ph-caret-down ai-diary-chevron" aria-hidden="true"></i></summary><div class="ai-diary-entry-body"></div></details>`;
        if (event.date) article.querySelector('time').dateTime = event.date.toISOString();
        const detail = article.querySelector('details');
        detail.open = this.expanded.has(event.id);
        detail.addEventListener('toggle', () => {
            if (detail.open) this.expanded.add(event.id);
            else this.expanded.delete(event.id);
        });
        const body = article.querySelector('.ai-diary-entry-body');
        for (const [label, text] of [[t('ai_diary_request'), request], [t('ai_diary_answer'), answer]]) {
            if (!text) continue;
            const section = document.createElement('section');
            const heading = document.createElement('h4');
            heading.textContent = label;
            section.appendChild(heading);
            if (label === t('ai_diary_request')) AIDiaryView.appendRequest(section, text);
            else {
                const content = document.createElement('pre');
                content.textContent = String(text).replace(/^step([1-5](?:\.\d+)?):\s*/gm, `${t('ai_diary_step')} $1 — `);
                section.appendChild(content);
            }
            body.appendChild(section);
        }
        if (!request && !answer) body.textContent = t('ai_diary_no_text');
        return article;
    }
}

export default AIDiaryView;
