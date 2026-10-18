from scripts.audit_personal import Audit, local_markers


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


def test_hosted_runner_account_in_upstream_wheel_is_not_an_author_path(tmp_path):
    root = tmp_path / 'project'
    home = tmp_path / 'runneradmin'
    markers = local_markers(root, home, {
        'GITHUB_ACTIONS': 'true', 'RUNNER_ENVIRONMENT': 'github-hosted'})
    audit = Audit({'API_KEY': 'private-test-value-12345'}, markers)
    audit.blob('upstream.pyd', str(home / '.cargo').encode())
    assert audit.findings == []
    audit.blob('app.pyc', str(root).encode())
    audit.blob('app.pyc', b'private-test-value-12345')
    assert {item['kind'] for item in audit.findings} == {
        'author_local_path_or_login', 'author_secret'}


def test_local_self_hosted_and_real_author_accounts_keep_home_markers(tmp_path):
    root = tmp_path / 'project'
    for name, environ in [
        ('runneradmin', {}),
        ('runneradmin', {'GITHUB_ACTIONS': 'true', 'RUNNER_ENVIRONMENT': 'self-hosted'}),
        ('private-owner', {'GITHUB_ACTIONS': 'true', 'RUNNER_ENVIRONMENT': 'github-hosted'}),
    ]:
        home = tmp_path / name
        markers = local_markers(root, home, environ)
        assert str(home) in markers and name in markers
