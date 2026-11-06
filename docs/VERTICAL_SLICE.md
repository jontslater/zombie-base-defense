# Vertical slice — definition

One shippable slice that proves the product loop, shell, persistence, multiplayer, and automation—not feature completeness.

## Playable loop (target)

| Step | Intent | Code reality today |
| --- | --- | --- |
| **Waves** | Survive escalating waves; bosses every **10** waves (`BOSS_EVERY_N_WAVES`). | Implemented in `@zbd/sim` (`waves.ts`, `tick.ts`). |
| **Scrap / currency** | Earn **currency** + **scrap** from combat; spend on upgrades and workbench. | Implemented (`tick.ts`, `commands.ts`). |
| **Upgrade base & skills** | Wall/turret/generator/workbench + skill nodes + gear. | Implemented (`commands.ts`, `constants.ts`). |
| **Harder waves** | Scaling via wave number in `buildWaveCombat`. | Implemented. |
| **Reborn** | Prestige reset with a lasting bonus meta-loop (TBH-style “Reborn”). | **Not in codebase yet**—required for this slice once designed in `packages/sim`. |

**Slice acceptance**: a player can run **waves → earn → upgrade → notice difficulty increase** in the **400×80** strip + panel, then **Reborn** and still have a reason to continue (perk TBD in sim).

## Shell & presentation

- **One strip screen** that looks **intentional**: layout matches production strip (`StripScene`): survivors **left**, zombies **right**, base **far right**, legible HP bar and label—not dev placeholder chaos.

## Save / load continuity

- **Browser**: `localStorage` key `zbd_save_v1` (`apps/desktop/src/game/runtime.ts`).
- **Tauri**: `read_save` / `write_save` invocations with the same serialized envelope from `@zbd/sim`.
- **Slice acceptance**: quit and relaunch (or refresh)—**same wave, currency, upgrades, inventory** within normal migration rules (`SAVE_VERSION`).

## Co-op

- **Invite code** join: host **create_room** → guests **redeem** (`apps/relay`), up to **4** players, host-authoritative sim at **10 Hz**.
- **Slice acceptance**: two clients can join the same room and see **assigned survivor** + relay traffic; drop-in/drop-out behavior matches README (“AI grace” **60s** sim time then depart).

## Automation

- **Headless smoke**: a **script** (to live under repo scripts or `packages/sim`) runs the deterministic sim for **N** waves, applies upgrades/skills as smoke steps, performs **one Reborn** when implemented, and **exits 0** on success.
- **CI**: that smoke **must run on every PR** in **GitHub Actions** (new workflow; not present yet—today only `build-windows.yml` exists).

## Ship checklist

- [ ] **Unsigned installer** from CI (`pnpm tauri build` in GHA) with artifacts attached.
- [ ] **Known bugs** list in PR/release notes (living doc OK).
- [ ] **AI art disclosure** text drafted for store pages.
- [ ] **itch / Steam** pages **later** (not blocking the slice).

## Definition of done

The vertical slice is **done** when:

1. A **human** can complete the loop above in the **desktop strip** build.
2. **Save/load** survives restart.
3. **Invite-code co-op** works host + at least one guest on a deployed relay.
4. The **headless smoke** runs **N** waves + **Reborn** and passes in **GitHub Actions on PRs**.
5. Ship checklist items relevant to internal testing (**installer**, **bugs**, **disclosure draft**) are **checked or explicitly waived** with reason.
