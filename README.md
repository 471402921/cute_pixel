# cute_pixel

像素风底座框架,快速起手一个像素风 App。基于 **React Native + Godot 4.5** 的"主体常规 RN UI + 嵌入像素化场景"通用底座。

## 状态

**B2 baseline 已就绪**(2026-05-16)。Upstream `react-native-godot/example` 已平移为 working baseline,清理死代码后重组成 `app/` + `godot_project/` + `proto/` + `scripts/`,Biome 替换 ESLint+Prettier。RN 侧基础设施 Phase A(error / logging / time / env / StateView / navigation 等)scaffolded 完毕。三平台都能跑(iOS Sim + Android Emulator + Android 真机)。

- ✅ Phase A:开发环境搭建(Node 22 LTS / Xcode 26 / Android SDK / Godot 4.5 / yarn 4 / Biome)
- ✅ B1:react-native-godot example 三平台跑通,双向 signal 可用 — 详见 [_B1_REPORT.md](doc/cute_pixel_plan/_B1_REPORT.md)
- ✅ B2(基础设施):baseline 平移 + 死代码清理 + 重组 + Biome
- ✅ B2(契约层):ADR-007 + `proto/messages.ts/.gd` v0.1(SCENE_LOAD/UNLOAD + SCENE_LOADED/BRIDGE_ERROR)
- ✅ B2(RN Phase A):`services/{error,logging,time,env,utils}` + `shared/{widgets/StateView,state,route-args}` + `app/navigation/`(`scaffolded`,等第一个 feature 接入)
- ⏳ B2(继续):`services/godot/` 桥接实装 + 6 个 `cute-pixel-*` skill + 第一个 demo 模块
- 🔮 Phase B(等需求):`services/{network,storage,auth}` + ky / MMKV / keychain 装包
- 🔮 Phase C(等设计稿):`app/theme/` + `app/i18n/`

## 使用

### 准备开发环境

| 工具 | 版本 | 备注 |
|---|---|---|
| Node | 22 LTS | corepack 自带,用来拉 yarn 4 |
| Xcode | 26+(iOS 用户) | 含 iOS Simulator |
| Android Studio + SDK + AVD | 最新 | AVD 必须 arm64-v8a([conventions §14c](doc/cute_pixel_plan/conventions.md#14c-android-ndk--镜像准备)) |
| Godot 编辑器 | **4.5.x 钉死** | 不能用 4.6+([ADR-002](doc/cute_pixel_plan/decisions/ADR-002-godot-as-pixel-engine-via-react-native-godot.md)) |
| OpenJDK | 21 | Android build |
| Ruby + bundler | 2.6+ + 2.4.1 user-install | iOS CocoaPods([conventions §14d](doc/cute_pixel_plan/conventions.md#14d-ios-ruby--bundler)) |

### 安装

```bash
# 1. yarn 4 via corepack(Node 22+ 自带)
corepack enable

# 2. JS 依赖
yarn install
yarn download-prebuilt          # 拉 react-native-godot 的 LibGodot prebuilt

# 3. 配 Godot 4.5.x 编辑器路径(写入 shell rc)
echo 'export GODOT_EDITOR=/Applications/Godot-4.5.app/Contents/MacOS/Godot' >> ~/.zshrc
source ~/.zshrc

# 4. iOS 用户:Pods(首次 + Pod 更新时)
cd ios && bundle install && bundle exec pod install && cd ..
```

### 跑

```bash
yarn start                      # Metro bundler(后台跑,留一个终端)
yarn ios                        # iOS Simulator
yarn android                    # Android Emulator 或 USB 真机
```

### 改了 Godot 场景 / GDScript 后

Godot 资产打包成 `.pck` 嵌进 native 包,改完要重新导出再 build:

```bash
./scripts/export_godot_GodotTest.sh ios         # 产出 ios/GodotTest.pck
./scripts/export_godot_GodotTest.sh android     # 产出 android/app/src/main/assets/GodotTest/
```

只改 RN 侧 JS / TS 不需要重导,Metro 会热更。

### 项目结构

```
cute_pixel/
├── app/                  # RN 源码(Module-First Flat,业务模块平铺在 features/)
├── godot_project/        # Godot 4.5 工程(像素 asset 编排;由 Godot 编辑器打开)
├── proto/                # RN ↔ Godot 通信契约(ADR-007;权威 messages.ts + 镜像 messages.gd)
├── scripts/              # Godot 导出脚本等
├── doc/cute_pixel_plan/  # 架构 / 约定 / ADR(本仓的"为什么这样做")
├── ios/                  # 自动生成的 RN iOS native 工程
└── android/              # 自动生成的 RN Android native 工程
```

业务开发新模块的具体规则见 [architecture.md](doc/cute_pixel_plan/architecture.md):4 条铁律 + Module-First Flat + 轻 DDD 视角。

### 检查 / 测试

```bash
yarn check                # biome check + tsc --noEmit;commit 前必须 0 error
yarn lint                 # 只 lint
yarn lint:fix             # 自动 fix
yarn format               # 格式化
yarn test                 # jest --passWithNoTests(暂无 test;真测随第一个 demo 加)
```

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
