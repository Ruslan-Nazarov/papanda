import { lt as t } from './LearningI18n.js';
import LearningWorkspace from './LearningWorkspace.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export default class ProposalReview {
    static show(result, full = false) {
        return new Promise(resolve => {
            const {body, close, overlay} = LearningWorkspace.modal(full ? t('full_note') : t('proposal'));
            const entries = Object.entries(result.updated_steps || {}).sort(([a],[b]) => a.localeCompare(b,undefined,{numeric:true}));
            body.innerHTML = `<p class="learning-proposal-intro">${full
                ? t('full_intro')
                : t('proposal_intro')}</p>
                <div class="learning-proposal-steps">${entries.map(([role,value]) => `<label class="learning-proposal-step">
                    <strong>${esc(value.title || t('step_label', {step:role.replace(/^step/, '')}))}</strong><textarea data-role="${esc(role)}" ${full ? 'readonly' : ''}>${esc(value.content)}</textarea></label>`).join('')}</div>
                <div class="learning-proposal-actions"><button type="button" data-decision="reject">${t('reject')}</button>
                <button type="button" class="learning-primary" data-decision="accept">${full ? t('save_separate') : t('accept')}</button></div>`;
            const done = decision => {
                if (decision === 'reject') { close(); resolve({decision}); return; }
                const updated_steps = structuredClone(result.updated_steps || {});
                let edited = false;
                body.querySelectorAll('[data-role]').forEach(area => {
                    const role = area.dataset.role;
                    const content = area.value.trim();
                    if (content !== updated_steps[role].content.trim()) edited = true;
                    updated_steps[role].content = content;
                });
                if (Object.values(updated_steps).some(step => !step.content)) return;
                close(); resolve({decision:edited ? 'edited' : 'accepted', updated_steps});
            };
            body.querySelectorAll('[data-decision]').forEach(button => button.addEventListener('click', () => done(button.dataset.decision)));
            overlay.querySelector('.learning-close').addEventListener('click', () => resolve({decision:'reject'}), {once:true});
            overlay.addEventListener('click', event => { if (event.target === overlay) resolve({decision:'reject'}); });
        });
    }
}
