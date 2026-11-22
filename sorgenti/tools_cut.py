from PIL import Image, ImageFilter
import numpy as np
from scipy import ndimage
im = Image.open('assets_in/buttons.png').convert('RGBA')
boxes = {'shift': (45,89,532,420), 'red': (584,89,1097,419), 'left': (1160,93,1633,420),
         'pause': (622,489,1060,870), 'nitro': (1139,497,1623,866), 'right': (67,512,542,851)}
def cut(box, pad=8):
    x0,y0,x1,y1 = box
    c = im.crop((x0-pad,y0-pad,x1+pad,y1+pad))
    return c
    a = np.array(c).astype(np.int16)
    white = a[:,:,:3].min(axis=2) > 225
    lab, n = ndimage.label(white)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:,0], lab[:,-1]]))) - {0}
    bg = np.isin(lab, list(border))
    bg = ndimage.binary_dilation(bg, iterations=1) & (a[:,:,:3].min(axis=2) > 170)
    alpha = np.where(bg, 0, 255).astype(np.uint8)
    am = Image.fromarray(alpha).filter(ImageFilter.GaussianBlur(0.8))
    c.putalpha(am)
    return c
import os; os.makedirs('assets', exist_ok=True)
for k,b in boxes.items():
    c = cut(b); c.save('assets_in/%s.png' % k); print(k, c.size)
