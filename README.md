# Vincenzo The Mice Killer 🐾

A 3D browser action game built with **Three.js**. Hunt pesky mice across 10 levels, from the living room to a spaceship without gravity, or forever in endless mode, as **Vincenzo**, a white cat with two red spots!

## 📖 Background

This is a game that I built with my 11-year-old child for fun!

## 🌐 Play Online

You can play the game directly in your browser on GitHub Pages:
**[Play Vincenzo The Mice Killer](https://mdelbuono.github.io/vincenzo-the-mice-killer/)**

## 🎮 How to Play Locally

The project uses [Vite](https://vite.dev). You need [Node.js](https://nodejs.org) (with npm).
```bash
npm install        # once, installs Vite and Three.js
npm run dev        # development server with live reload (http://localhost:5173)
```

To build the static site and try it:
```bash
npm run build      # builds the static site into docs/
npm run serve      # serves the built docs/ folder (http://localhost:4173)
```

To let the kids play a stable version while the game is being changed:
```bash
npm run play       # builds, freezes a copy in .play/ and serves it (http://localhost:4180)
```
The frozen copy keeps running unchanged, even when new builds are made. Run `npm run play` again to update it to the latest version. Saved players and brokjes stay, as long as you always use the same address (http://localhost:4180).

## 🚀 Publishing on GitHub Pages
The built site lives in `docs/`. Run `npm run build`, commit the `docs/` folder and push.
In the repository settings on GitHub, **Pages → Build and deployment → Source: Deploy from a branch**, branch `main`, folder **`/docs`**.

## ⌨️ Controls
- **WASD / Arrow Keys**: Move and turn
- **Shift**: Sprint (uses stamina bar)
- **Spacebar / Left Click**: **Catch / Pounce** (when near a mouse)
- **C**: Switch camera view (Follow, Top-Down, First-Person)
- **M**: Mute / Unmute sound
- **P / Esc**: Pause game (in endless mode the pause menu has **🏁 Stop Hunting**)
- **Q / Z**: Float up / down (only in the spaceship, without gravity)
- **1 … 9, 0**: Activate a boost bought in the shop (Zoomies, Double Brokjes, Triple Brokjes, Golden Mice, Lucky Clover, Magnet Paws, Sleepy Mice, Cheese Lure, Extra Time, Mouse Party)
- **E**: Pepper Sneeze (knocks out every mouse you can see on screen)
- **F**: Fire the Brokjes Blaster
- **G**: Throw a Yarn Ball Bomb
- **T**: Put down a Cheesy Mouse Trap
- **R**: Spray the Super Squirter
- **Touch**: Virtual joystick & on-screen buttons on mobile/tablet (tap the power-up buttons on the left)

## 🐭 Golden Mice
Now and then a ✨ **golden mouse** appears. It's faster and more careful than the others, but catching it gives lots of brokjes!

## 🎯 Game Modes
On the start screen you choose:
- **Levels mode**: play the 10 levels in order. You can't pick a level: every time you continue from the first level you haven't completed yet. After the last level you start again from Level 1. Each player has their own progress.
- **♾️ Endless mode**: no clock and no target. Walk through the glowing doors to move between the rooms of the house (living room, kitchen, bedroom, attic, basement and backyard) and hunt as long as you like. Every 25 mice gives a bonus. Pause and choose **🏁 Stop Hunting** to see how you did. The rooms and doors are configured in [`public/endless.json`](public/endless.json).

## 👤 Players
Several players can share the same computer: on the start screen, pick **Who's playing?** or add a new player. Each player has their own brokjes, cats, clothes and items. Use **🏠 Main Menu** (on the pause, level-complete and game-over screens) to get back to the start screen and switch player.

## 🛒 Brokjes Shop
Click the **🛒 Shop** button (top-left) to spend the brokjes ("kibbles" in Dutch) you collect. Brokjes and purchases are saved in your browser, separately for each player.
- **Cats**: play as Luna, Tigro, Nuvola, Biscotto, Bubblegum, snow-white Rosa, black-and-white striped Ivar, striped Peppino, Mirtillo, Caramella, Ombra, Pistacchio, Fulmine, Nebbia, Marshmallow, Cosmo, Lava or the legendary golden Oro
- **Boosts**: run faster, earn 2x / 3x brokjes per mouse, turn every mouse golden, get lots of golden mice (Lucky Clover), catch from further away (Magnet Paws), slow the mice down (Sleepy Mice), stop them running away (Cheese Lure), add 30 seconds to the clock (Extra Time) or bring 4 extra mice into the room (Mouse Party)
- **Weapons**: Pepper Sneeze, the Brokjes Blaster (with pellet refills), Yarn Ball Bombs, Cheesy Mouse Traps and the Super Squirter water gun (with refills)
- **Clothes**: hats (samurai, cowboy, pirate, wizard, chef, viking, propeller cap, space helmet...), face items (beards, glasses, monocle, eye patch, clown nose...), neck items (bow tie, scarf, medal, bandana) and back items (super cape, butterfly wings), just for looks
- **Surprise Box**: a random item from the shop!

Items and prices are configured in [`public/shop.json`](public/shop.json).

## 🏆 Levels
Level settings are configured in [`public/levels.json`](public/levels.json), and each room's furniture and lights in [`public/environments/`](public/environments/):
- **Level 1: The Living Room**: Catch 10 mice in 3 minutes (3 concurrent mice)
- **Level 2: The Attic**: Catch 15 mice in 2.5 minutes (5 faster concurrent mice)
- **Level 3: The Basement**: Catch 20 mice in 2 minutes (6 agile swarm mice)
- **Level 4: The Kitchen**: Catch 25 mice in 2 minutes (8 very fast mice, in a kitchen full of furniture)
- **Level 5: The Bedroom**: Catch 30 mice in 2 minutes (10 lightning-fast mice in a dark bedroom at night)
- **Level 6: The Backyard**: Catch 30 mice in 2 minutes (a sunny garden with a tree swing, a shed, a trampoline and a sleeping dog)
- **Level 7: The Abandoned Workshop**: Catch 32 mice in 2 minutes (an old car on blocks, rusty tools and cobwebs)
- **Level 8: The Supermarket**: Catch 35 mice in 2 minutes (aisles of shelves, checkouts and a cheese display)
- **Level 9: The Boat**: Catch 38 mice in 2 minutes 10 seconds (on the deck of a sailing ship at sea, with cannons and a treasure chest)
- **Level 10: The Spaceship**: Catch 40 mice in 2.5 minutes without gravity: the cat and the mice float, use **Q / Z** to float up and down

See `PROJECT_CONTEXT.md` for detailed technical and design documentation.
