import pytest
from fastapi_app.services.sanitizer import sanitize_block_html, sanitize_on_write


@pytest.mark.parametrize('clean', [sanitize_on_write, sanitize_block_html])
def test_table_cell_spans_survive_without_active_attributes(clean):
    source = '<table><tr><th colspan="2" data-colwidth="100,200" onclick="evil()">Header</th></tr>' \
             '<tr><td rowspan="2">One</td><td>Two</td></tr></table>'
    result = clean(source)
    assert 'colspan="2"' in result
    assert 'rowspan="2"' in result
    assert 'data-colwidth="100,200"' in result
    assert 'onclick' not in result


@pytest.mark.asyncio
async def test_pasted_table_and_formula_survive_api_save_and_reopen(client):
    html = (
        '<h2>Закон движения</h2><p>Первый абзац '
        '<span class="math-inline" data-formula="F=ma" formula="F=ma">F=ma</span></p>'
        '<ul><li><p>Первая строка</p></li><li><p>Вторая строка</p></li></ul>'
        '<div class="math-callout"><div class="math-content"><p>'
        '<span class="math-inline" data-formula="E=mc^2" formula="E=mc^2">E=mc^2</span>'
        '</p></div></div>'
        '<table><tbody><tr><th><p>Величина</p></th><th><p>Значение</p></th></tr>'
        '<tr><td><p>Масса</p></td><td><p>'
        '<span class="math-inline" data-formula="m=2" formula="m=2">m=2</span>'
        '</p></td></tr><tr><td><p>Сила</p></td><td><p>4 Н</p></td></tr></tbody></table>'
    )
    saved = await client.post('/api/dialectics/save', json={
        'title': 'Тест вставки', 'blocks': [{'id': 'paste', 'side': 'left', 'html': html}],
    })
    assert saved.status_code == 200, saved.text
    reopened = await client.get(f"/api/dialectics/{saved.json()['id']}")
    assert reopened.status_code == 200, reopened.text
    body = reopened.json()['content_json'][0]['html']
    for value in ('Первый абзац', 'Первая строка', 'Вторая строка', 'Величина',
                  'Значение', 'Масса', 'Сила', '4 Н', 'F=ma', 'E=mc^2', 'm=2'):
        assert value in body
    assert body.count('<tr>') == 3
    assert body.count(' formula=') == 3
