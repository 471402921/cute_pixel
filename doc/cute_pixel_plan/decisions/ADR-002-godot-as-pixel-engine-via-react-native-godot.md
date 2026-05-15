---
id: ADR-002
title: 像素渲染选用 Godot,通过 react-native-godot 嵌入
date: 2026-05-10
revised: 2026-05-11
status: Accepted
---

## Context

像素风渲染是 cute_pixel 底座的核心 deliverable("情绪价值"是底座给业务的承诺)。视觉档位对标 Stardew Valley / Coffee Talk / Eastward 等 indie 顶级 2D 像素游戏,底座需支持:

- 等距(isometric)2:1 投影场景
- 多光源动态灯光(吊灯 / 台灯 / 窗光等),可开关、可随时间循环变化
- 角色被光源照亮的视觉反馈与脚下投影
- 多个可交互对象在像素世界中持续扩展(业务实体如道具 / NPC / 设备等)
- 多角色同场景交互
- 全屏色调与早晚循环

应用主框架已定为 React Native(见 [ADR-001](ADR-001-react-native-as-app-framework.md))。像素引擎需嵌入 RN 并支持双向数据通信。

## Decision

像素渲染选用 **Godot 4(GDScript)**,通过 [react-native-godot](https://github.com/borndotcom/react-native-godot) 嵌入 RN app。

### 版本钉死(B1 验证后定的硬约束)

| 项 | 版本 | 锁定原因 |
|---|---|---|
| `@borndotcom/react-native-godot` | **1.0.1** | 当前唯一稳定版 |
| LibGodot runtime | **4.5.1.migeran.2** | react-native-godot 1.0.1 的 prebuilt 自带 |
| Godot 编辑器 | **4.5.x** | runtime 在 `try_open_pack()` 对 .pck 头硬性 abort `ver_major > 4 \|\| ver_minor > 5`(详见 [_B1_REPORT.md §2](../_B1_REPORT.md));**不是** forward-compat 软风险,是 hard refusal |
| `GODOT_EDITOR` env | 必须显式指向 4.5.app | 默认值 `/Applications/Godot.app` 可能是高版本,导出后 runtime 加载失败,详见 [conventions §14](../conventions.md#14-godot-env--native-build-patches) |

升级路径:等 react-native-godot 升到 4.6+ runtime(依赖 [Godot mainline LibGodot PR #110863](https://github.com/godotengine/godot/pull/110863) 在 4.6.x point release 完整合并 + Migeran 重 build prebuilt),才考虑 4.6 编辑器对齐升级。在那之前**不要**单方面升编辑器。

### 架构边界

- Godot 工程独立组织在仓库 `godot_project/`,产物作为 native library 集成
- RN ↔ Godot 通信通过 react-native-godot 暴露的 JS/TS API:从 RN 端访问 Godot 节点、调用方法、连接信号、监听事件
- Godot 引擎运行在独立线程,不阻塞 JS thread 与主线程
- **所有 RN → Godot API 调用必须在 worklet 里**(`react-native-worklets-core` 提供的 `runOnGodotThread(() => { "worklet"; ... })`),详见 [conventions §13](../conventions.md#13-worklet-契约)

### Engine 生命周期 = App 生命周期(单实例常驻)

**唯一 Godot 引擎实例**:

- 由 `services/godot/GodotProvider` 在 app 启动时创建,挂在 `NavigationContainer` 同级或更上层
- App 进后台调 `RTNGodot.pause()`、前台调 `RTNGodot.resume()`,**不调** `destroyInstance()`
- 业务模块**不能** create / destroy engine,**只能**通过 `<PixelView>` mount/unmount 间接触发 scene swap(API 形态详见 [ADR-007](ADR-007-rn-godot-communication-contract.md))

**Why**:

- borndotcom 1.0.1 的 `destroyInstance()` 有析构竞态(Hermes GC × `GodotHostObject` 析构 × Godot 内部残留指针),实测 iOS Sim 上 ~3/15 概率 SIGSEGV(详见 [_B1_REPORT.md §6](../_B1_REPORT.md))
- 单实例消除"哪个 module 拥有 engine"的归属歧义
- 跨模块 Godot side state 默认保留,scene 进出场时显式清理而非 engine 重建

### PixelView Portal 模式

> **Status:** 具体 Portal 机制为 `planned`,**B2 实装时验证**——当前设计基于 [_B1_REPORT.md §6](../_B1_REPORT.md) 的"Godot view 必须挂 provider 层"约束推断,view 跟随 frame 移动的具体可行性(性能 / 视觉抖动 / Android & iOS 平台差异)未实测。

业务模块**不直接**挂 `RTNGodotView`(真 view 只在 `GodotProvider` 里挂一份)。模块用 `<PixelView scene="..." />`,这是个 portal placeholder:

- `<PixelView>` 用 `onLayout` 测自己的 frame,告诉 GodotProvider"我要在这块区域显示某 scene"
- GodotProvider 把 RTNGodotView 移动 / resize 到该 frame,自动发 `SCENE_LOAD` Command(API 形态详见 [ADR-007](ADR-007-rn-godot-communication-contract.md))
- 模块的 mental model:**"我需要某 scene 显示在某区域"**,不是"我要一个 Godot view"

详细架构图 + 状态推送通路见 [pixel-foundation.md](../pixel-foundation.md) "GodotProvider + PixelView Portal"。

## Alternatives Considered

- **Unity 2D**:工具链与 2D 渲染能力顶级,RN 端有 `react-native-unity-view` 等成熟集成;但 Unity 商业授权存在政策风险——年营收过 $200k 必须升级 Unity Pro($2,200+/座位/年起);2023 年 runtime fee 风波证明管理层政策可变,虽已废除但行业信任分受损。Godot 是 MIT 永久免费,无政策风险。
- **Flame(Flutter 内 2D 引擎)**:渲染上限有限,Light2D / 动态阴影 / 多光源管理 / GPU 粒子均需自写 shader,工程量大;设计师协作工具弱(无所见即所得编辑器);与 ADR-001 的 RN 选型冲突。
- **Flame + Rive + 自写 shader 增强**:渲染上限可达 Stardew Valley 档位,但实现"角色被光源照亮 + 多可交互对象持续扩展"两个底座要求时,工程成本显著高于 Godot 内置能力。
- **自写 PlatformView 桥接基于 LibGodot 官方库**:不依赖 react-native-godot 第三方包,直接基于 Godot 官方 Android `.aar` + iOS LibGodot framework 自写桥接;但 react-native-godot 已是 production-validated 方案,自写桥接估 3-4 周,且后续维护成本高。**ADR 修订日(2026-05-11)update**:Godot 4.6 把 LibGodot core 合并入 mainline(见 [PR #110863](https://github.com/godotengine/godot/pull/110863)),自写桥接的中长期成本会下降;但截至当前,Migeran fork 仍是最稳的 prebuilt 来源,等上游 4.6.x point release 完整合并 + react-native-godot 升级到对应 binding 后再考虑此路径。
- **Cocos Creator**:像素工具链弱于 Godot,设计师生态小,可视化场景编辑能力不及 Godot 编辑器。
- **全 Godot(Godot 替代 RN 做整个 app)**:渲染最强,但常规 app 体验(列表 / 表单 / 地图 / 设置)需自写 Control 节点,且业务可能扩展的 native SDK 需逐项写 plugin,与"app shell + 嵌入像素世界"形态不匹配。

## Consequences

- **Godot 编辑器双重角色**:运行时引擎 + asset 编排工具(详见 [ADR-005](ADR-005-godot-as-asset-editor.md))
- 包体增量约 25-30MB(LibGodot framework + Android `.aar`)
- 跨 Android + iOS 已实测(B1 全部跑通:iOS 26.4 Simulator + Android Emulator API 37 + Android 真机/Android 16,详见 [_B1_REPORT.md](../_B1_REPORT.md))
- 渲染纪律(像素纯度 / 整数缩放 / FilterQuality 等价物)由 Godot 项目设置控制,RN 端不介入
- **可交互业务实体通用模式**:业务实体 = Godot scene 中的 interactable Node;状态变更 → RN store subscribe → worklet 包裹 → signal 推送给 Godot → Node 切换状态/动画。详见 [pixel-foundation.md](../pixel-foundation.md)
- **运行时特征**(部分 B1 实测,部分估算待 B2 回填):
  - 内存:engine 常驻约 50-100MB(取决于 scene 与资源大小)— **估算,待 B2 实测回填**
  - 冷启动:engine 初始化 ~500ms-1s,需在 splash 期间预热 — **估算,待 B2 实测回填**
  - 模块间导航:scene 已加载时切换近乎瞬时(不再是"engine 重启"成本)— B2 实装 PixelView Portal 后实测
  - 后台/前台:走 `pause/resume`,不释放 engine — B1 §5 验证
  - 渲染后端按平台自动切(iOS Sim metal / iOS device + Android opengl3),由 `services/godot/GodotProvider` 内部判断,业务模块不感知 — B1 §5 表确认
- **删除原"第 0 步硬性 spike 要求"**:已由 [B1 实施](../_B1_REPORT.md)取代;后续如需重大重构(如升 4.6 runtime),按修订流程重做集成验证

## Related ADRs

- [ADR-001](ADR-001-react-native-as-app-framework.md) — 应用主框架
- [ADR-004](ADR-004-rn-bare-workflow.md) — RN workflow + Expo modules + 包管理
- [ADR-005](ADR-005-godot-as-asset-editor.md) — Godot 编辑器作为 asset 编排
