import { t } from '../i18n.js';

/**
 * Скилл ИИ-генерации — две независимые оси (см. бэклог ревизии промптов
 * 2026-09-05): "speaker" меняет только тон/регистр речи, "addressee" —
 * порог и количество пояснений через скрытый текст. Обе по умолчанию
 * "neutral" = текущее поведение без изменений.
 * Выбор хранится глобально в localStorage (как и mode/по шагам).
 */
const SPEAKER_KEY = 'dialectics_skill_speaker';
const ADDRESSEE_KEY = 'dialectics_skill_addressee';
const DEFAULT_ROLE = 'neutral';

const ROLES = [
    { id: 'neutral', labelKey: 'skill_role_plain' },
    { id: 'professor', labelKey: 'skill_role_professor' },
    { id: 'student', labelKey: 'skill_role_student' },
    { id: 'parents', labelKey: 'skill_role_parents' },
    { id: 'children', labelKey: 'skill_role_children' },
];

class SkillManager {
    static speaker = DEFAULT_ROLE;
    static addressee = DEFAULT_ROLE;

    static init() {
        try { this.speaker = localStorage.getItem(SPEAKER_KEY) || DEFAULT_ROLE; } catch { this.speaker = DEFAULT_ROLE; }
        try { this.addressee = localStorage.getItem(ADDRESSEE_KEY) || DEFAULT_ROLE; } catch { this.addressee = DEFAULT_ROLE; }

        const speakerSelect = document.getElementById('skill-speaker-select');
        const addresseeSelect = document.getElementById('skill-addressee-select');
        if (!speakerSelect || !addresseeSelect) return;

        const fillOptions = (select) => {
            select.innerHTML = ROLES.map(r => `<option value="${r.id}">${t(r.labelKey)}</option>`).join('');
        };
        fillOptions(speakerSelect);
        fillOptions(addresseeSelect);
        speakerSelect.value = this.speaker;
        addresseeSelect.value = this.addressee;

        speakerSelect.addEventListener('change', () => {
            this.speaker = speakerSelect.value;
            try { localStorage.setItem(SPEAKER_KEY, this.speaker); } catch {}
        });
        addresseeSelect.addEventListener('change', () => {
            this.addressee = addresseeSelect.value;
            try { localStorage.setItem(ADDRESSEE_KEY, this.addressee); } catch {}
        });
    }

    /** {speaker, addressee} для отправки в payload ИИ-генерации.
     * Если обе роли — дефолт, возвращает null (не меняет поведение бэкенда). */
    static getSkill() {
        if (this.speaker === DEFAULT_ROLE && this.addressee === DEFAULT_ROLE) return null;
        return { speaker: this.speaker, addressee: this.addressee };
    }
}

export default SkillManager;
