#!/usr/bin/env python3
"""QA-only renderer variant. Patches generated pages in a disposable checkout.
Never modifies game.html, security hashes, or tracked production assets."""
from pathlib import Path
import sys
root=Path(__file__).resolve().parents[1]
old='const dpr=Math.min(devicePixelRatio||1,COARSE?1.5:2),w=Math.round(cv.clientWidth*dpr),h=Math.round(cv.clientHeight*dpr);'
new=("const requestedScale=(()=>{try{const v=new URLSearchParams(location.search).get('skylineRenderScale');"
     "return v===null?null:Number(v)}catch(e){return null}})();"
     "const safeScale=Number.isFinite(requestedScale)&&requestedScale>=1&&requestedScale<=3?requestedScale:null;"
     "const dpr=Math.min(devicePixelRatio||1,safeScale===null?(COARSE?1.5:2):safeScale),"
     "w=Math.round(cv.clientWidth*dpr),h=Math.round(cv.clientHeight*dpr);")
texture_old='const bc=cnv(2048,2048,drawBoard);'
texture_new=("const qaTextureSize=new URLSearchParams(location.search).get('skylineBoardTexture')==='4096'?4096:2048;"
             "const bc=cnv(qaTextureSize,qaTextureSize,drawBoard);")
label_old='ctx.globalAlpha=.7;f.lines.forEach((l,k)=>ctx.fillText(l,0,y+k*f.s*1.1));ctx.globalAlpha=1'
label_new=("ctx.globalAlpha=new URLSearchParams(location.search).get('skylineLabelContrast')==='high'?1:.7;"
           "f.lines.forEach((l,k)=>ctx.fillText(l,0,y+k*f.s*1.1));ctx.globalAlpha=1")
pages=['index.html','web-play.html','web-board.html','web-follow.html','web-correction.html','web-menus.html']
for name in pages:
    p=root/name
    s=p.read_text(encoding='utf-8')
    if s.count(old)!=1:
        sys.exit(f'Unexpected renderer signature in {name}: {s.count(old)}')
    if s.count(texture_old)!=1:
        sys.exit(f'Unexpected board texture signature in {name}: {s.count(texture_old)}')
    if s.count(label_old)!=1:
        sys.exit(f'Unexpected label signature in {name}: {s.count(label_old)}')
    p.write_text(s.replace(old,new).replace(texture_old,texture_new).replace(label_old,label_new),encoding='utf-8')
print('Patched generated pages for isolated rendering experiment; game.html unchanged')
