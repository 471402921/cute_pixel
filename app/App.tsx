/**
 * cute_pixel — 像素风 React Native + Godot 通用底座入口
 *
 * 业务模块按 Module-First Flat 加到 app/features/{module}/,
 * 详见 doc/cute_pixel_plan/architecture.md。
 */

import "setimmediate"; // Required by New Architecture
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StyleSheet, Text, View } from "react-native";

type RootStackParamList = {
  Home: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const HomePage = () => (
  <View style={styles.container}>
    <Text style={styles.title}>cute_pixel</Text>
    <Text style={styles.subtitle}>底座已就绪</Text>
    <Text style={styles.hint}>在 app/features/ 下加你的第一个模块</Text>
  </View>
);

const App = () => (
  <NavigationContainer>
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

export default App;
