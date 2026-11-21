/* Internal TestFlight: accounts and cloud save only; coin purchases remain off. */
(function(){const ios=!!(window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform()&&window.Capacitor.getPlatform&&window.Capacitor.getPlatform()==='ios');
window.SKYLINE_CLOUD=Object.freeze({enabled:ios,purchases:false,channel:'private-progress',service:'https://europe-west1-eko-estates.cloudfunctions.net/skylinePlayer'})})();
