#!/usr/bin/env python3
"""
GEO: Add visual FAQ blocks + author bio box + fix schema URLs.
- Adds visual FAQ HTML from FAQPage schema if missing
- Adds Freddy Owen author bio box if missing
- Fixes og:url .html suffix
- Fixes Article schema url/.html suffix
- Updates author URL to /about in Article schemas
"""

import os, re, json, subprocess

FAQ_STYLE = '<style id="wf-faq-style">.faq-section{background:#f9fafb;border-radius:14px;padding:40px 32px;margin:48px 0}.faq-section h2{font-size:1.4rem;font-weight:800;color:#111827;margin:0 0 24px}.faq-item{border-bottom:1px solid #e5e7eb;padding:18px 0}.faq-item:last-child{border-bottom:none}.faq-q{font-weight:700;font-size:1rem;color:#111827;margin:0 0 10px}.faq-a{color:#374151;font-size:.97rem;line-height:1.75;margin:0}</style>'

AUTHOR_BOX = '<aside class="author-box" style="display:flex;align-items:flex-start;gap:20px;background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:28px;margin:48px 0 0;"><div style="flex-shrink:0;width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#f97316,#ea6c0a);display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:900;color:#fff;">F</div><div><p style="font-weight:800;font-size:1rem;color:#111827;margin:0 0 4px;">Freddy Owen</p><p style="font-size:.85rem;color:#f97316;margin:0 0 10px;font-weight:600;">Founder, WinWithFred</p><p style="font-size:.92rem;color:#374151;line-height:1.65;margin:0;">Freddy writes practical self-improvement content grounded in research and real-world systems &#8212; not motivational fluff. <a href="/about" style="color:#f97316;font-weight:600;">Learn more about Freddy &#8594;</a></p></div></aside>'

def get_blog_files():
    result = subprocess.run(['git', 'ls-files', '*.html'], capture_output=True, text=True)
    return [f for f in result.stdout.strip().split('\n')
            if f.startswith('blog-') and f.endswith('.html')]

def extract_faq_schema(content):
    for m in re.finditer(r'<script[^>]*type="application/ld\+json"[^>]*>(.*?)</script>',
                          content, re.DOTALL | re.IGNORECASE):
        try:
            data = json.loads(m.group(1).strip())
            if data.get('@type') == 'FAQPage':
                return data
        except Exception:
            pass
    return None

def has_visual_faq(body):
    return bool(re.search(r'frequently asked|class="faq-', body, re.IGNORECASE))

def build_faq_html(faq_schema):
    items = faq_schema.get('mainEntity', [])
    if not items:
        return ''
    parts = ['\n\n<section class="faq-section">\n  <h2>Frequently Asked Questions</h2>\n']
    for q in items:
        qtext = q.get('name', '').replace('<', '&lt;').replace('>', '&gt;')
        atext = q.get('acceptedAnswer', {}).get('text', '')
        parts.append('  <div class="faq-item">\n    <p class="faq-q">' + qtext + '</p>\n    <p class="faq-a">' + atext + '</p>\n  </div>\n')
    parts.append('</section>\n')
    return ''.join(parts)

def fix_og_url(content):
    return re.sub(
        r'(<meta\s+property="og:url"\s+content="https://winwithfred\.com/[^"]+?)\.html(")',
        r'\1\2', content)

def fix_schema_urls(content):
    def clean(m):
        return m.group(0).replace('.html"', '"')
    return re.sub(r'"(?:url|mainEntityOfPage)"\s*:\s*"https://winwithfred\.com/[^"]+\.html"', clean, content)

def fix_author_url(content):
    return re.sub(
        r'"author"\s*:\s*\{\s*"@type"\s*:\s*"Person"\s*,\s*"name"\s*:\s*"Freddy Owen"\s*,\s*"url"\s*:\s*"https://winwithfred\.com"\s*\}',
        '"author": { "@type": "Person", "name": "Freddy Owen", "url": "https://winwithfred.com/about" }',
        content)

changes = []

for filepath in get_blog_files():
    with open(filepath, 'r', encoding='utf-8') as f:
        original = f.read()
    content = original

    content = fix_og_url(content)
    content = fix_schema_urls(content)
    content = fix_author_url(content)

    faq_schema = extract_faq_schema(content)
    if faq_schema:
        article_match = re.search(r'(<article[^>]*>)(.*?)(</article>)', content, re.DOTALL)
        if article_match:
            body = article_match.group(2)
            if not has_visual_faq(body):
                faq_html = build_faq_html(faq_schema)
                if faq_html:
                    new_body = body + faq_html
                    content = content[:article_match.start(2)] + new_body + content[article_match.start(3):]
                    if 'wf-faq-style' not in content:
                        content = content.replace('</head>', FAQ_STYLE + '</head>', 1)

    if 'author-box' not in content:
        content = content.replace('</article>', AUTHOR_BOX + '\n</article>', 1)

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        changes.append(filepath)
        print('Updated:', filepath)

print('\nTotal updated:', len(changes), 'files')
