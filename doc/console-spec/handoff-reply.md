# 对 console handoff 的回复

> Status: Draft(2026-05-17)。这是对 [471402921/consle handoff/cute_pixel.md](https://github.com/471402921/consle/blob/main/handoff/cute_pixel.md) 的回复。
> 文件不存 console 端 handoff 副本,直接链 GitHub source。console 端改了那边 → 我们这边重新读 + 更新本文件即可。

## 背景

console + relay 项目把我们的 [requirements.md](./requirements.md) 继承 + 补全后回流了一份 work order(7 项实装清单 + 联调验收清单)。整体设计与 requirements 完全一致:

- Envelope `{ room_id, from, ts, msg }` — 同
- URL 形态 `wss://<host>/room/<id>?role=app|console` — 同
- 新增 3 条 message(CHARACTER_SET_EXTERNAL_CONTROL / CHARACTER_SET_VELOCITY / CHARACTER_STATE)— 同
- 5Hz state 节流、relay-level 心跳、`failed` 后 indicator + toast — 同

**结论**:7 项可直接执行,但开工前需要把下面 5 个实装期细节敲一下,免得做完才发现命名 / 路径对不上要返工。

---

## 5 个实装期决定

### 1. MessageBridge.gd 需要 expose `emit_event`(public)

**问题**:console handoff §5 写 `MessageBridge.emit_event(ev)`,但当前 [MessageBridge.gd](../../godot_project/bridge/MessageBridge.gd) 只有 `_emit_event(event: Dictionary)` 是 private(带下划线)。character.gd 调不到。

**决定**:加一个 public `emit_event(event_dict: Dictionary)`,内部转给 `_emit_event`。`_emit_event` 保留,继续给 bridge 内部 SCENE_LOADED / BRIDGE_ERROR 用。

```gdscript
# 业务 .gd 通过这个上报 event(走 RN ↔ GD 桥)
func emit_event(event: Dictionary) -> void:
    _emit_event(event)
```

### 2. Character 节点定位:用 group,不用 hardcode path

**问题**:console handoff §4 写 `get_node("/root/.../Character")`,`...` 是 placeholder。当前 character 在 `/root/InteriorScene/furnitures/Character`。如果以后场景结构调(设计师重组 furnitures 容器 / 切场景),hardcode path 就崩。

**决定**:
- `character.gd._ready()` 里 `add_to_group("character")`
- MessageBridge handler 里 `var ch = get_tree().get_first_node_in_group("character")`,`if ch == null: _emit_error(...)` 兜底

跟 conventions §17 的"设计师拥有节点结构"也契合 — group 标记是工程师在 .gd 里加的,不动 .tscn 节点路径。

### 3. 开发期 localhost 跨平台差异

**问题**:console handoff §7 写 `REALTIME_URL=ws://localhost:8080`。在 iOS Sim OK(Simulator 共享 host network),但 **Android Emulator 里 `localhost` 指 Emulator 自己**,要用 `10.0.2.2:8080` 才能访问 host machine 的 relay。

**决定**:`services/env/` 暴露 `REALTIME_URL` 时,在 RealtimeBridge 内部按 `Platform.OS` 替换 host:

```ts
const url = Platform.OS === "android" && process.env.REALTIME_URL?.includes("localhost")
  ? process.env.REALTIME_URL.replace("localhost", "10.0.2.2")
  : process.env.REALTIME_URL;
```

或者更简单:开发期 env 里就写 `10.0.2.2`(host machine 的 LAN IP),iOS Sim 也能访问。这个细节实装时确定。

### 4. 命名差异 — 按我们实际写,无需返工

console handoff §5 暗示 GD 私有变量 `_external_control`,实际 [character.gd](../../godot_project/character/character.gd) 是 public `external_control_enabled`(无下划线)。

**决定**:实装 §5 CHARACTER_STATE 上报时,按实际名:

```gdscript
"control_mode": "external" if external_control_enabled else "autonomous",
```

不要替 console 端命名背书,他们文档里那个 `_external_control` 是他们写文档时假设的。

### 5. ADR-007 加 entity scoping 一节(跟 §1 同 PR)

console handoff §1 末尾建议加一条 ADR-007 *entity scoping* 约束:实体级 message 用 `<ENTITY>_<VERB>` 命名,payload 内部不再嵌实体类型。

**决定**:同意,与 proto 扩展(§1 工作)同一个 PR 一并改 ADR-007,加一节大致写:

> ### Entity scoping(2026-05 增补)
>
> 实体级 message(角色 / NPC / 物品等)命名规则:
> - type 串用 `<ENTITY>_<VERB>` 形式(`CHARACTER_SET_VELOCITY`、`NPC_TALK`、`ITEM_PICKUP`)
> - payload 内部**不**再嵌 `entity_type` 或 `target` 字段;不同实体走不同 type
> - 单实体多动作时复用 ENTITY 前缀,避免 `MOVE_CHARACTER` / `CHARACTER_MOVE` 命名混乱
>
> 为什么:console + 设备调试场景下 messages 数量很快会到几十条,统一前缀让 GD 端 `match` dispatch 易读、TS 端 zod schema 易枚举。

---

## 我方 7 项实装顺序(对应 console handoff)

按依赖排:

1. **proto 扩展(§1)** + ADR-007 修订(本文件 §5)— 一个 PR
2. **GD MessageBridge handler(§4) + character 上报(§5) + emit_event expose(本文件 §1)+ character group 标记(本文件 §2)** — 一个 GD PR
3. **services/realtime/WebSocketClient.ts 实装(§2)+ realtimeBridge 双向路由(§3)+ env 配置(§7)+ Android 10.0.2.2 处理(本文件 §3)** — 一个 RN PR
4. **ConnectionIndicator 接真信号(§6)** — 小 PR,放进 #3 一起也行

实际可能 1 + 2 + 3+4 合一个 commit 推 cute_pet 分支(测试分支,不追求 PR 粒度),时间估 1-2 小时。

---

## 联调约定

我们这边任何一步卡住:RN console 日志 + GD `print` 输出 + 当前 envelope frame 截屏,贴给 console 项目那边。

联调 URL / room_id 等他们部署完补 [console handoff §联调地址](https://github.com/471402921/consle/blob/main/handoff/cute_pixel.md#联调地址待我们这边部署后补)。

---

## 修订记录

| 日期 | 改动 | 改动人 |
|---|---|---|
| 2026-05-17 | 初版 | Jet + Claude |
