from PIL import Image, ImageDraw
import numpy as np, json
keys = ['set5_0','set5_1','set5_2','set10_0','set10_1','set10_2','set11_0','set11_1','set11_2']
prev = json.load(open('cars_in/wheels.json'))
def fit(xs, ys):
    A = np.c_[2*xs, 2*ys, np.ones(len(xs))]; b = xs**2 + ys**2
    cx, cy, c = np.linalg.lstsq(A, b, rcond=None)[0]
    return cx, cy, np.sqrt(c + cx**2 + cy**2)
W = {}
sheet = Image.new('RGBA', (3 * 640, 3 * 230), (233, 220, 198, 255))
for i, k in enumerate(keys):
    a = np.array(Image.open('cars_in/%s.png' % k)); h, w = a.shape[:2]
    al = a[:,:,3] > 128
    bottom = np.array([np.where(al[:, x])[0][-1] if al[:, x].any() else -1 for x in range(w)])
    out = []
    for cx0, cy0, r0 in prev[k]['wheels']:
        r0 = max(r0, 95)
        # minimo locale del profilo inferiore vicino alla ruota
        lo = max(0, cx0 - int(r0 * 0.5)); hi = min(w, cx0 + int(r0 * 0.5))
        seg = bottom[lo:hi]; cxb = lo + int(np.argmax(seg))
        for it in range(3):
            span = int(r0 * 0.62)
            xs = np.arange(max(0, cxb - span), min(w, cxb + span)); ys = bottom[xs].astype(float)
            ok = ys > 0
            cx, cy, r = fit(xs[ok].astype(float), ys[ok])
            cxb, r0 = int(cx), r
        out.append([int(round(cx)), int(round(cy)), int(round(r))])
    ground = int(max(bottom))
    W[k] = {'wheels': out, 'ground': ground, 'size': [w, h]}
    im = Image.fromarray(a); d = ImageDraw.Draw(im)
    for c in out: d.ellipse([c[0]-c[2], c[1]-c[2], c[0]+c[2], c[1]+c[2]], outline=(255, 0, 255, 255), width=4)
    im.thumbnail((620, 220)); sheet.alpha_composite(im, ((i % 3) * 640 + 10, (i // 3) * 230 + 5))
    print(k, out, ground)
sheet.save('cars_in/wheels_check.png')
json.dump(W, open('cars_in/wheels.json', 'w'), indent=1)
