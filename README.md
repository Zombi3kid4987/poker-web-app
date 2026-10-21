# HUD Edge

A self-contained poker HUD classifier, player database, and multi-table planner with your own Hero stats, effective-stack-aware table grades, opponent exploit sheets, and a collapsible terminology glossary. Styles and scripts are embedded in `index.html`; no package installation or build is required.

## Run

From this directory:

```sh
python3 -m http.server 8000
```

Open the served page in your browser. Player profiles, Hero stats, tables, and stacks stay in that browser's IndexedDB storage, tied to its profile and origin.

## Your stats and opponents

Use **Your stats** to enter your own handle, observed HUD percentages, actual hand count, and actual showdown count. Paste either VPIP/PFR/3B or all ten values in the displayed order. Blank percentages remain unknown, and hand/showdown counts are never inferred from one another. Save once to update every Hero seat and the personal notes in each table guide.

Your saved Hero profile is separate from opponents. Own HUD stats inform the guide; they are not treated as a numeric skill rating. Enter opponents through the original classifier and save their named profiles to the player database.

## Tables, fixed Hero seat, and stacks

1. Open **Tables** and create a named table. Physical layouts have 4–9 seats; six is the default. **Hero is always Seat 4.** Short-handed and heads-up games use open seats around Hero.
2. Assign saved profiles or unknown opponents to the remaining seats. A saved profile can appear at multiple tables, but only once within a table. Editing its HUD updates all linked tables.
3. Enter each occupied seat's stack in **big blinds (BB)**, including Hero. These stacks are specific to that table; they do not follow a player to other tables. For example, a $100 stack with a $1 big blind is 100 BB. Known stacks accept 0.10–10,000 BB with at most two decimal places; blank means unknown. Press Enter to save and advance to the next occupied stack, or Shift+Enter to go back; leaving the field also saves.
4. Choose the dealer button for current-hand positions. The selection grade covers a full button orbit, while the playing guide also shows this hand's action order.
5. Review **Why this grade**, expand **How this grade is calculated**, and use the seated-opponent exploit cards. The cards show observed giveaways, effective stacks, practical street plans, and saved live reads.

Changing an occupant clears that seat's previous stack. A player's stack at another table stays independent. Deleting a player profile leaves a visible missing-profile seat until reassigned or cleared.

Older layouts migrate to fixed Seat 4 without silently deleting opponents or stack values. A displaced opponent is swapped into Hero's old seat or moved to an open/new seat. If a full nine-seat layout has no room, its assignment is retained in **Preserved assignments** for placement when a seat opens; preserved opponents are excluded from the active grade.

## What the grade measures

The grade is a transparent lineup heuristic, not expected profit or a statistical confidence level. It combines observed calling/folding tendencies, pressure, sample limitations, and Hero's relative position. For each occupied seat, the model measures how often Hero acts after that opponent across every occupied dealer-button rotation.

The effective stack against an opponent is the smaller of Hero's and that opponent's entered stacks. Shallow stacks reduce speculative/implied-odds access; deep stacks adjust both value access and pressure risk. Per-opponent stack effects are capped. Unknown stacks add no stack adjustment and keep the assessment provisional; the app does not assume a 100-BB stack.

The displayed score starts at 50 and adds lineup, position, effective-stack, and evidence adjustments, then caps to 0–100 and rounds. The expanded explanation shows these components, cap and rounding adjustments, and grade bands: A 85+, B 70–84, C 50–69, D 35–49, E below 35. Displayed component numbers are rounded; the calculation uses full precision.

A usable opponent profile needs observed VPIP and PFR. Unknown, missing, blank, and preserved/unseated profiles receive no favorable assumptions. A grade needs two usable seated opponents, or one in an occupied heads-up game. Limited samples remain provisional. Position-specific opportunities, skill, rake, and stakes are not modeled. Archetype labels were designed for 6-max; full-ring and heads-up ranges differ.

## Glossary and backups

Click **Terms** or the **Terminology cheat sheet** summary to open the glossary. It starts closed and can be hidden again. It explains HUD abbreviations, positions, effective stacks, and common strategy terms used in the guides.

**Export tables + players** saves the complete workspace, including Hero stats and per-table stacks. Restoring replaces table layouts, merges opponent profiles by normalized name, and remaps both seated and preserved references. Older backups with no Hero field preserve your current Hero stats; an explicit empty Hero profile clears them only through confirmed restore. Restored metadata gets new revisions to protect against stale-tab overwrites.

The separate **Export Players** control saves opponent profiles only. Export before changing browsers/origins or clearing browser data. Pending unsaved table drafts can also be exported for recovery.

## Tests

Dependency-free regression tests run against the scripts embedded in the delivered HTML:

```sh
node --test tests/*.test.cjs
```

Chromium checks also cover the player database, Hero entry and revision conflicts, fixed-seat migration, shared profiles across tables, stack grading, complete-backup restoration into a fresh browser, failed-save recovery, exploit cards, glossary toggling, and mobile layouts.

The seven colors follow the supplied guide: Yellow tight reg, Red aggressive LAG reg, Pink maniac/reactive aggression, Green hyper whale/station, Blue balanced/mixed reg, Orange mid-VPIP sticky/passive fish, and Cyan loose preflop/fit-or-fold postflop.
