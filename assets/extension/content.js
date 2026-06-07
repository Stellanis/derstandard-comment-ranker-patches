(function () {
  'use strict';

  const SORT_KEY = 'dstSorterEnabled';
  const MODE_KEY = 'dstSorterMode';
  const AUTOLOAD_KEY = 'dstSorterAutoLoad';
  // Legacy key for migration
  const LEGACY_MODE_KEY = 'dstSorterMode';

  // ── Sort mode definitions ───────────────────────────────────────
  // Icon CSS classes: ico-pri = primary (large), ico-sec = secondary (small)
  // AMO Security Fix: badgeIcons als DOM-Builder-Funktionen statt innerHTML-Strings
  // Jedes Icon-Element wird per createElement/textContent erzeugt (kein innerHTML)
  function _mkSpan(cls, color, text) {
    const s = document.createElement('span');
    s.className = cls;
    if (color) s.style.color = color;
    s.textContent = text;
    return s;
  }
  const SORT_MODES = {
    'balance-top':   { label: 'Top Balance',   buildIcon: function(p) { p.appendChild(_mkSpan('ico-pri','#2e7d32','\u25B2')); p.appendChild(_mkSpan('ico-sec','#c62828','\u25BC')); } },
    'balance-flop':  { label: 'Low Balance',   buildIcon: function(p) { p.appendChild(_mkSpan('ico-pri','#c62828','\u25BC')); p.appendChild(_mkSpan('ico-sec','#2e7d32','\u25B2')); } },
    'positive-only': { label: 'Top Likes',     buildIcon: function(p) { p.appendChild(_mkSpan('ico-pri','#2e7d32','\u25B2')); } },
    'negative-only': { label: 'Top Dislikes',  buildIcon: function(p) { p.appendChild(_mkSpan('ico-pri','#c62828','\u25BC')); } },
    'chronological': { label: 'Timeline',      buildIcon: function(p) { p.appendChild(_mkSpan('ico-pri', null, '\uD83D\uDD50')); } }
  };

  // CSS injected into shadow DOM: icon hierarchy, badge bar, animation, hide old buttons
  const ICON_STYLE_CSS = `
    /* Hide old tab navigation buttons (Alle Postings, Aelteste, Plus, Minus) */
    dst-forum--tabnavigation { display: none !important; }

    /* NOTE: Reply thread sections (SECTION.thread) are now attached as siblings
       of their parent posting groups and move together during sorting.
       This preserves the expand/collapse ("Antworten") functionality.
       We do NOT hide section.thread elements — derstandard.at manages their
       visibility natively via the "collapsed" CSS class. */

    /* Icon size hierarchy */
    .ico-pri { font-size:17px; line-height:1; vertical-align:middle; }
    .ico-sec { font-size:11px; line-height:1; vertical-align:middle; margin-left:1px; }

    /* Badge bar container — NO wrap, single row, centered */
    #dst-badge-bar {
      display: flex;
      flex-wrap: nowrap;
      gap: 6px;
      padding: 10px 0 6px 0;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
    }

    /* Individual badge button */
    .dst-badge-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      background: #fff;
      color: #333;
      font-size: 11.5px;
      font-weight: 600;
      padding: 5px 8px;
      border-radius: 20px;
      border: 2px solid #ddd;
      cursor: pointer;
      user-select: none;
      white-space: nowrap;
      line-height: 1;
      letter-spacing: .1px;
      transition: all 0.2s ease;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
      box-sizing: border-box;
      flex: 1 1 0;
      min-width: 0;
    }
    .dst-badge-btn:hover {
      border-color: #aaa;
      background: #f5f5f5;
      box-shadow: 0 2px 6px rgba(0,0,0,0.1);
    }

    /* Active badge: highlighted border, no scale */
    .dst-badge-btn.active {
      border-color: #2e7d32;
      border-width: 2.5px;
      background: #e8f5e9;
      box-shadow: 0 2px 8px rgba(46,125,50,0.25);
      font-weight: 700;
    }
    .dst-badge-btn.active:hover {
      background: #c8e6c9;
      border-color: #1b5e20;
    }

    /* Pulse click animation (no scale) */
    @keyframes dst-pulse-bounce {
      0%   { box-shadow: 0 2px 8px rgba(46,125,50,0.25); }
      30%  { box-shadow: 0 0 0 6px rgba(46,125,50,0.18); }
      60%  { box-shadow: 0 0 0 3px rgba(46,125,50,0.10); }
      100% { box-shadow: 0 2px 8px rgba(46,125,50,0.25); }
    }
    .dst-badge-btn.pulse {
      animation: dst-pulse-bounce 0.35s ease-out;
    }

    /* Coffee/Donate button — never gets active state */
    .dst-badge-btn.dst-coffee-btn {
      flex: 0 0 auto;
      min-width: 0;
      padding: 5px 7px;
      border-color: #ccc;
      color: #6d4c41;
      font-weight: 600;
      transition: all 0.2s ease;
    }
    .dst-badge-btn.dst-coffee-btn:hover {
      border-color: #FFD700;
      background: #fff8e1;
      animation: dst-coffee-golden-pulse 1.5s ease-in-out infinite;
    }
    .dst-badge-btn.dst-coffee-btn:hover .dst-coffee-icon {
      transform: scale(1.1);
    }

    /* Golden Pulse animation for Coffee badge */
    @keyframes dst-coffee-golden-pulse {
      0%   { box-shadow: 0 0 0 0 rgba(255, 215, 0, 0.7); }
      50%  { box-shadow: 0 0 20px 10px rgba(255, 215, 0, 0.4); }
      100% { box-shadow: 0 0 0 0 rgba(255, 215, 0, 0); }
    }

    /* V14 Coffee Steam Container */
    .dst-steam-container {
      position: absolute;
      bottom: 60%;
      left: 40%;
      transform: translateX(-50%);
      width: 25px;
      height: 50px;
      pointer-events: none;
      opacity: 0;
      transition: opacity 1.5s ease-out;
      overflow: visible;
    }
    .dst-badge-btn.dst-coffee-btn:hover .dst-steam-container {
      opacity: 1;
      transition: opacity 0.3s ease-in;
    }

    /* V14 Fine Steam Wisps */
    .dst-steam-wisp {
      position: absolute;
      bottom: 0;
      width: 4px;
      height: 8px;
      background: linear-gradient(to top,
        rgba(140, 140, 140, 0.5) 0%,
        rgba(160, 160, 160, 0.35) 40%,
        rgba(180, 180, 180, 0.2) 100%
      );
      border-radius: 50% 50% 30% 30% / 40% 40% 60% 60%;
      filter: blur(2.5px);
      box-shadow: 0 0 2px rgba(120, 120, 120, 0.2);
      animation: dst-steam-fine-rise 6s ease-out infinite;
    }
    .dst-steam-wisp:nth-child(1) { left: 48%; animation-delay: 0s; width: 3px; height: 7px; }
    .dst-steam-wisp:nth-child(2) { left: 50%; animation-delay: 0.2s; width: 4px; height: 8px; }
    .dst-steam-wisp:nth-child(3) { left: 49%; animation-delay: 0.4s; width: 3.5px; height: 7.5px; }
    .dst-steam-wisp:nth-child(4) { left: 51%; animation-delay: 0.6s; width: 3px; height: 7px; }
    .dst-steam-wisp:nth-child(5) { left: 50%; animation-delay: 0.8s; width: 3.5px; height: 8px; }

    @keyframes dst-steam-fine-rise {
      0%   { transform: translateY(0) translateX(0) rotate(0deg) scaleY(1); opacity: 0; }
      5%   { transform: translateY(-15px) translateX(0) rotate(2deg) scaleY(1.1); opacity: 0.7; }
      20%  { transform: translateY(-22px) translateX(1px) rotate(4deg) scaleY(1.3); opacity: 0.6; }
      40%  { transform: translateY(-30px) translateX(0) rotate(-3deg) scaleY(1.5); opacity: 0.5; }
      50%  { transform: translateY(-35px) translateX(-1px) rotate(-5deg) scaleY(1.6); opacity: 0.4; }
      60%  { transform: translateY(-40px) translateX(-1px) rotate(-4deg) scaleY(1.7); opacity: 0.25; }
      70%  { transform: translateY(-45px) translateX(0) rotate(-2deg) scaleY(1.8); opacity: 0.12; }
      80%  { transform: translateY(-49px) translateX(0) rotate(2deg) scaleY(1.85); opacity: 0.05; }
      90%  { transform: translateY(-51px) translateX(0) rotate(1deg) scaleY(1.88); opacity: 0.015; }
      100% { transform: translateY(-53px) translateX(0) rotate(0deg) scaleY(1.9); opacity: 0; }
    }
  `;

  let sortEnabled = true;
  let sortMode = 'balance-top'; // default
  let autoLoadEnabled = true;
  let observer = null;
  let sortTimeout = null;
  let isSorting = false;
  let lastSortSignature = '';
  let autoLoadClicked = false;
  let isLoadingAllPostings = false; // v1.7.3: Guard for loadAllPostings
  // v1.6.10: Removed ratingChangeDebounce — we no longer observe rating attribute changes
  // This prevents the extension from interfering with derStandard.at's vote processing

  // ── Utility: read ratings from a posting ───────────────────────
  function getPositiveRatings(posting) {
    const ratingEl = posting.querySelector('dst-posting--ratinglog');
    if (!ratingEl) return 0;
    return parseInt(ratingEl.getAttribute('positiveratings'), 10) || 0;
  }

  function getNegativeRatings(posting) {
    const ratingEl = posting.querySelector('dst-posting--ratinglog');
    if (!ratingEl) return 0;
    return parseInt(ratingEl.getAttribute('negativeratings'), 10) || 0;
  }

  function getNetRatings(posting) {
    return getPositiveRatings(posting) - getNegativeRatings(posting);
  }

  // ── Parse relative time strings like "vor 5 Stunden" ──────────
  function parseRelativeTime(text) {
    if (!text) return 0;
    const now = Date.now();
    // Match patterns like "vor 5 Stunden", "vor 2 Tagen", "vor 30 Minuten", "vor 1 Monat"
    const match = text.match(/vor\s+(\d+)\s+(Sekunde|Minute|Stunde|Tag|Woche|Monat|Jahr)n?/i);
    if (!match) return 0;
    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    let ms = 0;
    if (unit.startsWith('sekunde')) ms = value * 1000;
    else if (unit.startsWith('minute')) ms = value * 60 * 1000;
    else if (unit.startsWith('stunde')) ms = value * 60 * 60 * 1000;
    else if (unit.startsWith('tag')) ms = value * 24 * 60 * 60 * 1000;
    else if (unit.startsWith('woche')) ms = value * 7 * 24 * 60 * 60 * 1000;
    else if (unit.startsWith('monat')) ms = value * 30 * 24 * 60 * 60 * 1000;
    else if (unit.startsWith('jahr')) ms = value * 365 * 24 * 60 * 60 * 1000;
    return ms > 0 ? (now - ms) : 0;
  }

  // ── Extract timestamp from a posting for chronological sort ────
  function getPostingTimestamp(posting) {
    // Strategy 1: <time datetime="..."> with a valid ISO date
    let timeEl = posting.querySelector('time[datetime]');
    if (timeEl) {
      const dtAttr = timeEl.getAttribute('datetime');
      if (dtAttr && dtAttr !== 'null' && dtAttr !== 'undefined') {
        const parsed = new Date(dtAttr).getTime();
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
      // Strategy 1b: Parse relative time from <time> textContent
      const relTime = parseRelativeTime(timeEl.textContent);
      if (relTime > 0) return relTime;
    }

    // Strategy 2: Check shadow DOM of the posting
    if (posting.shadowRoot) {
      timeEl = posting.shadowRoot.querySelector('time[datetime]');
      if (timeEl) {
        const dtAttr = timeEl.getAttribute('datetime');
        if (dtAttr && dtAttr !== 'null' && dtAttr !== 'undefined') {
          const parsed = new Date(dtAttr).getTime();
          if (!isNaN(parsed) && parsed > 0) return parsed;
        }
        const relTime = parseRelativeTime(timeEl.textContent);
        if (relTime > 0) return relTime;
      }
    }

    // Strategy 3: Check sub-elements like dst-posting-head
    const headEl = posting.querySelector('dst-posting-head');
    if (headEl) {
      timeEl = headEl.querySelector('time');
      if (!timeEl && headEl.shadowRoot) {
        timeEl = headEl.shadowRoot.querySelector('time');
      }
      if (timeEl) {
        const dtAttr = timeEl.getAttribute('datetime');
        if (dtAttr && dtAttr !== 'null' && dtAttr !== 'undefined') {
          const parsed = new Date(dtAttr).getTime();
          if (!isNaN(parsed) && parsed > 0) return parsed;
        }
        const relTime = parseRelativeTime(timeEl.textContent);
        if (relTime > 0) return relTime;
      }
    }

    // Strategy 4: Find any <span> with relative time text
    const spans = posting.querySelectorAll('span');
    for (const span of spans) {
      if (span.children.length === 0) {
        const relTime = parseRelativeTime(span.textContent);
        if (relTime > 0) return relTime;
      }
    }

    // Strategy 5: data-created or data-timestamp attribute
    const ts = posting.getAttribute('data-created') ||
               posting.getAttribute('data-timestamp') ||
               posting.getAttribute('datetime') ||
               posting.getAttribute('data-date');
    if (ts) {
      const parsed = new Date(ts).getTime();
      if (!isNaN(parsed)) return parsed;
    }

    // Fallback: use DOM position (index) to preserve original order
    return 0;
  }

  // ── Build a signature of current ratings to detect changes ─────
  function buildSortSignature(groups) {
    return groups
      .map((g) => {
        const p = getPositiveRatings(g.posting);
        const n = getNegativeRatings(g.posting);
        return `${p}:${n}`;
      })
      .join(',');
  }

  // ── Detect if a posting is pinned ("angeheftet") ─────────────────
  function isPinnedPosting(posting) {
    if (posting.hasAttribute('pinned')) return true;
    if (posting.hasAttribute('data-pinned')) return true;
    if (posting.getAttribute('ispinned') === 'true') return true;
    if (posting.getAttribute('is-pinned') === 'true') return true;

    const classList = posting.className || '';
    if (/\bpinned\b/i.test(classList) || /\bis-pinned\b/i.test(classList) ||
        /\bposting--pinned\b/i.test(classList)) return true;

    const shadowRoot = posting.shadowRoot;
    if (shadowRoot) {
      const allText = shadowRoot.textContent || ''; // read-only, textContent statt innerHTML
      if (/angeheftet|📌/i.test(allText)) {
        const allElements = shadowRoot.querySelectorAll('*');
        for (const el of allElements) {
          for (const node of el.childNodes) {
            if (node.nodeType === Node.TEXT_NODE) {
              const text = node.textContent?.trim().toLowerCase() || '';
              if (text === 'angeheftet' || text === 'pinned' || text === '📌' ||
                  text.startsWith('angeheftet') || text.startsWith('📌')) {
                console.log('[DST Sorter] Pinned detected via shadow DOM text: "' + text + '"');
                return true;
              }
            }
          }
        }
      }

      const pinElements = shadowRoot.querySelectorAll(
        '.pinned, .is-pinned, .posting--pinned, .angeheftet, ' +
        '[class~="pinned"], [class~="is-pinned"], [class~="angeheftet"], [class~="sticky"]'
      );
      if (pinElements.length > 0) {
        console.log('[DST Sorter] Pinned detected via shadow DOM class');
        return true;
      }
    }

    const lightPinElements = posting.querySelectorAll(
      '.pinned, .is-pinned, .posting--pinned, .angeheftet, ' +
      '[class~="pinned"], [class~="is-pinned"], [class~="angeheftet"]'
    );
    if (lightPinElements.length > 0) return true;

    for (const child of posting.children) {
      const text = child.textContent?.trim().toLowerCase() || '';
      if (text === 'angeheftet' || text === 'pinned') return true;
    }

    const headerEl = posting.querySelector('dst-posting-head');
    if (headerEl) {
      const headerText = headerEl.textContent || '';
      if (/\bAngeheftet\b/i.test(headerText)) {
        console.log('[DST Sorter] Pinned detected via header text "Angeheftet"');
        return true;
      }
    }

    // Strategy: Check for <strong> or any element with "Angeheftet" text in light DOM
    const strongEls = posting.querySelectorAll('strong, b, span');
    for (const el of strongEls) {
      const text = el.textContent?.trim().toLowerCase() || '';
      if (text.startsWith('angeheftet') || text === '📌') {
        console.log('[DST Sorter] Pinned detected via <' + el.tagName + '> text: "' + el.textContent.trim() + '"');
        return true;
      }
    }

    // Strategy: Check full posting textContent for pinned indicators near the top
    const fullText = posting.textContent || '';
    if (/📌\s*Angeheftet|Angeheftet\s*·/i.test(fullText.substring(0, 300))) {
      console.log('[DST Sorter] Pinned detected via posting textContent');
      return true;
    }

    return false;
  }

  // ── Get posting ID for deduplication ───────────────────────────
  function getPostingId(posting) {
    const directId = posting.getAttribute('data-posting-id') ||
           posting.getAttribute('data-postingid') ||
           posting.getAttribute('data-id') ||
           posting.getAttribute('id') ||
           posting.getAttribute('postingid') ||
           posting.getAttribute('posting-id') ||
           null;
    if (directId) return directId;

    const ariaLabel = posting.getAttribute('aria-label') || '';
    if (ariaLabel) {
      const ratingEl = posting.querySelector('dst-posting--ratinglog');
      const pos = ratingEl ? (ratingEl.getAttribute('positiveratings') || '0') : '0';
      const neg = ratingEl ? (ratingEl.getAttribute('negativeratings') || '0') : '0';
      return ariaLabel + '|' + pos + ':' + neg;
    }

    return null;
  }

  // ── Detect if an element is the posting input form / reply box ────
  function isInputFormElement(el) {
    const tag = el.tagName?.toUpperCase() || '';

    // Check tag name for form-like custom elements
    if (/FORM|EDITOR|COMPOSE|POSTFORM|POSTING-FORM|REPLY-FORM|COMMENT-FORM/.test(tag)) return true;

    // Check if element contains <textarea>, <input type="text">, or contenteditable
    if (el.querySelector && (
      el.querySelector('textarea') ||
      el.querySelector('input[type="text"]') ||
      el.querySelector('[contenteditable="true"]')
    )) return true;

    // Check for button with "Posten"/"Absenden"/"Senden" text inside the element
    if (el.querySelector) {
      const buttons = el.querySelectorAll('button');
      for (const btn of buttons) {
        const txt = btn.textContent?.trim().toLowerCase() || '';
        if (txt === 'posten' || txt === 'absenden' || txt === 'senden' || txt === 'antworten') return true;
      }
    }

    // Check for specific CSS classes
    const cls = el.className || '';
    if (/\bposting-form\b|\bcomment-form\b|\breply-form\b|\bforum--form\b|\bforum--compose\b|\bforum--editor\b/i.test(cls)) return true;

    // Check shadow DOM for form elements
    if (el.shadowRoot) {
      if (el.shadowRoot.querySelector('textarea') ||
          el.shadowRoot.querySelector('input[type="text"]') ||
          el.shadowRoot.querySelector('[contenteditable="true"]')) return true;
      const shadowButtons = el.shadowRoot.querySelectorAll('button');
      for (const btn of shadowButtons) {
        const txt = btn.textContent?.trim().toLowerCase() || '';
        if (txt === 'posten' || txt === 'absenden' || txt === 'senden') return true;
      }
    }

    // Check if element has text "Titel" + "Kommentar" pattern (the derstandard.at input form)
    const text = el.textContent || '';
    if (/Titel/i.test(text) && /Kommentar/i.test(text) && /Posten/i.test(text)) return true;

    return false;
  }

  // ── Determine if a direct child of main is a root posting ────────────
  // On derstandard.at, the DOM inside main.forum--main looks like:
  //   DST-POSTING-BOX       → comment form
  //   SECTION.thread        → reply thread container (data-level=1 postings inside)
  //   DST-POSTING[level=0]  → root posting (SORTABLE)
  //   SLOT                  → ad container between postings
  //
  // The key visual indicator (as described by users):
  //   - Reply postings sit inside SECTION.thread elements with a grey left border
  //   - Root postings are DST-POSTING[data-level="0"] direct children of main
  //   - The "grey triangle" is the SECTION's border-left visual indicator
  function isRootPosting(el) {
    const tag = el.tagName?.toUpperCase();
    if (tag !== 'DST-POSTING') return false;

    // Primary check: data-level attribute
    const level = el.getAttribute('data-level');
    if (level === '0') return true;

    // If no data-level but it's a direct child of main (not inside a section.thread),
    // treat as root posting
    if (level === null || level === undefined) {
      const parent = el.parentElement;
      if (parent && parent.tagName?.toUpperCase() === 'MAIN') {
        console.log('[DST Sorter] DST-POSTING without data-level, direct child of main — treating as root');
        return true;
      }
    }

    return false;
  }

  // ── Determine if a direct child of main is a reply thread section ──
  function isReplyThreadSection(el) {
    const tag = el.tagName?.toUpperCase();
    if (tag !== 'SECTION') return false;

    // Check for thread-related CSS classes
    const cls = (el.className || '').toLowerCase();
    return cls.includes('thread');
  }

  // ── Collect posting "groups" for sorting ───────────────────────────
  // ARCHITECTURE (based on live DOM analysis of derstandard.at 2026):
  //
  //   main.forum--main children (original order):
  //     [0]  DST-POSTING-BOX          → comment form (keep separate)
  //     [1]  DST-POSTING[lv=0]        → root posting #1 (SORTABLE)
  //     [2]  SECTION.thread           → reply thread for posting #1 (SIBLING)
  //     [3]  SLOT                     → ad container (SIBLING)
  //     [4]  DST-POSTING[lv=0]        → root posting #2 (SORTABLE)
  //     [5]  SLOT                     → ad container (SIBLING)
  //     ...
  //
  // Each posting "group" = the DST-POSTING element + its trailing siblings
  // (SECTION.thread + SLOT). SECTION.thread elements MUST move with their
  // parent posting to preserve the expand/collapse ("Antworten") functionality.
  // Only DST-POSTING[data-level="0"] direct children of main are sortable.
  function collectPostingGroups(main) {
    const groups = [];
    const formElements = [];
    let current = null;
    const seenPostingIds = new Map();
    let skippedSections = 0;
    let skippedSlots = 0;

    for (const child of Array.from(main.children)) {
      const tag = child.tagName?.toUpperCase();

      // ── Case 1: SECTION.thread → Reply thread container ──
      // These sections contain level-1 reply postings (the replies).
      // They MUST move together with their parent root posting during sorting,
      // otherwise the expand/collapse ("Antworten") functionality breaks.
      // We attach them as siblings of the preceding posting group.
      if (isReplyThreadSection(child)) {
        if (current) {
          current.siblings.push(child);
        }
        skippedSections++;
        continue;
      }

      // ── Case 2: DST-POSTING[data-level="0"] → Root posting → NEW sortable group ──
      // IMPORTANT: Check this BEFORE isInputFormElement, because root postings
      // contain "Antworten" buttons that would falsely match the form heuristic.
      if (isRootPosting(child)) {
        const pinned = isPinnedPosting(child);
        const postingId = getPostingId(child);

        let isDuplicate = false;
        if (postingId) {
          if (seenPostingIds.has(postingId)) {
            isDuplicate = true;
            const firstGroup = seenPostingIds.get(postingId);
            if (firstGroup && firstGroup.pinned) {
              console.log('[DST Sorter] Duplicate of pinned posting detected (ID: ' + postingId + ')');
            } else if (pinned) {
              if (firstGroup) firstGroup.pinned = true;
              console.log('[DST Sorter] Duplicate posting, second is pinned (ID: ' + postingId + ')');
            } else {
              console.log('[DST Sorter] Duplicate posting detected (ID: ' + postingId + ')');
            }
          }
        }

        current = {
          posting: child,
          siblings: [],
          pinned: pinned,
          isDuplicate: isDuplicate,
          postingId: postingId,
          domIndex: groups.length
        };
        groups.push(current);

        if (postingId && !isDuplicate) {
          seenPostingIds.set(postingId, current);
        }

        if (pinned) {
          console.log('[DST Sorter] Pinned posting (ID: ' + (postingId || '?') + ')');
        }

        continue;
      }

      // ── Case 3: DST-POSTING-BOX or input form → comment form → keep separate ──
      if (tag === 'DST-POSTING-BOX' || isInputFormElement(child)) {
        formElements.push(child);
        continue;
      }

      // ── Case 4: SLOT (ad container) or any other element → attach to current group ──
      if (tag === 'SLOT') skippedSlots++;
      if (current) {
        current.siblings.push(child);
      }
    }

    console.log('[DST Sorter] Collected ' + groups.length + ' root posting groups' +
      ' (skipped ' + skippedSections + ' reply thread sections, ' + skippedSlots + ' ad slots attached)');

    return { groups, formElements };
  }

  // ── Sort comparator based on current mode ──────────────────────
  function sortComparator(a, b) {
    switch (sortMode) {
      case 'balance-top': {
        // Net score descending (best first)
        const aNet = getNetRatings(a.posting);
        const bNet = getNetRatings(b.posting);
        if (bNet !== aNet) return bNet - aNet;
        return getPositiveRatings(b.posting) - getPositiveRatings(a.posting);
      }
      case 'balance-flop': {
        // Net score ascending (worst/most controversial first)
        const aNet = getNetRatings(a.posting);
        const bNet = getNetRatings(b.posting);
        if (aNet !== bNet) return aNet - bNet;
        return getNegativeRatings(b.posting) - getNegativeRatings(a.posting);
      }
      case 'positive-only': {
        // Positive ratings descending
        const aPos = getPositiveRatings(a.posting);
        const bPos = getPositiveRatings(b.posting);
        if (bPos !== aPos) return bPos - aPos;
        return getNetRatings(b.posting) - getNetRatings(a.posting);
      }
      case 'negative-only': {
        // Negative ratings descending (most disliked first)
        const aNeg = getNegativeRatings(a.posting);
        const bNeg = getNegativeRatings(b.posting);
        if (bNeg !== aNeg) return bNeg - aNeg;
        return getNegativeRatings(b.posting) - getNegativeRatings(a.posting);
      }
      case 'chronological': {
        // Oldest first (ascending timestamp)
        const aTime = getPostingTimestamp(a.posting);
        const bTime = getPostingTimestamp(b.posting);
        if (aTime !== bTime) return aTime - bTime;
        // Fallback: preserve DOM order
        return (a.domIndex || 0) - (b.domIndex || 0);
      }
      default:
        return 0;
    }
  }

  // ── Check if already in correct sorted order ────────────────────
  function isAlreadySorted(groups) {
    for (let i = 0; i < groups.length - 1; i++) {
      if (sortComparator(groups[i], groups[i + 1]) > 0) return false;
    }
    return true;
  }

  // ── Check if rating data is available ──────────────────────────
  function hasRatingData(main) {
    const postings = main.querySelectorAll('dst-posting[data-level="0"]');
    if (postings.length === 0) return false;
    // For chronological mode, we don't need ratings
    if (sortMode === 'chronological') return true;
    let withRatings = 0;
    postings.forEach((p) => {
      if (p.querySelector('dst-posting--ratinglog')) withRatings++;
    });
    return withRatings >= Math.min(3, postings.length) ||
           withRatings >= postings.length * 0.5;
  }

  // ── Sort and reorder ─────────────────────────────────────────
  // ── v1.7.0 CSS-ORDER SORT: No DOM removal/insertion! ──────────
  // Instead of removing elements from the DOM and re-inserting them
  // (which destroys derStandard.at's internal Web Component state,
  // breaking votes, counters, and visual feedback), we use CSS
  // flexbox ordering. The DOM stays completely untouched.
  function sortPostings(shadowRoot) {
    if (isSorting) return;
    isSorting = true;

    if (observer) observer.disconnect();

    try {
      const main = shadowRoot.querySelector('main.forum--main');
      if (!main) return;

      const { groups: allGroups, formElements } = collectPostingGroups(main);
      if (allGroups.length === 0) return;

      // Step 1: Remove duplicate postings from DOM (this is safe — duplicates aren't voted on)
      const duplicateGroups = allGroups.filter((g) => g.isDuplicate);
      if (duplicateGroups.length > 0) {
        console.log('[DST Sorter] Removing ' + duplicateGroups.length + ' duplicate posting(s) from DOM');
        for (const dup of duplicateGroups) {
          dup.posting.remove();
          dup.siblings.forEach((sib) => sib.remove());
        }
      }

      // Step 2: Separate pinned from regular
      const remainingGroups = allGroups.filter((g) => !g.isDuplicate);
      const pinnedGroups = remainingGroups.filter((g) => g.pinned);
      const regularGroups = remainingGroups.filter((g) => !g.pinned);

      const allSortable = remainingGroups;
      console.log('[DST Sorter] CSS-ORDER sorting ' + allSortable.length + ' ROOT postings (' + pinnedGroups.length + ' pinned + ' + regularGroups.length + ' regular, mode: ' + sortMode + ')');

      if (allSortable.length === 0) {
        injectSortBadge(shadowRoot);
        return;
      }

      const sig = buildSortSignature(allSortable);
      if (sig === lastSortSignature) {
        // Check if order actually needs updating
        const combined = [...pinnedGroups, ...regularGroups];
        combined.sort(sortComparator);
        // Even if signature is same, still apply order (mode may have changed)
      }

      // Sort groups
      pinnedGroups.sort(sortComparator);
      regularGroups.sort(sortComparator);

      // Combined order: pinned first, then form elements, then regular
      // We assign CSS order values to EVERY child of main — no exceptions!
      // Elements without an explicit order default to 0 in flexbox, which
      // causes them to cluster at the top and create visual gaps.

      // Enable flexbox on main (only once, idempotent)
      if (!main.style.display || main.style.display !== 'flex') {
        main.style.display = 'flex';
        main.style.flexDirection = 'column';
      }

      // CRITICAL: Hide SLOT elements (ad containers) inside the flex container.
      // Shadow DOM <slot> elements render light DOM content (ads) through the
      // slot mechanism. When flexbox reorders elements via CSS order, the slotted
      // content doesn't follow the flex layout properly, creating huge visual gaps
      // (4000+ px) between postings. Hiding slots eliminates these gaps.
      // The ads are derstandard.at's own ad containers injected between postings.
      for (const child of main.children) {
        if (child.tagName === 'SLOT') {
          child.style.display = 'none';
        }
      }

      // Build a set of all elements we know about (groups + form elements)
      const handledElements = new Set();
      for (const group of [...pinnedGroups, ...regularGroups]) {
        handledElements.add(group.posting);
        group.siblings.forEach((s) => handledElements.add(s));
      }
      formElements.forEach((f) => handledElements.add(f));

      // Collect unhandled children (headers, tab nav, ad slots not attached
      // to any group, injected elements, etc.) preserving their DOM order.
      // We split them into "before first posting" and "after last posting"
      // so headers stay at the top and trailing elements go to the bottom.
      const preElements = [];   // elements before the first known element
      const postElements = [];  // elements after (or between) known elements
      let seenFirstHandled = false;
      for (const child of main.children) {
        if (handledElements.has(child)) {
          seenFirstHandled = true;
          continue;
        }
        // Skip the badge bar — it gets its order separately after injection
        if (child.id === 'dst-badge-bar') {
          preElements.push(child);
          continue;
        }
        if (!seenFirstHandled) {
          preElements.push(child);
        } else {
          postElements.push(child);
        }
      }

      let orderIndex = 0;

      // 1. Pre-elements (headers, tab navigation, etc.) — keep at top
      for (const el of preElements) {
        el.style.order = String(orderIndex++);
      }

      // 2. Pinned postings (appear first among postings)
      for (const group of pinnedGroups) {
        group.posting.style.order = String(orderIndex++);
        for (const sib of group.siblings) {
          sib.style.order = String(orderIndex++);
        }
      }

      // 3. Form elements (comment box) come after pinned
      for (const formEl of formElements) {
        formEl.style.order = String(orderIndex++);
      }

      // 4. Regular postings in sorted order
      for (const group of regularGroups) {
        group.posting.style.order = String(orderIndex++);
        for (const sib of group.siblings) {
          sib.style.order = String(orderIndex++);
        }
      }

      // 5. Post-elements (trailing ads, injected elements) — push to end
      for (const el of postElements) {
        el.style.order = String(orderIndex++);
      }

      lastSortSignature = sig;
      injectSortBadge(shadowRoot);

      // Log top 5
      const groups = [...pinnedGroups, ...regularGroups];
      console.log('[DST Sorter] Top 5 after CSS-order sort:');
      for (let i = 0; i < Math.min(5, groups.length); i++) {
        const pos = getPositiveRatings(groups[i].posting);
        const neg = getNegativeRatings(groups[i].posting);
        const net = pos - neg;
        const pid = getPostingId(groups[i].posting) || '?';
        const label = groups[i].pinned ? ' [PINNED]' : '';
        console.log('  ' + (i + 1) + '. Net=' + net + ' (Pos=' + pos + ', Neg=' + neg + ') [ID: ' + pid + ']' + label);
      }

      console.log('[DST Sorter] CSS-ORDER sorting complete! No DOM elements were removed or moved.');
    } finally {
      isSorting = false;
      observeForum(shadowRoot);
    }
  }

  // ── Badge bar: 5 separate clickable badges ─────────────────────
  async function changeSortMode(newMode, shadowRoot) {
    sortMode = newMode;

    if (chrome?.storage?.sync) {
      chrome.storage.sync.set({ [MODE_KEY]: sortMode });
    } else {
      localStorage.setItem(MODE_KEY, sortMode);
    }

    lastSortSignature = '';

    // v1.7.4: Load all postings before re-sorting (if not yet loaded)
    if (autoLoadEnabled && findLoadMoreButton(shadowRoot)) {
      await loadAllPostings(shadowRoot);
      lastSortSignature = '';
    }

    sortPostings(shadowRoot);
  }

  function injectSortBadge(shadowRoot) {
    const header = shadowRoot.querySelector('.forum--header');
    if (!header) return;

    // Inject CSS into shadow DOM (once)
    if (!shadowRoot.querySelector('#dst-icon-style')) {
      const styleEl = document.createElement('style');
      styleEl.id = 'dst-icon-style';
      styleEl.textContent = ICON_STYLE_CSS;
      shadowRoot.appendChild(styleEl);
    }

    // Remove existing badge bar
    const existingBar = shadowRoot.querySelector('#dst-badge-bar');
    if (existingBar) existingBar.remove();

    // Also remove legacy container from v1.4
    const legacyContainer = shadowRoot.querySelector('#dst-sorter-container');
    if (legacyContainer) legacyContainer.remove();

    // ── Badge bar: centered, same width as posting area ──────────
    const bar = document.createElement('div');
    bar.id = 'dst-badge-bar';
    // Use full width of parent container, centered via CSS
    bar.style.width = '100%';
    bar.style.marginLeft = 'auto';
    bar.style.marginRight = 'auto';

    const modeKeys = Object.keys(SORT_MODES);
    modeKeys.forEach((key) => {
      const m = SORT_MODES[key];
      const isActive = key === sortMode;

      const btn = document.createElement('div');
      btn.className = 'dst-badge-btn' + (isActive ? ' active' : '');
      btn.setAttribute('data-mode', key);
      // AMO Security Fix: createElement statt innerHTML
      const iconWrap = document.createElement('span');
      iconWrap.style.display = 'inline-flex';
      iconWrap.style.alignItems = 'center';
      m.buildIcon(iconWrap);
      const labelSpan = document.createElement('span');
      labelSpan.style.overflow = 'hidden';
      labelSpan.style.textOverflow = 'ellipsis';
      labelSpan.textContent = m.label;
      btn.appendChild(iconWrap);
      btn.appendChild(labelSpan);

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (key === sortMode) return; // already active

        // Trigger pulse animation on the new badge
        changeSortMode(key, shadowRoot);

        // After re-render, find the new active badge and animate it
        setTimeout(() => {
          const newActive = shadowRoot.querySelector('.dst-badge-btn.active');
          if (newActive) {
            newActive.classList.add('pulse');
            newActive.addEventListener('animationend', () => {
              newActive.classList.remove('pulse');
            }, { once: true });
          }
        }, 50);
      });

      bar.appendChild(btn);
    });

    // ── Coffee / Donate button (6th badge, not a sort mode) ─────
    const coffeeBtn = document.createElement('div');
    coffeeBtn.className = 'dst-badge-btn dst-coffee-btn';
    coffeeBtn.style.position = 'relative';
    // AMO Security Fix: createElement statt innerHTML
    const coffeeIcon = document.createElement('span');
    coffeeIcon.className = 'dst-coffee-icon';
    coffeeIcon.style.cssText = 'font-size:16px;line-height:1;vertical-align:middle;transition:transform 0.3s';
    coffeeIcon.textContent = '☕';
    coffeeBtn.appendChild(coffeeIcon);
    // V14 Dampf-Container mit 5 feinen Wisps
    const steamContainer = document.createElement('div');
    steamContainer.className = 'dst-steam-container';
    for (let i = 0; i < 5; i++) {
      const wisp = document.createElement('div');
      wisp.className = 'dst-steam-wisp';
      steamContainer.appendChild(wisp);
    }
    coffeeIcon.style.position = 'relative';
    coffeeIcon.appendChild(steamContainer);
    // V14 JS Animation Control: restart on hover-in, stop after hover-out
    (function() {
      var _hovering = false, _stopTO = null;
      var _wisps = steamContainer.querySelectorAll('.dst-steam-wisp');
      coffeeBtn.addEventListener('mouseenter', function() {
        _hovering = true;
        if (_stopTO) { clearTimeout(_stopTO); _stopTO = null; }
        _wisps.forEach(function(w) {
          w.style.animation = 'none';
          w.offsetHeight;
          w.style.animation = '';
          w.style.animationIterationCount = 'infinite';
        });
      });
      coffeeBtn.addEventListener('mouseleave', function() {
        _hovering = false;
        _stopTO = setTimeout(function() {
          if (!_hovering) {
            _wisps.forEach(function(w) {
              w.style.animationIterationCount = '1';
            });
          }
        }, 7500);
      });
    })();
    coffeeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.open('https://buymeacoffee.com/diversion', '_blank');
    });
    bar.appendChild(coffeeBtn);

    // Insert badge bar below the "Diskussion" heading
    if (header.nextSibling) {
      header.parentNode.insertBefore(bar, header.nextSibling);
    } else if (header.parentNode) {
      header.parentNode.appendChild(bar);
    } else {
      header.appendChild(bar);
    }
  }

  function removeSortBadge(shadowRoot) {
    const bar = shadowRoot.querySelector('#dst-badge-bar');
    if (bar) bar.remove();
    // Clean up legacy elements from v1.4
    const c = shadowRoot.querySelector('#dst-sorter-container');
    if (c) c.remove();
  }

  // ── Debounced sort ────────────────────────────────────────────
  function scheduledSort(shadowRoot) {
    if (sortTimeout) clearTimeout(sortTimeout);
    sortTimeout = setTimeout(() => {
      if (sortEnabled) sortPostings(shadowRoot);
    }, 300);
  }

  // ── Observe mutations inside forum shadow root ────────────────
  // v1.6.10 CRITICAL FIX: Do NOT observe rating attribute changes at all.
  //
  // PROBLEM (v1.6.9 and earlier):
  //   When a user clicks +/- (upvote/downvote), derStandard.at updates the
  //   positiveratings/negativeratings attributes on dst-posting--ratinglog.
  //   Even with a 2-second debounce delay, the subsequent sortPostings() call
  //   removes ALL postings from the DOM and re-inserts them in sorted order.
  //   This DOM manipulation destroys derStandard.at's internal vote state,
  //   causing the vote counter to revert and the vote to not be saved.
  //
  // SOLUTION (v1.6.10):
  //   - Only observe childList changes (new postings being loaded)
  //   - NEVER react to rating attribute changes
  //   - Sorting based on updated ratings only happens on:
  //     a) Manual badge bar click (user explicitly requests re-sort)
  //     b) New postings loaded (childList mutation)
  //     c) Page load / tab switch
  //   This ensures the extension NEVER interferes with the vote process.
  function observeForum(shadowRoot) {
    if (observer) observer.disconnect();

    const main = shadowRoot.querySelector('main.forum--main');
    if (!main) return;

    observer = new MutationObserver((mutations) => {
      if (isSorting) return;

      let hasNewPosting = false;

      for (const mutation of mutations) {
        // v1.6.11 CRITICAL: Only react to childList changes directly on main.
        // Ignore subtree changes (e.g. vote counter text updates inside postings).
        // When derStandard.at updates a vote counter, it changes textContent inside
        // a nested element — that's a childList mutation on a CHILD node, not on main.
        // We only care about new DST-POSTING elements being added to main directly.
        if (mutation.type === 'childList' && mutation.target === main) {
          // Check if any added node is a posting (new comment loaded)
          for (const node of mutation.addedNodes) {
            if (node.nodeType === 1 && (
              node.tagName === 'DST-POSTING' ||
              node.tagName === 'SECTION' ||
              node.tagName === 'SLOT'
            )) {
              hasNewPosting = true;
              break;
            }
          }
          if (hasNewPosting) break;
        }
      }

      if (hasNewPosting) {
        scheduledSort(shadowRoot);
      }
    });

    // v1.6.11: Only childList on main's direct children — NO subtree, NO attributes!
    // subtree:false ensures we only see changes to main's direct children,
    // not internal DOM changes within postings (like vote counter updates).
    observer.observe(main, {
      childList: true,
      subtree: false,
    });
  }

  // ── URL check: is this an article page? ─────────────────────────
  function isArticlePage() {
    const path = window.location.pathname;
    return /\/story\//.test(path);
  }

  // ── Auto-load forum by clicking on "X Postings" link ──────────
  function autoLoadForum() {
    if (!isArticlePage()) {
      console.log('[DST Sorter] Auto-load SKIPPED: not an article page (' + window.location.pathname + ')');
      return false;
    }

    if (autoLoadClicked) {
      console.log('[DST Sorter] Auto-load SKIPPED: already clicked on this page');
      return false;
    }

    if (!autoLoadEnabled) {
      console.log('[DST Sorter] Auto-load SKIPPED: disabled in settings');
      return false;
    }

    if (document.querySelector('dst-forum')) {
      console.log('[DST Sorter] Auto-load SKIPPED: forum already present');
      return false;
    }

    const postingsLink = Array.from(document.querySelectorAll('a, button')).find(
      (el) => {
        if (!el.textContent || !/\d+\s*Posting/i.test(el.textContent)) return false;
        if (el.tagName === 'A' && el.href) {
          const linkUrl = new URL(el.href, window.location.origin);
          if (linkUrl.pathname !== window.location.pathname) {
            return false;
          }
        }
        return true;
      }
    );

    if (postingsLink) {
      autoLoadClicked = true;
      console.log('[DST Sorter] Found postings link on article page, clicking automatically...');
      setTimeout(() => {
        postingsLink.click();
      }, 300);
      return true;
    }
    return false;
  }

  // ── v1.7.3: Load ALL postings by clicking "Weitere Postings laden" ──
  // The button is a direct child of section.forum in the shadow DOM.
  // Class: "form--button thread--more" (BEM notation with double hyphens!)
  // querySelector doesn't work on it — must iterate section.forum.children.
  // Each click loads ~90 new postings. We keep clicking until the button
  // disappears (all postings loaded) or we hit the safety limit.

  function findLoadMoreButton(shadowRoot) {
    // Strategy 1: Search inside shadow root for section.forum > BUTTON
    const section = shadowRoot.querySelector('section.forum');
    if (section) {
      for (const child of section.children) {
        if (child.tagName === 'BUTTON') {
          const text = (child.textContent || '').trim().toLowerCase();
          if (text.includes('weitere') && text.includes('posting')) {
            return child;
          }
          const cls = child.getAttribute('class') || '';
          if (cls.includes('thread') && cls.includes('more')) {
            return child;
          }
        }
      }
    }
    // Strategy 2: Search in main document (button may be outside shadow DOM)
    const docSection = document.querySelector('section.forum');
    if (docSection) {
      for (const child of docSection.children) {
        if (child.tagName === 'BUTTON') {
          const text = (child.textContent || '').trim().toLowerCase();
          if (text.includes('weitere') && text.includes('posting')) {
            return child;
          }
          const cls = child.getAttribute('class') || '';
          if (cls.includes('thread') && cls.includes('more')) {
            return child;
          }
        }
      }
    }
    // Strategy 3: Search inside dst-forum light DOM (slotted children)
    const dstForum = document.querySelector('dst-forum');
    if (dstForum) {
      for (const child of dstForum.children) {
        if (child.tagName === 'BUTTON') {
          const text = (child.textContent || '').trim().toLowerCase();
          if (text.includes('weitere') && text.includes('posting')) {
            return child;
          }
          const cls = child.getAttribute('class') || '';
          if (cls.includes('thread') && cls.includes('more')) {
            return child;
          }
        }
      }
    }
    return null;
  }

  function getTotalPostingCount(shadowRoot) {
    // e.g. "621 Postings" in p.forum-postingcount
    // Search in shadow root first, then main document
    const countEl = shadowRoot.querySelector('.forum-postingcount, [class*="postingcount"]')
      || document.querySelector('.forum-postingcount, [class*="postingcount"]');
    if (countEl) {
      const match = countEl.textContent.match(/(\d+)/);
      if (match) return parseInt(match[1], 10);
    }
    return 0;
  }

  // ── v1.7.4: Progress bar replaces badge bar during loading ──────
  function showProgressBar(shadowRoot, loaded, total, message) {
    const bar = shadowRoot.querySelector('#dst-badge-bar');
    if (!bar) return;

    // Hide all badge buttons
    for (const child of bar.children) {
      if (child.id !== 'dst-progress-container') {
        child.style.display = 'none';
      }
    }

    let container = bar.querySelector('#dst-progress-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'dst-progress-container';
      container.style.cssText = 'flex:1;display:flex;flex-direction:column;gap:3px;min-width:0;';
      bar.appendChild(container);
    }

    const percentage = total > 0 ? Math.round((loaded / total) * 100) : 0;

    // Build progress bar HTML using DOM methods (AMO safe)
    container.textContent = ''; // clear

    // Outer bar
    const outer = document.createElement('div');
    outer.style.cssText = 'width:100%;height:28px;background:#e8e8e8;border-radius:14px;position:relative;overflow:hidden;box-shadow:inset 0 1px 3px rgba(0,0,0,0.1);';

    // Inner fill
    const fill = document.createElement('div');
    fill.style.cssText = 'position:absolute;left:0;top:0;height:100%;width:' + percentage + '%;background:linear-gradient(90deg,#8FAF6F,#B7CCA3);border-radius:14px;transition:width 0.4s ease;';

    // Pulse animation on fill
    const pulseStyle = document.createElement('style');
    pulseStyle.id = 'dst-pulse-style';
    if (!shadowRoot.querySelector('#dst-pulse-style')) {
      pulseStyle.textContent = '@keyframes dst-progress-pulse{0%{opacity:1}50%{opacity:0.7}100%{opacity:1}} #dst-progress-fill{animation:dst-progress-pulse 1.5s ease-in-out infinite}';
      shadowRoot.appendChild(pulseStyle);
    }
    fill.id = 'dst-progress-fill';

    // Text overlay
    const textEl = document.createElement('span');
    textEl.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#2e7d32;font-weight:700;font-size:12px;z-index:1;text-shadow:0 0 3px rgba(255,255,255,0.8);';
    textEl.textContent = message || ('Lade alle Postings... ' + loaded + ' / ' + total);

    outer.appendChild(fill);
    outer.appendChild(textEl);
    container.appendChild(outer);
  }

  function hideProgressBar(shadowRoot) {
    const bar = shadowRoot.querySelector('#dst-badge-bar');
    if (!bar) return;

    const container = bar.querySelector('#dst-progress-container');
    if (container) container.remove();

    // Show all badge buttons again
    for (const child of bar.children) {
      child.style.display = '';
    }

    // Remove pulse style
    const pulseStyle = shadowRoot.querySelector('#dst-pulse-style');
    if (pulseStyle) pulseStyle.remove();
  }

  function showProgressComplete(shadowRoot, totalPostings) {
    const bar = shadowRoot.querySelector('#dst-badge-bar');
    if (!bar) return;

    const container = bar.querySelector('#dst-progress-container');
    if (container) {
      container.textContent = '';
      const outer = document.createElement('div');
      outer.style.cssText = 'width:100%;height:28px;background:linear-gradient(90deg,#8FAF6F,#B7CCA3);border-radius:14px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(46,125,50,0.25);';
      const textEl = document.createElement('span');
      textEl.style.cssText = 'color:white;font-weight:700;font-size:12px;text-shadow:0 1px 2px rgba(0,0,0,0.2);';
      textEl.textContent = '✓ Alle ' + totalPostings + ' Postings geladen!';
      outer.appendChild(textEl);
      container.appendChild(outer);
    }

    // After 1.5s, hide progress and show badges again
    setTimeout(function() { hideProgressBar(shadowRoot); }, 1500);
  }

  async function loadAllPostings(shadowRoot) {
    if (isLoadingAllPostings) {
      console.log('[DST Sorter] loadAllPostings already in progress, skipping');
      return false;
    }
    if (!autoLoadEnabled) {
      console.log('[DST Sorter] loadAllPostings SKIPPED: auto-load disabled');
      return false;
    }

    let btn = findLoadMoreButton(shadowRoot);
    if (!btn) {
      console.log('[DST Sorter] No "Weitere Postings laden" button found — all postings already loaded');
      return false;
    }

    isLoadingAllPostings = true;
    const totalExpected = getTotalPostingCount(shadowRoot);
    let loadCount = 0;
    const MAX_LOADS = 50; // Safety limit (50 × ~90 = ~4500 postings max)
    let consecutiveFailures = 0; // Track consecutive failures

    console.log('[DST Sorter] ⏳ Loading ALL postings... (expected: ' + totalExpected + ')');

    // Ensure badge bar exists before showing progress
    injectSortBadge(shadowRoot);
    const currentLoaded = shadowRoot.querySelectorAll('dst-posting').length;
    showProgressBar(shadowRoot, currentLoaded, totalExpected, 'Lade alle Postings...');

    // Disconnect observer during loading to prevent re-sorting on each batch
    if (observer) observer.disconnect();

    while (btn && loadCount < MAX_LOADS) {
      loadCount++;
      const beforeCount = shadowRoot.querySelectorAll('dst-posting').length;

      // Show progress bar
      showProgressBar(shadowRoot, beforeCount, totalExpected);
      console.log('[DST Sorter] Loading batch ' + loadCount + ' (currently: ' + beforeCount + ' postings)');

      // Click the button
      try {
        btn.click();
      } catch (e) {
        console.log('[DST Sorter] Button click failed: ' + e.message);
        break;
      }

      // Wait for new postings to load
      const newPostingsLoaded = await new Promise(function(resolve) {
        let waited = 0;
        const pollInterval = 250;
        const maxWait = 10000; // 10 seconds max per batch
        const poll = setInterval(function() {
          waited += pollInterval;
          const currentCount = shadowRoot.querySelectorAll('dst-posting').length;
          if (currentCount > beforeCount) {
            // New postings loaded!
            clearInterval(poll);
            setTimeout(function() { resolve(true); }, 400); // Extra delay for DOM to settle
          } else if (waited >= maxWait) {
            // Timeout — button might have disappeared (all loaded)
            clearInterval(poll);
            resolve(false);
          }
        }, pollInterval);
      });

      if (!newPostingsLoaded) {
        consecutiveFailures++;
        console.log('[DST Sorter] Batch ' + loadCount + ' timeout (consecutive failures: ' + consecutiveFailures + ')');
        if (consecutiveFailures >= 3) {
          console.log('[DST Sorter] Too many consecutive failures, stopping');
          break;
        }
      } else {
        consecutiveFailures = 0;
      }

      // Re-find button (it gets replaced in the DOM after each batch)
      btn = findLoadMoreButton(shadowRoot);
    }

    const finalCount = shadowRoot.querySelectorAll('dst-posting').length;
    const rootCount = shadowRoot.querySelectorAll('dst-posting[data-level="0"]').length;
    console.log('[DST Sorter] ✅ All postings loaded! ' + loadCount + ' batches, ' + finalCount + ' total postings (' + rootCount + ' root)');

    // Show completion
    showProgressComplete(shadowRoot, finalCount);

    isLoadingAllPostings = false;
    return true;
  }

  // ── Wait for the dst-forum element and its shadow root ────────
  function waitForForum() {
    const forum = document.querySelector('dst-forum');
    if (forum && forum.shadowRoot) {
      console.log('[DST Sorter] Forum already loaded, initializing sort...');
      initSort(forum.shadowRoot);
      return;
    }

    const autoLoaded = autoLoadForum();
    console.log(
      '[DST Sorter] Auto-load forum: ' + (autoLoaded ? 'SUCCESS' : 'NO LINK FOUND')
    );

    const docObserver = new MutationObserver(() => {
      const f = document.querySelector('dst-forum');
      if (f && f.shadowRoot) {
        console.log('[DST Sorter] Forum element detected via MutationObserver');
        docObserver.disconnect();
        initSort(f.shadowRoot);
      }
    });
    docObserver.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
    });

    let attempts = 0;
    const poll = setInterval(() => {
      attempts++;
      const f = document.querySelector('dst-forum');
      if (f && f.shadowRoot) {
        console.log('[DST Sorter] Forum element detected via polling (attempt ' + attempts + ')');
        clearInterval(poll);
        docObserver.disconnect();
        initSort(f.shadowRoot);
      }
      if (attempts > 100) {
        console.log('[DST Sorter] Timeout: Forum element not found after 50 seconds');
        clearInterval(poll);
      }
    }, 500);
  }

  // ── Initialise sorting ────────────────────────────────────────
  function initSort(shadowRoot) {
    const main = shadowRoot.querySelector('main.forum--main');
    if (
      !main ||
      main.querySelectorAll('dst-posting[data-level="0"]').length === 0
    ) {
      const innerObs = new MutationObserver(() => {
        const posts = main?.querySelectorAll('dst-posting[data-level="0"]');
        if (posts && posts.length > 0) {
          innerObs.disconnect();
          waitForRatingsAndSort(shadowRoot);
        }
      });
      if (main) {
        innerObs.observe(main, { childList: true, subtree: true });
      }
      return;
    }
    waitForRatingsAndSort(shadowRoot);
  }

  // ── Wait for rating data before first sort ────────────────────
  function waitForRatingsAndSort(shadowRoot) {
    const main = shadowRoot.querySelector('main.forum--main');
    if (!main) return;

    if (hasRatingData(main)) {
      // v1.7.4: Properly handle async runSort
      runSort(shadowRoot).catch(function(e) {
        console.log('[DST Sorter] runSort error: ' + e.message);
      });
      return;
    }

    let ratingWaitAttempts = 0;
    const maxWaitAttempts = 30;

    const ratingPoll = setInterval(function() {
      ratingWaitAttempts++;
      if (hasRatingData(main)) {
        clearInterval(ratingPoll);
        runSort(shadowRoot).catch(function(e) {
          console.log('[DST Sorter] runSort error: ' + e.message);
        });
      } else if (ratingWaitAttempts >= maxWaitAttempts) {
        clearInterval(ratingPoll);
        runSort(shadowRoot).catch(function(e) {
          console.log('[DST Sorter] runSort error: ' + e.message);
        });
      }
    }, 500);
  }

  async function runSort(shadowRoot) {
    // v1.7.4: First do an initial sort with whatever postings are available,
    // then load all remaining postings and re-sort.
    // This gives the user immediate visual feedback while loading continues.

    if (sortEnabled) {
      // Initial sort with available postings
      sortPostings(shadowRoot);
    }

    // v1.7.4: Load ALL postings (if auto-load enabled and button exists)
    if (sortEnabled && autoLoadEnabled) {
      // Small delay to let the badge bar render first
      await new Promise(function(r) { setTimeout(r, 500); });

      const loadMoreExists = findLoadMoreButton(shadowRoot);
      if (loadMoreExists) {
        console.log('[DST Sorter] "Weitere Postings laden" button found — loading all before re-sort');
        const loaded = await loadAllPostings(shadowRoot);
        if (loaded) {
          // Re-sort with all postings now loaded
          lastSortSignature = '';
          sortPostings(shadowRoot);
        }
      }
    }

    observeForum(shadowRoot);

    // v1.7.0: Only ONE delayed re-sort (for late-loading ratings)
    setTimeout(function() {
      if (sortEnabled) {
        const main = shadowRoot.querySelector('main.forum--main');
        if (main) {
          const { groups: allGrps } = collectPostingGroups(main);
          const sortableGrps = allGrps.filter(function(g) { return !g.isDuplicate; });
          const newSig = buildSortSignature(sortableGrps);
          if (newSig !== lastSortSignature) {
            sortPostings(shadowRoot);
          }
        }
      }
    }, 3000);

    // Listen for manual "Weitere Postings laden" clicks
    const moreBtn = findLoadMoreButton(shadowRoot);
    if (moreBtn) {
      moreBtn.addEventListener('click', function() {
        setTimeout(function() { scheduledSort(shadowRoot); }, 2000);
      });
    }

    const tabs = shadowRoot.querySelectorAll(
      'dst-forum--tabnavigation button.tab'
    );
    tabs.forEach(function(tab) {
      tab.addEventListener('click', function() {
        lastSortSignature = '';
        setTimeout(function() { scheduledSort(shadowRoot); }, 1500);
      });
    });
  }

  // ── Storage migration: old format -> new format ────────────────
  function migrateStorage(data) {
    const currentMode = data[MODE_KEY];
    // Already in new format
    if (currentMode && ['balance-top', 'balance-flop', 'positive-only', 'negative-only', 'chronological'].includes(currentMode)) {
      return currentMode;
    }
    // Migrate old format
    if (currentMode === 'net') return 'balance-top';
    if (currentMode === 'positive') return 'positive-only';
    // Check legacy boolean key (very old versions)
    if (data.sortByPositive === true) return 'positive-only';
    if (data.sortByPositive === false) return 'balance-top';
    // Default
    return 'balance-top';
  }

  // ── Storage: persist enabled state & sort mode ─────────────────
  function loadState(callback) {
    if (chrome?.storage?.sync) {
      chrome.storage.sync.get([SORT_KEY, MODE_KEY, AUTOLOAD_KEY, 'sortByPositive'], (data) => {
        sortEnabled = data[SORT_KEY] !== false;
        sortMode = migrateStorage(data);
        autoLoadEnabled = data[AUTOLOAD_KEY] !== false;

        // Persist migrated mode if it changed
        const oldMode = data[MODE_KEY];
        if (oldMode !== sortMode) {
          chrome.storage.sync.set({ [MODE_KEY]: sortMode });
          console.log('[DST Sorter] Migrated sort mode from "' + oldMode + '" to "' + sortMode + '"');
        }

        callback();
      });
    } else {
      sortEnabled = localStorage.getItem(SORT_KEY) !== 'false';
      const rawMode = localStorage.getItem(MODE_KEY);
      sortMode = migrateStorage({ [MODE_KEY]: rawMode });
      autoLoadEnabled = localStorage.getItem(AUTOLOAD_KEY) !== 'false';
      if (rawMode !== sortMode) {
        localStorage.setItem(MODE_KEY, sortMode);
      }
      callback();
    }
  }

  // Listen for messages from popup
  if (chrome?.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.action === 'toggle') {
        sortEnabled = msg.enabled;
        const forum = document.querySelector('dst-forum');
        if (forum && forum.shadowRoot) {
          if (sortEnabled) {
            lastSortSignature = '';
            sortPostings(forum.shadowRoot);
          } else {
            removeSortBadge(forum.shadowRoot);
            location.reload();
          }
        }
      }
      if (msg.action === 'setMode') {
        sortMode = msg.mode;
        const forum = document.querySelector('dst-forum');
        if (forum && forum.shadowRoot) {
          if (sortEnabled) {
            lastSortSignature = '';
            sortPostings(forum.shadowRoot);
          }
        }
      }
      if (msg.action === 'setAutoLoad') {
        autoLoadEnabled = msg.enabled;
      }
      if (msg.action === 'getState') {
        return true;
      }
    });
  }

  // ── Entry point ───────────────────────────────────────────────
  loadState(() => {
    if (sortEnabled) waitForForum();
  });

})();
