// ==UserScript==
// @name         Chess.com Second Best Arrow
// @namespace    chesscom-second-best-arrow
// @version      1.5
// @description  Shows an arrow for the engine's second best move in analysis that gets thinner and more transparent the worse the move is, like on Lichess.
// @match        https://www.chess.com/analysis*
// @match        https://www.chess.com/*/analysis*
// @run-at       document-idle
// @grant        none
// @sandbox      JavaScript
// @updateURL    https://raw.githubusercontent.com/Complaex/tampermonkey-scripts/main/chesscom-second-best-arrow.user.js
// @downloadURL  https://raw.githubusercontent.com/Complaex/tampermonkey-scripts/main/chesscom-second-best-arrow.user.js
// ==/UserScript==

(function () {
  'use strict';

  const ARROW_COLOR = '#4a4a4a';

  // The arrow is at its strongest if both moves are equally good and at its
  // weakest from this loss of winning chances on (same limit as on Lichess).
  const MAX_SHIFT = 0.2;
  const STRONGEST_OPACITY = 0.55;
  const WEAKEST_OPACITY = 0.2;

  // Sizes in percent of the board. The strongest arrow is as big as chess.com's own arrow.
  const STRONGEST_SIZE = { width: 2.75, headWidth: 6.5, headLength: 4.5 };
  const WEAKEST_SIZE = { width: 0.5, headWidth: 3.4, headLength: 3 };
  const START_OFFSET = 4.5;

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const PIECE_LETTERS = { king: 'K', queen: 'Q', rook: 'R', bishop: 'B', knight: 'N' };

  const layer = document.createElementNS(SVG_NS, 'svg');
  layer.setAttribute('viewBox', '0 0 100 100');
  layer.setAttribute('class', 'kf-second-best-arrow');
  layer.style.cssText = 'position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none;';

  const arrow = document.createElementNS(SVG_NS, 'polygon');
  arrow.setAttribute('fill', ARROW_COLOR);
  layer.append(arrow);

  let drawnKey = '';

  // Formula from Lichess: turns centipawns into winning chances from -1 to 1.
  function rawWinningChances(centipawns) {
    return 2 / (1 + Math.exp(-0.00368208 * centipawns)) - 1;
  }

  // Engine scores are always from White's point of view: +0.46, -1.20, M3, -M3.
  function winningChances(scoreText) {
    const mate = scoreText.match(/M(\d+)/);
    if (mate) {
      const centipawns = (21 - Math.min(10, Number(mate[1]))) * 100;
      return rawWinningChances(scoreText.startsWith('-') ? -centipawns : centipawns);
    }
    const centipawns = parseFloat(scoreText) * 100;
    return rawWinningChances(Math.min(Math.max(-1000, centipawns), 1000));
  }

  function secondBestMove(game) {
    const lines = document.querySelector('.engine-lines-engine-lines-redesign');
    if (!lines || lines.getAttribute('fen') !== game.getFEN()) return null;

    const [bestLine, secondLine] = lines.querySelectorAll('.engine-line-component');
    const bestScoreElement = bestLine && bestLine.querySelector('.score-text-score');
    const secondScoreElement = secondLine && secondLine.querySelector('.score-text-score');
    const moveElement = secondLine && secondLine.querySelector('.move-san-highlight');
    if (!bestScoreElement || !secondScoreElement || !moveElement) return null;

    const bestChances = winningChances(bestScoreElement.textContent.trim());
    const secondChances = winningChances(secondScoreElement.textContent.trim());
    if (Number.isNaN(bestChances) || Number.isNaN(secondChances)) return null;

    const san = readSan(moveElement);
    const move = game.getLegalMoves().find((legalMove) => legalMove.san === san);
    if (!move) return null;

    const shift = Math.abs(bestChances - secondChances) / 2;
    const strength = Math.max(0, 1 - shift / MAX_SHIFT);
    return { move, strength };
  }

  // With figurine notation the piece is an icon next to the text, e.g. [bishop icon] + "f2".
  function readSan(moveElement) {
    let san = '';
    for (const part of moveElement.children) {
      const piece = part.classList.contains('move-san-figurine')
        && part.className.match(/king|queen|rook|bishop|knight/);
      san += piece ? PIECE_LETTERS[piece[0]] : part.textContent;
    }
    return san.trim();
  }

  function squareCenter(square, flipped) {
    const file = square.charCodeAt(0) - 'a'.charCodeAt(0);
    const rank = Number(square[1]) - 1;
    const x = (file + 0.5) * 12.5;
    const y = (7 - rank + 0.5) * 12.5;
    return flipped ? { x: 100 - x, y: 100 - y } : { x, y };
  }

  // Like chess.com, knight arrows go two squares first and then turn one square.
  function knightCorner(from, to) {
    const longLegIsVertical = Math.abs(to.y - from.y) > Math.abs(to.x - from.x);
    return longLegIsVertical ? { x: from.x, y: to.y } : { x: to.x, y: from.y };
  }

  function direction(from, to) {
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    return { x: (to.x - from.x) / length, y: (to.y - from.y) / length };
  }

  function normal(dir) {
    return { x: -dir.y, y: dir.x };
  }

  function offset(point, dir, distance) {
    return { x: point.x + dir.x * distance, y: point.y + dir.y * distance };
  }

  function arrowPoints(from, to, corner, size) {
    const startDir = direction(from, corner || to);
    const endDir = direction(corner || from, to);
    const startNormal = normal(startDir);
    const endNormal = normal(endDir);

    const start = offset(from, startDir, START_OFFSET);
    const neck = offset(to, endDir, -size.headLength);
    const shaft = size.width / 2;
    const head = size.headWidth / 2;

    // The corner of the outline is shifted along both normals (the turn is always 90 degrees).
    const outerCorner = corner ? [offset(offset(corner, startNormal, shaft), endNormal, shaft)] : [];
    const innerCorner = corner ? [offset(offset(corner, startNormal, -shaft), endNormal, -shaft)] : [];

    return [
      offset(start, startNormal, shaft),
      ...outerCorner,
      offset(neck, endNormal, shaft),
      offset(neck, endNormal, head),
      to,
      offset(neck, endNormal, -head),
      offset(neck, endNormal, -shaft),
      ...innerCorner,
      offset(start, startNormal, -shaft),
    ].map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(' ');
  }

  function update() {
    const board = document.querySelector('wc-chess-board');
    if (!board || !board.game) return;

    const second = secondBestMove(board.game);
    const flipped = board.classList.contains('flipped');
    const key = second
      ? `${second.move.from}${second.move.to}${flipped}${second.strength.toFixed(2)}`
      : '';

    if (layer.parentElement !== board) board.append(layer);
    if (key === drawnKey) return;
    drawnKey = key;

    layer.style.display = second ? '' : 'none';
    if (second) {
      const { move, strength } = second;
      const from = squareCenter(move.from, flipped);
      const to = squareCenter(move.to, flipped);
      const corner = move.piece === 'n' ? knightCorner(from, to) : null;
      const mix = (weakest, strongest) => weakest + (strongest - weakest) * strength;
      const size = {
        width: mix(WEAKEST_SIZE.width, STRONGEST_SIZE.width),
        headWidth: mix(WEAKEST_SIZE.headWidth, STRONGEST_SIZE.headWidth),
        headLength: mix(WEAKEST_SIZE.headLength, STRONGEST_SIZE.headLength),
      };
      arrow.setAttribute('points', arrowPoints(from, to, corner, size));
      arrow.setAttribute('opacity', mix(WEAKEST_OPACITY, STRONGEST_OPACITY).toFixed(2));
    }
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
    characterData: true,
    attributes: true,
    attributeFilter: ['class', 'fen'],
  });

  update();
})();
