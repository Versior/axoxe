---
title: 命令行（CLI）
description: 在终端发帖、审核评论、查看实例
---

> AXOXE CLI 目前从本仓库源码构建。`@axoxe/cli` 是准备使用的分发名称，尚不能假定已在 npm 发布。按下面的源码方式安装，需要 Bun 1.4.4 或更新版本。


`axoxe` 是 AXOXE 的命令行客户端，适合批量操作、脚本和服务器排障。日常使用在网页里点也完全可以。

---

## 安装

```bash
git clone https://github.com/Versior/axoxe.git AXOXE
cd AXOXE/apps/cli
bun install --frozen-lockfile
bun link
```

独立二进制支持 macOS / Linux（arm64 / x64），自带运行时，不需要额外装 Node 或 Go；暂不支持 Windows。AXOXE 发布资产上传后，将在 [GitHub Releases](https://github.com/Versior/axoxe/releases) 使用 `axoxe-cli-<os>-<arch>.tar.gz` 命名。

---

## 登录

```bash
axoxe auth login --server https://你的域名 --device
```

浏览器打开提示的链接并确认即可，令牌默认保存 1 个月。登录信息按实例分开保存，多台实例用 `axoxe config list` / `axoxe config use <名字>` 切换。

其他登录方式（脚本或 CI）：

```bash
axoxe auth login --server https://你的域名 -u admin          # 用户名 + 隐藏输入密码
echo "$TOKEN" | axoxe auth login --server https://你的域名 --token -
```

CI 里也可以直接用 `ECH0_SERVER` + `ECH0_TOKEN` 两个环境变量，不落盘。

---

## 先看看这台实例

```bash
axoxe info
```

一次显示：站点名、版本、帖子数、是否已初始化、当前登录状态、命令清单是否最新。`--json` 输出给脚本。

---

## 常用操作

```bash
# 浏览
axoxe echo list --page 1 --page-size 20
axoxe echo get --id <帖子ID>

# 发帖（图片先上传，再引用返回的 ID）
axoxe file upload --file photo.png
axoxe echo create --content "今天的想法" --tag daily --file-id <文件ID>

# 评论审核
axoxe comment panel list --status pending
axoxe comment panel status --id <评论ID> --status approved

# 互联健康
axoxe connect health
```

- 删除类命令会先确认；脚本或 `--json` 输出必须加 `--yes`。
- 文件没有删除命令：文件可能仍被帖子引用，请在网页面板处理。

---

## 权限

默认登录已覆盖上面这些命令。如果只想给脚本只读权限，登录时指定：

```bash
axoxe auth login --server https://你的域名 --device --scopes echo:read,file:read
```

调用返回 403 就是令牌缺权限，重新登录换一个令牌即可。完整权限说明见 [访问令牌](/zh/docs/guide/accesstoken)。

---

## 帮助与输出

```bash
axoxe help                       # 所有命令
axoxe help echo                  # 某一组
axoxe help comment panel list    # 单条命令的字段与示例
```

`--json` 输出原始响应，`--yaml` 输出 YAML。退出码：`0` 成功，`2` 用法错误，`1` 服务端或网络错误。

服务端新增接口不需要升级 CLI：命令清单会随实例更新，过期时自动刷新。

---

## 给 AI 助手用

```bash
axoxe install skills ~/.claude/skills
```

把 AXOXE 的命令说明（含权限与安全约定）装进 Claude Code 等工具的 skills 目录。
