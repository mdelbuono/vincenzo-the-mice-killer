# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Browser-based 3D cat-catches-mice game (Three.js r128), built by the author with their 11-year-old child. Built with Vite; no tests, no linter. Deployed to GitHub Pages from the `docs/` folder. `PROJECT_CONTEXT.md` holds the detailed design doc (characters, levels, controls, UI flow); keep it in sync when gameplay or architecture changes.

## Running

```bash
npm install        # first time
npm run dev        # Vite dev server with live reload (port 5173)
npm run build      # production build into docs/
npm run serve      # serve the built docs/ (vite preview, port 4173)
npm run play       # build, snapshot docs/ into .play/ (scripts/snapshot.js) and serve it on port 4180
```

- `npm run play` is how the kids play a stable version while development continues. Don't run it, overwrite or delete `.play/`, or kill whatever listens on port 4180, unless the user asks. Use `npm run dev` (5173) or `npm run serve` (4173) for testing.
- `localStorage` (player accounts and brokjes) is per origin, so each port has its own separate saves. The kids' real saves live on `localhost:4180`.

- `docs/` is **generated build output** that is committed so GitHub Pages can serve it (Pages source: `main` branch, `/docs` folder). Never edit files in `docs/` by hand; change the sources and run `npm run build`, then commit `docs/` together with the source change.
- `vite.config.js` uses `base: './'` so the build works under the Pages sub-path `/vincenzo-the-mice-killer/`. Keep all runtime URLs relative (no leading `/`).
- Port 8000 is taken by a printer service on the author's machine, so don't suggest `python3 -m http.server 8000`.

## Architecture

- **ES modules bundled by Vite.** `index.html` loads `css/style.css` and a single entry, `js/game.js`, which imports the other files in `js/`. Every file does `import * as THREE from 'three'` (npm `three@0.128.0`, pinned to r128 to match the original CDN version; newer Three.js versions have breaking API changes). `sound.js` exports a `sound` singleton.
- **`public/` is copied verbatim** into the build and holds the data fetched at runtime with relative URLs: `levels.json`, `endless.json`, `shop.json`, `environments/*.json` (plus `.nojekyll` for Pages). Data files go here, not in the repo root.
- **No image or audio files.** All textures are drawn procedurally on canvas (`textures.js`) and all audio is synthesized with the Web Audio API (`sound.js`). Don't add image or audio files; follow the existing procedural approach.
- **`VincenzoGame` (`game.js`)** is the orchestrator: render loop, camera modes, input (keyboard + touch), HUD/radar, level progression, and scoring. It fetches `levels.json` at startup and has a hardcoded fallback copy of the level configs in its constructor, so changes to level fields may need updating in both places. Always read settings through `levelConfig()`, which returns the current level's config or, in endless mode, the current room's settings merged over `endless.json`'s shared ones.
- **Two modes** (`game.mode`): `'levels'` plays `levels.json` in order with no level selector: `campaignLevel()` returns the player's saved `shop.nextLevel` (first level not completed; `completeLevel()` advances it and wraps to 1 after the last level). `'endless'` has no timer or target: `startEndless()` / `enterRoom()` load the rooms of `endless.json`, which are linked by `doors` (`{ wall, at, to }`; every door needs a matching door back in the target room, where the cat enters). The loop checks `room.doorAt()` and skips updates while `roomChanging`.
- **Two-tier data-driven levels:**
  1. `levels.json` (keyed by level number) holds gameplay tuning: `target`, `duration`, `miceCount`, `speedMult`, `brokjesPerMouse`, `completionBrokjes`, `goldenMouseChance`, `goldenMouseBrokjes`, screen text, and an `environment` path.
  2. `environments/<room>.json` describes the room: `lights`, `floor`, `ceiling`, `walls`, `extras`, `props`. `LevelEnvironment._buildFromData()` interprets it. Colors are hex strings like `"0x5c4d41"` (parsed with `parseInt(..., 16)`).
- **Adding environment content means editing three things in `environment.js`:** texture names map to factories in `_resolveTexture()`, `extras[].type` maps to inline code in `_buildExtra()`, and `props[].builder` maps to a `build<Name>()` method via the switch in `_buildProp()`. Unknown names only log a `console.warn`. Moving decorations register a per-frame function with `room.animate(fn)` (cleared with the room). Environment files may also set `sky` / `fogColor` / `fogDensity` (outdoor rooms), `walls.height` (low walls) and `zeroGravity`.
- **Collision** is a list of axis-aligned boxes. Prop builders call `addCollider(x, z, w, d)`, and both `Cat` and `Mouse` query `room.checkCollision(x, z, radius)`, which also clamps to the fixed room bounds (`roomWidth` 34 × `roomDepth` 26). A prop without a collider can be walked through. Collision ignores height, even in zero gravity. The cat is placed with `room.findFreeSpot()` so it never starts inside a collider (otherwise it can't move).
- **Zero gravity** (`room.zeroGravity`, the spaceship): `Cat` and `Mouse` read it in `update()` and float (`input.up` / `input.down`, keys Q / Z). Mice and cat then have a real `position.y`, and catching uses 3D distance, so anything that hits mice (pellets, squirter, sneeze frustum test) must take height into account.
- **Scoring** is in "brokjes" (Dutch for kibbles; the code, JSON fields and UI all use this word). `game.brokjes` (and its alias `score`) is a getter/setter over `shop.wallet`. Brokjes are never reset by restarting.
- **Player accounts** (`js/accounts.js`): `AccountStore` keeps every player and their save in one `localStorage` key (`vincenzo-accounts-v1`); `Shop.data` is the current player's save and `Shop.persist()` writes it back through the store on every change. After switching player, `shop.reloadAccount()` reloads the save and fires the wallet/appearance/inventory callbacks. Old saves are upgraded by `Shop.normalizeSave()` (`kibbles` → `brokjes`, renamed item ids via `RENAMED_ITEMS`); keep that migration when changing the save format or item ids.
- **Golden mice**: `game.spawnMouse()` rolls `goldenMouseChance` (max one golden at a time, up to 3 with a higher chance while the Lucky Clover boost is on) and `catchMouse()` pays `goldenMouseBrokjes` for them; `Mouse` takes a `golden` flag for speed, alert distance and looks. The Golden Mice boost (`effect: "golden"`) calls `Mouse.setGolden()` on every mouse and on new spawns while active; `bornGolden` mice stay golden when it ends.
- **Sneeze** hits every mouse inside the camera frustum (`AbilityManager.miceInView()`), so its reach depends on the camera mode. In first-person mode the cat's own mesh is hidden (`updateCamera()`).
- **Shop** (`public/shop.json` + `js/shop.js`): the catalog is data-driven; item `type` (`cat`, `outfit`, `unlock`, `boost`, `ammo`, `mystery`) decides how `Shop.grant()` and `Shop.renderCard()` treat it. `Shop` notifies the game through callbacks (`onWalletChange`, `onAppearanceChange`, `onInventoryChange`, `onOpen`/`onClose`). Opening the shop mid-hunt pauses the game, and keydown ignores everything but Escape while it is open.
- **Abilities** (`js/abilities.js`): boosts and ammo items with a `key` are used in-game via `AbilityManager.handleKey()` or the clickable power-up bar. Boost behavior comes from the item's `effect` (`speed`, `brokjes`, `golden`, `lucky`, `reach`, `slowMice`, `calm`, `moreMice`, and the instant `time`), read via `effectValue()` / `activeEffects()`; the game applies them in `spawnMouse()`, `catchRadius()` and the mouse update in the loop. Weapons are dispatched on `weapon` (`sneeze`, `blaster`, `yarn`, `trap`, `squirter`). Every way of removing a mouse goes through `game.catchMouse()`, which applies the brokjes boost and the win check (or the milestone bonus in endless mode). Boosts, pellets, yarn balls and traps are cleared by `abilities.reset()` at level start/end; changing room in endless mode only calls `clearProjectiles()`, so boosts keep running.
- **Cat appearance**: `Cat.setAppearance()` rebuilds the whole mesh from `shop.getAppearance()` (colors, name tag, outfit builders from `js/outfits.js`, blaster, squirter). A new clothing item needs a builder in `OUTFIT_BUILDERS` and a `shop.json` entry. Clothing slots are `hat`, `face`, `neck` and `back` (all builders attach to the head group; back items reach over the body). Cat items may set `"pattern"`: `"stripes"` (stripes in the `spots` color) or `"plain"` (no spots).

## Gotchas

- If an environment file is missing or fails to load, the room renders empty (there is no built-in fallback room).
- `VincenzoTheMiceKiller-2D/index.html` is an archived, self-contained 2D version kept for reference only. It is not part of the 3D game.
