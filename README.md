# Tampermonkey Scripts

Userscripts for different websites. Install [Tampermonkey](https://www.tampermonkey.net/), then click an install link below.

## chess.com

| Script | What it does | Install |
|---|---|---|
| Analysis Button | Adds a button next to each game in your game lists that opens the regular analysis directly, not Game Review | [Install](https://raw.githubusercontent.com/Complaex/tampermonkey-scripts/main/chesscom-analysis-button.user.js) |
| Mouse Wheel Moves | Steps through the moves in analysis with the mouse wheel over the board, like on Lichess | [Install](https://raw.githubusercontent.com/Complaex/tampermonkey-scripts/main/chesscom-mouse-wheel-moves.user.js) |
| Variation Overlay | Shows the board overlay in game analysis whenever the current move is not part of the actual game | [Install](https://raw.githubusercontent.com/Complaex/tampermonkey-scripts/main/chesscom-variation-overlay.user.js) |
| Engine Arrows | Shows the blue best move arrow as soon as the engine has a first result and adds a gray arrow for the second best move that gets thinner and more transparent the worse the move is. The buttons 1 and 2 at the end of the first two engine lines switch them on and off | [Install](https://raw.githubusercontent.com/Complaex/tampermonkey-scripts/main/chesscom-engine-arrows.user.js) |
| Move Time | Shows how long the current move took next to the clock of the player who made it in game analysis | [Install](https://raw.githubusercontent.com/Complaex/tampermonkey-scripts/main/chesscom-move-time.user.js) |

Tampermonkey checks these links for new versions and updates the scripts by itself.

### Notes

- All scripts only change what you see in your own browser.
- Engine Arrows runs in analysis only, not in live games. It needs the engine lines turned on, and at least two lines for the gray arrow.
- The blue arrow follows the Suggestion Arrow option in the chess.com analysis settings.
- Engine Arrows expects the chess.com interface in English.
- Engine Arrows replaces the older Second Best Arrow script. Delete that one in Tampermonkey, or the gray arrow shows up twice.
