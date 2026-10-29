// Reproducible monthly cost estimate for the Skyline player service.
// Usage: node scripts/cost-estimate.mjs            (prints the table)
//        node scripts/cost-estimate.mjs --json     (machine-readable)
// Every assumption and unit price is listed below so the numbers can be checked and changed.
// Prices: USD list prices checked 29 Oct 2026 (sources in RELEASE-PREFLIGHT.md). Taxes not included.
const PRICE={
  // Firestore Standard, regional (europe-west1), beyond the daily free quota of the (default) database
  read:0.03/1e5, write:0.09/1e5, del:0.01/1e5, ttlDel:0.01/1e5, storageGiBMonth:0.15,
  freeReadsDay:50000, freeWritesDay:20000, freeDeletesDay:20000, freeStorageGiB:1,
  // Cloud Run functions (gen 2), Tier 1, request-based billing; free tier is per billing account per month
  vcpuSec:0.000024, gibSec:0.0000025, perMillionReq:0.40, freeVcpuSec:180000, freeGibSec:360000, freeReq:2e6,
  // Internet egress from the function (conservative: no free allowance assumed)
  egressGiB:0.12,
  // Cloud Logging storage beyond 50 GiB per project per month
  logGiB:0.50, freeLogGiB:50,
  // Secret Manager: 3 secrets x 1 version (6 versions free), access on instance start
  secretVersion:0.06, freeSecretVersions:6, secretAccess:0.03/1e4, freeSecretAccess:1e4,
  // Artifact Registry image storage for the deployed function
  artifactGB:0.10, freeArtifactGB:0.5};
const A={
  // per active player while the app is open
  profileGetsPerMin:0.2,        // background refresh every 5 minutes while visible (plus on app foreground)
  syncsPerMin:0.5,              // one batched change upload every ~2 minutes of play
  readsPerGet:1, readsPerSync:2, writesPerSync:3, // account + op record + ~1 ledger row
  cpuSecPerReq:0.2, vcpu:1, memGiB:0.25,           // conservative: no overlap between concurrent requests
  respKB:2, logKB:1.2,
  docKBPerPlayer:6, ledgerRowKB:0.35,
  purchasesPerPayerMonth:1.5, payerShare:0.03, readsPerPurchase:6, writesPerPurchase:5,
  coldStartsPerDay:300, imageGB:0.25};
const SCEN={low:{dau:200,mins:20,players:1000},normal:{dau:2000,mins:45,players:10000},high:{dau:20000,mins:60,players:100000}};
const DAYS=30;
function estimate({dau,mins,players}){
  const reqDay=dau*mins*(A.profileGetsPerMin+A.syncsPerMin),readsDay=dau*mins*(A.profileGetsPerMin*A.readsPerGet+A.syncsPerMin*A.readsPerSync),
    writesDay=dau*mins*A.syncsPerMin*A.writesPerSync,purchMonth=players*A.payerShare*A.purchasesPerPayerMonth;
  const fsReads=Math.max(0,readsDay-PRICE.freeReadsDay)*DAYS+purchMonth*A.readsPerPurchase,fsWrites=Math.max(0,writesDay-PRICE.freeWritesDay)*DAYS+purchMonth*A.writesPerPurchase;
  const ledgerRowsMonth=dau*mins*A.syncsPerMin*DAYS,storageGiB=(players*A.docKBPerPlayer+ledgerRowsMonth*24*A.ledgerRowKB)/1048576; // 24 months of ledger at steady state
  const reqMonth=reqDay*DAYS+purchMonth*3,cpu=reqMonth*A.cpuSecPerReq*A.vcpu,mem=reqMonth*A.cpuSecPerReq*A.memGiB;
  const c={
    firestoreOps:fsReads*PRICE.read+fsWrites*PRICE.write+ledgerRowsMonth*PRICE.ttlDel,
    firestoreStorage:Math.max(0,storageGiB-PRICE.freeStorageGiB)*PRICE.storageGiBMonth,
    functionCompute:Math.max(0,cpu-PRICE.freeVcpuSec)*PRICE.vcpuSec+Math.max(0,mem-PRICE.freeGibSec)*PRICE.gibSec,
    functionRequests:Math.max(0,reqMonth-PRICE.freeReq)/1e6*PRICE.perMillionReq,
    egress:reqMonth*A.respKB/1048576*PRICE.egressGiB,
    logging:Math.max(0,reqMonth*A.logKB/1048576-PRICE.freeLogGiB)*PRICE.logGiB,
    secrets:Math.max(0,3-PRICE.freeSecretVersions)*PRICE.secretVersion+Math.max(0,A.coldStartsPerDay*3*DAYS-PRICE.freeSecretAccess)*PRICE.secretAccess,
    artifactRegistry:Math.max(0,A.imageGB-PRICE.freeArtifactGB)*PRICE.artifactGB};
  const total=Object.values(c).reduce((a,b)=>a+b,0);
  return{inputs:{dau,mins,players},volume:{requestsPerMonth:Math.round(reqMonth),readsPerDay:Math.round(readsDay),writesPerDay:Math.round(writesDay),storageGiB:+storageGiB.toFixed(2)},costs:Object.fromEntries(Object.entries(c).map(([k,v])=>[k,+v.toFixed(2)])),totalUSD:+total.toFixed(2)};
}
// Worst case the instance limit allows: 10 instances busy 24/7 for a month (compute only).
const ceiling=10*DAYS*86400*(A.vcpu*PRICE.vcpuSec+A.memGiB*PRICE.gibSec);
const out={assumptions:A,prices:PRICE,scenarios:Object.fromEntries(Object.entries(SCEN).map(([k,v])=>[k,estimate(v)])),computeCeilingAtMaxInstancesUSD:+ceiling.toFixed(0)};
if(process.argv.includes('--json'))console.log(JSON.stringify(out,null,1));
else{for(const [k,v] of Object.entries(out.scenarios))console.log(`${k.padEnd(6)} ${String(v.inputs.dau).padStart(6)} daily players x ${v.inputs.mins} min  ~ $${v.totalUSD.toFixed(2)}/month  `+Object.entries(v.costs).map(([a,b])=>a+' $'+b).join(', '));
  console.log(`Compute ceiling if 10 instances ran flat out all month: ~$${out.computeCeilingAtMaxInstancesUSD} (plus Firestore operations, which have no ceiling)`)}
