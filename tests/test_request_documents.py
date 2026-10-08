import io
import zipfile

import pytest
from fastapi import HTTPException

from fastapi_app.services.request_document import extract_request_document


def docx(xml):
    output = io.BytesIO()
    with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as archive:
        archive.writestr('word/document.xml', xml)
    return output.getvalue()


def test_docx_preserves_paragraphs_table_cells_and_explicit_breaks():
    data = docx('''<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>
      <w:p><w:r><w:t>Создание ЭКГ</w:t><w:br/><w:t>по ТЗ</w:t></w:r></w:p>
      <w:tbl><w:tr><w:tc><w:p><w:r><w:t>≥500 Гц</w:t></w:r></w:p></w:tc>
      <w:tc><w:p><w:r><w:t>например</w:t></w:r></w:p></w:tc></w:tr></w:tbl>
    </w:body></w:document>''')
    assert extract_request_document(data, 'ТЗ.docx') == {
        'name': 'ТЗ.docx', 'text': 'Создание ЭКГ\nпо ТЗ\n≥500 Гц | например'}


@pytest.mark.parametrize('data,name,status', [
    (b'not a zip', 'bad.docx', 400), (b'\xff', 'bad.txt', 400),
    (b'  ', 'empty.txt', 400), (b'\x00a', 'null.txt', 400),
    (b'a', 'unsupported.pdf', 415), (b'a' * 50_001, 'large.txt', 413),
    (b'a' * (2 * 1024 * 1024 + 1), 'large.docx', 413),
    (docx('<!DOCTYPE doc [<!ENTITY test "hidden">]><doc/>'), 'entity.docx', 400),
], ids=['invalid-docx', 'invalid-encoding', 'empty', 'null', 'unsupported',
        'too-many-characters', 'too-many-bytes', 'xml-entity'])
def test_unreadable_or_oversized_document_is_rejected_without_truncation(data, name, status):
    with pytest.raises(HTTPException) as error:
        extract_request_document(data, name)
    assert error.value.status_code == status


@pytest.mark.asyncio
async def test_attachment_upload_save_reload_and_public_view(client):
    text = 'Создание одноканального ЭКГ\n' + 'Полный контекст. ' * 1500 + '\nПоследнее условие'
    response = await client.post('/api/ai/dialectics/documents/extract', files={
        'file': ('ТЗ.txt', text.encode('utf-8'), 'text/plain')})
    assert response.status_code == 200
    attachment = response.json()
    assert attachment['text'] == text
    assert 'Последнее условие' in attachment['text']
    saved = await client.post('/api/dialectics/save', json={'title': 'Создание ЭКГ', 'blocks': [
        {'id': 'anchor', 'side': 'left', 'role': 'anchor', 'html': '<p>Создать ЭКГ</p>',
         'request_document': attachment}]})
    assert saved.status_code == 200
    note = saved.json()
    loaded = await client.get('/api/dialectics/' + str(note['id']))
    assert loaded.json()['content_json'][0]['request_document'] == attachment
    from fastapi_app.services.sharing_service import SharingService
    from types import SimpleNamespace
    public = SharingService.public_view(SimpleNamespace(title=note['title'], schema_version=1,
                                                       content_json=loaded.json()['content_json']))
    assert 'request_document' not in public['content_json'][0]


@pytest.mark.asyncio
async def test_extraction_does_not_require_a_model_and_rejects_invalid_file(client):
    response = await client.post('/api/ai/dialectics/documents/extract', files={
        'file': ('invalid.docx', b'not a document', 'application/octet-stream')})
    assert response.status_code == 400
