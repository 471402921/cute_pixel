/**
 * Logger — 日志门面(conventions §5)
 *
 * 业务代码**只**用 Logger,不直接 console.log。dev 走 console,prod 留
 * Sentry / 后端 endpoint 接入点(`setProdSink` 注入)。
 *
 * 用法:
 *   import { Logger } from "@/services/logging";
 *   Logger.info("user feed pet", { petId, foodType });
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface ILogger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

type ProdSink = (level: LogLevel, message: string, context?: Record<string, unknown>) => void;

let prodSink: ProdSink | null = null;

/** 在 app 启动期注入 prod 后端(Sentry / 自家 endpoint),不注入则 prod 静默。 */
export function setProdSink(sink: ProdSink | null): void {
  prodSink = sink;
}

const emit = (level: LogLevel, message: string, context?: Record<string, unknown>): void => {
  if (__DEV__) {
    const fn = level === "warn" ? console.warn : level === "error" ? console.error : console.log;
    fn(`[${level}] ${message}`, context ?? "");
  } else if (prodSink !== null) {
    prodSink(level, message, context);
  }
};

export const Logger: ILogger = {
  debug: (message, context) => emit("debug", message, context),
  info: (message, context) => emit("info", message, context),
  warn: (message, context) => emit("warn", message, context),
  error: (message, context) => emit("error", message, context),
};
