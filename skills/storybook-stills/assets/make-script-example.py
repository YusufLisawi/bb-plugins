#!/usr/bin/env python3
"""make_script.py <A|B|C> — write episodes/flight1v3/script.tsv: the chosen hook's lines (episodes/flighthook<X>/script.tsv, ids kept) + the rest of Part 1.

Round-2 changes against v2 (same words, split where a card needs room): the rule sentences are split in two (`rule1a` = the rule, `rule1b` = how) with
AIR after each so the rule card can be read and the diagram can play; the crush line gets air for the gauge; `names` gets air for the passport page;
the end line is the question + "Part two: stranded in a country that isn't yours."  Air = the "+x" column (seconds of silence added at the cut)."""
import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
# THE OWNER'S PICK (2026-10-25): hook B (the bite opening), closed with hook A's question: "What do you do?" Identity: Leo, 27, from Chicago, lands at Seoul.
HOOK = """hbite	N	[urgent] A zombie just bit the passport officer, and you're standing right there.	+0.4	
ago	N	[calm, storytelling] Twenty minutes ago, you landed in Seoul, South Korea. You're Leo, twenty-seven, from Chicago, and you don't speak a word of Korean.	+0.4	
q	N	[tense] What do you do?	+0.7	
"""
hook = [HOOK]
x = "B"
REST = '''queue	N	Your phone has no signal, your wallet has the wrong money, and the passport line is two hundred people long.	+0.3	
suit	N	Ten people ahead, a man in a grey suit is sweating, and scratching a bandage on his hand.	+0.2	
falls	N	[tense] Then he falls. Right in front of the officer's booth.	+0.2	
leans	N	The officer leans over the barrier to help him.	+0.2	
bite	N	And the man bites him. Through the sleeve, deep into the arm.	+0.6	
scream	N	Someone screams. An announcement booms from the ceiling, in a language you don't understand.	+0.2	
watch	N	So you stop listening to the words, and you watch the crowd instead.	+0.2	
crush	N	Two hundred people turn and push for the same exit. In a panic, people rarely die from what's behind them. They die in the crush.	+1.6	
rule1a	N	Rule one. Don't fight the flow.	+1.3	
rule1b	N	Move with it, and slowly cut across it, toward the edge.	+2.0	
rule2a	N	Rule two. Stay off the walls and the barriers.	+2.4	
rule2b	N	And keep your arms up in front of your chest, so you can breathe.	+2.4	
girl	N	At the edge, a little girl is standing alone, with an orange lanyard around her neck, calling for someone.	+0.2	
grab	N	You don't think. You pick her up.	+0.8	
dani	N	And a hand grabs your arm. A flight attendant, from your own plane. She swipes her badge at a grey door with a staircase on it.	+0.2	
says	N	[urgent] Staff only, she says, in your language. This way. Now.	+0.3	
rule3a	N	Rule three. When everyone runs for the main exit, look for the door nobody sees.	+1.5	
rule3b	N	Staff doors, service stairs, the exit behind the counter.	+3.0	
quiet	N	The door clicks shut behind you, and the screaming goes quiet. Two flights up, into a dark crew corridor.	+0.2	
names	N	Her name is Dani. The girl is Kit, nine, travelling alone. Dani reads your name off your passport. Leo.	+0.9	
window	N	From the corridor window, you can see the whole hall below.	+0.2	
board	N	The arrivals board flips, line by line. Cancelled. Cancelled. Cancelled.	+0.6	
officer	N	The officer is sitting against his booth, holding his arm.	+0.4	
up	N	[low] And the man in the grey suit, the one who fell, slowly gets up.	+0.8	
ask	N	[calm] Would you stay hidden upstairs, or run for the exit? Part two: stranded in a country that isn't yours.		
'''
(ROOT / "episodes/flight1v3/script.tsv").write_text(f"# FLIGHT DELAYED · Part 1 v3 · hook {x} + the rest (round 2: air for the cards, rules split in two)\n" + "".join(hook) + REST)
print(f"episodes/flight1v3/script.tsv · hook {x} · {sum(len(l.split(chr(9))[2].split()) for l in (''.join(hook) + REST).splitlines() if l.strip())} words")
