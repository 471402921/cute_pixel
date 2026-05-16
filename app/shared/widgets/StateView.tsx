/**
 * StateView<T> — 把 ViewState<T> 渲染成 loading / error / empty / data。
 *
 * 业务 Page 通过 <StateView state={...} renderData={...} /> 一行接住 store
 * 返回的 ViewState,不在 Page 里写 if/else。renderEmpty / renderError /
 * renderLoading 可覆盖,缺省给极简实现。
 *
 * 用法:
 *   const state = usePetStore((s) => s.pet);  // ViewState<Pet>
 *   return <StateView state={state} renderData={(pet) => <PetCard pet={pet} />} />;
 */

import type { ReactNode } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import type { Failure } from "../../services/error/Failure";
import type { ViewState } from "../../services/error/ViewState";

interface Props<T> {
  state: ViewState<T>;
  renderData: (data: T) => ReactNode;
  renderEmpty?: () => ReactNode;
  renderError?: (failure: Failure) => ReactNode;
  renderLoading?: () => ReactNode;
}

export function StateView<T>({
  state,
  renderData,
  renderEmpty = defaultEmpty,
  renderError = defaultError,
  renderLoading = defaultLoading,
}: Props<T>): ReactNode {
  switch (state.kind) {
    case "loading":
      return renderLoading();
    case "error":
      return renderError(state.failure);
    case "empty":
      return renderEmpty();
    case "data":
      return renderData(state.data);
  }
}

const defaultLoading = (): ReactNode => (
  <View style={styles.center}>
    <ActivityIndicator />
  </View>
);

const defaultEmpty = (): ReactNode => (
  <View style={styles.center}>
    <Text style={styles.muted}>无数据</Text>
  </View>
);

const defaultError = (failure: Failure): ReactNode => (
  <View style={styles.center}>
    <Text style={styles.errorTitle}>出错了</Text>
    <Text style={styles.muted}>{failure.message}</Text>
  </View>
);

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  muted: { color: "#999", fontSize: 14 },
  errorTitle: { color: "#c33", fontSize: 16, fontWeight: "600", marginBottom: 8 },
});
