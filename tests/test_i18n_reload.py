import json

from fastapi_app import i18n


def test_running_server_picks_up_new_frontend_labels(tmp_path, monkeypatch):
    words = {locale: {'existing': locale} for locale in i18n.LOCALES}
    path = tmp_path / 'words.json'
    path.write_text(json.dumps(words), encoding='utf-8')
    monkeypatch.setattr(i18n, '_DATA_FILE', path)
    monkeypatch.setattr(i18n, 'TRANSLATIONS', words)
    monkeypatch.setattr(i18n, '_DATA_STAMP', path.stat().st_mtime_ns)
    translator = i18n.get_translator('ru')
    assert translator('derivation_title') == 'derivation_title'
    revised = {locale: {**values, 'derivation_title': 'Readable title'} for locale, values in words.items()}
    path.write_text(json.dumps(revised), encoding='utf-8')
    monkeypatch.setattr(i18n, '_DATA_STAMP', -1)
    assert i18n.locale_dict('ru')['derivation_title'] == 'Readable title'
    assert translator('derivation_title') == 'Readable title'


def test_new_server_translator_refreshes_the_same_dictionary(tmp_path, monkeypatch):
    words = {locale: {'existing': locale} for locale in i18n.LOCALES}
    path = tmp_path / 'words.json'
    path.write_text(json.dumps({locale: {'existing': 'Updated'} for locale in i18n.LOCALES}), encoding='utf-8')
    monkeypatch.setattr(i18n, '_DATA_FILE', path)
    monkeypatch.setattr(i18n, 'TRANSLATIONS', words)
    monkeypatch.setattr(i18n, '_DATA_STAMP', -1)
    assert i18n.get_translator('en')('existing') == 'Updated'
    assert words['ru']['existing'] == 'Updated'
