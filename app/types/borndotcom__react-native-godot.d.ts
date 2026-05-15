/**
 * Local .d.ts shim for `@borndotcom/react-native-godot` 1.0.1
 * (upstream package ships no types as of 1.0.1).
 *
 * 当前状态:本文件**临时无消费方**——App.tsx 在 b0e575f 起被砍成空壳,
 * 不再 import 此模块。文件保留是因为 services/godot/ 实装(godotBridge.ts /
 * {domain}Commands.ts 等,见 ADR-007)会立刻重新引用,删了再造一次浪费。
 *
 * 范围:只声明底座**会触碰**的最小 surface(RTNGodot / RTNGodotView /
 * runOnGodotThread / GodotNode / GodotSignal / GodotAPI)。**不**翻译整个
 * Godot API,免得后续与官方类型对齐时要打翻一遍。用到啥加啥。
 *
 * 命名约定:本目录(app/types/)下的第三方包类型兜底,文件名格式
 * `{scope-without-at}__{pkg}.d.ts`(双下划线分隔,等价于 npm 的 `@scope/pkg`)。
 *
 * 退场条件:borndotcom 官方在某个 release 给出 .d.ts → 删本文件,让 tsc
 * 直接从 node_modules/@borndotcom/react-native-godot/ 解析。
 */
declare module "@borndotcom/react-native-godot" {
  import type { ComponentType } from "react";
  import type { ViewProps } from "react-native";

  /** Godot signal — only `connect` / `disconnect` is consumed from RN side. */
  export interface GodotSignal<TArgs extends unknown[] = unknown[]> {
    connect(callback: (...args: TArgs) => void): void;
    disconnect(callback: (...args: TArgs) => void): void;
  }

  /** Minimal subset of GD scene tree node API touched from RN. */
  export interface GodotNode {
    find_child(name: string, recursive: boolean, owned: boolean): GodotNode | null;
    has_connections(signalName: string): boolean;
    get_root(): GodotNode;
    get_main_loop(): GodotNode;
  }

  interface GodotVector2 {
    x: number;
    y: number;
  }

  /** Returned by `RTNGodot.API()` — only fields touched by App.tsx are typed. */
  interface GodotAPI {
    Vector2(): GodotVector2;
    Engine: {
      get_main_loop(): GodotNode;
    };
  }

  type GodotInstance = unknown;

  export const RTNGodot: {
    getInstance(): GodotInstance | null;
    createInstance(args: string[]): void;
    destroyInstance(): void;
    pause(): void;
    resume(): void;
    API(): GodotAPI;
  };

  export const RTNGodotView: ComponentType<ViewProps & { windowName?: string }>;

  export function runOnGodotThread(fn: () => void): void;
}
