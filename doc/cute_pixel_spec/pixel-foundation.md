# Pixel Foundation

像素风 React Native + Godot 应用的**通用底座**约定。本文与具体业务、**Godot 内部实现**都解耦——任何想做下一款基于本底座的像素 app(种菜、养鱼、小镇 demo、学习陪伴等)的人或 Agent,读完本文 + [architecture.md](architecture.md) + [conventions.md](conventions.md) 三件套就能起一个新项目。

> 状态标记 `planned | scaffolded | in-use` 的含义见 [architecture.md "状态标记说明"](architecture.md#状态标记说明)。

## 目标与适用范围

适用于:

- **像素风**(pixel art)— 强调 pixel-perfect 渲染
- **React Native UI + Godot 局部像素化** — 主体是常规 RN UI(列表、表单、设置、地图),只在像素化场景嵌入 Godot view
- **移动 + 双平台单代码库** — Android / iOS 一份代码
- **业务大头在后端** — 客户端薄,见 [architecture "设计目标"](architecture.md#设计目标)

不适用于:

- **全屏游戏(Godot 主导整个 app shell)** — 直接用 Godot 4 export Android / iOS,不需要本底座;但本底座沉淀的 `godot_project/` 可单独提取复用
- **3D / 高 DPI 矢量风** — 本文很多约定对它们是负收益

## Godot 的位置(架构边界)

> 完整 ADR 见 [ADR-002](decisions/ADR-002-godot-as-pixel-engine-via-react-native-godot.md)。

Godot 是**像素渲染的实现细节**,通过 `services/godot/` **单点桥接**对外暴露。**不**进入其他 `services/`、`shared/`、或 `features/` 模块内部。一个 RN app 实例只跑**一个** Godot 引擎实例,**生命周期 = app 生命周期**(详见下节)。

`services/godot/` 内部结构(`planned`,Phase 3 落地):

```
services/godot/
├── GodotProvider.tsx     # ⭐ 单例 RTNGodotView 持有方,挂 NavigationContainer 同级或更上层;engine 与 app 同生死
├── PixelView.tsx         # ⭐ Portal placeholder,onLayout 报 frame 给 GodotProvider,告诉它"在这块区域显示某 scene";不持有真 view
├── godotBridge.ts        # ⭐ 通信契约入口——`send(cmd)` + `subscribe(handler)` 两个方法封装(详见 ADR-007)
├── {domain}Commands.ts   # 各 domain 的语义层 helper(`feedPet(...)` 内部 = `bridge.send({type: "PET_FEED", ...})`)
└── godotEvents.ts        # Event handler 注册的语义封装(可选,简单场景直接用 bridge.subscribe)
```

业务模块通过 `<PixelView>` + `services/godot/{domain}Commands.ts` 与 Godot 通信,**不**直接 import `react-native-godot`、**不**直接拼 `bridge.send` 的 message。这条规则使 features/ 与具体引擎、具体 message 形态都解耦——理论上换一个引擎(改 `services/godot/` 内部 + `proto/` 镜像)业务代码不动。

## GodotProvider + PixelView Portal 架构(B1 验证后定的硬约束)

> **Status mix:**
> - "Engine 单实例 + 不能 destroyInstance + view 必须在 provider 层" — `validated`,B1 §6 实测
> - "PixelView 用 onLayout 测 frame → GodotProvider 移动 RTNGodotView" — `planned`,B2 实装时验证(view 跟随 frame 移动的性能 / 视觉抖动 / 双平台差异未实测)
> - "Scene 进出场清理纪律的具体 cleanup API 形态" — `planned`,B2 实装时定型

### 为什么需要这个模式

borndotcom react-native-godot 1.0.1 的 `destroyInstance()` 有 Hermes GC × `GodotHostObject` 析构竞态,实测 iOS Sim 上 ~3/15 概率 SIGSEGV(详见 [_B1_REPORT.md §6](_B1_REPORT.md))。所以 Godot 引擎**只能创建一次**,跟 app 同生死,不能跟 navigation 路由生命周期绑定。

### 架构图

```
┌──────────────────────────────────────────────────────────┐
│ App.tsx                                                  │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ GodotProvider (services/godot/)                      │ │
│ │  - 唯一持有 <RTNGodotView>(absolute 定位 + zIndex) │ │
│ │  - 收 PixelView 的 frame 信息                        │ │
│ │  - 触发 SCENE_LOAD Command / pause / resume         │ │
│ │ ┌──────────────────────────────────────────────────┐ │ │
│ │ │ NavigationContainer                              │ │ │
│ │ │   ├─ HomeStack                                   │ │ │
│ │ │   │   ├─ PetPage                                 │ │ │
│ │ │   │   │   └─ <PixelView scene="pet_world" />   │ │ │
│ │ │   │   │       ↑ portal placeholder,            │ │ │
│ │ │   │   │         onLayout → 报 frame 给 Provider │ │ │
│ │ │   │   │         Provider 把 RTNGodotView 移到此位│ │ │
│ │ │   │   └─ FeedPage                                │ │ │
│ │ │   ├─ ShopStack                                   │ │ │
│ │ │   └─ SettingsStack                               │ │ │
│ │ └──────────────────────────────────────────────────┘ │ │
│ └──────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

### 关键纪律

| 谁 | 能做什么 | 不能做什么 |
|---|---|---|
| `GodotProvider` | 持有唯一 RTNGodotView;create / pause / resume engine;管理 scene 切换 | 暴露 RTNGodotView 给业务模块 |
| `services/godot/godotBridge` | 暴露 `send(cmd)` + `subscribe(handler)` 两个方法,封装 react-native-godot 原生 API | 暴露原始 react-native-godot API 给业务;暴露 third 个方法 |
| `services/godot/{domain}Commands.ts` | 提供语义层 helper(`feedPet(...)` 内部 `bridge.send`) | 跳过 bridge 直接调 react-native-godot |
| `<PixelView>` | onLayout 报 frame;请求某 scene | 持有真 view;管理 engine 生命周期 |
| 业务模块 | 用 `<PixelView scene="..." />` 占位;通过 `services/godot/{domain}Commands.ts` 调 helper(必须在 worklet 里) | create / destroy engine;直接 import react-native-godot;裸调 `bridge.send({type, ...})` 不经 helper |

### Engine 生命周期

| 时机 | 行为 |
|---|---|
| App 冷启动 | GodotProvider 在 splash 期间调 `RTNGodot.createInstance(...)` 预热(~500ms-1s);完成前 PixelView 显示 loading |
| 模块间导航 | engine 不动,scene 已加载时切换近乎瞬时;只有 scene 不同才发 `SCENE_LOAD` Command |
| App 进后台 | `RTNGodot.pause()`,**不**销毁 |
| App 回前台 | `RTNGodot.resume()` |
| App 退出 | OS 回收进程,无需显式 destroy |

**禁止**:Metro Fast Refresh 触发 GodotProvider unmount → 重新 createInstance(开发期容易撞 SIGSEGV)。改用全量 `r r` reload。

## RN ↔ Godot 通信契约(底座关心的全部)

> 完整契约 ADR 见 [ADR-007](decisions/ADR-007-rn-godot-communication-contract.md)。本节为概念性架构描述;消息类型权威定义在 [`proto/messages.ts`](../../proto/messages.ts)(planned)+ GDScript 镜像 [`proto/messages.gd`](../../proto/messages.gd)(planned)。

### 协议形态:single typed message bus

通信通道**收敛到一对方法**:

```typescript
// services/godot/godotBridge.ts
godotBridge.send(cmd: GodotCommand): void                                   // RN → GD
godotBridge.subscribe(handler: (evt: GodotEvent) => void): Unsubscribe      // GD → RN
```

`GodotCommand` / `GodotEvent` 是 zod discriminated union(`{type, payload}`),定义在 `proto/messages.ts`。业务模块**不直接拼 message**,通过 `services/godot/{domain}Commands.ts` helper 调用:

```typescript
// services/godot/petCommands.ts(示意,具体形态待第一个 demo 落地)
export const feedPet = (petId: string, food: FoodType) =>
  runOnGodotThread(() => {
    "worklet";
    godotBridge.send({ type: "PET_FEED", payload: { petId, food } });
  });
```

### 状态权属:RN 业务态 / GD 渲染态(铁律)

| 谁拥有 | 职责 | 例子 |
|---|---|---|
| **RN** | 可持久化的**业务状态** | pet hunger / mood / level / 进度 |
| **GD** | 仅生命周期内的**渲染状态** | 当前帧 / tween 进度 / 粒子 / 屏幕震动 |

**GD 不主动改业务态**——所有业务态变更都是 RN 收到 Event 后,RN 自己改 store。详见 [ADR-007 §2](decisions/ADR-007-rn-godot-communication-contract.md)。

### 状态推送(RN → GD,Command 通道)

```
{Module}Store(Zustand,业务态唯一真理)
        │
        │ subscribe(selector) 监听变化
        ▼
runOnGodotThread(() => {
  "worklet";                                    ← 必须的指令注释
  godotBridge.send({ type: "...", payload: ... })
})
        │ (通过 react-native-godot worklet 桥接)
        ▼
GD 端 MessageBridge.gd dispatch by type
        │
        ▼
对应 Scene/Entity 的 handler 执行(动画 / tween / 状态切换)
```

**Why worklet**:`react-native-worklets-core` 把函数序列化到 Godot 线程上执行,跟 react-native-reanimated 的 worklet 是同一套底层。直接在主 JS 线程调 `RTNGodot.API()` 会落到"background 线程"概念,无法完整访问 Scene Tree,且对象引用不能跨上下文传递。详见 [react-native-godot README §Threading](https://github.com/borndotcom/react-native-godot#threading-and-javascript-in-react-native)。

### 用户在像素世界内交互(GD → RN,Event 通道)

```
用户在 Godot canvas 内 tap interactable Node
        │ Godot 处理 InputEvent
        ▼
GD 端 MessageBridge.gd emit Event
        │ react-native-godot 桥接
        ▼
RN godotBridge.subscribe 注册的 handler 收到 evt
        │
        ▼
handler 调对应 store action → 业务态更新 → store subscribe 推回 Command(再走上面的 worklet 路径)
```

**Godot 端不直接修改 RN 业务态**(铁律,见上)。所有业务态变更走 RN store,GD 只 emit Event 通知"发生了什么"。

### Scene 进出场清理纪律(B1 后新增,具体 cleanup 形态 `planned`)

因为 engine 跨模块常驻,**Godot side 状态默认不会自动 GC**(基于 B1 §6 "engine 跨模块常驻" 推断)。模块离开页面时必须主动收尾:

| 类型 | 处理 |
|---|---|
| 业务态(从 RN store 推过去的) | 不用收,下次进场时 RN store 推新值会覆盖 |
| 模块临时性的粒子 / 一次性动画 / 临时灯光(GD 渲染态) | **必须**通过 Command(`SCENE_CLEANUP` 或类似)让 GD 端清,不能假装下次进场会 reset |
| 模块加的 `godotBridge.subscribe` listener | `useEffect` 的 cleanup 函数里调返回的 `Unsubscribe` |

不规定的部分(交业务自定义):

- 具体 Command / Event 的 payload shape(由 `proto/messages.ts` 在第一个 demo 时定型)
- GD 端 Scene 内部如何 dispatch handler
- GD 端 Node 如何组织

## 业务实体在像素世界中的表现

每个可交互业务实体(如道具 / NPC / 设备 / 触发器等)= `features/{entity}/` 模块 + Godot 端对应的 interactable Node。

通用模式(底座规定的契约):

1. RN 端 `features/{entity}/{entity}Store.ts` 持有业务态唯一真理
2. store subscribe selector 变化 → **在 worklet 里**调用 `services/godot/{entity}Commands.ts` 暴露的 helper(内部 `godotBridge.send`)
3. GD 端 `MessageBridge.gd` 收到 Command → dispatch 到对应 Scene/Entity 的 handler(**具体如何展现由设计师与 Godot 工程师决定**)
4. 用户交互 → GD 端 emit Event → RN `godotBridge.subscribe` 收到 → 调用 store action → 业务态更新 → 推回(再走步骤 2)
5. 模块卸载时 cleanup 渲染态 Command + 调返回的 `Unsubscribe`

实体在 Godot 端如何注册、如何实例化、如何组织节点树、动画状态机如何拆分等,**由 Godot 工程实践决定**,本底座不规定。

## 输入抽象(边界规则)

- **Godot canvas 内**(像素世界内的 tap / drag / hover):由 Godot 自身处理,通过 signal 推回 RN
- **Godot canvas 外**(常规 RN UI 的 onPress 等):由 RN 自身处理
- 两端通过 signal 通信,**不混线**:RN 不监听 PanGestureHandler 在 `<PixelView>` 之上(避免与 Godot 输入冲突)

业务模块如果要在像素世界外触发像素世界内的行为(如点击外部按钮喂食),走 store action → worklet 包裹的 `services/godot/{domain}Commands.ts` helper 发 Command 给 Godot,**不**在 RN 端模拟一个 tap event 给 Godot。

## 设计师工作流与 Godot 工程内部

> 完整 ADR 见 [ADR-005](decisions/ADR-005-godot-as-asset-editor.md)。

```
[pixellab.ai]  →  [Godot 4.5.x 编辑器]  →  [git]  →  [react-native-godot 加载]
 AI 生成 sprite    设计师编排 .tscn        版本     RN 端运行时消费
                   调灯光 / 动画
```

**`godot_project/` 内部的所有约定都属于 Godot 工程范畴,本底座不规定**。包括但不限于:

- 目录组织、sprite 命名规则
- 灯光参数、阴影策略、CanvasModulate 早晚循环
- 像素纯度设置(filter / mipmaps / Snap)
- 场景拆分粒度、性能优化、资源加载策略
- AnimationTree 状态机、Shader 库、TileMap 编辑

由设计师与 Godot 工程师按 Godot 最佳实践决定,文档化在 `godot_project/README.md`。

底座对 Godot 端的硬性约束**只有 3 条**:

1. **场景文件路径稳定**:RN 端通过 `res://scenes/{name}.tscn` 加载,场景重命名/移动需同步更新 RN 端引用
2. **GD 端实现 `MessageBridge.gd` 接收 Command + emit Event**:遵循 [`proto/messages.gd`](../../proto/messages.gd)(planned)的镜像约定,详见 [ADR-007](decisions/ADR-007-rn-godot-communication-contract.md);任何 Command/Event 的 payload 字段改动必须双侧同改
3. **编辑器版本钉死 Godot 4.5.x**:LibGodot runtime 在 `try_open_pack()` 硬性 abort 高于自己版本的 .pck;`GODOT_EDITOR` env 必须显式指向 4.5.app,详见 [conventions §14](conventions.md#14-godot-env--native-build-patches)

其他都是 Godot 工程内部的事,RN 端不介入。

## 加载契约(scene swap,非 engine restart)

RN 端通过 `services/godot/sceneCommands.ts` 的 helper(内部 `bridge.send({type: "SCENE_PRELOAD", ...})`)触发 GD 端预加载,等待对应 `SCENE_LOADED` Event 后再渲染 `<PixelView>`(期间 RN 端展示 loading UI)。

**Engine 已在 app 启动时由 GodotProvider 初始化好**,所以加载流程是 **scene swap**,不是 engine restart:

```
PixelView mount → onLayout → 上报 frame
        │
        ▼
GodotProvider 检查当前 scene
        │
        ├─ 同 scene:仅移动 RTNGodotView 到新 frame(无 reload)
        └─ 不同 scene:发 `SCENE_LOAD` Command → GD 端切场景 → 回 `SCENE_LOADED` Event → 渲染
```

具体加载策略(同步/异步、缓存、内存管理、LRU 等)由 GD 端实现,本底座不规定。RN 端只关心 `SCENE_LOADED` Event 何时到达。

## 与具体 app 的边界

本文是底座的契约,不是底座的代码。fork 一个新像素 app 时:

| 复用 | 说明 |
|---|---|
| `architecture.md` + `conventions.md` + `pixel-foundation.md` | 三件套整体复用,不动 |
| `services/` + `shared/` | 整体复用,新 app 内可扩展;`GodotProvider` 与 `PixelView` 是底座基建,不动 |
| `app/navigation/` 骨架 | 复用骨架,routes 列表清空重填 |
| `features/` | **完全清空,按新 app 业务重建** |
| `godot_project/` | 设计师团队按需决定:可继承公共素材/shader/脚本,也可重起;由 `godot_project/README.md` 自治 |
| `cute-pixel-*` skill 套件 | 复用(skill 本身不绑业务) |

新 app 第一动作:在 `doc/` 写自己的 `prd/` + `design/`,然后 `/cute-pixel-module-gen` 起第一个模块。
