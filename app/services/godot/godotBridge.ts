/**
 * godotBridge — RN ↔ Godot 单一 typed message bus(conventions §15, ADR-007)
 *
 * 业务**不直接**调 `bridge.send / subscribe`,而是走 `services/godot/{domain}Commands.ts`
 * 上的 helper(`sceneCommands.loadScene(...)` 等)。这里只暴露原子层。
 *
 * 行为契约(fail-soft):
 * - `send`:zod 校验 + worklet 内 `MessageBridge.dispatch(json)`;校验失败 → log + drop;
 *   engine 未就绪 / MessageBridge 找不到 → silent no-op(worklet 上下文不便走 Logger)。
 * - `subscribe`:首次订阅时 worklet 内 connect signal,后续订阅复用同一条 connection;
 *   handler 抛错 → Logger.error,**不**影响其他订阅者;非法 event JSON → log + drop。
 *
 * 单测:jest.setup.ts mock 把 `runOnGodotThread` 与 `Worklets.createRunOnJS` 当成同步 id;
 * 业务测试 spy `(RTNGodot.API as jest.Mock).mockReturnValue(...)` 注入 fake bridge node。
 */

import {
  type GodotNode,
  type GodotSignal,
  RTNGodot,
  runOnGodotThread,
} from "@borndotcom/react-native-godot";
import { Worklets } from "react-native-worklets-core";
import { GodotCommand, GodotEvent } from "../../../proto/messages";
import { Logger } from "../logging";

interface MessageBridgeNode extends GodotNode {
  dispatch(jsonString: string): void;
  event_emitted: GodotSignal<[string]>;
}

type EventHandler = (event: GodotEvent) => void;

const handlers = new Set<EventHandler>();
let signalConnected = false;

function dispatchEventToJS(jsonString: string): void {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch (cause) {
    Logger.error("godotBridge: incoming event is not valid JSON", { jsonString, cause });
    return;
  }
  const result = GodotEvent.safeParse(parsed);
  if (!result.success) {
    Logger.warn("godotBridge: incoming event failed zod validation; dropping", {
      jsonString,
      issues: result.error.issues,
    });
    return;
  }
  for (const handler of handlers) {
    try {
      handler(result.data);
    } catch (cause) {
      Logger.error("godotBridge: subscriber handler threw", {
        eventType: result.data.type,
        cause,
      });
    }
  }
}

function send(cmd: GodotCommand): void {
  const validation = GodotCommand.safeParse(cmd);
  if (!validation.success) {
    Logger.warn("godotBridge: outgoing command failed zod validation; dropping", {
      cmd,
      issues: validation.error.issues,
    });
    return;
  }
  const json = JSON.stringify(validation.data);
  runOnGodotThread(() => {
    "worklet";
    if (RTNGodot.getInstance() == null) {
      return;
    }
    const root = RTNGodot.API().Engine.get_main_loop().get_root();
    const bridge = root.find_child("MessageBridge", true, false) as MessageBridgeNode | null;
    if (bridge == null) {
      return;
    }
    bridge.dispatch(json);
  });
}

export type Unsubscribe = () => void;

function subscribe(handler: EventHandler): Unsubscribe {
  handlers.add(handler);
  if (!signalConnected) {
    signalConnected = true;
    const onEventJS = Worklets.createRunOnJS(dispatchEventToJS);
    runOnGodotThread(() => {
      "worklet";
      if (RTNGodot.getInstance() == null) {
        return;
      }
      const root = RTNGodot.API().Engine.get_main_loop().get_root();
      const bridge = root.find_child("MessageBridge", true, false) as MessageBridgeNode | null;
      if (bridge == null) {
        return;
      }
      if (bridge.has_connections("event_emitted")) {
        return;
      }
      bridge.event_emitted.connect((jsonString: string) => {
        onEventJS(jsonString);
      });
    });
  }
  return () => {
    handlers.delete(handler);
  };
}

export const godotBridge = { send, subscribe };
