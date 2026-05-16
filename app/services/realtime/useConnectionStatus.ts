/**
 * useConnectionStatus — Zustand store for external WebSocket control plane status.
 *
 * 单一真理来源(conventions §9):RoomPage / ConnectionIndicator 等 UI 通过
 * `useConnectionStatus((s) => s.status)` 精细订阅,future WebSocketClient 实装时
 * 在 connect/close/error 回调里调 `setStatus / setError`。
 *
 * 默认 "disconnected" —— 用户尚未接入外部控制,demo 显示灰色"● 未连接"。
 *
 * Action 命名(conventions §9):动词开头,无 `set` 前缀。`setStatus / setError`
 * 这里破例用 `set` 因为是纯 state mutation,语义清晰且无业务动词更准确。
 */

import { create } from "zustand";
import type { Failure } from "../error/Failure";

export type ConnectionStatus = "disconnected" | "connecting" | "connected";

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
