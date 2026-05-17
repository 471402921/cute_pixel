/**
 * realtimeBridge — console ↔ relay ↔ app ↔ GD 的 RN 端胶水。
 *
 * 双向路由(per handoff §3):
 * - 下行:WebSocket frame → JSON.parse → InboundEnvelope zod 校验 → `godotBridge.send(msg)`
 * - 上行:`godotBridge.subscribe` 收 GD event → 拼 OutboundEnvelope → WebSocketClient.send
 *
 * Android Emulator 跨平台(per handoff-reply §3):iOS Sim 共享 host network,
 * `localhost` 直接可用;Android Emulator 里 `localhost` 指 Emulator 自己,要 `10.0.2.2`
 * 才能访问 host machine。`resolveHost` 在 start 时按 Platform.OS 替换。
 *
 * fail-soft(conventions §15):envelope 解析 / 校验失败 → Logger.warn + drop,**不 throw**;
 * WebSocket 断线由 client 内部按指数退避自动重连(5 次后 status="failed")。
 *
 * 启动 / 停止:由 App 顶层 useEffect 调 `start(url, roomId)` / `stop()`,模块内单例。
 *
 * 注:godotBridge.send / subscribe 内部已经包了 worklet(conventions §13),
 * 本文件直接调用即可,不需要再 runOnGodotThread 包一层。
 */

import { Platform } from "react-native";
import type { GodotEvent } from "../../../proto/messages";
import { godotBridge, type Unsubscribe } from "../godot/godotBridge";
import { Logger } from "../logging";
import { InboundEnvelope, type OutboundEnvelope } from "./envelope";
import { useConnectionStatus } from "./useConnectionStatus";
import { WebSocketClient } from "./WebSocketClient";

let client: WebSocketClient | null = null;
let unsubGodot: Unsubscribe | null = null;
let currentRoomId = "";

/**
 * Android Emulator 里 localhost 指 Emulator 自己,要用 10.0.2.2 才能访问
 * host machine 的 relay。iOS Sim 共享 host network,localhost 直接可用。
 */
function resolveHost(url: string): string {
  if (Platform.OS !== "android") {
    return url;
  }
  return url.replace(/localhost|127\.0\.0\.1/g, "10.0.2.2");
}

export function start(url: string, roomId: string): void {
  if (client != null) {
    Logger.warn("realtimeBridge: start() called while already running; ignoring", {
      currentRoomId,
    });
    return;
  }
  const resolvedUrl = resolveHost(url);
  currentRoomId = roomId;
  client = new WebSocketClient();

  client.onStatusChange((status) => {
    useConnectionStatus.getState().setStatus(status);
  });

  // 下行:console → app,剥壳后转 godotBridge
  client.onMessage((raw) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (cause) {
      Logger.warn("realtimeBridge: incoming frame not JSON; dropping", { raw, cause });
      return;
    }
    const result = InboundEnvelope.safeParse(parsed);
    if (!result.success) {
      Logger.warn("realtimeBridge: envelope validation failed; dropping", {
        issues: result.error.issues,
      });
      return;
    }
    godotBridge.send(result.data.msg);
  });

  // 上行:GD event → console
  unsubGodot = godotBridge.subscribe((event: GodotEvent) => {
    if (client == null) {
      return;
    }
    const envelope: OutboundEnvelope = {
      room_id: currentRoomId,
      from: "app",
      ts: Date.now(),
      msg: event,
    };
    client.send(envelope);
  });

  client.connect(resolvedUrl, roomId);
  Logger.info("realtimeBridge: started", { url: resolvedUrl, roomId });
}

export function stop(): void {
  if (unsubGodot != null) {
    unsubGodot();
    unsubGodot = null;
  }
  if (client != null) {
    client.close();
    client = null;
  }
  currentRoomId = "";
  Logger.info("realtimeBridge: stopped");
}

export const realtimeBridge = { start, stop };
