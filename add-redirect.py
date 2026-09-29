import os, re

REDIRECT_INPUT = '<input type="hidden" name="redirectionUrl" value="https://winwithfred.com/thank-you">'

# Insert after the locale hidden input in every Brevo form
MARKER = '<input type="hidden" name="locale" value="en">'
REPLACEMENT = MARKER + '\n      ' + REDIRECT_INPUT

updated = 0
skipped = 0

files_to_check = []
for fname in os.listdir('.'):
    if (fname.startswith('blog-') and fname.endswith('.html')) or fname in ('index.html',):
        files_to_check.append(fname)

for fname in sorted(files_to_check):
    with open(fname, 'r', encoding='utf-8') as f:
        content = f.read()

    if 'redirectionUrl' in content:
        skipped += 1
        continue

    if MARKER not in content:
        skipped += 1
        continue

    new_content = content.replace(MARKER, REPLACEMENT)
    with open(fname, 'w', encoding='utf-8') as f:
        f.write(new_content)
    updated += 1
    print(f'Updated: {fname}')

print(f'\nDONE: {updated} updated, {skipped} skipped')
