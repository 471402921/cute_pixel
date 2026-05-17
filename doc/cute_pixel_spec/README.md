# cute_pixel_spec

像素风 React Native + Godot 通用底座的文档草稿区。这里的内容稳定后整体复制到新仓 `doc/`,本目录归档。

## 内容

| 文件 | 用途 | Status |
|---|---|---|
| `architecture.md` | 模块边界 / 依赖规则 / 目录结构 / 轻 DDD 视角 | Decided(B1 验证 + ADR-007 后小修) |
| `conventions.md` | 编码标准 / 错误 / i18n / 测试 / lint / worklet / native build patches / bridge fail-soft / scene 生命周期 | Decided(B1 验证后追加 §13-14;ADR-007 后追加 §15-16) |
| `pixel-foundation.md` | RN ↔ Godot 嵌入范式 / GodotProvider + PixelView Portal / message bus / 灯光 / 业务实体 | Decided(B1 验证后大改;ADR-007 后追加通信契约) |
| `decisions/` | ADR(架构决策记录) | 全部 Accepted |
| `_B1_REPORT.md` | B1 集成验证报告(react-native-godot example 跑通过程 + 决策影响) | Final(2026-05-11) |

## ADR 状态速查

| ADR | 主题 | Status | 备注 |
|---|---|---|---|
| ADR-001 | React Native as App Framework | Accepted | 2026-05-11 修订(版本 pin + Expo modules 范围) |
| ADR-002 | Godot as Pixel Engine via react-native-godot | Accepted | 2026-05-11 修订(Godot 4.5.x pin + Engine 生命周期 + PixelView Portal) |
| ADR-003 | State Management: Zustand | Accepted | |
| ADR-004 | RN Bare workflow + Expo modules,配套工具链 | Accepted | 2026-05-11 修订(yarn 4 / Expo modules / 版本锁全套) |
| ADR-005 | Godot 编辑器作为 Asset 编排工具 | Accepted | |
| ADR-006 | Spec-driven 流水线与强门禁 | Accepted | |
| ADR-007 | RN ↔ Godot 通信契约 v0.1 | Accepted | 2026-05-15 加(message bus + 状态权属 + proto/) |

## 写作纪律

- 只讲底座**是什么、怎么用、为什么这样设计**;不写历史叙事,不引用旧技术栈
- 底座 doc 与业务 doc 严格分离:
  - **底座**:跨业务可复用,任何"app shell + 嵌入像素世界"形态的产品都用得上(养宠 / 种菜 / 养鱼 / 学习陪伴 / 小镇 demo 等)
  - **业务**(如 IoT 项圈、地图 LBS、传感器融合等):只属于具体 app,不进底座 ADR
- 业务能力可作为"底座选型时的扩展面考虑",但不进底座功能义务
- ADR 编号从 001 起,不 supersede 任何外部 ADR
- 内容稳定后整体复制到新仓 `doc/`,本目录在新仓建立后归档(可保留作历史快照,不维护)
