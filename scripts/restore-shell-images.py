# Restore real image URLs (kept lazy) in the SSR-shell captures.
# The neutralize commit (1a7891d) replaced every <img src> with a 1px data-GIF
# to stop shell images starving the runtime boot. Now that navigation is
# in-app (one boot per session) we want the shell to be a complete site again:
# real srcs recovered from the pre-neutralize commit, loading="lazy" retained.
import re
import subprocess
import sys

PIXEL = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=='
FILES = ['about', 'contact', 'events', 'exp', 'gallery', 'gang', 'home', 'news', 'partners', 'shop']
REF = '6fdd075'

img_re = re.compile(r'<img\b[^>]*>')
src_re = re.compile(r'src="([^"]*)"')
tpl_re = re.compile(r'data-dc-tpl="([^"]*)"')

total = 0
for name in FILES:
    path = f'app/_rendered/{name}.html'
    try:
        old = subprocess.run(['git', 'show', f'{REF}:{path}'], capture_output=True, text=True, encoding='utf-8', check=True).stdout
    except subprocess.CalledProcessError:
        print(f'{name}: not in {REF}, skipped')
        continue
    cur = open(path, encoding='utf-8').read()

    # queue of real srcs per template-node id, in document order
    queues = {}
    for tag in img_re.findall(old):
        m_src, m_tpl = src_re.search(tag), tpl_re.search(tag)
        if m_src:
            key = m_tpl.group(1) if m_tpl else '_'
            queues.setdefault(key, []).append(m_src.group(1))

    count = 0

    def swap(tag_match):
        global count
        tag = tag_match.group(0)
        m_src, m_tpl = src_re.search(tag), tpl_re.search(tag)
        if not m_src or m_src.group(1) != PIXEL:
            return tag
        key = m_tpl.group(1) if m_tpl else '_'
        q = queues.get(key)
        if not q:
            return tag
        real = q.pop(0)
        if real == PIXEL or real.startswith('data:'):
            return tag
        count += 1
        return tag.replace(f'src="{PIXEL}"', f'src="{real}"', 1)

    out = img_re.sub(swap, cur)
    open(path, 'w', encoding='utf-8').write(out)
    total += count
    print(f'{name}: restored {count} image srcs')

print(f'TOTAL: {total}')
