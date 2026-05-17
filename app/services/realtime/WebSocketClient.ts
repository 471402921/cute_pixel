/**
 * WebSocketClient — relay WebSocket 接入(per console handoff §2)。
 *
 * 行为:
 * - `connect(url, roomId)` 拼 `${url}/room/${encodeURIComponent(roomId)}?role=app`
 * - `close()` 主动关闭(不会触发自动重连)
 * - `send(envelope)` JSON 序列化后 ws.send;未 connected 时 Logger.warn + drop
 * - `onMessage(handler)` 收到 frame 原文(string)派给所有订阅者
 * - `onStatusChange(handler)` 状态变更通知(disconnected / connecting / connected /
 *    reconnecting / failed)
 *
 * 重连规则(per handoff §2):指数退避 1 / 2 / 4 / 8 / 16 秒,**5 次后停止**,
 * status 进 `failed`。relay 协议级心跳由浏览器 ws 自动回 pong,**应用层不做心跳**。
 *
 * fail-soft(conventions §15):任何异常都不 throw,只 Logger.warn / info。
 * 普通断线是预期事件,不用 Logger.error。
 */

import { Logger } from "../logging";
import type { OutboundEnvelope } from "./envelope";

export type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "failed";

const RECONNECT_DELAYS_MS = [1_000, 2_000, 4_000, 8_000, 16_000];

export type MessageHandler = (raw: string) => void;
export type StatusHandler = (status: ConnectionStatus) => void;
export type Unsubscribe = () => void;

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url = "";
  private roomId = "";
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionallyClosed = false;
  private readonly messageHandlers = new Set<MessageHandler>();
  private readonly statusHandlers = new Set<StatusHandler>();
  private status: ConnectionStatus = "disconnected";

  connect(url: string, roomId: string): void {
    if (this.ws != null) {
      Logger.warn("WebSocketClient: connect() called while socket already exists; ignoring");
      return;
    }
    this.url = url;
    this.roomId = roomId;
    this.intentionallyClosed = false;
    this.reconnectAttempt = 0;
    this.openSocket();
  }

  close(): void {
    this.intentionallyClosed = true;
    if (this.reconnectTimer != null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws != null) {
      try {
        this.ws.close();
      } catch (cause) {
        Logger.warn("WebSocketClient: close() threw", { cause });
      }
      this.ws = null;
    }
    this.setStatus("disconnected");
  }

  send(envelope: OutboundEnvelope): void {
    if (this.ws == null || this.ws.readyState !== 1 /* OPEN */) {
      Logger.warn("WebSocketClient: send() called while not OPEN; dropping", {
        status: this.status,
        readyState: this.ws?.readyState ?? null,
      });
      return;
    }
    try {
      this.ws.send(JSON.stringify(envelope));
    } catch (cause) {
      Logger.warn("WebSocketClient: send() threw", { cause });
    }
  }

  onMessage(handler: MessageHandler): Unsubscribe {
    this.messageHandlers.add(handler);
    return () => {
      this.messageHandlers.delete(handler);
    };
  }

  onStatusChange(handler: StatusHandler): Unsubscribe {
    this.statusHandlers.add(handler);
    return () => {
      this.statusHandlers.delete(handler);
    };
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  private openSocket(): void {
    const fullUrl = `${this.url}/room/${encodeURIComponent(this.roomId)}?role=app`;
    this.setStatus(this.reconnectAttempt === 0 ? "connecting" : "reconnecting");
    Logger.info("WebSocketClient: opening", {
      url: fullUrl,
      attempt: this.reconnectAttempt,
    });

    let ws: WebSocket;
    try {
      ws = new WebSocket(fullUrl);
    } catch (cause) {
      Logger.warn("WebSocketClient: WebSocket ctor threw", { cause, url: fullUrl });
      this.scheduleReconnect();
      return;
    }
    this.ws = ws;

    ws.onopen = () => {
      Logger.info("WebSocketClient: open", { url: fullUrl });
      this.reconnectAttempt = 0;
      this.setStatus("connected");
    };

    ws.onmessage = (event: WebSocketMessageEvent) => {
      const data = event.data;
      if (typeof data !== "string") {
        Logger.warn("WebSocketClient: non-string frame received; dropping", {
          dataType: typeof data,
        });
        return;
      }
      for (const handler of this.messageHandlers) {
        try {
          handler(data);
        } catch (cause) {
          Logger.warn("WebSocketClient: onMessage handler threw", { cause });
        }
      }
    };

    ws.onerror = (event: WebSocketErrorEvent) => {
      Logger.warn("WebSocketClient: onerror", { message: event.message });
    };

    ws.onclose = (event: WebSocketCloseEvent) => {
      Logger.info("WebSocketClient: close", {
        code: event.code,
        reason: event.reason,
        intentional: this.intentionallyClosed,
      });
      this.ws = null;
      if (this.intentionallyClosed) {
        this.setStatus("disconnected");
        return;
      }
      this.scheduleReconnect();
    };
  }

  private scheduleReconnect(): void {
    if (this.intentionallyClosed) {
      return;
    }
    if (this.reconnectAttempt >= RECONNECT_DELAYS_MS.length) {
      Logger.warn("WebSocketClient: max reconnect attempts reached; giving up", {
        attempts: this.reconnectAttempt,
      });
      this.setStatus("failed");
      return;
    }
    const delay = RECONNECT_DELAYS_MS[this.reconnectAttempt] ?? 16_000;
    this.reconnectAttempt += 1;
    this.setStatus("reconnecting");
    Logger.info("WebSocketClient: scheduling reconnect", {
      attempt: this.reconnectAttempt,
      delayMs: delay,
    });
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.openSocket();
    }, delay);
  }

  private setStatus(next: ConnectionStatus): void {
    if (this.status === next) {
      return;
    }
    this.status = next;
    for (const handler of this.statusHandlers) {
      try {
        handler(next);
      } catch (cause) {
        Logger.warn("WebSocketClient: onStatusChange handler threw", { cause });
      }
    }
  }
}
