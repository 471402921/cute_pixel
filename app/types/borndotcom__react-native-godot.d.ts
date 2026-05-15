/**
 * Local declaration for `@borndotcom/react-native-godot` 1.0.1.
 *
 * Upstream package does not ship .d.ts. This file declares only the surface
 * App.tsx and downstream `services/godot/` will touch — keep it minimal so future
 * upgrades / a real Godot SDK shape don't fight a sprawling typing.
 *
 * If borndotcom ships official types in a future release, delete this file
 * and let `tsc` resolve from the package.
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
