from PIL import Image, ImageDraw
import numpy as np, json, cv2
keys = ['set5_0','set5_1','set5_2','set10_0','set10_1','set10_2','set11_0','set11_1','set11_2']
prev = json.load(open('cars_in/wheels.json'))
W = {}
sheet = Image.new('RGBA', (3 * 640, 3 * 230), (233, 220, 198, 255))
for i, k in enumerate(keys):
    a = np.array(Image.open('cars_in/%s.png' % k)); h, w = a.shape[:2]
    g = cv2.cvtColor(a[:,:,:3], cv2.COLOR_RGB2GRAY); g[a[:,:,3] < 40] = 0
    g = cv2.GaussianBlur(g, (5,5), 1.2)
    out = []
    for cx0, cy0, r0 in prev[k]['wheels']:
        x0, y0 = max(0, cx0 - 150), max(0, cy0 - 150)
        sub = g[y0:cy0 + 150, x0:cx0 + 150]
        cs = cv2.HoughCircles(sub, cv2.HOUGH_GRADIENT, dp=1, minDist=200, param1=90, param2=20, minRadius=55, maxRadius=92)
        c = cs[0][0]
        out.append([int(c[0] + x0), int(c[1] + y0), int(c[2])])
    # la base: fondo delle gomme = centro ruota + raggio gomma stimato
    W[k] = {'rims': out, 'size': [w, h]}
    im = Image.fromarray(a); d = ImageDraw.Draw(im)
    for c in out:
        d.ellipse([c[0]-c[2], c[1]-c[2], c[0]+c[2], c[1]+c[2]], outline=(255, 0, 255, 255), width=4)
        R = int(c[2] * 1.36); d.ellipse([c[0]-R, c[1]-R, c[0]+R, c[1]+R], outline=(0, 220, 255, 255), width=3)
    im.thumbnail((620, 220)); sheet.alpha_composite(im, ((i % 3) * 640 + 10, (i // 3) * 230 + 5))
    print(k, out)
sheet.save('cars_in/wheels_check.png')
json.dump(W, open('cars_in/rims.json', 'w'), indent=1)
