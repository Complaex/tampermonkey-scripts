// ==UserScript==
// @name         Chess.com Move Time
// @namespace    chesscom-move-time
// @version      1.0
// @description  Shows how long the current move took next to the clock of the player who made it in game analysis.
// @match        https://www.chess.com/analysis/game/*
// @match        https://www.chess.com/*/analysis/game/*
// @run-at       document-idle
// @grant        none
// @updateURL    https://raw.githubusercontent.com/Complaex/tampermonkey-scripts/main/chesscom-move-time.user.js
// @downloadURL  https://raw.githubusercontent.com/Complaex/tampermonkey-scripts/main/chesscom-move-time.user.js
// ==/UserScript==

(function () {
  'use strict';

  const BADGE_CLASS = 'kf-move-time';
  const GAP_TO_CLOCK = 8;

  // The class is doubled to win against chess.com's clock styles.
  const style = document.createElement('style');
  style.textContent = `
    .${BADGE_CLASS}.${BADGE_CLASS} {
      position: absolute;
      top: 0;
      bottom: 0;
      left: auto;
      width: auto;
      min-width: 0;
      padding: 0 0.8rem;
      white-space: nowrap;
      opacity: 0.8;
    }
  `;
  document.head.appendChild(style);

  // The move-time classes are those of chess.com's inactive clock, so the badge looks the same.
  const badge = document.createElement('div');
  badge.className = `${BADGE_CLASS} move-time-time move-time-dark move-time-iconless move-time-inactive`;
  // Without move-time-monospace: that font shows letters like the "s" as chess pieces.
  const badgeText = document.createElement('div');
  badgeText.className = 'move-time-content';
  badge.append(badgeText);

  // The time of a move of the actual game, or null for variations and the start position.
  function currentMove() {
    const selected = document.querySelector('wc-move-list .node-highlight-content.selected');
    const node = selected && selected.closest('.node');
    if (!node || !node.classList.contains('main-line-ply')) return null;

    // data-node is "0-9" for the tenth half move, data-ply counts from 1.
    const ply = Number(node.dataset.node.split('-')[1]) + 1;
    const timestamp = document.querySelector(`[data-move-list-el="timestamp"][data-ply="${ply}"]`);
    const time = timestamp && timestamp.textContent.trim();
    if (!time) return null;

    return { time, white: node.classList.contains('white-move') };
  }

  function moverClock(white) {
    const board = document.querySelector('wc-chess-board');
    if (!board) return null;

    const flipped = board.classList.contains('flipped');
    const side = white === flipped ? 'top' : 'bottom';
    return document.querySelector(`.board-layout-${side} .player-clock`);
  }

  function update() {
    const move = currentMove();
    const clock = move && moverClock(move.white);

    if (!clock) {
      badge.remove();
      return;
    }

    // The clock cuts off its content, so the badge sits next to it instead of inside it.
    if (badge.parentElement !== clock.parentElement) clock.parentElement.append(badge);
    badge.style.right = `${clock.offsetWidth + GAP_TO_CLOCK}px`;
    if (badgeText.textContent !== move.time) badgeText.textContent = move.time;
  }

  let scheduled = false;
  new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      update();
    });
  }).observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class'],
  });

  window.addEventListener('resize', update);
  update();
})();
