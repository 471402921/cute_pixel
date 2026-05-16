/**
 * Failure — 统一的错误 discriminated union(conventions §1)
 *
 * 业务代码**不直接** try/catch HTTP 异常或 zod parse 失败,services/network/
 * 拦截器把它们映射成 Failure;store 把 Failure 装进 ViewState<T>;Page 用
 * <StateView /> 渲染。
 *
 * 加新的 Failure 类型时:在 union 里加一支,在 namespace 里加 factory,
 * 确保 store 层永远拿到强类型可分支处理的对象。
 */

import type { z } from "zod";

export type Failure =
  | { kind: "network"; message: string; cause?: unknown }
  | { kind: "server"; status: number; message: string; cause?: unknown }
  | { kind: "validation"; message: string; issues?: z.core.$ZodIssue[] }
  | { kind: "forbidden"; message: string }
  | { kind: "not-found"; message: string }
  | { kind: "auth"; message: string }
  | { kind: "unknown"; message: string; cause?: unknown };

export const Failure = {
  network: (message: string, cause?: unknown): Failure => ({ kind: "network", message, cause }),
  server: (status: number, message: string, cause?: unknown): Failure => ({
    kind: "server",
    status,
    message,
    cause,
  }),
  validation: (message: string, issues?: z.core.$ZodIssue[]): Failure => ({
    kind: "validation",
    message,
    issues,
  }),
  forbidden: (message: string): Failure => ({ kind: "forbidden", message }),
  notFound: (message: string): Failure => ({ kind: "not-found", message }),
  auth: (message: string): Failure => ({ kind: "auth", message }),
  unknown: (message: string, cause?: unknown): Failure => ({ kind: "unknown", message, cause }),
};

export const isFailure = (e: unknown): e is Failure =>
  typeof e === "object" && e !== null && "kind" in e && "message" in e;
