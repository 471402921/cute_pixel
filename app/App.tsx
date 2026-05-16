/**
 * cute_pixel — 像素风 React Native + Godot 通用底座入口
 *
 * 业务模块按 Module-First Flat 加到 app/features/{module}/,
 * 详见 doc/cute_pixel_plan/architecture.md。
 *
 * <GodotProvider> 必须包在 <RootNavigator /> 外:engine 是单例 + 常驻,
 * navigation 切换不能 unmount 引擎(详见 ADR-002 §Engine 生命周期)。
 */

import "setimmediate"; // Required by New Architecture
import { RootNavigator } from "./navigation/RootNavigator";
import { GodotProvider } from "./services/godot/GodotProvider";

const App = () => (
  <GodotProvider>
    <RootNavigator />
  </GodotProvider>
);

export default App;
