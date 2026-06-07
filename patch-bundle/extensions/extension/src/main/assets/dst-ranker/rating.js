// ═══════════════════════════════════════════════════════════════════════
//  rating.js — derStandard Comment Ranker v1.6.6
//  Non-invasive rating prompt for the Chrome Web Store / AMO
//
//  ISOLATION GUARANTEE:
//  - This file has ZERO dependencies on content.js
//  - It uses its own storage keys, own DOM elements, own namespace
//  - content.js is NOT modified — sorting logic is 100% untouched
//  - If this file is removed, the extension works exactly as before
//
//  CROSS-BROWSER:
//  - Uses chrome.storage.sync (works in Chrome + Firefox MV3)
//  - No browser.* API needed — chrome.* is the universal MV3 standard
//  - Async/await with Promise wrappers for chrome.storage
//  - Browser-detection for correct review URL (Chrome Web Store vs AMO)
//
//  TIMING:
//  - First prompt: 7 days after first page load (installDate)
//  - "Later" dismiss: re-prompt after 30 days
//  - Star click (ratingGiven=true): NEVER show again
// ═══════════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ── Storage keys (own namespace, no conflicts with content.js) ──
  const KEYS = {
    INSTALL_DATE:    'dstRanker_installDate',
    RATING_GIVEN:    'dstRanker_ratingGiven',
    LAST_DISMISSED:  'dstRanker_lastDismissed',
  };

  const DELAY_FIRST_PROMPT  = 7 * 24 * 60 * 60 * 1000;  // 7 days in ms
  const DELAY_AFTER_DISMISS = 30 * 24 * 60 * 60 * 1000;  // 30 days in ms

  // ── Browser-detection for correct review URL ────────────────────
  // Firefox: typeof browser !== 'undefined' && browser.runtime
  // Chrome/Edge: chrome.runtime but no browser global (or browser is polyfill)
  const IS_FIREFOX = (typeof browser !== 'undefined' && typeof browser.runtime !== 'undefined');

  // Chrome Web Store URL (will be updated once published)
  const CHROME_STORE_URL = 'https://chromewebstore.google.com/detail/derstandard-comment-ranker';
  // Firefox AMO URL (will be updated once published)
  const AMO_URL = 'https://addons.mozilla.org/firefox/addon/derstandard-comment-ranker/reviews/';

  function getReviewURL() {
    return IS_FIREFOX ? AMO_URL : CHROME_STORE_URL;
  }

  // ── Promise wrapper for chrome.storage.sync ─────────────────────
  function storageGet(keys) {
    return new Promise((resolve) => {
      try {
        chrome.storage.sync.get(keys, (data) => resolve(data || {}));
      } catch (e) {
        resolve({});
      }
    });
  }

  function storageSet(obj) {
    return new Promise((resolve) => {
      try {
        chrome.storage.sync.set(obj, () => resolve());
      } catch (e) {
        resolve();
      }
    });
  }

  // ── Wait for the badge bar to exist (proves extension is active) ──
  function waitForBadgeBar(maxWait = 15000) {
    return new Promise((resolve) => {
      const start = Date.now();

      function check() {
        const forum = document.querySelector('dst-forum');
        if (forum && forum.shadowRoot) {
          const bar = forum.shadowRoot.querySelector('#dst-badge-bar');
          if (bar) return resolve(bar);
        }
        if (Date.now() - start > maxWait) return resolve(null);
        setTimeout(check, 500);
      }

      check();
    });
  }

  // ── CSS for the rating bar (injected once into <head>) ──────────
  const RATING_CSS = `
    /* Rating bar — appears below the badge bar inside shadow DOM */
    #dst-rating-bar {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      background: linear-gradient(180deg, #f9fdf6 0%, #eef4e8 100%);
      border: 1.5px solid #B7CCA3;
      border-radius: 10px;
      margin: 8px 0 4px;
      box-shadow: 0 2px 8px rgba(183,204,163,0.2);
      position: relative;
      opacity: 1;
      transform: scale(1) translateY(0);
      transform-origin: center center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    #dst-rating-bar .dst-rate-icon {
      width: 32px;
      height: 32px;
      min-width: 32px;
      background: #B7CCA3;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
    }

    #dst-rating-bar .dst-rate-text {
      flex: 1;
      min-width: 0;
    }
    #dst-rating-bar .dst-rate-title {
      font-size: 12.5px;
      font-weight: 700;
      color: #333;
      margin: 0 0 4px;
      line-height: 1.2;
    }

    /* Inline stars */
    #dst-rating-bar .dst-rate-stars {
      display: flex;
      gap: 3px;
      align-items: center;
    }
    #dst-rating-bar .dst-rate-star {
      font-size: 22px;
      cursor: pointer;
      color: #ccc;
      transition: color 0.12s ease, transform 0.12s ease;
      user-select: none;
      line-height: 1;
    }
    #dst-rating-bar .dst-rate-star:hover { transform: scale(1.15); }
    #dst-rating-bar .dst-rate-star.active { color: #F9A825; }
    #dst-rating-bar .dst-rate-star.hover-preview { color: #FFCC02; }

    #dst-rating-bar .dst-rate-label {
      font-size: 11px;
      color: #888;
      margin-left: 8px;
      white-space: nowrap;
      transition: color 0.2s ease, font-weight 0.2s ease;
    }

    /* Dismiss button */
    #dst-rating-bar .dst-rate-dismiss {
      border: 1.5px solid #ddd;
      border-radius: 999px;
      padding: 5px 10px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      color: #999;
      background: transparent;
      flex-shrink: 0;
    }
    #dst-rating-bar .dst-rate-dismiss:hover {
      border-color: #aaa;
      color: #666;
      background: #f5f5f5;
    }

    /* ═══ Golden Glow Pulse — 4-layer, 3 diminishing cycles ═══ */
    @keyframes dst-golden-pulse {
      0% {
        transform: scale(1);
        box-shadow:
          0 2px 8px rgba(183,204,163,0.2),
          0 0 0 0px rgba(255,215,0,0),
          0 0 0px rgba(255,215,0,0),
          0 0 0px rgba(255,193,7,0);
      }
      12% {
        transform: scale(1.04);
        box-shadow:
          0 2px 8px rgba(183,204,163,0.2),
          0 0 0 3px rgba(255,215,0,0.7),
          0 0 18px rgba(255,215,0,0.45),
          0 0 35px rgba(255,193,7,0.22),
          inset 0 0 10px rgba(255,215,0,0.06);
      }
      24% {
        transform: scale(1);
        box-shadow:
          0 2px 8px rgba(183,204,163,0.2),
          0 0 0 2px rgba(255,215,0,0.4),
          0 0 12px rgba(255,215,0,0.25),
          0 0 24px rgba(255,193,7,0.1),
          inset 0 0 6px rgba(255,215,0,0.03);
      }
      38% {
        transform: scale(1.03);
        box-shadow:
          0 2px 8px rgba(183,204,163,0.2),
          0 0 0 2.5px rgba(255,215,0,0.55),
          0 0 14px rgba(255,215,0,0.32),
          0 0 28px rgba(255,193,7,0.14),
          inset 0 0 8px rgba(255,215,0,0.04);
      }
      52% {
        transform: scale(1);
        box-shadow:
          0 2px 8px rgba(183,204,163,0.2),
          0 0 0 1.5px rgba(255,215,0,0.3),
          0 0 8px rgba(255,215,0,0.18),
          0 0 18px rgba(255,193,7,0.07),
          inset 0 0 4px rgba(255,215,0,0.02);
      }
      68% {
        transform: scale(1.02);
        box-shadow:
          0 2px 8px rgba(183,204,163,0.2),
          0 0 0 2px rgba(255,215,0,0.38),
          0 0 10px rgba(255,215,0,0.22),
          0 0 22px rgba(255,193,7,0.08),
          inset 0 0 6px rgba(255,215,0,0.03);
      }
      82% {
        transform: scale(1);
        box-shadow:
          0 2px 8px rgba(183,204,163,0.2),
          0 0 0 1.5px rgba(255,215,0,0.22),
          0 0 6px rgba(255,215,0,0.1),
          0 0 14px rgba(255,193,7,0.04);
      }
      100% {
        transform: scale(1);
        box-shadow:
          0 2px 8px rgba(183,204,163,0.2),
          0 0 0 1px rgba(255,215,0,0.15),
          0 0 5px rgba(255,215,0,0.08),
          0 0 10px rgba(255,193,7,0.03);
      }
    }

    #dst-rating-bar.dst-golden-pulsing {
      animation: dst-golden-pulse 2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }

    /* ═══ Fade-out + height collapse ═══ */
    @keyframes dst-golden-fade {
      0% {
        opacity: 1;
        transform: translateY(0);
        max-height: 80px;
        margin: 8px 0 4px;
        padding: 10px 14px;
        box-shadow:
          0 2px 8px rgba(183,204,163,0.2),
          0 0 0 1px rgba(255,215,0,0.15),
          0 0 5px rgba(255,215,0,0.08);
      }
      50% {
        opacity: 0;
        transform: translateY(-6px);
        max-height: 80px;
        margin: 8px 0 4px;
        padding: 10px 14px;
        box-shadow: none;
      }
      100% {
        opacity: 0;
        transform: translateY(-6px);
        max-height: 0;
        margin: 0;
        padding: 0 14px;
        border-width: 0;
        box-shadow: none;
      }
    }

    #dst-rating-bar.dst-golden-fading {
      animation: dst-golden-fade 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
      pointer-events: none;
    }
  `;

  // ── Build the rating bar DOM element ────────────────────────────
  function createRatingBar() {
    const bar = document.createElement('div');
    bar.id = 'dst-rating-bar';

    // AMO Security Fix: DOM-Aufbau per createElement statt innerHTML
    const icon = document.createElement('div');
    icon.className = 'dst-rate-icon';
    const triUp = document.createElement('span');
    triUp.style.cssText = 'color:#2e7d32; font-size:13px;';
    triUp.textContent = '\u25B2';
    const triDown = document.createElement('span');
    triDown.style.cssText = 'color:#c62828; font-size:9px;';
    triDown.textContent = '\u25BC';
    icon.appendChild(triUp);
    icon.appendChild(triDown);

    const textWrap = document.createElement('div');
    textWrap.className = 'dst-rate-text';
    const title = document.createElement('div');
    title.className = 'dst-rate-title';
    title.textContent = 'Rate Comment Ranker for future improvements';
    const starsWrap = document.createElement('div');
    starsWrap.className = 'dst-rate-stars';
    for (let i = 1; i <= 5; i++) {
      const star = document.createElement('span');
      star.className = 'dst-rate-star';
      star.setAttribute('data-value', String(i));
      star.textContent = '\u2605';
      starsWrap.appendChild(star);
    }
    const rateLabel = document.createElement('span');
    rateLabel.className = 'dst-rate-label';
    rateLabel.textContent = 'Click to rate';
    starsWrap.appendChild(rateLabel);
    textWrap.appendChild(title);
    textWrap.appendChild(starsWrap);

    const dismissBtn = document.createElement('button');
    dismissBtn.className = 'dst-rate-dismiss';
    dismissBtn.title = 'Maybe later';
    dismissBtn.textContent = '\u2715';

    bar.appendChild(icon);
    bar.appendChild(textWrap);
    bar.appendChild(dismissBtn);

    return bar;
  }

  // ── Inject CSS into shadow DOM ──────────────────────────────────
  function injectCSS(shadowRoot) {
    if (shadowRoot.querySelector('#dst-rating-css')) return;
    const style = document.createElement('style');
    style.id = 'dst-rating-css';
    style.textContent = RATING_CSS;
    shadowRoot.appendChild(style);
  }

  // ── Wire up star interactions + dismiss ─────────────────────────
  function wireRatingBar(bar) {
    const stars = bar.querySelectorAll('.dst-rate-star');
    const label = bar.querySelector('.dst-rate-label');
    const dismissBtn = bar.querySelector('.dst-rate-dismiss');
    let rated = false;

    const labels = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'];

    // Hover preview
    stars.forEach(star => {
      star.addEventListener('mouseenter', () => {
        if (rated) return;
        const val = +star.dataset.value;
        stars.forEach(s => {
          s.classList.toggle('hover-preview',
            +s.dataset.value <= val && !s.classList.contains('active'));
        });
        label.textContent = labels[val];
      });

      star.addEventListener('mouseleave', () => {
        if (rated) return;
        stars.forEach(s => s.classList.remove('hover-preview'));
        label.textContent = 'Click to rate';
      });

      // Click → rate → golden pulse → fade → gone FOREVER
      star.addEventListener('click', async () => {
        if (rated) return;
        rated = true;

        const val = +star.dataset.value;

        // 1. Light up stars
        stars.forEach(s => {
          s.classList.remove('hover-preview');
          s.classList.toggle('active', +s.dataset.value <= val);
          s.style.cursor = 'default';
        });
        label.textContent = labels[val];
        label.style.color = '#B8860B';
        label.style.fontWeight = '700';

        // 2. Persist: ratingGiven = true → NEVER show again
        await storageSet({ [KEYS.RATING_GIVEN]: true });

        // 3. Golden pulse → fade → remove
        setTimeout(() => bar.classList.add('dst-golden-pulsing'), 80);
        setTimeout(() => {
          bar.classList.remove('dst-golden-pulsing');
          bar.classList.add('dst-golden-fading');
        }, 2200);
        setTimeout(() => {
          bar.style.display = 'none';
          bar.remove();
        }, 2600);

        // 4. Open review page (if ≥4 stars) — browser-aware URL
        if (val >= 4) {
          setTimeout(() => {
            try { window.open(getReviewURL(), '_blank'); } catch (e) { /* noop */ }
          }, 1500);
        }
      });
    });

    // Dismiss → "Maybe later" → re-prompt after 30 days
    dismissBtn.addEventListener('click', async () => {
      if (rated) return;
      rated = true;

      await storageSet({ [KEYS.LAST_DISMISSED]: Date.now() });

      bar.classList.add('dst-golden-fading');
      setTimeout(() => {
        bar.style.display = 'none';
        bar.remove();
      }, 400);
    });
  }

  // ── Main entry point ────────────────────────────────────────────
  async function main() {
    // Safety: only run on derstandard.at/.de
    const host = location.hostname;
    if (!host.includes('derstandard.at') && !host.includes('derstandard.de')) return;

    // 1. Read storage
    const data = await storageGet([
      KEYS.INSTALL_DATE,
      KEYS.RATING_GIVEN,
      KEYS.LAST_DISMISSED,
    ]);

    // 2. First ever load? Set installDate
    if (!data[KEYS.INSTALL_DATE]) {
      await storageSet({ [KEYS.INSTALL_DATE]: Date.now() });
      return; // Don't show on first load
    }

    // 3. Already rated? → NEVER show again
    if (data[KEYS.RATING_GIVEN]) return;

    // 4. Time checks
    const now = Date.now();
    const installAge = now - data[KEYS.INSTALL_DATE];

    // Not yet 7 days since install
    if (installAge < DELAY_FIRST_PROMPT) return;

    // Dismissed within last 30 days?
    if (data[KEYS.LAST_DISMISSED]) {
      const dismissAge = now - data[KEYS.LAST_DISMISSED];
      if (dismissAge < DELAY_AFTER_DISMISS) return;
    }

    // 5. Wait for badge bar (proves extension & forum are active)
    const badgeBar = await waitForBadgeBar();
    if (!badgeBar) return; // No forum on this page, or extension inactive

    // 6. Get the shadow root
    const forum = document.querySelector('dst-forum');
    if (!forum || !forum.shadowRoot) return;
    const shadowRoot = forum.shadowRoot;

    // 7. Don't inject twice
    if (shadowRoot.querySelector('#dst-rating-bar')) return;

    // 8. Inject CSS + rating bar
    injectCSS(shadowRoot);
    const ratingBar = createRatingBar();
    wireRatingBar(ratingBar);

    // 9. Insert after the badge bar
    badgeBar.insertAdjacentElement('afterend', ratingBar);
  }

  // ── Run when DOM is ready ───────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
  } else {
    // Small delay to let content.js inject the badge bar first
    setTimeout(main, 1000);
  }

})();
