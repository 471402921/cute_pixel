# cute_pixel

像素风底座框架,快速起手一个像素风 App。基于 **React Native + Godot 4.5** 的"主体常规 RN UI + 嵌入像素化场景"通用底座。

## 状态

**B2 基础设施已就绪**(2026-05)。Upstream `react-native-godot/example` 已平移为 working baseline,清理死代码后重组成 `app/` + `godot_project/` + `scripts/`,Biome 替换 ESLint+Prettier。三平台都能跑(iOS Sim + Android Emulator + Android 真机)。

- ✅ Phase A:开发环境搭建(Node 22 LTS / Xcode 26 / Android SDK / Godot 4.5 / yarn 4 / Biome)
- ✅ B1:react-native-godot example 三平台跑通,双向 signal 可用 — 详见 [_B1_REPORT.md](doc/cute_pixel_plan/_B1_REPORT.md)
- ✅ B2(基础设施):baseline 平移 + 死代码清理 + `app/`/`godot_project/`/`scripts/` 重组 + Biome
- ⏳ B2(继续):Module-First Flat 真正落地(`app/services/godot/` 等) + 6 个 `cute-pixel-*` skill + 第一个 demo 模块

## 核心选型(Day-0 + B1 后定型)

| 项 | 选择 |
|---|---|
| App 框架 | React Native 0.81 Bare + Expo modules autolinking([ADR-001](doc/cute_pixel_plan/decisions/ADR-001-react-native-as-app-framework.md), [ADR-004](doc/cute_pixel_plan/decisions/ADR-004-rn-bare-workflow.md)) |
| 像素引擎 | Godot 4.5.x(编辑器版本钉死)+ LibGodot 4.5.1.migeran.2(via react-native-godot 1.0.1)([ADR-002](doc/cute_pixel_plan/decisions/ADR-002-godot-as-pixel-engine-via-react-native-godot.md)) |
| RN ↔ Godot 通信 | Single typed message bus + RN/GD 状态权属铁律 + 仓库根 `proto/`([ADR-007](doc/cute_pixel_plan/decisions/ADR-007-rn-godot-communication-contract.md)) |
| 状态管理 | Zustand([ADR-003](doc/cute_pixel_plan/decisions/ADR-003-state-management-zustand.md)) |
| 包管理 | yarn 4 Berry(via corepack) |
| Lint | Biome |
| 测试 | Jest + RNTL + Detox |
| 像素 asset 编排 | Godot 4.5 编辑器([ADR-005](doc/cute_pixel_plan/decisions/ADR-005-godot-as-asset-editor.md)) |
| 业务流水线 | Spec-driven(PRD → TechPack → module-gen → test-gen → review)([ADR-006](doc/cute_pixel_plan/decisions/ADR-006-spec-driven-with-strong-gates.md)) |

## 文档地图

- [doc/cute_pixel_plan/README.md](doc/cute_pixel_plan/README.md) — 文档草稿区索引(ADR 状态速查)
- [doc/cute_pixel_plan/architecture.md](doc/cute_pixel_plan/architecture.md) — 模块边界 / 4 条铁律 / Module-First Flat 命名
- [doc/cute_pixel_plan/conventions.md](doc/cute_pixel_plan/conventions.md) — 14 条编码标准(P0 + P1)
- [doc/cute_pixel_plan/pixel-foundation.md](doc/cute_pixel_plan/pixel-foundation.md) — RN ↔ Godot 通信契约 / GodotProvider + PixelView Portal
- [doc/cute_pixel_plan/decisions/](doc/cute_pixel_plan/decisions/) — 6 个 ADR
- [doc/cute_pixel_plan/_B1_REPORT.md](doc/cute_pixel_plan/_B1_REPORT.md) — B1 集成验证报告
- [CLAUDE.md](CLAUDE.md) — Claude Code 在本仓工作指引

## License

[MIT](LICENSE)
