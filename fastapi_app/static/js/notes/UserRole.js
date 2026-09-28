import { t } from '../i18n.js';

const KEY = 'papanda_user_role';
const ROLES = ['researcher', 'student', 'teacher'];

export default class UserRole {
    static get() {
        try {
            const saved = localStorage.getItem(KEY);
            return ROLES.includes(saved) ? saved : 'researcher';
        } catch { return 'researcher'; }
    }

    static set(role) {
        if (!ROLES.includes(role)) return;
        try { localStorage.setItem(KEY, role); } catch {}
        this.apply();
    }

    static apply() {
        const role = this.get();
        const selector = document.getElementById('user-role');
        if (selector) selector.value = role;
        const community = document.getElementById('menu-item-learning-demo');
        if (community) community.style.display = role === 'researcher' ? 'none' : '';
        const history = document.getElementById('learning-history-label');
        if (history) history.textContent = t(role === 'researcher' ? 'learning_research_history' : 'learning_history');
    }

    static communityTabs() {
        const role = this.get();
        if (role === 'student') return ['catalog', 'map', 'portfolio', 'employer'];
        if (role === 'teacher') return ['catalog', 'map', 'teacher'];
        return [];
    }
}
