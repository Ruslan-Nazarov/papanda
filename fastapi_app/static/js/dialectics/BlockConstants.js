/**
 * BlockConstants.js - Цветовые пресеты и подсказки/шаги для блоков Диалектики
 */
window.DIALECTICS_HINTS = null;
fetch('/api/ai/dialectics/hints')
    .then(r => r.json())
    .then(data => { window.DIALECTICS_HINTS = data; })
    .catch(e => console.warn('Failed to load dialectics hints:', e));

export const COLOR_PRESETS = {
    blue: {
        bg: 'linear-gradient(135deg, #ffffff 0%, #eff6ff 100%)',
        accent: '#3b82f6'
    },
    green: {
        bg: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)',
        accent: '#10b981'
    },
    red: {
        bg: 'linear-gradient(135deg, #ffffff 0%, #fff1f2 100%)',
        accent: '#ef4444'
    },
    yellow: {
        bg: 'linear-gradient(135deg, #ffffff 0%, #fffbeb 100%)',
        accent: '#f59e0b'
    },
    purple: {
        bg: 'linear-gradient(135deg, #ffffff 0%, #faf5ff 100%)',
        accent: '#8b5cf6'
    }
};

export function getHint(key, defaultVal) {
    if (typeof window._ === 'function') {
        const trans = window._(key);
        if (trans && trans !== key) return trans;
    }
    const shortKey = key.replace('dialectics.hints.', '');
    if (window.DIALECTICS_HINTS && window.DIALECTICS_HINTS[shortKey]) {
        return window.DIALECTICS_HINTS[shortKey];
    }
    return defaultVal;
}

export const STEPS_CONFIG = [
    {
        id: 'step1',
        side: 'left',
        textKey: 'dialectics.hints.step1',
        titleKey: 'dialectics.hints.step1_title',
        defaultText: '<div style="font-size:1.02em; font-weight:500; color:#1e293b; margin-bottom:8px;">Опишите простейший процесс, который, по вашему мнению, лежит в основе проблемы, которую вы хотите понять.</div><div style="font-size:0.85em; color:#64748b; font-weight:400; line-height:1.35;">Примером простейшего процесса может быть суммирование. Если вы затрудняетесь, то нажмите кнопку Помощь ИИ. Помните, что ИИ не способен к пониманию, но может предоставить вам знания.</div>',
        defaultTitle: 'Простейший процесс'
    },
    {
        id: 'step2',
        side: 'right',
        textKey: 'dialectics.hints.step2',
        titleKey: 'dialectics.hints.step2_title',
        defaultText: '<div style="font-size:1.02em; font-weight:500; color:#1e293b; margin-bottom:8px;">Опишите, как развивается этот простейший процесс.</div><div style="font-size:0.85em; color:#64748b; font-weight:400; line-height:1.35;">Развитие – это взаимодействие процесса с другими процессами в мире. Например, если простейшим является суммирование, то его развитием будет суммирование пяти, десяти и т.п. единиц, использование суммирования в торговле, праве, науке. Если вы сомневаетесь или не знаете, то можете нажать кнопку Помощь ИИ. Однако помните, что ИИ не может заменить человека в понимании процессов, ИИ может только предоставить знания.</div>',
        defaultTitle: 'Опишите как развивается этот простейший процесс'
    },
    {
        id: 'step3',
        side: 'left',
        textKey: 'dialectics.hints.step3',
        titleKey: 'dialectics.hints.step3_title',
        defaultText: '<div style="font-size:1.02em; font-weight:500; color:#1e293b; margin-bottom:8px;">Вы уже нашли простейший процесс, посмотрели, как он развивается. В этом развитии вы должны отыскать противоположный процесс.</div><div style="font-size:0.85em; color:#64748b; font-weight:400; line-height:1.35;">Вы можете сделать это через специальный ИИ под кнопкой ✨. А можете сделать это самостоятельно. Противоположным является такой процесс, который сам остается самостоятельным, но полностью исключает другой.</div>',
        defaultTitle: 'Найти противоположный процесс'
    },
    {
        id: 'step4',
        side: 'right',
        textKey: 'dialectics.hints.step4',
        titleKey: 'dialectics.hints.step4',
        defaultText: 'Опишите развитие противоположного процесса',
        defaultTitle: 'Опишите развитие противоположного процесса'
    },
    {
        id: 'step5',
        side: 'center',
        textKey: 'dialectics.hints.step5',
        titleKey: 'dialectics.hints.step5',
        defaultText: 'Объедините оба противоположных процесса в одно общее развитие. К каким противоречиям это приводит? Как могут быть разрешены противоречия?',
        defaultTitle: 'Объедините оба противоположных процесса в одно общее развитие. К каким противоречиям это приводит? Как могут быть разрешены противоречия?'
    }
];

export function getSteps() {
    return STEPS_CONFIG.map(s => ({
        id: s.id,
        side: s.side,
        text: getHint(s.textKey, s.defaultText),
        title: getHint(s.titleKey, s.defaultTitle)
    }));
}

export function getAnchorHint() {
    return {
        id: 'anchor',
        side: 'left',
        text: getHint('dialectics.hints.anchor', 'Что вам нужно понять?'),
        title: getHint('dialectics.hints.anchor', 'Что вам нужно понять?')
    };
}
