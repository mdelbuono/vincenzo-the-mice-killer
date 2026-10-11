# VincenzoTheMiceKiller - Project Context & Documentation

This file stores complete project context, design decisions, controls, mechanics, and architecture for **VincenzoTheMiceKiller**.

---

## 1. Project Overview
- **Name**: VincenzoTheMiceKiller
- **Format**: Browser-based 3D action game using **Three.js (r128)**.
- **Zero External Dependencies**:
  - All textures are procedurally generated via HTML5 Canvas (parquet floor, rustic attic wood, basement flagstones, brick walls, Persian rug, TV aquarium, 3D billboard sprites).
  - All sound effects and background music are procedurally synthesized in real time via the **Web Audio API** (cat meow, pounce whoosh, mouse squeaks, catch fanfare, background chords).
- **Core Loop**:
  - The player controls **Vincenzo**, a cat hunting mice across 3 distinct rooms of a house.
  - Mice roam freely and scurry away from Vincenzo when he gets close, but **never escape the room**.
  - Catching mice is done using a dedicated key (**Spacebar**), with visual target cues when in range.
  - Beat the mouse catch quota in 60 seconds to advance through the levels.

---

## 2. Character: Vincenzo The Cat
- **Visuals**:
  - **Coat**: Clean white fur (`#ffffff`).
  - **Markings**: **Two distinct red spots** (`#d63031`) located on the upper back near the base of the tail.
  - **Details**: Red collar with a golden jingle bell, glowing green cat eyes (`#2ecc71`), dark whiskers (`#2f3542`) visible against white fur, pink nose and inner ears.
  - **Name Tag**: A 3D billboard sprite floating directly above Vincenzo's head displaying `🐾 Vincenzo` with a golden border. Automatically rotates to face the camera at all times.
- **Physics & Animations**:
  - 4-legged animated stride cycle for walking/trotting.
  - Segmented tail waving organically with sine wave physics.
  - Head bobs during walks and tilts into turns.
  - Dynamic airborne pounce leap when catching or lunging.
  - Sprint mechanic with an interactive stamina bar.
- **Controls**:
  - <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> or **Arrow Keys**: Move & turn.
  - <kbd>Shift</kbd>: Sprint (drains stamina, recovers when idle/trotting).
  - <kbd>Spacebar</kbd> / **Left Click** / **Touch Button**: Dedicated **Pounce / Catch action**.
  - <kbd>C</kbd>: Cycle camera view (Third-Person Follow $\rightarrow$ Top-Down Room View $\rightarrow$ Cat First-Person View).
  - <kbd>M</kbd>: Toggle Audio Mute / Unmute.
  - <kbd>P</kbd> / <kbd>Esc</kbd>: Pause / Resume game.
  - **Touch Support**: Virtual D-Pad and on-screen `SPRINT` and `CATCH [SPACE]` buttons for touchscreen devices.

---

## 3. Mouse Mechanics & AI
- **Behavior**:
  - Mice spawn safely inside the room's open area and roam, forage, and sniff.
  - **Mice Stay in the Room**: Mice never exit through holes or walls. They are clamped strictly inside the room boundaries.
  - **Evasion / Panic**: When Vincenzo approaches within alert distance (~6.5 units), the mouse enters `FLEEING` mode, displays an alert exclamation (`!`), squeaks, and sprints away from Vincenzo while steering clear of walls and obstacles.
- **Catch Mechanism**:
  - When Vincenzo gets within catch range (~3.2 units) of a mouse:
    1. A floating 3D billboard badge **`[SPACE] CATCH!`** appears right over that mouse.
    2. An on-screen HUD prompt **`[ SPACEBAR ] PRESS TO CATCH MOUSE! 🐾`** pulses on the screen.
  - Pressing <kbd>Spacebar</kbd> triggers Vincenzo's pounce and catches the mouse:
    - Explosion of starburst particle fireworks and comic sparkles.
    - Joyful catch chime + cat meow sound.
    - Floating score indicator `+100 PTS!`, `+200 PTS!` with combo streak multiplier (`COMBO x2!`, `COMBO x3!`).
    - Mice caught counter increments.
    - A replacement mouse spawns shortly to keep the room populated.

---

## 4. 3-Level Campaign
All levels share a 60-second hunt timer, but feature escalating difficulty, mouse counts, speeds, and themed 3D environments:

### Level 1: The Living Room
- **Goal**: Catch **10 mice** in 60s.
- **Concurrent Mice**: 3 active mice (Speed multiplier: 1.0x).
- **Aesthetic**: Warm sunny morning living room with directional sunbeams and ceiling chandelier.
- **Props**: Parquet hardwood floor, bohemian center rug, navy 3-seater sofa with cushions, coffee table with coffee cup, wall TV with live animated swimming goldfish, bookshelf with colorful books, cat scratching tree with platforms, potted monstera plant, floor lamp.

### Level 2: The Attic
- **Goal**: Catch **15 mice** in 60s.
- **Concurrent Mice**: 5 active mice (Speed multiplier: 1.2x, faster scurrying).
- **Aesthetic**: Atmospheric dusty attic lit by cool moonlight through a circular gable window and an amber glowing brass lantern.
- **Props**: Aged rustic wood plank floor with dust motes, slanted wooden A-frame roof rafters/beams across ceiling, stacked cardboard storage boxes, vintage wooden storage trunks with brass locks, rocking chair, grandfather clock with face, wooden step-ladder, stacked leather suitcases.

### Level 3: The Basement
- **Goal**: Catch **20 mice** in 60s.
- **Concurrent Mice**: 6 active mice (Speed multiplier: 1.35x, intense agile swarm).
- **Aesthetic**: Moody dim cellar with flickering Edison lightbulb and fiery furnace glow.
- **Props**: Damp stone flagstone pavers, weathered red brick walls, overhead industrial pipes, brick furnace/boiler with an open hearth showing glowing fiery orange embers, stacked wooden cider barrels, heavy carpenter's workbench with tools, vintage washing machine, shipping pallets with crates.

---

## 5. UI & State Flow
- **Start Screen**:
  - Title and mission description.
  - **Level Selector**: Allows clicking <kbd>Lvl 1: Living Room</kbd>, <kbd>Lvl 2: The Attic</kbd>, or <kbd>Lvl 3: The Basement</kbd> to test or jump into any level directly.
- **Level Complete Screen**:
  - Triggers upon catching the required number of mice.
  - Shows mice caught, total score, and a button to proceed to the next level (or Grand Champion screen on Level 3).
- **Time Up / Game Over Screen**:
  - Triggers if 60 seconds elapse before catching the target mice.
  - Offers **"Retry Level"** (restart current level immediately) or **"Start from Level 1"**.
- **Minimap Radar**:
  - Real-time 2D radar in the top right showing the room outline, active mice (red dots), and Vincenzo (white triangle with two red spots and vision cone).

---

## 6. Code Architecture (`index.html`)
- **`SoundEngine`**: Web Audio API oscillator/gain/filter networks for SFX and lofi chord loops.
- **Procedural Canvas Generators**:
  - `createNameTagTexture()`: Generates the 3D billboard name tag for Vincenzo.
  - `createCatchPromptTexture()`: Generates the `[SPACE] CATCH!` target badge above mice.
  - `createParquetTexture()`, `createAtticFloorTexture()`, `createBasementFloorTexture()`, `createBasementWallTexture()`, `createRugTexture()`, `createTVCanvasTexture()`.
- **`ParticleManager`**: Renders dust puffs when running and colorful star bursts upon catching mice.
- **`LevelEnvironment`**:
  - Manages room geometry, walls, colliders, and props for Levels 1, 2, and 3.
  - Methods: `buildLevel(lvl)`, `buildLivingRoom()`, `buildAttic()`, `buildBasement()`.
  - Collision check: `checkCollision(x, z, radius)`.
- **`Cat`**:
  - Builds the 3D white cat mesh with two red spots on the back, name tag sprite, joints for 4 legs, tail segments, collar, and bell.
  - Handles physics, steering, sprinting, pouncing leap, and animation loops.
- **`Mouse`**:
  - Builds the stylized 3D mouse model with exclamation alert sign and `[SPACE] CATCH!` billboard sprite.
  - Handles wandering, sniffing pauses, avoidance steering, and panic fleeing away from Vincenzo.
- **`VincenzoGame`**:
  - Orchestrates Three.js rendering loop, camera follow modes, level progression, HUD updates, radar canvas drawing, and input handling.

---

## 7. Key Files
- `index.html`: The primary complete game application.
- `index-v2.html`: Synchronized copy.
- `PROJECT_CONTEXT.md`: This reference document.
