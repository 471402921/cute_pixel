/**
 * ViewState<T> — store 与 Page 之间的标准状态形状。
 *
 * 业务 store 用 ViewState 包裹异步状态:loading / error / empty / data<T>。
 * Page 通过 <StateView state={...} renderData={...} /> 一行接住,
 * 不在 Page 里写 if-loading-else-if-error 分支。
 */

import type { Failure } from "./Failure";

export type ViewState<T> =
  | { kind: "loading" }
  | { kind: "error"; failure: Failure }
  | { kind: "empty" }
  | { kind: "data"; data: T };

export const ViewState = {
  loading: <T>(): ViewState<T> => ({ kind: "loading" }),
  error: <T>(failure: Failure): ViewState<T> => ({ kind: "error", failure }),
  empty: <T>(): ViewState<T> => ({ kind: "empty" }),
  data: <T>(data: T): ViewState<T> => ({ kind: "data", data }),
};
