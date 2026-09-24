const {test} = require('node:test');
const assert = require('node:assert/strict');
const {context, load} = require('./helpers.cjs');

test('manual default, temporary onboarding mode and explicit preference', () => {
    const saved = new Map([['dialectics_mode', 'ai']]);
    const ctx = context({localStorage: {
        getItem: key => saved.get(key), setItem: (key, value) => saved.set(key, value),
    }, BlockDOMRenderer: {renderAll() {}}});
    load(ctx, 'AppState');
    load(ctx, 'ModeManager');
    ctx.ModeManager.init();
    assert.equal(ctx.AppState.mode, 'manual');
    assert.equal(ctx.AppState.isAutoFillEnabled, false);
    ctx.ModeManager.setMode('ai', false);
    assert.equal(saved.has('dialectics_mode_v2'), false);
    ctx.ModeManager.setMode('manual', false);
    ctx.ModeManager.setMode('ai');
    ctx.ModeManager.init();
    assert.equal(ctx.AppState.mode, 'ai');
});
