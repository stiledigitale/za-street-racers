import base64, io, re, sys
from PIL import Image
U='/mnt/user-data/uploads/'
def ld(n): return Image.open(U+n+'-image.png').convert('RGBA')
def crop(im):
    a=im.split()[3].point(lambda v:255 if v>12 else 0); return im.crop(a.getbbox())
def fit_h(im,h): return im.resize((max(1,round(im.width*h/im.height)),h),Image.LANCZOS)
def b64(im,q=None):
    bio=io.BytesIO(); im.save(bio,'WEBP',quality=88,method=6); return 'data:image/webp;base64,'+base64.b64encode(bio.getvalue()).decode()
out={}
names=['100','200','300','400','500','600','700','800','900','1000']
files=['7fec273b','dde1ae6e','2e3877fa','9860c76b','b6c953c9','45514e5f','6bdf5455','d99863dd','37381ef7','ce095943']
signs={}
def sign(f,w):
    im=crop(ld(f)); a=im.split()[3]; W,H=im.size
    rows=[sum(1 for x in range(0,W,2) if a.getpixel((x,y))>40)*2 for y in range(H)]
    mx=max(rows); bb=max(y for y in range(H) if rows[y]>0.5*mx)
    cut=min(H,int(bb+bb*0.5)); im=im.crop((0,0,W,cut))
    return im.resize((w,round(cut*w/W)),Image.LANCZOS)
for n,f in zip(names,files): signs['s'+n]=sign(f,150)
signs['s402']=sign('07bf233d',150); signs['arrivo']=sign('5594c305',230)
for k,v in signs.items(): v.save('/home/claude/zsr/asset/nov22b/'+k+'.png')
print({k:v.size for k,v in signs.items()})
# ragazze: fotogrammi 4x4, riquadro comune
def sheet(f,h=280):
    im=ld(f); cw=im.width/4; ch=im.height/4; cells=[im.crop((round(c*cw),round(r*ch),round((c+1)*cw),round((r+1)*ch))) for r in range(4) for c in range(4)]
    boxes=[c.split()[3].point(lambda v:255 if v>12 else 0).getbbox() for c in cells]
    x0=min(b[0] for b in boxes);y0=min(b[1] for b in boxes);x1=max(b[2] for b in boxes);y1=max(b[3] for b in boxes)
    fr=[fit_h(c.crop((x0,y0,x1,y1)),h) for c in cells]
    # piedi: colonne con alfa nelle ultime righe
    a=cells[0].crop((x0,y0,x1,y1)).split()[3]; W,H=a.size; xs=[x for x in range(W) for y in range(int(H*0.93),H) if a.getpixel((x,y))>40]
    ax=(min(xs)+max(xs))/2/W
    return fr,ax
flag,axf=sheet('a2dd0acb'); fin,axn=sheet('131c9c29')
print('girls',flag[0].size,axf,fin[0].size,axn)
fac=fit_h(crop(ld('ce122530')),360)
veg={'bush':fit_h(crop(ld('184ed3dd')),150),'hedge1':fit_h(crop(ld('d8794a21')),110),'hedge2':fit_h(crop(ld('0e5e65ab')),110),'grass':fit_h(crop(ld('d66df019')),70),'tree':fit_h(crop(ld('5e436ebf')),320)}
print('fac',fac.size,{k:v.size for k,v in veg.items()})
s=open('src/assets.js').read()
def setconst(name,val):
    global s
    i=s.find('const '+name+' =')
    line='const '+name+' = '+val+';'
    if i<0: s=s.rstrip()+'\n'+line+'\n'
    else: j=s.index('\n',i); s=s[:i]+line+s[j:]
setconst('HOSTESS_FLAG','{ ax: %.3f, frames: [%s] }'%(axf,','.join('"%s"'%b64(x) for x in flag)))
setconst('HOSTESS_FINISH','{ ax: %.3f, frames: [%s] }'%(axn,','.join('"%s"'%b64(x) for x in fin)))
setconst('DIST_SIGNS','{ k: 2, '+', '.join('%s: "%s"'%(k,b64(v)) for k,v in signs.items())+' }')
setconst('VEG','{ k: 2, '+', '.join('%s: "%s"'%(k,b64(v)) for k,v in veg.items())+' }')
i=s.index('const BG_EXTRA = ['); j=s.index('\n',i); seg=s[i:j]
n=seg.count('"data:')
cutp = j-2 if n==4 else s.rindex(',"data:',i,j)
s=s[:cutp]+',"'+b64(fac)+'"];'+s[j:]
open('src/assets.js','w').write(s)
# recinzioni basse per il bordo dello schermo: tagliate da centro palo a centro palo per ripetersi senza giunte
def fence(f,h):
    im=crop(ld(f)); a=im.split()[3]; W,H=im.size
    y=int(H*0.45) if f in('f894f845','93b16823') else int(H*0.5)
    # pali: colonne opache su una riga dove la rete/legno è più rada -> uso copertura verticale
    cov=[sum(1 for yy in range(int(H*0.1),int(H*0.6),2) if a.getpixel((x,yy))>60) for x in range(W)]
    mx=max(cov); cols=[x for x in range(W) if cov[x]>0.92*mx]
    groups=[];
    for x in cols:
        if groups and x-groups[-1][-1]<=3: groups[-1].append(x)
        else: groups.append([x])
    c0=sum(groups[0])/len(groups[0]); c1=sum(groups[-1])/len(groups[-1])
    t=im.crop((round(c0),0,round(c1),H)); return t.resize((round(t.width*h/H),h),Image.LANCZOS), len(groups)
fl={}
for k,f,h in [('metal','f894f845',150),('wood','93b16823',150),('metalp','54eb517a',120),('woodp','986e44cc',120)]:
    fl[k],n=fence(f,h); print(k,fl[k].size,'pali',n); fl[k].save('/home/claude/zsr/asset/nov22b/f_'+k+'.png')
s=open('src/assets.js').read()
setconst('LOW_FENCE','{ k: 2, '+', '.join('%s: "%s"'%(k,b64(v)) for k,v in fl.items())+' }')
open('src/assets.js','w').write(s)
