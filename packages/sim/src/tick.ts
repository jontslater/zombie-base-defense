import { processAiGraceDepartures } from "./coop.js";
import {
  advanceCampaignAfterStageClear,
  campaignWaveNumberFromStageKey,
  stageKeyFromCampaignWave,
} from "./campaign.js";
import {
  GEM_DROP_CHANCE_BOSS,
  GEM_KINDS,
  TICKS_PER_SECOND,
  WAVE_PENALTY_ON_CORE_FALL,
  rebornIncomeMultiplier,
} from "./constants.js";
import { makeGemItem } from "./gearFactory.js";
import { partyScrapBonusPerKill } from "./gearBonuses.js";
import { applyCommand, type GameCommand } from "./commands.js";
import {
  perimeterCoreMitigationMult,
  perimeterCurrencyIncomeMult,
  perimeterTrapFrequencyDivisorBonus,
} from "./perimeter.js";
import { rollInt, withRng } from "./rng.js";
import type { GameState } from "./types.js";
import { buildWaveCombat, rollLoot, startWave, survivorDps } from "./waves.js";
import {
  aggregateCoreInboundMultiplier,
  engineerGeneratorSkillMultiplier,
  survivorIdleRegenMultiplier,
  survivorInboundDamageMultiplier,
  survivorKillCurrencySkillBonus,
  survivorSkillMaxHpMultiplier,
  survivorSkillPointRollBonus,
} from "./survivorRoles.js";

function grantCurrency(state: GameState, amount: number): GameState {
  if (amount <= 0) return state;
  const mult = rebornIncomeMultiplier(state.rebornCount) * perimeterCurrencyIncomeMult(state);
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
    const cap = Math.floor(s.maxHp * survivorSkillMaxHpMultiplier(s));
    const heal = Math.max(1, Math.floor(cap * 0.002 * survivorIdleRegenMultiplier(s)));
    return { ...s, hp: Math.min(cap, s.hp + heal) };
  });
  return { ...state, survivors };
}

function generatorIncome(state: GameState): GameState {
  const gen = state.upgrades.generator;
  if (gen <= 0) return state;
  const every = Math.max(5, 30 - gen * 2);
  if (state.tick % every !== 0) return state;
  const genMult = state.survivors.reduce((acc, s) => acc * engineerGeneratorSkillMultiplier(s), 1);
  return grantCurrency(state, Math.floor((1 + gen) * genMult));
}

export function simTick(state: GameState): GameState {
  let s: GameState = processAiGraceDepartures({ ...state, tick: state.tick + 1 });
  s = regenSurvivors(s);
  s = generatorIncome(s);

  if (!s.combat) {
    const trapDiv = 3 + perimeterTrapFrequencyDivisorBonus(s);
    const idleWaveEveryTicks = Math.max(1, TICKS_PER_SECOND * trapDiv);
    if (s.tick % idleWaveEveryTicks === 0) s = startWave(s);
    return s;
  }

  const encounterWave = campaignWaveNumberFromStageKey(s.currentStageKey);
  const dps = survivorDps(s);
  const damageThisTick = dps / TICKS_PER_SECOND;
  let combat = { ...s.combat };

  combat.zombieHp -= damageThisTick;

  while (combat.zombieHp <= 0 && combat.zombiesRemaining > 0) {
    combat.zombiesRemaining -= 1;
    combat.zombieHp += buildWaveCombat(encounterWave).zombieHp;
    const killPts = 2 + Math.floor(s.wave * 0.5);
    const killBonus = s.survivors.reduce((acc, sv) => acc + survivorKillCurrencySkillBonus(sv), 0);
    const killCurrencyBase = Math.floor(killPts * (1 + killBonus));
    const scrapExtra = partyScrapBonusPerKill(s);
    s = grantCurrency(
      {
        ...s,
        totalKills: s.totalKills + 1,
        scrap: s.scrap + 1 + scrapExtra,
      },
      killCurrencyBase,
    );
    const loot = rollLoot(s);
    s = loot.state;
    if (loot.item) s = { ...s, inventory: [...s.inventory, loot.item] };

    if (combat.isBoss) {
      const gemDrop = withRng(s, (rng) => {
        if (rng.next() >= GEM_DROP_CHANCE_BOSS) return null;
        const kind = GEM_KINDS[rollInt(rng, 0, GEM_KINDS.length - 1)]!;
        return makeGemItem({
          id: `gem-${s.tick}-${rollInt(rng, 1000, 9999)}`,
          kind,
          tier: 1,
        });
      });
      s = { ...s, rngState: gemDrop.rngState };
      if (gemDrop.result) {
        s = { ...s, gemInventory: [...s.gemInventory, gemDrop.result] };
      }
    }

    const spChance = Math.min(
      0.95,
      0.02 + s.survivors.reduce((acc, sv) => acc + survivorSkillPointRollBonus(sv), 0),
    );
    const spRoll = withRng(s, (rng) => rng.next() < spChance);
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
    const { currentStageKey, campaignHighestClearedKey } = advanceCampaignAfterStageClear(
      s.currentStageKey,
      s.campaignHighestClearedKey,
    );
    const wave = campaignWaveNumberFromStageKey(currentStageKey);
    return { ...s, combat: null, currentStageKey, campaignHighestClearedKey, wave };
  }

  const inbound = combat.zombieDamage / TICKS_PER_SECOND;
  const coreMit = perimeterCoreMitigationMult(s);
  const coreSkillMult = aggregateCoreInboundMultiplier(s.survivors);
  const baseCoreHp =
    s.baseCoreHp -
    inbound * 0.35 * (coreMit > 0 ? 1 / coreMit : 1) * coreSkillMult;
  const nSurv = Math.max(1, s.survivors.length);
  const survivorShare = (inbound * 0.15) / nSurv;
  const survivors = s.survivors.map((sv) => ({
    ...sv,
    hp: Math.max(0, sv.hp - survivorShare * survivorInboundDamageMultiplier(sv)),
  }));

  if (baseCoreHp <= 0) {
    const newWave = Math.max(1, s.wave - WAVE_PENALTY_ON_CORE_FALL);
    return {
      ...s,
      wave: newWave,
      currentStageKey: stageKeyFromCampaignWave(newWave),
      baseCoreHp: Math.floor(s.baseCoreMaxHp * 0.4),
      combat: null,
      survivors: survivors.map((sv) => ({
        ...sv,
        hp: Math.max(
          1,
          Math.floor(sv.maxHp * survivorSkillMaxHpMultiplier(sv) * 0.5),
        ),
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
