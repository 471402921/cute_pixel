---
id: ADR-006
title: Spec-driven 流水线与强门禁
date: 2026-05-10
status: Accepted
---

## Context

AI 与人都倾向"看到需求就写代码",导致:

- 代码与意图脱节(写完发现不是用户要的)
- 测试与验收标准脱节(为覆盖率而写的测试,不对照 AC)
- 跨模块决策无 audit trail(为什么这样设计,半年后没人记得)
- 文档永远跟不上代码(总是"等有空再补")

底座需要建立"PRD → TechPack → 实装 → review"分阶段流水线,每阶段由**机械门禁**强制拦截,不靠人/AI 自律。

## Decision

业务模块开发遵循以下流水线,每步由 skill 自动门禁拦截:

```
features 模块:  PRD → TechPack → module-gen → test-gen → review
core 服务:      ADR → TechPack → 手工实装 → review
```

### 门禁规则

- **PRD 未定稿不开 TechPack**(`/cute-pixel-doc-techpack` Step 0 检查 PRD status)
- **TechPack 未定稿不进 module-gen**(`/cute-pixel-module-gen` Step 0 检查 TechPack status)
- **PRD 验收标准(AC)未定稿不进 test-gen**(`/cute-pixel-test-gen` Step 0 检查 PRD §AC section)
- **core 服务实装无 ADR 不进 TechPack**(`/cute-pixel-doc-techpack` core 模式 Step 0 检查对应 ADR 存在)

### 例外机制(audit trail 必填)

`skip-spec: <原因>` 标记可越门禁,使用场景:

- prototype / spike / throwaway 代码
- 紧急 hotfix(再补 spec)
- 探索性原型,定型后回填 spec

原因写入生成代码的 binding 注释做 audit trail,例如:

```ts
// skip-spec: spike for Godot embed validation, will retrofit PRD before merge
```

## Alternatives Considered

- **不强制门禁,靠人/AI 自律**:实测在多模块协作下会快速漂移,半年内 spec 与代码脱钩;未选。
- **每步都先评审会议**:门禁退化为流程消耗,违背"机械检查不是评审"的初衷;未选。
- **文档后置(先代码后补文档)**:文档永远跟不上代码,且后补文档质量低于事前 spec;未选。
- **单一阶段(spec 与代码同步生成,LLM 一把梭)**:无法在阶段间做强门禁拦截,代码与 spec 互相 patch 不可控;未选。

## Consequences

### Skill 套件命名(沿用 `cute-pixel-*` 品牌)

| Skill | 职责 | 门禁 |
|---|---|---|
| `/cute-pixel-status` | 项目状态速查(读 manifest) | 无 |
| `/cute-pixel-doc-prd` | PRD 编写 | 无 |
| `/cute-pixel-doc-techpack`(features 模式) | TechPack 编写 | PRD 必须 Decided |
| `/cute-pixel-doc-techpack`(core 模式) | core 服务 TechPack | 对应 ADR 必须存在 |
| `/cute-pixel-module-gen` | 模块生成(`cp -r app/_template/` + 重命名) | PRD + TechPack 都 Decided |
| `/cute-pixel-test-gen` | 测试生成(按 PRD §AC 写 Jest / RNTL / Detox) | PRD §AC 必须 Decided |
| `/cute-pixel-review` | 架构与上下文健康度审核 | 软门禁(有 spec 则做对照,无则只走通用规则) |

### 门禁实现方式

- 每个 skill Step 0 用 Read 工具检查前置文件存在
- 检查 frontmatter `status: Decided`(或 PRD/TechPack 模板要求的特定字段)
- 缺失则**直接拒绝**,告诉用户缺什么、去哪个 skill 补,不自行推进
- 通过则进入正常 skill 流程

### PRD / TechPack 模板

- 模板放 `.claude/skills/cute-pixel-doc-prd/references/prd-template.md` 等
- skill 运行时读 `doc/architecture.md` / `doc/conventions.md` / `doc/pixel-foundation.md`(单一真理),**不抄规范到 skill 内部**
- 规范变了改 doc 就够,skill 不动

### skip-spec 审计流程

- 所有 skip-spec 标记由 `/cute-pixel-review` 收集列出,作为技术债清单
- 团队 weekly / sprint 检视清单,决定回填 spec 或正式接受为 throwaway

### 6 个 skill 在 Phase 4 重写

新底座骨架(Phase 3)稳定后,Phase 4 重写 6 个 skill:

- module-gen 改为 `cp -r app/_template/` + 重命名 + 跑 `pnpm typecheck` + `pnpm lint` + `pnpm test`
- test-gen 改为生成 Jest + RNTL + Detox 测试文件,模板针对 Zustand store / RN Component / Detox e2e
- review 改为 4 条铁律检查 + 12 条 conventions 检查 + spec 一致性扫描(features 看 PRD+TechPack;core 看 ADR+core TechPack)
- 其他类似平移

## Related ADRs

- [ADR-001](ADR-001-react-native-as-app-framework.md) — 应用主框架(决定 skill 操作的代码语言/工具链)
- [ADR-005](ADR-005-godot-as-asset-editor.md) — Godot 编辑器作为 asset 编排(skill 不操作 Godot 资源,设计师在编辑器内完成)
