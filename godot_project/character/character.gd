extends CharacterBody2D

@export var speed: float = 100.0

# 活动区相对 viewport 的额外内缩(避开墙 + 家具区 → 角色只在地板活动)
# 用 ratio 而不是绝对像素,跟 stretch mode "viewport+expand" 拉伸后的实际 viewport 自适应。
# 顶部默认 30%(墙 + 家具区);左右下默认 0(贴 viewport 边)。
@export var play_area_ratio_inset: Vector4 = Vector4(0.0, 0.30, 0.0, 0.15)  # left, top, right, bottom

const Messages = preload("res://proto/messages.gd")

var _state_tick := 0

@onready var sprite = $AnimatedSprite2D

# 外部控制(future WebSocket 来的 direction)
var external_control_enabled := false
var external_velocity := Vector2.ZERO

# 自主行为状态机
var _action_timer := 0.0
var _action_duration := 0.0
var _action_direction := Vector2.ZERO
var _current_action: String = "idle"  # "idle" | "walk"

func _ready() -> void:
	add_to_group("character")
	_pick_new_action()

func _physics_process(delta: float) -> void:
	if external_control_enabled:
		velocity = external_velocity
		_update_animation(external_velocity)
	else:
		_action_timer += delta
		if _action_timer >= _action_duration:
			_pick_new_action()
		if _current_action == "walk":
			velocity = _action_direction * speed
		else:
			velocity = Vector2.ZERO
		_update_animation(velocity)
	move_and_slide()
	_clamp_to_viewport()
	_state_tick += 1
	if _state_tick >= 12:  # 60Hz / 12 = 5Hz
		_state_tick = 0
		_emit_state()

func _emit_state() -> void:
	var bridge := get_tree().root.get_node_or_null("MessageBridge")
	if bridge == null:
		return
	var control_mode := "external" if external_control_enabled else "autonomous"
	var anim_name := String(sprite.animation) if sprite != null else ""
	var ev := Messages.character_state(global_position, anim_name, control_mode)
	bridge.emit_event(ev)

# 临时防御:wall.tres 还没配 physics_layer 时,防止 autonomous walk 出 viewport。
# 运行时读 viewport / camera,不 hardcode。设计师补 wall collision 后这段为冗余。
# 撞边 → 立即 re_pick_action(idle 或反方向),避免贴边抖动。
func _clamp_to_viewport() -> void:
	if external_control_enabled:
		return
	var vp := get_viewport()
	if vp == null:
		return
	var cam := vp.get_camera_2d()
	if cam == null:
		return
	var view_size: Vector2 = vp.get_visible_rect().size / cam.zoom
	var view_min: Vector2 = cam.global_position - view_size * 0.5
	var view_max: Vector2 = cam.global_position + view_size * 0.5
	var sprite_margin := 30.0
	var before := global_position
	var min_x: float = view_min.x + sprite_margin + view_size.x * play_area_ratio_inset.x
	var min_y: float = view_min.y + sprite_margin + view_size.y * play_area_ratio_inset.y
	var max_x: float = view_max.x - sprite_margin - view_size.x * play_area_ratio_inset.z
	var max_y: float = view_max.y - sprite_margin - view_size.y * play_area_ratio_inset.w
	global_position.x = clamp(global_position.x, min_x, max_x)
	global_position.y = clamp(global_position.y, min_y, max_y)
	if before != global_position:
		_pick_new_action()

# RN 侧通过 MessageBridge dispatch 调用(future WebSocket)
func set_external_control(enabled: bool) -> void:
	external_control_enabled = enabled
	if not enabled:
		_pick_new_action()

func set_external_velocity(v: Vector2) -> void:
	external_velocity = v

func _pick_new_action() -> void:
	if randi() % 2 == 0:
		_current_action = "idle"
		_action_duration = randf_range(1.5, 3.0)
		_action_direction = Vector2.ZERO
	else:
		_current_action = "walk"
		var angle = randf_range(0.0, TAU)
		_action_direction = Vector2(cos(angle), sin(angle)).normalized()
		_action_duration = randf_range(2.0, 5.0)
	_action_timer = 0.0

func _update_animation(v: Vector2) -> void:
	if v == Vector2.ZERO:
		sprite.play("idle_south")
		return
	if abs(v.x) > abs(v.y):
		if v.x > 0:
			sprite.play("walk_east")
		else:
			sprite.play("walk-west")
	else:
		if v.y > 0:
			sprite.play("walk_south")
		else:
			sprite.play("walk-north")
