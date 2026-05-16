---
id: ADR-007
title: RN ↔ Godot 通信契约 v0.1
date: 2026-05-15
status: Accepted
---

## Context

RN 与 Godot 是两个独立 runtime,通信方式是底座最高抽象层的 invariant。底座定位决定这一层选错的代价指数级:未来每个基于本底座的 app 都会承担,改起来要同时改 RN 侧 + GD 侧 + 中间所有 module。

B1 已验证 react-native-godot 1.0.1 的双向通信能跑(详见 [_B1_REPORT.md](../_B1_REPORT.md)),但仅触及"能调通方法"这一最浅层。本 ADR 在 B2 阶段补三层 invariant:wire 协议形态、状态权属、协议位置。

明确**不在本 ADR 范围**的事项见末尾"Deferred"——defer 不是放弃,是"等第一个 demo 模块暴露真实需求后再决定,避免预言式过度工程"。

## Decision

### 1. Wire 协议形态:Single typed message bus

RN ↔ GD 的通信契约**收敛到一对方法 + 一组消息类型联合**:

- **RN → GD**:`godotBridge.send(msg: GodotCommand)`
- **GD → RN**:`godotBridge.subscribe(handler: (evt: GodotEvent) => void)`
- 消息类型用 zod discriminated union 定义,所有 Command / Event 都有 `type` 字段
- 业务侧不直接拼 message,通过 `services/godot/{domain}Commands.ts` helper 调用(`feedPet(...)` 内部 = `bridge.send({type: "PET_FEED", ...})`)

**为什么不选 typed RPC(每个动作一个方法,godotApi.feedPet / loadScene / ...)**:

- 5 实体 × 5 动作 = 25 方法的 godotApi.ts;15 实体 × 6 动作 = 90 方法,不可维护
- 每加一个动作双侧同时改 + 双侧 review,无契约层可独立测
- 没有"中间件"位置,每个 module 都直面 react-native-godot 的 API surface

**为什么不选 codegen 双侧 SDK**:

- GDScript 没有成熟 codegen 工具,自己造代价大
- 没有先用过 messages.ts 在线上跑过,直接 codegen 大概率抽错
- 等真的痛了(messages.ts 超过 50 个 message)再上,backward-compat 不影响

### 2. 状态权属:RN 拥有业务态,GD 拥有渲染态(铁律)

| 谁拥有 | 职责 | 例子 |
|---|---|---|
| **RN** | 可持久化的**业务状态** | pet hunger / mood / level / 库存 / 玩家进度 |
| **GD** | 仅生命周期内的**渲染状态** | 当前帧 / tween 进度 / 粒子 / 屏幕震动 |

**通信方向**:

- RN → GD:Command(`SET_PET_STATE` / `TRIGGER_FEED_ANIMATION`)
- GD → RN:Event(`ANIMATION_FINISHED` / `PET_TAPPED` / `SCENE_LOADED`)
- **GD 不主动改业务态**——任何业务态变化都是 RN 收到 Event 后,RN 自己改 store

**为什么这是铁律**:

- 单源真理,持久化只在 RN 侧,无双侧冲突
- GD 60fps 自由跑(渲染态自由),RN 不需要每帧推
- 边界明确:任何 Command/Event 是"业务"还是"渲染"二选一,不模糊

**反面例子**:GD 内的 idle tick(NPC 自走、宠物呼吸动画)是**渲染态**,GD 自己管;但"宠物随时间变饿"的 hunger 计时**不能**在 GD 侧 tick,必须 RN 侧(GameClock + store)管,GD 只渲染当前 hunger 数值。

### 3. 协议位置:仓库根 `proto/` 独立目录

```
cute_pixel/
├── app/                    # RN 源码
├── godot_project/          # Godot 工程
├── proto/                  # ⚠️ 双 runtime 通信契约——单点真理
│   ├── README.md
│   ├── messages.ts         # zod schemas(RN 侧权威)
│   └── messages.gd         # GDScript 镜像(注释 mirror of messages.ts)
└── ...
```

**为什么放仓库根、不藏在 services/godot/ 下**:

- 符号上 protocol 是"两个独立 runtime 之间的契约面",不属于任何一侧
- 任何 fork / 衍生 app,看一眼 `proto/` 就懂边界
- TS 与 GDScript 文件并列存放,改协议必然双侧同改

**修改纪律**:任何 PR 改 `proto/messages.ts` 必须同时改 `proto/messages.gd`。`/cute-pixel-review` skill 在 review 时检查双侧字段一致性(planned)。

## Alternatives Considered

- **直接在 godotApi.ts 上长 RPC 方法**(Option A):见 §1,5 实体后 surface 爆炸
- **Codegen 双侧 SDK**(Option C):见 §1,过早抽象,无支撑工具
- **Protocol 藏在 services/godot/protocol/**:符号弱,后期挪到根代价大;且把"双 runtime 契约"框进 services/godot/ 暗示它是 RN 单侧的私有实现细节,与事实不符
- **状态权属 (1) RN 单向真理 + GD 哑渲染**:扛不住 60fps 高频动画(粒子/tween 都要 RN push)
- **状态权属 (3) 双侧自由 + 周期性回推**:双侧状态同时变,冲突解决复杂,持久化逻辑被业务侵入

## Consequences

- 业务模块对 GD 的 mental model 永远是"我发一条命令 / 我订阅一类事件",不是"我调一个方法"
- `services/godot/godotBridge.ts` 永远只有 `send` / `subscribe` 两个方法,不增长
- 新加一个实体动作的工作量:`proto/messages.ts` 加一条 + `proto/messages.gd` 镜像 + GD scene 实现 handler + RN 写 helper,4 处但每处都小
- `proto/` 是底座对外的稳定 surface;未来 OTA / 多 app 复用 / 第三方接入此底座时,这是最稳的契约边界
- 短期成本:第一次接 PixelView 时要把 `godotBridge` + 一两个 Command/Event 写出来,比直接调方法多 ~50 行代码

## Deferred(留待第一个 demo 模块暴露需求后单独 ADR)

以下事项**故意不在本 ADR 决定**,避免预言式过度工程。每条注明触发条件:

| Deferred 项 | 触发条件 | 未来归属 |
|---|---|---|
| GD 侧基类(`BaseEntity.gd` / `BaseScene.gd`) | 第一个 demo 出现 2+ 类似 entity 时考虑提取 | ADR-008(可能) |
| Entity registry / discovery | RN 需要枚举 GD 当前 scene 中的实体时 | ADR-009(可能) |
| Bridge 输入路由(PixelView 内 touch 谁吃) | 第一个 demo 接 PixelView + 业务列表混合时 | conventions §15(planned) |
| Asset 目录约定(`godot_project/assets/{...}`) | 第一个 demo 引入 sprite 时 | conventions §16(planned) |
| Protocol 版本字段(`{version, type, payload}`) | 引入 OTA 或多 app 复用时 | ADR-007 修订 |
| Bridge 错误恢复策略(GD 崩溃后是否重启 engine) | 实测出现 GD 崩溃 / 内存压力时 | ADR-010(可能) |

## Related ADRs

- [ADR-001](ADR-001-react-native-as-app-framework.md) — 应用主框架
- [ADR-002](ADR-002-godot-as-pixel-engine-via-react-native-godot.md) — Godot 嵌入 + GodotProvider + PixelView Portal
- [ADR-003](ADR-003-state-management-zustand.md) — RN 侧 store(本 ADR 的"业务态"载体)
