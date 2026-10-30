/* Public iOS App Store build. Not used by the web game, Android or desktop.
   Version 1.1 adds coin packs: accounts, cloud save and in-app purchases are on, only inside the iOS app. */
(function(){const ios=!!(window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform()&&window.Capacitor.getPlatform&&window.Capacitor.getPlatform()==='ios');
window.SKYLINE_CLOUD=Object.freeze({enabled:ios,purchases:ios,channel:'ios-release',service:'https://europe-west1-eko-estates.cloudfunctions.net/skylinePlayer'})})();
