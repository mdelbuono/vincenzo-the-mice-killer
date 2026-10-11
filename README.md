# Vincenzo The Mice Killer 🐾

A 3D browser action game built with **Three.js**. Hunt pesky mice across 3 levels of a house as **Vincenzo**, a white cat with two red spots!

## 📖 Background

This is a game that I built with my 11-year-old child for fun!

## 🌐 Play Online

You can play the game directly in your browser on GitHub Pages:
**[Play Vincenzo The Mice Killer](https://mdelbuono.github.io/vincenzo-the-mice-killer/)**

## 🎮 How to Play Locally

Run a static HTTP server (recommended so `levels.json` loads seamlessly):
```bash
python3 -m http.server 8000
# Visit http://localhost:8000 in your browser
```

## ⌨️ Controls
- **WASD / Arrow Keys**: Move and turn
- **Shift**: Sprint (uses stamina bar)
- **Spacebar / Left Click**: **Catch / Pounce** (when near a mouse)
- **C**: Switch camera view (Follow, Top-Down, First-Person)
- **M**: Mute / Unmute sound
- **P / Esc**: Pause game
- **Touch**: Virtual joystick & on-screen buttons on mobile/tablet

## 🏆 Levels
Level settings are configured in [`levels.json`](file:///home/marcello/mdb/Code/vincenzo-the-mice-killer/levels.json):
- **Level 1: The Living Room**: Catch 10 mice in 3 minutes (3 concurrent mice)
- **Level 2: The Attic**: Catch 15 mice in 2.5 minutes (5 faster concurrent mice)
- **Level 3: The Basement**: Catch 20 mice in 2 minutes (6 agile swarm mice)

See `PROJECT_CONTEXT.md` for detailed technical and design documentation.
