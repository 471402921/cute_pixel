# Conventions

14 条编码标准。§1-7 是 P0(底线),§8-12 是 P1(约定),§13-14 是 P0 集成补充(B1 验证后追加)。

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

- `services/auth/AuthService` 单例:`login` / `logout` / `getToken` / `refreshToken` / `clear`
- token 注入:`services/network/` 请求拦截器读 `AuthService.getToken()`
- 401 自动:`AuthService.clear()` + 跳登录页(通过 navigation ref 跨 React Tree 调用)
- refresh token:token 过期 30 秒前触发 silent refresh;并发请求共享 refresh promise(避免多次 refresh)
- token 存储:`react-native-mmkv` 加密存储(encryption key 来源 `react-native-keychain`)

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

### 17. GD 侧分工:设计师拥有场景,工程师拥有脚本

`godot_project/` 内部按文件类型严格分工——**工程师 / AI 默认只能改 `.gd`,不能改设计师的场景与资源**:

| 文件类型 | 拥有者 | 工程师能改? |
|---|---|---|
| `*.tscn`(场景结构 + 节点位置 + 物理 shape + 资源引用) | **设计师** | ❌ |
| `*.tres`(共享资源,如 TileSet) | **设计师** | ❌ |
| `*.png` + `*.import`(精灵 + Godot 自动导入元) | **设计师** | ❌ |
| `*.gd`(行为脚本,如 `character.gd` / `MessageBridge.gd`) | **工程师** | ✅ 设计师可看可建议 |
| `project.godot`(autoload / main_scene / config/name) | **工程师** | ✅ |
| `proto/messages.gd` mirror | **工程师** | ✅(从仓库根 `/proto/messages.gd` 镜像同步,本身视为生成产物) |

**为什么**:

- 设计师在 Godot Editor 里**可视化拖控件**,精度远超工程师 / AI 从代码 / 截图反推坐标(`cute_pet` 分支首个 demo 验证过——AI 用屏幕截图反推 viewport 边界与碰撞 shape 位置,常偏 30-50 像素 → 角色穿模 / 卡墙 / 出框)
- 场景的"为什么这么摆"包含设计意图(美术留白、运动路径、视线引导、y_sort 排序期望),工程师看 `.tscn` 文本看不出来
- 物理 shape 是设计意图的一部分(脚印高低决定"角色能否站在家具底座"、collision layer 决定"哪些层互撞"、`y_sort_enabled` 决定"哪个 sprite 渲染顺序在前")

**例外(紧急 hotfix)**:工程师**仅在**以下两种情况能改 `.tscn`:

1. 文件结构 / 加载报错(scene 加载失败、merge 冲突、SubResource 顺序破坏)
2. 上线阻塞(线上崩溃,设计师不在场)

且 commit msg 必须注明:`DESIGN-HOTFIX: <原因>, design-owner: @xxx, pending review`。后续设计师 review 决定 keep 或 revert。`/cute-pixel-review` skill(planned)在 PR review 时检查"非 hotfix 的 .tscn / .tres / .png 改动"必须有设计师 sign-off,否则拒。

**碰撞 / 视觉问题的修法纪律**(对应今天 cute_pet 分支踩的坑):

- 角色穿模 / 出框 / 卡墙 / 渲染层级错 → **不是改 .tscn 加 WorldBoundary / 调 z_index / 移 position**,而是写进 `godot_project/TODO.md` 给设计师跟进
- 工程师只在底座层提供 hook(例如 character.gd 暴露 `set_position()` / `set_z_index()` 方法供设计师 / RN 调),不替设计师定值

