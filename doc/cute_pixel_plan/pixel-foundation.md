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

Godot 是**像素渲染的实现细节**,通过 `services/godot/` **单点桥接**对外暴露。**不**进入其他 `services/`、`shared/`、或 `features/` 模块内部。一个 RN app 实例只跑**一个** Godot 引擎实例。

`services/godot/` 内部结构(`planned`,Phase 3 落地):

```
services/godot/
├── godotBridge.ts        # 封装 react-native-godot view 与原生 signal
├── PixelView.tsx         # 给 features/ 嵌入用的 React 组件
├── godotEvents.ts        # 信号 / 事件 TypeScript 类型定义
└── godotApi.ts           # 高层 API:loadScene / sendEntityState / subscribeSignal
```

业务模块通过 `godotApi` 与 Godot 通信,**不**直接 import `react-native-godot`。这条规则使 features/ 与具体引擎解耦——理论上换一个引擎(改 `services/godot/` 内部实现)业务代码不动。

## RN ↔ Godot 通信契约(底座关心的全部)

为避免业务状态在 RN 端与 Godot 端形成双 source of truth:

```
{Module}Store(Zustand,业务状态唯一真理)
        │
        │ subscribe(selector) 监听变化
        ▼
   godotApi.sendEntityState(entityId, state)
        │ (通过 react-native-godot 调用 Godot 端方法或发信号)
        ▼
   Godot 端 {Entity}Node.applyState(state)
        │
        ▼
   切换显示(怎么切换是 Godot 端的事)
```

**Godot 端 Node 不订阅 RN store**,只暴露 `applyState()` 让 RN 推。换 app 主体只换名字 `Pet → Plant / Fish / Villager`,模式不变。

反向(用户在像素世界内交互):

```
用户在 Godot canvas 内 tap interactable Node
        │ Godot 处理 InputEvent
        ▼
   Godot emit_signal("entity_tapped", entityId, action)
        │ react-native-godot 桥接
        ▼
   RN godotApi.subscribeSignal('entity_tapped', handler)
        │
        ▼
   handler 调对应 store action → 状态更新 → 推回 Godot
```

**Godot 端不直接修改 RN 业务状态**(避免双向数据流复杂化)。所有状态变更走 RN store → Godot 单向同步。

不规定的部分(交业务自定义):

- 具体 entity state shape
- 具体 signal 名称与参数
- Godot 端 Node 内部如何实现 applyState

## 业务实体在像素世界中的表现

每个可交互业务实体(如道具 / NPC / 设备 / 触发器等)= `features/{entity}/` 模块 + Godot 端对应的 interactable Node。

通用模式(底座规定的契约):

1. RN 端 `features/{entity}/{entity}Store.ts` 持有业务状态唯一真理
2. store subscribe selector 变化 → 调用 `godotApi.sendEntityState(entityId, state)`
3. Godot 端 `{Entity}Node` 暴露 `applyState(state)` 接收推送(**具体如何展现由设计师与 Godot 工程师决定**)
4. 用户交互 → Godot 发 signal → RN handler 调用 store action → 状态更新 → 推回

实体在 Godot 端如何注册、如何实例化、如何组织节点树、动画状态机如何拆分等,**由 Godot 工程实践决定**,本底座不规定。

## 输入抽象(边界规则)

- **Godot canvas 内**(像素世界内的 tap / drag / hover):由 Godot 自身处理,通过 signal 推回 RN
- **Godot canvas 外**(常规 RN UI 的 onPress 等):由 RN 自身处理
- 两端通过 signal 通信,**不混线**:RN 不监听 PanGestureHandler 在 `<PixelView>` 之上(避免与 Godot 输入冲突)

业务模块如果要在像素世界外触发像素世界内的行为(如点击外部按钮喂食),走 store action → `godotApi.sendEntityState` 推 signal 给 Godot,**不**在 RN 端模拟一个 tap event 给 Godot。

## 设计师工作流与 Godot 工程内部

> 完整 ADR 见 [ADR-005](decisions/ADR-005-godot-as-asset-editor.md)。

```
[pixellab.ai]  →  [Godot 编辑器]  →  [git]  →  [react-native-godot 加载]
 AI 生成 sprite    设计师编排 .tscn   版本     RN 端运行时消费
                   调灯光 / 动画
```

**`godot_project/` 内部的所有约定都属于 Godot 工程范畴,本底座不规定**。包括但不限于:

- 目录组织、sprite 命名规则
- 灯光参数、阴影策略、CanvasModulate 早晚循环
- 像素纯度设置(filter / mipmaps / Snap)
- 场景拆分粒度、性能优化、资源加载策略
- AnimationTree 状态机、Shader 库、TileMap 编辑

由设计师与 Godot 工程师按 Godot 最佳实践决定,文档化在 `godot_project/README.md`。

底座对 Godot 端的硬性约束**只有 2 条**:

1. **场景文件路径稳定**:RN 端通过 `res://scenes/{name}.tscn` 加载,场景重命名/移动需同步更新 RN 端引用
2. **Entity Node 暴露 applyState 与 emit signal 协议**:遵循上面的"RN ↔ Godot 通信契约"

其他都是 Godot 工程内部的事,RN 端不介入。

## 加载契约

RN 端通过 `godotApi.preloadScene(sceneName)` 触发 Godot 端预加载,等待完成回调后再渲染 `<PixelView>`(期间 RN 端展示 loading UI)。

具体加载策略(同步/异步、缓存、内存管理、LRU 等)由 Godot 端实现,本底座不规定。RN 端只关心 preload 完成与否的回调。

## 与具体 app 的边界

本文是底座的契约,不是底座的代码。fork 一个新像素 app 时:

| 复用 | 说明 |
|---|---|
| `architecture.md` + `conventions.md` + `pixel-foundation.md` | 三件套整体复用,不动 |
| `services/` + `shared/` | 整体复用,新 app 内可扩展 |
| `app/navigation/` 骨架 | 复用骨架,routes 列表清空重填 |
| `features/` | **完全清空,按新 app 业务重建** |
| `godot_project/` | 设计师团队按需决定:可继承公共素材/shader/脚本,也可重起;由 `godot_project/README.md` 自治 |
| `cute-pixel-*` skill 套件 | 复用(skill 本身不绑业务) |

新 app 第一动作:在 `doc/` 写自己的 `prd/` + `design/`,然后 `/cute-pixel-module-gen` 起第一个模块。
