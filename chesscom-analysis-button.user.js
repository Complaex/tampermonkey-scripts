// ==UserScript==
// @name         Chess.com Analysis Button
// @namespace    chesscom-analysis-button
// @version      1.4
// @description  Adds a button next to each game in your game lists that opens the regular analysis directly (not Game Review).
// @match        https://www.chess.com/games/archive*
// @match        https://www.chess.com/*/games/archive*
// @match        https://www.chess.com/home*
// @match        https://www.chess.com/*/home*
// @match        https://www.chess.com/member/*
// @match        https://www.chess.com/*/member/*
// @run-at       document-idle
// @grant        none
// @updateURL    https://raw.githubusercontent.com/Complaex/tampermonkey-scripts/main/chesscom-analysis-button.user.js
// @downloadURL  https://raw.githubusercontent.com/Complaex/tampermonkey-scripts/main/chesscom-analysis-button.user.js
// ==/UserScript==

(function () {
  'use strict';

  const BUTTON_CLASS = 'kf-analysis-button';
  const TOOLTIP_TEXT = 'Analyze';
  const ICON = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25"
         stroke-linecap="round" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="7"/>
      <path d="M15.75 15.75 21 21"/>
    </svg>`;

  const style = document.createElement('style');
  style.textContent = `
    .${BUTTON_CLASS} {
      position: relative;
      z-index: 2;
      flex: none;
      text-decoration: none;
    }
    .${BUTTON_CLASS} svg {
      display: block;
      width: 2rem;
      height: 2rem;
    }
    .game-history-games-actions:has(.${BUTTON_CLASS}) {
      gap: 0.4rem;
      align-items: center;
    }
  `;
  document.head.appendChild(style);

  // Same structure as the tooltip chess.com attaches to its own icon buttons.
  function showTooltip(button) {
    hideTooltip(button);
    const rect = button.getBoundingClientRect();
    const tooltip = document.createElement('div');
    tooltip.setAttribute('popover', 'manual');
    tooltip.className = 'cc-tooltip-component dark-mode';
    tooltip.style.cssText = `--target-width: ${rect.width}px; left: ${rect.left}px; top: ${rect.top}px; ` +
      `width: ${rect.width}px; height: ${rect.height}px;`;
    tooltip.innerHTML = `
      <div class="cc-tooltip-content cc-tooltip-top cc-text-medium-bold cc-tooltip-anchor-center"
           style="transition-duration: 200ms;">
        <div class="cc-tooltip-inner">${TOOLTIP_TEXT}</div>
      </div>`;
    button.append(tooltip);
    tooltip.showPopover();
    requestAnimationFrame(() => {
      tooltip.firstElementChild.classList.add('cc-tooltip-visible');
    });
  }

  function hideTooltip(button) {
    const tooltip = button.querySelector('.cc-tooltip-component');
    if (tooltip) tooltip.remove();
  }

  // Returns e.g. /analysis/game/live/123/analysis?flip=true
  function analysisUrl(row) {
    const rowLink = row.querySelector('.game-history-games-row-link');
    const match = rowLink && rowLink.getAttribute('href').match(/\/game\/(live|daily)\/(\d+)/);
    if (!match) return null;

    // The row's review link shows whether the board needs flipping (game played as Black).
    const reviewLink = row.querySelector('a[href*="/analysis/game/"]');
    const flip = reviewLink && reviewLink.getAttribute('href').includes('flip=true');

    return `/analysis/game/${match[1]}/${match[2]}/analysis${flip ? '?flip=true' : ''}`;
  }

  function addButtons() {
    for (const row of document.querySelectorAll('.game-history-games-row')) {
      const actions = row.querySelector('.game-history-games-actions');
      const url = analysisUrl(row);
      if (!actions || !url) continue;

      // The list reuses rows when paging, so always refresh the link.
      let button = actions.querySelector('.' + BUTTON_CLASS);
      if (!button) {
        button = document.createElement('a');
        // The cc classes are those of chess.com's icon buttons (same color and hover effect).
        button.className = `${BUTTON_CLASS} cc-icon-button-component cc-icon-button-small cc-icon-button-ghost cc-bg-ghost`;
        button.innerHTML = ICON;
        button.setAttribute('aria-label', TOOLTIP_TEXT);
        button.addEventListener('mouseenter', () => showTooltip(button));
        button.addEventListener('mouseleave', () => hideTooltip(button));
        // Otherwise the click would also trigger the whole row.
        button.addEventListener('click', (event) => event.stopPropagation());
        actions.prepend(button);
      }
      if (button.getAttribute('href') !== url) button.setAttribute('href', url);
    }
  }

  let scheduled = false;
  new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      addButtons();
    });
  }).observe(document.body, { childList: true, subtree: true });

  addButtons();
})();
