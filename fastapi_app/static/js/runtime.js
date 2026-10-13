import DOMPurify from 'dompurify';
import { marked } from 'marked';
import katex from 'katex';
import renderMathInElement from 'katex/contrib/auto-render';
import BlockMathRenderer from './notes/BlockMathRenderer.js';
import BlockCodeRenderer from './notes/BlockCodeRenderer.js';
import './consent.js';
import './quiet-console.js';

Object.assign(window, {DOMPurify, marked, katex, renderMathInElement});

const explicitLanguage = new URLSearchParams(window.location.search).get('lang');
if (['ru', 'en', 'kz'].includes(explicitLanguage)) {
    document.cookie = `locale=${explicitLanguage}; path=/; max-age=31536000; SameSite=Lax`;
} else if (!document.cookie.includes('locale=')) {
    const language = (navigator.language || 'ru').toLowerCase();
    const locale = language.startsWith('ru') ? 'ru' : /^(kk|kz)/.test(language) ? 'kz' : 'en';
    document.cookie = `locale=${locale}; path=/; max-age=31536000; SameSite=Lax`;
    if (document.documentElement.lang !== locale) window.location.reload();
}

if (document.body.dataset.page === 'shared') {
    document.querySelectorAll('.blk-body').forEach(el => {
        BlockCodeRenderer.render(el);
        BlockMathRenderer.renderMath(el);
    });
}
