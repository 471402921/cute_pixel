/**
 * proto/messages.ts — RN ↔ Godot 通信契约权威定义(zod)
 *
 * 镜像在 proto/messages.gd。改这里必须同步改那里。
 *
 * 协议形态详见 ADR-007:single typed message bus,
 * `godotBridge.send(cmd)` / `godotBridge.subscribe(handler)`。
 *
 * v0.1 范围:仅 SCENE_LOAD / SCENE_UNLOAD + SCENE_LOADED / BRIDGE_ERROR,
 * 让 PixelView Portal 流转能跑通。其余 message(具体业务实体的 Command / Event)
 * 由第一个 demo 模块按需追加。
 */

import { z } from "zod";

// ─── RN → GD Commands ────────────────────────────────────────────────────────

/** SCENE_LOAD:让 GD 加载某 scene 资源(`res://scenes/{scene}.tscn`)。 */
export const SceneLoadCommand = z.object({
  type: z.literal("SCENE_LOAD"),
  payload: z.object({
    scene: z.string().min(1),
  }),
});

/** SCENE_UNLOAD:让 GD 卸载某 scene。 */
export const SceneUnloadCommand = z.object({
  type: z.literal("SCENE_UNLOAD"),
  payload: z.object({
    scene: z.string().min(1),
  }),
});

export const GodotCommand = z.discriminatedUnion("type", [SceneLoadCommand, SceneUnloadCommand]);
export type GodotCommand = z.infer<typeof GodotCommand>;

// ─── GD → RN Events ──────────────────────────────────────────────────────────

/** SCENE_LOADED:GD 报告某 scene 已加载完成,RN 可以渲染 PixelView。 */
export const SceneLoadedEvent = z.object({
  type: z.literal("SCENE_LOADED"),
  payload: z.object({
    scene: z.string().min(1),
  }),
});

/**
 * BRIDGE_ERROR:GD 侧 fail-soft 兜底事件(详见 conventions §15)。
 *
 * - INVALID_MESSAGE:zod 校验失败 / payload 缺字段
 * - UNKNOWN_TYPE:type 字段不在已知 Command 集合内
 * - HANDLER_ERROR:dispatch 到 handler 后 handler 内部抛错
 */
export const BridgeErrorEvent = z.object({
  type: z.literal("BRIDGE_ERROR"),
  payload: z.object({
    code: z.enum(["INVALID_MESSAGE", "UNKNOWN_TYPE", "HANDLER_ERROR"]),
    message: z.string(),
    /** 触发错误的原 Command 的 type(若可获得)。 */
    originalType: z.string().optional(),
  }),
});

export const GodotEvent = z.discriminatedUnion("type", [SceneLoadedEvent, BridgeErrorEvent]);
export type GodotEvent = z.infer<typeof GodotEvent>;

// ─── 命名常量(给 services/godot/{domain}Commands.ts 与未来 review skill 用)──

export const COMMAND_TYPES = {
  SCENE_LOAD: "SCENE_LOAD",
  SCENE_UNLOAD: "SCENE_UNLOAD",
} as const;

export const EVENT_TYPES = {
  SCENE_LOADED: "SCENE_LOADED",
  BRIDGE_ERROR: "BRIDGE_ERROR",
} as const;

export const BRIDGE_ERROR_CODES = {
  INVALID_MESSAGE: "INVALID_MESSAGE",
  UNKNOWN_TYPE: "UNKNOWN_TYPE",
  HANDLER_ERROR: "HANDLER_ERROR",
} as const;
