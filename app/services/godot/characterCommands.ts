/**
 * characterCommands — Character-domain RN→GD command helpers(PLACEHOLDER)。
 *
 * 本 demo 角色由 GD 端 autonomous 状态机驱动,RN **不需要**主动发任何角色相关
 * Command;此文件存在是为了固化命名 + 让未来 WebSocket 控制台接入时找到落点。
 *
 * 退场条件:
 * - 用户独立前端项目接入 WebSocket 后,proto/messages.ts 扩 CHARACTER_* 系列
 *   Command(`CHARACTER_SET_EXTERNAL_CONTROL` / `CHARACTER_MOVE` 等),
 *   本文件实装对应 helper,业务通过 `characterCommands.setExternalControl(true)` 调用。
 */

// TODO(realtime): 当 proto/messages.ts 扩出 CHARACTER_SET_EXTERNAL_CONTROL /
// CHARACTER_MOVE 等 Command 时,在此实装 helper:
//
//   import type { GodotCommand } from "../../../proto/messages";
//   import { godotBridge } from "./godotBridge";
//
//   function setExternalControl(enabled: boolean): void {
//     const cmd: GodotCommand = {
//       type: "CHARACTER_SET_EXTERNAL_CONTROL",
//       payload: { enabled },
//     };
//     godotBridge.send(cmd);
//   }

export const characterCommands = {} as const;
