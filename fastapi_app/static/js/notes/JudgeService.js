import AppState from './AppState.js';
import NotesAPI from './api.js';
import AIController from './AIController.js';
import GlobalLoader from './GlobalLoader.js';
import DialogService from './DialogService.js';
import { t } from '../i18n.js';

/**
 * Кнопка «⚖️ Проверить» — прогоняет судью (тот же, что в автогенерации)
 * по текущему конспекту по требованию. Ничего не перегенерирует, только
 * показывает вердикт + причину. Видна в ручном режиме и «по шагам»;
 * в полной автогенерации скрыта — там судья работает сам.
 */
class JudgeService {
    static init() {
        const btn = document.getElementById('btn-judge-conspect');
        if (btn) btn.addEventListener('click', () => this.run());
        this.updateVisibility();
    }

    static updateVisibility() {
        const btn = document.getElementById('btn-judge-conspect');
        if (!btn) return;
        const autoFull = AppState.isAutoFillEnabled && !AppState.isAutoFillStepByStep;
        btn.hidden = !!autoFull;
    }

    static async run() {
        const state = AIController.buildStateForAI();
        GlobalLoader.show(t('judge_running'));
        try {
            const res = await NotesAPI.routeConspectus({ action: 'judge', context_state: state });
            GlobalLoader.hide();
            if (!res || res.action_status !== 'success') {
                const msg = (res && res.error_message) || t('judge_error');
                return DialogService.alert(t('judge_title'), msg, { icon: '⚠️', buttonText: t('judge_close') });
            }
            if (res.is_valid) {
                return DialogService.alert(t('judge_title'), t('judge_valid'), { icon: '✅', buttonText: t('judge_close') });
            }
            const body = `${t('judge_invalid')} ${res.reason || ''}`.trim();
            return DialogService.alert(t('judge_title'), body, { icon: '⚠️', buttonText: t('judge_close') });
        } catch (e) {
            GlobalLoader.hide();
            console.error('Judge check failed:', e);
            return DialogService.alert(t('judge_title'), t('judge_error'), { icon: '⚠️', buttonText: t('judge_close') });
        }
    }
}

export default JudgeService;
