"""Read a source before asking the model to reconstruct its argument."""
from fastapi import HTTPException

from fastapi_app.services.article_fetch import fetch_article
from fastapi_app.services.article_sections import source_selection
from urllib.parse import unquote, urlsplit

MAX_ARTICLE_CHARS = 100_000


async def prepare_article(data):
    payload = data.model_dump()
    url, quote = data.url.strip(), data.quote.strip()
    selection = source_selection(url, data.selection, quote)
    section_label = selection or unquote(urlsplit(url).fragment)
    text, scope = quote, 'excerpt'
    if url:
        try:
            text = await fetch_article(url, selection) if selection else await fetch_article(url)
            scope = 'section' if section_label else 'article'
        except HTTPException as error:
            if error.status_code in {413, 422}:
                raise
            if not quote:
                raise HTTPException(400, 'Не удалось прочитать статью по ссылке. '
                                    'Добавьте её текст в поле «Цитата / заметка» источника.') from None
    if not text.strip():
        raise HTTPException(422, 'Для изложения нужна ссылка на статью или её текст.')
    if len(text) > MAX_ARTICLE_CHARS:
        raise HTTPException(413, 'Текст статьи превышает 100 000 символов. '
                            'Прикрепите нужный раздел отдельным источником без ссылки.')
    return dict(payload, text=text, scope=scope, selection=section_label)
