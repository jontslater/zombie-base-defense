const DEFAULT_URL =
  import.meta.env.VITE_RELAY_URL ??
  (import.meta.env.DEV ? "ws://localhost:8787" : "wss://relay.example.com");

export type RelayHandlers = {
  onHello: (clientId: string) => void;
  onRoomCreated: (code: string, expiresAtMs: number) => void;
  onRedeemResult: (ok: boolean, reason?: string, code?: string) => void;
  onGuestCommand: (from: string, payload: unknown) => void;
  onHostSnapshot: (payload: unknown) => void;
  onHostDelta: (payload: unknown) => void;
};

export class RelayClient {
  private ws: WebSocket | null = null;
  private handlers: RelayHandlers;

  constructor(handlers: RelayHandlers) {
    this.handlers = handlers;
  }

  connect(url = DEFAULT_URL): void {
    if (this.ws) this.ws.close();
    this.ws = new WebSocket(url);
    this.ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data as string) as { type: string; [k: string]: unknown };
      switch (msg.type) {
        case "hello":
          this.handlers.onHello(msg.clientId as string);
          break;
        case "room_created":
          this.handlers.onRoomCreated(msg.code as string, msg.expiresAtMs as number);
          break;
        case "redeem_result":
          this.handlers.onRedeemResult(msg.ok as boolean, msg.reason as string | undefined, msg.code as string | undefined);
          break;
        case "guest_command":
          this.handlers.onGuestCommand(msg.from as string, msg.payload);
          break;
        case "host_snapshot":
          this.handlers.onHostSnapshot(msg.payload);
          break;
        case "host_delta":
          this.handlers.onHostDelta(msg.payload);
          break;
      }
    };
  }

  private send(payload: unknown): void {
    this.ws?.send(JSON.stringify(payload));
  }

  createRoom(): void {
    this.send({ type: "create_room" });
  }

  redeem(code: string): void {
    this.send({ type: "redeem", code: code.trim().toUpperCase() });
  }

  sendGuestCommand(payload: unknown): void {
    this.send({ type: "guest_command", payload });
  }

  sendHostSnapshot(payload: unknown): void {
    this.send({ type: "host_snapshot", payload });
  }

  sendHostDelta(payload: unknown): void {
    this.send({ type: "host_delta", payload });
  }
}
