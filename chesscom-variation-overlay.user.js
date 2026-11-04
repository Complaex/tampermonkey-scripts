// ==UserScript==
// @name         Chess.com Variation Overlay
// @namespace    chesscom-variation-overlay
// @version      1.1
// @description  Shows chess.com's board overlay in game analysis whenever the current move is not part of the actual game.
// @match        https://www.chess.com/analysis/game/*
// @match        https://www.chess.com/*/analysis/game/*
// @run-at       document-idle
// @grant        none
// @updateURL    https://raw.githubusercontent.com/Complaex/tampermonkey-scripts/main/chesscom-variation-overlay.user.js
// @downloadURL  https://raw.githubusercontent.com/Complaex/tampermonkey-scripts/main/chesscom-variation-overlay.user.js
// ==/UserScript==

(function () {
  'use strict';

  // chess.com's own class, so the overlay looks the same as on the game page.
  const OVERLAY_CLASS = 'analysis-overlay';

  function updateOverlay() {
    const board = document.querySelector('wc-chess-board');
    if (!board) return;

    // Moves of the actual game have the class main-line-ply, variation moves do not.
    const selected = document.querySelector('wc-move-list .node-highlight-content.selected');
    const node = selected && selected.closest('.node');
    const inVariation = Boolean(node) && !node.classList.contains('main-line-ply');

    board.classList.toggle(OVERLAY_CLASS, inVariation);
  }

  let scheduled = false;
  new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      updateOverlay();
    });
  }).observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class'],
  });

  updateOverlay();
})();
