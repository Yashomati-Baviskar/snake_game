# Neon Snake Arena

A modern neon-themed Snake game built with HTML, CSS, and JavaScript.

Features implemented:

- Basic snake movement
- Food spawning
- Score and high score (localStorage)
- Game over detection (wall and self collision)
- Start / Pause / Restart controls
- Neon UI styling
- Simple sound using WebAudio API

To run locally, open `index.html` in a browser (double-click or serve with a static server).

This repository contains `Snake Arcade`, a compact neon-styled Snake game with levels and simple sound effects.

To run:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

Controls:
- Arrow keys to move
- Space to restart
- Start / Pause / Restart buttons available

Features:
- Neon UI with Orbitron/Poppins fonts
- Wall highlight glow while playing
- Sound effects for eating, leveling, and game over (WebAudio)
- Level system: every 5 points increases level and speed

Files:
- `index.html` — page and HUD
- `styles.css` — neon styling and light theme
- `script.js` — game logic, audio, levels

Enjoy and feel free to ask for touch controls or persistence for theme preferences.
