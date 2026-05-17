# CLAUDE.md

本文件给未来在本仓库工作的 Claude Code (claude.ai/code) 实例提供指引。

## 仓库状态

**B2 baseline 已就绪**(2026-05-16,commit 0fec3e5 起):工程骨架 + RN 侧 Phase A 基础设施 + proto/messages v0.1 + jest mock setup 全部到位。三平台跑通(iOS Sim + Android Emulator + Android 真机),clone-to-baseline 路径稳。

进度:

- ✅ Phase A:开发环境就绪(Node 22 LTS / Xcode 26 / Android SDK + AVD / Godot 4.5 / yarn 4 / Biome 等)
- ✅ B1:react-native-godot example 三平台跑通(详见 [_B1_REPORT.md](doc/cute_pixel_plan/_B1_REPORT.md));ADR-001/002/004 + conventions + pixel-foundation 已据 B1 发现 2026-05-11 修订
- ✅ B2(基础设施):upstream example 平移为 working baseline,清理死代码,重组成 `app/` + `godot_project/` + `proto/` + `scripts/`,Biome 替换 ESLint+Prettier
- ✅ B2(契约层):ADR-007 RN↔GD 通信契约 v0.1 + proto/messages.ts/.gd 最小集(SCENE_LOAD/UNLOAD + SCENE_LOADED/BRIDGE_ERROR)
- ✅ B2(RN Phase A):services/{error, logging, time, env, utils} + shared/{widgets/StateView, state, route-args} + app/navigation/ 全套落地(scaffolded,无 features 在用)
- ✅ B2(第一个 demo,cute_pet 分支):services/godot/ 全套实装(GodotProvider + PixelView + godotBridge + sceneCommands) + services/realtime/ stub(WebSocket placeholder) + features/room/ 第一个 Module-First Flat 实例 + Godot 端 MessageBridge.gd autoload + 像素风室内场景(Lissyluo66/godot-test 素材) + autonomous character 状态机。iOS Sim E2E 跑通(scene 渲染 + RN↔GD message bus 验证)。素材层 polish(wall.tres physics_layer 未配、4 家具 CollisionShape 空)在 [godot_project/TODO.md](godot_project/TODO.md),等设计师跟进
- ✅ B2(console 联调,cute_pet 分支,2026-05-17):远程控制台 MVP 闭环。proto 加 CHARACTER_SET_EXTERNAL_CONTROL / SET_VELOCITY / CHARACTER_STATE(per ADR-007 §4 entity scoping);GD 端 MessageBridge 加 dispatch handler(group 查找 character,不 hardcode 路径)+ character.gd 5Hz CHARACTER_STATE 节流上报;RN 端 services/realtime/ 全套实装(WebSocketClient 真连 + 指数退避 1/2/4/8/16s × 5 → failed + realtimeBridge 双向路由 + envelope.ts);ConnectionIndicator 5 态(灰/黄/黄/绿/红)。联调地址 `wss://console.ewow.cn:18789/relay`(非 :443,腾讯边缘 anti-scan 拦截 SNI + :443 + 高频握手三者并存)。iOS Sim + Android 真机 E2E 双端验证通过。console + relay 是独立项目([471402921/consle](https://github.com/471402921/consle));需求/契约/对接细节见 [doc/console-spec/](doc/console-spec/)
- ⏳ B2(继续):6 个 `cute-pixel-*` skill + 第二个 demo 模块(暴露 Portal "frame 跟随" 真实需求)
- 🔮 Phase B(等真痛):services/{network, storage, auth} + ky/MMKV/keychain 装包
- 🔮 Phase C(等设计稿):app/theme/ + app/i18n/(i18next + zh/en sync 检查)

正在迭代的内容在 [doc/cute_pixel_plan/](doc/cute_pixel_plan/)。等 B2 全套稳定后整体复制到 `doc/`,本目录归档为快照。

## 项目定位

`cute_pixel` 是像素风跨平台移动 app 的**通用底座**。形态:

- **主体**:常规 RN UI(列表 / 表单 / 设置 / 地图)
- **嵌入像素场景**:通过 [react-native-godot](https://github.com/borndotcom/react-native-godot) 嵌入 Godot 4.5,做差异化情绪价值
- **不是**全屏游戏(全屏游戏直接用 Godot,不需要本底座)
- 示例 demo:`cute_pet` 等参考实现(底座本身无业务绑定,fork 后随便起新模块)

技术栈(B1 验证后版本钉死,详见 [ADR-004](doc/cute_pixel_plan/decisions/ADR-004-rn-bare-workflow.md)):

- React Native 0.81 Bare + **Expo modules autolinking**(commit android/ios,不走 Expo CLI / Expo Go)
- React 19.1 / TypeScript 5.3.3 strict / Hermes
- yarn 4 Berry(via corepack;pnpm 留待 future ADR)
- Node 22 LTS / OpenJDK 21 / Ruby 2.6.10 + bundler 2.4.1 user-install
- Zustand / zod / ky / MMKV / i18next / Biome / React Navigation v7
- Jest + RNTL + Detox
- `@borndotcom/react-native-godot` 1.0.1 + `react-native-worklets-core` 1.6.2

## 4 条铁律

违反就是设计错了,不是风格偏好。`/cute-pixel-review`(planned)和 PR review 强制检查。

1. **模块自治** — `features/A/` 内部任何 import 都不能跨到 `features/B/`。跨模块通信走 `services/`、`shared/state/`,或事件总线(最后选项)。
2. **共享单点** — 跨模块用的东西必须放 `services/` 或 `shared/`,**不能**放在某个 feature 里再被另一个 feature 引用。
3. **单向依赖** — `features/* → services/* + shared/* → 外部包`。`services/` 和 `shared/` 不能依赖 `features/`。
4. **命名一致** — `{Module}Page.tsx`、`{module}Store.ts`、`{module}Models.ts`、`{module}Api.ts`、`{Module}RouteArgs`。看文件名就知道职责,不要发明新结构。

完整理由见 [doc/cute_pixel_plan/architecture.md](doc/cute_pixel_plan/architecture.md)。

## Module-First Flat 布局

每个业务模块是 `app/features/{module}/` 下的一个**平铺**目录:

```
features/{module}/
├── {Module}Page.tsx      # Screen + 视图组合,只组合不写业务
├── {module}Store.ts      # Zustand store + actions——状态唯一真理
├── {module}Models.ts     # TS 类型 + zod schema(纯 TS)
├── {module}Api.ts        # 后端调用,经 services/network/
└── components/           # 模块内私有组件(可选)
```

路由参数类型放 [app/shared/route-args/{module}RouteArgs.ts](app/shared/route-args/)(planned),**不**放模块内——任何 feature 调用方都需要 import 它,放模块内会触发铁律 #1。

命名细节:

- 文件 `pet/petStore.ts` 导出 `usePetStore`(小驼峰文件 → 大驼峰 hook)
- store action 用动词(`feed` / `select` / `move`),**不**加 `set` 前缀(`set` 只在内部 `setState` 用)

## services/ vs shared/

- **`services/`** — 业务无关的基础设施(HTTP、MMKV 封装、Env、`Failure` 类型、Logger、`GameClock`、Godot 桥接、纯函数 utils)。不依赖 React 组件树。
- **`shared/`** — 跨模块、且依赖 React 组件树的 UI,或带跨模块业务状态的 store(`StateView`、`useUserStore` 等)。
- 模糊时优先放 `shared/`,后悔再迁。**单一模块独占的东西不放这里**,放进 `features/{module}/` 内部。

## 像素引擎边界(B1 后定型 + ADR-007 通信契约)

Godot 由 `services/godot/` **单点封装**,业务模块**不**能直接 `import 'react-native-godot'`。RN ↔ Godot 通信契约定义在 [proto/](proto/) 仓库根目录(详见 [ADR-007](doc/cute_pixel_plan/decisions/ADR-007-rn-godot-communication-contract.md))。

### Engine 生命周期 = App 生命周期(单实例常驻)

唯一 Godot 引擎实例由 `services/godot/GodotProvider` 在 app 启动时创建,挂在 `NavigationContainer` 同级或更上层:

- App 进后台:`RTNGodot.pause()`
- App 回前台:`RTNGodot.resume()`
- **业务模块不能 create / destroy engine**,只能通过 `<PixelView>` mount/unmount 间接触发 scene swap
- 原因:borndotcom 1.0.1 的 `destroyInstance` 有 Hermes GC × `GodotHostObject` 析构竞态,实测 SIGSEGV(详见 [_B1_REPORT.md §6](doc/cute_pixel_plan/_B1_REPORT.md))

### PixelView Portal 模式

> **Status:** 具体机制 `planned`,B2 实装时验证(view 跟随 frame 移动的性能/视觉抖动/双平台差异未实测;详见 [ADR-002 §PixelView Portal 模式](doc/cute_pixel_plan/decisions/ADR-002-godot-as-pixel-engine-via-react-native-godot.md#pixelview-portal-模式))。

业务模块**不直接**挂 `RTNGodotView`(真 view 只在 `GodotProvider` 里挂一份)。模块用 `<PixelView scene="..." />`,这是个 portal placeholder:

- `<PixelView>` 用 `onLayout` 测自己的 frame → 告诉 GodotProvider"我要在这块区域显示某 scene"
- GodotProvider 把 RTNGodotView 移动到该 frame + 自动发 `SCENE_LOAD` Command(`<PixelView>` unmount 时自动 `SCENE_UNLOAD`)
- 业务模块**不直接**发 scene-level Command,详见 [conventions §16](doc/cute_pixel_plan/conventions.md#16-scene-生命周期by-pixelview)

模块的 mental model:**"我需要某 scene 显示在某区域"**,不是"我要一个 Godot view"。

### 通信契约:single typed message bus(ADR-007)

通信通道收敛到一对方法 + 一组消息类型联合(zod discriminated union),定义在 `proto/messages.ts`(权威)+ `proto/messages.gd`(GDScript 镜像):

```
{Module}Store(Zustand,业务态唯一真理)
        │ subscribe(selector)
        ▼
runOnGodotThread(() => {
  "worklet";                                       ← 必须的指令注释
  godotBridge.send({ type: "...", payload: ... }) ← 业务实际通过 services/godot/{domain}Commands.ts helper
})
        │
        ▼
GD 端 MessageBridge.gd dispatch by type → 对应 Scene/Entity 的 handler
```

GD → RN 反向:`godotBridge.subscribe(handler)` 收 Event,handler 调 store action 改业务态。

**状态权属(铁律,ADR-007)**:RN 拥有可持久化业务态(hunger / level / 进度),GD 拥有渲染态(动画帧 / tween / 粒子);**GD 不主动改业务态**——所有业务态变化都是 RN 收到 Event 后,RN 自己改 store。

### 硬性约束(违反 = 跑不起来 / 跑乱了)

- **Godot 编辑器钉死 4.5.x**:LibGodot runtime 在 `try_open_pack()` 硬 abort 高于自己版本的 .pck;`GODOT_EDITOR` env 必须显式指向 4.5.app
- **所有 RN→Godot API 调用必须在 worklet 里**:`runOnGodotThread(() => { "worklet"; godotBridge.* })`,详见 [conventions §13](doc/cute_pixel_plan/conventions.md#13-worklet-契约)
- **iOS Podfile 必须带 fmt base.h patch**:RN 0.81 + Xcode 26.4 stack 的 `consteval` 编译错误,RN ≥ 0.84 后可删,详见 [conventions §14](doc/cute_pixel_plan/conventions.md#14-godot-env--native-build-patches)
- **业务不直接拼 message**:走 `services/godot/{domain}Commands.ts` helper 调用;改 message 形态必双侧同改 `proto/messages.ts` + `proto/messages.gd`

## Status 标记——写 import 前必须核对

架构文档里凡是写到具体文件路径,都带一个 Status:

- `planned` — 文档描述了,但代码里**还没有**这个文件。**禁止直接 import**,要用得先实现(或先和用户对齐再实现)
- `scaffolded` — 文件已存在,当前没有 `features/` 模块在用。可以接入,但要意识到这是首次接入
- `in-use` — 文件已存在且至少被一个 `features/` 模块在用,接入风险最低

写 `import` 前必须核对 Status。**Status 与代码事实漂移时,以代码为准并就地修订本文档。**

## Spec-driven 流水线(planned)

ADR-006 规定:`cute-pixel-*` skill 套件重写后,业务开发遵循以下流水线,每步由 skill 自动门禁拦截。

```
features 模块:  PRD → TechPack → module-gen → test-gen → review
core 服务:      ADR → TechPack → 手工实装 → review
```

每个 skill 的 Step 0 检查前置:

- PRD 未 Decided → 不开 TechPack(core 模式则查对应 ADR)
- TechPack 未 Decided → 不进 module-gen
- PRD §AC 未 Decided → 不进 test-gen

例外标记 `skip-spec: <原因>`(prototype / spike / 紧急 hotfix)允许越门禁,会被写进生成代码的 binding 注释作为 audit trail,由 `/cute-pixel-review` 收集成技术债清单。

`cute-pixel-*` skill 套件本身**还没**进本仓库。

## 高影响约定速查

完整内容见 [doc/cute_pixel_plan/conventions.md](doc/cute_pixel_plan/conventions.md)。容易忽略的关键点:

- **错误处理(§1)** — `services/network/` 拦截器把 HTTP 异常和 zod parse 失败统一映射成 `Failure`(discriminated union);store 转成 `ViewState<T>`;Page 通过 `<StateView>` 渲染。**业务代码不直接 `try/catch` HTTP 异常**。
- **i18n(§4)** — `useTranslation('petModule')` 按模块 namespace。硬编码字符串是 Biome `error`。`scripts/check-i18n-sync.ts` 在 CI 检查 zh / en key 同步。
- **日志(§5)** — 只用 `services/logging/Logger`,`console.log` 是 Biome `error`。
- **Lint 严格度(§6)** — `noConsole`、`noExplicitAny`、`noUnusedImports`、`noUnusedVariables`、`useExhaustiveDependencies`、`noFloatingPromises` 都是 `error`。`tsconfig`:`strict`、`noUncheckedIndexedAccess`、`exactOptionalPropertyTypes`。`yarn check` 必须 0 issue 才能 commit(husky + lint-staged 强制)。
- **时间(§12)** — 不直接用 `Date.now()` / `new Date()`,统一走 `services/time/GameClock`,测试时注入 fake clock。
- **存档(§12)** — 所有 `persist` 的 store 必须带 `version` + `migrate(state, version)`。MMKV 作后端,敏感 store 用 react-native-keychain 提供的 encryption key。
- **跨模块通信(§11)** — 共享 store > 共享 service > 事件总线。**事件总线不是用来同步状态的**(存事件等于隐式状态,违背单一真理)。
- **Worklet 契约(§13,B1 后追加)** — RN→Godot API 调用必须在 `runOnGodotThread(() => { "worklet"; ... })` 里,违反 = SIGSEGV / 静默失败。
- **Godot env + native patches(§14,B1 后追加)** — `GODOT_EDITOR` 指 4.5.app + Podfile fmt patch + Android NDK 27/28 双装。
- **Bridge 错误(§15,ADR-007 后追加)** — `godotBridge.send/subscribe` fail-soft;无效 message → silent drop + `BRIDGE_ERROR` Event;**底座不自动重启 engine**。
- **Scene 生命周期(§16,ADR-007 后追加)** — 业务**不直接**发 `SCENE_LOAD/UNLOAD`,由 `<PixelView>` mount/unmount 隐式触发。
- **GD 侧分工(§17)** — `.tscn` / `.tres` / `.png` / `.png.import` 是设计师 owned,工程师 / AI **默认只能改 `.gd`** + `project.godot` + `proto/messages.gd` mirror;紧急 hotfix 例外需 `DESIGN-HOTFIX:` commit 标记。AI **不要**替设计师反推 viewport 坐标 / collision shape / 角色位置(从截图推数值容易差几十像素),写进 `godot_project/TODO.md` 让设计师在 Godot Editor 里精确配。需要"临时防御"用运行时读取(`get_viewport().get_visible_rect()` + 比例 ratio)而不是 hardcode 像素。
- **Entity scoping(ADR-007 §4,2026-05-17 后追加)** — 实体级 message 用 `<ENTITY>_<VERB>` 命名(`CHARACTER_SET_VELOCITY`、`NPC_TALK`),payload **不**嵌 `entity_type` 字段;场景级沿用 `SCENE_<VERB>`。避免实体数 × 动作数命名混乱。
- **后端契约** — 响应 `{code, message, data, traceId}`,`code === 0` 为成功;HTTP 错误由 network 拦截器映射成 `Failure` 类型。后端接入前 `{module}Api.ts` 返 mock,接入时只改这一个文件。

## ADR 索引

| ADR | 主题 | Status |
|---|---|---|
| [001](doc/cute_pixel_plan/decisions/ADR-001-react-native-as-app-framework.md) | RN 作为应用框架 | Accepted(2026-05-11 修订) |
| [002](doc/cute_pixel_plan/decisions/ADR-002-godot-as-pixel-engine-via-react-native-godot.md) | Godot 通过 react-native-godot 嵌入 + 生命周期 + Portal | Accepted(2026-05-11 修订) |
| [003](doc/cute_pixel_plan/decisions/ADR-003-state-management-zustand.md) | 状态管理选 Zustand | Accepted |
| [004](doc/cute_pixel_plan/decisions/ADR-004-rn-bare-workflow.md) | RN Bare + Expo modules + 工具链 | Accepted(2026-05-11 修订) |
| [005](doc/cute_pixel_plan/decisions/ADR-005-godot-as-asset-editor.md) | Godot 编辑器作为 asset 编排工具 | Accepted |
| [006](doc/cute_pixel_plan/decisions/ADR-006-spec-driven-with-strong-gates.md) | Spec-driven 流水线与强门禁 | Accepted |
| [007](doc/cute_pixel_plan/decisions/ADR-007-rn-godot-communication-contract.md) | RN ↔ Godot 通信契约 v0.1(message bus + 状态权属 + proto/) | Accepted(2026-05-15;2026-05-17 amended §4 entity scoping) |

ADR 编号从 001 起,不 supersede 任何外部 ADR。

## 关键参考文档

- [doc/cute_pixel_plan/_B1_REPORT.md](doc/cute_pixel_plan/_B1_REPORT.md) — B1 集成验证报告,所有 2026-05-11 修订的依据;改 ADR / conventions 前先看
- [doc/console-spec/](doc/console-spec/) — 远程控制台需求 + 对外部 console 项目方([471402921/consle](https://github.com/471402921/consle))handoff 的 5 实装期决定;协议契约 / 联调状态 / room_id 等
- [godot_project/TODO.md](godot_project/TODO.md) — 给设计师的素材层 polish 清单(wall.tres physics / 4 家具 collision 等),conventions §17 边界
- [react-native-godot README](https://github.com/borndotcom/react-native-godot) — 上游集成参考(stable stack 来源)

## 文档写作纪律

编辑 [doc/cute_pixel_plan/](doc/cute_pixel_plan/) 下的文件时:

- 只讲底座**是什么、怎么用、为什么这样设计**,不写历史叙事,不引用旧技术栈
- 底座 doc 与业务 doc 严格分离——IoT 项圈、LBS 地图、传感器融合等**只属于具体 app**,不进底座
- 业务能力可作为"底座选型时的扩展面考虑",但不构成底座功能义务

## 构建 / Lint / 测试命令

工程骨架已就绪(B2 part 1 完成),可用命令(详见 `package.json` scripts):

- `yarn check` — `biome check . && tsc --noEmit`,commit 前必须 0 error(已清掉 upstream 遗留的 7 个 typecheck error + 7 个 Biome warning,详见 commit 0fec3e5;`@borndotcom/react-native-godot` 的最小 .d.ts 在 `app/types/`)
- `yarn lint` — `biome check .`(只 lint,不 typecheck)
- `yarn lint:fix` — `biome check --write .`(自动 fix 能 fix 的)
- `yarn format` — `biome format --write .`
- `yarn test` — Jest(`--passWithNoTests`,目前无测试;真测试随第一个 demo 模块用 RNTL/Detox 时一起加)
- `yarn ios` / `yarn android` — 跑 iOS Sim / Android emulator/真机
- `yarn start` — Metro bundler

Detox e2e 还没接(planned)。Husky + lint-staged commit gate 还没接(planned)。
