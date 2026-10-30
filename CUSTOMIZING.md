# Customizing the server

One worked example per layer. Run commands with the Node version in `.nvmrc`.

| Layer | Worked example | Where | Takes effect after |
|---|---|---|---|
| Server settings | XP rate 5x | `config/world.json` and `engine/data/config/world.json` | Server restart |
| Game content | The Songbook quest | `content/scripts/quests/quest_songbook/` | Save, while the server runs. New spawns need a rebuild and restart |
| Assets | Purple title logo | `content/title/`, `content/sprites/` | Save or rebuild, then reload the page |
| Engine | `::players` command | `engine/src/` | Server restart |
| Client | Login screen welcome text | `webclient/src/` | Client build and copy, then reload the page |

## Server settings

Settings in `world.json` are merged over the defaults in `engine/src/util/WorldConfig.ts`.

- `config/world.json` is tracked and only copied to `engine/data/config/world.json` if that file is missing. After changing a setting, update both files.
- `build.verify` must stay `false`. When `true`, the build compares packed files against the original 2004 checksums, so any change to items or title art fails with `checksum mismatch`.

Check: bury four bones on a new character. At 5x that's 90 Prayer XP, which reaches level 2. At 1x it's 18 XP.

## Game content

RuneScript and config files live under `content/scripts/`. The running server packs and reloads them when you save. `quests/quest_songbook/` is the template for new quests.

To add a quest:

1. **IDs:** append new names to the end of `content/pack/npc.pack`, `obj.pack` and `varp.pack`. Interface rows go in `interface.pack`, and their IDs also go at the end of `interface.order`.
2. **Spawns:** add `level x z: npc_id` lines to the NPC section of `content/maps/m<x>_<z>.jm2`, then rebuild and restart. Check that the NPC can be clicked from every side, since trees block clicks.
3. **Quest list:** add a row to `player/interfaces/questlist.if`, and raise `scroll` if the row falls past the end.
4. **Shared hooks:** add the quest to `~count_questpoints` and the colour list in `general/scripts/quests.rs2`.
5. **Test commands:** add debugprocs under `_test/scripts/debug/`. For The Songbook, `::~setup_songbook`, `::~songbook_woods`, `::~songbook_spawn` and `::~reset_songbook` skip the walking and set up each test.

`inv_del` throws an error if the count is 0, so check `inv_total` first when the player might not have the item.

Dialogue lines wrap automatically, but journal lines longer than about 55 characters wrap and lose their colour, so break them with `|`.

Check: complete the quest, then read the journal and talk to Sir Austin Joseph again.

### Recolors

`recol` values in `.npc` and `.obj` files are 15-bit RGB, written as `(r << 10) | (g << 5) | b` with each channel from 0 to 31. Model files store a different format, so a value read from a model has to be converted first. `ColorConversion.rgb15toHsl16` in `engine/src/util/ColorConversion.ts` does the conversion the other way, and searching all 32,768 values for a match finds the source value. The goblin's skin is `11744`.

## Assets

Images are PNGs in `content/title/` and `content/sprites/`. Keep the image size the same unless you've checked how the client uses it.

Check: reload the page and look at the logo on the login screen.

## Engine

Chat commands are in `engine/src/network/game/client/handler/ClientCheatHandler.ts`, grouped by `staffModLevel`. Restart the server after changing engine code, or use `npm run dev` in `engine` to restart on each save.

Check: type `::players` in-game.

## Client

The web client needs [Bun](https://bun.sh). The engine serves a committed copy of the bundle, so a client change is committed in both `webclient` and `engine`.

```sh
cd webclient
bun install --frozen-lockfile
bun run build
cp out/client.js out/ondemandworker.js ../engine/public/client/
```

Check: reload the page and read the welcome text on the login screen.

## Saving a change

1. Commit on `custom-274` in each repo you changed and push it. CI can only clone pushed commits.
2. In `Server`, run `npm run record` to update `pins.json`.
3. Commit and push `pins.json` with any changes in `Server`. CI then rebuilds everything and checks that the server starts. It doesn't test gameplay, so check changes in-game too.

## Stale files

Restarting doesn't always repack, and a reverted edit can stay in the packed files. If the game doesn't match the source, stop the server and run a clean build in `engine`:

```sh
npm run clean && npm run build
```
