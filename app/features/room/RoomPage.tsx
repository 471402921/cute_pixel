/**
 * RoomPage — 第一个像素 demo 的 Screen:全屏室内场景 + 右上连接状态浮层。
 *
 * 组合(Module-First Flat,conventions §):
 * - `<PixelView scene={...} />` 全屏占位,透过它显示底层 GodotProvider 挂的 Godot view
 * - `<ConnectionIndicator />` 绝对定位右上,显示外部控制台连接状态(本期固定"未连接")
 *
 * 业务行为:零。角色 autonomous 行走由 GD 端 character.gd 状态机驱动。
 *
 * Note:Page 只组合不写业务;`useRoomStore` 只取 sceneName。
 */

import { StyleSheet, View } from "react-native";
import { PixelView } from "../../services/godot/PixelView";
import { ConnectionIndicator } from "./components/ConnectionIndicator";
import { useRoomStore } from "./roomStore";

export const RoomPage = () => {
  const sceneName = useRoomStore((s) => s.sceneName);
  return (
    <View style={styles.container}>
      <PixelView scene={sceneName} style={styles.pixel} />
      <ConnectionIndicator />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  pixel: { flex: 1 },
});
