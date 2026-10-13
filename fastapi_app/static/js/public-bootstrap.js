// Runs before the public article is parsed, so the editor's loading state is the first paint.
document.documentElement.classList.add('public-js');

// If the editor bundle never starts, leave the published article readable.
window.setTimeout(() => {
    if (document.body?.classList.contains('public-loading')) {
        document.documentElement.classList.remove('public-js');
    }
}, 15000);
