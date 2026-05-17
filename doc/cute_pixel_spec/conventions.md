# Conventions

若干条编码标准 + 协作 SOP + 双侧(RN/GD)规范。

**SPEC 原则**:**只定原则与契约,不卡死实现**——具体实现技术随业务可变,边界与协议不变。如发现某条把实现细节卡得过死(具体类名 / 文件命名 / 实装数值),倾向于放宽为"原则"+ 把细节留给 ADR / 真实装时决定。

**分块**:§1-7 P0(底线),§8-12 P1(约定),§13-16 P0 集成补充(B1 / B2 后追加),§17-18 协作 SOP,§19-23 GD 侧规范。

---

## P0(底线,违反就是 PR 不该过)

### 1. 错误处理流水线

错误的层级与流向:

```
HTTP 异常 / zod parse 失败  →  services/network 拦截器  →  Failure(sealed)
                                                              │
                                                              │ throw
                                                              ▼
                            features/{module}/api  →  features/{module}/store
                                                              │
                                                              │ ViewState<T>.error 分支
                                                              ▼
                                  features/{module}/Page  →  <StateView>
```

**约定**:

- `services/error/failures.ts` 用 TS discriminated union 定义所有 Failure 类型(`type: 'NetworkFailure' | 'ServerFailure' | ...`)
- API 层**不直接抛 HTTP 异常**,`services/network/` 拦截器统一映射为 Failure
- Store 接收 Failure → 转换为 `ViewState<T>` 中的 error 分支
- Screen 通过 `<StateView>` 组件统一展示 loading / error / empty / data
- 业务代码不直接 `try/catch` HTTP 异常,只 catch Failure 进行业务分支

### 2. 环境配置

- `services/env/` 提供 `Env` 接口,业务代码通过 `Env.get('API_BASE_URL')` 访问
- 实现:`react-native-config` + `.env.dev` / `.env.staging` / `.env.prod`
- 敏感配置(API key 等)**不入 git**,`.env.*` 在 `.gitignore`,提供 `.env.example` 占位
- 启动时验证 env 完整性,缺失 throw `InvalidEnvFailure`,App 显式失败而不是后续报奇怪错

### 3. 认证与 token 生命周期

**原则**:

- auth 作为 service 提供(放 `services/auth/`),业务模块通过 service 接口访问,**不直接读 / 持有 token**
- token 必须加密存储(后端 MMKV + 密钥来源 keychain)
- 401 触发 token 清理 + 跳登录页(通过 navigation ref 跨 React Tree)
- refresh 由 service 内部处理,并发请求共享同一 refresh promise,业务无感

具体实装(单例形态 / refresh 提前时长 / API 名)在 auth service 真上线时单独 ADR 决定;Phase B planned。

### 4. i18n(zh / en 双语同步)

- `i18next` + `react-i18next`
- 资源文件:`app/i18n/zh.json` / `app/i18n/en.json`,**按模块 namespace 分组**:`{ "petModule": { "feed": "..." }, "settings": { ... } }`
- 模块内使用:`const { t } = useTranslation('petModule')`,然后 `t('feed')`
- CI 检查:自定义脚本 `scripts/check-i18n-sync.ts` 比对 zh / en key 同步,缺失报错(运行在 PR check)
- **不允许硬编码字符串**(Biome 启用 `noHardcodedString` 规则,例外通过 inline comment 标记)

### 5. 日志门面

- `services/logging/Logger` 接口:`debug` / `info` / `warn` / `error`
- dev:console
- prod:Sentry + 自定义后端 log endpoint(可选)
- **业务代码不直接用 `console.log`**,Biome 配置 `noConsole: error`(error 级,不是 warn)

### 6. Lint 严格度

`biome.json` 配置:

- `noConsole: error`
- `noExplicitAny: error`
- `noUnusedImports: error`
- `noUnusedVariables: error`
- `useExhaustiveDependencies: error`(React hooks deps)
- `noFloatingPromises: error`

`tsconfig.json`:`strict: true`,`noUncheckedIndexedAccess: true`,`exactOptionalPropertyTypes: true`

改完代码先跑 `pnpm check`(typecheck + lint),0 issue 才能 commit。pre-commit hook 由 husky + lint-staged 强制。

### 7. 测试金字塔

四层结构:

| 层 | 工具 | 跑什么 | 跑频次 |
|---|---|---|---|
| **unit** | Jest | 纯函数 / Failure 映射 / utils | 每次 commit |
| **store** | Jest + zustand vanilla API | Zustand store action → state 完整流程 | 每次 commit |
| **component** | React Native Testing Library | 单个 Screen / 组件渲染 + 交互 | 每次 commit |
| **e2e** | Detox | 端到端用户流程(Android emulator + iOS simulator) | PR 必跑(冒烟)+ 主线 nightly(全量) |

**约定**:

- **PRD AC 必须有对应测试覆盖**,PR 模板要求填测试覆盖矩阵(每个 AC → 哪个测试文件 / 哪个 case)
- store 单测覆盖率门槛:`pnpm test --coverage` ≥ 80%(关键 store 100%)
- 不为覆盖率写无意义测试(Biome / review skill 会标记)

---

## P1(约定,跨模块协作必须遵守)

### 8. 路由与导航

- `React Navigation v7`
- 路由名常量定义在 `app/navigation/routes.ts`(`Routes.PetDetail = 'PetDetail'`)
- 路由参数**强类型**:每个 stack 用 `ParamList` type 约束,`useNavigation<NativeStackNavigationProp<RootStackParamList>>()`
- 路由参数类型放 `app/shared/route-args/{module}RouteArgs.ts`(避免 features 互引)
- 深度链接:`app/navigation/linking.ts` 配置,统一处理 deeplinks
- 结构:bottom tab + 每个 tab 内 native stack

### 9. 状态管理(Zustand)

- store 命名 `use{Module}Store`,文件 `{module}Store.ts`
- 中间件标配:`subscribeWithSelector` + `persist`(挂 MMKV)+ `devtools`(dev only)
- 跨模块共享 store 放 `app/shared/state/`,业务 store 放 `app/features/{module}/`
- selector 精细订阅:`useXxxStore((s) => s.specificField)`,避免拿整个 state 触发不必要重渲染
- store action 命名:动词开头(`feed` / `select` / `move`),不加 `set` 前缀(set 只在内部 setState 用)
- 详细决策见 [ADR-003](decisions/ADR-003-state-management-zustand.md)

### 10. JSON 与数据契约

- **zod schema 定义所有外部数据契约**(后端响应、deeplink params、第三方 SDK 回调等)
- API 响应 parse:在 `{module}Api.ts` 调用 `schema.parse()`,失败 throw `ValidationFailure`
- runtime 验证 + TS 类型推导(`type Pet = z.infer<typeof PetSchema>`)
- **模块内部数据**可用 TS interface,无需 zod
- zod schema 定义在 `{module}Models.ts`(对外契约的真理)

### 11. 跨模块通信

不能 import 别的 features/(铁律 #1)。三种方式:

- **(优先)共享 store**(放 `app/shared/state/`):适合多模块共享业务状态(用户、设置、游戏时钟等)
- **(次选)全局 service**(放 `app/services/`):适合无状态能力(网络 / 存储 / 日志)
- **(最后)事件总线**(`eventemitter3`,放 `app/services/eventBus.ts`):适合一次性通知(如"宠物喂食完成"),**不适合状态同步**

不要用事件总线做"伪状态共享"(存事件等于隐式状态,违背单一真理)。

### 12. 时间与存档

- **GameClock 服务化**:`services/time/GameClock` 提供 `now()` / `now$()`(响应式),业务代码**不直接用** `Date.now` / `new Date()`
- 测试时可注入 fake clock(单元测试 / e2e 都需要)
- **存档版本号**:每个 store 的 `persist` 配置带 `version` + `migrate(persistedState, version)`
- MMKV 作为存储后端(`react-native-mmkv` + zustand persist adapter)
- 存档失败兜底:记日志 + 使用 store 默认值,不阻塞用户(避免"加载失败"白屏)

---

## P0(集成补充,B1 验证后追加)

### 13. Worklet 契约

**所有 RN → Godot API 调用必须在 worklet 里**——`react-native-worklets-core` 提供的 `runOnGodotThread(() => { "worklet"; ... })`。

```typescript
import { runOnGodotThread } from 'react-native-worklets-core';
import { godotBridge } from '@/services/godot/godotBridge';

// ✅ 正确(本例直接调 bridge.send 演示 worklet 形态;实际业务应通过 services/godot/{domain}Commands.ts helper)
function feedPet(petId: string, foodType: string) {
  runOnGodotThread(() => {
    "worklet";  // ← 必须的 directive
    godotBridge.send({ type: "PET_FEED", payload: { petId, food: foodType } });
  });
}

// ❌ 错误:直接在 React 渲染期 / setState 回调 / 主 JS 线程调
const PetPage = () => {
  const pet = usePetStore((s) => s.pet);
  godotBridge.send({ type: "PET_FEED", payload: { petId: pet.id, food: "fish" } });  // 报错或行为不可预测
  return <PixelView scene="pet_world" />;
};
```

**Why**:`react-native-worklets-core` 把函数序列化到 Godot 线程上执行。直接在主 JS 线程调 `godotBridge.*` / `RTNGodot.*` 会落到"background 线程"概念,无法完整访问 Scene Tree;且对象引用不能跨 JS 上下文传递,会引发悄无声息的 bug 或崩溃(详见 [react-native-godot README §Threading](https://github.com/borndotcom/react-native-godot#threading-and-javascript-in-react-native) + [_B1_REPORT.md §7b](_B1_REPORT.md))。

**Lint 强制(planned)**:工程骨架预设 custom Biome / eslint plugin,识别非 worklet 上下文调 `godotBridge.*` / `RTNGodot.*` → error。在 plugin 落地前由 review skill 人工检查。

### 14. Godot env + Native Build Patches

#### 14a. `GODOT_EDITOR` env 必须指向 4.5.x

```bash
# ~/.zshrc 或 .envrc
export GODOT_EDITOR=/Applications/Godot-4.5.app/Contents/MacOS/Godot
```

不能用工程脚本默认的 `/Applications/Godot.app`(那个可能是 4.6+,导出后 LibGodot 4.5.1 runtime 在 `try_open_pack()` 硬性 abort)。详见 [ADR-002 §版本钉死](decisions/ADR-002-godot-as-pixel-engine-via-react-native-godot.md#版本钉死b1-验证后定的硬约束)。

工程脚本(`scripts/export_godot_*.sh`)启动时 sanity check:

```sh
"$GODOT_EDITOR" --version 2>&1 | grep -q '^4\.5\.' || {
  echo "ERROR: GODOT_EDITOR must point to a Godot 4.5.x install" >&2
  exit 1
}
```

#### 14b. iOS Podfile 必须带 fmt base.h patch

RN 0.81 + Xcode 26.4 stack 下 `Pods/fmt/include/fmt/base.h` 的 `__apple_build_version__` 守卫拒绝 Apple Clang 21,xcodebuild 会挂在 `consteval` constant expression 错误。**`xcconfig` 走 `FMT_USE_CONSTEVAL=0` 无效**(fmt 内部 if/elif 链不 guard 外部 define),必须改源码。

`ios/Podfile` 的 `post_install` 钩子:

```ruby
post_install do |installer|
  react_native_post_install(installer, ...)

  # TODO: remove when RN ≥ 0.84(fmt 升 12.1 后修复)
  base_h = File.join(installer.sandbox.root, 'fmt', 'include', 'fmt', 'base.h')
  if File.exist?(base_h)
    contents = File.read(base_h)
    patched = contents.sub(
      '#elif defined(__apple_build_version__) && __apple_build_version__ < 14000029L',
      '#elif defined(__apple_build_version__)'
    )
    unless contents == patched
      File.chmod(0o644, base_h)   # podspec 默认 0444
      File.write(base_h, patched)
    end
  end
end
```

详见 [_B1_REPORT.md §3b](_B1_REPORT.md) + [facebook/react-native#55601](https://github.com/facebook/react-native/issues/55601)。

#### 14c. Android NDK + 镜像准备

- AVD **必须** arm64-v8a(react-native-godot LibGodot Android binding 只发 arm64)
- 首次 build 自动装 NDK 27.0.12077973 + 28.1.13356709,共 ~3GB,留够磁盘
- 国内开发机:`gradle.properties` / `~/.gradle/init.d/` 提前配阿里云 maven 镜像,避免 dl.google.com TLS 抖动时 build 整体崩(详见 [_B1_REPORT.md §4](_B1_REPORT.md))

#### 14d. iOS Ruby + Bundler

- macOS 系统 Ruby 2.6.10 + `gem install --user-install bundler -v 2.4.1` 即可(不需 rbenv/asdf)
- 项目内 `bundle config set --local path 'vendor/bundle'` 把 cocoapods 装到项目目录,不污染系统(详见 [_B1_REPORT.md §3a](_B1_REPORT.md))

### 15. Bridge 错误恢复(fail-soft)

通过 `services/godot/godotBridge` 的 `send` / `subscribe` **不抛异常**,默认 fail-soft:

- **RN → GD**:无效 message(zod 校验失败 / GD 端无 handler)→ GD silent drop + emit `{type: "BRIDGE_ERROR", payload: {...}}` 回 RN;RN handler 收到 log,**不**自动重试,**不**panic
- **GD → RN**:RN handler 抛错 → `godotBridge` 内部 `try/catch` + `Logger.error` 记录,不影响其他订阅者
- **GD 进程死掉**:`GodotProvider` 暴露 `engineStatus`("running / paused / failed"),失败由业务模块通过 `<StateView engineFailure={...}>` 兜底展示;**底座不自动重启 engine**(避免无限崩溃环)

具体 `BRIDGE_ERROR` payload 形态在第一个 demo 落地时定型。详见 [ADR-007 Deferred](decisions/ADR-007-rn-godot-communication-contract.md#deferred留待第一个-demo-模块暴露需求后单独-adr)。

### 16. Scene 生命周期(by `<PixelView>`)

业务模块**不直接**发 `SCENE_LOAD` / `SCENE_UNLOAD` Command。Scene 的 load/unload 触发由 `<PixelView>` 隐式管理:

- `<PixelView scene="x" />` mount → 进入视口 → `GodotProvider` 自动发 `SCENE_LOAD`
- `<PixelView>` unmount → 离开视口 → `GodotProvider` 自动发 `SCENE_UNLOAD`(或 `SCENE_PAUSE`,具体策略由 Provider 内部决定)
- 业务模块只决定"我现在要不要显示像素世界",通过 mount/unmount `<PixelView>` 表达

例外:scene 内部状态 reset(非 load/unload)由模块发自己的 domain Command(`PET_RESET` 等),不是 scene-level 的事。详见 [pixel-foundation §加载契约](pixel-foundation.md#加载契约scene-swap非-engine-restart)。

---

## 协作 SOP

### 17. GD 侧分工:设计师拥有场景,工程师拥有脚本

`godot_project/` 内部按文件类型严格分工——**工程师默认只能改 `.gd`,不能改设计师的场景与资源**:

| 文件类型 | 拥有者 | 工程师能改? |
|---|---|---|
| `*.tscn`(场景结构 + 节点位置 + 物理 shape + 资源引用) | **设计师** | ❌ |
| `*.tres`(共享资源,如 TileSet) | **设计师** | ❌ |
| `*.png` + `*.import`(精灵 + Godot 自动导入元) | **设计师** | ❌ |
| `*.gd`(行为脚本,如 `character.gd` / `MessageBridge.gd`) | **工程师** | ✅ 设计师可看可建议 |
| `project.godot`(autoload / main_scene / config/name) | **工程师** | ✅ |
| `proto/messages.gd` mirror | **工程师** | ✅(从仓库根 `/proto/messages.gd` 镜像同步,本身视为生成产物) |

**为什么**:

- 设计师在 Godot Editor 里**可视化拖控件**,精度远超工程师从代码 / 截图反推坐标(`cute_pet` 分支首个 demo 验证过——AI 用屏幕截图反推 viewport 边界与碰撞 shape 位置,常偏 30-50 像素 → 角色穿模 / 卡墙 / 出框)
- 场景的"为什么这么摆"包含设计意图(美术留白、运动路径、视线引导、y_sort 排序期望),工程师看 `.tscn` 文本看不出来
- 物理 shape 是设计意图的一部分(脚印高低决定"角色能否站在家具底座"、collision layer 决定"哪些层互撞"、`y_sort_enabled` 决定"哪个 sprite 渲染顺序在前")

**例外(紧急 hotfix)**:工程师**仅在**以下两种情况能改 `.tscn`:

1. 文件结构 / 加载报错(scene 加载失败、merge 冲突、SubResource 顺序破坏)
2. 上线阻塞(线上崩溃,设计师不在场)

且 commit msg 必须注明:`DESIGN-HOTFIX: <原因>, design-owner: @xxx, pending review`。后续设计师 review 决定 keep 或 revert。

**碰撞 / 视觉问题的修法纪律**:

- 角色穿模 / 出框 / 卡墙 / 渲染层级错 → **不是改 .tscn 加 WorldBoundary / 调 z_index / 移 position**,而是写进 `godot_project/TODO.md` 给设计师跟进
- 工程师只在底座层提供 hook(例如 character.gd 暴露 `set_position()` / `set_z_index()` 方法供设计师 / RN 调),不替设计师定值

### 18. 设计师 ↔ 工程师 协作

跟 §17 配套——§17 划清"谁拥有什么文件",§18 规定"动这些文件时双方怎么交接"。

#### 18.1 GD 端 .gd 内部分层(改 .gd 时的影响面意识)

| 层 | 例子 | 改动影响面 |
|---|---|---|
| **机制层**(framework) | `MessageBridge.gd` autoload / engine lifecycle hook / `_physics_process` tick 框架 | 改动近似改 ADR,影响所有依赖它的业务 .gd,慎重 + sync 双方 |
| **业务层**(gameplay) | `character.gd._pick_new_action` 自主行为 / interact 行为 / 升级条件 | 改动只影响特定模块,可迭代 |

#### 18.2 接触面契约

GD 端的几样东西是"设计师 .tscn 配置 ↔ 工程师 .gd 代码"的接触面,双方都要尊重:

- **`@export` 变量** = 双方契约。改默认值 / 类型 / 重命名 → 必须事先 sync(设计师 Inspector 里调过的值会丢)
- **`@onready var X = $Path`** = 工程师对 .tscn 节点结构的隐性依赖。设计师改节点结构 / 重命名 → 必须本地跑确认 `@onready` 不断
- **`signal`** = 双方都可 emit / connect,新增 / 重命名要约定谁拍板
- 每个 .gd 顶部建议固定注释列出"依赖 .tscn 的节点路径 / signal 名 / 给设计师 Inspector 用的 @export 变量",改这些时双方 sync

#### 18.3 破坏性改动谁拍板

- 工程师跨界改 .tscn 仅限 §17 列出的 hotfix 例外(加载报错 / 上线阻塞),commit msg 必须 `DESIGN-HOTFIX:` 标记
- 工程师改 .gd 涉及破坏性接触面变更(@export 重命名 / signal 重命名 / @onready 节点路径假设变),提议方先写到 `godot_project/TODO.md` 让对方 ack + 验收,不偷偷改
- 设计师改 .tscn 涉及节点重组 / 节点名改 / signal 加减,事先 sync 工程师跑一遍 `.gd` 看 `@onready` 不断

#### 18.4 git 协作(避免 .tscn / .gd 同时改的合并冲突)

- `.tscn` 是 Godot Editor 序列化的文本,行级 diff 可 merge,但跨段重排 / sub_resource 顺序变更 / id 改容易冲突
- 工程师改 .gd 前 `git pull` 确认 .tscn 没在被设计师同时改;如果设计师正在场景重组,等设计师 commit 后再开始
- 设计师重大场景重组(节点改 ID / 跨 scene 重构)前告诉工程师,避免代码引用断

---

## GD 侧规范

> 跟 RN 侧 §1-12 类似的抽象级别。设计师 owns GD 全部,这一段是设计师约束清单(对标 RN 侧给工程师的约束)。

### 19. GD 模块结构

跟 RN 侧 Module-First Flat 呼应,GD 端按"角色 / 场景 / 共享资源"平铺组织:

```
godot_project/
├── characters/{character}/    # 单个角色(scene + script + 资源同目录)
│   ├── {character}.tscn       # 角色场景(节点结构 + 默认配置)
│   ├── {character}.gd         # 角色脚本(autonomous / external / interact 行为)
│   └── {character}.png + .import   # 精灵
├── scenes/{scene}/            # 单个场景(室内 / 室外 / 战斗 等)
│   ├── {scene}.tscn
│   └── 场景专属资源
├── furnitures/                # 家具 / 物品(scene + 资源)
├── resources/                 # 共享 PNG / .tres(墙、地板、tileset 等)
├── bridge/                    # MessageBridge 等机制层
├── proto/                     # AUTO-MIRRORED schema(改协议先改根 /proto/)
└── project.godot              # 工程配置(autoload / main_scene / config/name)
```

**约定**:

- **不跨模块文件引用** — `characters/A/A.gd` 不直接 `preload("res://characters/B/B.tscn")`;跨实体通信走 `bridge/` 或 group + signal(详见 §21)
- **共享资源放 `resources/`** — 跨多个 scene / character 用到的 PNG / TileSet / .tres
- **新角色 / 新 scene 必须按本结构开目录**,不要散在 root

### 20. Autoload 慎用

`project.godot` 的 autoload 节点全局可达(`get_tree().root.get_node("X")` 或裸 `X.method()`),好用但是滥用 = GD 端的"全局变量":

**约定**:

- autoload 仅限**机制层**(`MessageBridge` 等基础设施),不放业务实体
- 新增 autoload **必须先评估**:能用 `add_to_group` + `get_first_node_in_group` 解决吗?能用 signal connect 解决吗?都不行才加 autoload
- autoload 命名用 PascalCase(`MessageBridge` / `GameClock`),跟节点习惯一致;**别用动词或形容词**(`InitLoader` / `GlobalState` 太宽)

### 21. GD 端模块通信:group + signal,不裸引用

跟 RN 侧"模块不互引"铁律呼应,GD 端跨实体 / 跨 scene 通信:

| 场景 | 推荐方式 |
|---|---|
| Bridge dispatch 找特定实体 | `add_to_group(name)` + `get_tree().get_first_node_in_group(name)` — 不 hardcode 节点路径 |
| 实体内部状态变化通知 | 定义 `signal`,connect 在 `_ready`;**不**直接调用其他节点方法 |
| 跨 scene 持久状态 | 走 RN 侧 store(详见 ADR-007 状态权属),**不**在 GD 端搞全局 state |
| 业务级实体协作 | 业务层 signal + RN 侧调度;**不**直接 entity-to-entity |

**禁止**:

- `get_node("/root/SceneName/Path/To/Other")` 之类绝对路径,场景重组立刻断
- 单例 / autoload 直接修改其他实体内部状态 — 状态权属乱

### 22. Inspector @export 命名 + 类型

`@export` 变量是设计师 Inspector 调节 / 工程师代码读取的**接触面**(详见 §18.2):

**约定**:

- 命名用 snake_case(GDScript 习惯),不要 camelCase
- **必有显式类型 + 默认值**(`@export var speed: float = 100.0`);别用裸 `@export var foo`
- 类型选**强类型**(`float` / `int` / `String` / `Vector2` / `bool` / 自定义 `enum`),避免 `Variant`
- 默认值给**合理工作值**(让设计师 Inspector 第一次打开就能跑,不要 0 / null / 空串触发崩溃)
- 给设计师调的 @export 变量加 `## ` 注释行说明语义 + 单位(`## 移动速度(px/sec)`),Godot Editor 会显示
- **不要**用 @export 暴露内部状态(`_action_timer` 之类),Inspector 调它会乱状态机

### 23. GD 端 print / log 标准

对标 RN 侧 §5 日志门面,GD 端约定:

- print 必须带模块 tag:`print("[character] external control enabled")`,不要裸 `print("foo")`
- error 级别用 `push_error()`(走 Godot 错误输出),warning 用 `push_warning()`
- 永远**不**在 `_physics_process` / `_process` 这种高频回调里 `print`(60Hz 会刷屏);要诊断频繁事件用节流(如 `_state_tick % 60 == 0`)
- 业务事件需要回流给 RN 端的,走 `MessageBridge.emit_event()` 发 Event,**不**用 print 当通信手段
- 长期 planned:跟 RN 侧 Logger 双侧对齐(GD 端封个 `framework/logging/Logger.gd` 提供 `info/warn/error` API),现阶段先靠纪律
