# AUTO-MIRRORED from /proto/messages.gd; do not edit directly.
# 改协议必须改根目录 proto/messages.gd + proto/messages.ts,然后 cp 过来。
#
# Mirror of proto/messages.ts(改这里必须同步改 proto/messages.ts;反之亦然)
#
# 协议形态详见 ADR-007:single typed message bus,RN 通过 godotBridge.send 发
# Command,GD 通过 MessageBridge dispatch by type 处理;反向通过 emit_signal
# 把 Event 推回 RN。
#
# 当前范围:
# - Scene-level:SCENE_LOAD / SCENE_UNLOAD + SCENE_LOADED / BRIDGE_ERROR(v0.1)
# - Character entity:CHARACTER_SET_EXTERNAL_CONTROL / CHARACTER_SET_VELOCITY
#   + CHARACTER_STATE(2026-05-17 加;给外部 console 远程接管角色用,
#   遵循 ADR-007 §4 entity scoping 命名规则)

class_name Messages

# ─── RN → GD Command type strings(scene-level)────────────────────────────────
const CMD_SCENE_LOAD := "SCENE_LOAD"
const CMD_SCENE_UNLOAD := "SCENE_UNLOAD"

# ─── RN → GD Command type strings(character entity,per ADR-007 §4)──────────
const CMD_CHARACTER_SET_EXTERNAL_CONTROL := "CHARACTER_SET_EXTERNAL_CONTROL"
const CMD_CHARACTER_SET_VELOCITY := "CHARACTER_SET_VELOCITY"

# ─── GD → RN Event type strings ───────────────────────────────────────────────
const EVT_SCENE_LOADED := "SCENE_LOADED"
const EVT_BRIDGE_ERROR := "BRIDGE_ERROR"
const EVT_CHARACTER_STATE := "CHARACTER_STATE"

# ─── BRIDGE_ERROR codes ───────────────────────────────────────────────────────
const ERR_INVALID_MESSAGE := "INVALID_MESSAGE"  # zod 校验失败 / payload 缺字段
const ERR_UNKNOWN_TYPE := "UNKNOWN_TYPE"        # type 字段不在已知 Command 集合
const ERR_HANDLER_ERROR := "HANDLER_ERROR"      # dispatch 后 handler 抛错

# ─── Payload schema(便于 dispatch 时手工校验,正式校验由 RN 侧 zod 做)─────

# SCENE_LOAD payload: { scene: String(min 1) }
# SCENE_UNLOAD payload: { scene: String(min 1) }
# CHARACTER_SET_EXTERNAL_CONTROL payload: { enabled: bool }
# CHARACTER_SET_VELOCITY payload: { x: float, y: float }  (px/sec; zero = 站立但仍 external)
# SCENE_LOADED payload: { scene: String(min 1) }
# BRIDGE_ERROR payload: { code: String(枚举见上), message: String, originalType?: String }
# CHARACTER_STATE payload: { position: {x: float, y: float}, animation: String, control_mode: "autonomous" | "external" }

# ─── Helper: 构造 BRIDGE_ERROR Event(给 MessageBridge.gd 用)─────────────────

static func bridge_error(code: String, message: String, original_type: String = "") -> Dictionary:
	var payload := {"code": code, "message": message}
	if original_type != "":
		payload["originalType"] = original_type
	return {"type": EVT_BRIDGE_ERROR, "payload": payload}

# ─── Helper: 构造 SCENE_LOADED Event ──────────────────────────────────────────

static func scene_loaded(scene: String) -> Dictionary:
	return {"type": EVT_SCENE_LOADED, "payload": {"scene": scene}}

# ─── Helper: 构造 CHARACTER_STATE Event(给 character.gd 5Hz 节流上报用)─────

static func character_state(position: Vector2, animation: String, control_mode: String) -> Dictionary:
	return {
		"type": EVT_CHARACTER_STATE,
		"payload": {
			"position": {"x": position.x, "y": position.y},
			"animation": animation,
			"control_mode": control_mode,
		}
	}
