/* Skyline Estates cloud switches. Both stay false until the owner has approved and
   deployed the player service and the sandbox acceptance list in
   functions/DEPLOY.md has passed. Changing them is a reviewed commit, never a
   runtime toggle. The service URL is public; no secrets belong in this file. */
window.SKYLINE_CLOUD=Object.freeze({
  enabled:false,      // accounts + unified cloud wallet/progress sync
  purchases:false,    // App Store coin packs (also requires enabled)
  service:'https://europe-west1-eko-estates.cloudfunctions.net/skylinePlayer'
});
