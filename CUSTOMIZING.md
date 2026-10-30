# Customizing the server

One worked example per layer. Run commands with the Node version in `.nvmrc`.

| Layer | Worked example | Where | Takes effect after |
|---|---|---|---|
| Server settings | XP rate 5x | `config/world.json` and `engine/data/config/world.json` | Server restart |
| Game content | Hans's greeting, bronze dagger stats | `content/scripts/` | Save, while the server runs |
| Assets | Blue title logo | `content/title/`, `content/sprites/` | Save or rebuild, then reload the page |
| Engine | `::players` command | `engine/src/` | Server restart |
| Client | Login screen welcome text | `webclient/src/` | Client build and copy, then reload the page |

## Server settings

Settings in `world.json` are merged over the defaults in `engine/src/util/WorldConfig.ts`.

- `config/world.json` is tracked and only copied to `engine/data/config/world.json` if that file is missing. After changing a setting, update both files.
- `build.verify` must stay `false`. When `true`, the build compares packed files against the original 2004 checksums, so any change to items or title art fails with `checksum mismatch`.

Check: bury four bones on a new character. At 5x that's 90 Prayer XP, which reaches level 2. At 1x it's 18 XP.

## Game content

RuneScript and config files live under `content/scripts/`. The running server packs and reloads them when you save.

- Dialogue: `areas/area_lumbridge/scripts/hans.rs2`
- Item stats: `skill_combat/configs/melee/daggers.obj`

Check: use `::npcadd hans` to spawn Hans and talk to him. Use `::give bronze_dagger`, examine it, wield it, and look for Stab +8 on the worn equipment tab.

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
