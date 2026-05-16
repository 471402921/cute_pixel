# godot_project/ TODO(设计师跟进清单)

`godot_project/` 大部分来自 [Lissyluo66/godot-test](https://github.com/Lissyluo66/godot-test) 原版,只在 cute_pixel 这边加了:

- `project.godot`(改 name + 加 MessageBridge autoload + 改 main_scene)
- `bridge/MessageBridge.gd`(autoload,RN ↔ GD 通信桥,见 ADR-007)
- `proto/messages.gd`(AUTO-MIRRORED 副本)
- `character/character.gd`(改成 autonomous 状态机 + `set_external_control()`,删了原 keyboard control)

**素材层(墙 / 家具碰撞 / 角色初始位置)我没改** —— 这些都需要设计师在 Godot Editor 里精确配,AI 用截图反推坐标不靠谱。下面是 demo 跑通后**已发现的需要 polish 的清单**,请按优先级跟进。

---

## P0(影响 demo 基本可用性)

### 1. `interior_scene/wall.tres` 缺 `physics_layer_0`

**现状**:`wall.tres` 只配了 `terrain_set_0` Border Terrain(画图辅助),**没有任何 physics_layer 配置**;墙瓦片在 Godot Editor "Tile Editor → Physics" tab 里都没画 collision polygon。

**结果**:运行时墙是纯视觉,**没有任何碰撞**,角色 walk 几秒可以直接穿墙走到 viewport 外(看不见了)。

**改法**(设计师在 Godot Editor 里):
1. 双击 `wall.tres` → TileSet 面板
2. 切到 "Physics Layers" → 加 `physics_layer_0`(默认 collision_layer = 1)
3. 切到 "Tiles" → 选每个**墙瓦片**(不是地板) → "Select Physics Layer" → 用多边形工具画出 collision polygon(可以是整块瓦片矩形,也可以是细化形状)
4. 保存 → 重导出 .pck

参考 [Godot 4 TileSet physics docs](https://docs.godotengine.org/en/stable/tutorials/2d/using_tilesets.html#assigning-properties-to-the-tiles)

### 2. `character.tscn` 初始 position 可能在 viewport 外

**现状**:`interior_scene.tscn` 实例化 Character 时 position = (164, 326) 局部 = (166, 319) 全局。Camera 在 (206, 350),viewport [14, 398] × [14, 686]。**理论上**全局 (166, 319) 在视野内,但 demo 实测**首屏看不到角色** —— 可能 idle phase 没动,或者 y_sort 排到某个怪位置后面。

**改法**(设计师在 Godot Editor 里):
1. 在 `interior_scene.tscn` 打开 Editor → 看 Character 节点的 viewport 实际位置
2. 调到地板范围内 + 不被任何家具 sprite 完全遮挡的位置(建议 viewport 中下方)
3. 验证:点 "Run Project" 看 Character 出现在视野内

---

## P1(明显 polish 但不影响 demo 跑通)

### 3. 4 个家具的 `CollisionShape2D` 节点空(shape 字段未设)

```
furnitures/decor_terrarium_glass.tscn          ← CollisionShape2D 节点存在,无 shape
furnitures/furniture_decor_curtain_yellow_floral.tscn  ← 同上
furnitures/furniture_electronics_tv_flat.tscn  ← 同上
furnitures/lighting_floor_lamp_off.tscn        ← CircleShape2D 存在,radius=0(等于空)
```

**结果**:这 4 个家具运行时无碰撞,角色穿过去。

**改法**(设计师在 Godot Editor 里):
1. 打开每个 .tscn → 选 CollisionShape2D 节点
2. Inspector → Shape → 选 New RectangleShape2D / CircleShape2D
3. 拖参数画出 sprite 底部脚印的范围(参考其他家具 size 都是 50×8 ~ 60×15 这种"扁底座")
4. 注:`furniture_decor_curtain_yellow_floral`(窗帘)是墙面装饰,可能不需要碰撞 → 直接删 CollisionShape2D 节点更干净

### 4. y_sort 顺序可能让角色被某些大型家具盖住

**现状**:`furnitures` 节点设 `y_sort_enabled = true`,子节点按 y 坐标排序渲染。但 Character 在 (164, 326) 局部,可能被 y 比它大的家具(沙发 cream y=383 等)在渲染顺序里压在后面。

**改法**:设计师在 Editor 里 Visual 验证 — 调角色 z_index 或让它脱离 furnitures 容器(放到 InteriorScene 直接子,跟 furnitures 并列)

---

## 不在本清单内(底座侧管,设计师不用操心)

- `bridge/MessageBridge.gd` 的 dispatch / SCENE_LOAD handler 逻辑
- `proto/messages.gd` 的 message 定义(由 `/proto/messages.gd` 镜像同步)
- `character.gd` 的 autonomous 状态机 / external_control 开关
- `project.godot` 的 autoload / main_scene 配置
- iOS / Android 打包(`scripts/export_godot_GodotTest.sh`)

---

## 验证流程

设计师每改一波,重导 .pck:

```bash
export GODOT_EDITOR=/Applications/Godot-4.5.app/Contents/MacOS/Godot
./scripts/export_godot_GodotTest.sh ios       # 产出 ios/GodotTest.pck
# 然后让 RN 工程师 yarn ios 看效果
```

或者直接 `cp` 进 iOS Simulator 安装好的 .app(快速迭代,不用重 build):

```bash
APP_DIR="$HOME/Library/Developer/CoreSimulator/Devices/<UUID>/data/Containers/Bundle/Application/<APP_UUID>/GodotTest.app"
cp ios/GodotTest.pck "$APP_DIR/GodotTest.pck"
xcrun simctl terminate booted org.reactjs.native.example.GodotTest
xcrun simctl launch booted org.reactjs.native.example.GodotTest
```
