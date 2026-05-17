/**
 * realtimeEnv — console handoff §7 要求的两个运行时配置。
 *
 * - `REALTIME_URL`:relay 的 base WSS URL(WebSocketClient 会拼上 `/room/<id>?role=app`)
 * - `REALTIME_ROOM_ID`:console + app 双方约定的房间标识(MVP 阶段即 token,
 *   建议 ≥ 32 字符,详见 doc/console-spec/requirements.md §6)
 *
 * 取值策略:`process.env.X`(由 RN babel `transform-inline-environment-variables`
 * / dotenv-cli 等注入,本仓库当前**未**配)→ fallback 到 dev 默认值。
 *
 * 真接入时把值写进 `.env`(或 CI 注入),Android 上 localhost 跨平台问题由
 * `realtimeBridge` 内部 resolveHost 处理(详见 handoff-reply.md §3)。
 *
 * 不走 zod 校验:这两个值都有 fallback,缺值是预期(dev 期),不该启动期崩。
 * 若未来要做"必须传"的 env,改成 `validateEnv` schema 入口即可。
 */

const DEFAULT_REALTIME_URL = "wss://console.ewow.cn:18789/relay";
// console + relay 项目方分配的联调 room_id(2026-05-17,jet-dev,>= 32 字符)
const DEFAULT_REALTIME_ROOM_ID = "cute-mvp-2026-05-17-jet-dev-aaaaaaaaaaaaaa";

function readEnv(key: string, fallback: string): string {
  const value = process.env[key];
  return value != null && value.length > 0 ? value : fallback;
}

export const realtimeEnv = {
  url: readEnv("REALTIME_URL", DEFAULT_REALTIME_URL),
  roomId: readEnv("REALTIME_ROOM_ID", DEFAULT_REALTIME_ROOM_ID),
} as const;
