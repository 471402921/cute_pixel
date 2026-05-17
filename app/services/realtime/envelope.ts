/**
 * Envelope — console ↔ relay ↔ app 之间走 WebSocket 的外层包装。
 *
 * relay **不解** envelope,只按 room_id + 推断的反向 role 转发。
 *
 * 本文件**不在 proto/** —— proto/ 是 RN ↔ GD 契约,envelope 是网络层契约,
 * 两层分开(详见 doc/console-spec/requirements.md §5.3、handoff-reply.md 背景)。
 *
 * 字段必须跟 console + relay 端字面一致(详见
 * https://github.com/471402921/consle/blob/main/handoff/cute_pixel.md#envelope)。
 */

import { z } from "zod";
import { GodotCommand, type GodotEvent } from "../../../proto/messages";

export const Role = z.enum(["app", "console"]);
export type Role = z.infer<typeof Role>;

/**
 * 收到的 envelope:msg 是 console 下行的 GodotCommand(app 收方向)。
 * 上行 envelope 的 msg 是 GodotEvent(见 OutboundEnvelope)。
 */
export const InboundEnvelope = z.object({
  room_id: z.string(),
  from: Role,
  ts: z.number(),
  msg: GodotCommand,
});
export type InboundEnvelope = z.infer<typeof InboundEnvelope>;

export interface OutboundEnvelope {
  room_id: string;
  from: "app";
  ts: number;
  msg: GodotEvent;
}
