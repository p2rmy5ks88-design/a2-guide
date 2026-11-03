/* Public iOS App Store build. Not used by the web game, Android or desktop.
   Public iOS release: optional accounts, cloud save and the four reviewed coin packs. */
(function(){const ios=!!(window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform()&&window.Capacitor.getPlatform&&window.Capacitor.getPlatform()==='ios');
window.SKYLINE_CLOUD=Object.freeze({enabled:ios,purchases:ios,channel:'ios-release',service:'https://europe-west1-eko-estates.cloudfunctions.net/skylinePlayer'})})();
