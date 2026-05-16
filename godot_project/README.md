# godot_project/

Godot 4.5.x 工程。通过 `app/services/godot/`(RN 侧)桥接嵌入 React Native(详见 [ADR-002](../doc/cute_pixel_plan/decisions/ADR-002-godot-as-pixel-engine-via-react-native-godot.md))。

## 分工(底座铁律)

按文件类型严格分,**工程师 / AI 默认只能动 `.gd`**:

| 文件类型 | 拥有者 | 工程师能改? |
|---|---|---|
| `*.tscn`(场景结构 + 节点位置 + 物理 shape) | **设计师** | ❌ |
| `*.tres`(共享资源,如 TileSet) | **设计师** | ❌ |
| `*.png` + `*.import`(精灵 + 自动导入元) | **设计师** | ❌ |
| `*.gd`(行为脚本) | **工程师** | ✅ 设计师可看可建议 |
| `project.godot` | **工程师** | ✅ |
| `proto/messages.gd` mirror | **工程师** | ✅(从 `/proto/messages.gd` 镜像同步) |

完整理由 + 紧急 hotfix 例外条款见 [conventions §17](../doc/cute_pixel_plan/conventions.md#17-gd-侧分工设计师拥有场景工程师拥有脚本)。

## 结构

底座承诺存在的目录(任何 cute_pixel 应用都会有):

- `bridge/MessageBridge.gd`(planned,首个 demo 落地):RN ↔ GD 通信桥接 autoload(工程师管,详见 [ADR-007](../doc/cute_pixel_plan/decisions/ADR-007-rn-godot-communication-contract.md))
- `proto/messages.gd`(planned):AUTO-MIRRORED 自 `/proto/messages.gd`——改协议必须先改根目录再 cp,**不在 godot_project 这里维护源**
- `project.godot`:工程配置 + autoload + main_scene + config/name(必须与 RN 侧 `initGodot(...)` 一致)
- 其余 `*.tscn` / `*.tres` / `resources/`:设计师管,具体场景由每个 app 自填

## 重导 .pck

每次 GDScript 或场景改完后,需要重导 .pck 让 native build 拿到:

```bash
export GODOT_EDITOR=/Applications/Godot-4.5.app/Contents/MacOS/Godot
./scripts/export_godot_GodotTest.sh ios       # 产出 ios/GodotTest.pck
./scripts/export_godot_GodotTest.sh android   # 产出 android/app/src/main/assets/GodotTest/
```

详见 [conventions §14a](../doc/cute_pixel_plan/conventions.md#14a-godot_editor-env-必须指向-45x)。

## 不要做的事

- ❌ 不要直接 import / 卸载 Godot 引擎(由 `services/godot/GodotProvider` 单点管,见 ADR-002)
- ❌ 不要在场景里写"业务逻辑"(hunger 计时、玩家进度等)——业务态在 RN 侧 store,GD 只负责渲染态(见 [ADR-007 §2](../doc/cute_pixel_plan/decisions/ADR-007-rn-godot-communication-contract.md))
- ❌ 不要假设 RN 侧能直接调任意 GD 节点的方法——所有跨 runtime 通信都走 `MessageBridge.dispatch(json)` + `event_emitted` signal(message bus 形态见 ADR-007)
- ❌ 不要修改 `*.tscn` / `*.tres` / `*.png`(除非紧急 hotfix,见 conventions §17 例外)
