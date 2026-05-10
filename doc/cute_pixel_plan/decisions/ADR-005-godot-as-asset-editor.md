---
id: ADR-005
title: Godot 编辑器作为 Asset 编排工具
date: 2026-05-10
status: Accepted
---

## Context

像素资源(sprite / animation / scene / lighting / TileMap)的上游是 [pixellab.ai](https://www.pixellab.ai/)(AI 像素生成,导出 PNG + metadata)。原计划由独立的 asset-lab repo 承担"多图交互预览 + 场景编排 + 灯光调试"角色。

Godot 4 编辑器内置:Scene 树编排、AnimationPlayer / AnimationTree、Light2D + ShadowCaster2D 实时预览、TileMap + AutoTile、Shader Graph / VisualShader、AudioStreamPlayer 时间轴等。

asset-lab 与 Godot 编辑器角色高度重叠,且 Godot 编辑器是设计师所见即所得 + 与运行时同源,无需格式转换。

## Decision

**Godot 编辑器同时承担 asset 编排工具角色**,不再单独建立 asset-lab repo。

### 设计师工作流

1. **pixellab.ai** 生成原始 sprite + metadata.json
2. **Godot 编辑器**导入到 `godot_project/`,编排成 .tscn 场景,调试灯光与 AnimationTree
3. **git** 版本管理:.tscn / .tres / sprite / metadata 一并 commit 到 `godot_project/`
4. **RN 端**通过 react-native-godot 加载 Godot 工程消费(详见 [ADR-002](ADR-002-godot-as-pixel-engine-via-react-native-godot.md))

## Alternatives Considered

- **保留独立 asset-lab repo**:解耦预览工具与运行时,设计师工具链可以更轻;未选,工具与运行时合一可减少格式转换成本与维护负担,且设计师在编辑器调出的效果就是用户看到的最终效果,无差。
- **第三方 2D 编辑器(LDtk / Tiled)+ 自写 importer**:开源、可选,LDtk 在 indie 像素圈流行;未选,与 Godot 原生 .tscn / .tres 工作流割裂,引入两套场景描述格式。
- **无编辑器纯代码定义场景**:工程师全权;未选,设计师无法参与场景编排,反馈循环长,且复杂灯光 / 动画状态机用代码维护成本高。

## Consequences

- **`godot_project/` 内部所有约定属于 Godot 工程范畴**:目录组织、sprite 命名、灯光配置、像素纯度设置、性能策略、场景拆分等由设计师 + Godot 工程师按 Godot 最佳实践决定,文档化在 `godot_project/README.md`,**不进底座 doc**
- **底座对 Godot 端的硬性约束只有 2 条**(详见 [pixel-foundation.md "设计师工作流与 Godot 工程内部"](../pixel-foundation.md#设计师工作流与-godot-工程内部)):
  1. 场景文件路径稳定(RN 端通过 `res://` 引用)
  2. Entity Node 暴露 `applyState` 方法 + emit signal 协议(遵循 RN ↔ Godot 通信契约)
- **设计师 onboarding**:安装 Godot 4 → 克隆主仓 → Godot 编辑器打开 `godot_project/project.godot`。后续工作流详见 `godot_project/README.md`
- **RN 端约束**:不在 RN 端写任何 sprite preview / 编排代码,所有 asset 工作在 Godot 编辑器完成

## Related ADRs

- [ADR-002](ADR-002-godot-as-pixel-engine-via-react-native-godot.md) — 像素引擎选型与嵌入方案
