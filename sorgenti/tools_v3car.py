"""Auto v3 di Christian (bianche, senza ruote): ritaglio, passaruota, livelli vernice/resto, ruote."""
import numpy as np
from PIL import Image
def arches(im, ground_hint=None):
    a=np.array(im)[:,:,3]>40; H,W=a.shape
    # per ogni colonna: y del primo pixel opaco salendo dal fondo, se sotto c'e' trasparenza
    yb=np.full(W,-1)
    for x in range(W):
        col=np.where(a[:,x])[0]
        if len(col): yb[x]=col.max()
    bottom=np.percentile(yb[yb>0],90)
    thr=bottom-0.12*H; low=(yb>0)&(yb<thr)
    segs=[]; x=0
    while x<W:
        if low[x]:
            x0=x
            while x<W and low[x]: x+=1
            if x0>2 and x<W-2: segs.append((x-x0,x0,x))
        else: x+=1
    segs=sorted(sorted(segs)[-2:],key=lambda t:t[1])
    res=[]
    for _,x0,x1 in segs:
        X=np.arange(x0,x1).astype(float); Y=yb[x0:x1].astype(float)
        A=np.c_[2*X,2*Y,np.ones_like(X)]; b=X**2+Y**2
        cx,cy,c=np.linalg.lstsq(A,b,rcond=None)[0]; R=np.sqrt(c+cx**2+cy**2)
        res.append((cx,cy,R))
    return res,bottom

import cv2, base64, io, json, colorsys
def b64(im,q=90):
    b=io.BytesIO(); im.save(b,'WEBP',quality=q,method=6); return 'data:image/webp;base64,'+base64.b64encode(b.getvalue()).decode()
def debadge(im, cx, cy, rx, ry, col=(40,40,46), logo=True):
    """toglie il logo del marchio e mette il logo ZA scuro al suo posto"""
    a=np.array(im); rgb=np.ascontiguousarray(a[:,:,:3]); m=np.zeros(rgb.shape[:2],np.uint8)
    cv2.ellipse(m,(cx,cy),(rx,ry),0,0,360,255,-1)
    rgb=cv2.inpaint(rgb,m,9,cv2.INPAINT_TELEA); a[:,:,:3]=rgb; out=Image.fromarray(a)
    if not logo: return out
    lg=Image.open('/home/claude/zsr/asset/logo_za.png').convert('RGBA'); w=int(rx*2.6); lg=lg.resize((w,round(lg.height*w/lg.width)),Image.LANCZOS)
    la=np.array(lg); la[:,:,:3]=col; lg=Image.fromarray(la)
    out.alpha_composite(lg,(cx-lg.width//2,cy-lg.height//2)); return out
def build(path, cid, badge, black=False, ref_R=58.7, wheel_k=1.117, wy=250.4, rear=8.3, length_m=None, ground=316.0):
    im=Image.open(path).convert('RGBA'); a0=np.array(im); a0[a0[:,:,3]<40]=0
    n,lab,st,_=cv2.connectedComponentsWithStats((a0[:,:,3]>0).astype(np.uint8)); big=1+np.argmax(st[1:,cv2.CC_STAT_AREA]); a0[lab!=big]=0
    im=Image.fromarray(a0)
    BLOBS.clear()
    if black: im=clear_black_arches(im)
    blobs=sorted(BLOBS)[:2] if len(BLOBS)>=2 else None
    for bd in (badge if isinstance(badge,list) else [badge]):
        if bd[0]=='cut':   # ornamento sporgente: si toglie del tutto
            a1_=np.array(im); x0_,y0_,x1_,y1_=bd[1:]; a1_[y0_:y1_,x0_:x1_]=0; im=Image.fromarray(a1_); continue
        im=debadge(im,*bd)
    bb0=im.getbbox(); im=im.crop(bb0)
    if blobs and len(blobs)==2:   # il vano nero del disegno e' la ruota: centro e raggio presi da li'
        (a1,a2)=[(b[0]-bb0[0],b[1]-bb0[1],b[2]*1.07) for b in sorted(blobs)]
    else: (a1,a2),_=arches(im)
    R=(a1[2]+a2[2])/2; s=ref_R/R
    if length_m: s=length_m*140.3/im.width   # scala reale: la ZA 45 (4,44 m) e' il riferimento
    if length_m:
        # compromesso: carrozzeria in scala reale corretta un poco (max 8%) verso la misura dei passaruota,
        # ruota quasi uguale per tutte (61-70) e centrata nel passaruota
        RW=wheel_k*ref_R; f=min(1.08,max(0.92,(RW/(R*s))**0.5)); s*=f
        r=min(70.0,max(61.0,R*s)); wy=round(ground-r,1)
    im=im.resize((round(im.width*s),round(im.height*s)),Image.LANCZOS)
    cxs=[a1[0]*s+rear,a2[0]*s+rear]; cy=(a1[1]+a2[1])/2*s
    W=max(640,int(im.width+rear*2)); Hc=320
    oy=round(wy-cy)
    body=Image.new('RGBA',(W,Hc)); body.alpha_composite(im,(round(rear),oy))
    n=np.array(body).astype(float); al=n[:,:,3]
    hsv=np.array(body.convert('RGB').convert('HSV')).astype(float)
    S=hsv[:,:,1]/255; V=hsv[:,:,2]
    paint=(al>20)&(S<0.13)&(V>120)
    paint=cv2.morphologyEx(paint.astype(np.uint8),cv2.MORPH_OPEN,np.ones((2,2),np.uint8))>0
    gray=n[:,:,:3].mean(2)
    sh=np.zeros((Hc,W,4),np.uint8); sh[:,:,0]=sh[:,:,1]=sh[:,:,2]=np.clip(gray,0,255); sh[:,:,3]=np.where(paint,al,0)
    re=np.array(body); re[:,:,3]=np.where(paint,0,re[:,:,3])
    vmean=float(gray[paint].mean())
    if not length_m: r=wheel_k*ref_R; ground=wy+r
    glass=(al>20)&(hsv[:,:,0]>120)&(hsv[:,:,0]<160)&(S>0.35)
    mid=int((cxs[0]+cxs[1])/2); gy=np.where(glass[:int(wy-r*0.6),mid-40:mid+40].any(1))[0]
    belt=float(gy.max()+4) if len(gy) else 140.0
    col=np.where(al[:,mid]>20)[0]; sill=float(col.max()-4)
    sp={"w":W,"h":Hc,"ground":round(ground,1),"front":round(rear+im.width,1),"rear":rear,"ppm":141.04,"img":b64(body),
        "wheels":[{"x":round(cxs[0],1),"y":wy,"r":round(r,1)},{"x":round(cxs[1],1),"y":wy,"r":round(r,1)}],"v2":1}
    pa={"rest":b64(Image.fromarray(re)),"shade":b64(Image.fromarray(sh)),"vmean":round(vmean,1),"base":"#f4f4f4","belt":belt,"sill":sill,
        "door":round(mid+0.05*(cxs[1]-cxs[0]),1),"rims":[]}
    body.save('/tmp/v3/%s_body.png'%cid); Image.fromarray(sh).save('/tmp/v3/%s_shade.png'%cid); Image.fromarray(re).save('/tmp/v3/%s_rest.png'%cid)
    return sp,pa

BLOBS=[]
def clear_black_arches(im, keep=9, min_area=4000):
    """passaruota pieni di nero: toglie il nero pieno e lascia il bordo d'inchiostro"""
    a=np.array(im); a[a[:,:,3]<40]=0; al=a[:,:,3]>20; V=a[:,:,:3].max(2)
    dark=(al&(V<50)).astype(np.uint8)
    dist=cv2.distanceTransform(dark,cv2.DIST_L2,5)
    core=(dist>keep).astype(np.uint8)
    n,lab,st,_=cv2.connectedComponentsWithStats(core)
    rm=np.zeros_like(core)
    for i in range(1,n):
        if st[i,cv2.CC_STAT_AREA]>min_area and st[i,cv2.CC_STAT_WIDTH]>200 and st[i,cv2.CC_STAT_HEIGHT]>150:
            comp=(lab==i).astype(np.uint8)
            pts=cv2.findNonZero(comp); hull=cv2.convexHull(pts); hm=np.zeros_like(comp); cv2.fillPoly(hm,[hull],1)
            rm|=hm
            x,y,w,h=st[i,0],st[i,1],st[i,2],st[i,3]
            BLOBS.append((x+w/2,y+w/2,w/2))
            rm[y+h-2:y+h+keep+4, x+w//6:x+w-w//6]=1   # la riga d'inchiostro sotto al nero
    # allarga la zona tolta fino a lasciare 'keep' px di bordo
    rm=(cv2.dilate(rm,np.ones((3,3),np.uint8),iterations=keep-4)&dark)|rm
    a[rm>0,3]=0
    return Image.fromarray(a)
