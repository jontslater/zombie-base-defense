# TBH: Task Bar Hero — feature audit vs Zombie Base Defense

This document summarizes **Task Bar Hero (TBH)** as described by official and community sources, compares it to **`docs/DESIGN.md`** (authoritative product intent) and to **what is implemented today** in `packages/sim` and `apps/desktop`, and suggests **zombie-theme equivalents** for each major system.

**Scope note:** TBH is a commercial product with frequent patches. Third-party wikis and databases often use extracted game data; numbers and unlock levels can change. Items marked **unverified** or **conflicting sources** need re-check against the live game or patch notes.

---

## Part 1 — TBH major systems (with sources)

Each bullet names the system and concrete details where we found them. URLs are primary references for that claim.

### Core pitch & platform

- **Taskbar-adjacent micro-window idle ARPG** — runs in a small strip above the taskbar without blocking work; heroes fight and loot automatically. ([Steam store](https://store.steampowered.com/app/3678970/TBH_Task_Bar_Hero/), [Nugem Studio](https://www.nugemstudio.com/en/games/taskbar-hero))
- **Steam features (official store tags):** Single-player, Steam Cloud, Steam Achievements, Stats, Family Sharing. ([Steam store](https://store.steampowered.com/app/3678970/TBH_Task_Bar_Hero/))
- **Genre / model:** Free to play on Windows. ([Steam store](https://store.steampowered.com/app/3678970/TBH_Task_Bar_Hero/))

### Campaign structure (stages, acts, difficulties, bosses)

- **3 Acts × 10 stages × 4 difficulty tiers → 120 stage entries** in official marketing copy; enemies and rewards scale by difficulty. ([Steam store — About](https://store.steampowered.com/app/3678970/TBH_Task_Bar_Hero/), [YouTube trailer description](https://www.youtube.com/watch?v=ADIbrboGdHE))
- **Act bosses** at X-10 (community stage guides name e.g. Skeleton King, Desert Overlord, Archon Morkar for Normal Act closers). **Unverified** exact boss roster and HP per tier outside Normal — fan wikis disagree on some details; treat as **community-sourced**. ([taskbarhero.org stages](https://taskbarhero.org/en/stages/), [games.gg guide](https://games.gg/tbh-task-bar-hero/guides/tbh-task-bar-hero-complete-stage-guide-all-120-stages/))

### Heroes & classes

- **Six playable classes** (e.g. Knight, Ranger, Sorcerer, Priest, Hunter, Slayer) with distinct weapons/loadouts; **party of up to three** deployed together; extra slots gated by progression (community: **Rune Tree / gold costs**). ([taskbarhero.wiki/heroes](https://taskbarhero.wiki/heroes), [taskbarhero.org/heroes](https://taskbarhero.org/en/heroes/))
- **Some heroes / content behind DLC** (e.g. Hunter, Slayer paid; Priest described as free DLC on fan sites). **Monetization / loop feel:** DLC expands loot tables and roster — affects what drops and what achievements reference. ([taskbarhero.org/heroes](https://taskbarhero.org/en/heroes/))

### Combat & skills (high level)

- **Automated combat** — player sets build; skills fire automatically. Guides distinguish **aura** (on equip), **basic-attack** (scaled by attack speed), **cooldown** (scaled by cast speed). **Unverified** exact formulas — stated on community mechanics pages. ([taskbarhero.wiki/mechanics](https://taskbarhero.wiki/mechanics) — *if 404, mirror:* [task-bar-hero.wiki/mechanics](https://task-bar-hero.wiki/mechanics))
- **Large skill catalog** — community database lists **on the order of 100+ active skills and 100+ passives** (extracted data; counts may change). ([taskbarhero.wiki/database](https://taskbarhero.wiki/database))

### Gear, rarity, sockets

- **500+ items** and **loot rarities** from Common through Legendary continuing to **Immortal, Arcana, Beyond, Celestial, Divine, Cosmic** (marketing). ([Steam store](https://store.steampowered.com/app/3678970/TBH_Task_Bar_Hero/), [trailer description](https://www.youtube.com/watch?v=ADIbrboGdHE))
- **Ten rarity grades** with associated **alchemy gold**, **Cube XP**, and **Decoration / Engraving / Inscription** socket counts by grade; **20 gear types** in weapon/off-hand/armor/accessory groupings. **Datamined** tables on fan sites — **unverified** per-patch. ([taskbarhero.org/items](https://taskbarhero.org/en/items/))
- **Synthesis:** **nine items of the same grade** combine toward a higher grade (community: output can **skip** tiers; level range dropdown matters). ([taskbarhero.wiki/guides/task-bar-hero-101](https://taskbarhero.wiki/guides/task-bar-hero-101))

### Cube (crafting hub)

- **“Hero-dric Cube”** centralizes multiple operations unlocked by **Cube level** (gold costs per unlock). Community list includes: **Synthesis** (default), **Alchemy** (Lv1), **Crafting** (Lv5), **Decoration** (Lv8), **Extraction** (Lv10), **Engraving** (Lv15), **Offering** (Lv20), **Inscription** (Lv25); **Cube level max 100**; consuming items grants Cube XP (except some operations). ([taskbarhero.wiki/cube](https://taskbarhero.wiki/cube))
- **Immortal / Celestial synthesis** gates tied to **Cube levels** (community: e.g. Immortal at Cube 10, Celestial at Cube 50). **Unverified** exact numbers in current patch. ([taskbarhero.wiki/mechanics](https://taskbarhero.wiki/mechanics))

### Runes (meta progression tree)

- **~197 rune nodes** (database); player spends currencies to unlock **offline rewards**, **extra hero slots**, **gold/EXP/drop/automation** style bonuses, etc. Guides recommend priorities (gold → chest/EXP/damage, then offline). ([taskbarhero.wiki/database](https://taskbarhero.wiki/database), [tbhdata.com offline guide](https://tbhdata.com/guides/offline-rewards/), [taskbarhero.wiki/guides/task-bar-hero-101](https://taskbarhero.wiki/guides/task-bar-hero-101))
- **Unverified:** exact node list and costs — use wiki/database as snapshot only.

### Currencies & materials

- **Gold** as primary soft currency (alchemy, runes, cube unlocks). Materials for crafting tiers; **125 materials** in extracted database. ([taskbarhero.wiki/database](https://taskbarhero.wiki/database))
- **Soulstones** referenced for boss / difficulty content on community stage and item pages. **Unverified** full rules. ([taskbarhero.org/en/stages](https://taskbarhero.org/en/stages/))

### Offline progress

- Marketing: adventure continues **while away**. ([Steam store](https://store.steampowered.com/app/3678970/TBH_Task_Bar_Hero/))
- Community mechanics: offline rewards **capped** (e.g. **8 hours** accrual), gated by **Rune of Repose**; rewards scale from **highest cleared stage**; **~30 day** absence may zero rewards (anti-tamper) — **unverified** live implementation details. ([taskbarhero.wiki/mechanics](https://taskbarhero.wiki/mechanics), [tbhdata.com/guides/offline-rewards](https://tbhdata.com/guides/offline-rewards/))

### Chests & drops

- **Chest** acquisition tied to progression; drop rates use **/1000** style modifiers; **Drop Chance** and **Percent** runes modify drops (community). ([taskbarhero.wiki/mechanics](https://taskbarhero.wiki/mechanics))
- Stage **boss boxes**, **act boss boxes**, normal boxes referenced in **Steam achievements** list. ([Steam Community achievements](https://steamcommunity.com/stats/3678970/achievements))

### Pets

- **8 pets** in database; unlock by **killing specific monster types**; equippable for appearance, **passives always apply**. ([taskbarhero.wiki/database](https://taskbarhero.wiki/database), [taskbarhero.wiki/guides/task-bar-hero-101](https://taskbarhero.wiki/guides/task-bar-hero-101))

### Skins & cosmetics

- **Skins** (database: ~100); events/sales in patch notes (e.g. Halloween skins, compensation skins). ([taskbarhero.wiki/database](https://taskbarhero.wiki/database), [Steam announcements](https://steamcommunity.com/app/3678970/announcements/))

### Storage & inventory automation

- **Inventory, stash, trading stash** tables in database; bulk move-to-storage UX fixes in patches. ([taskbarhero.wiki/database](https://taskbarhero.wiki/database), [Steam announcements — 1.3.1](https://steamcommunity.com/app/3678970/announcements/))

### Trading & server-backed economy

- **Items tradeable on Steam Community Market** (official feature blurb). ([Steam store](https://store.steampowered.com/app/3678970/TBH_Task_Bar_Hero/))
- **Server-side validation** and **listing limits** (queue times, slots per player) described in developer discussions/patch communications — affects **friction, idle cadence, and trust** in drops. ([Steam discussions — server update](https://steamcommunity.com/app/3678970/discussions/0/562533390397605806/))

### Achievements

- **Conflicting sources:** Steam store marketing mentions **50+** achievements; Steam Community stats page shows **56** total; third-party trackers sometimes list higher counts after patches. Treat **56** as verifiable from Steam Community until re-checked. ([Steam store](https://store.steampowered.com/app/3678970/TBH_Task_Bar_Hero/), [Steam achievements](https://steamcommunity.com/stats/3678970/achievements))

### Character level & prestige

- Community mechanics: **hero level 1–100**, **no prestige/rebirth** in TBH (wiki). **Unverified** if post-launch systems added — patch notes mention new regions/items (e.g. Plaguelands). ([taskbarhero.wiki/mechanics](https://taskbarhero.wiki/mechanics))

### Co-op / multiplayer

- **Official:** **Single-player** (Steam). ([Steam store](https://store.steampowered.com/app/3678970/TBH_Task_Bar_Hero/))
- **“Multiplayer”** in practice is **Steam Market + server**, not synchronous co-op; Reddit confirms no real-time multiplayer. ([Reddit TBH](https://www.reddit.com/r/TBHTaskBarHero/comments/1uiecep/multiplayer/))

### UI: strip vs panels

- **Tiny main strip** + deeper panels (stash, heroes, cube) — layout described in beginner guides. ([task-bar-hero.wiki/mechanics](https://task-bar-hero.wiki/mechanics), [taskbarhero.wiki/guides/task-bar-hero-101](https://taskbarhero.wiki/guides/task-bar-hero-101))

### Post-launch systems (patch notes)

- Examples: **Plaguelands** region, **Relic** system, **Material Stash DLC**, **appearance system**, **Halloween** event, balance fixes — indicates **ongoing vertical content** beyond launch Steam page. ([Steam announcements](https://steamcommunity.com/app/3678970/announcements/), [German news mirror](https://steamcommunity.com/app/3678970/allnews/?l=german))

### Monetization (loop feel only)

- **Free to play** + **paid DLC** (heroes, stash) + **Steam Market** (player trading fees to Valve) + **optional cosmetics**. DLC can change **loot pool composition** (community F2P guide warns about class-specific drops). ([Steam store](https://store.steampowered.com/app/3678970/TBH_Task_Bar_Hero/), [taskbarhero.wiki/guides/f2p-guide-for-early-game](https://taskbarhero.wiki/guides/f2p-guide-for-early-game))

---

## Part 2 — What Zombie Base Defense ships today (code-grounded)

| Area | Implementation (file-level) |
| --- | --- |
| **Tick sim** | `packages/sim/src/tick.ts` — combat, wave progression, loot rolls, core damage |
| **State** | `packages/sim/src/types.ts` — survivors, gear, upgrades, wave, currency/scrap, inventory |
| **Gear** | Four slots (`weapon`, `armor`, `tool`, `trinket`); seven rarities; single `power` stat — `constants.ts`, `waves.rollLoot` |
| **Skills** | Four binary nodes with costs/prereqs; skill points from random combat roll — `constants.ts`, `commands.ts`, `tick.ts` |
| **Base upgrades** | `wall`, `turret`, `generator`, `workbench` — `commands.ts` |
| **Workbench** | Enhance (scrap) and reroll (scrap + currency) — `commands.ts` |
| **Waves** | Infinite wave number; boss every `BOSS_EVERY_N_WAVES` (10) — `waves.ts` |
| **Offline** | On load, advance sim ticks up to **8h** cap — `offline.ts`, `runtime.ts` |
| **Reborn (prestige)** | `REBORN` command when idle and `wave >= REBORN_MIN_WAVE`; increments `rebornCount`; resets run with payout; **income/DPS** multipliers stack — `commands.ts` (`applyReborn`), `constants.ts`, `tick.ts`, `waves.ts`; tests `reborn.test.ts`; smoke `pnpm smoke:sim` → `scripts/smoke-reborn.ts` |
| **Co-op** | WebSocket relay; invite code; host/guest commands; guest survivor spawn — `apps/desktop`, `apps/relay`, `packages/sim/coop.ts` |
| **Shell** | Tauri + Phaser **400×80** strip; expandable HTML panel — `stripScene.ts`, `main.ts` |
| **CI** | Windows **unsigned** Tauri build on PR/tags — `.github/workflows/build-windows.yml` |
| **Tests** | Vitest in `packages/sim`, `apps/relay` |

---

## Part 3 — Gap table

| System | TBH (sources) | `docs/DESIGN.md` | Shipped (sim + desktop) | Gap | Zombie-theme equivalent |
| --- | --- | --- | --- | --- | --- |
| Taskbar strip UX | Micro-window above taskbar | North star (see DESIGN) | 400×80 strip + panel | Polish pass, AI art | Same strip; survivor/zombie/base sprites |
| Campaign / acts | 3 acts, 4 tiers, 120 stages | TBD in DESIGN | Single infinite wave ladder | No acts, biomes, or stage select | **Regions** (city, burbs, lab) as unlockable strips |
| Roster depth | 6 classes, distinct kits | TBD | Generic survivors + stats | No classes / weapon paradigms | **Roles:** brawler, medic, engineer… |
| Party size | Up to 3 (+ rune unlocks) | TBD | 2 local + relay guests | No rune-gated slot progression | **Bunk slots** unlocked by **S.O.S. tech tree** |
| Gear depth | 20 types, 10 rarities, sockets | TBD | 4 slots, 7 rarities, `power` | No sockets, no accessory split | **Mods:** barrel, plating, tool, trinket; **scribe/imprint** sockets |
| Cube / crafting | 8 operations, 100 levels | Not specified | Workbench only | No synthesis, alchemy, offerings | **Workbench tree:** break down loot → **parts**; **combine** 9 parts → tier up |
| Materials | Large material graph | Not specified | Scrap + currency only | No material tiers | **Salvage:** batteries, cures, alloys |
| Rune / meta tree | ~197 nodes | Not specified | None | No parallel progression tree | **Perimeter grid** (lights, traps, radio relays) |
| Skills | 100+ skills + passives | TBD | 4 passive nodes | No active skills, no rotations | **Perks:** grenade volley, drone heal, barricade |
| Character level | 1–100 table | TBD | Implicit (stats + gear) | No XP/level curve | **Survivor rank** + XP from waves |
| Prestige/rebirth | None per TBH wiki (no prestige) | Reborn prestige (ZBD) | **Shipped:** `REBORN` + `rebornCount` + stacking bonuses | TBH has no analogue — ZBD **differs by design**; still far from TBH’s **rune tree** meta width | Narrative **exodus convoy** reset with **memorial stacks** (keep distinct from TBH so players aren’t confused) |
| Offline | Gated + stage-scaled table | TBD | Raw sim tick catch-up | Not TBH-like reward table | **Raid report** from highest **cleared sector** |
| Pets | 8 pets, conditional unlocks | Not specified | None | No passive pet grid | **Companions:** dog alarm, drone scout |
| Achievements | Steam-set (~56) | Disclosure for AI art | None | No achievement layer | **Comms log milestones** (local + optional cloud later) |
| Trading | Steam Market | Not in north star | None | By design different | **Relay-only “supply drop”** trade later if desired |
| Co-op | Not synchronous | Relay co-op in north star | Implemented | TBH has none — we are **ahead** on feature type | Keep **invite relay** as differentiator |
| Boss variety | Act bosses + mob roster | TBD | Boss flag every N waves | No unique boss mechanics | **Infected specials** (charger, spitter…) |
| Monetization | F2P + DLC + Market | No paid signing; no spec | N/A | N/A | Optional cosmetics; stay **Market-free** unless scope changes |

---

## Part 4 — Unverified / conflicting checklist

- Achievement **count** (50+ marketing vs 56 Steam Community vs third-party).
- **Exact** socket counts, cube unlock costs, and synthesis rates after balance patches.
- **Relic / Plaguelands** detailed rules (post-1.3.0).
- Some **F2P/DLC** drop-pool interactions (player guides, not official docs).

Re-audit these against live Steam patch notes when aiming for true parity.
