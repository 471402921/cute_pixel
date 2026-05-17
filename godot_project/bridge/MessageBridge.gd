# Autoload(在 project.godot 注册为 MessageBridge)
# 见 ADR-007 + proto/messages.gd
extends Node

const Messages = preload("res://proto/messages.gd")

signal event_emitted(json_string: String)

# RN → GD scene name → 资源路径注册表
const SCENE_PATHS := {
	"interior_scene": "res://interior_scene/interior_scene.tscn",
}

# === Public: RN 通过 godotBridge.send 间接调到这 ===
func dispatch(json_string: String) -> void:
	var parsed = JSON.parse_string(json_string)
	if typeof(parsed) != TYPE_DICTIONARY:
		_emit_error(Messages.ERR_INVALID_MESSAGE, "JSON parse failed or not object", "")
		return
	if not parsed.has("type"):
		_emit_error(Messages.ERR_INVALID_MESSAGE, "Missing 'type' field", "")
		return
	var cmd_type: String = parsed["type"]
	var payload = parsed.get("payload", {})

	match cmd_type:
		Messages.CMD_SCENE_LOAD:
			_handle_scene_load(payload)
		Messages.CMD_SCENE_UNLOAD:
			_handle_scene_unload(payload)
		Messages.CMD_CHARACTER_SET_EXTERNAL_CONTROL:
			_handle_character_set_external_control(payload)
		Messages.CMD_CHARACTER_SET_VELOCITY:
			_handle_character_set_velocity(payload)
		_:
			_emit_error(Messages.ERR_UNKNOWN_TYPE, "Unknown command: %s" % cmd_type, cmd_type)

func _handle_scene_load(payload) -> void:
	if typeof(payload) != TYPE_DICTIONARY or not payload.has("scene"):
		_emit_error(Messages.ERR_INVALID_MESSAGE, "SCENE_LOAD payload missing 'scene'", Messages.CMD_SCENE_LOAD)
		return
	var scene_name: String = payload["scene"]
	var path: String = SCENE_PATHS.get(scene_name, "")
	if path == "":
		_emit_error(Messages.ERR_HANDLER_ERROR, "Scene not registered: %s" % scene_name, Messages.CMD_SCENE_LOAD)
		return
	# main_scene 已通过 project.godot 自动加载,本期 demo 不在 runtime 切换。
	# 仅回 SCENE_LOADED 通知 RN(实际场景由 main_scene 配置加载)。
	_emit_event(Messages.scene_loaded(scene_name))

func _handle_scene_unload(payload) -> void:
	# 本期 demo 不支持 runtime unload(单 main_scene 模式),仅 silent ack
	pass

func _handle_character_set_external_control(payload) -> void:
	if typeof(payload) != TYPE_DICTIONARY or not payload.has("enabled"):
		_emit_error(Messages.ERR_INVALID_MESSAGE, "CHARACTER_SET_EXTERNAL_CONTROL payload missing 'enabled'", Messages.CMD_CHARACTER_SET_EXTERNAL_CONTROL)
		return
	var ch := _find_character()
	if ch == null:
		_emit_error(Messages.ERR_HANDLER_ERROR, "Character node not found (group 'character')", Messages.CMD_CHARACTER_SET_EXTERNAL_CONTROL)
		return
	ch.set_external_control(bool(payload["enabled"]))

func _handle_character_set_velocity(payload) -> void:
	if typeof(payload) != TYPE_DICTIONARY or not payload.has("x") or not payload.has("y"):
		_emit_error(Messages.ERR_INVALID_MESSAGE, "CHARACTER_SET_VELOCITY payload missing 'x'/'y'", Messages.CMD_CHARACTER_SET_VELOCITY)
		return
	var ch := _find_character()
	if ch == null:
		_emit_error(Messages.ERR_HANDLER_ERROR, "Character node not found (group 'character')", Messages.CMD_CHARACTER_SET_VELOCITY)
		return
	ch.set_external_velocity(Vector2(float(payload["x"]), float(payload["y"])))

func _find_character() -> Node:
	return get_tree().get_first_node_in_group("character")

# 业务 .gd 通过这个上报 event(走 RN ↔ GD 桥);bridge 内部 SCENE_LOADED /
# BRIDGE_ERROR 沿用私有 _emit_event。
func emit_event(event: Dictionary) -> void:
	_emit_event(event)

func _emit_event(event: Dictionary) -> void:
	event_emitted.emit(JSON.stringify(event))

func _emit_error(code: String, message: String, original_type: String) -> void:
	_emit_event(Messages.bridge_error(code, message, original_type))
