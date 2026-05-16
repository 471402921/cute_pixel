/**
 * RootNavigator — 根导航;App.tsx 的唯一职责就是在 <GodotProvider> 内 mount 这个。
 *
 * 业务 feature 新增 screen 时,在 RootStackParamList(types.ts)加 entry,
 * 然后在这里加 <Stack.Screen />。
 *
 * 当前 initialRouteName="Room" 直接落地第一个 demo;Home 留作回退 / 未来 launcher。
 */

import { DefaultTheme, NavigationContainer, type Theme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StyleSheet, Text, View } from "react-native";
import { RoomPage } from "../features/room/RoomPage";
import { navigationRef } from "./navigationRef";
import type { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

// 让 NavigationContainer + 默认 scene 背景透明,使底层 GodotProvider 的
// RTNGodotView(absoluteFill)能透过 PixelView 显出来。
const TransparentTheme: Theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: "transparent" },
};

const HomePage = () => (
  <View style={styles.container}>
    <Text style={styles.title}>cute_pixel</Text>
    <Text style={styles.subtitle}>底座已就绪</Text>
    <Text style={styles.hint}>在 app/features/ 下加你的第一个模块</Text>
  </View>
);

export const RootNavigator = () => (
  <NavigationContainer ref={navigationRef} theme={TransparentTheme}>
    <Stack.Navigator
      initialRouteName="Room"
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "transparent" } }}
    >
      <Stack.Screen name="Room" component={RoomPage} />
      <Stack.Screen name="Home" component={HomePage} />
    </Stack.Navigator>
  </NavigationContainer>
);

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  title: { fontSize: 32, fontWeight: "600", marginBottom: 8 },
  subtitle: { fontSize: 16, color: "#666", marginBottom: 16 },
  hint: { fontSize: 13, color: "#999", textAlign: "center" },
});
