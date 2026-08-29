export const ALGORITHM_STEPS = [
    { role: 'anchor', side: 'left', promptKey: 'anchor', titleKey: 'anchor_title', title: 'Что вам нужно понять?' },
    { role: 'step1', side: 'left', promptKey: 'step1', titleKey: 'step1_title', title: 'Простейший процесс' },
    { role: 'step2', side: 'right', promptKey: 'step2', titleKey: 'step2_title', title: 'Опишите как развивается этот простейший процесс' },
    { role: 'step3', side: 'left', promptKey: 'step3', titleKey: 'step3_title', title: 'Найти противоположный процесс' },
    { role: 'step4', side: 'right', promptKey: 'step4', titleKey: 'step4_title', title: 'Опишите развитие противоположного процесса' },
    { role: 'step5', side: 'center', promptKey: 'step5', titleKey: 'step5_title', title: 'Синтез / Противоречие' }
];

export const ALGORITHM_TEXTS = {
    "anchor": "Что вам нужно понять?",
    "anchor_title": "Что вам нужно понять?",
    "step1": "<div style=\"font-size:1.02em; font-weight:500; color:#1e293b; margin-bottom:8px;\">Опишите простейший процесс, который, по вашему мнению, лежит в основе проблемы, которую вы хотите понять.</div><div style=\"font-size:0.85em; color:#64748b; font-weight:400; line-height:1.35;\">Примером простейшего процесса может быть суммирование. Если вы затрудняетесь, то нажмите кнопку Помощь ИИ. Помните, что ИИ не способен к пониманию, но может предоставить вам знания.</div>",
    "step1_title": "Простейший процесс",
    "step2": "<div style=\"font-size:1.02em; font-weight:500; color:#1e293b; margin-bottom:8px;\">Опишите, как развивается этот простейший процесс.</div><div style=\"font-size:0.85em; color:#64748b; font-weight:400; line-height:1.35;\">Развитие – это взаимодействие процесса с другими процессами в мире. Например, если простейшим является суммирование, то его развитием будет суммирование пяти, десяти и т.п. единиц, использование суммирования в торговле, праве, науке. Если вы сомневаетесь или не знаете, то можете нажать кнопку Помощь ИИ. Однако помните, что ИИ не может заменить человека в понимании процессов, ИИ может только предоставить знания.</div>",
    "step2_title": "Опишите как развивается этот простейший процесс",
    "step3": "<div style=\"font-size:1.02em; font-weight:500; color:#1e293b; margin-bottom:8px;\">Вы уже нашли простейший процесс, посмотрели, как он развивается. В этом развитии вы должны отыскать противоположный процесс.</div><div style=\"font-size:0.85em; color:#64748b; font-weight:400; line-height:1.35;\">Вы можете сделать это через специальный ИИ под кнопкой ✨. А можете сделать это самостоятельно. Противоположным является такой процесс, который сам остается самостоятельным, но полностью исключает другой.</div>",
    "step3_title": "Найти противоположный процесс",
    "step4": "<div style=\"font-size:1.02em; font-weight:500; color:#1e293b; margin-bottom:8px;\">Опишите развитие противоположного процесса.</div>",
    "step4_title": "Опишите развитие противоположного процесса",
    "step5": "<div style=\"font-size:1.02em; font-weight:500; color:#1e293b; margin-bottom:8px;\">Объедините оба противоположных процесса в одно общее развитие. К каким противоречиям это приводит? Как могут быть разрешены противоречия?</div>",
    "step5_title": "Синтез / Противоречие"
};

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
 * Mutates the block object in-place (sets .role and .side) if a role is detected.
 * Returns the inferred role string, or null if no match.
 */
export function inferRoleFromTitle(block) {
    const title = (block.title || '').trim().toLowerCase();
    if (title.includes('что вам нужно понять')) {
        block.role = 'anchor';
        block.side = 'left';
        return block.role;
    }
    if (block.role) {
        if (block.role === 'anchor') block.side = 'left';
        return block.role;
    }
    if (title.includes('простейший процесс') && !title.includes('развивается')) { block.role = 'step1'; block.side = 'left'; }
    else if (title.includes('развивается этот простейший') || title.includes('развитие простейшего')) { block.role = 'step2'; block.side = 'right'; }
    else if (title.includes('противоположный процесс') && !title.includes('развитие')) { block.role = 'step3'; block.side = 'left'; }
    else if (title.includes('развитие противоположного')) { block.role = 'step4'; block.side = 'right'; }
    else if (title.includes('синтез') || title.includes('противореч')) { block.role = 'step5'; block.side = 'center'; }
    return block.role || null;
}

class BlockConstants {
    static init() {
        console.log('BlockConstants Initialized');
    }
}

export default BlockConstants;
