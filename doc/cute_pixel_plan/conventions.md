# Conventions

12 条编码标准。前 7 条是 P0(底线),后 5 条是 P1(约定)。

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
