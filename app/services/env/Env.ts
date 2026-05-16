/**
 * Env — 启动期 env 校验
 *
 * 每个 app 定义自己的 zod schema,在 app 入口调一次 `validateEnv`:
 *
 *   const envSchema = z.object({
 *     API_BASE_URL: z.string().url(),
 *     ENV: z.enum(["dev", "staging", "prod"]),
 *   });
 *   export const env = validateEnv(envSchema, process.env);
 *
 * 失败时**立即抛错**——启动期就崩,不是某次 API 调用时才发现 BASE_URL 缺失。
 */

import type { z } from "zod";

export function validateEnv<T>(schema: z.ZodType<T>, raw: Record<string, string | undefined>): T {
  const result = schema.safeParse(raw);
  if (!result.success) {
    const detail = result.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment variables:\n${detail}`);
  }
  return result.data;
}
