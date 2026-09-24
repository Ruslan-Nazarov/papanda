from copy import deepcopy

from fastapi_app.services.context_builder import expected_step_keys, _entry_for_key
from fastapi_app.services.generation.common import _base_of


class RepairPolicy:
    @staticmethod
    def affected_keys(skeleton, bad_steps):
        keys = expected_step_keys(skeleton)
        if not bad_steps or '1' in bad_steps:
            return []
        # Every later base consumes the previous chain. Include same-base descendants.
        selected = {k for k in keys if int(_base_of(k)) >= min(map(int, bad_steps))}
        changed = True
        while changed:
            before = len(selected)
            selected.update(k for k in keys if _entry_for_key(skeleton, k).get('растёт_из') in selected)
            changed = len(selected) != before
        return [k for k in keys if k in selected]

    @staticmethod
    def state_with_texts(state, collected):
        scratch = deepcopy(state)
        scratch['_process_texts'] = dict(collected)
        scratch['steps'] = {
            f'step{i}': {'content': '\n\n'.join(v for k, v in collected.items() if _base_of(k) == str(i)),
                        'status': 'ready', 'author': 'ai'}
            for i in range(1, 6)
        }
        return scratch
