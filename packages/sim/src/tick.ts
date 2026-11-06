import { processAiGraceDepartures } from "./coop.js";
import {
  TICKS_PER_SECOND,
  WAVE_PENALTY_ON_CORE_FALL,
  rebornIncomeMultiplier,
} from "./constants.js";
import { applyCommand, type GameCommand } from "./commands.js";
import { withRng } from "./rng.js";
import type { GameState } from "./types.js";
import { buildWaveCombat, rollLoot, startWave, survivorDps } from "./waves.js";

function grantCurrency(state: GameState, amount: number): GameState {
  if (amount <= 0) return state;
  const mult = rebornIncomeMultiplier(state.rebornCount);
  const gained = Math.floor(amount * mult);
  return {
    ...state,
    currency: state.currency + gained,
    lifetimeCurrencyEarned: state.lifetimeCurrencyEarned + gained,
  };
}

function regenSurvivors(state: GameState): GameState {
  if (state.combat) return state;
  const survivors = state.survivors.map((s) => {
    const heal = Math.max(1, Math.floor(s.maxHp * 0.002));
    return { ...s, hp: Math.min(s.maxHp, s.hp + heal) };
  });
  return { ...state, survivors };
}

function generatorIncome(state: GameState): GameState {
  const gen = state.upgrades.generator;
  if (gen <= 0) return state;
  const every = Math.max(5, 30 - gen * 2);
  if (state.tick % every !== 0) return state;
  return grantCurrency(state, 1 + gen);
}

export function simTick(state: GameState): GameState {
  let s: GameState = processAiGraceDepartures({ ...state, tick: state.tick + 1 });
  s = regenSurvivors(s);
  s = generatorIncome(s);

  if (!s.combat) {
    if (s.tick % (TICKS_PER_SECOND * 3) === 0) s = startWave(s);
    return s;
  }

  const dps = survivorDps(s);
  const damageThisTick = dps / TICKS_PER_SECOND;
  let combat = { ...s.combat };

  combat.zombieHp -= damageThisTick;

  while (combat.zombieHp <= 0 && combat.zombiesRemaining > 0) {
    combat.zombiesRemaining -= 1;
    combat.zombieHp += buildWaveCombat(s.wave).zombieHp;
    const killCurrencyBase = 2 + Math.floor(s.wave * 0.5);
    s = grantCurrency(
      {
        ...s,
        totalKills: s.totalKills + 1,
        scrap: s.scrap + 1,
      },
      killCurrencyBase,
    );
    const loot = rollLoot(s, s.wave);
    s = loot.state;
    if (loot.item) s = { ...s, inventory: [...s.inventory, loot.item] };

    const spRoll = withRng(s, (rng) => rng.next() < 0.02);
    s = { ...s, rngState: spRoll.rngState };
    if (spRoll.result && s.survivors[0]) {
      s = {
        ...s,
        survivors: s.survivors.map((sv, i) =>
          i === 0 ? { ...sv, skillPoints: sv.skillPoints + 1 } : sv,
        ),
      };
    }
  }

  if (combat.zombiesRemaining <= 0 && combat.zombieHp <= 0) {
    return { ...s, combat: null, wave: s.wave + 1 };
  }

  const inbound = combat.zombieDamage / TICKS_PER_SECOND;
  const baseCoreHp = s.baseCoreHp - inbound * 0.35;
  const survivors = s.survivors.map((sv) => ({
    ...sv,
    hp: Math.max(0, sv.hp - (inbound * 0.15) / Math.max(1, s.survivors.length)),
  }));

  if (baseCoreHp <= 0) {
    const newWave = Math.max(1, s.wave - WAVE_PENALTY_ON_CORE_FALL);
    return {
      ...s,
      wave: newWave,
      baseCoreHp: Math.floor(s.baseCoreMaxHp * 0.4),
      combat: null,
      survivors: survivors.map((sv) => ({
        ...sv,
        hp: Math.max(1, Math.floor(sv.maxHp * 0.5)),
      })),
    };
  }

  return { ...s, baseCoreHp, combat, survivors };
}

export function advanceTicks(state: GameState, count: number): GameState {
  let s = state;
  for (let i = 0; i < count; i++) s = simTick(s);
  return s;
}

export function dispatch(state: GameState, cmd: GameCommand): GameState {
  if (cmd.type === "TICK") return advanceTicks(state, Math.max(0, cmd.count));
  return applyCommand(state, cmd);
}
