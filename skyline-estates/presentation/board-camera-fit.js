/* Fit a set of world points into the free screen area between HUD panels (insets in CSS px), without animation.
   Distance comes from a bounded binary search on the projected size; a view offset then centres the board in the free area,
   so picking/raycasting (which uses the same projection matrix) stays exact. */
export function fitToFree(THREE,camera,pts,rect,place,{zoom=1,margin=.96}={}){
 camera.aspect=rect.w/rect.h;camera.clearViewOffset();camera.updateProjectionMatrix();
 const f=rect.free||{l:0,r:0,t:0,b:0},W=rect.w,H=rect.h,xL=-1+2*f.l/W,xR=1-2*f.r/W,yT=1-2*f.t/H,yB=-1+2*f.b/H,fw=(xR-xL)*margin,fh=(yT-yB)*margin;
 const box=()=>{let a=1e9,b=-1e9,c=1e9,d=-1e9;for(const p of pts){const v=p.clone().project(camera);a=Math.min(a,v.x);b=Math.max(b,v.x);c=Math.min(c,v.y);d=Math.max(d,v.y)}return[a,b,c,d]};
 let lo=1,hi=400;for(let i=0;i<42;i++){const m=(lo+hi)/2;place(m);const[a,b,c,d]=box();if(b-a<=fw&&d-c<=fh)hi=m;else lo=m}
 place(hi/zoom);const[a,b,c,d]=box(),dx=(xL+xR)/2-(a+b)/2,dy=(yT+yB)/2-(c+d)/2;
 if(zoom===1){camera.setViewOffset(W,H,-dx*W/2,dy*H/2,W,H);camera.updateProjectionMatrix()}
 return{distance:hi/zoom,free:f}}
