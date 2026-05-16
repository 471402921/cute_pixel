/**
 * WebSocketClient — stub for future external console / control frontend.
 *
 * 现状:本 demo 角色由 GD 端 autonomous 状态机驱动,**不**需要外部控制通道。
 * 用户后续会独立起一个前端 console 项目,通过 WebSocket 给 RN 发指令
 * (例如"切到外部控制模式"、"角色移动到 (x, y)"),RN 再桥到 GD。
 *
 * 退场条件:外部 console 落地时,本文件填实(连接 / 心跳 / 重连),
 * 同时 `services/godot/characterCommands.ts` 也对应实装 helper。
 * `useConnectionStatus` store 的状态由 WebSocketClient 推。
 *
 * 行为约定(避免启动期崩):**不 throw**,只 `Logger.warn`;接口方法签名先定,
 * future 实装填空(签名变化要发声明 deprecation)。
 */

import { Logger } from "../logging";

export type MessageHandler = (payload: unknown) => void;

export interface IWebSocketClient {
  connect(url: string): Promise<void>;
  send(payload: unknown): void;
  close(): void;
  onMessage(handler: MessageHandler): void;
}

class WebSocketClientStub implements IWebSocketClient {
  async connect(url: string): Promise<void> {
    Logger.warn("WebSocketClient not implemented; awaiting external console frontend", {
      method: "connect",
      url,
    });
  }

  send(payload: unknown): void {
    Logger.warn("WebSocketClient not implemented; awaiting external console frontend", {
      method: "send",
      payload,
    });
  }

  close(): void {
    Logger.warn("WebSocketClient not implemented; awaiting external console frontend", {
      method: "close",
    });
  }

  onMessage(_handler: MessageHandler): void {
    Logger.warn("WebSocketClient not implemented; awaiting external console frontend", {
      method: "onMessage",
    });
  }
}

export const webSocketClient: IWebSocketClient = new WebSocketClientStub();
