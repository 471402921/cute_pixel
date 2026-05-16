# services/realtime

外部 console / 控制前端的接入点占位。

## 现状(B2 第一个 demo:cute_pet)

角色由 GD 端 autonomous 状态机驱动,RN 不需要外部控制通道。`WebSocketClient` 是
**stub**——所有方法只 `Logger.warn`、**不 throw**,保证 app 启动期不崩。
`useConnectionStatus` 默认 `"disconnected"`,RoomPage 顶部 `ConnectionIndicator`
渲染灰色"● 未连接"。

## 退场条件

用户独立起前端 console 项目并接入时,本目录:

1. 实装 `WebSocketClient`:连接 / 心跳 / 重连 / 鉴权
2. 在 connect / close / error 回调里 `useConnectionStatus.setStatus / setError`
3. 解析进来的消息,桥到 `services/godot/characterCommands.*` 系列(同时也要扩
   `proto/messages.ts` 的 Command 集合,例如 `CHARACTER_SET_EXTERNAL_CONTROL`)

之后这个目录从 "stub" 升到 "in-use"。

## 设计依据

- 放在 `services/`(铁律 #3):无业务态,无 React tree 依赖,跨模块复用
- store 与 client 解耦:store 只关心"状态展示",client 负责 IO
- stub 不 throw:`web-app` 启动期任何 service 崩都会导致黑屏,fail-soft 是底线
