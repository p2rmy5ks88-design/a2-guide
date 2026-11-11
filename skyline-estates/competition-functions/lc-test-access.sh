#!/usr/bin/env bash
# Living City online — temporary test access (Cloud Shell, project owner).
#   bash lc-test-access.sh on [hours]   asks for the two test accounts' sign-in emails (typed here, never stored in clear),
#                                       stores only SHA-256 hashes and an expiry (default 3 h, max 24 h)
#   bash lc-test-access.sh status       shows on/off, expiry and how many accounts are listed
#   bash lc-test-access.sh report CODE  prints the server's record of a test room (no names, emails or account IDs)
#   bash lc-test-access.sh off          switches test access off immediately
#   bash lc-test-access.sh ranked on|off  Skyline Duel ranked ladder for live (non-test) players (default off)
# It never touches the global switch (lcOnline), ranked play, classic rooms, saves, wallets or purchases.
set -euo pipefail
DB=https://eko-estates-default-rtdb.europe-west1.firebasedatabase.app
TOKEN=$(gcloud auth print-access-token)
req(){ curl -sS --fail-with-body -X "$1" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' "$DB/$2.json" ${3:+-d "$3"}; }
case "${1:-}" in
  on)
    H=${2:-3}; [[ "$H" =~ ^[0-9]+$ ]] && (( H>=1 && H<=24 )) || { echo "hours must be 1-24"; exit 1; }
    testers=""
    for n in 1 2; do read -r -p "Sign-in email of test account $n: " e; e=$(printf '%s' "$e" | tr '[:upper:]' '[:lower:]' | xargs)
      [[ "$e" == *@* ]] || { echo "not an email"; exit 1; }
      h=$(printf '%s' "$e" | sha256sum | cut -d' ' -f1); testers="$testers${testers:+,}\"$h\":true"; done
    until=$(( ($(date +%s) + H*3600) * 1000 ))
    req PUT skylineV2/flags/lcTest "{\"on\":true,\"until\":$until,\"testers\":{$testers}}" >/dev/null
    echo "Living City TEST access ON for 2 accounts until $(date -d @$((until/1000)))."
    echo "Global Living City switch: $(req GET skylineV2/flags/lcOnline) (null/false = off)";;
  off)
    req PUT skylineV2/flags/lcTest '{"on":false}' >/dev/null; echo "Living City test access OFF."
    echo "Now: $(req GET skylineV2/flags)";;
  ranked)
    case "${2:-}" in on) req PUT skylineV2/flags/duelRanked 'true' >/dev/null; echo "Skyline Duel ranked ladder ON for live players.";; off) req PUT skylineV2/flags/duelRanked 'false' >/dev/null; echo "Skyline Duel ranked ladder OFF (matches still play, unrated).";; *) echo 'usage: ranked on|off'; exit 1;; esac;;
  status)
    req GET skylineV2/flags | python3 -c 'import json,sys,time;f=json.load(sys.stdin) or {};t=f.get("lcTest") or {};u=t.get("until",0)
print("global lcOnline:",f.get("lcOnline",False),"· duelRanked:",f.get("duelRanked",False));print("test access:","ON" if t.get("on") and u>time.time()*1000 else "off",("until "+time.ctime(u/1000)) if u else "","accounts listed:",len(t.get("testers") or {}))';;
  report)
    [[ "${2:-}" =~ ^[A-Z0-9]{5}$ ]] || { echo "usage: report CODE"; exit 1; }
    req GET "skylineV2/lc/$2" | python3 -c 'import json,sys
r=json.load(sys.stdin)
if not r: print("no such room"); sys.exit()
m=json.loads(r["match"]) if r.get("match") else None
print("room",r["code"],"test" if r.get("test") else "NOT A TEST ROOM","status",r["status"],"revision",r["revision"],"seats",len(r["seats"]))
print("answers:",json.dumps((r.get("audit") or {}).get("answered",{})))
print("refused:",json.dumps((r.get("audit") or {}).get("rejected",{})))
if m:
  G=m["G"];print("round",G["round"],"rule version",G.get("rv"),"over",m["over"],"waiting for",(m.get("boundary") or {}).get("type"))
  print("players:",[{"human":not p.get("ai"),"cash":p["cash"],"bankrupt":bool(p.get("bankrupt")),"underReview":bool(p.get("cr"))} for p in G["players"]])
  print("landmarks",len(G.get("lm") or {}),"built streets",sum(1 for o in G["own"] if o["o"]>=0 and o["h"]>0),"event",(G.get("ev2") or {}).get("id"))
  print("living city stats:",json.dumps(G.get("lcStats") or {}))'
    ;;
  *) sed -n 2,9p "$0";;
esac
