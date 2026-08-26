# Campaign Chess

A modular, dependency-light chess web app with three ways to play:

- **Invite a Friend** — generates a shareable link and plays live over
  WebRTC (peer-to-peer, no custom backend required).
- **Player vs Player** — two people, one device, pass it back and forth.
- **Player vs Computer** — four difficulty levels, Easy through Expert.

## Running it

No build step. Just open `index.html` in a browser.

For **Invite a Friend** to work reliably (WebRTC + clipboard APIs behave
better over http/https than `file://`), serve the folder instead of
double-clicking it:

bash
python3 -m http.server 8000
# then open http://localhost:8000


Anyone you send the generated invite link to needs to open it while your
tab is still open and connected to the internet — the link only works
while the host's browser tab is running.

## Project structure


chess-project/
├── index.html                 All screens (menu, setup, invite, game)
├── css/
│   ├── base.css                Design tokens, typography, layout shell
│   ├── menu.css                Mode cards, setup & invite screens
│   ├── board.css                The board itself
│   └── panel.css                Side panel: status, captures, ledger
└── js/
    ├── utils-pieces.js          Unicode glyphs + file labels
    ├── board-ui.js               BoardUI: renders squares, reports clicks
    ├── ai-engine.js              Minimax + alpha-beta computer opponent
    ├── game-controller.js        Wires chess.js + BoardUI + side panel together
    ├── mode-local-pvp.js         Mode adapter: same-device 2 players
    ├── mode-vs-computer.js       Mode adapter: human vs App.AI
    ├── mode-online-friend.js     Mode adapter: syncs moves over a PeerJS connection
    └── main.js                   Screen routing + PeerJS handshake + bootstrapping


### How the pieces fit together

`GameController` owns the single source of truth — a `chess.js` `Chess()`
instance — plus the `BoardUI` view and the side-panel DOM. It has **no idea**
which game mode is active. Instead, each mode file exports a small adapter
object with a few optional hooks:

| Hook | Purpose |
|---|---|
| `canMove(chess)` | May the local player move right now? |
| `afterMove(move, chess, controller, meta)` | Side effects after a move lands (send to peer, trigger the AI, etc.) |
| `afterReset(chess, controller)` | Runs on "New Game" |
| `init(controller)` | Runs once when the game screen is built |
| `allowUndo` | Set to `false` to hide the Undo button (used online, since undo would desync the two peers) |

This is what makes it easy to add a fourth mode later without touching the
board rendering or rules logic at all.

### The computer opponent (`ai-engine.js`)

A single-file minimax search with alpha-beta pruning, iterative deepening,
and a time budget per move so the UI never hangs for long:

| Difficulty | Search depth | Time budget | Notes |
|---|---|---|---|
| Easy | 1 ply | 250ms | Mostly picks a random legal move |
| Mid | 2 ply | 500ms | Occasionally plays from its top 3 candidates |
| Hard | 3 ply | 1.2s | Always plays its calculated best move |
| Expert | up to 5 ply | 2.5s | Iterative deepening within the time budget |

Evaluation is material count plus small piece-square tables that reward
central pawns/knights and reasonable development — intentionally simple and
readable rather than tournament-strength.

### Invite a Friend (`mode-online-friend.js` + PeerJS)

- The host generates a short room id and opens a `Peer` with PeerJS's free
  public broker (no server of your own needed).
- The shareable link is `?room=<id>` appended to the page's own URL.
- When a guest opens that link, `main.js` reads the `room` query param and
  connects to the host directly over WebRTC.
- Host is always White; the guest is always Black.
- Moves are sent as small JSON messages (`{ type: 'move', from, to, promotion }`)
  over the WebRTC data channel — chess.js on both ends independently
  validates and applies them.
- Because this relies on a public broker + best-effort STUN, very strict
  corporate firewalls may block the connection. There's no game state
  stored anywhere except in the two browser tabs.

## Extending it

- Swap `ai-engine.js`'s evaluation function for a stronger one, or point
  `App.AI.chooseMove` at an external engine (e.g. Stockfish via WASM) —
  `mode-vs-computer.js` doesn't care how the move was chosen.
- Add a chat sidebar to online play by sending additional message types
  over the existing `conn` in `mode-online-friend.js`.
- Add a fifth mode (e.g. "puzzle of the day") by writing a new
  `mode-*.js` file with the same adapter shape and a new card in the menu.
