# 分享卡片与可抓取性（SEO / OG）

爬虫分两类，处理方式必须同时满足：

- **执行 JS**：Googlebot 会渲染 SPA，但 initial HTML 仍是抓取和 canonical 判定的第一依据。
- **不执行 JS**：Slack / Telegram / X / Discord / 微信的 unfurl 服务，以及多数 AI 抓取器，只读 HTML。

因此 HTML 外壳**不能**只在客户端补 meta。后端在每次 HTML 请求时注入完整 `<head>` 与无 JS 正文，客户端只在路由切换后同步。

## 1. 服务端渲染链路

| 位置 | 职责 |
| --- | --- |
| `internal/handler/web/web.go` | 读内嵌 `dist/index.html`，按请求类型分派：静态资源 / SPA 路由 / 404 |
| `internal/handler/web/seo.go` | 路由表、meta 生成、JSON-LD、Markdown 去标记、`<noscript>` 正文 |
| `web/index.html` | 提供两对标记区间与 dev 兜底内容 |
| `web/src/composables/useSeoHead.ts` | 路由切换后同步同一份 meta |
| `web/src/composables/useSeoOverride.ts` | echo 详情页的覆盖值（标题/摘要/首图/BlogPosting） |

### 标记区间

```html
<!--ECH0_SEO_START--> … dev 兜底 meta … <!--ECH0_SEO_END-->
<div id="app">
  <!--ECH0_NOSCRIPT_START--><!--ECH0_NOSCRIPT_END-->
</div>
```

服务端**整段替换**，因此不会出现重复 meta。标记缺失时（旧 dist）退化为插入到 `</head>` 与 `</body>` 前，不会白屏。dev 下 Vite 直接提供带兜底内容的原始文件。

### 路由表必须双向同步

`internal/handler/web/seo.go` 的 `spaRoutes` 与 `web/src/router/index.ts` 是同一份事实的两处表达：前端新增/改名路由时**必须**同步这里，否则该路径会被服务端回 404（仍返回 shell，客户端路由照常渲染，但搜索引擎不会收录）。

`/panel` 前缀与 `/oauth/` 前缀按前缀匹配；`/echo/{id}` 单独处理。

`/privacy` 是唯一由设置决定是否存在的公开页：`SystemSetting.privacy_policy` 为空（或仅空白）时服务端直接返回 404，因此它不在 `spaRoutes` 中，而是在 `serveRoute` 里单独判断。页脚入口由 `show_privacy_footer` 与内容非空共同决定。

## 2. URL 规则

- canonical 与 `og:url` 一律 `绝对 URL`，origin 取**本次请求**的 origin（`internal/util/reqinfo`，支持 `X-Forwarded-Proto/Host`）。
- canonical、分享卡片、RSS、sitemap 和 discovery 均使用本次请求的 origin；不读取 `server_url`，避免用户配置改变内容的实际访问域名。
- canonical 只取 path，不带 query。

## 3. 索引与状态码

- 每页输出 `index,follow,max-image-preview:large` 或 `noindex,nofollow`。
- noindex 路由同时下发 `X-Robots-Tag: noindex,nofollow`——不执行 JS 的爬虫只看得到头。
- 未知路径、`/echo/` 下不存在或私有的 id：**404 + shell + noindex**。私有内容一律按不存在处理，不泄露存在性。
- 缺失静态资源（带扩展名）返回纯 404，不返回 HTML，避免图片被当作软 404 页面。
- `/api`、`/ws`、`/mcp`、`/.well-known` 永不落入 SPA fallback。

## 4. 机器可读入口

| 路径 | 内容 |
| --- | --- |
| `/robots.txt` | `Disallow` 覆盖所有 noindex 路由 + `Sitemap:`；只写 RFC 9309 字段，不写 `Agentmap:`（Google 会判为无效行） |
| `/sitemap.xml` | 固定页（`/`、`/hub`、`/about`、`/rss`）+ 全部公开 echo（`<lastmod>` 取创建时间，单文件上限 50,000） |
| `/rss` | Atom；浏览器 `Accept: text/html` 时返回落地页 |
| `/llms.txt`、`/.well-known/ard.json` | 智能体发现（可在设置中关闭） |

sitemap 通过 `CommonService.ListSitemapEntries` 只查询 `id, created_at`，不加载文件与标签。

## 5. Echo 详情页

服务端在 `/echo/{id}` 上渲染：

- `<title>`：正文首行去 Markdown 后截断 60 字
- description：全文去标记后截断 160 字
- `og:type=article` + `article:published_time`
- 首图：该 echo 的第一张图片（绝对化）；否则 `og-cover.jpg`
- JSON-LD `BlogPosting`（headline / datePublished / author / image / mainEntityOfPage / publisher）
- `<noscript>`：正文纯文本 + 指向本页的链接

客户端首屏**不覆盖**服务端已渲染的 article meta（`useSeoHead` 检测 `og:type=article` 后等待 `useSeoOverride`），echo 加载完成后写入同一份数据；离开页面时清除覆盖并恢复 `WebSite` JSON-LD。

## 6. 品牌视觉与封面

AXOXE 的 [品牌规范](../brand/README.md) 和 SVG 源文件是视觉的统一来源。

| 元素 | 值 |
| --- | --- |
| 纸底 | `#f4f1ec` |
| 墨色 | `#29231e` |
| 点缀 | `#b84200` 暖铜色 |
| 图形 | 四条对角笔画、开放圆环与一个铜色圆点 |
| 字标 | 路径绘制的 `AXOXE`，不依赖字体 |
| 标语 | `Where moments stay.` |

`web/public/og-cover.jpg` 为 1200×630 的分享封面；同版 PNG 存在于 `web/public/og-cover.png`。`axoxe.png` 用于 publisher logo，`axoxe.svg` 用于 RSS。旧资产地址作为兼容别名返回同一套 AXOXE 图案。

生成 SVG、PNG 与 ICO：

```bash
npm install --prefix /tmp/axoxe-brand-tools @resvg/resvg-js
AXOXE_BRAND_TOOLS=/tmp/axoxe-brand-tools node scripts/generate-brand-assets.mjs
```

JPEG 分享图可由生成的 PNG 导出。保留 `og:image:width/height/type/alt`；当条目使用自有图片时，不填未知尺寸。

## 7. 验证

```bash
go test ./internal/handler/web ./internal/handler/common
curl -s localhost:6277/echo/<id> | grep -E '<title>|canonical|og:type|BlogPosting'
curl -s localhost:6277/sitemap.xml | head
curl -sI localhost:6277/panel | grep -i x-robots
curl -s -o /dev/null -w '%{http_code}\n' localhost:6277/unknown-path   # 404
```
