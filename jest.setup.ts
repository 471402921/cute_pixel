/**
 * jest.setup.ts — mocks for native modules not available in jest env
 *
 * 见 _B1_REPORT.md §7b:`react-native-worklets-core` 在 import 时调
 * `TurboModuleRegistry.getEnforcing('Worklets')`,jest 环境无 native runtime
 * 直接抛错;`@borndotcom/react-native-godot` 同理(它依赖 worklets-core)。
 *
 * 这里给两个包提供最小 mock,让 import 链能跑通。worklet 函数作为同步 fn()
 * 立即执行,符合"jest 单元测试不验 worklet 调度"的预期(scheduling 由 e2e
 * 与设备实测覆盖)。
 *
 * 真实业务测试落地时,如需要 spy 某个 RTNGodot.* 方法,直接 cast 后用
 * `(RTNGodot.foo as jest.Mock).mockReturnValue(...)`。
 */

// biome-ignore-all lint/suspicious/noExplicitAny: jest mock identity functions intentionally use `any`

jest.mock("@borndotcom/react-native-godot", () => ({
  RTNGodot: {
    getInstance: jest.fn(() => null),
    createInstance: jest.fn(),
    destroyInstance: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    API: jest.fn(() => ({
      Vector2: () => ({ x: 0, y: 0 }),
      Engine: { get_main_loop: () => null },
    })),
  },
  RTNGodotView: "RTNGodotView", // string component placeholder for snapshot tests
  runOnGodotThread: (fn: () => void) => fn(), // execute synchronously in tests
}));

jest.mock("react-native-worklets-core", () => ({
  Worklets: {
    createRunOnJS: <T>(fn: T) => fn,
    createRunOnUI: <T>(fn: T) => fn,
  },
  runOnUI: (fn: () => void) => fn(),
  runOnJS: (fn: () => void) => fn(),
}));
