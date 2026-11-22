from PIL import Image, ImageDraw, ImageFilter
import numpy as np
im = Image.open('assets_in/red.png').convert('RGBA')
a = np.array(im).astype(np.float32)
# copertura del disco: campiona il rosso della faccia e ricostruisce la texture
top = a[80:90, 118:132, :3].reshape(-1,3).mean(0); bot = a[255:265, 118:132, :3].reshape(-1,3).mean(0)
print(top, bot)
H, W = a.shape[:2]
yy, xx = np.mgrid[0:H, 0:W]
mask = (((xx-262)/138.0)**2 + ((yy-165)/128.0)**2 <= 1) | ((xx>300)&(xx<398)&(yy>70)&(yy<265))
rng = np.random.default_rng(3)
red = (a[...,0]>140)&(a[...,1]<70)&(a[...,2]<70)&(~mask)&(xx>95)&(xx<445)
rowc = np.zeros((H,3))
for y in range(H):
    sel = red[y]
    rowc[y] = np.median(a[y][sel][:,:3],axis=0) if sel.sum()>8 else (rowc[y-1] if y else top)
from scipy.ndimage import uniform_filter1d
rowc = uniform_filter1d(rowc, 25, axis=0)
col = rowc[:,None,:].repeat(W,1)
noise = rng.normal(0, 7, (H, W, 1))
fill = np.clip(col + noise, 0, 255)
a[...,:3] = np.where(mask[...,None], fill, a[...,:3])
base = Image.fromarray(a.astype(np.uint8))
orig = Image.open('assets_in/red.png').convert('RGBA')
fm = Image.fromarray((mask*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(6))
base = Image.composite(base, orig, fm)
# icona pedale, disegnata in grande e ruotata
S = 4
ic = Image.new('RGBA', (260*S, 260*S), (0,0,0,0)); d = ImageDraw.Draw(ic)
cx, cy = 130*S, 120*S
d.rounded_rectangle([cx-62*S, cy-92*S, cx+62*S, cy+92*S], radius=26*S, fill=(20,17,28,255))
d.rounded_rectangle([cx-50*S, cy-80*S, cx+50*S, cy+80*S], radius=18*S, fill=(246,240,228,255))
for k in range(-3, 4):
    y = cy + k*20*S
    d.rounded_rectangle([cx-34*S, y-5*S, cx+34*S, y+5*S], radius=5*S, fill=(20,17,28,255))
ic = ic.rotate(-18, resample=Image.BICUBIC, center=(cx, cy))
d = ImageDraw.Draw(ic)
# leva e cerniera
d.rounded_rectangle([cx-14*S, cy+96*S, cx+50*S, cy+120*S], radius=10*S, fill=(20,17,28,255))
d.rounded_rectangle([cx-4*S, cy+102*S, cx+40*S, cy+114*S], radius=6*S, fill=(160,160,170,255))
ic = ic.resize((260, 260), Image.LANCZOS)
base.alpha_composite(ic, (262-130, 165-122))
base.save('assets_in/gas.png')
