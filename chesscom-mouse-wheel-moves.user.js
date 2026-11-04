// ==UserScript==
// @name         Chess.com Mouse Wheel Moves
// @namespace    chesscom-mouse-wheel-moves
// @version      1.1
// @description  Step through the moves in analysis with the mouse wheel over the board, like on Lichess.
// @match        https://www.chess.com/analysis*
// @match        https://www.chess.com/*/analysis*
// @run-at       document-idle
// @grant        none
// @updateURL    https://raw.githubusercontent.com/Complaex/tampermonkey-scripts/main/chesscom-mouse-wheel-moves.user.js
// @downloadURL  https://raw.githubusercontent.com/Complaex/tampermonkey-scripts/main/chesscom-mouse-wheel-moves.user.js
// ==/UserScript==

(function () {
  'use strict';

  const BOARD_AREA = '.board-layout-chessboard, wc-chess-board';

  // One mouse wheel notch is about 100 pixels. A touchpad sends many small
  // values, which are added up here until they make one move.
  const STEP = 100;

  let scrolled = 0;

  function pressArrow(key) {
    document.dispatchEvent(new KeyboardEvent('keydown', {
      key,
      code: key,
      keyCode: key === 'ArrowRight' ? 39 : 37,
      which: key === 'ArrowRight' ? 39 : 37,
      bubbles: true,
      cancelable: true,
    }));
  }

  document.addEventListener('wheel', (event) => {
    if (!(event.target instanceof Element) || !event.target.closest(BOARD_AREA)) return;

    // Otherwise the page would scroll as well.
    event.preventDefault();

    if (Math.sign(event.deltaY) !== Math.sign(scrolled)) scrolled = 0;
    scrolled += event.deltaY;

    if (Math.abs(scrolled) >= STEP) {
      pressArrow(scrolled > 0 ? 'ArrowRight' : 'ArrowLeft');
      scrolled = 0;
    }
  }, { passive: false });
})();
