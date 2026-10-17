"""Cross-platform browser install matching export_manager's browser location."""
import os
import shutil
import subprocess
import sys

if os.getenv('CHROMIUM_EXECUTABLE') or shutil.which('chromium') or shutil.which('chromium-browser'):
    print('Using installed Chromium')
else:
    os.environ.setdefault('PLAYWRIGHT_BROWSERS_PATH', '0')
    subprocess.run([sys.executable, '-m', 'playwright', 'install', 'chromium'], check=True)
