from scripts.audit_personal import Audit


def test_privacy_audit_reports_secret_without_echoing_it():
    audit = Audit({'OPENAI_API_KEY': 'private-test-value-12345'})
    audit.blob('bundle.js', b'const key = "private-test-value-12345";')
    assert audit.findings == [{'member': 'bundle.js', 'kind': 'author_secret', 'setting': 'OPENAI_API_KEY'}]
    assert 'private-test-value-12345' not in str(audit.findings)


def test_privacy_audit_rejects_user_databases_and_local_paths():
    audit = Audit({}, ('C:/Users/private-owner',))
    audit.archive_member('Papanda-Personal/settings.env', b'')
    audit.blob('trace.json', b'C:/Users/private-owner/work')
    assert {item['kind'] for item in audit.findings} == {
        'private_or_unnecessary_member', 'author_local_path_or_login'}


def test_public_author_attribution_and_support_links_are_allowed():
    audit = Audit({})
    audit.blob('footer.html', b'Author name, https://papanda.kz and mailto:public@example.org')
    assert audit.findings == []
