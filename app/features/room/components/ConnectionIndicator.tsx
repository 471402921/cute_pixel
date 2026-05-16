/**
 * ConnectionIndicator — 浮在右上角的外部 console 连接状态小圆点 + 文字。
 *
 * 数据源:`useConnectionStatus`(services/realtime/),订阅 status 字段。
 * Demo 默认 status="disconnected" → 灰色"● 未连接"。
 *
 * 视觉:
 * - 绝对定位右上,距 SafeArea 顶 + 16,距右 16
 * - 半透明黑底 + 圆角 + 内边距 8,字号 12,字色按 status 取
 *
 * 不在 services/ 层 —— 它有 React tree 依赖(SafeArea / View);也不在 shared/widgets
 * —— 只 room 模块用。放 features/room/components/ 是合适的边界。
 */

import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  type ConnectionStatus,
  useConnectionStatus,
} from "../../../services/realtime/useConnectionStatus";

const COLORS: Record<ConnectionStatus, string> = {
  disconnected: "#9aa0a6",
  connecting: "#f7b500",
  connected: "#34a853",
};

const LABELS: Record<ConnectionStatus, string> = {
  disconnected: "未连接",
  connecting: "连接中",
  connected: "已连接",
};

export const ConnectionIndicator = () => {
  const status = useConnectionStatus((s) => s.status);
  const insets = useSafeAreaInsets();
  const color = COLORS[status];
  const label = LABELS[status];
  return (
    <View
      style={[styles.container, { top: insets.top + 16 }]}
      accessibilityRole="text"
      accessibilityLabel={`外部连接 ${label}`}
    >
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
  },
});
