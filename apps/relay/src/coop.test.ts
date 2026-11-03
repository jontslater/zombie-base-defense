import { afterAll, beforeAll, describe, expect, it } from "vitest";
import WebSocket from "ws";
import { createRelayServer, resetRelayStateForTests } from "./server.js";

function waitForMessage(ws: WebSocket, type: string, timeoutMs = 5000): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout waiting for ${type}`)), timeoutMs);
    const onMessage = (raw: WebSocket.RawData) => {
      const msg = JSON.parse(raw.toString()) as { type: string; [k: string]: unknown };
      if (msg.type === type) {
        clearTimeout(timer);
        ws.off("message", onMessage);
        resolve(msg);
      }
    };
    ws.on("message", onMessage);
  });
}

function connectClient(port: number): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}`);
    const onMessage = (raw: WebSocket.RawData) => {
      const msg = JSON.parse(raw.toString()) as { type: string };
      if (msg.type === "hello") {
        ws.off("message", onMessage);
        resolve(ws);
      }
    };
    ws.on("message", onMessage);
    ws.on("error", reject);
  });
}

describe("co-op relay (host + 2 guests)", () => {
  let port: number;
  let server: ReturnType<typeof createRelayServer>;

  beforeAll(async () => {
    resetRelayStateForTests();
    port = 19000 + Math.floor(Math.random() * 1000);
    server = createRelayServer(port);
    await server.listen();
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.httpServer.close(() => resolve()));
  });

  it("forwards guest commands to host and broadcasts host deltas", async () => {
    const host = await connectClient(port);
    const guest1 = await connectClient(port);
    const guest2 = await connectClient(port);

    host.send(JSON.stringify({ type: "create_room" }));
    const created = await waitForMessage(host, "room_created");
    const code = created.code as string;

    const hostJoin1 = waitForMessage(host, "player_joined");
    guest1.send(JSON.stringify({ type: "redeem", code }));
    const g1Join = await waitForMessage(guest1, "redeem_result");
    expect(g1Join.ok).toBe(true);
    await hostJoin1;

    const hostJoin2 = waitForMessage(host, "player_joined");
    guest2.send(JSON.stringify({ type: "redeem", code }));
    await waitForMessage(guest2, "redeem_result");
    await hostJoin2;

    const guestCmdPromise = waitForMessage(host, "guest_command");
    guest1.send(
      JSON.stringify({
        type: "guest_command",
        payload: { type: "SET_STANCE", survivorId: "surv-guest", stance: "defensive" },
      }),
    );
    const forwarded = await guestCmdPromise;
    expect(forwarded.from).toBeTruthy();

    const deltaPromise = waitForMessage(guest2, "host_delta");
    host.send(JSON.stringify({ type: "host_delta", payload: { tick: 42, wave: 3 } }));
    await deltaPromise;

    host.close();
    guest1.close();
    guest2.close();
  });

  it("notifies the host once per guest join (not via broadcast)", async () => {
    const host = await connectClient(port);
    const guest = await connectClient(port);

    host.send(JSON.stringify({ type: "create_room" }));
    const created = await waitForMessage(host, "room_created");
    const code = created.code as string;

    const hostJoinEvents: Record<string, unknown>[] = [];
    const onHostMessage = (raw: WebSocket.RawData) => {
      const msg = JSON.parse(raw.toString()) as { type: string; [k: string]: unknown };
      if (msg.type === "player_joined") hostJoinEvents.push(msg);
    };
    host.on("message", onHostMessage);

    guest.send(JSON.stringify({ type: "redeem", code }));
    await waitForMessage(guest, "redeem_result");
    await new Promise((r) => setTimeout(r, 50));

    expect(hostJoinEvents).toHaveLength(1);

    host.off("message", onHostMessage);
    host.close();
    guest.close();
  });
});

describe("relay health", () => {
  it("responds on /health", async () => {
    resetRelayStateForTests();
    const port = 20000 + Math.floor(Math.random() * 1000);
    const srv = createRelayServer(port);
    await srv.listen();
    const res = await fetch(`http://127.0.0.1:${port}/health`);
    expect(res.ok).toBe(true);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
    await new Promise<void>((resolve) => srv.httpServer.close(() => resolve()));
  });
});
