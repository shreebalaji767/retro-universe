# Retro Universe gameplay standards

## Multiplayer modes for competitive games

When adding a new game or upgrading an existing game that naturally supports competitive or turn-based play, include both of these options whenever they fit the game:

- **Local multiplayer**: two or more people can play on the same device, taking turns or using separate controls.
- **Vs Computer**: a player can play against a locally scripted computer opponent.

Use a visible mode selector when both modes are available. Keep the computer opponent entirely in ordinary JavaScript; do not use AI APIs, backend services, paid tools, or network dependencies. Provide keyboard and touchscreen controls where appropriate, and keep both modes responsive on small screens.

Preserve solo/puzzle-only games as solo where multiplayer would not make sense. Do not force multiplayer into games such as 2048, Minesweeper, or single-player platformers merely to satisfy this standard.

For existing competitive games, add the modes as part of future upgrades. Checkers and Tic-Tac-Toe support local play and vs computer; Pong supports local two-player and vs computer.
