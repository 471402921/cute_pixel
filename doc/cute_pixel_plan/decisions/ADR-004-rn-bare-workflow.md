---
id: ADR-004
title: RN 走 Bare workflow 与配套工具链
date: 2026-05-10
status: Accepted
---

## Context

底座需要嵌入 react-native-godot 这类非标准 native 库,且业务可能扩展引入大量 native plugin(BLE / 地图 / WebView / GPS / 推送 / MMKV 等)。workflow 选型决定 native code 控制权;包管理决定 monorepo 与磁盘占用;lint / test / format 决定开发循环效率。TypeScript strict 是工程纪律基线。

底座希望:

- 所有 native code(Android / iOS)可直接编辑,不被框架抽象
- 升级 RN / 引入新 native 包不被 SDK 政策约束
- 工具链一致、可复现、AI 协助友好

## Decision

完整工具链清单(Day 0 全部已拍):

| 项 | 选择 | 备注 |
|---|---|---|
| Workflow | **Bare**(纯 RN CLI) | 最大 native 控制权,无 Expo SDK 约束 |
| 包管理 | **pnpm** | monorepo 友好、磁盘占用小、速度快 |
| 语言 | **TypeScript strict** | `strict: true` 全开,所有源文件 |
| Lint + Format | **Biome** | 一体化、快、配置少,取代 ESLint + Prettier |
| 导航 | **React Navigation v7** | 行业标准,深度链接 + tab + stack |
| HTTP | **ky** | 轻量 fetch wrapper,RN 友好 |
| 数据校验 | **zod** | 运行时校验 + TS 类型推导 |
| 本地存储 | **react-native-mmkv** | 同步 API、快、加密支持 |
| 国际化 | **i18next + react-i18next** | namespace 友好,与 ARB 等价的 JSON 资源 |
| 测试 | **Jest + RNTL + Detox** | unit / store / component / e2e 四层 |

## Alternatives Considered

### Workflow

- **Expo Managed**:开箱即用,EAS Build 体验佳;未选,native plugin 受 Expo SDK 限制,react-native-godot 与多 IoT plugin 不可行。
- **Expo Bare**(`expo prebuild`):可加 native code,有 Expo 生态便利;未选,Expo SDK 升级强约束(必须跟随 Expo 版本节奏),且对 Godot 嵌入方式有 prebuild 配置摩擦,Bare 更直接。

### 包管理

- **npm**:RN 默认;未选,无 workspace 友好度,disk 占用大。
- **yarn (classic v1)**:RN 老项目流行;未选,v1 不再维护;v3+ 配置复杂。

### Lint + Format

- **ESLint + Prettier**:传统组合,生态丰富;未选,需要维护两套配置,速度比 Biome 慢一个数量级,Biome 单一配置文件覆盖 lint + format,启动 < 200ms。
- 备选 fallback:若 Biome 在 RN 特定规则上有缺,补 ESLint 局部规则,不重写整套。

### HTTP

- **axios**:成熟,interceptor 强;未选,体积大,RN 上 ky 更轻、fetch 原生、Promise 链更现代。
- **got**:Node-only,RN 不可用。

### 数据校验

- **yup**:旧标准;未选,zod 类型推导更强。
- **io-ts**:函数式,类型最严;未选,API 复杂度高,曲线陡。
- **valibot**:zod 替代品,体积更小;未选,生态小,zod 已是事实标准。

### 本地存储

- **AsyncStorage**:RN 默认;未选,异步且慢,大量小写入场景性能差。
- **WatermelonDB**:本地 DB;未选,过重,本底座不需要关系型数据。

### i18n

- **FormatJS / react-intl**:CLDR 完整;未选,体积大。
- **Lingui**:codegen 路线;未选,引入额外构建步骤。

### 测试

- **Vitest**:快;未选,RN 生态以 Jest 为标准,RNTL / Detox 都按 Jest 集成。
- **Maestro**:E2E 新方案,YAML 描述;未选,Detox 与 RN 集成更深、社区更大。

## Consequences

- **monorepo**:**初期不启用**,单 app 形态。未来若 fork 多个像素 app 共享 godot_project/ 时再上 turborepo 或 nx
- **CI 中的 Detox 位置**:PR 必跑(快路径,Android emulator + iOS simulator 跑核心冒烟);主线 nightly 跑(全量 e2e)
- **Biome 与 RN 默认 ESLint 冲突**:卸载 RN 模板自带 ESLint + Prettier,完全用 Biome 取代;`@react-native/eslint-config` 不再需要
- **TypeScript path alias**:`@/services/*` `@/shared/*` `@/features/*`,通过 `tsconfig.json` paths + `babel-plugin-module-resolver` 配置
- **pnpm + RN 兼容性**:RN 0.74+ 已原生支持 pnpm,需配合 `.npmrc` 设置 `node-linker=hoisted`(避免 native 模块路径问题)
- **MMKV 加密**:涉及 token / 用户敏感数据时启用 encryption key,key 来源 react-native-keychain
- **所有具体版本号与配置文件**在 Phase 3 骨架阶段落地到新仓 `package.json` / `biome.json` / `tsconfig.json` / `babel.config.js` 等

## Related ADRs

- [ADR-001](ADR-001-react-native-as-app-framework.md) — 应用主框架
- [ADR-003](ADR-003-state-management-zustand.md) — 状态管理(配套 zustand + persist + MMKV)
