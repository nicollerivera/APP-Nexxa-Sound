import subprocess
import os

# Get the clean file from git as raw bytes (UTF-8 without BOM)
content = subprocess.check_output(['git', 'show', '958b87c:src/App.jsx'])

# Write raw bytes directly - preserves exact UTF-8 encoding from git
with open('src/App.jsx', 'wb') as f:
    f.write(content)

print('OK -', len(content), 'bytes written to src/App.jsx')

# Also restore App.css
content_css = subprocess.check_output(['git', 'show', '958b87c:src/App.css'])
with open('src/App.css', 'wb') as f:
    f.write(content_css)

print('OK -', len(content_css), 'bytes written to src/App.css')
