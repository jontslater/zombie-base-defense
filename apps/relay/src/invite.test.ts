import { describe, expect, it } from "vitest";
import {
  createRoom,
  INVITE_TTL_MS,
  isExpired,
  redeemCode,
  RedeemRateLimiter,
  registerRoom,
} from "./invite.js";

describe("invite codes", () => {
  it("creates a 6-char code", () => {
    const room = createRoom("host-1", 1000);
    expect(room.code).toHaveLength(6);
  });

  it("expires after 15 minutes", () => {
    const room = createRoom("host-1", 0);
    expect(isExpired(room, INVITE_TTL_MS - 1)).toBe(false);
    expect(isExpired(room, INVITE_TTL_MS)).toBe(true);
  });

  it("redeems into room until full", () => {
    const rooms = new Map();
    const room = createRoom("host", 500);
    registerRoom(rooms, room);
    const limiter = new RedeemRateLimiter();

    const g1 = redeemCode(rooms, room.code, "g1", 600, limiter, "1.2.3.4");
    expect(g1.ok).toBe(true);

    const g2 = redeemCode(rooms, room.code, "g2", 601, limiter, "1.2.3.4");
    const g3 = redeemCode(rooms, room.code, "g3", 602, limiter, "1.2.3.4");
    redeemCode(rooms, room.code, "g4", 603, limiter, "1.2.3.4");
    const full = redeemCode(rooms, room.code, "g5", 604, limiter, "1.2.3.4");
    expect(g2.ok).toBe(true);
    expect(g3.ok).toBe(true);
    expect(full.ok).toBe(false);
    if (!full.ok) expect(full.reason).toBe("full");
  });

  it("rate limits redeem attempts per IP", () => {
    const rooms = new Map();
    const room = createRoom("host", 0);
    registerRoom(rooms, room);
    const limiter = new RedeemRateLimiter();
    const ip = "9.9.9.9";

    for (let i = 0; i < 5; i++) {
      const r = redeemCode(rooms, "BADCODE", `p${i}`, i, limiter, ip);
      expect(r.ok).toBe(false);
    }
    const blocked = redeemCode(rooms, room.code, "guest", 10, limiter, ip);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.reason).toBe("rate_limited");
  });

  it("rejects expired rooms", () => {
    const rooms = new Map();
    const room = createRoom("host", 0);
    registerRoom(rooms, room);
    const limiter = new RedeemRateLimiter();
    const r = redeemCode(rooms, room.code, "g1", INVITE_TTL_MS + 1, limiter, "ip");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("expired");
  });
});
