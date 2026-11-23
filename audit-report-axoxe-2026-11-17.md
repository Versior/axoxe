# AXOXE 全面深度审查报告

**Project:** AXOXE  
**Audit mode:** full（19 个维度）  
**Date:** 2026-11-17  
**Reviewer:** Boop（Codex）  
**Baseline:** `f847ce6454941382eb6f9e7fcd31a316263c9364`，分支 `brand/axoxe`  
**Scope:** 源码、配置、测试、构建及隔离运行验证；本轮没有修复业务代码、提交或公开发布发现。

---

## 1. Executive Summary

少爷，项目有清晰的 Go 分层、统一授权 vocabulary、Wire 装配和较完整的开发文档。后端竞态测试、主站 188 项测试、CLI 134 项测试及三个 Web 项目的构建均通过。它具备可维护的基础，当前不需要整体重写。

但是，已复现的缺陷集中在安全状态和多资源生命周期：默认公开文件根目录可读快照及暂存 DB；私密记录的附件仍可匿名下载；已删除令牌重启后再次有效；只有记录写权限的令牌能借嵌套 ORM 对象创建文件。删除共享附件、并发快照、缺媒体导入和自定义存储根目录也存在真实错误。**现状不能据“测试绿色”判定适合无额外保护地公开部署，F01 应立即阻断。**

共收录 **26 项发现：25 项 Confirmed、1 项 Suspected**。Confirmed 表示已运行复现或控制流/配置事实明确，并不表示每条都做过线上复现。每张卡片单独标注验证依据；没有将依赖扫描的模块级提示、单纯大文件或无当前调用的潜在风险升级为漏洞。

### Score Dashboard

```text
Security         ████░░░░░░  3.5  C  静态目录泄漏、持久撤销缺失和写入 DTO 权限绕过构成已复现安全风险。
Stability        █████░░░░░  4.5  C  共享附件删除、迁移完整性与快照并发存在跨资源一致性问题。
Performance      ███████░░░  6.5  B  已有分页和虚拟列表，但 HTTP/上传/归档资源预算不完整，缓存增长待测。
Testing          ███████░░░  6.5  B  真实 DB 测试和竞态检查有价值，但高覆盖未验证关键生命周期，主站 CI 门禁缺失。
Maintainability  ███████░░░  7.0  A  分层、DI 与领域文档清晰；主要维护成本集中在存储、迁移和认证传输边界。
Design           ██████░░░░  6.0  B  模块内分层较好，但安全事实用了易失缓存，读模型进入写边界，多资源状态不一致。
Release          ██████░░░░  5.5  B  多项目构建通过；默认签名值、漂移门禁及未冻结/未校验的构建输入仍需处理。
Overall          ██████░░░░  5.6  B
```

评分是基于本次证据的工程判断，10 分最好，综合分为七维算术平均。分数不是安全认证；一个 Critical 发现也足以阻断公开发布。

### Finding Statistics

| Severity | Count | Confirmed | Suspected |
|---|---:|---:|---:|
| Critical | 1 | 1 | 0 |
| High | 9 | 9 | 0 |
| Medium | 16 | 15 | 1 |
| Low | 0 | 0 | 0 |
| Info | 0 | 0 | 0 |
| **Total** | **26** | **25** | **1** |

## 2. Project Map

| 子系统 | 入口与数据流 | 本次重点边界 |
|---|---|---|
| Go 服务 | cmd/ech0 → bootstrap → Wire → job/task/server；handler → service → repository → SQLite | JWT、scope/audience、写事务、公开静态媒体 |
| 主站 web | Vue/Pinia → JSON request 或 SSE → Go API；Vite 产物嵌入二进制 | 认证刷新、草稿归属、附件写入与聊天流 |
| Migrator/Storage | 上传 ZIP → 解压 → DB/媒体导入；SQLite 一致副本 → ZIP → 本地/S3 | 目录隔离、资源完整性、并发、取消、路径配置 |
| Agent/MCP/OAuth | 外向工具调用与内向 scope 授权；事件订阅处理副作用 | 授权集中化、SSRF、外部请求与流生命周期 |
| hub | Vue 公开目录 → 外部实例探测/合并 feed | URL 校验、并发限制、超时、跨实例数据 |
| site | React Router 静态文档/营销站 | Markdown 链接和渲染、构建、路由 |
| apps/cli | Bun CLI → 生成 OpenAPI 客户端 → API；Keychain/文件凭据 | 请求刷新、输出脱敏、凭据权限、发布 |
| pkg / CI / charts | Busen、VireFS、egress、日志库；多架构构建与 Helm | 解码成本、生命周期、构建输入和默认机密 |

### 覆盖与限制

- 清点 1,844 个跟踪文件、1,318 个代码/脚本文件。全仓清点与风险模式检索覆盖 Go、TS/Vue/React、脚本、Chart、工作流；深读集中在入口、权限、存储/迁移、缓存、事件/外部请求、关键前端状态、CLI 和关联测试。
- **这不是 1,318 个文件逐行完成证明或完整渗透测试。** 生成 mocks、OpenAPI 客户端、构建产物及设计演示不按手写业务代码统计复杂度。高价值路径已沿调用链验证，其他区域采用检索与抽查。
- HTTP 探针全部运行在临时实例、随机测试凭据和临时数据库上；没有读取生产内容或修改线上配置。直接确认的存储泄漏是默认本地模式，S3 实际桶策略未验证。
- 未运行 Docker/Kubernetes/真实 S3、多用户并发压测、长时间内存压测或完整浏览器可视化 QA；没有扫描整个 Git 历史。结果只对应上述基线。
- 未原地运行会格式化/重生成文件的 `just check`；本次执行了非修改模式的前端 lint/format/style/i18n、后端 lint 和构建测试。Wire/OpenAPI/mocks 未重新生成核验漂移。
- 本次主站 Node 使用 26.3.1、Go 1.27.4。实际 pnpm 10.34.5 与声明 12.14.0 不同；Bun 1.3.14 低于 CLI 声明的 1.4.4。通过表示该环境已验证，不能替代声明运行时及 Linux 双架构验证。

### 验证结果

| 验证 | 结果 | 实际边界 |
|---|---|---|
| go build ./... | 通过 | 当前主机 Go/CGO |
| go test -race -coverprofile=… ./... | 通过 | 全量 Go 测试，最终独立运行 |
| golangci-lint run | 通过 | 当前基线静态检查 |
| 主站 Vitest | 33 个文件、188 项通过 | 自动行为回归 |
| 主站 build | 通过 | 类型检查及生产打包 |
| 主站 ESLint/Prettier/Stylelint/i18n | 全部通过 | 使用非修改检查模式 |
| Hub build | 通过 | 使用 ignore-scripts，避免 prebuild 自动安装修改依赖 |
| Site build / typecheck | 通过 | 文档站打包与类型检查 |
| CLI test / typecheck | 134 项通过 / 通过 | 本机 Bun 版本，未构建全部发布目标 |
| 真实 HTTP+SQLite 探针 | 已复现 F01–F05、F13、F14 等 | 测试数据，非线上 |
| 临时 Go 故障探针 | 已复现 F06–F08、F12 | 真实实现、隔离目录与 DB |
| 生产依赖扫描 | 主站 audit 0 公告；Go 仅模块级提示 | 不代表所有模块/历史无风险 |

首次 Go 测试与 Vite 构建同时运行，Vite 清空嵌入目录造成编译失败。这是本次验证调度的冲突；待前端构建完成后独立重跑已通过，没有计作项目缺陷。

后端覆盖率：原始 **47.8%**；去除生成 mocks/Wire 后 **67.6%**。按目录汇总，记录服务 **95.5%**、认证服务 **69.4%**、迁移服务 **91.7%**、快照包 **40.4%**。这是语句覆盖率，不能直接推出跨进程/跨资源语义正确。

## 3. Top Risks

| 优先级 | 发现 | 严重度 | 主要影响 |
|---:|---|---|---|
| 1 | [F01](#f01) 公开文件路由暴露快照、数据库暂存文件和目录索引 | Critical | 一份实际快照可暴露全部私密记录、用户资料、认证数据及数据库中的集成凭据。目录索引降低了发现文件名的成本。 |
| 2 | [F02](#f02) 私密记录的附件仍可匿名下载 | High | 私密图片、音频或视频内容可被知道 URL 的匿名访客读取 |
| 3 | [F03](#f03) 已删除的访问令牌在进程重启后恢复有效 | High | 管理员删除泄漏或不再信任的令牌后，无法保证持续撤销。SetWithTTL 的接受结果也被忽略，因此不能把缓存写入当作可靠安全提交。 |
| 4 | [F04](#f04) 写入 DTO 的嵌套 ORM 文件对象绕过 file:write | High | 文件写权限边界被绕过，客户端还可指定路由键、存储类型、user_id 等本应由文件服务决定的字段，制造不可信或悬空的关联。 |
| 5 | [F05](#f05) 删除一条记录会物理删除另一条记录共享的附件 | High | 仍存在的记录变成破损内容 |
| 6 | [F06](#f06) 并发快照互删固定 staging 目录并可能撞名 | High | 正常同时导出会失败，正在打包或上传的文件可能被另一个任务删除，备份可靠性受损。 |
| 7 | [F07](#f07) 导入附件缺失仍上报全部成功 | High | 图片等内容永久缺失 |
| 8 | [F08](#f08) 快照与导入忽略自定义本地存储根目录 | High | 看似完整的快照遗漏附件 |
| 9 | [F09](#f09) Helm 默认带有共用 JWT 签名值 | High | 满足默认部署条件时，攻击者有机会伪造签名有效的 JWT，破坏认证边界。此处没有证据表明现有线上实例用了默认值。 |
| 10 | [F10](#f10) 密码登录缺少应用层限流或尝试锁定 | High | 弱密码账户面对持续在线猜测 |

## 4. Detailed Findings

<a id="f01"></a>

### Finding: F01 — 公开文件路由暴露快照、数据库暂存文件和目录索引

- Severity: **Critical**
- Confidence: High
- Category: Security
- Status: **Confirmed**
- Affected area: 本地文件路由 / 数据导入导出
- Evidence:
  - File: [internal/router/router.go](</Users/versior/Desktop/AXOXE/internal/router/router.go:52>)
  - File: [internal/migrator/artifact/artifact.go](</Users/versior/Desktop/AXOXE/internal/migrator/artifact/artifact.go:20>)
  - File: [internal/migrator/snapshot/writer.go](</Users/versior/Desktop/AXOXE/internal/migrator/snapshot/writer.go:105>)
  - Function / Module: `setupStaticFiles / artifact.Slot / snapshot.Create`
  - Relevant behavior: 整个 Storage.DataRoot 被无认证 StaticFS 挂到 /api/files；默认根目录包含 snapshots、capsules、tmp。快照写入一致数据库副本 ech0.db。
  - 验证依据: 隔离二进制中 /api/files/、/api/files/snapshots/、假 ZIP 和 tmp 下假 DB 均匿名 HTTP 200。仅使用测试文件，未访问线上快照。
- Problem: 公开媒体与敏感导出产物共用同一个可浏览的文件根目录，静态安全中间件只设置 MIME、下载和缓存头。认证的导出接口无法保护匿名静态下载这条旁路。
- Why it matters: 一份实际快照可暴露全部私密记录、用户资料、认证数据及数据库中的集成凭据。目录索引降低了发现文件名的成本。
- Realistic failure scenario: 默认本地存储实例执行手动或定时快照后，匿名访客枚举 /api/files/snapshots/ 并下载 ZIP；迁移解压期间也可访问 tmp 中的数据库。
- Minimal fix: 立即拒绝 snapshots、capsules、tmp 的所有静态请求并关闭目录索引；将这些目录移出公开根目录，产物下载只经已认证的导出接口。仅关闭目录索引不足以拦住已知 URL。
- Better long-term fix: 明确公开媒体根目录与私有产物根目录，路由只映射允许公开的文件集合。
- Regression test suggestion: 用真实 router 和临时目录创建假 ZIP/DB，匿名访问保留目录及已知文件均应 403/404；正常公开图片保持可读，认证导出下载成功。
- Estimated effort: **紧急阻断 1–2 小时；目录迁移及兼容验证 0.5–1 天**

<a id="f02"></a>

### Finding: F02 — 私密记录的附件仍可匿名下载

- Severity: **High**
- Confidence: High
- Category: Security
- Status: **Confirmed**
- Affected area: 记录隐私 / 附件分发
- Evidence:
  - File: [internal/middleware/staticfile.go](</Users/versior/Desktop/AXOXE/internal/middleware/staticfile.go:20>)
  - File: [internal/service/echo/echo.go](</Users/versior/Desktop/AXOXE/internal/service/echo/echo.go:329>)
  - Function / Module: `GetEchoById / StaticFileSecurity`
  - Relevant behavior: 记录读取检查 Private；本地附件 URL 经公开 StaticFS 读取，不检查文件与私密记录的关联，还给媒体设置 public、immutable 缓存。
  - 验证依据: 端到端：匿名记录 HTTP 400，匿名附件 HTTP 200，下载字节与刚上传的测试 PNG 完全一致。已确认本地存储路径；未验证真实 S3 桶策略。
- Problem: 正文隐私和媒体隐私没有使用同一访问策略。把记录设为私密，并不会收回其附件的访问权。
- Why it matters: 私密图片、音频或视频内容可被知道 URL 的匿名访客读取；当前目录索引还能帮助枚举。
- Realistic failure scenario: 上传图片并发布为 private，匿名 GET 记录被拒绝，但匿名 GET 该图片 URL 成功。
- Minimal fix: 为私密媒体使用鉴权下载路径，并禁止对应物理文件通过公开静态路由访问；按文件实际可见性设置缓存策略。
- Better long-term fix: 文件可见性从授权关联推导；对象存储需要私有对象或短期签名 URL，共享附件的公开/私密语义必须明确。
- Regression test suggestion: 上传真实图片到 private 记录，匿名读取正文和图片都被拒绝，授权用户可读；另测共享公开引用及从公开改私密的缓存行为。
- Estimated effort: **1–2 天，包含本地路由与存储语义验证**

<a id="f03"></a>

### Finding: F03 — 已删除的访问令牌在进程重启后恢复有效

- Severity: **High**
- Confidence: High
- Category: Security
- Status: **Confirmed**
- Affected area: 访问令牌撤销 / 会话撤销
- Evidence:
  - File: [internal/repository/auth/auth.go](</Users/versior/Desktop/AXOXE/internal/repository/auth/auth.go:48>)
  - File: [internal/middleware/auth.go](</Users/versior/Desktop/AXOXE/internal/middleware/auth.go:53>)
  - File: [internal/service/setting/access_token_service.go](</Users/versior/Desktop/AXOXE/internal/service/setting/access_token_service.go:58>)
  - Function / Module: `AuthRepository.RevokeToken / resolveViewer / DeleteAccessToken`
  - Relevant behavior: 撤销 JTI 仅存入 Ristretto，验签后只查这个内存黑名单；访问令牌数据库记录的删除不参与每次认证。
  - 验证依据: 真实临时实例结果：删除前 200，删除后 401，同库同密钥重启后 200。未使用任何现有凭据。
- Problem: 令牌撤销是安全事实，却依赖可丢失、可淘汰的缓存。固定 JWT 签名密钥的实例重启后丢失黑名单，仍在有效期内的旧 JWT 可以重新通过认证。
- Why it matters: 管理员删除泄漏或不再信任的令牌后，无法保证持续撤销。SetWithTTL 的接受结果也被忽略，因此不能把缓存写入当作可靠安全提交。
- Realistic failure scenario: 创建 profile:read/cli 令牌，删除，保持数据库与签名密钥不变重启，再拿旧令牌读取 /api/user。
- Minimal fix: 持久化撤销状态，或验证 access 类型令牌对应的存活记录；缓存只加速已持久化的判断。补齐注销刷新令牌等同类撤销路径。
- Better long-term fix: 给访问令牌和刷新会话设统一、持久的有效性来源，JTI/会话版本成为授权事实。
- Regression test suggestion: 真实 SQLite：签发→使用 200→删除后 401→重建 repository/cache/服务后仍 401；再测缓存淘汰、过期和注销。
- Estimated effort: **1–2 天，包含数据模型与认证回归**

<a id="f04"></a>

### Finding: F04 — 写入 DTO 的嵌套 ORM 文件对象绕过 file:write

- Severity: **High**
- Confidence: High
- Category: Security
- Status: **Confirmed**
- Affected area: POST/PUT /api/echo / 写入边界
- Evidence:
  - File: [internal/model/echo/echo_dto.go](</Users/versior/Desktop/AXOXE/internal/model/echo/echo_dto.go:18>)
  - File: [internal/model/file/file.go](</Users/versior/Desktop/AXOXE/internal/model/file/file.go:44>)
  - File: [internal/service/echo/echo.go](</Users/versior/Desktop/AXOXE/internal/service/echo/echo.go:696>)
  - Function / Module: `EchoUpsertDto.ToModel / validateSingleFileCategory / GORM Create`
  - Relevant behavior: EchoUpsertDto 直接接受 EchoFile ORM 类型及其嵌套 File，ToModel 原样传入；分类校验未确认全部请求 ID 都已加载，GORM 自动保存嵌套关联。
  - 验证依据: 实际结果：直接文件接口 HTTP 403；嵌套记录请求 HTTP 200/code=1，数据库新增 1 个指定 ID 的文件行。
- Problem: 接口说明声称 file 元数据会被忽略，但实现会把它当作写入对象。一个被授予 echo:write 的管理员访问令牌可以通过这条路径创建文件行。
- Why it matters: 文件写权限边界被绕过，客户端还可指定路由键、存储类型、user_id 等本应由文件服务决定的字段，制造不可信或悬空的关联。
- Realistic failure scenario: 使用仅有 echo:write 的 cli 令牌，直接登记外链文件被拒绝；在记录请求的 echo_files 中提供未知 file_id 和嵌套 file 后成功插入文件。
- Minimal fix: 写入附件 DTO 只保留 file_id 与 sort_order；服务按 ID 读取真实文件并验证 ID 集合完整及引用权限；持久化时避免从请求自动创建 File。
- Better long-term fix: 读模型、写命令和 ORM 模型保持独立，让响应里的丰富元数据不能反向成为写权限。
- Regression test suggestion: 真实 router+DB：echo:write 无法通过嵌套 File 创建文件；未知 ID 被拒绝且没有文件/记录残留；合法已上传附件仍能引用。
- Estimated effort: **0.5–1 天，包含 OpenAPI/客户端类型更新**

<a id="f05"></a>

### Finding: F05 — 删除一条记录会物理删除另一条记录共享的附件

- Severity: **High**
- Confidence: High
- Category: Stability
- Status: **Confirmed**
- Affected area: 记录删除 / 文件关联生命周期
- Evidence:
  - File: [internal/service/echo/echo.go](</Users/versior/Desktop/AXOXE/internal/service/echo/echo.go:134>)
  - File: [internal/repository/file/file.go](</Users/versior/Desktop/AXOXE/internal/repository/file/file.go:154>)
  - Function / Module: `DeleteEchoById / FileRepository.Delete`
  - Relevant behavior: 模型允许不同 EchoID 复用同一 FileID；删除记录时却逐个删 File 行并在提交后删物理对象，没有检查其他引用。
  - 验证依据: 复现：删除接口 200，第二条记录仍存在；files 表目标行数 0，磁盘文件不存在，附件 URL 404，第二条 echo_files 关联仍有 1 行。
- Problem: 共享关系与删除策略矛盾。记录删除把“解除当前关联”当成“永久删除文件”。
- Why it matters: 仍存在的记录变成破损内容；失效范围还可能被缓存中的旧附件元数据掩盖。
- Realistic failure scenario: 一张上传图片被两条记录引用，删除第一条，再访问第二条使用的附件。
- Minimal fix: 先只删除当前关联；文件只有在没有任何有效引用且符合文件清理策略时才能物理删除。将引用计数判断放在一致的事务边界。
- Better long-term fix: 让文件服务拥有文件生命周期，记录服务提交关联变化；延迟垃圾回收处理无引用对象。
- Regression test suggestion: 真实 SQLite+本地文件：两条记录共享一个文件，删一条后另一条的附件行、元数据和磁盘字节均存在；删最后引用后再测既定清理策略。
- Estimated effort: **0.5–1 天**

<a id="f06"></a>

### Finding: F06 — 并发快照互删固定 staging 目录并可能撞名

- Severity: **High**
- Confidence: High
- Category: Stability
- Status: **Confirmed**
- Affected area: 快照 / 手动导出与定时导出
- Evidence:
  - File: [internal/migrator/snapshot/writer.go](</Users/versior/Desktop/AXOXE/internal/migrator/snapshot/writer.go:30>)
  - File: [internal/migrator/snapshot/writer.go](</Users/versior/Desktop/AXOXE/internal/migrator/snapshot/writer.go:167>)
  - File: [internal/migrator/artifact/artifact.go](</Users/versior/Desktop/AXOXE/internal/migrator/artifact/artifact.go:17>)
  - File: [internal/task/scheduled/snapshot.go](</Users/versior/Desktop/AXOXE/internal/task/scheduled/snapshot.go:31>)
  - Function / Module: `snapshot.Create / stageConsistentDB / artifact.Slot.Name`
  - Relevant behavior: 所有快照共用 data/files/tmp/db-export，每次创建和退出都会 RemoveAll；文件名仅精确到秒，KeepOnly 又清理同一个产物目录。
  - 验证依据: 临时 Go 探针已复现：第二份成功，第一份因 staging 中 ech0.db 不存在而打包失败。不是 Go data race，而是文件生命周期竞争。
- Problem: 单个 cron 自身的防重入没有覆盖与手动 job 的并发。不同请求共享可变工作目录和产物清理权。
- Why it matters: 正常同时导出会失败，正在打包或上传的文件可能被另一个任务删除，备份可靠性受损。
- Realistic failure scenario: 定时快照已写 staging DB 尚未打包，管理员启动手动快照；第二份结束并清理后，第一份继续读取 DB。
- Minimal fix: 为每次导出分配唯一工作目录及唯一产物名；用一个覆盖手动、定时、下载导出的协调边界管理快照与保留清理。
- Better long-term fix: 产物状态区分生成中、上传中、可清理，清理只处理已结束的产物。
- Regression test suggestion: 用 barrier 确定性重叠两次导出，断言两份均有效或按明确策略拒绝第二份；再测同秒命名及慢上传期间清理。
- Estimated effort: **0.5–1 天**

<a id="f07"></a>

### Finding: F07 — 导入附件缺失仍上报全部成功

- Severity: **High**
- Confidence: High
- Category: Stability
- Status: **Confirmed**
- Affected area: AXOXE 快照导入 / 数据完整性
- Evidence:
  - File: [internal/migrator/importer/ech0/importer.go](</Users/versior/Desktop/AXOXE/internal/migrator/importer/ech0/importer.go:399>)
  - File: [internal/migrator/importer/ech0/importer.go](</Users/versior/Desktop/AXOXE/internal/migrator/importer/ech0/importer.go:75>)
  - Function / Module: `Importer.Import / migrateFiles`
  - Relevant behavior: 导入先创建文件行和关联；复制本地文件失败只记录 local_copy_failed 告警并继续，最终 SuccessCount 仍按记录总数填写，FailCount 为零。
  - 验证依据: 现有 fixture 的真实导入结果：SuccessCount=1、FailCount=0、无 error，但被引用图片不存在；日志确认 local_copy_failed=1。
- Problem: 持久化数据已经是不完整状态，结果却把导入包装成完整成功。运营者无法据此判断是否可以丢弃旧实例。
- Why it matters: 图片等内容永久缺失；按“导入成功”清理源数据会把可恢复的缺损变成数据丢失。
- Realistic failure scenario: 导入 ZIP/目录中的 source DB 引用了图片，但图片字节缺失、权限不足或复制失败。
- Minimal fix: 迁移写路径在提交前验证所引用资源可用；无法完整迁移时明确失败或报告 partial，并列出失败文件/记录，避免创建成功却悬空的关联。
- Better long-term fix: 增加独立的迁移完整性校验和恢复清单；成功只表示数据库与必需资源都已完成。
- Regression test suggestion: 现有真实 source DB fixture 删除图片后执行 importer，应失败或显式 partial；断言结果计数与落库关联、磁盘状态一致。
- Estimated effort: **1–2 天，含失败恢复策略**

<a id="f08"></a>

### Finding: F08 — 快照与导入忽略自定义本地存储根目录

- Severity: **High**
- Confidence: High
- Category: Stability
- Status: **Confirmed**
- Affected area: 配置 / 数据可移植性
- Evidence:
  - File: [internal/migrator/snapshot/writer.go](</Users/versior/Desktop/AXOXE/internal/migrator/snapshot/writer.go:65>)
  - File: [internal/migrator/importer/ech0/importer.go](</Users/versior/Desktop/AXOXE/internal/migrator/importer/ech0/importer.go:458>)
  - File: [docs/usage/configuration.md](</Users/versior/Desktop/AXOXE/docs/usage/configuration.md:120>)
  - Function / Module: `snapshot.Create / copySourceLocalFileToTargetRoot`
  - Relevant behavior: 上传和静态服务尊重 ECH0_STORAGE_DATA_ROOT，但快照固定遍历 data，导入固定写 data/files。
  - 验证依据: Go 探针把 Storage.DataRoot 设为独立 uploads，导出成功且包含测试 DB 条目，ZIP 不含测试媒体。导入目标硬编码由源码确认。
- Problem: 官方支持的存储配置与数据迁移使用不同的路径来源。外置媒体目录不会被正确打包，恢复时也不会写到实际服务目录。
- Why it matters: 看似完整的快照遗漏附件；恢复后的数据库包含文件记录，但应用找不到对应媒体。
- Realistic failure scenario: 把 uploads 配到 data 以外的独立目录，正常使用后导出，再迁到相同配置的新实例。
- Minimal fix: 从当前存储配置枚举应导出的本地文件，并在归档中规范化布局；导入按目标存储根目录解析实际写入路径。不要把运行时绝对路径直接写入跨机器归档。
- Better long-term fix: 由存储模块提供资源导出/导入映射，Migrator 使用明确的归档布局，避免硬编码宿主目录。
- Regression test suggestion: 外置 DataRoot 上传真实附件→导出 ZIP→新实例导入→读取附件字节；同时验证默认根目录与自定义 DB 路径。
- Estimated effort: **1–2 天**

<a id="f09"></a>

### Finding: F09 — Helm 默认带有共用 JWT 签名值

- Severity: **High**
- Confidence: High
- Category: Security
- Status: **Confirmed**
- Affected area: Helm 默认部署配置
- Evidence:
  - File: [charts/ech0/values.yaml](</Users/versior/Desktop/AXOXE/charts/ech0/values.yaml:58>)
  - File: [charts/ech0/templates/secret.yaml](</Users/versior/Desktop/AXOXE/charts/ech0/templates/secret.yaml:1>)
  - Function / Module: `values.yaml / secret.yaml`
  - Relevant behavior: Chart values 的 JWT_SECRET 有非空固定预设，Secret 模板直接编码该值，未要求覆盖或生成每实例唯一密钥。
  - 验证依据: values 与模板路径已核对。报告不复制该预设值；未运行 Helm 集群部署，也未认定任何真实部署已受影响。
- Problem: 按默认 values 安装的不同实例会共用仓库已知签名值。它不能承担令牌可信来源的作用。
- Why it matters: 满足默认部署条件时，攻击者有机会伪造签名有效的 JWT，破坏认证边界。此处没有证据表明现有线上实例用了默认值。
- Realistic failure scenario: 管理员直接使用默认 Helm values 部署，未单独提供安全密钥。
- Minimal fix: 移除可用的固定值，安装时强制引用 existingSecret 或生成并稳定复用唯一 Secret；升级不能无意轮换签名密钥。
- Better long-term fix: 部署配置区分必需机密与非机密默认项，提供安全的 existingSecret 工作流。
- Regression test suggestion: 渲染默认 Chart 不应产生共用有效密钥；验证首次安装唯一、升级保留、显式 existingSecret 正确绑定。
- Estimated effort: **2–4 小时**

<a id="f10"></a>

### Finding: F10 — 密码登录缺少应用层限流或尝试锁定

- Severity: **High**
- Confidence: High
- Category: Security
- Status: **Confirmed**
- Affected area: 公开认证接口
- Evidence:
  - File: [internal/router/auth.go](</Users/versior/Desktop/AXOXE/internal/router/auth.go:20>)
  - File: [internal/service/auth/auth.go](</Users/versior/Desktop/AXOXE/internal/service/auth/auth.go:93>)
  - Function / Module: `setupAuthRoutes / AuthService.Login`
  - Relevant behavior: /api/login 仅挂 NoCache；登录服务没有失败计数、退避或锁定。项目已经有 RateLimit，但这条入口没有使用。
  - 验证依据: 临时实例中连续 45 次错误密码请求全部 HTTP 400，没有限流；未对公网或生产环境进行压力测试。
- Problem: 公开用户名可对应无限次密码尝试，密码验证也会持续消耗 CPU。
- Why it matters: 弱密码账户面对持续在线猜测；直接暴露实例的资源更容易被认证请求占满。反向代理限流可缓解，但不是应用默认保证。
- Realistic failure scenario: 同一来源对已存在用户反复提交错误密码。
- Minimal fix: 为登录添加有界的 IP 与账号维度尝试控制，返回明确 429/Retry-After；避免永久锁定让第三方轻易锁死用户。检查注册与其他高成本公开认证入口。
- Better long-term fix: 集中管理认证滥用策略，使密码、设备和 Passkey 入口分别采用符合其成本的限制。
- Regression test suggestion: 受控本地请求超过阈值后应返回 429，窗口恢复后合法登录成功；账号/IP 隔离及代理配置也需测试。
- Estimated effort: **0.5–1 天**

<a id="f11"></a>

### Finding: F11 — S3 导出任务状态不包含远程上传结果

- Severity: **Medium**
- Confidence: High
- Category: Stability
- Status: **Confirmed**
- Affected area: S3 目的地快照导出 / 可观测性
- Evidence:
  - File: [internal/migrator/exporter/s3/exporter.go](</Users/versior/Desktop/AXOXE/internal/migrator/exporter/s3/exporter.go:43>)
  - Function / Module: `s3.Exporter.Export / uploadToS3`
  - Relevant behavior: 本地打包后启动裸 goroutine 上传，立即 emit completed 并返回；上传失败仅写 Warn，无法影响已经完成的 job。
  - 验证依据: 控制流静态确认；未调用真实 S3 服务。不能据此说每次 S3 上传都会失败。
- Problem: 选择 S3 目的地后，成功状态只证明本地 ZIP 已生成，不能证明远端副本存在。上传 goroutine 也没有被导出任务的取消和等待所管理。
- Why it matters: 用户把完成状态当作远端备份保障，直到需要恢复才发现远端缺失。
- Realistic failure scenario: 本地打包成功，但 S3 凭据错误、网络超时或进程在上传前退出。
- Minimal fix: 把上传纳入 job 的 uploading/completed/failed 状态并等待真实结果；如果保留异步行为，API/UI 必须明确返回“本地产物完成，远端待上传”并可查询最终状态。
- Better long-term fix: 产物任务负责上传及重试的生命周期，应用停止时有明确 drain/恢复策略。
- Regression test suggestion: 使用返回错误的本地假 S3 端点，验证远程上传失败不会呈现完整成功；成功响应后再验证对象确实存在。
- Estimated effort: **0.5–1 天**

<a id="f12"></a>

### Finding: F12 — 快照导出丢弃调用方取消上下文

- Severity: **Medium**
- Confidence: High
- Category: Stability
- Status: **Confirmed**
- Affected area: 导出取消 / 应用关闭
- Evidence:
  - File: [internal/migrator/exporter/fs/exporter.go](</Users/versior/Desktop/AXOXE/internal/migrator/exporter/fs/exporter.go:22>)
  - File: [internal/migrator/snapshot/writer.go](</Users/versior/Desktop/AXOXE/internal/migrator/snapshot/writer.go:80>)
  - Function / Module: `fs.Exporter.Export / snapshot.Create`
  - Relevant behavior: FS 和 S3 exporter 都把调用上下文命名为 _；snapshot.Create 自建 context.Background 供遍历和打包使用。
  - 验证依据: 真实 FS exporter 接收已取消 ctx，仍返回成功并创建完成 ZIP；已用临时 DB 和目录复现。
- Problem: job 取消不能停止实际的文件扫描和 ZIP 写入，表面状态与运行中的工作可能分离。
- Why it matters: 大实例取消后仍持续占用磁盘和 CPU，也继续执行产物保留清理。
- Realistic failure scenario: 对已经取消的 context 发起导出，或用户在大快照生成期间点击取消。
- Minimal fix: 将调用方 context 一路传给 SnapshotTo、Walk、Pack 和上传，在提交产物及清理旧产物前确认任务仍有效。
- Better long-term fix: 导出动作和 job 状态共用同一个生命周期，临时产物在取消时清理。
- Regression test suggestion: 预取消 ctx 不能产生 completed ZIP；在较大打包中途取消，应返回 context.Canceled 并保留此前有效产物。
- Estimated effort: **2–4 小时**

<a id="f13"></a>

### Finding: F13 — 更新不存在的记录返回成功并发出更新事件

- Severity: **Medium**
- Confidence: High
- Category: Stability
- Status: **Confirmed**
- Affected area: PUT /api/echo / 写入错误语义
- Evidence:
  - File: [internal/repository/echo/echo.go](</Users/versior/Desktop/AXOXE/internal/repository/echo/echo.go:251>)
  - File: [internal/service/echo/echo.go](</Users/versior/Desktop/AXOXE/internal/service/echo/echo.go:310>)
  - Function / Module: `EchoRepository.UpdateEcho / EchoService.UpdateEcho`
  - Relevant behavior: UPDATE 不检查 RowsAffected；读回 nil 时 service 回退到请求对象，并返回成功、发出 EchoUpdated。
  - 验证依据: 端到端：PUT 随机 UUID 返回 HTTP 200/code=1；紧接 GET 同 UUID 返回 HTTP 400/code=0。
- Problem: 没有记录被更新，客户端却得到成功结果。事务内关联和标签处理还可能留下不应产生的副作用。
- Why it matters: 用户认为编辑已保存；外部 webhook/索引看到不存在记录的更新事件。
- Realistic failure scenario: 持有过期记录 ID 的客户端在记录已被删除后提交编辑。
- Minimal fix: 在事务内确认目标记录存在及可更新，检查更新结果；不存在则返回统一 not-found，避免执行关联更新和发出事件。
- Better long-term fix: 让存储层明确表达“更新成功 / 目标不存在 / 错误”，移除写操作返回请求数据的成功兜底。
- Regression test suggestion: 真实 DB 更新随机合法 UUID，必须失败；确认无新增关联、无标签计数变化、无更新事件。
- Estimated effort: **1–2 小时**

<a id="f14"></a>

### Finding: F14 — 标签计数与关联没有完整的更新、删除生命周期

- Severity: **Medium**
- Confidence: High
- Category: Stability
- Status: **Confirmed**
- Affected area: 标签排序 / 记录删除
- Evidence:
  - File: [internal/service/echo/echo.go](</Users/versior/Desktop/AXOXE/internal/service/echo/echo.go:397>)
  - File: [internal/repository/echo/echo.go](</Users/versior/Desktop/AXOXE/internal/repository/echo/echo.go:159>)
  - Function / Module: `ProcessEchoTags / DeleteEchoById`
  - Relevant behavior: 每次更新都对当前已有标签 IncrementUsageCount，没有按新旧引用差值调整；删除记录也未清理 EchoTag 关联或递减计数。
  - 验证依据: 复现：两次编辑后 usage_count=3、真实引用=1；删除后 usage_count 仍为 3，原记录的 join 行仍有 1 条。
- Problem: usage_count 实际累加的是提交次数，不是文档所称引用次数。关联残留使计数重建和后续维护也更困难。
- Why it matters: 标签热度与真实内容不符，长期编辑/删除累积数据库残留。
- Realistic failure scenario: 一条记录带同一个标签，连续编辑两次，然后删除这条记录。
- Minimal fix: 在记录事务里对新旧标签集合计算增删差值；删除时移除关联并调整计数。清理现有悬空关联后按有效引用重建计数。
- Better long-term fix: 明确 usage_count 是投影，可用有效 echo_tags 关系重建，维护一个一致的生命周期入口。
- Regression test suggestion: 真实 SQLite：同标签重复编辑计数始终 1；移除标签或删记录后计数为 0，echo_tags 无悬空行。
- Estimated effort: **0.5–1 天，含现存数据修复**

<a id="f15"></a>

### Finding: F15 — HTTP Server 没有请求头与空闲连接超时

- Severity: **Medium**
- Confidence: High
- Category: Stability
- Status: **Confirmed**
- Affected area: 对外 HTTP 服务
- Evidence:
  - File: [internal/server/server.go](</Users/versior/Desktop/AXOXE/internal/server/server.go:57>)
  - Function / Module: `Server.Start`
  - Relevant behavior: http.Server 仅配置 Addr 和 Handler，ReadHeaderTimeout、IdleTimeout 保持零值。
  - 验证依据: Server 构造静态确认；未进行连接耗尽压力测试。反向代理可提供外层保护。
- Problem: 应用直接监听公网时，缓慢发送请求头或保持空闲连接没有由服务器自身设置的明确期限。
- Why it matters: 长期占用连接与 goroutine，削弱小型自托管实例的可用性。
- Realistic failure scenario: 服务直接暴露默认端口，客户端连接后持续不完成请求头。
- Minimal fix: 设置合适的 ReadHeaderTimeout、IdleTimeout 和 MaxHeaderBytes；结合 SSE/WebSocket 特性判断读写限制，避免粗暴全局 WriteTimeout 截断长流。
- Better long-term fix: 统一普通请求、上传和长流的传输预算，并在部署文档说明反向代理对应配置。
- Regression test suggestion: 本地原始 TCP 只发送部分请求头，超过期限应关闭；正常请求和长流仍可用。
- Estimated effort: **1–2 小时**

<a id="f16"></a>

### Finding: F16 — 文件大小限制在 multipart 解析之后才生效

- Severity: **Medium**
- Confidence: High
- Category: Stability
- Status: **Confirmed**
- Affected area: 认证上传入口
- Evidence:
  - File: [internal/handler/file/file.go](</Users/versior/Desktop/AXOXE/internal/handler/file/file.go:120>)
  - File: [internal/service/file/file.go](</Users/versior/Desktop/AXOXE/internal/service/file/file.go:121>)
  - Function / Module: `FileHandler.UploadFile / FileService.UploadFile`
  - Relevant behavior: handler 先调用 FormFile 解析请求，再由 service 检查 file.Size；链路没有总请求体 MaxBytesReader 限制。
  - 验证依据: 实际读取顺序和类别大小校验静态确认。入口需要认证及上传权限，不是匿名直接上传漏洞。
- Problem: Gin multipart 内存阈值会把大请求写到临时磁盘，它不等于上传总大小限制。最终拒绝不能收回已经消耗的解析资源。
- Why it matters: 有上传权限的客户端可让超限数据先占用磁盘和连接，误操作大文件也会发生。
- Realistic failure scenario: file:write 用户上传远超类别上限的 multipart，服务解析完整后才拒绝。
- Minimal fix: 在 FormFile 之前限制整个请求体到允许上限加必要 multipart 开销；保留类别大小校验，并测试临时文件清理。
- Better long-term fix: 上传与迁移入口共用明确的请求/解码资源预算，按业务类别设置不同限额。
- Regression test suggestion: 限额以上的流式 multipart 应在读取有限字节后终止，响应明确且临时磁盘没有大体积残留。
- Estimated effort: **2–4 小时**

<a id="f17"></a>

### Finding: F17 — 迁移 ZIP 解压没有展开大小或条目总量限制

- Severity: **Medium**
- Confidence: High
- Category: Stability
- Status: **Confirmed**
- Affected area: 管理员迁移上传 / ZIP 解码
- Evidence:
  - File: [internal/service/migrator/migrator.go](</Users/versior/Desktop/AXOXE/internal/service/migrator/migrator.go:145>)
  - File: [pkg/virefs/plugin/zip/unpack.go](</Users/versior/Desktop/AXOXE/pkg/virefs/plugin/zip/unpack.go:25>)
  - Function / Module: `UploadMigrationSourceZip / zip.Unpack`
  - Relevant behavior: 迁移先保存 ZIP 再直接解压；Unpack 遍历所有条目并向磁盘 Put，未设置总展开字节、单项大小、条目数预算；snapshot.Unpack 使用 Background。
  - 验证依据: 解压链路静态确认无预算。未制造大体积 ZIP 或做磁盘耗尽测试；入口需要管理员/数据管理权限。
- Problem: 压缩文件大小无法约束解压资源，一个很小的压缩包也可能产生大量磁盘写入。现有 key 清理限制路径，但不限制解码成本。
- Why it matters: 导入异常或恶意来源归档会耗尽数据盘，影响 SQLite 和正常上传。
- Realistic failure scenario: 管理员导入不可信或损坏的第三方 ZIP，其中包含高压缩比大内容或极大量小条目。
- Minimal fix: 预检归档元数据并在实际复制时执行总字节、单项及条目数上限；传播取消 context，失败清理本次 extractDir。
- Better long-term fix: 把归档解码预算作为迁移输入契约，可根据实例数据规模明确配置。
- Regression test suggestion: 用小型高压缩比 fixture 和超条目数 fixture，证明超过预算会提前失败且清理，不需要真的填满磁盘。
- Estimated effort: **0.5–1 天**

<a id="f18"></a>

### Finding: F18 — “今天”查询在夏令时切换日使用错误的 24 小时窗口

- Severity: **Medium**
- Confidence: High
- Category: Stability
- Status: **Confirmed**
- Affected area: 时区查询 / 今日缓存
- Evidence:
  - File: [internal/repository/echo/echo.go](</Users/versior/Desktop/AXOXE/internal/repository/echo/echo.go:194>)
  - Function / Module: `EchoRepository.GetTodayEchos`
  - Relevant behavior: 查询结束时间与缓存过期都使用本地零点 Add(24*time.Hour)。其他日历查询已有 AddDate 的用法。
  - 验证依据: 错误窗口由代码和时区日历语义确认；未把当前没有 DST 的日期当作复现结果。
- Problem: 有夏令时的本地自然日可能为 23 或 25 小时，固定时长不是下一天的本地零点。
- Why it matters: 可能多取次日一小时或漏掉当日末尾一小时，缓存也在错误时刻换日。
- Realistic failure scenario: 用户时区为 America/New_York，在春季/秋季 DST 切换日查询今天。中国无夏令时用户不触发。
- Minimal fix: 用 startOfDayUser.AddDate(0,0,1) 计算下一本地零点，查询窗口和 TTL 共用该值。
- Better long-term fix: 把自然日边界集中为明确的日历运算，持续覆盖 DST 两个方向。
- Regression test suggestion: 对 New York 的 23/25 小时日播种边界前后记录，断言当天包含且次日排除，TTL 指向下一本地零点。
- Estimated effort: **约 1 小时**

<a id="f19"></a>

### Finding: F19 — 登录刷新和注销请求没有超时，可阻塞全局初始化

- Severity: **Medium**
- Confidence: High
- Category: Stability
- Status: **Confirmed**
- Affected area: 前端认证状态 / 应用启动
- Evidence:
  - File: [web/src/stores/auth.ts](</Users/versior/Desktop/AXOXE/web/src/stores/auth.ts:23>)
  - File: [web/src/stores/store-init.ts](</Users/versior/Desktop/AXOXE/web/src/stores/store-init.ts:19>)
  - Function / Module: `useAuthStore.silentRefresh / logout / initStores`
  - Relevant behavior: 普通客户端有 20 秒 timeout，但认证使用独立 ofetch 无 timeout；initStores 等待 userStore.init，刷新 promise 又合并所有等待者。
  - 验证依据: 调用链静态确认。未对真实网络故障录制浏览器挂起过程。
- Problem: API 接受连接后一直不返回时，初始化链及所有等待刷新的请求缺少可控终点；注销也要等远端结束才清本地状态。
- Why it matters: 网络故障呈现为长时间卡住，而不是明确的重试/重新登录状态。
- Realistic failure scenario: 刷新端点经过的代理或网络连接悬挂，浏览器加载应用或主动退出。
- Minimal fix: 给认证请求设明确 timeout/abort，确保失败后释放 refreshPromise；注销本地状态的清理不应无限等待网络。
- Better long-term fix: 认证使用共享的传输预算与错误契约，启动流程显示可恢复的失败状态。
- Regression test suggestion: 用本地永不返回的测试 HTTP 端点，验证初始化有界结束、共享刷新 promise 释放、注销状态清理。
- Estimated effort: **2–4 小时**

<a id="f20"></a>

### Finding: F20 — 聊天 SSE 绕过访问令牌刷新逻辑

- Severity: **Medium**
- Confidence: High
- Category: Stability
- Status: **Confirmed**
- Affected area: 聊天流式请求 / 前端认证
- Evidence:
  - File: [web/src/service/request/sse.ts](</Users/versior/Desktop/AXOXE/web/src/service/request/sse.ts:41>)
  - File: [web/src/service/api/chat.ts](</Users/versior/Desktop/AXOXE/web/src/service/api/chat.ts:109>)
  - File: [web/src/service/request/index.ts](</Users/versior/Desktop/AXOXE/web/src/service/request/index.ts:76>)
  - Function / Module: `chatStream / sseStream / request`
  - Relevant behavior: 聊天通过原生 fetch 发送 SSE，失败直接 onError；普通 request 才识别 TOKEN_* 并 silentRefresh 后重试。
  - 验证依据: 当前 UI 调用 chatStream→sseStream 的路径已核对；无刷新分支由源码确认，未等待真实浏览器令牌过期复现。
- Problem: 仍有有效 refresh cookie 的会话，如果访问令牌过期且没有先走普通 API 请求，直接发起聊天会失败。
- Why it matters: 用户闲置后首次聊天出现认证错误，普通 API 随后刷新令牌又能工作，体验不一致。
- Realistic failure scenario: 打开聊天页闲置到短期 token 过期，保留合法刷新 Cookie，直接提交问题。
- Minimal fix: SSE 打开前或收到明确认证失败时执行同一刷新策略，并只在流尚未开始时重试一次，避免重复已执行的请求。
- Better long-term fix: 普通 JSON 和流式传输共享认证准备步骤，流事件解析仍独立。
- Regression test suggestion: 过期访问令牌+有效 refresh cookie 的聊天请求可刷新后只开启一次流；刷新失败有明确错误，已开始流不自动重放。
- Estimated effort: **2–4 小时**

<a id="f21"></a>

### Finding: F21 — 编辑草稿跨账号共用，注销后仍可恢复

- Severity: **Medium**
- Confidence: High
- Category: Security
- Status: **Confirmed**
- Affected area: 前端草稿 / 账号切换
- Evidence:
  - File: [web/src/stores/editor/useDraftModule.ts](</Users/versior/Desktop/AXOXE/web/src/stores/editor/useDraftModule.ts:18>)
  - File: [web/src/stores/editor/useDraftModule.ts](</Users/versior/Desktop/AXOXE/web/src/stores/editor/useDraftModule.ts:155>)
  - File: [web/src/stores/user.ts](</Users/versior/Desktop/AXOXE/web/src/stores/user.ts:83>)
  - Function / Module: `useDraftModule / userStore.logout`
  - Relevant behavior: 草稿写入单一全局 localStorage key，没有账号标识；注销不清理 editor/draft；恢复只检查时间并弹确认，不检查归属。
  - 验证依据: 保存、恢复、注销和初始化路径静态确认；恢复有确认弹窗，未将其描述为无提示自动公开。
- Problem: 恢复确认只能证明用户同意恢复，不能证明这份草稿属于当前账号。编辑器内存正文在账号切换时也未清空。
- Why it matters: 共用浏览器/设备时，后登录账号可能看到前账号的私密草稿，甚至误发为自己的记录。
- Realistic failure scenario: 账号 A 保存未发布私密正文并退出；账号 B 在同一浏览器登录后刷新并点击恢复草稿。
- Minimal fix: 按 user ID 存取草稿，恢复时验证归属；注销及切换账号清理编辑器内存状态，是否保留 A 的持久草稿需明确产品策略。
- Better long-term fix: 持久前端状态记录拥有者，账号变化成为各用户状态的统一重置边界。
- Regression test suggestion: 两个真实 Pinia 用户上下文连续切换，B 无法看到或恢复 A 的正文/附件；A 重新登录按既定策略恢复自己的草稿。
- Estimated effort: **2–4 小时**

<a id="f22"></a>

### Finding: F22 — 自动 PR 门禁没有覆盖主站测试和关键生成漂移

- Severity: **Medium**
- Confidence: High
- Category: Testing
- Status: **Confirmed**
- Affected area: CI / 主站回归 / 生成代码
- Evidence:
  - File: [.github/workflows/test.yml](</Users/versior/Desktop/AXOXE/.github/workflows/test.yml:3>)
  - File: [.github/workflows/i18n-guardrails.yml](</Users/versior/Desktop/AXOXE/.github/workflows/i18n-guardrails.yml:4>)
  - Function / Module: `test.yml / i18n-guardrails.yml / workflow triggers`
  - Relevant behavior: 自动 backend 工作流执行 race/coverage/mocks；i18n 仅 workflow_dispatch。未发现统一的 push/PR 主站 Vitest、lint、OpenAPI/Wire 漂移门禁。
  - 验证依据: 全仓 workflow 触发器及 commands 已检索；CLI 发布流程自身有 typecheck/test，未错误归入“全项目完全无 CI”。
- Problem: 本地 CONTRIBUTING 要求无法自动约束每个变更。Hub/Site 构建和发布构建不能代替主站行为测试。
- Why it matters: 损坏主站行为或让代码/规格不同步的变更可能在 CI 绿色下进入主分支。
- Realistic failure scenario: 只改 web 的交互行为提交 PR，或调整 DI/接口后忘记重新生成对应文件。
- Minimal fix: 添加按实际路径触发的 web tests/typecheck/lint/i18n 和 Go lint/Wire/OpenAPI drift；产物发布依赖这些 checks。
- Better long-term fix: 建立一个清晰、可复用的非修改验证入口并配置必需状态检查。
- Regression test suggestion: 用 workflow 条件/测试 PR 验证 web-only、Go-only、接口及工作流变更均触发所需 jobs；故意引入缺翻译/生成漂移时检查失败。
- Estimated effort: **0.5–1 天**

<a id="f23"></a>

### Finding: F23 — 测试镜像构建在冻结安装失败后改锁文件继续

- Severity: **Medium**
- Confidence: High
- Category: Release
- Status: **Confirmed**
- Affected area: 镜像供应链 / 可复现构建
- Evidence:
  - File: [.github/workflows/docker-test-image.yml](</Users/versior/Desktop/AXOXE/.github/workflows/docker-test-image.yml:53>)
  - Function / Module: `docker-test-image.yml dependency install`
  - Relevant behavior: pnpm install --frozen-lockfile 失败后执行 --fix-lockfile --no-frozen-lockfile，随后继续构建镜像。
  - 验证依据: 工作流 shell 控制流确认；未声称已有镜像被恶意依赖污染。
- Problem: 依赖或运行时不一致被构建流程悄悄修正，镜像依赖图可能不再等于提交的锁文件。
- Why it matters: 同一提交的两个架构或不同构建时间可能得到不同依赖，问题难以追溯。
- Realistic failure scenario: 锁文件与 package.json 不一致或当前包管理器无法接受锁文件，构建没有失败而现场重新解析依赖。
- Minimal fix: 移除该 fallback，冻结安装失败就终止；在受审查的源码提交中修复锁文件或包管理器版本。
- Better long-term fix: 锁文件、包管理器与构建依赖图成为发布输入，记录产物 provenance。
- Regression test suggestion: 故意让临时 package.json 与锁不匹配，镜像任务必须在 install 阶段失败，不能发布新镜像。
- Estimated effort: **约 1 小时**

<a id="f24"></a>

### Finding: F24 — ARM64 交叉编译工具链下载未校验完整性

- Severity: **Medium**
- Confidence: High
- Category: Release
- Status: **Confirmed**
- Affected area: CI 编译工具链
- Evidence:
  - File: [.github/actions/setup-musl-toolchain/action.yml](</Users/versior/Desktop/AXOXE/.github/actions/setup-musl-toolchain/action.yml:61>)
  - File: [.github/workflows/docker-test-image.yml](</Users/versior/Desktop/AXOXE/.github/workflows/docker-test-image.yml:23>)
  - Function / Module: `setup-musl-toolchain action / docker-test-image env`
  - Relevant behavior: 工具链 sha256 输入是可选，调用方默认空；下载后打印跳过校验并直接解压执行编译器，缓存 key 也使用 no-sha256。
  - 验证依据: Action 与调用方默认输入已核对；未下载或执行可疑编译器，也未发现实际供应链入侵证据。
- Problem: 版本标签只确定资源地址，不能证明下载的字节符合批准的构建输入。编译器对最终二进制有直接影响。
- Why it matters: 上游 release 资源被替换或缓存污染时，构建流程缺少阻断证据。HTTPS 不能代替固定哈希。
- Realistic failure scenario: 新 runner 首次获取 ARM64 工具链，并把未校验归档缓存、用于发布构建。
- Minimal fix: 固定已核对的 sha256，并在缺失/不匹配时失败；缓存 key 必须绑定校验值。
- Better long-term fix: 所有外部可执行构建依赖固定版本和完整性来源，统一供应链更新流程。
- Regression test suggestion: 修改测试归档任一字节应失败；缺少哈希的调用也失败；批准归档可正常提取编译。
- Estimated effort: **1–2 小时**

<a id="f25"></a>

### Finding: F25 — 缓存容量和失效 key tracker 缺乏可靠的内存上限

- Severity: **Medium**
- Confidence: Medium
- Category: Performance
- Status: **Suspected**
- Affected area: Ristretto 容量 / 旧分页和 RSS 缓存
- Evidence:
  - File: [internal/cache/provider.go](</Users/versior/Desktop/AXOXE/internal/cache/provider.go:9>)
  - File: [internal/repository/echo/echo_cache.go](</Users/versior/Desktop/AXOXE/internal/repository/echo/echo_cache.go:27>)
  - File: [internal/repository/echo/echo.go](</Users/versior/Desktop/AXOXE/internal/repository/echo/echo.go:68>)
  - Function / Module: `ProvideCache / cacheKeyTracker.Track / read-through call sites`
  - Relevant behavior: MaxCost=1,000,000，但大对象和 RSS 的 cost 常固定为 1；tracker map 保存每个 key，仅在相关写入失效时 Reset，不随缓存淘汰或 TTL 删除。
  - 验证依据: 无上限 tracker 和固定 cost 由源码确认；尚未压测当前公开调用下的增长速率，因此按 Suspected 性能风险报告。
- Problem: 容量单位实际近似条目数而非字节，缓存外的 key 集合没有同步生命周期。规模影响需要进一步测量。
- Why it matters: 长期只读实例接受多样化 RSS Host 时，tracker 可能持续增长；大值也可能超出直观内存预算。没有证据证明会在数小时内 OOM。
- Realistic failure scenario: 内容较多且很少写入的实例长期被不同 Host 的 RSS 请求读取。旧 repository 分页缓存另用于内部读取，未把它等同于当前主站任意搜索入口。
- Minimal fix: 测量真实 key 与 value 的增长；tracker 跟随淘汰/过期清理，或使用代际失效避免无限枚举；按实际字节估算 cost。
- Better long-term fix: 缓存预算显式以字节约束，域失效不依赖永久保存每一个曾访问 key。
- Regression test suggestion: 小型有界负载生成不同 keys，等待淘汰/过期后 tracker 也收敛；记录缓存与进程 heap 曲线，再决定是否需要更大调整。
- Estimated effort: **验证 2–4 小时；调整 0.5–1 天**

<a id="f26"></a>

### Finding: F26 — 更新检查使用不存在的 owner/repo 组合

- Severity: **Medium**
- Confidence: High
- Category: Release
- Status: **Confirmed**
- Affected area: 版本检查 / 二开品牌迁移
- Evidence:
  - File: [internal/util/github/github.go](</Users/versior/Desktop/AXOXE/internal/util/github/github.go:98>)
  - Function / Module: `github.GetLatestVersion`
  - Relevant behavior: GetLatestVersion 将 owner/repo 组合固定为 lin-snow/AXOXE，而二开仓库与上游仓库均不是这个组合。
  - 验证依据: 当前 GitHub API 对该 releases 地址实际返回 404。核验日期 2026-11-17；未把暂未发布 release 的合法仓库误判为 URL 错误。
- Problem: 更新检查请求到不存在的仓库，导致正常功能持续报错。
- Why it matters: 用户无法通过面板可靠获知更新，品牌迁移后的版本来源也不明确。
- Realistic failure scenario: 用户打开更新检查，程序查询 lin-snow/AXOXE 的 releases。
- Minimal fix: 明确采用二开或上游更新源，并设置正确 owner/repo；先核对该源的发布与版本规则，不凭名字替换。
- Better long-term fix: 产品版本来源保持一个明确配置/常量，CLI、面板和发布流程使用一致规则。
- Regression test suggestion: 本地 HTTP fixture 验证请求目标、release tag 解析及空 release/404 的错误提示，再对选定公开源做一次只读冒烟。
- Estimated effort: **1–2 小时**

## 5. Architecture and Module Boundaries

| 关联发现 | 判断 |
|---|---|
| F03、F04、F05、F06、F08 | handler/service/repository 及 Wire 边界清晰；最明显的结构问题在安全有效性、文件关联和产物生命周期。 |

- [x] 已核对入口、DI、存储/迁移和事件的调用方向。

## 6. Security Concerns

| 关联发现 | 判断 |
|---|---|
| F01、F02、F03、F04、F09、F10、F21 | 优先修路由与持久授权事实，补全输入 DTO 与前端账号状态归属。 |

- [x] 正文私密 scope、session-only 账号操作、MCP 集中 scope 检查和 SVG 拒绝已有保护。

## 7. Stability Concerns

| 关联发现 | 判断 |
|---|---|
| F05–F08、F11–F20 | 跨 DB、磁盘、job、S3 的完成/取消语义是主要失败来源。 |

- [x] 完整 race 测试通过；已用确定性 barrier 验证文件并发冲突。

## 8. Performance Concerns

| 关联发现 | 判断 |
|---|---|
| F10、F15、F16、F17、F25 | 先约束输入和连接预算；缓存风险需要实际曲线，暂不推导 OOM 速度。 |

- [x] 查到分页上限、预加载及前端虚拟列表；未确认足以单独列卡的普遍 N+1。

## 9. Testing Gaps

| 关联发现 | 判断 |
|---|---|
| F22；F03–F08、F13、F14 的回归建议 | 高覆盖仍漏掉重启、共享资源、真实路径配置和损坏导入；用集成断言补足。 |

- [x] 主站 188、CLI 134、Go 全量 race 均通过；检查了真实 DB 测试与 mock 测试的差别。

## 10. Maintainability Concerns

| 关联发现 | 判断 |
|---|---|
| F04、F05、F08、F19、F20、F21 | 最小充分调整应围绕职责边界，避免继续在 UI/service 添加猜测型 helper。 |

- [x] 领域文档与命名大体一致；千行组件仅作定位线索，没有单凭行数报缺陷。

## 11. Design / Principles Concerns

| 关联发现 | 判断 |
|---|---|
| F03、F04、F05、F07、F13 | 撤销事实、输入模型与成功状态需要更强契约；见 Principles Compliance。 |

- [x] 事务、scope vocabulary、统一 response 和注入式 Agent tools 为良好基础。

## 12. Release Concerns

| 关联发现 | 判断 |
|---|---|
| F09、F22、F23、F24、F26 | 发布流程应拒绝不一致输入；公开部署前先消除已复现安全问题。 |

- [x] 本机三个 Web 构建与 Go 构建成功；已检查多架构工作流及 CLI 独立发布。

## 13. Documentation Accuracy

| 关联发现 | 判断 |
|---|---|
| F04、F08、F26 | “嵌套 file 被忽略”、可自定义 DataRoot 和当前更新来源与实现存在不符。 |

- [x] 架构、访问令牌和存储迁移文档已有明确约定；内部 Ech0 协议名称不机械改成品牌错误。

## 14. Configuration Safety

| 关联发现 | 判断 |
|---|---|
| F01、F08、F09、F15 | 默认公开目录和 Helm 默认密钥有实质影响；不能只依赖部署者额外记忆。 |

- [x] 未设置 JWT 时应用生成临时密钥并发出告警；该安全 fallback 不作为漏洞。

## 15. Observability

| 关联发现 | 判断 |
|---|---|
| F07、F11、F19 | 已有告警，但导入/远端上传结果没有正确反映给用户或任务状态。 |

- [x] zap 包装器、module 字段和 job 进度机制存在；未因缺全链 tracing 单独报问题。

## 16. Fallback / Defensive Code

| 关联发现 | 判断 |
|---|---|
| F07、F11、F13、F23 | 保存、迁移与构建路径的成功兜底不应隐藏失败。 |

- [x] 区分显示降级、临时 JWT 告警、协议兼容与写路径静默成功；详见专项表。

## 17. Testing Authenticity

| 关联发现 | 判断 |
|---|---|
| F03、F05、F07、F14、F22 | mock 验证调用不代表物理状态和跨进程状态正确。 |

- [x] 未主张删除所有 mocks；真实 SQLite、Busen、VireFS 和关键前端 payload 测试有实际价值。

## 18. Type Safety

| 关联发现 | 判断 |
|---|---|
| F04、F13 | 核心问题在有类型但未收紧的写入边界，非 any/as 的机械数量。 |

- [x] Go/TS 类型检查通过，聊天 ask 等外部数据有 narrowing；没有确认足以列卡的 unsafe 内存漏洞。

## 19. Frontend State

| 关联发现 | 判断 |
|---|---|
| F19、F20、F21 | 认证传输分裂及草稿归属缺失是实际状态风险。 |

- [x] Pinia 模块、请求合并、游标/分页测试已有基础；没有建议迁移状态管理框架。

## 20. Backend API

| 关联发现 | 判断 |
|---|---|
| F01、F03、F04、F13、F14、F16 | 公共静态旁路、输入关联和错误语义需要修复；详见 API 分类。 |

- [x] Huma posture 同时描述/执行 scope，integration comment 有意使用独立令牌权限，没有误报验证码缺失。

## 21. Dependency Weight

| 关联发现 | 判断 |
|---|---|
| F23、F24；F25 待测 | 依赖图与工具链可信度比无证据删库更优先；详见 Dependency Scoreboard。 |

- [x] 主站生产公告为 0；Go openpgp 提示仅模块级，未确认项目可调用漏洞链。

## 22. Code Consistency

| 关联发现 | 判断 |
|---|---|
| F08、F19、F20 | 同类存储路径和请求认证预算不一致，已造成具体行为分裂。 |

- [x] lint/format 检查通过；不要求全仓改命名、换响应格式或重排导入。

## 23. Comment Coverage

| 关联发现 | 判断 |
|---|---|
| F04；迁移完成语义参见 F07/F11 | 优先纠正会误导调用者的契约注释，不给简单 getter 补说明凑覆盖。 |

- [x] Wire 单例、scope、协议与架构已有解释；本轮未计算“注释百分比”这种低价值指标。

---

## 24. Principles Compliance

### Principles Violated

这里按独立根因计数，同一个发现可涉及多个原则；数字不是全仓语法出现次数。

| Principle | Violations | Severity | Affected Areas |
|---|---:|---|---|
| 边界隔离 / 最小权限 | 4 | Critical/High | F01、F02、F04、F09：公开根、私密媒体、写 DTO、部署机密 |
| 状态唯一来源 / 生命周期一致 | 5 | High/Medium | F03、F05、F06、F08、F14：撤销、共享资源、产物、路径、标签 |
| Fail-Fast 与成功语义 | 4 | High/Medium | F07、F11、F13、F23：导入、S3、更新、依赖安装 |
| 可取消与有界资源 | 5 | Medium | F12、F15、F16、F17、F19：导出、HTTP、上传、解压、刷新 |
| 一致的能力封装 | 2 | Medium | F20、F21：流认证、账号草稿状态 |

### Principles Respected

- handler → service → repository 的分层和跨域接口整体清楚，Wire 描述了关键共享单例的装配要求。
- authz 保持纯 vocabulary，Huma posture、MCP dispatch 和 viewer 避免授权策略散落到所有 handler。
- Agent 核心依赖注入工具，事件 vocabulary 与订阅实现分离；没有在未知业务行为前建议全面重构。
- JSON response/i18n 契约统一，普通客户端有超时和刷新；问题是特殊路径没有完全复用契约。
- 输入危险文件类型和外向 SSRF 基础保护已有实现；不把 `v-html` 或外部请求存在本身当漏洞。

## 25. Fallback / Defensive Code Analysis

### Fallback Summary

本表统计本报告聚焦的 4 处失败处理，未统计全仓每一处 catch 或默认值。

| Subtype | Count | KeepWithAlert | FailFast | Remove |
|---|---:|---:|---:|---:|
| SilentFallback | 2 | 0 | 2 | 0 |
| EmptyCatch | 0 | 0 | 0 | 0 |
| CompatibilityBranch | 0 | 0 | 0 | 0 |
| SilentCorrection | 1 | 0 | 1 | 0 |
| DefensiveGuess | 1 | 0 | 1 | 0 |

| 发现 | 原路径与失败 | 是否必要/监测 | Recommended action | 回归和工时 |
|---|---|---|---|---|
| F07 / SilentFallback | 媒体复制失败→仍完整成功 | 记录告警不足以允许迁移成功 | FailFast 或显式 Partial | 缺资源导入及完整性断言，1–2 天 |
| F11 / SilentFallback | 上传失败→job 已完成 | 后台 Warn 有用，任务状态必须承认远端结果 | FailFast/Restructure | 失败假 S3 端点，0.5–1 天 |
| F23 / SilentCorrection | 冻结安装失败→重解锁文件 | 发布构建不应现场改输入 | FailFast | 不匹配锁文件使任务失败，约 1 小时 |
| F13 / DefensiveGuess | 读不到目标→返回请求对象 | 写路径不需要这种成功兜底 | FailFast | 不存在记录无副作用，1–2 小时 |

可保留的降级：Keychain 不可用时 CLI 回退到权限受限文件；普通显示请求有明确错误时可降级；未提供 JWT 密钥时生成临时值并告警。兼容 Memos/Ech0 数据和协议别名有明确产品用途，没有为“清理兼容”删除建议。

## 26. Testing Authenticity Analysis

### Confidence Assessment

| Test Area | Real Confidence | Risk | Action |
|---|---|---|---|
| 真实 repository / SQLite 测试 | High（单进程数据库语义） | 跨进程撤销、DB 与磁盘组合仍可漏掉 | Keep 并补重启/资源集成 |
| Echo service mock 测试 | Medium（分支/错误传播） | 单条记录 mock 不表达共享引用；调用成功不证明磁盘仍在 | Keep but augment |
| Snapshot writer 测试 | Medium（顺序/默认目录） | 固定 staging 并发、自定义 DataRoot 未覆盖 | 增加 deterministic integration |
| importer 正常 fixture | Medium | fixture 的资源齐全时看不到缺媒体“成功” | 增加缺文件/复制失败 fixture |
| 主站 editor/query/cursor 测试 | Medium–High（所测行为） | 不代表账号草稿隔离及流认证已验证 | Keep 并补 F19–F21 |
| CLI HTTP/确认/凭据测试 | Medium–High | 声明 Bun 与双架构发布环境未实测 | Keep 并补声明运行时验证 |

### Valuable Tests

- 真实 SQLite repository 测试及隔离 storage helpers 验证落库行为。
- Busen/VireFS 的取消、并发/收尾、ZIP round-trip 测试具有实际价值。
- 前端游标/分页、payload、音乐换源及编辑工具行为测试断言用户可观察结果。

### Suspicious Tests

[TestDeleteEchoById_Success](</Users/versior/Desktop/AXOXE/internal/service/echo/mutate_echo_test.go:84>) 预设删除每个 FileRecord/StoredFile 是正确行为，没有第二个真实引用及磁盘断言，因此捕获不到 F05。[internal/service/echo/process_tags_test.go](</Users/versior/Desktop/AXOXE/internal/service/echo/process_tags_test.go:28>) 验证标签增量调用，但没有反复编辑/删除后实际引用数不变的断言，捕获不到 F14。二者不是无价值测试，应增加真实状态集成测试，不能继续把错误预期固化为唯一标准。

### Missing Tests

按发现卡片补齐：匿名静态保留目录与 private media；令牌删除后重启；窄 scope 嵌套写入；共享附件；快照并发/取消/自定义路径；缺媒体导入；不存在目标更新；草稿账号切换和过期 SSE。**没有另立一批“缺测试”高危发现重复计数。**

## 27. Type Safety Analysis

### Summary

只统计有可执行影响的报告发现，排除测试/生成代码中的机械断言数量。

| Subtype | Count | Critical | High | Medium | Low |
|---|---:|---:|---:|---:|---:|
| UnsafeBlock | 0 | 0 | 0 | 0 | 0 |
| TypeAssertion | 0 | 0 | 0 | 0 | 0 |
| InputBoundary | 1 | 0 | 1 | 0 | 0 |
| OutputLeak | 0 | 0 | 0 | 0 | 0 |
| BooleanTrap | 0 | 0 | 0 | 0 | 0 |
| StringlyTyped | 0 | 0 | 0 | 0 | 0 |
| ErrorType | 1 | 0 | 0 | 1 | 0 |

- **F04 / InputBoundary:** 已有 Go 类型不等于写授权成立。应把 EchoFile ORM 类型替换为窄写 DTO；详见真实 scoped HTTP 复现、回归测试及 0.5–1 天建议。
- **F13 / ErrorType:** nil 读回被误当作可成功兜底；让“目标不存在”和“更新已完成”具有明确区别，详见卡片。
- 外部 extension payload 的 map/unknown 是协议需要；关键使用路径已有解析/收紧，未建议无证据地替换全部灵活载荷。

## 28. Frontend State Analysis

### Summary

| Subtype | Count | Affected Components |
|---|---:|---|
| ComponentSize | 0 | TheChatBox/TheComment 较大但没有仅凭行数列缺陷 |
| StateDuplication | 1 | F21：账号、编辑器内存与持久草稿归属 |
| PropDrilling | 0 | 未确认独立风险 |
| EffectChain | 0 | 未确认独立风险 |
| UIBusinessCoupling | 0 | 不把所有 API 事件处理都定义为缺陷 |
| DOMasState | 0 | 未确认独立风险 |
| RequestState | 2 | F19 认证请求预算；F20 SSE 认证刷新 |
| RenderPerf | 0 | 当前无性能测量支持独立问题 |

Recommended action：F19 Centralize timeout/lifecycle；F20 Centralize auth preparation；F21 按账号分区并在身份变化时 Reset。各项的最小改动、测试及工时均见卡片。无需更换 Pinia 或为了代码行数拆散无问题组件。

## 29. Backend API Analysis

### Summary

同一发现按主要 API 根因分组，不代表端点数量。

| Subtype | Count | Affected Endpoints |
|---|---:|---|
| ApiConsistency | 0 | 基础 response 统一，旧分页接口有明确 deprecated |
| Validation | 2 | F04 /api/echo；F16 /api/files/upload |
| Auth | 3 | F01/F02 /api/files；F03 token 验证 |
| NplusOne | 0 | 没有确认独立的增长查询缺陷 |
| Caching | 1 | F25：容量与 tracker，待验证 |
| ErrorResponse | 1 | F13 PUT /api/echo |
| BusinessLogic | 1 | F14 标签生命周期 |
| DataFlow | 5 | F05 共享删除；F06/F07/F08/F11 导出导入 |

权限判断大体集中；问题是静态文件旁路和嵌套关联没有遵守它。目录/快照、正文/媒体、记录/文件、任务/真实上传应分别由一致的能力入口控制。

## 30. Dependency Weight Analysis

### Dependency Scoreboard

没有按未知依赖体积臆造“可删除”。构建 chunk 大小不是某个库的独占成本，未计算可精确归属的传递依赖数。

| Dependency | Status | Weight / Transitives | Used For | Recommended Action |
|---|---|---|---|---|
| Vue/Pinia/Router | Healthy（本次构建） | 深度使用；未独占测量 | 主站/Hub 状态与路由 | Keep |
| Markdown-it/highlight.js | 未发现调用漏洞 | 主站 markdown chunk gzip 约 39 KB、highlight 约 26 KB，含组合成本 | Markdown/语法高亮 | Keep；后续按交互预算测量 |
| Dicebear | 使用明确 | BaseAvatar chunk gzip 约 32 KB，非单库独占 | 动态头像 | Keep；没有 5 行内可等价替换证据 |
| Leaflet | 延迟地图能力 | LocationPicker chunk gzip 约 44 KB | 地点编辑 | Keep；不因大小直接删功能 |
| Gin/Huma/GORM/Wire | 深度使用 | 二进制独占贡献未测 | API/持久化/DI | Keep |
| SQLite CGO | 有意架构约束 | 影响跨平台编译 | 单机数据库 | Keep，修工具链校验 F24 |
| golang.org/x/crypto | TransitiveRisk 提示 | 当前 v0.58.0，扫描 GO-2026-5932 仅模块 trace | 认证/加密依赖 | AuditTransitives；不当作已调用漏洞 |
| pnpm/ARM64 musl 工具链 | VersionRisk/ToolchainComplexity | F23、F24 | 镜像构建 | 固定锁图及校验，不接受静默 fallback |

主站 `pnpm audit --prod --json` 返回 0 公告。本次 `govulncheck` 数据库更新时间为 2026-11-11，找到 `GO-2026-5932`：openpgp 不安全且已停用维护；结果仅包含模块级 trace，没有可达调用链，源码未见 openpgp 使用，因此没有列成可利用漏洞。参见 [Go issue 44226](https://go.dev/issue/44226) 与 [Go issue 81227](https://go.dev/issue/81227)。未对每个卫星项目单独完成生产依赖公告审查。

Gitleaks 的 5 个候选经定位属于 fixture 路径/字段名及其构建拷贝，没有据此确认真实泄漏。扫描没有覆盖整个 Git 历史；F09 的公开默认签名值仍单独作为部署安全问题处理。报告和测试输出不包含真实机密值。

## 31. Recommended Fix Order

### Fix Immediately

| 顺序 | 发现 | 交付与验收 |
|---:|---|---|
| 1 | F01 | 关闭保留目录静态旁路、移走敏感产物；匿名已知 ZIP/DB URL 不可读 |
| 2 | F03、F04、F09 | 持久撤销、窄写 DTO、唯一部署密钥；重启/窄 scope/Chart 用例通过 |
| 3 | F02 | 私密附件统一授权及缓存；匿名媒体不可读 |
| 4 | F05、F06、F07、F08 | 恢复共享资源与导入导出完整性，再允许依赖新快照删除旧数据 |
| 5 | F10 | 认证入口有应用限流；受控错误登录达到阈值后 429 |

如果真实部署确认曾公开生成快照，先判断外层代理是否阻断过这些路径及访问日志是否有下载，再轮换实际可能包含在快照里的凭据。当前审查没有线上访问证据，不能宣称已经发生泄漏。

### Fix Before Stable Release

F11–F24、F26：远端上传和取消结果、更新/标签/DST 正确性、HTTP/上传/解压预算、前端认证/草稿、CI 与构建输入。按相应卡片的失败用例验收，避免仅测试正常成功。

### Schedule Later

F25 先测量再调整，确认 tracker/缓存真实上限。逐步把本次高风险故障探针转成长期集成测试；不扩成全仓重写。

### Ignore for Now

没有当前 UI 调用的 direct-URL helper 可能误加 Authorization，本轮全库只找到 fetchGetConnect 定义，缺少实际调用证据，未列成高危泄漏；openpgp 模块级提示、大文件、命名偏好和生成代码行数不作为发布阻断。后续启用相关路径时需重新验证。

## 32. Quick Wins

| 项目 | 预估 | 注意事项 |
|---|---|---|
| 拦截保留静态目录并禁目录索引 | 1–2 小时 | 同时拦已知 URL；后续仍需目录分离 |
| 更新不存在目标时失败 | 1–2 小时 | 先检查目标，不留下关联副作用 |
| “今天”窗口改为下一自然日零点 | 约 1 小时 | 同时修 TTL，覆盖 DST 两个方向 |
| 移除冻结安装失败 fallback | 约 1 小时 | 让输入不一致显式失败 |
| 固定 ARM64 工具链 SHA256 | 1–2 小时 | 缺少校验值也应失败 |
| 更新源修正 | 1–2 小时 | 先确定二开/上游发布来源 |

这些是小范围改动，不等于更复杂的权限和数据完整性问题也能只靠几行补丁完成。

## 33. Long-term Refactor Plan

只建议与已复现结构问题直接相关的三个边界调整，每项分批提交、先补真实失败测试。

| 目标 | Motivation / Approach | 风险 | Testing strategy |
|---|---|---|---|
| 安全有效性来源 | F03：持久会话/令牌状态为事实，缓存仅加速；保留 authz、access、auth 的现有职责 | 数据迁移与旧 token 兼容，升级需明确 | 重启、撤销、注销、缓存淘汰、过期、scope/audience |
| 文件与产物生命周期 | F01/F02/F05–F08/F11：公开媒体、私有产物、归档布局分开；记录负责引用、文件负责物理对象、job 负责完成/上传/清理 | 既有 URL 和目录迁移、共享引用及旧快照格式 | 默认/自定义根、私密/共享文件、并发、取消、缺资源、S3 失败、round-trip |
| 认证传输和用户状态边界 | F19–F21：JSON/SSE 共用认证准备与预算；账号变化统一重置其编辑/草稿状态 | 刷新死循环、流重复提交、草稿策略变化 | 有效/失效 Cookie、过期 token、挂起请求、已开流不重放、双账号隔离 |

本报告是审查交付，以上修复尚未实施。报告中的 HTTP 结果和状态摘要已经足够复核结论；原始临时日志存于本机 /tmp/axoxe-audit-20261117，可能随系统清理删除，因此不要把临时路径当作长期验证档案。
