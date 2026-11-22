from PIL import Image, ImageDraw
import numpy as np, json
keys = ['set5_0','set5_1','set5_2','set10_0','set10_1','set10_2','set11_0','set11_1','set11_2']
rims = json.load(open('cars_in/rims.json'))
def fit(p):
    xs, ys = p[:,0], p[:,1]
    A = np.c_[2*xs, 2*ys, np.ones(len(xs))]; b = xs**2 + ys**2
    cx, cy, c = np.linalg.lstsq(A, b, rcond=None)[0]
    return np.array([cx, cy]), np.sqrt(c + cx**2 + cy**2)
out = {}
sheet = Image.new('RGBA', (6 * 300, 3 * 300), (233, 220, 198, 255))
n = 0
for k in keys:
    a = np.array(Image.open('cars_in/%s.png' % k)).astype(float); h, w = a.shape[:2]
    g = a[:,:,:3].mean(2); g[a[:,:,3] < 40] = 0
    R0 = max(r[2] for r in rims[k]['rims'])
    res = []
    for cx, cy, r in rims[k]['rims']:
        c = np.array([cx, cy], float); rr = float(R0)
        for it in range(4):
            pts = []
            for t in np.linspace(0, 2*np.pi, 120, endpoint=False):
                d = np.array([np.cos(t), np.sin(t)])
                rad = np.arange(rr * 0.8, rr * 1.25, 0.5)
                xy = c[None] + rad[:, None] * d[None]
                xi = np.clip(xy[:,0].astype(int), 0, w-1); yi = np.clip(xy[:,1].astype(int), 0, h-1)
                v = g[yi, xi]
                gr = v[:-3] - v[3:]          # calo luminoso verso l'esterno
                j = int(np.argmax(gr))
                if gr[j] > 40: pts.append(xy[j + 1])
            p = np.array(pts)
            c2, r2 = fit(p)
            dist = np.abs(np.linalg.norm(p - c2, axis=1) - r2)
            keep = dist < max(2.5, np.percentile(dist, 70))
            c, rr = fit(p[keep])
        res.append([round(float(c[0]), 1), round(float(c[1]), 1), round(float(rr), 1)])
    out[k] = {'rims': res, 'size': [w, h]}
    print(k, res)
    im = Image.fromarray(a.astype(np.uint8))
    for cx, cy, r in res:
        crop = im.crop((int(cx - 140), int(cy - 140), int(cx + 140), int(cy + 140))).copy()
        d = ImageDraw.Draw(crop); d.ellipse([140 - r, 140 - r, 140 + r, 140 + r], outline=(255, 0, 255, 255), width=2)
        d.line([135, 140, 145, 140], fill=(0,255,0,255)); d.line([140, 135, 140, 145], fill=(0,255,0,255))
        sheet.alpha_composite(crop.convert('RGBA'), ((n % 6) * 300 + 10, (n // 6) * 300 + 10)); n += 1
sheet.save('cars_in/rims_check.png')
json.dump(out, open('cars_in/rims2.json', 'w'), indent=1)
