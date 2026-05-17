/**
 * cute_pixel — 像素风 React Native + Godot 通用底座入口
 *
 * 业务模块按 Module-First Flat 加到 app/features/{module}/,
 * 详见 doc/cute_pixel_spec/architecture.md。
 *
 * <GodotProvider> 必须包在 <RootNavigator /> 外:engine 是单例 + 常驻,
 * navigation 切换不能 unmount 引擎(详见 ADR-002 §Engine 生命周期)。
 *
 * realtimeBridge:app 顶层 useEffect 启动 / 关闭。放 App 而不是某个 feature,
 * 因为它要在 RN 启动 + GodotProvider mount 之后**全应用周期**保持运行,跨
 * navigation 切换不能被卸载;`realtimeEnv` 是 dev-friendly fallback,真接入
 * 时由 env 注入(详见 services/env/realtimeEnv.ts、doc/console-spec/handoff-reply.md)。
 */

import { useEffect } from "react";
import "setimmediate"; // Required by New Architecture
import { RootNavigator } from "./navigation/RootNavigator";
import { realtimeEnv } from "./services/env";
import { GodotProvider } from "./services/godot/GodotProvider";
import { realtimeBridge } from "./services/realtime";

const App = () => {
  useEffect(() => {
    realtimeBridge.start(realtimeEnv.url, realtimeEnv.roomId);
    return () => {
      realtimeBridge.stop();
    };
  }, []);

  return (
    <GodotProvider>
      <RootNavigator />
    </GodotProvider>
  );
};

export default App;
