"""Fogli 4x2 di Christian: tifosi (piedi allineati, alti 400) e piloti (sfondo bianco tolto, alti 360)."""
import sys, base64, io, re
from PIL import Image, ImageFilter
import numpy as np
from scipy import ndimage
def b64(im):
    b=io.BytesIO(); im.save(b,'WEBP',quality=88,method=6); return 'data:image/webp;base64,'+base64.b64encode(b.getvalue()).decode()
def cells(path, pad=0):
    S=Image.open(path).convert('RGBA'); W,H=S.size; cw,ch=W/4,H/2
    return [S.crop((round(c*cw)+pad,round(r*ch)+pad,round((c+1)*cw)-pad,round((r+1)*ch)-pad)) for r in range(2) for c in range(4)]
def cut_white(im):
    a=np.array(im).astype(int); white=(a[:,:,:3].min(2)>228)|(a[:,:,3]<20)
    lab,_=ndimage.label(white); border=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))-{0}
    al=Image.fromarray(np.where(np.isin(lab,list(border)),0,a[:,:,3]).astype(np.uint8)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
    out=im.copy(); out.putalpha(al); return out
def fan(path, outdir):
    fr=[cut_white(c) for c in cells(path)]; bbs=[f.getbbox() for f in fr]
    mw=max(b[2]-b[0] for b in bbs); mh=max(b[3]-b[1] for b in bbs); res=[]
    for f,b in zip(fr,bbs):
        im=f.crop(b); cv=Image.new('RGBA',(mw+8,mh+4)); cv.alpha_composite(im,(round((mw+8)/2-im.width/2),mh+4-im.height))
        s=400/cv.height; res.append(cv.resize((round(cv.width*s),400),Image.LANCZOS))
    s=open('src/assets.js').read(); k='const FANS = ['; i=s.index(k)
    s=s[:i+len(k)]+'['+','.join('"%s"'%b64(o) for o in res)+'],'+s[i+len(k):]; open('src/assets.js','w').write(s)
    for n,o in enumerate(res): o.save('%s/f%d.png'%(outdir,n))
def pilot(path, name, outdir):
    fr=[cut_white(c) for c in cells(path,6)]; bbs=[f.getbbox() for f in fr]
    u=(min(b[0] for b in bbs),min(b[1] for b in bbs),max(b[2] for b in bbs),max(b[3] for b in bbs)); res=[]
    for f in fr:
        im=f.crop(u); s=360/im.height; res.append(im.resize((round(im.width*s),360),Image.LANCZOS))
    p=open('src/pilots.js').read()
    p=p.replace("const PILOT_ANIM = [","const PILOT_ANIM = [{ name: '%s', frames: [%s] }, "%(name,','.join('"%s"'%b64(f) for f in res)),1); open('src/pilots.js','w').write(p)
    for n,o in enumerate(res): o.save('%s/p%d.png'%(outdir,n))
if __name__=='__main__':
    import os; os.makedirs(sys.argv[-1],exist_ok=True)
    fan(sys.argv[2],sys.argv[3]) if sys.argv[1]=='fan' else pilot(sys.argv[2],sys.argv[3],sys.argv[4])
