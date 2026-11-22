from PIL import Image, ImageDraw
import numpy as np, json, cv2
keys = ['set5_0','set5_1','set5_2','set10_0','set10_1','set10_2','set11_0','set11_1','set11_2']
W = {}
sheet = Image.new('RGBA', (3 * 640, 3 * 230), (233, 220, 198, 255))
for i, k in enumerate(keys):
    a = np.array(Image.open('cars_in/%s.png' % k)); h, w = a.shape[:2]
    g = cv2.cvtColor(a[:,:,:3], cv2.COLOR_RGB2GRAY); g[a[:,:,3] < 40] = 255
    g = cv2.GaussianBlur(g, (5,5), 1.5)
    found = []
    for side in (0, 1):
        x0, x1 = (0, w // 2) if side == 0 else (w // 2, w)
        sub = g[h // 3:, x0:x1]
        cs = cv2.HoughCircles(sub, cv2.HOUGH_GRADIENT, dp=1, minDist=500, param1=100, param2=25, minRadius=95, maxRadius=125)
        # cerchio della gomma: scegli quello con il bordo inferiore più vicino al fondo dell'auto
        best = None
        if cs is not None:
            for cx, cy, r in cs[0][:8]:
                cx, cy = int(cx + x0), int(cy + h // 3)
                col = np.where(a[:, cx, 3] > 60)[0]; bot = col[-1]
                score = abs((cy + r) - bot)
                if best is None or score < best[0]: best = (score, cx, cy, int(r), int(bot))
        _, cx, cy, r, bot = best
        # rifinitura: raggio = fondo opaco - centro; centro y = fondo - r
        # ricentra x come punto medio dei bordi scuri orizzontali alla quota del centro
        row = g[cy]; dark = row < 90
        lx = cx; 
        while lx > 0 and (dark[lx] or abs(lx - cx) < r * 0.8): lx -= 1
        rx = cx
        while rx < w - 1 and (dark[rx] or abs(rx - cx) < r * 0.8): rx += 1
        rr = int(bot - cy)
        found.append([cx, cy, rr, int(bot)])
    ground = max(f[3] for f in found)
    W[k] = {'wheels': [f[:3] for f in found], 'ground': int(ground), 'size': [w, h]}
    im = Image.fromarray(a); d = ImageDraw.Draw(im)
    for c in found: d.ellipse([c[0]-c[2], c[1]-c[2], c[0]+c[2], c[1]+c[2]], outline=(255, 0, 255, 255), width=4)
    im.thumbnail((620, 220)); sheet.alpha_composite(im, ((i % 3) * 640 + 10, (i // 3) * 230 + 5))
    print(k, found)
sheet.save('cars_in/wheels_check.png')
json.dump(W, open('cars_in/wheels.json', 'w'), indent=1)
