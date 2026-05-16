# shared/route-args/

跨模块路由参数类型,文件名 `{module}RouteArgs.ts`,导出 `XxxRouteArgs` 类型。

**为什么不放模块内**:任何 feature 调用方都需要 import 它来构造强类型的 `navigation.navigate(...)`——放模块内会触发铁律 #1(`features/A/` 不能 import `features/B/` 内部)。

目前为空。
