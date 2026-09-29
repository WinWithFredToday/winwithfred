import os

fixed = 0
skipped = 0

for fname in sorted(os.listdir('.')):
    if not (fname.startswith('blog-') and fname.endswith('.html')):
        continue
    with open(fname, 'r', encoding='utf-8') as f:
        content = f.read()
    new_content = content.replace('<\/script>', '</script>')
    if new_content != content:
        with open(fname, 'w', encoding='utf-8') as f:
            f.write(new_content)
        fixed += 1
        print('Fixed: ' + fname)
    else:
        skipped += 1

print(f'\nDONE: {fixed} fixed, {skipped} skipped')
