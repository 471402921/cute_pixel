/**
 * navigationRef — 跨 React tree 的导航 ref。
 *
 * 给 services 层(如 401 拦截器跳登录)用——它在组件树外,无法用 useNavigation。
 * 业务 component 里**不要**用这个,用 `useNavigation()` hook。
 *
 * 用法(services 层):
 *   import { navigationRef } from "@/navigation/navigationRef";
 *   if (navigationRef.isReady()) navigationRef.navigate("Login", undefined);
 */

import { createNavigationContainerRef } from "@react-navigation/native";
import type { RootStackParamList } from "./types";

export const navigationRef = createNavigationContainerRef<RootStackParamList>();
