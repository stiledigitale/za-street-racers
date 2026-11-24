import sys
src=open('src/index.html').read()
for tag,f in [('I18N','i18n.js'),('ASSETS','assets.js'),('PILOTS','pilots.js'),('SPRITES','sprites.js'),('CARS3','cars3.js'),('SIM','sim.js'),('NET','net.js'),('AUDIO','audio.js'),('GARDA','garda.js'),('RENDER','render.js'),('GAME','game.js')]:
    src=src.replace('/*%s*/'%tag, open('src/'+f).read())
open('dist/index.html','w').write(src)
print(len(src))
