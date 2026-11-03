import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import {
  createRoom,
  purgeExpired,
  redeemCode,
  RedeemRateLimiter,
  type Room,
} from "./invite.js";

export type ClientMeta = {
  id: string;
  roomCode: string | null;
  isHost: boolean;
  ip: string;
};

export type RelayMessage =
  | { type: "hello"; clientId: string }
  | { type: "create_room" }
  | { type: "room_created"; code: string; expiresAtMs: number }
  | { type: "redeem"; code: string }
  | { type: "redeem_result"; ok: boolean; reason?: string; code?: string }
  | { type: "player_joined"; clientId: string; roomCode: string }
  | { type: "player_left"; clientId: string; roomCode: string }
  | { type: "guest_command"; from: string; payload: unknown }
  | { type: "host_snapshot"; payload: unknown }
  | { type: "host_delta"; payload: unknown }
  | { type: "assign_survivor"; clientId: string; survivorId: string | null; joinAtTick?: number }
  | { type: "error"; message: string };

const rooms = new Map<string, Room>();
const clients = new Map<WebSocket, ClientMeta>();
const limiter = new RedeemRateLimiter();

function clientIp(req: IncomingMessage): string {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string") return fwd.split(",")[0]!.trim();
  return req.socket.remoteAddress ?? "unknown";
}

function send(ws: WebSocket, msg: RelayMessage): void {
  ws.send(JSON.stringify(msg));
}

function broadcastRoom(room: Room, msg: RelayMessage, except?: WebSocket): void {
  for (const [ws, meta] of clients) {
    if (meta.roomCode !== room.code) continue;
    if (ws === except) continue;
    if (ws.readyState === ws.OPEN) send(ws, msg);
  }
}

function notifyHost(room: Room, msg: RelayMessage): void {
  for (const [peer, peerMeta] of clients) {
    if (peerMeta.roomCode === room.code && peerMeta.isHost && peer.readyState === peer.OPEN) {
      send(peer, msg);
    }
  }
}

function handleHttp(req: IncomingMessage, res: ServerResponse): void {
  const path = req.url?.split("?")[0] ?? "/";
  if (path === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, service: "zbd-relay" }));
    return;
  }
  res.writeHead(200, { "content-type": "text/plain" });
  res.end("zbd relay ok");
}

function handleMessage(ws: WebSocket, raw: string): void {
  const meta = clients.get(ws);
  if (!meta) return;

  let msg: RelayMessage;
  try {
    msg = JSON.parse(raw) as RelayMessage;
  } catch {
    send(ws, { type: "error", message: "invalid json" });
    return;
  }

  const now = Date.now();
  purgeExpired(rooms, now);

  switch (msg.type) {
    case "create_room": {
      const room = createRoom(meta.id, now);
      registerRoomLocal(room);
      meta.roomCode = room.code;
      meta.isHost = true;
      send(ws, { type: "room_created", code: room.code, expiresAtMs: room.expiresAtMs });
      break;
    }
    case "redeem": {
      const result = redeemCode(rooms, msg.code, meta.id, now, limiter, meta.ip);
      if (!result.ok) {
        send(ws, { type: "redeem_result", ok: false, reason: result.reason });
        return;
      }
      meta.roomCode = result.room.code;
      meta.isHost = result.room.hostId === meta.id;
      send(ws, { type: "redeem_result", ok: true, code: result.room.code });
      if (!meta.isHost) {
        notifyHost(result.room, {
          type: "player_joined",
          clientId: meta.id,
          roomCode: result.room.code,
        });
        broadcastRoom(
          result.room,
          { type: "player_joined", clientId: meta.id, roomCode: result.room.code },
          ws,
        );
      }
      break;
    }
    case "guest_command": {
      if (!meta.roomCode || meta.isHost) return;
      const room = rooms.get(meta.roomCode);
      if (!room) return;
      notifyHost(room, { type: "guest_command", from: meta.id, payload: msg.payload });
      break;
    }
    case "host_snapshot":
    case "host_delta":
    case "assign_survivor": {
      if (!meta.isHost || !meta.roomCode) return;
      const room = rooms.get(meta.roomCode);
      if (!room) return;
      broadcastRoom(room, msg, ws);
      break;
    }
    default:
      break;
  }
}

function registerRoomLocal(room: Room): void {
  rooms.set(room.code, room);
}

export function createRelayServer(port = Number(process.env.PORT ?? 8787)) {
  const httpServer = createServer(handleHttp);

  const wss = new WebSocketServer({ server: httpServer });

  wss.on("connection", (ws, req) => {
    const id = crypto.randomUUID();
    clients.set(ws, { id, roomCode: null, isHost: false, ip: clientIp(req) });
    send(ws, { type: "hello", clientId: id });

    ws.on("message", (data) => {
      handleMessage(ws, data.toString());
    });

    ws.on("close", () => {
      const meta = clients.get(ws);
      if (meta?.roomCode) {
        const room = rooms.get(meta.roomCode);
        if (room) {
          const leftMsg: RelayMessage = {
            type: "player_left",
            clientId: meta.id,
            roomCode: room.code,
          };
          notifyHost(room, leftMsg);
          broadcastRoom(room, leftMsg, ws);
        }
      }
      clients.delete(ws);
    });
  });

  return {
    httpServer,
    wss,
    rooms,
    clients,
    listen: () =>
      new Promise<void>((resolve) => {
        httpServer.listen(port, () => {
          console.log(`relay listening on :${port}`);
          resolve();
        });
      }),
  };
}

export function resetRelayStateForTests(): void {
  rooms.clear();
  clients.clear();
}

const isMain =
  typeof process.argv[1] === "string" && process.argv[1].includes("server");

if (isMain) {
  void createRelayServer().listen();
}
