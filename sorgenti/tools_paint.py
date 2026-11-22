"""Vernice pulita per le auto di Christian.
Per ogni auto separa la vernice dal resto (vetri, fari, plastiche nere, contorni), toglie la livrea
originale dalla vernice e salva:
  rest  = l'auto senza la vernice (buchi dove va il colore nuovo)
  shade = la luminosità della vernice pulita, da colorare nel gioco
  rim   = la luminosità dei cerchi, da colorare nel gioco
Più i riferimenti per disegnare le livree: linea di cintura, sottoporta, porta."""
from PIL import Image
import numpy as np, cv2, json, base64, io

SRC = 'cars_in'
SCALE = 0.5
RIMS = json.load(open(SRC + '/rims2.json'))

# geometria misurata sulle immagini originali (pixel delle auto ritagliate)
G = {
    'set5_0': dict(kind='color', sample=(300, 170),
                   glass=[[(250, 100), (330, 40), (480, 22), (555, 22), (650, 40), (750, 100), (745, 128), (262, 128)]],
                   mirror=[(675, 92, 742, 142)], lights=[], livery=[(330, 155, 805, 310)]),
    'set10_0': dict(kind='color', sample=(300, 190),
                    glass=[[(255, 100), (330, 40), (480, 25), (560, 25), (660, 45), (750, 100), (742, 127), (265, 127)]],
                    mirror=[(688, 92, 748, 142)], lights=[], livery=[(350, 165, 810, 310)]),
    'set5_1': dict(kind='color', sample=(300, 170), lights=[[(50, 148), (78, 128), (155, 132), (150, 162), (98, 195), (55, 190)]],
                   livery=[(165, 125, 795, 310)]),
    'set10_1': dict(kind='color', sample=(300, 180), lights=[[(40, 150), (68, 128), (145, 132), (140, 162), (88, 198), (45, 192)]],
                    livery=[(315, 160, 815, 330)]),
    'set5_2': dict(kind='color', sample=(300, 120), lights=[[(55, 95), (100, 95), (100, 255), (55, 255)], [(825, 190), (875, 190), (875, 215), (825, 215)]],
                   livery=[(290, 160, 805, 354)], keep=[(525, 188, 602, 220)]),
    'set10_2': dict(kind='white', sample=(300, 100), lights=[], livery=[(100, 140, 670, 302)], keep=[(545, 178, 617, 207)]),
    'set11_0': dict(kind='white', sample=(300, 175), lights=[], livery=[(400, 210, 770, 285)]),
    'set11_1': dict(kind='color', sample=(300, 200),
                    glass=[[(160, 112), (200, 55), (330, 35), (520, 28), (565, 28), (700, 48), (805, 110), (795, 132), (172, 128)]],
                    mirror=[(708, 88, 782, 142)], lights=[], livery=[(395, 212, 775, 292)]),
    'set11_2': dict(kind='white', sample=(300, 190), lights=[], livery=[(395, 226, 770, 304)]),
}

def b64(im, q=86):
    buf = io.BytesIO(); im.save(buf, 'WEBP', quality=q, method=6)
    return 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode(), len(buf.getvalue())

def hue_dist(h, h0):
    d = np.abs(h - h0); return np.minimum(d, 256 - d)

out, total = {}, 0
for k, g in G.items():
    a = np.array(Image.open('%s/proc_%s.png' % (SRC, k)).convert('RGBA'))
    H, W = a.shape[:2]
    rgb = a[:, :, :3]
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV_FULL).astype(int)
    h, s, v = hsv[:, :, 0], hsv[:, :, 1], hsv[:, :, 2]
    opaque = a[:, :, 3] > 200
    sx, sy = g['sample']
    if g['kind'] == 'color':
        hh = h[sy - 8:sy + 8, sx - 8:sx + 8].astype(float) / 256 * 2 * np.pi
        h0 = int(round((np.arctan2(np.sin(hh).mean(), np.cos(hh).mean()) % (2 * np.pi)) / (2 * np.pi) * 256)) % 256
        near = hue_dist(h, h0)
        paint = (near < 22) & (s > 60) & (v > 35)
    else:
        near = None
        paint = (s < 50) & (v > 115)
    paint &= opaque
    excl = np.zeros((H, W), np.uint8)
    for poly in g.get('glass', []): cv2.fillPoly(excl, [np.array(poly, np.int32)], 1)
    for x0, y0, x1, y1 in g.get('mirror', []): excl[y0:y1, x0:x1] = 0
    for poly in g['lights']: cv2.fillPoly(excl, [np.array(poly, np.int32)], 1)
    wheelzone = np.zeros((H, W), np.uint8)
    for cx, cy, r in RIMS[k]['rims']:
        cv2.circle(excl, (int(cx), int(cy)), int(r * 1.1), 1, -1)
        cv2.circle(wheelzone, (int(cx), int(cy)), int(r * 1.45), 1, -1)
    paint &= excl == 0
    # bordi: la vernice si allarga di 2 px sui contorni scuri e sui pixel della stessa tinta
    grow = cv2.dilate(paint.astype(np.uint8), np.ones((5, 5), np.uint8)).astype(bool)
    okgrow = (v < 110) | ((near < 32) & (s > 40) if near is not None else (s < 70))
    paint |= grow & okgrow & opaque & (excl == 0)

    # livrea originale: dentro le sue zone la vernice viene ridipinta in tinta unita
    dark = (v < 75).astype(np.uint8)
    seams = cv2.morphologyEx(dark, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (1, 45)))
    blobs = cv2.morphologyEx(dark, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (11, 11)))
    seams = seams & (1 - cv2.dilate(blobs, np.ones((5, 5), np.uint8)))
    seams = cv2.dilate(seams, np.ones((3, 5), np.uint8)).astype(bool)
    zone = np.zeros((H, W), np.float32)
    for x0, y0, x1, y1 in g['livery']: zone[y0:y1, x0:x1] = 1
    for x0, y0, x1, y1 in g.get('keep', []): zone[y0:y1, x0:x1] = 0
    zhard = zone > 0.5
    ok = opaque & (excl == 0) & ~seams & ~((wheelzone > 0) & (v < 95))
    # segni della livrea: colori diversi dalla vernice, oppure macchie (non linee sottili) più chiare o più scure
    med = cv2.medianBlur(v.astype(np.uint8), 41).astype(int)
    odd_color = zhard & ~paint & ok
    odd_bright = (zhard & (np.abs(v - med) > 24)).astype(np.uint8)
    odd_bright = cv2.morphologyEx(odd_bright, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8)).astype(bool)
    marks = cv2.dilate((odd_color | odd_bright).astype(np.uint8), np.ones((7, 7), np.uint8)).astype(bool) & zhard & ok
    liv = marks
    full = paint | marks
    # base pulita nelle zone della livrea: luminosità di fondo presa dalla vernice fuori dalle zone
    w = (paint & ~zhard).astype(np.float32)
    vf = v.astype(np.float32)
    vs = np.zeros_like(vf); got = np.zeros_like(vf)
    for sg in (10, 24, 60, 150):
        num = cv2.GaussianBlur(vf * w, (0, 0), sg); den = cv2.GaussianBlur(w, (0, 0), sg)
        est = num / np.maximum(den, 1e-6)
        wt = np.clip(den / 0.15, 0, 1) * (1 - got)
        vs += est * wt; got += wt
    vs = vs + vf * (1 - got)
    # sopra la base, il dettaglio fine dell'originale (pieghe, nervature, riflessi), tranne dove c'erano i segni
    detail = np.clip(vf - cv2.GaussianBlur(vf, (0, 0), 5), -45, 45)
    msoft = np.clip(cv2.GaussianBlur(marks.astype(np.float32), (0, 0), 2.0) * 1.5, 0, 1)
    zsoft = np.clip(cv2.GaussianBlur(zhard.astype(np.float32), (0, 0), 6) * 1.2, 0, 1) * full
    inside = vs + detail * (1 - msoft)
    vv = vf * (1 - zsoft) + inside * zsoft
    vv = np.clip(vv, 0, 255).astype(np.uint8)
    vmean = float(np.median(vv[paint & ~zhard])) if (paint & ~zhard).any() else 200.0
    base = np.median(rgb[paint & ~zhard], axis=0).astype(int).tolist()

    m = cv2.GaussianBlur(full.astype(np.float32), (0, 0), 0.8)
    m = np.clip(m * 1.15, 0, 1) * opaque
    rest = a.copy(); rest[:, :, 3] = (a[:, :, 3] * (1 - m)).astype(np.uint8)
    shade = np.zeros((H, W, 4), np.uint8)
    shade[:, :, 0] = shade[:, :, 1] = shade[:, :, 2] = vv
    shade[:, :, 3] = (m * 255).astype(np.uint8)
    sz = (round(W * SCALE), round(H * SCALE))
    d_rest, n1 = b64(Image.fromarray(rest).resize(sz, Image.LANCZOS))
    d_shade, n2 = b64(Image.fromarray(shade).resize(sz, Image.LANCZOS), 90)
    total += n1 + n2

    # riferimenti per le livree (in pixel dello sprite ridotto)
    rims = RIMS[k]['rims']
    door = int((rims[0][0] + rims[1][0]) / 2)
    col = full[:, door]
    ys = np.where(col)[0]
    belt, sill = int(ys[0]), int(ys[-1])
    # la cintura: primo tratto di vernice continuo sotto i vetri
    runs = np.split(ys, np.where(np.diff(ys) > 6)[0] + 1)
    big = max(runs, key=len); belt, sill = int(big[0]), int(big[-1])

    # cerchi: luminosità delle razze e del canale, da colorare
    rimsh = []
    for cx, cy, r in rims:
        rc = r * 1.07; size = int(np.ceil(rc * 2)) + 2; off = size / 2
        M = np.float32([[1, 0, off - cx], [0, 1, off - cy]])
        wv = cv2.warpAffine(a, M, (size, size), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0))
        whsv = cv2.cvtColor(wv[:, :, :3], cv2.COLOR_RGB2HSV_FULL).astype(int)
        yy, xx = np.mgrid[0:size, 0:size]
        dist = np.sqrt((xx + 0.5 - off) ** 2 + (yy + 0.5 - off) ** 2) / r
        rm = ((dist > 0.24) & (dist < 0.86) & (whsv[:, :, 2] > 85)) | ((dist >= 0.86) & (dist < 0.99) & (whsv[:, :, 1] > 90) & (whsv[:, :, 2] > 70))
        rm = cv2.GaussianBlur(rm.astype(np.float32), (0, 0), 0.7)
        rimg = np.zeros((size, size, 4), np.uint8)
        rimg[:, :, 0] = rimg[:, :, 1] = rimg[:, :, 2] = whsv[:, :, 2]
        rimg[:, :, 3] = (rm * 255).astype(np.uint8)
        rv = float(np.median(whsv[:, :, 2][rm > 0.5])) if (rm > 0.5).any() else 180.0
        ri = Image.fromarray(rimg).resize((max(2, round(size * SCALE)),) * 2, Image.LANCZOS)
        d_rim, n3 = b64(ri, 90); total += n3
        rimsh.append({'img': d_rim, 'vmean': rv})
    out[k] = {'rest': d_rest, 'shade': d_shade, 'vmean': vmean, 'base': '#%02x%02x%02x' % tuple(base),
              'belt': round(belt * SCALE, 1), 'sill': round(sill * SCALE, 1), 'door': round(door * SCALE, 1), 'rims': rimsh}
    Image.fromarray(rest).save('%s/rest_%s.png' % (SRC, k))
    vis = np.zeros((H, W, 4), np.uint8); vis[:, :, 0] = 255; vis[:, :, 3] = (liv * 200).astype(np.uint8)
    Image.fromarray(vis).save('%s/liv_%s.png' % (SRC, k))
    print(k, 'kind', g['kind'], 'vmean', round(vmean), 'base', out[k]['base'], 'belt', belt, 'sill', sill)
print('totale kB', total // 1024)
open('src/paint.js', 'w').write('/* Vernice pulita, separata dal resto dell\'auto, e cerchi da colorare */\nconst CAR_PAINT = ' + json.dumps(out) + ';\n')
