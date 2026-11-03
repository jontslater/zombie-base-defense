export type AppConfig = {
  relayUrl: string;
  stripClickThrough: boolean;
  stripRememberPosition: boolean;
};

const DEFAULT_RELAY =
  import.meta.env.VITE_RELAY_URL ??
  (import.meta.env.DEV
    ? "ws://localhost:8787"
    : "wss://relay-production-82e9.up.railway.app");

let cached: AppConfig | null = null;

export async function loadAppConfig(): Promise<AppConfig> {
  if (cached) return cached;

  let relayUrl = DEFAULT_RELAY;
  let stripClickThrough = false;
  let stripRememberPosition = true;

  const tauri = (window as unknown as { __TAURI__?: unknown }).__TAURI__;
  if (tauri) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const cfg = await invoke<Partial<AppConfig> | null>("read_strip_config");
      if (cfg?.relayUrl) relayUrl = cfg.relayUrl;
      if (cfg?.stripClickThrough !== undefined) stripClickThrough = cfg.stripClickThrough;
      if (cfg?.stripRememberPosition !== undefined) {
        stripRememberPosition = cfg.stripRememberPosition;
      }
    } catch {
      /* browser fallback */
    }
  }

  cached = { relayUrl, stripClickThrough, stripRememberPosition };
  return cached;
}

export function getRelayUrl(): string {
  return cached?.relayUrl ?? DEFAULT_RELAY;
}

export async function saveStripPreferences(partial: Partial<AppConfig>): Promise<void> {
  cached = { ...(cached ?? (await loadAppConfig())), ...partial };
  const tauri = (window as unknown as { __TAURI__?: unknown }).__TAURI__;
  if (!tauri) return;
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("write_strip_config", { config: cached });
  } catch {
    /* ignore */
  }
}
