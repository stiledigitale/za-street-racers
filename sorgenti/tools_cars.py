from PIL import Image
import numpy as np, cv2, json
from scipy import ndimage
def boxes_for(f):
    a = np.array(Image.open('cars_in/%s.png' % f).convert('RGBA'))
    al = a[:,:,3] > 20
    rows = al.sum(1)
    # separa le auto sulle righe quasi vuote
    cuts, inside, start = [], False, 0
    for y, v in enumerate(rows):
        if v > 30 and not inside: inside, start = True, y
        elif v <= 30 and inside:
            inside = False
            if y - start > 150: cuts.append((start, y))
    if inside: cuts.append((start, len(rows)))
    out = []
    for y0, y1 in cuts:
        cols = al[y0:y1].sum(0); xs = np.where(cols > 2)[0]
        out.append((int(xs[0]), y0, int(xs[-1]) + 1, y1))
    return a, out
res = {}
for f in ['set5', 'set10', 'set11']:
    a, bx = boxes_for(f)
    print(f, bx)
    for i, (x0, y0, x1, y1) in enumerate(bx):
        c = a[y0:y1, x0:x1]
        Image.fromarray(c).save('cars_in/%s_%d.png' % (f, i))
        g = cv2.cvtColor(c[:,:,:3], cv2.COLOR_RGB2GRAY)
        g = cv2.medianBlur(g, 5)
        cs = cv2.HoughCircles(g, cv2.HOUGH_GRADIENT, dp=1.2, minDist=300, param1=120, param2=40, minRadius=75, maxRadius=125)
        circ = [] if cs is None else sorted([[int(v) for v in cc] for cc in cs[0]], key=lambda z: z[0])
        print('  ', i, c.shape[1], c.shape[0], circ[:4])
        res['%s_%d' % (f, i)] = {'size': [c.shape[1], c.shape[0]], 'circles': circ}
json.dump(res, open('cars_in/detect.json', 'w'), indent=1)
