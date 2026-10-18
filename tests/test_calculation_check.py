from fractions import Fraction
import json
from unittest.mock import patch

import pytest

from fastapi_app.services.calculation_check import numeric_value, check_equalities, mismatch_notice
from fastapi_app.services.ai_service import AIService


@pytest.mark.parametrize('formula,expected', [
    (r'\frac{(2-5)^2+(5-5)^2+(8-5)^2}{3(6+3)}', Fraction(2, 3)),
    (r'\frac{1}{\frac{3}{2}}', Fraction(2, 3)),
    ('0.1+0.2', Fraction(3, 10)), ('(-3)^2', 9), ('2^{-3}', Fraction(1, 8)),
    ('1.25e-3', Fraction(1, 800)),
])
def test_exact_numeric_operations(formula, expected):
    assert numeric_value(formula) == expected


@pytest.mark.parametrize('formula', [r'\sqrt{2}', 'x+3', '__import__("os")', '2**999999',
                                    '1e999999999', '1/0', '(' * 350 + '2' + ')' * 350])
def test_unsupported_or_unbounded_arithmetic_stays_unverified(formula):
    assert check_equalities(formula + '=3') == []


def test_wrong_equality_is_reported_without_marking_symbolic_or_rounded_steps_verified():
    checked = check_equalities(r'v_p=\frac{18}{27}=\frac{3}{2}')
    assert len(checked) == 1
    assert checked[0]['status'] == 'mismatch'
    assert checked[0]['left_value'] == '2/3'
    assert check_equalities(r'\frac{2}{3}\approx0.6667') == []
    assert check_equalities(r'\begin{aligned}18/27&=2/3\\&=4/6\end{aligned}')[1]['status'] == 'equal'
    assert r'\ne' in mismatch_notice(checked, 'русском')


@pytest.mark.asyncio
async def test_calculation_stream_reports_verified_error_before_model_and_passes_exact_values():
    service = AIService()

    async def stream(*args, **kwargs):
        yield 'Исправленная выкладка'

    with patch.object(service, '_generate_stream', side_effect=stream) as generate:
        result = [part async for part in service.explain_calculation_stream({'formula': r'\frac{18}{27}=\frac{3}{2}'})]
    assert 'Точная проверка' in result[0]
    assert r'\frac{2}{3}' in result[0]
    assert result[-1] == 'Исправленная выкладка'
    context = json.loads(generate.call_args.args[1].split('\n', 1)[1])
    assert context['arithmetic_checks'][0]['status'] == 'mismatch'
    assert context['arithmetic_checks'][0]['left_value'] == '2/3'
