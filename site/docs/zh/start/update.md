---
title: 升级与更新
description: 升级 AXOXE 二开源码构建，保留数据和配置
---

升级前导出快照并备份数据目录。启用对象存储时同时备份媒体。保留现有 `JWT_SECRET`、认证设置和数据挂载。

## Docker Compose

在 AXOXE 源码目录中更新到准备部署的版本，然后重新构建：

```bash
git pull --ff-only
docker compose -f docker/docker-compose.yml up -d --build
```

该命令使用二开的 Compose 配置。已有实例继续使用原来的数据挂载，不要切换到空目录。

## Docker

按照 [安装指南](/zh/docs/start/installation) 重新构建 AXOXE 镜像。停止并替换原容器时，保留数据卷和环境配置。源码构建使用 `axoxe:local`；上游镜像不包含二开品牌。

## Kubernetes（Helm）

先构建并推送 AXOXE 镜像到集群可访问的仓库，再升级已有 Helm release：

```bash
helm upgrade axoxe ./charts/ech0 \
  --set image.repository=YOUR_REGISTRY/axoxe \
  --set image.tag=YOUR_IMAGE_TAG
```

使用原来的 release 名、命名空间和 values 文件。源码目录 `charts/ech0` 保留用于兼容。

## 验证与回滚

启动后检查登录、时间线、媒体、RSS 和关于页。SQLite 会在启动时执行迁移。若旧版本需要旧数据库结构，应一同恢复升级前的快照和匹配的二进制。

完整构建命令见 [部署指南](https://github.com/Versior/axoxe/blob/main/DEPLOYMENT.md)，排查见 [常见问题](/zh/docs/start/faq)。
