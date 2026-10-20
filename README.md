# HUD Edge

A self-contained poker HUD classifier, player database, and multi-table seat planner. All styles and scripts are embedded in `index.html`; no package installation or build is required.

## Run

From this directory:

```sh
python3 -m http.server 8000
```

Open the served page in your browser. Profiles and tables stay in that browser's IndexedDB storage, tied to the browser profile and origin.

## Player and table workflow

1. Enter or paste an opponent's HUD stats, name the profile, and save it. Blank stats remain unknown.
2. Open **Tables**, create a named table (2–9 seats; six by default), and choose **Your seat**.
3. Assign saved profiles or unknown opponents to the other seats. A profile can appear at any number of different tables, but only once within one table.
4. Place the dealer button to see current-hand positions and a short street-by-street guide. Moving the button changes the current-hand guide; the selection grade covers a whole button orbit.
5. Edit a player profile once to update every table that references it. Deleting a profile leaves a missing-profile seat until you reassign or clear it.

**Export tables + players** creates a complete backup. Restoring it replaces the table workspace, merges profiles by normalized name, and remaps seating references to the restored profiles. The separate **Export Players** control backs up just player profiles. Export before changing browser, origin, or clearing browser data. A pending unsaved table draft can also be exported for recovery.

## What the grade measures

The grade is a transparent lineup heuristic, not expected profit or a statistical confidence level. It combines observed preflop looseness/calling, identifiable fold/calling tendencies, aggression pressure, sample limitations, and Hero's relative position. For each occupied seat, the model measures how often Hero acts after that opponent across every occupied dealer-button rotation. Access to exploitable tendencies improves the assessment; aggressive players who usually act after Hero reduce it.

A usable opponent profile needs observed VPIP and PFR. Unknown, missing, and blank profiles receive no favorable assumptions. A grade requires Hero plus at least two usable opponents, or one opponent on an explicitly two-seat table. Incomplete or limited samples remain provisional. Position-specific opportunities, skill, rake, stack depth, and stakes are not modeled. Archetype labels were designed for 6-max; full-ring and heads-up ranges differ.

The seven colors follow the supplied guide: Yellow tight reg, Red aggressive LAG reg, Pink maniac/reactive aggression, Green hyper whale/station, Blue balanced/mixed reg, Orange mid-VPIP sticky/passive fish, and Cyan loose preflop/fit-or-fold postflop.

## Tests

The dependency-free model regression tests run against the script embedded in the delivered app:

```sh
node --test tests/table-model.test.cjs
```

The feature was also checked in Chromium for multi-table assignments, shared profile updates, reload persistence, combined-backup restoration into a fresh browser, malformed backup rejection, stale-tab conflict protection, missing/deleted profiles, mobile layouts, and the existing classifier/player-database workflows.
