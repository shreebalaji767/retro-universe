# Retro Universe — 8-Bit Arcade

A free, responsive retro browser-game portal inspired by classic NES-era arcades. Built with vanilla HTML, CSS, JavaScript, Canvas, and browser storage—no paid APIs, external game libraries, accounts, ads, subscriptions, or pay-to-win systems.

## Games

- **Tetris DX** — falling blocks, rotation, line clears, score and levels; keyboard and touch controls.
- **Snake 198X** — keyboard/WASD, directional buttons and swipe controls; local best score.
- **2048 Pixel** — merge tiles; keyboard, swipe and on-screen directional controls; undo and best score.
- **Tic Tac Toe** — two-player classic with win/draw tracking.
- **Pixel Racer** — lane-based traffic dodging with keyboard and touch controls, pause and local best score.
- **Star Blaster** — space shooter with movement, fire, lives, pause and score-based difficulty levels; keyboard and touch controls.
- **Brick Breaker** — five-stage campaign with tougher bricks in later levels, keyboard, drag and touch buttons.
- **Memory Match** — responsive card matching with move count and pair tracking.
- **Pixel Jumper** — side-view platform jumping, coins, enemies and touch controls.
- **Maze Runner** — randomized maze generation, key collection and exit objective.
- **Pixel Pong** — paddle-versus-CPU match with keyboard, touch buttons and drag.
- **Pixel Mines** — Minesweeper-style puzzle with safe reveals and flag mode.
- **Simon Says** — sequence memory game with responsive color pads.\n- **Pixel Asteroids** — rotate, thrust and shoot, with splitting rocks and waves.\n- **Pixel Crossing** — frogger-style road and river crossing with multiple safe bays.\n- **Bomber Maze** — destructible blocks, timed bombs and escape-focused maze action.

## Portal features

- Animated, orbiting 3D-style 8-bit Retro Universe wordmark, used across the landing page and all game headers, with a matching retro favicon.
- Retro arcade landing screen with pixel stars, planet, floating clouds, coin effects, responsive start button, and reduced-motion support.

- Classic 8-bit NES-inspired palette and consistent shared styles, branding and favicon.
- Responsive layout for desktops, tablets and phones, with compact 44px touch targets and a shared install/offline status utility.
- Search, category filters, favorites saved locally, and an install prompt when supported.
- Browser-local progress; no account or backend needed.
- Web app manifest and service worker precache all game pages and shared assets for offline play after the first successful online visit; an install button explains browser-specific installation steps.
- Keyboard and compact touch controls on supported games; reduced-motion-friendly UI.

## Run locally

Open `index.html` through a static HTTP server for service-worker/PWA features. Individual game HTML files can also be opened directly for gameplay, but browsers only enable service workers in secure contexts (HTTPS or localhost).

## GitHub Pages

Open **Settings → Pages**, choose the publishing source for `main` and `/(root)`, then save. GitHub Pages publishes static files from the selected source. Check the repository's **Actions → pages build and deployment** workflow for the actual deployment result.

## Testing notes

The project uses no build step. JavaScript syntax and internal file references should be smoke-tested after changes; browser gameplay still needs real keyboard/touch testing on target devices. Scores and favorites are stored per browser/device and do not sync across devices.
