"""Prepara le auto di Christian per il gioco:
- toglie i marchi registrati (scritte M Performance / AMG, stemmi sui mozzi) e mette "ZA RACING";
- ritaglia i cerchi come sprite separati, che nel gioco girano;
- scala a metà e salva in WebP con i metadati (ruote, terra, scala)."""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import numpy as np, cv2, json, base64, io

SRC = 'cars_in'
RIMS = json.load(open(SRC + '/rims2.json'))
FONT = '/usr/share/fonts/truetype/google-fonts/ofl/montserrat/Montserrat-Italic[wght].ttf'
SCALE = 0.5
PX_PER_M = 260.0   # 1194 px di berlina = circa 4,6 m

# rettangoli dei marchi: (x0, y0, x1, y1, tipo di pixel da togliere, testo sostitutivo, colore, altezza testo)
LOGOS = {
    'set5_0': [(428, 202, 762, 252, 'light', 'ZA RACING', (255, 255, 255), 40)],
    'set5_1': [(522, 200, 706, 252, 'light', 'ZA RACING', (255, 255, 255), 34)],
    'set11_0': [(418, 220, 748, 270, 'dark', 'ZA RACING', (20, 17, 28), 40), (38, 34, 124, 62, 'light', 'ZA', (240, 240, 240), 20)],
    'set11_1': [(413, 223, 755, 274, 'dark', 'ZA RACING', (20, 17, 28), 40), (40, 36, 118, 64, 'light', 'ZA', (240, 240, 240), 20)],
    'set11_2': [(413, 238, 750, 287, 'dark', 'ZA RACING', (20, 17, 28), 40), (38, 44, 118, 72, 'light', 'ZA', (240, 240, 240), 20)],
}

def font(px):
    f = ImageFont.truetype(FONT, px)
    try: f.set_variation_by_axes([850])
    except Exception: pass
    return f

def remove_logos(k, a):
    rgb = a[:, :, :3].copy()
    mask = np.zeros(a.shape[:2], np.uint8)
    for x0, y0, x1, y1, kind, *_ in LOGOS.get(k, []):
        sub = rgb[y0:y1, x0:x1].astype(int)
        lum = sub.mean(2)
        if kind == 'light':
            m = (lum > 150) | (sub[:, :, 1] > 140) | ((sub[:, :, 0] > 150) & (sub[:, :, 2] < 140) & (k == 'set5_0'))
        else:
            m = sub.max(2) < 80
            # non cancellare la linea della porta che attraversa la scritta
            col = m.mean(0)
            m[:, col > 0.85] = False
        mask[y0:y1, x0:x1] = m.astype(np.uint8) * 255
    if mask.any():
        mask = cv2.dilate(mask, np.ones((5, 5), np.uint8), iterations=1)
        rgb = cv2.inpaint(rgb, mask, 7, cv2.INPAINT_TELEA)
    a = a.copy(); a[:, :, :3] = rgb
    im = Image.fromarray(a)
    d = ImageDraw.Draw(im)
    for x0, y0, x1, y1, kind, text, color, px in LOGOS.get(k, []):
        f = font(px)
        tw = d.textlength(text, font=f)
        while tw > (x1 - x0) * 0.98 and px > 8:
            px -= 1; f = font(px); tw = d.textlength(text, font=f)
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        d.text((cx, cy), text, font=f, fill=color + (255,), anchor='mm')
    return im

def hubcap(im, cx, cy, r):
    """Copre lo stemma sul mozzo con un tappo neutro."""
    S = 4; R = r * 0.2
    lay = Image.new('RGBA', (int(R * 2 * S + 8), int(R * 2 * S + 8)), (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
    c = lay.width / 2
    d.ellipse([c - R * S, c - R * S, c + R * S, c + R * S], fill=(20, 17, 28, 255))
    d.ellipse([c - R * S * 0.82, c - R * S * 0.82, c + R * S * 0.82, c + R * S * 0.82], fill=(58, 58, 66, 255))
    d.ellipse([c - R * S * 0.45, c - R * S * 0.45, c + R * S * 0.45, c + R * S * 0.45], fill=(120, 120, 130, 255))
    d.ellipse([c - R * S * 0.25, c - R * S * 0.55, c + R * S * 0.05, c - R * S * 0.3], fill=(220, 220, 228, 200))
    lay = lay.resize((lay.width // S, lay.height // S), Image.LANCZOS)
    im.alpha_composite(lay, (int(round(cx - lay.width / 2)), int(round(cy - lay.height / 2))))

def cut_wheel(im, cx, cy, r):
    """Ritaglia il cerchio centrato al sub-pixel, con bordo morbido."""
    rc = r * 1.07
    size = int(np.ceil(rc * 2)) + 2
    off = size / 2
    # traslazione sub-pixel: il centro del cerchio va al centro dello sprite
    a = np.array(im)
    M = np.float32([[1, 0, off - cx], [0, 1, off - cy]])
    w = cv2.warpAffine(a, M, (size, size), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0))
    yy, xx = np.mgrid[0:size, 0:size]
    dist = np.sqrt((xx + 0.5 - off) ** 2 + (yy + 0.5 - off) ** 2)
    alpha = np.clip(rc - dist + 0.5, 0, 1)
    w[:, :, 3] = (w[:, :, 3] * alpha).astype(np.uint8)
    return Image.fromarray(w), rc

def b64(im, q=86):
    buf = io.BytesIO(); im.save(buf, 'WEBP', quality=q, method=6)
    return 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode(), len(buf.getvalue())

out, total = {}, 0
for k in sorted(RIMS):
    a = np.array(Image.open('%s/%s.png' % (SRC, k)).convert('RGBA'))
    im = remove_logos(k, a)
    rims = RIMS[k]['rims']
    for cx, cy, r in rims: hubcap(im, cx, cy, r)
    im.save('%s/proc_%s.png' % (SRC, k))
    al = np.array(im)[:, :, 3] > 60
    h, w = al.shape
    # terra: fondo opaco sotto i due mozzi
    ground = max(int(np.where(al[:, int(cx)])[0][-1]) for cx, cy, r in rims)
    xs = np.where(al.any(0))[0]
    wheels = []
    for i, (cx, cy, r) in enumerate(rims):
        wim, rc = cut_wheel(im, cx, cy, r)
        ws = wim.resize((max(2, round(wim.width * SCALE)), max(2, round(wim.height * SCALE))), Image.LANCZOS)
        d, n = b64(ws); total += n
        wheels.append({'x': round(cx * SCALE, 2), 'y': round(cy * SCALE, 2), 'r': round(rc * SCALE, 2), 'img': d})
    body = im.resize((round(w * SCALE), round(h * SCALE)), Image.LANCZOS)
    d, n = b64(body); total += n
    body.save('%s/sprite_%s.png' % (SRC, k))
    out[k] = {'w': body.width, 'h': body.height, 'ground': round(ground * SCALE, 1), 'front': round((xs[-1] + 1) * SCALE, 1),
              'rear': round(xs[0] * SCALE, 1), 'ppm': PX_PER_M * SCALE, 'wheels': wheels, 'img': d}
    print(k, body.size, 'ground', ground, 'kB', n // 1024)
print('totale kB', total // 1024)
js = '/* Auto di Christian: marchi rimossi, cerchi separati per farli girare */\nconst CAR_SPRITES = ' + json.dumps(out) + ';\n'
open('src/sprites.js', 'w').write(js)
