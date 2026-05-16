/**
 * GodotProvider — 唯一 Godot 引擎实例 + 唯一 RTNGodotView 的宿主。
 *
 * 设计要点(详见 ADR-002 §Engine 生命周期):
 * - app 启动时 `runOnGodotThread` 内 `RTNGodot.createInstance(...)`,**单例**
 * - 业务模块**不能** create / destroy engine,只能通过 <PixelView> 间接触发 scene swap
 * - AppState change 自动 pause / resume(背景态省电 + 防 GodotHostObject 析构竞态)
 * - RTNGodotView 用 `StyleSheet.absoluteFill` 在 Provider 容器底层全屏挂一份;
 *   children(NavigationContainer / RoomPage 等)叠在上面;<PixelView> 透明占位让
 *   底下的 Godot 像素显出来(本期单 PixelView 全屏,Portal "frame 跟随" planned,
 *   等第二个 demo 真要 split-view 时再实装)
 * - **不**支持 destroyInstance:borndotcom 1.0.1 + Hermes GC 在 GodotHostObject
 *   析构上有竞态(详见 _B1_REPORT.md §6),engine 生命周期 = app 生命周期
 *
 * 引擎名 "GodotTest":
 * - iOS:`{bundleDirectory}GodotTest.pck`(由 `./scripts/export_godot_GodotTest.sh ios` 产出)
 * - Android:`assets/GodotTest/`(由 `./scripts/export_godot_GodotTest.sh android` 产出)
 * - `package.json` 的 `name` 也是 "GodotTest" — 这是 react-native-godot example 的硬编码约定
 *
 * 暴露 Context:`useGodot()` 返回 `engineStatus`。本期只乐观置 "running",失败兜底
 * 通过 BRIDGE_ERROR subscribe 监控(plan §"验证 E2E" 表)。
 */

import { RTNGodot, RTNGodotView, runOnGodotThread } from "@borndotcom/react-native-godot";
import * as Device from "expo-device";
import * as FileSystem from "expo-file-system/legacy";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState, type AppStateStatus, Platform, StyleSheet, View } from "react-native";
import { Logger } from "../logging";

const ENGINE_NAME = "GodotTest";

export type EngineStatus = "initializing" | "running" | "failed";

interface GodotContextValue {
  engineStatus: EngineStatus;
}

const GodotContext = createContext<GodotContextValue | null>(null);

export function useGodot(): GodotContextValue {
  const ctx = useContext(GodotContext);
  if (ctx == null) {
    throw new Error("useGodot must be used inside <GodotProvider>");
  }
  return ctx;
}

interface Props {
  children: ReactNode;
}

export const GodotProvider = ({ children }: Props) => {
  const [engineStatus, setEngineStatus] = useState<EngineStatus>("initializing");
  const initStarted = useRef(false);

  useEffect(() => {
    if (initStarted.current) {
      return;
    }
    initStarted.current = true;
    Logger.info("GodotProvider: initializing engine", { engine: ENGINE_NAME });

    runOnGodotThread(() => {
      "worklet";
      if (RTNGodot.getInstance() != null) {
        return;
      }
      if (Platform.OS === "android") {
        RTNGodot.createInstance([
          "--verbose",
          "--path",
          `/${ENGINE_NAME}`,
          "--rendering-driver",
          "opengl3",
          "--rendering-method",
          "gl_compatibility",
          "--display-driver",
          "embedded",
        ]);
      } else {
        const args = [
          "--verbose",
          "--main-pack",
          `${FileSystem.bundleDirectory}${ENGINE_NAME}.pck`,
          "--display-driver",
          "embedded",
        ];
        if (Device.isDevice) {
          args.push("--rendering-driver", "opengl3", "--rendering-method", "gl_compatibility");
        } else {
          args.push("--rendering-driver", "metal", "--rendering-method", "mobile");
        }
        RTNGodot.createInstance(args);
      }
    });

    setEngineStatus("running");
  }, []);

  useEffect(() => {
    const onChange = (state: AppStateStatus): void => {
      if (state === "active") {
        Logger.debug("GodotProvider: app active → RTNGodot.resume()");
        RTNGodot.resume();
      } else if (state === "background" || state === "inactive") {
        Logger.debug("GodotProvider: app backgrounded → RTNGodot.pause()", { state });
        RTNGodot.pause();
      }
    };
    const sub = AppState.addEventListener("change", onChange);
    return () => {
      sub.remove();
    };
  }, []);

  const value = useMemo<GodotContextValue>(() => ({ engineStatus }), [engineStatus]);

  return (
    <GodotContext.Provider value={value}>
      <View style={styles.container}>
        <RTNGodotView style={StyleSheet.absoluteFill} />
        {children}
      </View>
    </GodotContext.Provider>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
});
