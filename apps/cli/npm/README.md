# @axoxe/cli

> AXOXE CLI is currently built from this source checkout. The `@axoxe/cli` package name is reserved in the build metadata; public npm publication is not assumed.


AXOXE 的命令行客户端：登录到一台 AXOXE 实例，在终端完成 Echo 的增删改查、标签管理、评论、互联与
Webhook 配置。命令树由实例下发的 operation catalog 生成，服务端新增接口不需要升级 CLI。

## 安装

```bash
git clone https://github.com/Versior/axoxe.git AXOXE
cd AXOXE/apps/cli
bun install --frozen-lockfile
bun link
# 或者
bun add -g @axoxe/cli
```

安装包按平台分发（`darwin` / `linux` × `arm64` / `x64`），自带运行时，不需要 Bun 或 Go。
不支持 Windows。

## 使用

```bash
axoxe auth login --server https://your-instance.example.com --device
axoxe info                          # 实例信息、版本、token 状态与 catalog
axoxe echo create --content "hello"
axoxe echo delete --id <id> --yes   # 删除前默认要求确认；脚本里显式 --yes
axoxe comment panel list --status pending
axoxe tag list
axoxe connect health
axoxe webhook list
axoxe help
```

## 其他分发渠道

独立二进制从 [GitHub Releases](https://github.com/Versior/axoxe/releases) 下载
`axoxe-cli-<os>-<arch>.tar.gz`，校验文件为同一页面的 `SHA256SUMS`。

## 链接

- 文档：[`docs/dev/cli-design.md`](https://github.com/Versior/axoxe/blob/main/docs/dev/cli-design.md)
- 源码：[`apps/cli`](https://github.com/Versior/axoxe/tree/main/apps/cli)
- 许可：AGPL-3.0-or-later
