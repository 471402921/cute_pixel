/**
 * GameClock — 统一时间源(conventions §12)
 *
 * 业务代码**不直接** 用 `Date.now()` / `new Date()`,统一走 GameClock,
 * 单测时注入 FakeClock 避免依赖真实时钟。
 *
 * 用法:
 *   import { GameClock } from "@/services/time";
 *   const now = GameClock.now();
 *   const unsubscribe = GameClock.subscribe(1000, (t) => { ... });
 *
 *   // 测试:
 *   const fake = new FakeClock(1000);
 *   fake.advance(5000);
 */

export interface IGameClock {
  /** 当前时间(ms since epoch)。 */
  now(): number;
  /** 每 `intervalMs` 触发 callback;返回 unsubscribe。 */
  subscribe(intervalMs: number, callback: (now: number) => void): () => void;
}

class RealClock implements IGameClock {
  now(): number {
    return Date.now();
  }
  subscribe(intervalMs: number, callback: (now: number) => void): () => void {
    const id = setInterval(() => callback(Date.now()), intervalMs);
    return () => clearInterval(id);
  }
}

/**
 * 测试用的 FakeClock。配合 `jest.useFakeTimers()` 使用,subscribe 内部的
 * setInterval 会被 jest 接管;直接读 .now() 拿当前虚拟时间。
 */
export class FakeClock implements IGameClock {
  private current: number;

  constructor(initial = 0) {
    this.current = initial;
  }

  now(): number {
    return this.current;
  }

  subscribe(intervalMs: number, callback: (now: number) => void): () => void {
    const id = setInterval(() => {
      this.current += intervalMs;
      callback(this.current);
    }, intervalMs);
    return () => clearInterval(id);
  }

  /** 设置当前虚拟时间。 */
  set(ms: number): void {
    this.current = ms;
  }

  /** 推进虚拟时间(不触发 subscribers——用 `jest.advanceTimersByTime` 触发)。 */
  advance(ms: number): void {
    this.current += ms;
  }
}

export const GameClock: IGameClock = new RealClock();
