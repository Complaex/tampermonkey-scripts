// ==UserScript==
// @name         Chess.com Engine Arrows
// @namespace    chesscom-engine-arrows
// @version      1.0
// @description  Shows the best move arrow in analysis as soon as the engine has a first result and adds an arrow for the second best move that gets thinner and more transparent the worse the move is, like on Lichess. Both can be switched on and off next to the engine settings.
// @match        https://www.chess.com/analysis*
// @match        https://www.chess.com/*/analysis*
// @run-at       document-idle
// @grant        none
// @sandbox      JavaScript
// @updateURL    https://raw.githubusercontent.com/Complaex/tampermonkey-scripts/main/chesscom-engine-arrows.user.js
// @downloadURL  https://raw.githubusercontent.com/Complaex/tampermonkey-scripts/main/chesscom-engine-arrows.user.js
// ==/UserScript==

(function () {
  'use strict';

  const STORAGE_KEY = 'kf-engine-arrows';

  // chess.com's own arrow color. Its arrow for the same move has the same key,
  // so both end up as one arrow instead of two on top of each other.
  const BEST_ARROW_COLOR = 'rgba(72, 193, 249, 0.8)';
  const SECOND_ARROW_COLOR = '#4a4a4a';

  // The second arrow is at its strongest if both moves are equally good and at its
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

  const options = loadOptions();

  const layer = document.createElementNS(SVG_NS, 'svg');
  layer.setAttribute('viewBox', '0 0 100 100');
  layer.setAttribute('class', 'kf-second-best-arrow');
  layer.style.cssText = 'position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none;';

  const secondArrow = document.createElementNS(SVG_NS, 'polygon');
  secondArrow.setAttribute('fill', SECOND_ARROW_COLOR);
  layer.append(secondArrow);

  const style = document.createElement('style');
  style.textContent = `
    .kf-arrow-switches {
      display: flex;
      flex-shrink: 0;
      gap: 2px;
    }
    .kf-arrow-switch {
      width: 2.2rem;
      height: 2.2rem;
      padding: 0;
      border: 0;
      border-radius: 0.4rem;
      background: rgba(255, 255, 255, 0.08);
      color: inherit;
      font-size: 1.2rem;
      font-weight: 700;
      line-height: 1;
      cursor: pointer;
      opacity: 0.35;
    }
    .kf-arrow-switch:hover {
      background: rgba(255, 255, 255, 0.16);
    }
    .kf-arrow-switch[aria-pressed="true"] {
      opacity: 1;
    }
    .kf-arrow-switch-best[aria-pressed="true"] {
      color: rgb(72, 193, 249);
    }
  `;
  document.head.appendChild(style);

  const switches = document.createElement('div');
  switches.className = 'kf-arrow-switches';
  switches.append(
    createSwitch('1', 'instantBest', 'kf-arrow-switch-best', 'Show best move arrow instantly'),
    createSwitch('2', 'secondBest', 'kf-arrow-switch-second', 'Show second best move arrow'),
  );

  let drawnBestKey = null;
  let drawnSecondKey = '';

  function loadOptions() {
    const defaults = { instantBest: true, secondBest: true };
    try {
      return { ...defaults, ...JSON.parse(localStorage.getItem(STORAGE_KEY)) };
    } catch {
      return defaults;
    }
  }

  function saveOptions() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(options));
    } catch {
      // The switches still work until the page is reloaded.
    }
  }

  function createSwitch(label, option, className, title) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `kf-arrow-switch ${className}`;
    button.textContent = label;
    button.title = title;
    button.setAttribute('aria-label', title);
    button.setAttribute('aria-pressed', String(options[option]));
    button.addEventListener('click', () => {
      options[option] = !options[option];
      button.setAttribute('aria-pressed', String(options[option]));
      saveOptions();
      update();
    });
    return button;
  }

  // Follows the "Suggestion Arrow" option in chess.com's analysis settings.
  function suggestionArrowEnabled() {
    try {
      const settings = JSON.parse(localStorage.getItem('json_settings'));
      return settings.analysis_modal_settings.suggestionArrowEnabled !== false;
    } catch {
      return true;
    }
  }

  // The engine lines of the current position, best line first.
  function engineLines(game) {
    const lines = document.querySelector('.engine-lines-engine-lines-redesign');
    if (!lines || lines.getAttribute('fen') !== game.getFEN()) return [];
    return [...lines.querySelectorAll('.engine-line-component')];
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

  function lineMove(game, line) {
    const moveElement = line && line.querySelector('.move-san-highlight');
    if (!moveElement) return null;

    const san = readSan(moveElement);
    return game.getLegalMoves().find((legalMove) => legalMove.san === san) || null;
  }

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

  function secondBestMove(game, lines) {
    const [bestLine, secondLine] = lines;
    const bestScoreElement = bestLine && bestLine.querySelector('.score-text-score');
    const secondScoreElement = secondLine && secondLine.querySelector('.score-text-score');
    if (!bestScoreElement || !secondScoreElement) return null;

    const bestChances = winningChances(bestScoreElement.textContent.trim());
    const secondChances = winningChances(secondScoreElement.textContent.trim());
    if (Number.isNaN(bestChances) || Number.isNaN(secondChances)) return null;

    const move = lineMove(game, secondLine);
    if (!move) return null;

    const shift = Math.abs(bestChances - secondChances) / 2;
    const strength = Math.max(0, 1 - shift / MAX_SHIFT);
    return { move, strength };
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

  function updateBestArrow(game, lines) {
    const enabled = options.instantBest && suggestionArrowEnabled();
    const move = enabled ? lineMove(game, lines[0]) : null;
    const key = move ? `${move.from}${move.to}` : null;
    const arrows = game.getMarkings().arrow || {};

    // The color check keeps arrows the user has drawn on the same squares.
    const drawn = drawnBestKey && arrows[drawnBestKey];
    if (drawn && drawnBestKey !== key && drawn.color === BEST_ARROW_COLOR) {
      game.markings.removeOne(`arrow|${drawnBestKey}`);
    }

    if (move && !arrows[key]) {
      game.markings.addOne({
        type: 'arrow',
        data: { from: move.from, to: move.to, color: BEST_ARROW_COLOR },
      });
    }

    drawnBestKey = key;
  }

  function updateSecondArrow(board, game, lines) {
    const second = options.secondBest ? secondBestMove(game, lines) : null;
    const flipped = board.classList.contains('flipped');
    const key = second
      ? `${second.move.from}${second.move.to}${flipped}${second.strength.toFixed(2)}`
      : '';

    if (layer.parentElement !== board) board.append(layer);
    if (key === drawnSecondKey) return;
    drawnSecondKey = key;

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
      secondArrow.setAttribute('points', arrowPoints(from, to, corner, size));
      secondArrow.setAttribute('opacity', mix(WEAKEST_OPACITY, STRONGEST_OPACITY).toFixed(2));
    }
  }

  // chess.com rebuilds the options bar now and then, so the switches are put back when needed.
  function updateSwitches() {
    const settingsButton = document.querySelector('.analysis-options-right button[aria-label="Settings"]');
    if (settingsButton && switches.nextElementSibling !== settingsButton) {
      settingsButton.before(switches);
    }
  }

  function update() {
    updateSwitches();

    const board = document.querySelector('wc-chess-board');
    if (!board || !board.game) return;

    const lines = engineLines(board.game);
    updateBestArrow(board.game, lines);
    updateSecondArrow(board, board.game, lines);
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
