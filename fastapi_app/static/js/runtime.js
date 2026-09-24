import DOMPurify from 'dompurify';
import { marked } from 'marked';
import katex from 'katex';
import renderMathInElement from 'katex/contrib/auto-render';
import './consent.js';
import './quiet-console.js';

Object.assign(window, {DOMPurify, marked, katex, renderMathInElement});

if (!document.cookie.includes('locale=')) {
    const language = (navigator.language || 'ru').toLowerCase();
    const locale = language.startsWith('ru') ? 'ru' : /^(kk|kz)/.test(language) ? 'kz' : 'en';
    document.cookie = `locale=${locale}; path=/; max-age=31536000; SameSite=Lax`;
    if (document.documentElement.lang !== locale) window.location.reload();
}

if (document.body.dataset.page === 'shared') {
    renderMathInElement(document.body, {delimiters: [
        {left: '$$', right: '$$', display: true}, {left: '$', right: '$', display: false},
    ], throwOnError: false});
}
