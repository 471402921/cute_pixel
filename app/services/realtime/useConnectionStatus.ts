/**
 * useConnectionStatus — Zustand store for external WebSocket control plane status.
 *
 * 单一真理来源(conventions §9):RoomPage / ConnectionIndicator 等 UI 通过
 * `useConnectionStatus((s) => s.status)` 精细订阅;`services/realtime/realtimeBridge`
 * 在 WebSocketClient.onStatusChange 回调里调 `setStatus(...)` 推。
 *
 * 默认 "disconnected" —— bridge 未启动前 demo 显示灰色"● 未连接"。
 *
 * Action 命名(conventions §9):动词开头,无 `set` 前缀。`setStatus / setError`
 * 这里破例用 `set` 因为是纯 state mutation,语义清晰且无业务动词更准确。
 *
 * `ConnectionStatus` 类型来源:re-export `WebSocketClient` 的同名类型,保持
 * client / store / UI 三处一致。
 */

import { create } from "zustand";
import type { Failure } from "../error/Failure";
import type { ConnectionStatus } from "./WebSocketClient";

export type { ConnectionStatus };

interface ConnectionState {
  status: ConnectionStatus;
  lastError: Failure | null;
  setStatus: (status: ConnectionStatus) => void;
  setError: (error: Failure | null) => void;
}

export const useConnectionStatus = create<ConnectionState>((set) => ({
  status: "disconnected",
  lastError: null,
  setStatus: (status) => set({ status }),
  setError: (lastError) => set({ lastError }),
}));
