/** Client-only prefs (strip FX, etc.) — never read by `simTick`. */
export type ClientSettings = {
  /** White hit flash on strip combatants (render-only). */
  stripHitFlash: boolean;
  /** Subtle camera shake on heavy strip hits (render-only). */
  stripScreenShake: boolean;
};

export const DEFAULT_CLIENT_SETTINGS: ClientSettings = {
  stripHitFlash: true,
  stripScreenShake: true,
};

export function normalizeClientSettings(raw: unknown): ClientSettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_CLIENT_SETTINGS };
  const o = raw as Record<string, unknown>;
  return {
    stripHitFlash: o.stripHitFlash !== false,
    stripScreenShake: o.stripScreenShake !== false,
  };
}

export function stripHitFlashEnabled(settings: ClientSettings): boolean {
  return settings.stripHitFlash !== false;
}

export function stripScreenShakeEnabled(settings: ClientSettings): boolean {
  return settings.stripScreenShake !== false;
}
