import html
import json
from html.parser import HTMLParser

import pytest


class ChatReader(HTMLParser):
    def __init__(self, source):
        super().__init__()
        self.chats = []
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'span' and attrs.get('data-type') == 'concept-chat':
            self.chats.append(json.loads(attrs['data-chat']))


@pytest.mark.asyncio
async def test_saved_chat_survives_note_create_update_and_reload(client):
    chat = {"version": 1, "fragment": "Матрица", "calculation": False, "turns": [
        {"question": "", "answer": 'Ответ $q_1$ [1].\n\n| x | y |\n|---|---|\n| 1 | 2 |',
         "sources": [{"block_id": "source", "note_id": "12", "title": "Источник", "text": "Выдержка"}]}]}

    def block(data):
        encoded = html.escape(json.dumps(data, ensure_ascii=False), quote=True)
        return {"id": "current", "title": "Чат", "side": "left", "html":
                f'<p>Матрица <span data-type="concept-chat" data-chat="{encoded}" '
                'class="concept-chat-marker" role="button" tabindex="0">💬</span> и продолжение.</p>'}

    created = await client.post('/api/dialectics/save', json={"title": "Сохранённый чат", "blocks": [block(chat)]})
    assert created.status_code == 200, created.text
    note = created.json()
    assert ChatReader(note['content_json'][0]['html']).chats == [chat]
    chat['turns'].append({"question": "Почему?", "answer": "Весь второй ответ.", "sources": []})
    updated = await client.patch(f'/api/dialectics/{note["id"]}', json={"revision": note['revision'], "blocks": [block(chat)]})
    assert updated.status_code == 200, updated.text
    reloaded = await client.get(f'/api/dialectics/{note["id"]}')
    assert reloaded.status_code == 200, reloaded.text
    assert ChatReader(reloaded.json()['content_json'][0]['html']).chats == [chat]
