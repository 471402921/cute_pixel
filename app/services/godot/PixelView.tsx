/**
 * PixelView — portal placeholder for embedded Godot scene rendering.
 *
 * 用法:
 *   <PixelView scene="interior_scene" style={{ flex: 1 }} />
 *
 * Mental model:**"我需要某 scene 显示在某区域"**,不是"我要一个 Godot view"。
 * 真正的 RTNGodotView 单例由 `GodotProvider` 挂在 React tree 顶层(用 absoluteFill
 * 占满 NavigationContainer 区域),PixelView 在业务 tree 里只是个透明占位 View——
 * 透过它能看到底下的 Godot 像素。
 *
 * Status(B2 part 2):
 * - mount → `sceneCommands.loadScene(scene)`,unmount → `unloadScene(scene)`
 * - `onLayout` 测自身 frame 已留接口,但**未**回传给 Provider —— 本期单 PixelView
 *   全屏,frame 不变,Portal 真正"跟随移动 + 多 view"模式 planned,等第二个 demo
 *   有 navigation 切换 / split-view 需求时再实装(详见 ADR-002)。
 */

import { useEffect } from "react";
import { type LayoutChangeEvent, View, type ViewStyle } from "react-native";
import { sceneCommands } from "./sceneCommands";

interface Props {
  scene: string;
  style?: ViewStyle;
}

export const PixelView = ({ scene, style }: Props) => {
  useEffect(() => {
    sceneCommands.loadScene(scene);
    return () => {
      sceneCommands.unloadScene(scene);
    };
  }, [scene]);

  const handleLayout = (_event: LayoutChangeEvent): void => {
    // future: report frame to GodotProvider for Portal positioning
  };

  return <View style={style} onLayout={handleLayout} />;
};
