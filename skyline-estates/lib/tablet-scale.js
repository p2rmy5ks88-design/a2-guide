/* iPad and other tablets (Apple reviews on iPad): lay the page out 25% smaller and let the system scale it up,
   so text, buttons and panels have the same physical size as on a phone instead of looking tiny.
   Phones and desktop browsers are untouched. Runs before the page lays out. */
(function(){try{
 var ua=navigator.userAgent,touch=(navigator.maxTouchPoints||0)>1,s=Math.min(screen.width,screen.height),l=Math.max(screen.width,screen.height);
 var tablet=(/iPad/.test(ua)||(/Macintosh/.test(ua)&&touch)||(/Android/.test(ua)&&!/Mobile/.test(ua)))&&s>=700;
 if(!tablet)return;
 var m=document.querySelector('meta[name="viewport"]');if(!m)return;
 var fit=function(){var portrait=matchMedia('(orientation: portrait)').matches;m.setAttribute('content','width='+Math.round((portrait?s:l)/1.25)+',user-scalable=no,viewport-fit=cover')};
 fit();addEventListener('orientationchange',function(){setTimeout(fit,50)});document.documentElement.classList.add('tablet');
}catch(e){}})();
