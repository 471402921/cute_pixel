---
id: ADR-003
title: 状态管理选用 Zustand
date: 2026-05-10
status: Accepted
---

## Context

React Native 没有像 Flutter GetX 那样"路由 + DI + 状态"一站式的方案,状态管理需独立选型。底座对状态管理的要求:

- TypeScript 类型安全,推导自然
- 可订阅式响应(selector 精细订阅,避免不必要的重渲染)
- 支持中间件(persist 持久化、devtools 调试)
- API 简单,无 Provider 包裹强制嵌套
- 模块自治友好——每个模块拥有自己的 store,而非全局单一 store
- 与 Godot 状态同步友好(可在 store selector 上挂 subscribe,变化时推送 signal 到 Godot)

## Decision

使用 **Zustand**(轻量函数式 store,无 Provider 包裹,API 接近响应式心智)。

模块标准三件套:

- `{module}Store.ts` — Zustand store + actions(简单模块合并;复杂模块可拆 `{module}Actions.ts`)
- `{Module}Page.tsx` — 通过 `useXxxStore(selector)` 订阅
- 跨模块共享 store 放 `app/shared/state/`

中间件标配:

- **`subscribeWithSelector`** — 精细订阅,Godot 桥接层用它做高效 signal 推送
- **`persist`** — 持久化,挂 react-native-mmkv 做存储后端(详见 [ADR-004](ADR-004-rn-bare-workflow.md))
- **`devtools`** — 开发期挂 Redux DevTools

## Alternatives Considered

- **Redux Toolkit**:行业老牌,生态最稳;未选,理由:样板代码多,RTK Query 优势在"业务大头在后端"场景的客户端薄 app 中边际收益低,不值得引入概念负担。
- **Jotai**:原子化状态,适合复杂派生依赖;未选,理由:对 cute_pixel 模块自治结构无显著优势,原子粒度过细反而打散模块边界。
- **MobX**:响应式心智最贴近 GetX(用过 GetX 的开发者过渡顺);未选,理由:类装饰器与可变状态在 TS strict 下有编译选项摩擦,需要 `experimentalDecorators` 等非标准配置。
- **Recoil**:Meta 已停止主动维护,不适合作为新项目核心选型。
- **Valtio**:Proxy-based,概念新;未选,Zustand 更主流、教程多、AI 协助质量更高。
- **React Context + useReducer**:零依赖;未选,跨模块共享时性能与可维护性不及独立 store 库,且 reducer 模式对小变更样板偏多。

## Consequences

- 不引入 Redux / RTK / Jotai 等其他状态库,避免双库共存导致心智分裂
- 跨模块共享 store(如 `useUserStore` / `useSettingsStore` / `useGameClockStore`)放 `app/shared/state/`,业务 store 放 `app/features/{module}/`
- 与 Godot 的状态同步契约:业务 store 的 selector 上挂 `subscribe`,变化时通过 `services/godot/{domain}Commands.ts` helper 调 `godotBridge.send(Command)` 推送给 Godot(详见 [ADR-007](ADR-007-rn-godot-communication-contract.md) + [pixel-foundation.md](../pixel-foundation.md) "RN ↔ Godot 通信契约")
- 单元测试通过 store 直接 hydrate state 来 setup,无需 React 渲染层(Zustand 的 hook 与 vanilla store API 等价,vanilla 模式适合测试)
- store action 命名约定:动词开头(`feed` / `select` / `move`),不加 `set` 前缀(set 只在内部 setState 用)
- store 内部状态不直接 mutate(虽然 Zustand 不强制 immer,但保持 immutable 约定有利于 selector 精细订阅)

## Related ADRs

- [ADR-001](ADR-001-react-native-as-app-framework.md) — 应用主框架
- [ADR-004](ADR-004-rn-bare-workflow.md) — 配套工具链
