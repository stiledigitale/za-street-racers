# anteprima: ogni auto ricolorata in arancio senza livrea, accanto all'originale
from PIL import Image
import numpy as np, json, base64, io
P = json.load(open('src/paint.js').read().split('= ', 1)[1].rstrip(';\n') and open('/dev/null')) if False else None
src = open('src/paint.js').read(); P = json.loads(src[src.index('{'):src.rindex('}') + 1])
def dec(d): return Image.open(io.BytesIO(base64.b64decode(d.split(',', 1)[1]))).convert('RGBA')
keys = list(P)
sheet = Image.new('RGBA', (2 * 640, len(keys) * 215), (233, 220, 198, 255))
for i, k in enumerate(keys):
    rest = dec(P[k]['rest']); sh = np.array(dec(P[k]['shade'])).astype(float)
    col = np.array([255, 120, 20], float); l = sh[:, :, 0:1] / P[k]['vmean']
    c = np.where(l <= 1, col * l, col + (255 - col) * np.clip((l - 1) * 1.6, 0, 1))
    t = np.zeros(sh.shape, np.uint8); t[:, :, :3] = np.clip(c, 0, 255); t[:, :, 3] = sh[:, :, 3]
    img = Image.fromarray(t); img.alpha_composite(rest)
    orig = Image.open('cars_in/sprite_%s.png' % k)
    sheet.alpha_composite(orig, (10, i * 215 + 5)); sheet.alpha_composite(img, (650, i * 215 + 5))
sheet.save('cars_in/paint_check.png')
