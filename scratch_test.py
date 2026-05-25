import asyncio
from fastapi.testclient import TestClient
from fastapi_app.main import app
import re

client = TestClient(app)

resp1 = client.get('/word_stats')
m1 = re.search(r'<span class="metric-label">Fully Learned</span>\s*<span class="metric-value">(\d+)</span>', resp1.text)
if m1:
    print('Initial Fully Learned:', m1.group(1))

from fastapi_app.database import get_session_maker
maker = get_session_maker('default')
async def get_word():
    from sqlalchemy import select
    from fastapi_app.models import WordStats
    async with maker() as db:
        res = await db.execute(select(WordStats).where(WordStats.is_learned == False).limit(1))
        return res.scalar_one_or_none()
        
word = asyncio.run(get_word())
if word:
    print('Marking word:', word.eng)
    resp_mark = client.post('/mark_triplet_learned', json={'eng': word.eng, 'is_learned': True})
    print('Mark response:', resp_mark.json())
    
    resp2 = client.get('/word_stats')
    m2 = re.search(r'<span class="metric-label">Fully Learned</span>\s*<span class="metric-value">(\d+)</span>', resp2.text)
    if m2:
        print('New Fully Learned:', m2.group(1))
