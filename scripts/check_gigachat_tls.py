"""Verify OAuth and API certificate chains without credentials or generation calls."""
import argparse
import socket
import ssl

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--ca')
    args = parser.parse_args()
    context = ssl.create_default_context(cafile=args.ca)
    for host, port in [('ngw.devices.sberbank.ru', 9443), ('gigachat.devices.sberbank.ru', 443)]:
        try:
            with socket.create_connection((host, port), timeout=10) as sock:
                with context.wrap_socket(sock, server_hostname=host):
                    print(f'{host}:{port} TLS verified')
        except Exception as exc:
            print(f'{host}:{port} {type(exc).__name__}: {exc}')
            raise SystemExit(1)
