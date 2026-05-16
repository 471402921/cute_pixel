/**
 * cute_pixel — 像素风 React Native + Godot 通用底座入口
 *
 * 业务模块按 Module-First Flat 加到 app/features/{module}/,
 * 详见 doc/cute_pixel_plan/architecture.md。
 */

import "setimmediate"; // Required by New Architecture
import { RootNavigator } from "./navigation/RootNavigator";

const App = () => <RootNavigator />;

export default App;
