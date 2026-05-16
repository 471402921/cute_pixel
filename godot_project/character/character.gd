extends CharacterBody2D

@export var speed: float = 100.0

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
