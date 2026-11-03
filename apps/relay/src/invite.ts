const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export type Room = {
  code: string;
  hostId: string;
  createdAtMs: number;
  expiresAtMs: number;
  playerIds: string[];
  maxPlayers: number;
};

export const INVITE_TTL_MS = 15 * 60 * 1000;
export const MAX_PLAYERS = 4;
export const REDEEM_LIMIT_PER_MIN = 5;

export function generateCode(length = 6): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return out;
}

export function createRoom(hostId: string, nowMs: number): Room {
  return {
    code: generateCode(),
    hostId,
    createdAtMs: nowMs,
    expiresAtMs: nowMs + INVITE_TTL_MS,
    playerIds: [hostId],
    maxPlayers: MAX_PLAYERS,
  };
}

export function isExpired(room: Room, nowMs: number): boolean {
  return nowMs >= room.expiresAtMs;
}

export type RedeemResult =
  | { ok: true; room: Room }
  | { ok: false; reason: "not_found" | "expired" | "full" | "rate_limited" | "already_in" };

export class RedeemRateLimiter {
  private attempts = new Map<string, number[]>();

  canAttempt(ip: string, nowMs: number): boolean {
    const windowStart = nowMs - 60_000;
    const list = (this.attempts.get(ip) ?? []).filter((t) => t > windowStart);
    this.attempts.set(ip, list);
    return list.length < REDEEM_LIMIT_PER_MIN;
  }

  recordAttempt(ip: string, nowMs: number): void {
    const list = this.attempts.get(ip) ?? [];
    list.push(nowMs);
    this.attempts.set(ip, list);
  }
}

export function redeemCode(
  rooms: Map<string, Room>,
  code: string,
  playerId: string,
  nowMs: number,
  limiter: RedeemRateLimiter,
  ip: string,
): RedeemResult {
  if (!limiter.canAttempt(ip, nowMs)) {
    return { ok: false, reason: "rate_limited" };
  }
  limiter.recordAttempt(ip, nowMs);

  const room = rooms.get(code.toUpperCase());
  if (!room) return { ok: false, reason: "not_found" };
  if (isExpired(room, nowMs)) return { ok: false, reason: "expired" };
  if (room.playerIds.includes(playerId)) return { ok: true, room };
  if (room.playerIds.length >= room.maxPlayers) return { ok: false, reason: "full" };

  room.playerIds.push(playerId);
  return { ok: true, room };
}

export function registerRoom(rooms: Map<string, Room>, room: Room): void {
  rooms.set(room.code, room);
}

export function purgeExpired(rooms: Map<string, Room>, nowMs: number): void {
  for (const [code, room] of rooms) {
    if (isExpired(room, nowMs)) rooms.delete(code);
  }
}
