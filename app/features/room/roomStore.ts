/**
 * roomStore — 室内场景模块的 Zustand store。
 *
 * 单一真理(conventions §9)。本期只持有 `sceneName`,角色位置 / 家具状态由 GD 端
 * scene 文件描述,RN 暂不需要镜像。
 *
 * Future:
 * - 多场景切换 → 加 `setSceneName(name: SceneName)`
 * - 角色位置持久化 → 加 `persist` middleware + MMKV(Phase B 装包后)
 * - 状态权属:GD 拥有渲染态(动画 / tween / 粒子),RN 拥有可持久化业务态;
 *   "角色当前像素坐标"算渲染态,不会进 RN store
 */

import { create } from "zustand";

interface RoomState {
  sceneName: string;
}

export const useRoomStore = create<RoomState>(() => ({
  sceneName: "interior_scene",
}));
