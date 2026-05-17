---
id: ADR-004
title: RN 走 Bare workflow + Expo modules,配套工具链与版本锁
date: 2026-05-10
revised: 2026-05-11
status: Accepted
---

## Context

底座需要嵌入 react-native-godot 这类非标准 native 库,且业务可能扩展引入大量 native plugin(BLE / 地图 / WebView / GPS / 推送 / MMKV 等)。workflow 选型决定 native code 控制权;包管理决定 monorepo 与磁盘占用;lint / test / format 决定开发循环效率。TypeScript strict 是工程纪律基线。

底座希望:

- 所有 native code(Android / iOS)可直接编辑,不被框架抽象
- 升级 RN / 引入新 native 包不被 SDK 政策约束
- 工具链一致、可复现、AI 协助友好
- 与 react-native-godot 上游 stable stack 对齐,**减少集成风险面**(B1 验证后此项被提到决定性位置)

## Decision

完整工具链清单(B1 实测验证):

| 项 | 选择 | 备注 |
|---|---|---|
| Workflow | **RN Bare + Expo modules autolinking** | commit `android/` `ios/` 目录,**不**走 Expo CLI / Expo Go;通过 `expo-modules-core` autolinking 复用 Expo 生态包(`expo-device` / `expo-file-system` 等) |
| 包管理 | **yarn 4 Berry** (via `corepack`) | `package.json` 写 `packageManager: "yarn@4.x.x"`,`corepack enable` 后自动生效;`pnpm` 留待 future ADR(见下) |
| Node | **22 LTS** | `.tool-versions`(asdf 风)+ brew `node@22` 双重保障 |
| Ruby | macOS 系统 **Ruby 2.6.10** + `bundler 2.4.1` (`gem install --user-install bundler -v 2.4.1`) | 不需装 rbenv/asdf;项目内 `bundle config set --local path 'vendor/bundle'` 把 cocoapods 装到项目目录,不污染系统 |
| Java | **OpenJDK 21**(Homebrew) | RN 0.81 / Gradle 8.13 / AGP 7+ 兼容 |
| 语言 | **TypeScript 5.3.3 strict** | 与 example 对齐;`strict: true` 全开 + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` |
| RN | **0.81.x** | example 当前线 |
| React | **19.1.x** | RN 0.81 配套 |
| Hermes | 默认开 | 配套 React 19 + worklets |
| Godot 桥接 | **react-native-worklets-core 1.6.2** + **@borndotcom/react-native-godot 1.0.1** | 详见 [ADR-002](ADR-002-godot-as-pixel-engine-via-react-native-godot.md);worklet 调用契约见 [conventions §13](../conventions.md#13-worklet-契约) |
| Lint + Format | **Biome** | 一体化、快、配置少,取代 ESLint + Prettier(独立于集成层,与 example 不一致但开发体验收益巨大) |
| 导航 | **React Navigation v7** | 行业标准,深度链接 + tab + stack |
| HTTP | **ky** | 轻量 fetch wrapper,RN 友好 |
| 数据校验 | **zod** | 运行时校验 + TS 类型推导 |
| 本地存储 | **react-native-mmkv** | 同步 API、快、加密支持 |
| 国际化 | **i18next + react-i18next** | namespace 友好 |
| 测试 | **Jest + RNTL + Detox** | unit / store / component / e2e 四层 |

## Alternatives Considered

### Workflow

- **Expo Managed**:开箱即用,EAS Build 体验佳;**未选**,native plugin 受 Expo SDK 限制,react-native-godot 与多 IoT plugin 不可行
- **Expo Bare(`expo prebuild`)**:可加 native code,有 Expo 生态便利;**未选**,Expo SDK 升级强约束(必须跟随 Expo 版本节奏),且对 Godot 嵌入方式有 prebuild 配置摩擦,直接 commit native dirs 更稳
- **纯 Bare(完全排除 Expo)**:理论最纯净;**B1 验证后否决**,react-native-godot example 不可移除依赖 `expo` / `expo-modules-core` / `expo-device` / `expo-file-system` / `expo-asset` / `expo-constants` / `expo-font` / `expo-keep-awake`(详见 [_B1_REPORT.md §7a](../_B1_REPORT.md));"bare RN + Expo modules autolinking" 是 2026 年 RN 主流写法,既保留 native 控制权,又不放弃 Expo 高质量包生态

### 包管理

- **npm**:RN 默认;**未选**,无 workspace 友好度,disk 占用大
- **yarn classic v1**:RN 老项目流行;**未选**,v1 不再维护
- **pnpm**:磁盘小、速度快、monorepo 友好;**Considered but Deferred**——选 yarn 4 的唯一理由是"对齐 react-native-godot example stable stack",条件性的不是本质的。yarn 4 Berry 已具备 PnP / workspace / 严格 lockfile 等 monorepo 友好特性,迁移收益不显著。**将来 react-native-godot 自己换 pnpm,或 pnpm × RN 兼容性突破到无摩擦,重开 ADR-007 评估迁移**
- **Bun**:还太新,RN 0.81 集成路径未稳

### Node 版本管理

- **asdf**:react-native-godot 用的 `.tool-versions` 就是 asdf 风
- **fnm**:更轻
- **brew node@22 + force-link**:**当前选**,单项目场景最简单;后续如果需要多项目并存或更精细的版本切换,再上 asdf

### Ruby

- **rbenv + Ruby 3.x**:典型推荐;**未选**,B1 实测系统 Ruby 2.6.10 + `gem install --user-install bundler -v 2.4.1` 已能跑通 RN 0.81 + cocoapods 1.15.2(详见 [_B1_REPORT.md §3a](../_B1_REPORT.md));不增加版本管理器开销
- **Homebrew ruby**:可用作 fallback,brew 装 cocoapods 时也会顺带装一份

### Lint + Format

- **ESLint + Prettier**:react-native-godot example 用的;**未选**,需要维护两套配置,速度比 Biome 慢一个数量级。Biome 单一配置文件覆盖 lint + format,启动 < 200ms。**这是少数我们与 example 不对齐的项**,理由是 Biome 不在集成层,纯开发体验提升,迁移成本可控
- 备选 fallback:若 Biome 在 RN 特定规则上有缺,补 ESLint 局部规则,不重写整套

### HTTP / 数据校验 / 本地存储 / i18n / 测试

(原方案保留,与 example 无冲突)

- **axios** / **got** / **yup** / **io-ts** / **valibot** / **AsyncStorage** / **WatermelonDB** / **FormatJS** / **Lingui** / **Vitest** / **Maestro** — 与原 ADR 评估一致,未选

## Consequences

- **monorepo**:**初期不启用**,单 app 形态。未来若 fork 多个像素 app 共享 godot_project/ 时再上 turborepo 或 nx
- **CI 中的 Detox 位置**:PR 必跑(快路径,Android emulator + iOS simulator 跑核心冒烟);主线 nightly 跑(全量 e2e)
- **Biome 与 RN 默认 ESLint 冲突**:卸载 RN 模板自带 ESLint + Prettier,完全用 Biome 取代;`@react-native/eslint-config` 不再需要
- **TypeScript path alias**:`@/services/*` `@/shared/*` `@/features/*`,通过 `tsconfig.json` paths + `babel-plugin-module-resolver` 配置
- **yarn + RN 兼容性**:RN 0.81 + Hermes + Metro 与 yarn 4 Berry 已实测兼容(B1 验证);`corepack enable` 后 `yarn -v` 自动取 `packageManager` 字段指定的版本
- **MMKV 加密**:涉及 token / 用户敏感数据时启用 encryption key,key 来源 react-native-keychain
- **Native build patches**(B1 实测发现的硬约束,详见 [conventions §14](../conventions.md#14-godot-env--native-build-patches)):
  - **Podfile 必须带 fmt base.h patch**:RN 0.81 + Xcode 26.4 stack 下 `Pods/fmt/include/fmt/base.h` 的 `__apple_build_version__` 守卫拒绝 Apple Clang 21,需用 `post_install` 钩子改源码;`xcconfig` 走 `FMT_USE_CONSTEVAL=0` 无效。**RN ≥ 0.84 升级 fmt 12.1 后可删**(详见 [_B1_REPORT.md §3b](../_B1_REPORT.md))
- **首次 build 磁盘成本**(B1 实测):Android 首次 build 自动装 NDK 27.0.12077973(`react-native-worklets-core` 锁)+ NDK 28.1.13356709(主 app),共 ~3GB;首次 ~40min,缓存命中后增量 ~37s
- **国内网络考量**:`gradle.properties` / `~/.gradle/init.d/` 提前准备阿里云 maven 镜像,避免 dl.google.com TLS 抖动时整体 build 失败
- **所有具体版本号与配置文件**在工程骨架的 `package.json` / `biome.json` / `tsconfig.json` / `babel.config.js` / `.tool-versions` / `.yarnrc.yml` / `Gemfile` / `Podfile` 等落地

## Related ADRs

- [ADR-001](ADR-001-react-native-as-app-framework.md) — 应用主框架
- [ADR-002](ADR-002-godot-as-pixel-engine-via-react-native-godot.md) — Godot 集成 + worklet 调用契约
- [ADR-003](ADR-003-state-management-zustand.md) — 状态管理(配套 zustand + persist + MMKV)
