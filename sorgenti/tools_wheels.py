from PIL import Image, ImageDraw
import numpy as np, json
det = json.load(open('cars_in/detect.json'))
keys = sorted(det)
W = {}
def refine(a, cx, cy, r0):
    # raggio esterno della gomma: ultimo anello scuro prima dello sfondo o della carrozzeria chiara
    best = None
    g = a[:,:,:3].mean(2); al = a[:,:,3]
    angs = np.linspace(np.pi * 0.15, np.pi * 0.85, 40)  # metà inferiore (verso terra), y in basso
    rs = []
    for t in angs:
        last_dark = None
        for r in range(int(r0 * 0.7), int(r0 * 1.45)):
            x = int(cx + np.cos(t) * r); y = int(cy + np.sin(t) * r)
            if y >= a.shape[0] or x < 0 or x >= a.shape[1]: break
            if al[y, x] < 60: break
            if g[y, x] < 70: last_dark = r
        if last_dark: rs.append(last_dark)
    return int(np.median(rs)) if rs else r0
sheet = Image.new('RGBA', (3 * 640, 3 * 230), (233, 220, 198, 255))
for i, k in enumerate(keys):
    a = np.array(Image.open('cars_in/%s.png' % k))
    h, w = a.shape[:2]
    cs = [c for c in det[k]['circles'] if c[1] > h * 0.55]
    rear = min(cs, key=lambda c: c[0]); front = max(cs, key=lambda c: c[0])
    out = []
    for c in (rear, front):
        r = refine(a, c[0], c[1], c[2]); out.append([c[0], c[1], r])
    # base = punto più basso delle gomme
    ground = max(c[1] + c[2] for c in out)
    W[k] = {'wheels': out, 'ground': ground, 'size': [w, h]}
    im = Image.fromarray(a); d = ImageDraw.Draw(im)
    for c in out: d.ellipse([c[0]-c[2], c[1]-c[2], c[0]+c[2], c[1]+c[2]], outline=(255, 0, 255, 255), width=4)
    d.line([0, ground, w, ground], fill=(0, 200, 255, 255), width=3)
    im.thumbnail((620, 220)); sheet.alpha_composite(im, ((i % 3) * 640 + 10, (i // 3) * 230 + 5))
    print(k, out, ground, w, h)
sheet.save('cars_in/wheels_check.png')
json.dump(W, open('cars_in/wheels.json', 'w'), indent=1)
