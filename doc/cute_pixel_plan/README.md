# cute_pixel_plan

像素风 React Native + Godot 通用底座的文档草稿区。这里的内容稳定后整体复制到新仓 `doc/`,本目录归档。

## 内容

| 文件 | 用途 | Status |
|---|---|---|
| `architecture.md` | 模块边界 / 依赖规则 / 目录结构 | Outline |
| `conventions.md` | 编码标准 / 错误 / i18n / 测试 / lint | Outline |
| `pixel-foundation.md` | RN ↔ Godot 嵌入范式 / 灯光 / 业务实体在像素世界 | Outline |
| `decisions/` | ADR(架构决策记录) | 部分 Decided,其余 Draft |

## ADR 状态速查

| ADR | 主题 | Status |
|---|---|---|
| ADR-001 | React Native as App Framework | Accepted |
| ADR-002 | Godot as Pixel Engine via react-native-godot | Accepted |
| ADR-003 | State Management: Zustand | Draft(Day 0 已拍,正文待填) |
| ADR-004 | RN Bare Workflow & 工具链 | Draft |
| ADR-005 | Godot 编辑器作为 Asset 编排工具 | Draft |
| ADR-006 | Spec-driven 流水线与强门禁 | Draft |

## 写作纪律

- 只讲底座**是什么、怎么用、为什么这样设计**;不写历史叙事,不引用旧技术栈
- 底座 doc 与业务 doc 严格分离:
  - **底座**:跨业务可复用,任何"app shell + 嵌入像素世界"形态的产品都用得上(养宠 / 种菜 / 养鱼 / 学习陪伴 / 小镇 demo 等)
  - **业务**(如 cute_pet 的 IoT 项圈、地图 LBS 等):只属于具体 app,不进底座 ADR
- 业务能力可作为"底座选型时的扩展面考虑",但不进底座功能义务
- ADR 编号从 001 起,不 supersede 任何外部 ADR
- 内容稳定后整体复制到新仓 `doc/`,本目录在新仓建立后归档(可保留作历史快照,不维护)
