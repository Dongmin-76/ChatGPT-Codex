"""Install pinned, checksum-verified Korean/English tessdata without admin access."""
from pathlib import Path
import hashlib
import urllib.request

COMMIT = '87416418657359cb625c412a48b6e1d6d41c29bd'
CHECKSUMS = {
    'kor': '6b85e11d9bbf07863b97b3523b1b112844c43e713df8b66418a081fd1060b3b2',
    'eng': '7d4322bd2a7749724879683fc3912cb542f19906c83bcc1a52132556427170b2',
}


def install():
    target = Path(__file__).resolve().parents[1] / '.local/tessdata'
    target.mkdir(parents=True, exist_ok=True)
    for language, expected in CHECKSUMS.items():
        path = target / f'{language}.traineddata'
        if path.exists() and hashlib.sha256(path.read_bytes()).hexdigest() == expected:
            print(f'{language}: verified existing data')
            continue
        url = f'https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/{COMMIT}/{language}.traineddata'
        with urllib.request.urlopen(url, timeout=60) as response:
            data = response.read()
        if hashlib.sha256(data).hexdigest() != expected:
            raise RuntimeError(f'{language}: checksum mismatch; installation stopped')
        tmp = path.with_suffix('.tmp')
        tmp.write_bytes(data)
        tmp.replace(path)
        print(f'{language}: installed verified data')
    print(f'Ready: {target}')

if __name__ == '__main__':
    install()
