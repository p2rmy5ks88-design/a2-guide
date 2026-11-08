"""Builds the Skyline Coach line catalogue (coach/lines-en.json) from fixed lines plus game names.
Usage: python3 build_lines.py names.json out.json   (names.json: {props:[...], fest:[...], ev:[...]})"""
import json, re, sys, hashlib
def slug(s):
    a = re.sub(r'[^a-z0-9]+', '-', s.lower().encode('ascii', 'ignore').decode()).strip('-')[:40]
    return (a or 'x') + '-' + hashlib.sha1(s.encode()).hexdigest()[:5]
CORE = {
 'preview': "Welcome to Skyline Estates! Ready to build your empire?",
 'coach_on': "Skyline Coach is on. Let's play!",
 'turn_me': "It's your turn! Ready to roll?",
 'turn_other': "Next player's turn.",
 'turn_ai': "The computer is making its move.",
 'buy_ask': "Would you like to buy this property?",
 'buy_me': "It's yours! Great buy.",
 'buy_other': "A rival just bought a property.",
 'set_me_lm': "You've completed a district! It's ready for a Landmark.",
 'set_me': "You've completed a district!",
 'set_other': "A rival just completed a district.",
 'build_me_1': "Low-rise complete!",
 'build_me_2': "Mid-rise complete!",
 'build_me_3': "High-rise complete! You're building something special!",
 'build_me_house': "Construction complete!",
 'build_me_sky': "Skyscraper complete! What a brilliant move!",
 'build_other_sky': "A rival just built a Skyscraper.",
 'lm_me': "Congratulations! You've unlocked a Skyline Landmark!",
 'lm_other': "A new Landmark has been designated.",
 'lm_ask': "Time to choose your Landmark!",
 'ev_rent_up': "Rents are rising in the spotlight district.",
 'ev_rent_down': "Rents are easing in the spotlight district.",
 'ev_dev': "Building costs are down. Time to build!",
 'cr_me': "Civic Review! Your rent is on hold for now.",
 'cr_other': "A rival is under Civic Review.",
 'cr_end': "Your Civic Review is over. Back in business!",
 'fasttrack': "Fast-Track Permit approved!",
 'bk_me': "You're out of cash. Better luck next game.",
 'bk_other': "A rival has gone bankrupt!",
 'win_me': "Congratulations! You've won the match!",
 'win_other': "Game over! Well played.",
 'pay_rent': "Rent paid.",
 'pay_fee': "Payment made.",
 'recv_rent': "Rent collected. Nice!",
 'payday': "Payday!",
 'lockup_me': "Off to the Lockup!",
}
names = json.load(open(sys.argv[1]))
lines = dict(CORE)
index = {'buy': {}, 'ev': {}}
for n in names['fest']: lines['ev_' + slug(n)] = f"{n} is here! The city is coming alive!"; index['ev'][n] = 'ev_' + slug(n)
for n in names['ev'] + ['District Demand', 'Permit Window', 'Quiet Market']: lines['ev_' + slug(n)] = f"{n}! Here we go."; index['ev'][n] = 'ev_' + slug(n)
for n in names['props']: lines['buy_' + slug(n)] = f"Do you want to acquire {n}?"; index['buy'][n] = 'buy_' + slug(n)
# Popup cards and city corners (optional 3rd argument: cards.json). Text must match lib/skyline-coach.js cardLine().
DECK = {'chance': 'Lucky Break', 'esusu': 'City Hall'}
def classic(t):
    t = re.sub(r'[Cc]ollect \{m\d+\} for every street you own', 'collect a bonus for every street you own', t)
    t = re.sub(r'Collect \{m\d+\}', 'Collect your reward', t); t = re.sub(r'Pay \{m\d+\}', 'Pay the fee', t)
    return t.replace('{festival}', 'the festival').strip()
if len(sys.argv) > 3:
    for c in json.load(open(sys.argv[3])):
        if c['kind'] == 'lc' and c.get('title'):
            lines['card_' + slug(c['deck'] + c['title'])] = f"{DECK[c['deck']]}! {c['title']}." + (" Make your choice." if c['choice'] else '')
        elif c['kind'] == 'classic' and c.get('t') and '{' not in classic(c['t']):
            for d in DECK: lines['card_' + slug(d + c['t'])] = f"{DECK[d]}! {classic(c['t'])}"
CORNERS = {'corner_hq': "Skyline HQ! Pick your head-office bonus.", 'corner_po': "Planning Office! A Pre-approval is on offer.",
           'corner_tx': "Transit Exchange! Ride to any transit hub for a fare.", 'corner_if': "Investment Forum! Buy a street, or network for a stipend."}
lines.update(CORNERS)
index['text'] = {v: k for k, v in lines.items()}
json.dump({'voice': 'natural-en-f', 'lines': lines, 'index': index}, open(sys.argv[2], 'w'), ensure_ascii=False, indent=0)
print(len(lines), 'lines')
