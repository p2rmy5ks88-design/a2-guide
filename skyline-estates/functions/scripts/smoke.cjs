// Loads every copied module (no network, no credentials) to catch missing files.
for(const f of ['player-http.cjs','profile-service.cjs','profile.cjs','firestore-wallet.cjs','wallet.cjs','wallet-auth.cjs','account-bindings.cjs','store-adapters.cjs'])require('../service/'+f);
console.log('Function service modules load');
