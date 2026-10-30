# Design

Approved, with The Songbook built. Items marked **(your call)** are placeholders that are easy to change.

## Vision

A darker, grittier version of the game. Same world, but overtaken by corruption. There is another ancient more powerful God who has emerged, her name is mysteriously just "Mrs. K". When a traveller stumbled upon a buried book of sheet music, and unknowingly sang one of the songs, he awoke Mrs. K from her slumber, deep beneath Gielinor. As she is slowly awakening and rising to the surface, her corrupt energy has begun to take over the land.

- **Keep:** the 2004 look, skills, combat and world map.
- **Change:** faster progression, plus new quests and items that fit the setting. plus a new aesthetic.
- **Never:** donations, ads, paid perks or anything else that sells an advantage.

## Rules for changes

1. **Use the lowest layer that works.** Prefer content, then engine, then client. This keeps upstream merges easy.
2. **Only append new IDs.** Add them at the end of `content/pack/*.pack`, and never renumber or reuse one. Maps and packed data refer to these numbers, and player saves depend on them too.
3. **Add to existing scripts sparingly.** New content gets its own folder, with small, clearly marked hooks into upstream files.
4. **Keep tunables in one place.** Drop rates and rewards go in that feature's `.constant` file, and item stats go in its `.obj`.
5. **Make every feature testable.** Each one gets `_test` debugprocs to set up and reset its state, so it can be checked without replaying it.
6. **Add one larger system at a time.** Each is tested in-game and merged before the next one starts.

## First slice: "The Songbook"

A simple, easy quest that introduces Mrs. K and the corruption. It tells players the story through what they see and choose, and it never names her until the last moment.

### How it plays

1. **The request:** Sir Austin Joseph, a knight, is guarding a terrified traveller at a small camp near Lumbridge. He asks you to find the songbook the traveller dropped in the woods as he fled, and warns you not to read it.
2. **The clue:** the traveller is too frightened to make much sense, but his ramblings point to where he ran from. The journal records the clue, so players explore rather than follow a marker.
3. **The corruption:** in the woods, the player finds goblins with sickly, discolored skin. These corrupted goblins are the first visible sign that something is wrong, and they're weak enough for a new character.
4. **The songbook:** corrupted goblins can drop it during the quest.
5. **The temptation:** the book has a Read option. It warns you the notes seem to move, then offers **Hum the first line** or **Close the book**.
   - **Humming** plays an eerie jingle, shakes the screen, deals a small non-lethal hit and summons a corrupted goblin beside you.
   - **Closing it** does nothing, and neither choice blocks the quest.
6. **The return:** Austin takes the book and reacts differently if you hummed from it. He gives you the reward.
7. **The ending:** as the book changes hands, the traveller goes rigid and whispers, "Mrs. K... she knows the tune now." The ground shakes. A final message reads: "Far beneath your feet, something hums along."

### What gets added

| Piece | What gets added | How it's wired in |
|---|---|---|
| **Sir Austin Joseph** | New NPC, using existing knight models | `npc.pack` ID 1359, spawned near Lumbridge |
| **Terrified traveller** | New NPC, using existing human models | `npc.pack` ID 1360, same camp |
| **Corrupted goblin** | New NPC, a recolored goblin, spawned in a small group | `npc.pack` ID 1361, with its own drop script |
| **Quest** | Stages: not started, started, spoke to traveller, complete. Worth 1 quest point | New varps from ID 359 (one also records humming), new `questlist` row and journal script |
| **Songbook** | Quest item with a Read option, using an existing book model | `obj.pack` ID 3894 |
| **Tainted dagger** | Reward, a dagger recolored to match the corruption, between iron and steel in strength | `obj.pack` ID 3895 |

**Starting tunables**, in `quest_songbook.constant`:

| Tunable | Value | Note |
|---|---|---|
| Songbook drop chance | 1 in 4 kills | Stays short, since the goblins are a small group |
| Coin reward | 150 | |
| Prayer XP reward | 100 | The XP rate applies, so players get 500 at 5x |
| Quest points | 1 | |
| Humming damage | 1 | Never takes a player below 1 hitpoint |

**Files:** a new `content/scripts/quests/quest_songbook/` folder, following the layout of `quest_sheep`.

**Why this replaces the goblin drop hook:** a new enemy needs no edits to upstream drop tables, and it shows the corruption directly.

### Done when

Checked in-game on a fresh account:

- The whole quest can be completed, and the journal is correct at each stage.
- Corrupted goblins don't drop the songbook before the quest starts or after it ends.
- A player who already has the songbook, in their inventory or bank, doesn't get a second one.
- A player who loses the songbook can get another.
- Humming works, can't kill a player at 1 hitpoint, and can't be repeated to farm goblins.
- Austin's dialogue differs depending on whether the player hummed.
- The ending plays once, and doesn't repeat on later visits.
- Quest progress survives logging out and a server restart.
- A full inventory doesn't lose the reward.
- Existing saves such as `phase0test` still load.
- `setup_songbook` and `reset_songbook` debugprocs exist in `_test`, and CI passes.

### Build notes

- **Art:** recolors are the only art so far. New models are out of scope until there's a reason to learn the tooling.
- **Locations:** the camp is in the field west of the Lumbridge general store, and the corrupted goblins are in the woods west of it, among regular goblins.
- **Humming:** the hit itself can't kill, but the goblin it summons can still kill a player on very low hitpoints.

## Changes to Phase 2 examples

- **Bronze dagger:** revert to Stab +4. The +8 was only a test, and it makes bronze stronger than it should be early on.
- **Hans's greeting:** revert to the original, since it doesn't fit the new tone.
- **Logo:** recolor from blue to the corruption colors, to match the tainted dagger and corrupted goblins. **(your call)**
- **Keep:** the welcome text and `::players`.
- **XP rate:** keep 5x for now. **(your call)**

## After the slice

Candidates, to be picked one at a time **(your call)**:

- **The new aesthetic:** spreading the corruption across the world, such as darker ground, trees and water. How far recoloring can go still needs testing.
- **More quests:** following what Mrs. K wants and what her rising does to the land.
- **A corrupted area:** a new training area or monster, built around the corruption.
- **A task system:** something like Slayer, hunting corrupted creatures.
- **Quality-of-life changes:** such as larger bank tabs or shorter walks.

Hosting for friends is Phase 4. It comes before anyone else plays, because the server still has no password checks.
