/**
 * RootStackParamList — 根 stack 的路由参数类型表。
 *
 * 业务 feature 新增 screen 时,在这里加一行 `ScreenName: ParamsType`。
 * 参数 type 复杂的请放 `shared/route-args/{module}RouteArgs.ts` 再 import。
 */
export type RootStackParamList = {
  Home: undefined;
  Room: undefined;
};
