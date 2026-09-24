"""Download the CA linked by https://developers.sber.ru/docs/ru/gigachat/certificates.

HTTPS verification stays enabled for the download. No system trust store changes.
"""
import hashlib
from pathlib import Path
import ssl
import urllib.request

URL = 'https://gu-st.ru/content/lending/russian_trusted_root_ca_pem.crt'
if __name__ == '__main__':
    target = Path('data/certs/russian_trusted_root_ca.pem')
    with urllib.request.urlopen(URL, timeout=20) as response:
        data = response.read(65537)
    if len(data) > 65536:
        raise ValueError('Unexpected CA download size')
    ssl.create_default_context(cadata=data.decode('ascii'))
    target.parent.mkdir(parents=True, exist_ok=True)
    with target.open('xb') as output:
        output.write(data)
    print(f'CA saved to {target}; SHA256={hashlib.sha256(data).hexdigest()}')
