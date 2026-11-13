#!/usr/bin/env python3
"""Checks every quote in src/data/lines.json and src/data/questions.json
word for word against public-domain source texts (downloaded once into
.sources/, which is git-ignored). Run: python3 tools/verify-quotes.py"""
import glob, html, json, os, re, sys, time, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, '.sources')
UA = {'User-Agent': 'quote-check-script/1.0'}
GUTENBERG = {'marcus': 15877, 'epictetus': 10661, 'emerson': 2944}
SENECA_LETTERS = [1, 2, 3, 5, 6, 7, 9, 13, 16, 18, 24, 28, 41, 47, 51, 53, 56, 71, 78, 91, 96, 98, 104, 107, 123]

def fetch(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60).read().decode('utf-8')

def ensure_sources():
    os.makedirs(SRC, exist_ok=True)
    for name, gid in GUTENBERG.items():
        p = os.path.join(SRC, name + '.txt')
        if not os.path.exists(p):
            open(p, 'w').write(fetch(f'https://www.gutenberg.org/cache/epub/{gid}/pg{gid}.txt'))
    for n in SENECA_LETTERS:
        p = os.path.join(SRC, f'seneca{n}.txt')
        if not os.path.exists(p):
            t = fetch(f'https://en.wikisource.org/w/index.php?title=Moral_letters_to_Lucilius/Letter_{n}&action=render')
            t = re.sub(r'<sup.*?</sup>', '', t, flags=re.S)
            open(p, 'w').write(html.unescape(re.sub(r'<[^>]+>', ' ', t)))
            time.sleep(0.4)

def norm(t):
    t = t.replace('\r', ' ').replace('’', "'").replace('‘', "'").replace('“', '"').replace('”', '"')
    t = t.replace('—', '--').replace('​', '')
    return re.sub(r'\s+', ' ', t).strip().lower()

def excerpt(q):
    """A quote may end earlier than the original sentence: ignore its final punctuation."""
    return re.sub(r'[.;,:!?"]+$', '', norm(q)).strip()

def marcus_book(raw, quote):
    """Which book (I-XII) of Long's Meditations contains the quote."""
    lines = raw.replace('\r', '').split('\n')
    offsets, parts, total = [], [], 0
    for l in lines:
        n = norm(l)
        offsets.append(total)
        if n:
            parts.append(n + ' ')
            total += len(n) + 1
    joined = ''.join(parts)
    pos = joined.find(excerpt(quote))
    if pos < 0:
        return None
    book = None
    for i, l in enumerate(lines):
        if offsets[i] > pos:
            break
        if i > 2000 and re.fullmatch(r'[IVX]{1,4}\.', l.strip()):
            book = l.strip()[:-1]
    return book

def main():
    ensure_sources()
    texts = {os.path.basename(p)[:-4]: open(p).read() for p in glob.glob(os.path.join(SRC, '*.txt'))}
    normed = {k: norm(v) for k, v in texts.items()}
    quotes = json.load(open(os.path.join(ROOT, 'src/data/lines.json')))
    quotes += json.load(open(os.path.join(ROOT, 'src/data/questions.json')))['quotes']
    bad = 0
    for q in quotes:
        key = {'Marcus Aurelius': 'marcus', 'Epictetus': 'epictetus', 'Ralph Waldo Emerson': 'emerson'}.get(q['author'])
        if q['author'].startswith('Seneca'):
            n = re.search(r'Lucilius, (\d+)', q['work']).group(1)
            key = f'seneca{n}'
        found = key in normed and excerpt(q['text']) in normed[key]
        note = ''
        if found and key == 'marcus':
            book = marcus_book(texts['marcus'], q['text'])
            claimed = re.search(r'Meditations, ([IVX]+)\.', q['work']).group(1)
            if book != claimed:
                found = False
                note = f' (found in book {book}, work says {claimed})'
        print(('ok   ' if found else 'FAIL ') + q['text'][:70] + note)
        bad += not found
    print(f'\n{len(quotes) - bad}/{len(quotes)} quotes verified')
    sys.exit(1 if bad else 0)

if __name__ == '__main__':
    main()
