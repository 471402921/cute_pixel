---
id: ADR-002
title: 像素渲染选用 Godot,通过 react-native-godot 嵌入
date: 2026-05-10
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

- Godot 工程独立组织在仓库 `godot_project/`,产物作为 native library 集成
- RN ↔ Godot 通信通过 react-native-godot 暴露的 JS/TS API:从 RN 端访问 Godot 节点、调用方法、连接信号、监听事件
- Godot 引擎运行在独立线程,不阻塞 JS thread 与主线程
- 整个 Godot 引擎实例支持启停、重启、暂停/恢复

## Alternatives Considered

- **Unity 2D**:工具链与 2D 渲染能力顶级,RN 端有 `react-native-unity-view` 等成熟集成;但 Unity 商业授权存在政策风险——年营收过 $200k 必须升级 Unity Pro($2,200+/座位/年起);2023 年 runtime fee 风波证明管理层政策可变,虽已废除但行业信任分受损。Godot 是 MIT 永久免费,无政策风险。
- **Flame(Flutter 内 2D 引擎)**:渲染上限有限,Light2D / 动态阴影 / 多光源管理 / GPU 粒子均需自写 shader,工程量大;设计师协作工具弱(无所见即所得编辑器);与 ADR-001 的 RN 选型冲突。
- **Flame + Rive + 自写 shader 增强**:渲染上限可达 Stardew Valley 档位,但实现"角色被光源照亮 + 多可交互对象持续扩展"两个底座要求时,工程成本显著高于 Godot 内置能力。
- **自写 PlatformView 桥接基于 LibGodot 官方库**:不依赖 react-native-godot 第三方包,直接基于 Godot 官方 Android `.aar` + iOS LibGodot framework 自写桥接;但 react-native-godot 已是 production-validated 方案(Born 公司在多个 app 中服务百万用户),无需自写,自写桥接估 3-4 周且后续维护成本高。
- **Cocos Creator**:像素工具链弱于 Godot,设计师生态小,可视化场景编辑能力不及 Godot 编辑器。
- **全 Godot(Godot 替代 RN 做整个 app)**:渲染最强,但常规 app 体验(列表 / 表单 / 地图 / 设置)需自写 Control 节点,且业务可能扩展的 native SDK 需逐项写 plugin,与"app shell + 嵌入像素世界"形态不匹配。

## Consequences

- **Godot 编辑器双重角色**:运行时引擎 + asset 编排工具。设计师在 Godot 编辑器中所见即所得编排场景、调试灯光、调整动画状态机,不需独立的 asset preview 工具(详见 [ADR-005](ADR-005-godot-as-asset-editor.md))
- 包体增量约 25-30MB(LibGodot framework + Android `.aar`)
- 跨 Android + iOS:react-native-godot 已支持双平台
- 渲染纪律(像素纯度 / 整数缩放 / FilterQuality 等价物)由 Godot 项目设置控制,RN 端不介入
- **可交互业务实体的通用模式**:业务实体(道具 / NPC / 设备等)在像素世界中表现 = Godot scene 中的 interactable Node;业务状态变更 → RN 通过 signal 推送给 Godot → Node 切换状态/动画。底座只规定通信通道与契约模板,具体同步规则由各业务模块自定义
- **第 0 步硬性 spike 要求**:新仓建立后必须用 1-2 周做 react-native-godot 在 Android + iOS 双平台跑通最小场景的 spike(一个角色 + idle 动画 + RN 按钮触发 Godot signal + Godot signal 回 RN);spike 失败需回到 Alternatives 重新评估,优先考虑"自写 PlatformView 桥接"或"Unity 路线"

## Related ADRs

- [ADR-001](ADR-001-react-native-as-app-framework.md) — 应用主框架
- [ADR-005](ADR-005-godot-as-asset-editor.md) — Godot 编辑器作为 asset 编排工具
