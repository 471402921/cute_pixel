# Architecture

## 设计目标

cute_pixel 是像素风 React Native + Godot 应用通用底座,目标 Android + iOS 双平台,首个内置 demo 为 cute_pet。

底座形态约束:**主体是常规 app 体验**(列表 / 表单 / 设置 / 地图等),**嵌入像素化场景做差异化情绪价值**。不是全屏游戏(那应当直接用 Godot,不需要本底座)。

架构首要目标:**减少 AI 与人在跨模块工作时的上下文负担** —— 做某个模块的事,只需要看一个文件夹;读架构文档,只需要看几条铁律。

DDD 的分层精神(模块自治、单向依赖、共享集中)被保留,**不**照搬后端 4 层结构 —— 前端业务大头在后端,前端主要是 UI + 状态 + API 调用,4 层会产生大量空壳层,反而增加上下文负担。

底座对业务保持开放但不绑定:技术选型考虑了业务可能引入的扩展面(IoT 硬件接入、LBS 地图、传感器等)的生态友好度,但底座本身不承载任何业务义务,可承载任何"app shell + 嵌入像素世界"形态的业务。

具体的代码标准(错误处理、i18n、测试、日志、lint 等)见 [conventions.md](conventions.md)。像素引擎集成、RN ↔ Godot 通信契约、资源约定等见 [pixel-foundation.md](pixel-foundation.md)。

## 状态标记说明

下文凡是写到具体文件路径或服务的地方,都带一个 **Status** 标:

- `planned` — 文档里描述了,但代码还**没有**这个文件/类。**禁止直接 import**,要用得先实现(或先和用户对齐再实现)
- `scaffolded` — 文件已存在,但当前没有 `features/` 模块在 import。可以直接接入,但要意识到这是首次接入
- `in-use` — 文件已存在且至少被一个 `features/` 模块在用,接入风险最低

Agent 在生成 import 语句之前**必须**先核对 Status。Status 与代码事实漂移时,以代码为准并就地修订本文档。

## 顶层目录

```
cute_pixel/
├── README.md
├── package.json
├── tsconfig.json
├── biome.json                        # Biome 配置
├── babel.config.js                   # path alias 等
├── doc/                              # 架构 / 约定 / 决策
│   ├── architecture.md
│   ├── conventions.md
│   ├── pixel-foundation.md
│   └── decisions/
├── app/                              # RN 源码根
│   ├── main.tsx                      # 入口                                  [planned]
│   ├── App.tsx                       # 根组件                                [planned]
│   ├── navigation/                   # 导航配置(React Navigation)         [planned]
│   ├── theme/                        # 主题                                  [planned]
│   ├── i18n/                         # 国际化资源(zh / en JSON)           [planned]
│   ├── services/                     # 基础设施(业务无关)                 [planned]
│   │   ├── error/                    # Failure 类型
│   │   ├── network/                  # ky + 拦截器
│   │   ├── storage/                  # MMKV 封装
│   │   ├── auth/                     # AuthService + token 生命周期
│   │   ├── env/                      # Env 抽象
│   │   ├── logging/                  # Logger 门面
│   │   ├── time/                     # GameClock
│   │   ├── godot/                    # RN ↔ Godot 桥接(详见 pixel-foundation.md)
│   │   └── utils/                    # 纯函数工具
│   ├── shared/                       # 跨模块共享                            [planned]
│   │   ├── state/                    # 跨模块 store(useUserStore 等)
│   │   ├── widgets/                  # 跨模块组件(StateView 等)
│   │   └── route-args/               # 路由参数类型(跨模块契约)
│   ├── features/                     # 业务模块(Module-First Flat)       [planned]
│   └── _template/                    # 模块模板(给 module-gen skill 用)  [planned]
├── godot_project/                    # Godot 工程(详见 pixel-foundation.md) [planned]
├── android/                          # RN 默认 native
├── ios/
├── e2e/                              # Detox 测试                            [planned]
└── .claude/                          # skills + settings
```

## Module-First Flat:模块内部结构

每个业务模块(`app/features/{module}/`)**内部平铺**,按职责命名,不嵌套层目录:

```
features/{module}/
├── {Module}Page.tsx                  # Screen + 视图组合,只组合不写业务
├── {module}Store.ts                  # Zustand store + actions:状态唯一真理
├── {module}Models.ts                 # 数据类型 + zod schema(纯 TS)
├── {module}Api.ts                    # 后端调用(经 services/network/)
└── components/                       # 模块内私有组件(可选)
    └── *.tsx
```

**路由参数类** `{module}RouteArgs.ts` **不**放模块内,统一放 [app/shared/route-args/](../app/shared/route-args/)。理由:调用方(任意 feature)需要 import 它来构造强类型参数,放模块内会触发铁律 #1(features 互引)。文件名仍保持 `{module}RouteArgs.ts`,只是位置在 `app/shared/route-args/`。

**简单模块**只需要 `Page` + `Store` + `Models` 三件套,其余按需。

**复杂模块**(如嵌入 Godot 的像素场景模块)可以加专属文件,但仍然平铺(见 [pixel-foundation.md](pixel-foundation.md))。

### 命名约定

| 文件 | 职责 | 类/函数命名 |
|---|---|---|
| `{Module}Page.tsx` | Screen + 组合,**只组合不写业务** | `XxxPage`(default export) |
| `{module}Store.ts` | Zustand store + actions,**业务状态唯一真理** | `useXxxStore`(Hook),内部 actions 直接挂在 store object |
| `{module}Models.ts` | 数据类型 + zod schema | 多个 type / interface / schema |
| `{module}Api.ts` | 后端调用,返回 zod-parsed 模型 | `xxxApi`(object 或函数集) |
| `shared/route-args/{module}RouteArgs.ts` | 路由参数(传 React Navigation 的 `params`,跨模块契约) | `XxxRouteArgs`(type) |
| `components/*.tsx` | 模块内私有组件 | 与文件同名 |

类名/Hook 名与文件名一一对应,小驼峰转大驼峰:`pet/petStore.ts` → `usePetStore`。

## 4 条铁律

写在最前面,违反就是设计错了:

1. **模块自治**:`features/A/` 内部任何 import 都**不能**跨到 `features/B/`。要跨模块通信,见 [conventions §11](conventions.md#11-跨模块通信)
2. **共享单点**:跨模块用的东西必须放 `services/` 或 `shared/`,**不能**放某个 feature 里再被另一个 feature 引用
3. **单向依赖**:依赖图严格单向 —— `features/* → services/* + shared/* → 外部包`。`services/` `shared/` 不能依赖 `features/`
4. **命名一致**:`{Module}Page.tsx` / `{module}Store.ts` / `{Module}RouteArgs` 等命名约定必须遵守,Agent 看名字就知道职责

## services/ vs shared/ 边界

容易模糊,记住经验法则:

- **`services/`** 偏**基础设施 / 通用能力**,业务无关。例:HTTP 客户端、本地存储封装、Env 配置、Failure 类型、日志门面、GameClock、Godot 桥接、日期格式化工具。**不依赖 React 组件树的能力一般归 services/**
- **`shared/`** 偏**跨模块的 UI 或业务状态**。例:`StateView` 组件、跨模块共享的 `useUserStore` / `useSettingsStore`、多模块都用的"主按钮"组件。**带 React 组件或带跨模块业务状态的归 shared/**

模糊时优先放 `shared/`,后悔了再迁。**单一模块独占的东西不放这里**,放进 `features/{module}/` 内部。

## 像素引擎与底座

像素渲染由 Godot 4 承担,通过 [react-native-godot](https://github.com/borndotcom/react-native-godot) 嵌入 RN(详见 [ADR-002](decisions/ADR-002-godot-as-pixel-engine-via-react-native-godot.md))。

架构层面 RN ↔ Godot 边界:

- 所有 Godot 桥接通过 `services/godot/` **单点封装**,业务模块**不**直接 import `react-native-godot`
- `features/` 内部需要嵌入像素场景时,使用 `services/godot/` 暴露的 `<PixelView>` 组件 + `godotApi`
- RN ↔ Godot 通信契约、Asset 管线、灯光约定、业务实体在像素世界中表现等,详见 [pixel-foundation.md](pixel-foundation.md)

## 与后端的契约

cute_pixel 接入后端时的统一约定:

- **响应格式** `{code, message, data, traceId}`,`code === 0` 为成功
- **鉴权**:`Authorization: Bearer <token>`(token 生命周期见 [conventions §3](conventions.md#3-认证与-token-生命周期))
- **HTTP 错误统一映射**(由 `services/network/` 拦截器处理,业务层不做 HTTP 异常处理):
  - **Status:** `services/network/` 整体 `planned`(目录在 Phase 3 建立)
  - 401 → `AuthService.clear()` + 跳登录
  - 403 → throw `ForbiddenFailure`
  - 422 / 400 → throw `ValidationFailure`(配合 zod parse 失败也走此路)
  - 404 → throw `NotFoundFailure`
  - 500 → throw `ServerFailure`
  - 超时 / 断网 → throw `NetworkFailure`
- **错误的传递与展示**见 [conventions §1](conventions.md#1-错误处理流水线)

后端接入前,`{module}Api.ts` 返回 mock 数据,接入后只改这一个文件。

## 不在本架构范围内 (Out of Scope)

明确**不在本架构里规范**的事项,这些到上线前再单独规划:

- CI/CD 流水线(GitHub Actions:typecheck + lint + test + build)
- 崩溃上报(Sentry / Firebase Crashlytics)
- 性能监控(Hermes Profiler、Detox 性能 baseline、Godot FPS overlay 仅 dev)
- 证书钉扎
- 响应式断点(平板 / 折叠屏)
- 远程资源热更新(Godot scene 远程下载与版本管理)
