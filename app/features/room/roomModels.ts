/**
 * roomModels — 室内场景模块的类型 / schema(PLACEHOLDER)。
 *
 * 现状:本 demo 只展示 `interior_scene`,所有家具 / 角色都由 GD 端 scene 文件
 * 描述;RN 不需要建模也不持久化任何场景数据,故仅保留命名锚点。
 *
 * 退场条件 / 何时填实:
 * - 用户决定让 RN 控制家具布局(增 / 删 / 重排)→ 这里定 `FurnitureItem` zod schema
 * - 多场景切换(`interior_scene` / `garden_scene` ...)→ 定 `SceneName` 联合 + metadata
 * - 角色位置需要持久化 → 定 `CharacterState` schema + `roomStore` 走 `persist` 中间件
 */

// TODO(features/room): 当 RN 侧需要描述场景数据(家具列表 / 角色位置 / 多场景切换)时,
// 在此用 zod 定义 schema,导出 inferred type。示例:
//
//   import { z } from "zod";
//   export const SceneName = z.enum(["interior_scene", "garden_scene"]);
//   export type SceneName = z.infer<typeof SceneName>;

export {};
