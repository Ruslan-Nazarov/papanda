import { t } from '../i18n.js';

// Ручной алгоритм (подсказки блоков) приходит из prompts/7_*.json — сервер
// передаёт блок нужной локали в inert JSON #algorithm-data. i18n — fallback.
let algorithm;
const _alg = () => {
    if (!algorithm) {
        const source = document.getElementById('algorithm-data');
        algorithm = source ? JSON.parse(source.textContent) : {};
    }
    return algorithm;
};

const _stepTitle = (role) => {
    const key = role === 'anchor' ? 'anchor' : `${role}_title`;
    return _alg()[key] || t(role === 'anchor' ? 'hint_anchor_title' : `hint_${role}_title`);
};

export const ALGORITHM_STEPS = [
    { role: 'anchor', side: 'left', promptKey: 'anchor', titleKey: 'hint_anchor_title', get title() { return _stepTitle('anchor'); } },
    { role: 'step1', side: 'left', promptKey: 'step1', titleKey: 'hint_step1_title', get title() { return _stepTitle('step1'); } },
    { role: 'step2', side: 'right', promptKey: 'step2', titleKey: 'hint_step2_title', get title() { return _stepTitle('step2'); } },
    { role: 'step3', side: 'left', promptKey: 'step3', titleKey: 'hint_step3_title', get title() { return _stepTitle('step3'); } },
    { role: 'step4', side: 'right', promptKey: 'step4', titleKey: 'hint_step4_title', get title() { return _stepTitle('step4'); } },
    { role: 'step5', side: 'center', promptKey: 'step5', titleKey: 'hint_step5_title', get title() { return _stepTitle('step5'); } }
];

// Тексты подсказок: #algorithm-data (из 7_*.json), fallback — i18n hint_*.
export const ALGORITHM_TEXTS = new Proxy({}, {
    get: (_t, role) => _alg()[role] || t(role === 'anchor' ? 'hint_anchor' : `hint_${role}`),
});

export const STEP_ORDER = {
    anchor: 0,
    step1: 1,
    step2: 2,
    step3: 3,
    step4: 4,
    step5: 5
};

/**
 * Infers a block's dialectics role from its title text.
 * Leaves the input unchanged; normalization belongs to NoteStore.
 * Returns the inferred role string, or null if no match.
 */
export function inferRoleFromTitle(input) {
    const block = {...input};
    // Явно заданная роль всегда приоритетнее эвристики по тексту.
    if (block.role) {
        if (block.role === 'anchor') block.side = 'left';
        return block.role;
    }
    const title = (block.title || '').trim().toLowerCase();
    const has = (...w) => w.some(x => title.includes(x));
    if (has('что вам надо объяснить', 'что вам нужно понять', 'what do you need to explain',
            'what do you want to understand', 'нені түсіндіру керек', 'нені түсінгіңіз')) {
        block.role = 'anchor'; block.side = 'left'; return block.role;
    }
    if (has('простейший процесс', 'simplest process', 'қарапайым процесс') && !has('развивается', 'develops', 'дамитын')) {
        block.role = 'step1'; block.side = 'left';
    } else if (has('развивается этот простейший', 'развитие простейшего', 'how this simplest process develops', 'қалай дамитынын')) {
        block.role = 'step2'; block.side = 'right';
    } else if (has('противоположный процесс', 'opposite process', 'қарама-қарсы процес') && !has('развитие', 'development', 'дамуын')) {
        block.role = 'step3'; block.side = 'left';
    } else if (has('развитие противоположного', 'development of the opposite', 'қарама-қарсы процестің дамуын')) {
        block.role = 'step4'; block.side = 'right';               // старый заголовок Шага 4
    } else if (has('синтез', 'synthesis', 'разрешение противоречия', 'resolving the contradiction', 'қайшылықты шешу')) {
        block.role = 'step5'; block.side = 'center';              // старый «Синтез / Противоречие» + новый «Разрешение противоречия»
    } else if (has('противоречие', 'contradiction', 'қайшылық')) {
        block.role = 'step4'; block.side = 'right';               // новый заголовок Шага 4 — «Противоречие»
    }
    return block.role || null;
}

class BlockConstants {
    static init() {
        console.log('BlockConstants Initialized');
    }
}

export default BlockConstants;
