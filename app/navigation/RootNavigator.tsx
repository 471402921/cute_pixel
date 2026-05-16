/**
 * RootNavigator — 根导航;App.tsx 的唯一职责就是 mount 这个。
 *
 * 业务 feature 新增 screen 时,在 RootStackParamList(types.ts)加 entry,
 * 然后在这里加 <Stack.Screen />。
 */

import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StyleSheet, Text, View } from "react-native";
import { navigationRef } from "./navigationRef";
import type { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

const HomePage = () => (
  <View style={styles.container}>
    <Text style={styles.title}>cute_pixel</Text>
    <Text style={styles.subtitle}>底座已就绪</Text>
    <Text style={styles.hint}>在 app/features/ 下加你的第一个模块</Text>
  </View>
);

export const RootNavigator = () => (
  <NavigationContainer ref={navigationRef}>
    <Stack.Navigator initialRouteName="Home">
      <Stack.Screen name="Home" component={HomePage} options={{ headerShown: false }} />
    </Stack.Navigator>
  </NavigationContainer>
);

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  title: { fontSize: 32, fontWeight: "600", marginBottom: 8 },
  subtitle: { fontSize: 16, color: "#666", marginBottom: 16 },
  hint: { fontSize: 13, color: "#999", textAlign: "center" },
});
