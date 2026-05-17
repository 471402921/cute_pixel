/**
 * proto/messages.ts — RN ↔ Godot 通信契约权威定义(zod)
 *
 * 镜像在 proto/messages.gd。改这里必须同步改那里。
 *
 * 协议形态详见 ADR-007:single typed message bus,
 * `godotBridge.send(cmd)` / `godotBridge.subscribe(handler)`。
 *
 * 当前范围:
 * - Scene-level:SCENE_LOAD / SCENE_UNLOAD + SCENE_LOADED / BRIDGE_ERROR(v0.1)
 * - Character entity:CHARACTER_SET_EXTERNAL_CONTROL / CHARACTER_SET_VELOCITY
 *   + CHARACTER_STATE(2026-05-17 加;给外部 console 远程接管角色用,
 *   遵循 ADR-007 §4 entity scoping 命名规则)
 */

import { z } from "zod";

// ─── RN → GD Commands(scene-level)─────────────────────────────────────────

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

// ─── RN → GD Commands(character entity,per ADR-007 §4)─────────────────────

/**
 * CHARACTER_SET_EXTERNAL_CONTROL:开 / 关 character 的 autonomous。
 * - enabled=true:角色由外部驱动(等 CHARACTER_SET_VELOCITY 推方向)
 * - enabled=false:角色重新进入 autonomous(GD 内部 _pick_new_action)
 */
export const CharacterSetExternalControlCommand = z.object({
  type: z.literal("CHARACTER_SET_EXTERNAL_CONTROL"),
  payload: z.object({
    enabled: z.boolean(),
  }),
});

/**
 * CHARACTER_SET_VELOCITY:推方向(单位 px/sec);仅在 external control 模式下生效。
 * zero vector = 站立但仍在 external 模式(不切回 autonomous)。
 */
export const CharacterSetVelocityCommand = z.object({
  type: z.literal("CHARACTER_SET_VELOCITY"),
  payload: z.object({
    x: z.number(),
    y: z.number(),
  }),
});

export const GodotCommand = z.discriminatedUnion("type", [
  SceneLoadCommand,
  SceneUnloadCommand,
  CharacterSetExternalControlCommand,
  CharacterSetVelocityCommand,
]);
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

/**
 * CHARACTER_STATE:GD 周期上报角色状态(GD 端 5Hz 节流);
 * console 用来渲染缩略图与状态面板。
 */
export const CharacterStateEvent = z.object({
  type: z.literal("CHARACTER_STATE"),
  payload: z.object({
    position: z.object({ x: z.number(), y: z.number() }),
    animation: z.string(),
    control_mode: z.enum(["autonomous", "external"]),
  }),
});

export const GodotEvent = z.discriminatedUnion("type", [
  SceneLoadedEvent,
  BridgeErrorEvent,
  CharacterStateEvent,
]);
export type GodotEvent = z.infer<typeof GodotEvent>;

// ─── 命名常量(给 services/godot/{domain}Commands.ts 与未来 review skill 用)──

export const COMMAND_TYPES = {
  SCENE_LOAD: "SCENE_LOAD",
  SCENE_UNLOAD: "SCENE_UNLOAD",
  CHARACTER_SET_EXTERNAL_CONTROL: "CHARACTER_SET_EXTERNAL_CONTROL",
  CHARACTER_SET_VELOCITY: "CHARACTER_SET_VELOCITY",
} as const;

export const EVENT_TYPES = {
  SCENE_LOADED: "SCENE_LOADED",
  BRIDGE_ERROR: "BRIDGE_ERROR",
  CHARACTER_STATE: "CHARACTER_STATE",
} as const;

export const BRIDGE_ERROR_CODES = {
  INVALID_MESSAGE: "INVALID_MESSAGE",
  UNKNOWN_TYPE: "UNKNOWN_TYPE",
  HANDLER_ERROR: "HANDLER_ERROR",
} as const;
