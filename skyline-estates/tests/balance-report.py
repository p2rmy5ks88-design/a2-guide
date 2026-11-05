"""Task 14: summarise balance-sim.cjs CSV output.  python3 tests/balance-report.py rows.csv [...]"""
import csv, math, sys
from collections import defaultdict

def wilson(k, n, z=1.96):
    if not n: return (0, 0, 0)
    p = k / n; d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d; h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return (p, max(0, c - h), min(1, c + h))

rows = []
for f in sys.argv[1:]:
    with open(f) as fh: rows += [r for r in csv.DictReader(fh) if r.get('config')]
by = defaultdict(list)
for r in rows: by[r['config']].append(r)
pct = lambda t: f"{t[0]*100:.0f}% [{t[1]*100:.0f}–{t[2]*100:.0f}]"
print('| Config | Games (seeds) | Finished | Avg rounds | Bankrupt/game | First-seat win 95% CI | Boosted-seat win 95% CI | Comeback | Builds | Auctions | Trades |')
print('|---|---|---|---|---|---|---|---|---|---|---|')
for cfg, rs in by.items():
    n = len(rs); fin = [r for r in rs if r['outcome'] == 'finished']; seeds = sorted(int(r['seed']) for r in rs)
    avg = lambda k, src=rs: sum(float(r[k]) for r in src) / max(1, len(src))
    first = wilson(sum(r['winnerFromFirst'] == '0' for r in fin), len(fin))
    boost = [r for r in fin if r['boostSeat'] not in ('', '-1')]
    b = pct(wilson(sum(r['boostWon'] == '1' for r in boost), len(boost))) if boost else '—'
    cb = [r for r in fin if r['comeback'] != '']
    print(f"| {cfg} | {n} ({seeds[0]}–{seeds[-1]}) | {len(fin)} | {avg('rounds'):.0f} | {avg('bankrupt'):.2f} | {pct(first)} | {b} | "
          f"{pct(wilson(sum(r['comeback'] == '1' for r in cb), len(cb)))} | {avg('builds'):.0f} | {avg('auctions'):.1f} | {avg('trades'):.1f} |")
print('\nExpected with no advantage: 33% for one seat of three. Errors:', sum(r['outcome'] == 'error' for r in rows))
