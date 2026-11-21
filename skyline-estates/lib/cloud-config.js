/* Optional accounts and cloud save on the published Skyline web game.
   Native/desktop defaults stay off; manual native builds select their reviewed channel.
   Purchases are not enabled by this web configuration. No secrets belong here. */
(function(){
 const native=!!(window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform());
 const web=!native&&window.location?.protocol==='https:'&&window.location?.hostname==='p2rmy5ks88-design.github.io';
 window.SKYLINE_CLOUD=Object.freeze({enabled:web,purchases:false,channel:web?'web':'off',service:'https://europe-west1-eko-estates.cloudfunctions.net/skylinePlayer'});
})();
