# B1 报告:react-native-godot example 集成验证结果

> 这份是 B1 验证完成后回 cute_pixel 会话的报告。涵盖 handoff 文档要求的 4 项 + 这次新发现的几个真实代价。读完这份就够,不用回看 example 的执行细节。

---

## 1. 7 个步骤结论

| Step | 内容 | 结果 | 备注 |
|---|---|---|---|
| 1 | Godot 导出 .pck × 4 | ✅ | **决策推翻**:见 §2 |
| 2 | yarn install + yarn download-prebuilt | ✅ | 1m42s 装 1056 包,LibGodot 二进制顺利从 GitHub Releases 拉到,**没复现 ghcr.io DNS 抖动** |
| 3 | bundle install + pod install | ⚠️ → ✅ | 系统 Ruby 2.6.10 + Xcode 26 两个坑,见 §3 |
| 4 | yarn ios | ✅ | iPhone 17 Pro Sim,iOS 26.4 |
| 5 | yarn android (Emulator) | ⚠️ → ✅ | Medium_Phone AVD,Gradle 首次 11min,网络抖一次,见 §4 |
| 6 | yarn android (真机) | ✅ | realme RMX3888 / Android 16 / arm64-v8a,缓存命中后 37s |
| 7 | RN ↔ Godot 双向 signal | ✅ × 3 平台 | iOS Sim / Android Emulator / Android 真机行为一致 |

---

## 2. **决策 #2 必须推翻** — Godot 4.6 编辑器 + LibGodot 4.5.1 runtime 不可行

handoff 里写"接受 forward-compat 风险,让设计师跟 4.5 时代教程学习"。验证结果:**不是 risk,是 hard refusal**。

### 现象
4.6.2 编辑器导出 .pck 完全干净 (`grep -iE "warn|error|fail"` 4 次导出全部零命中),但 .pck 装到 LibGodot 4.5.1 runtime 的瞬间被强行拒绝:

```
ERROR: core/io/file_access_pack.cpp:267:try_open_pack():
  Pack created with a newer version of the engine: 4.6.2.
  Condition "ver_major > 4 || (ver_major == 4 && ver_minor > 5)" is true.
  Returning: false
ERROR: Cannot open resource pack 'GodotTest.pck'. ERR_CANT_OPEN
(GodotTest.debug.dylib) Unable to start Godot
```

Godot pack 文件头会写引擎版本号,runtime 在 `try_open_pack()` 里硬性比对 `ver_major > 4 || ver_minor > 5`,大于自己版本 abort。**编辑器导出端不查 runtime 版本** — 所以 Step 1 完全干净是骗局,真实失败要等 runtime 加载时才暴露。

### "DIY 升级 LibGodot 到 4.6" 评估过,不划算
- Migeran fork 最新版就是 `4.5.1.migeran.2` (2025-11-04),无 4.6 release
- 上游 PR #110863 是 "Part 1 of refactoring",还要更多 PR 才能进 4.6.x point release
- 自己 rebase Migeran 的 library 化 patch 到上游 4.6 → 重 build xcframework + aar + godot-cpp + 跟 borndotcom bridge ABI 对齐 → 你成为这套二进制的维护者,Godot 每出 minor 都得跑一遍 → ~1-2 周搭出第一版 + 持续 CI 维护

### 已采取的修正
装 Godot 4.5.1 (`/Applications/Godot-4.5.app`,跟 4.6 共存),`GODOT_EDITOR=/Applications/Godot-4.5.app/Contents/MacOS/Godot ./export_godot_*.sh` 重新导出。换版本之后 cube/Godot scene 立即正常加载。

### 给 cute_pixel ADR 的 action items
- **ADR-002 改写**:Godot 编辑器钉死 **4.5.x**,设计师用 4.5 教程,等 Migeran 出 4.6 / 上游 libgodot 全套合并到 4.6.x point release 才考虑升 (需要重新评估)
- **CONVENTIONS.md 加约束**:`GODOT_EDITOR` env 必须显式指向 4.5.app,不要让脚本默认走 4.6 (`/Applications/Godot.app`)
- **README "Required tools" 章节**:Godot 4.5.1 是 hard requirement,不是"recommended"

---

## 3. iOS 链路有两个未预料的坑

### 3a. 系统 Ruby 2.6.10 缺 bundler 2.4.1 (handoff 已提示,fallback 走通)
按 handoff fallback `gem install --user-install bundler -v 2.4.1`,然后 `bundle config set --local path 'vendor/bundle'` 把 cocoapods 装到 example/vendor/bundle/ 不污染系统 — OK。

**不需要装 rbenv/Ruby 3.x,系统 2.6.10 + user-install bundler 2.4.1 就够 RN 0.81 + cocoapods 1.15.2。**

### 3b. ⚠️ **Xcode 26.4 + RN 0.81 stack 必须 patch fmt 库** (handoff 里没写)
Pod install 一切顺利,xcodebuild 直接挂在 `Pods/fmt/include/fmt/format-inl.h:59`:

```
error: call to consteval function 'fmt::basic_format_string<...>::basic_format_string<FMT_COMPILE_STRING, 0>' is not a constant expression
```

这是 RN 社区已知问题 ([facebook/react-native#55601](https://github.com/facebook/react-native/issues/55601)):Xcode 26.4 的 Apple Clang 21 对 `consteval` 严格判定,fmt 11.0.2 (RN 0.81 自带) 的 `FMT_STRING` macro 被拒。**RN 0.84+ 才升 fmt 到 12.1 修复**。

**workaround 直接进 Podfile post_install**(已在 example 里 patch 过):

```ruby
# Podfile post_install do |installer|
#   ... react_native_post_install(...) ...
  base_h = File.join(installer.sandbox.root, 'fmt', 'include', 'fmt', 'base.h')
  if File.exist?(base_h)
    contents = File.read(base_h)
    patched = contents.sub(
      '#elif defined(__apple_build_version__) && __apple_build_version__ < 14000029L',
      '#elif defined(__apple_build_version__)'
    )
    unless contents == patched
      File.chmod(0o644, base_h)   # podspec 里默认 0444
      File.write(base_h, patched)
    end
  end
# end
```

**给 cute_pixel ADR / CONVENTIONS 的 action items**:
- 这个 fmt patch 必须**复制到 cute_pixel 工程骨架的 ios/Podfile** — 一旦 cute_pixel 也用 RN 0.81 + Xcode 26.4 stack 就会触发同一个崩溃
- 加一行 `# TODO: remove when RN ≥ 0.84` 注释,等升 RN 就能删
- (关联):走 xcconfig `GCC_PREPROCESSOR_DEFINITIONS += FMT_USE_CONSTEVAL=0` 试过,**无效**,因为 fmt 的 if/elif 链不 guard 外部 define,会被覆盖 — 必须改源码

---

## 4. Android 链路的真实代价

| 项 | 实际 |
|---|---|
| Gradle 下载 | 8.13,~58s,首次必须 |
| **NDK 28.1.13356709** | 主 app 需要,Side-by-side 装 ~1-2 GB,慢 |
| **NDK 27.0.12077973** | `react-native-worklets-core` 需要,**额外**再装一份 ~1-2 GB |
| AGP / android-gradle 依赖 | `react-native-safe-area-context` 锁的 `com.android.tools.build:gradle:7.3.1` 拉到 `ddmlib:30.3.1` 时 dl.google.com TLS 握手抖了一次,重跑通过 |
| 首次完整构建 | **29min 失败 + 重跑 11min 成功** = 40min 实际 |
| 真机增量构建 | **37s** (NDK 缓存全 hit,只重 link + install) |

**给 cute_pixel ADR / 工程骨架的 action items**:
- AVD 必须 arm64-v8a (你已经是了)
- gradle.properties / .gradle/init.d 提前准备好镜像配置(阿里云 maven、bintray-mirror 之类),避免在 dl.google.com TLS 抖动时 build 整体崩
- 工程骨架 README 在 "Android prerequisites" 章节明确"首次 build 会自动装 NDK 27 + 28 各一份,共 ~3GB,留够磁盘"

---

## 5. 三平台双向 signal 行为一致性

example 自带的 `App.tsx` 测试矩阵 (`Start 1` / `Start 2` / `Stop` / `Pause` / `Resume` / `Open Window`):

| 行为 | iOS Sim | Android Emulator | Android 真机 |
|---|---|---|---|
| Start 1 加载 GodotTest.pck → cube 渲染 | ✅ | ✅ | ✅ |
| Start 2 (须先 Stop) 加载 GodotTest2.pck | ✅ | ✅ | ✅ |
| Open Window → Godot emit `window_status_update("Window opened: subwindow")` → JS console 收到 | ✅ | ✅ | ✅ |
| Close → 反向 signal `Window closed: subwindow` | ✅ | ✅ | ✅ |
| Stop → destroyInstance 路径 | ⚠️ 偶发 crash (见 §6) | ⚠️ 同 | ⚠️ 同 |
| Pause / Resume | ✅ | ✅ | ✅ |
| destroy → re-init 多次循环 | ✅ × 5 (iOS Sim 测过) | ✅ | ✅ |

**结论**:三平台 RN→Godot (调 `controller.open_window()`)、Godot→RN (signal `connect(...)`) 行为完全一致。

### 渲染后端差异 (App.tsx 已封装好 if/else)
| 平台 | rendering-driver | rendering-method | display-driver |
|---|---|---|---|
| iOS Simulator | metal | mobile | embedded |
| iOS 真机 | opengl3 | gl_compatibility | embedded |
| Android (任意) | opengl3 | gl_compatibility | embedded |

设计师导出项目时不用关心 — App.tsx 在 `runOnGodotThread` 里按 `Platform.OS` + `Device.isDevice` 自动切。

---

## 6. ⚠️ 已知 native bridge bug (`borndotcom-react-native-godot 1.0.1`)

iOS Sim 上点 Stop 之后,**偶发**(~3/15 概率) SIGSEGV:

```
EXC_BAD_ACCESS / KERN_INVALID_ADDRESS at 0x0
Faulting thread: com.facebook.react.runtime.JavaScript

[ 0] ?                              <no sym>+?                          ← null 解引用
[ 1] GodotTest.debug.dylib          GodotHostObject::~GodotHostObject() +48
[ 4]                                default_delete<GodotHostObject>...
[ 5]                                shared_ptr ... __on_zero_shared
[ 6] hermes                          HermesRuntimeImpl::JsiProxy::~JsiProxy
[ 7] hermes                          HadesGC::youngGenCollection           ← Hermes GC 触发
```

Sim 也同时打印 Godot teardown 噪音 (非崩溃):
```
ERROR: SkyShaderData(): Parameter "scene_singleton" is null
ERROR: 1 shaders of type SkyShaderRD were never freed
```

**根因推断**:`destroyInstance()` 路径 + Hermes GC 析构 GodotHostObject + 残留的 Godot 内部指针,析构竞态。

**对 cute_pixel 实际影响**:
- 单页面常驻 Godot view (你设想的主架构) — 不触发 ✅
- App 后台/前台切换 — 不触发 ✅
- React Navigation 切走/切回让 RTNGodotView unmount — **可能触发**,需要架构上把 Godot view 提到 provider 层保持挂载,别让它跟路由生命周期绑死 ⚠️
- Metro Fast Refresh 触发组件 unmount → init — 开发期可能撞,改用全量 reload (`r r`)

**给 cute_pixel ADR / CONVENTIONS 的 action items**:
- 架构原则写进 CONVENTIONS:**Godot 实例创建一次、随 app 常驻、不显式销毁**
- RTNGodotView 提到全局 provider 层 (跟 NavigationContainer 同层或更高),不挂在 Stack.Screen 子组件里
- 给 borndotcom 提 issue + 附 ips crash dump,等上游修

---

## 7. example 用了 ADR 里没考虑的依赖/机制

### 7a. **Expo modules 是必需,不是可选**
ADR-004 原本写"纯 bare,排除 Expo"。example 里 Expo modules 至少这些 **不可移除**:
- `expo` ~54.0.13 (Expo SDK 54)
- `expo-modules-core` 3.0.21 (transitively required by 下面所有 expo-* + Podfile 的 `use_expo_modules!`)
- `expo-asset`, `expo-constants`, `expo-device`, `expo-file-system`, `expo-font`, `expo-keep-awake` (autolinked)

具体在 App.tsx 用到:
- `expo-device` → `Device.isDevice` 判断 Sim vs 真机来选 Metal vs OpenGL
- `expo-file-system/legacy` → `FileSystem.bundleDirectory + name + ".pck"` 拼 .pck 路径

Podfile / android Gradle 都依赖 `expo-modules-autolinking` 把这些自动 link。

**ADR-004 必须改**:不是"纯 bare 排除 Expo",而是"bare RN + Expo modules autolinking + 不用 Expo CLI / Expo Go"。这个组合是 Expo 团队称之为 **"prebuild" workflow** 或 **"bare Expo"**,跟 `expo init` + `expo start` 的全套 managed 完全两回事。

### 7b. **`react-native-worklets-core` 是 Godot 调用的桥**
- pkg: `react-native-worklets-core@1.6.2`
- 用法 (App.tsx:33-83):

```js
function initGodot(name) {
  ...
  runOnGodotThread(() => {
    "worklet";   // ← 必须的指令注释
    RTNGodot.createInstance([...args]);
    let Godot = RTNGodot.API();
    var v = Godot.Vector2();   // 调 Godot 类型
    var engine = Godot.Engine;
    var sceneTree = engine.get_main_loop();
    ...
  });
}
```

也就是:**所有 RN → Godot API 调用都必须包在 `runOnGodotThread(() => { "worklet"; ... })` 里**,不能直接在 React 组件 render 里调 `RTNGodot.API()`。这是 worklet 机制 — 函数会被序列化到 Godot 线程上执行,跟 react-native-reanimated 的 worklet 是同一套底层。

**给 cute_pixel ADR / CONVENTIONS 的 action items**:
- ADR-001 / ADR-002 / CONVENTIONS 加一节"Godot API 调用必须在 worklet 里",并禁止在 React 组件渲染期或 setState 回调里直接调 RTNGodot.API()
- 工程骨架预设 lint 规则(custom eslint plugin?)如果在非 worklet 上下文调 `RTNGodot.*` → error
- README 的 "Hello World" 示例必须写完整的 worklet 形式,别让设计师 / 新人误以为可以直接调

---

## 8. 工程骨架迁移清单 (执行 cute_pixel 那边时的下一步)

按发现的顺序排:

1. **批量更新 ADR 文档**
   - ADR-001 (技术栈):RN 0.81 / React 19.1 / Hermes / Expo SDK 54 modules / TS 5.3.3 / Node 22 / yarn 4 Berry — 跟 example 一致
   - ADR-002 (Godot 版本):**editor 钉死 4.5.x**,runtime 钉死 LibGodot 4.5.1.migeran.2 — 不再写"4.6 编辑器 + 4.5 runtime forward-compat"
   - ADR-004 (包管理 / Expo 用法):从 "纯 bare 排除 Expo" 改为 "bare RN + Expo modules autolinking",pnpm 留待 yarn → pnpm 单独 ADR 决议

2. **同步 conventions.md / architecture.md / 根 README.md / CLAUDE.md**
   - Godot API 调用 worklet 约束
   - Godot view 必须在 provider 层常驻 (绕过 §6 的 destroy 崩溃)
   - 系统 Ruby 2.6.10 + bundler 2.4.1 user-install fallback
   - Podfile fmt patch 复制 (§3b)
   - GODOT_EDITOR env 必须指向 4.5.app

3. **example → cute_pixel 工程骨架迁移**
   - 复制 example/ 整目录作为骨架起点
   - 重命名 bundleId / displayName (`com.godottest` → cute_pixel 的 id)
   - 删 GodotTest / GodotTest2 项目示例,留空骨架等设计师塞自己的 .tscn
   - 清理 App.tsx 测试按钮,改成你们要的初始 UI 形态
   - **保留**:Podfile fmt patch、`runOnGodotThread` worklet 包装、Platform.OS + Device.isDevice 渲染后端选择、Expo modules 用法、yarn 4 + corepack 配置
   - 新加:eslint plugin 禁非 worklet 调 RTNGodot
   - 新加:CI 配置(macOS runner 走 Xcode 26 + Ruby 2.6 + Node 22 + bundler 2.4.1 user-install)

4. **跟 borndotcom 上游沟通**
   - 给 react-native-godot repo 提 issue:Xcode 26.4 fmt consteval (附 §3b workaround) + GodotHostObject destruction null deref (附 §6 ips dump)
   - 顺便建议他们文档里加 "Godot editor version must match LibGodot runtime version" 的 hard 警告(我们这次踩进去就是因为没写)

---

## 9. 其它没踩到的坑(handoff 预测了但没出现)

- ✅ ghcr.io DNS 抖动:LibGodot prebuilt 一次拉成功,本地 DNS 代理这次很乖
- ✅ Android compileSdk/targetSdk 跟 API 37 不匹配:没出现,RN 0.81 + Expo SDK 54 默认 compileSdk 36 跟 Medium_Phone API 37 兼容
- ✅ adb 看不到真机:USB 一插就 device 状态,realme 信任弹窗已自动接受过

---

## 完成时间线 (供未来排期参考)

| 时间段 | 内容 |
|---|---|
| ~5 min | Step 1 (4 次导出) — 最初用 4.6,**结果是骗局** |
| ~2 min | Step 2 (yarn install + download-prebuilt) |
| ~15 min | Step 3 (bundle install + 第一次 pod install) |
| ~30 min | Step 4 反复:遇到 fmt consteval → 三种 workaround 试错 → 最终 base.h patch 生效 → Build SUCCEEDED |
| ~5 min | Step 4b 重新装 Godot 4.5 + 重导出 4 次 + 重 build iOS app → cube 渲染 |
| ~10 min | Step 7-iOS 双向 signal 验证 + 5 次 destroy/init 循环验证 |
| ~40 min | Step 5 (Android Emulator) — Gradle + NDK 28 + NDK 27 + 网络抖动重试 |
| ~3 min | Step 6 (Android 真机) — 缓存命中,37s |
| ~5 min | Step 7-Android × 2 (Emulator + 真机) |
| **~110 min** | **总耗时** |

下次新机器上重跑(全冷启动)估计还是这个量级,主要是 NDK + Gradle + cocoapods 的下载没法并行。
