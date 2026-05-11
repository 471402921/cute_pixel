---
id: ADR-001
title: 选用 React Native 作为应用框架
date: 2026-05-10
revised: 2026-05-11
status: Accepted
---

## Context

cute_pixel 是像素风跨平台移动应用通用底座,目标 Android + iOS 双平台,首个内置 demo 为 cute_pet。

底座的形态约束:**主体是常规 app 体验(列表 / 表单 / 设置 / 地图等),嵌入像素化场景做差异化情绪价值**。不是全屏游戏(那应当直接用游戏引擎,不需要本底座)。

底座对主框架的要求:

- 跨 Android + iOS 一致,业务代码复用度高
- 与像素引擎可双向通信、嵌入运行
- 与第三方 native SDK 集成顺畅(为业务可能扩展的能力——地图 / WebView / 蓝牙 / 推送 / 传感器等——预留生态便利)
- TypeScript 强静态类型(工程纪律 + AI 协助效率)

业务可能引入的能力(如 IoT 硬件接入、LBS 地图等)是底座选型时考虑的扩展面,**但不构成底座本身的功能义务**。底座对业务保持开放但不绑定。

## Decision

应用主框架选用 **React Native**(纯 RN CLI / Bare workflow,TypeScript strict 模式)。像素渲染部分通过引擎嵌入实现(见 [ADR-002](ADR-002-godot-as-pixel-engine-via-react-native-godot.md))。

## Alternatives Considered

- **Flutter + Flame**:UI 框架与工具链整齐度高,Dart 类型系统贴合"客户端薄"场景;但 Flame 渲染上限达不到 indie 顶级 2D 像素感所需的 Light2D / 多光源 / 动态阴影 / 粒子能力,且无 production-validated 的 Godot 嵌入方案;对业务可能扩展的 native SDK 生态(BLE / 地图 / H5 等)成熟度比 RN 落后数年。
- **Flutter + Unity 嵌入**:Unity 工具链与 2D 渲染顶级,`flutter_unity_widget` 等社区包成熟;但 Unity 商业授权存在政策风险(2023 年 runtime fee 翻车,信任受损),年营收过 $200k 需付订阅($2,200+/座位/年)。
- **Flutter + Godot 嵌入**:Godot 引擎本身嵌入成熟(LibGodot),但 Flutter 桥接层(`flutter_godot` v0.0.2)早期且当前仅支持 Android,iOS 需自写 PlatformView 桥接(估 3-4 周),无社区维护保障。
- **Native 双端(iOS Swift + Android Kotlin)**:UI 体验最佳,SDK 集成最直接;但开发与维护成本翻倍,业务代码无法复用,与"客户端薄"定位不匹配。
- **Cocos Creator + Web export**:跨平台简单,但 Web export 在移动端性能差、发热严重,不适合长时间后台运行场景。

## Consequences

- 包管理走 **yarn 4 Berry**(via `corepack`),RN workflow 走 **Bare + Expo modules autolinking**(commit `android/` `ios/`,不走 Expo CLI / Expo Go),保留对 native plugin 的最大控制(详见 [ADR-004](ADR-004-rn-bare-workflow.md))
- 状态管理走 **Zustand**(见 [ADR-003](ADR-003-state-management-zustand.md))
- 配套技术栈(B1 验证后版本钉死,详细版本号见 [ADR-004 §Decision](ADR-004-rn-bare-workflow.md#decision)):
  - RN 0.81.x / React 19.1.x / TypeScript 5.3.3 strict / Hermes
  - 数据校验:**zod**
  - 国际化:**i18next + react-i18next**
  - 本地存储:**react-native-mmkv**
  - HTTP 客户端:**ky**
  - 测试:**Jest + React Native Testing Library + Detox**(E2E)
  - Lint + Format:**Biome**(替代 ESLint + Prettier,与 react-native-godot example 不一致但开发体验收益大)
  - 导航:**React Navigation v7**
  - Godot 桥接:**@borndotcom/react-native-godot 1.0.1** + **react-native-worklets-core 1.6.2**(详见 [ADR-002](ADR-002-godot-as-pixel-engine-via-react-native-godot.md))
- **业务扩展友好的副产品收益**:RN 在 BLE / 地图 / WebView / GPS / 推送 等业务常用 native SDK 上生态成熟,事实标准包齐全(react-native-ble-plx / react-native-maps / react-native-webview / react-native-geolocation-service / @react-native-firebase/messaging 等)。底座不直接依赖这些包,具体业务按需引入
- 像素渲染部分的引擎选型与嵌入方案见 [ADR-002](ADR-002-godot-as-pixel-engine-via-react-native-godot.md)
- AI 协助开发的训练数据密度(JS/TS 全网 #1)是该选型的隐性收益

## Related ADRs

- [ADR-002](ADR-002-godot-as-pixel-engine-via-react-native-godot.md) — 像素引擎选型与嵌入方案
- [ADR-003](ADR-003-state-management-zustand.md) — 状态管理
- [ADR-004](ADR-004-rn-bare-workflow.md) — RN workflow 与工具链选型
