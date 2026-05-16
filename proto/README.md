# proto/

RN ↔ Godot 双 runtime 通信契约的**单点真理**。

## 定位

`proto/` 不属于 RN 侧也不属于 GD 侧——它是两个独立 runtime 之间的契约面。任何 fork / 衍生 app 看一眼这个目录就懂底座的对外消息边界。

任何修改契约的 PR 必须**双侧同改**(`messages.ts` 与 `messages.gd` 同时变更),否则 review 不过。

## 文件

| 文件 | 状态 | 角色 |
|---|---|---|
| `messages.ts` | planned | RN 侧权威——zod discriminated union 定义所有 `GodotCommand` / `GodotEvent` |
| `messages.gd` | planned | GDScript 侧镜像——常量 + 类型 hint,注释顶部写 `# Mirror of proto/messages.ts` |

## 协议形态

详见 [ADR-007](../doc/cute_pixel_plan/decisions/ADR-007-rn-godot-communication-contract.md)。要点:

- 通道收敛到一对方法:`godotBridge.send(cmd)` + `godotBridge.subscribe(handler)`
- 所有 message 是带 `type` 字段的 discriminated union,zod parse 即 invariant 校验
- 业务侧不直接拼 message,通过 `services/godot/{domain}Commands.ts` helper

## 修改纪律

1. RN 侧修改 → `messages.ts` 改完后必须同步改 `messages.gd`,反之亦然
2. PR 描述里说明:加了什么 message / 用途 / 哪一侧先发起
3. `/cute-pixel-review` skill 在 review 时检查双侧字段一致性(planned)
4. **不要**在业务模块里出现裸 `bridge.send({type: "...", ...})`——业务永远调 `services/godot/{domain}Commands.ts` 里的 helper,protocol 演进影响只在 helper 层吸收

## 状态

`messages.ts` / `messages.gd` 在第一个 demo 模块接 PixelView 时实装。当前为占位,等待 ADR-007 §Deferred 中标注的几个事项(版本字段、错误处理、entity registry)在第一个 demo 暴露真实需求后再决定形态。
