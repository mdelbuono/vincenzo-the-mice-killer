# Vincenzo The Mice Killer 🐾

A 3D browser action game built with **Three.js**. Hunt pesky mice across 3 levels of a house as **Vincenzo**, a white cat with two red spots!

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
- **P / Esc**: Pause game
- **1 / 2 / 3**: Activate a boost bought in the shop (Zoomies, Double Brokjes, Triple Brokjes)
- **E**: Pepper Sneeze (knocks out every mouse you can see on screen)
- **F**: Fire the Brokjes Blaster
- **Touch**: Virtual joystick & on-screen buttons on mobile/tablet (tap the power-up buttons on the left)

## 🐭 Golden Mice
Now and then a ✨ **golden mouse** appears. It's faster and more careful than the others, but catching it gives lots of brokjes!

## 👤 Players
Several players can share the same computer: on the start screen, pick **Who's playing?** or add a new player. Each player has their own brokjes, cats, clothes and items. Use **🏠 Main Menu** (on the pause, level-complete and game-over screens) to get back to the start screen and switch player.

## 🛒 Brokjes Shop
Click the **🛒 Shop** button (top-left) to spend the brokjes ("kibbles" in Dutch) you collect. Brokjes and purchases are saved in your browser, separately for each player.
- **Cats**: play as Luna, Tigro, Nuvola, Biscotto or Bubblegum
- **Boosts**: run faster, or earn 2x / 3x brokjes per mouse for 20 seconds
- **Weapons**: Pepper Sneeze and the Brokjes Blaster (with pellet refills)
- **Clothes**: hats, beards, sunglasses, bow ties and more (just for looks)
- **Surprise Box**: a random item from the shop!

Items and prices are configured in [`public/shop.json`](public/shop.json).

## 🏆 Levels
Level settings are configured in [`public/levels.json`](public/levels.json), and each room's furniture and lights in [`public/environments/`](public/environments/):
- **Level 1: The Living Room**: Catch 10 mice in 3 minutes (3 concurrent mice)
- **Level 2: The Attic**: Catch 15 mice in 2.5 minutes (5 faster concurrent mice)
- **Level 3: The Basement**: Catch 20 mice in 2 minutes (6 agile swarm mice)
- **Level 4: The Kitchen**: Catch 25 mice in 2 minutes (8 of the fastest mice yet, in a kitchen full of furniture)

See `PROJECT_CONTEXT.md` for detailed technical and design documentation.
