/**
 * sceneCommands — Scene-level RN→GD helpers(conventions §16, ADR-007)
 *
 * 业务模块**不直接**发 SCENE_LOAD/UNLOAD,由 `<PixelView>` mount/unmount 隐式触发,
 * Provider/PixelView 内部走这个 helper。
 *
 * 命名:`loadScene` / `unloadScene`(动词开头,符合 conventions §9 action 命名)。
 */

import type { GodotCommand } from "../../../proto/messages";
import { godotBridge } from "./godotBridge";

function loadScene(scene: string): void {
  const cmd: GodotCommand = { type: "SCENE_LOAD", payload: { scene } };
  godotBridge.send(cmd);
}

function unloadScene(scene: string): void {
  const cmd: GodotCommand = { type: "SCENE_UNLOAD", payload: { scene } };
  godotBridge.send(cmd);
}

export const sceneCommands = { loadScene, unloadScene };
