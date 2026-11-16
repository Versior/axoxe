---
title: 安装部署
description: 从二开源码构建并部署 AXOXE
---

AXOXE 基于 Ech0 v5.9.9。部署时使用本仓库构建的二进制或镜像。上游镜像不包含 AXOXE 品牌。

## 本机源码构建

需要 Go 1.27.4+、C 编译器、Node.js 26+ 和 pnpm 12.14.0。SQLite 与向量检索依赖 CGO。

```shell
git clone https://github.com/Versior/axoxe.git
cd axoxe
pnpm -C web install --frozen-lockfile
pnpm -C web build
go build -o bin/axoxe ./cmd/ech0
./bin/axoxe serve
```

先构建前端，再编译 Go，前端会嵌入二进制。默认端口为 `6277`。用于长期运行的实例应先配置持久的 `JWT_SECRET`。

## Docker

在仓库根目录构建二开镜像。先在终端配置 `JWT_SECRET`，再启动：

```shell
docker build -f docker/build.Dockerfile \
  --build-arg TARGETOS=linux \
  --build-arg TARGETARCH=amd64 \
  -t axoxe:local .
docker run -d --name axoxe --restart unless-stopped \
  -p 6277:6277 \
  -v /opt/axoxe/data:/app/data \
  -e JWT_SECRET \
  axoxe:local
```

ARM64 服务器使用 `TARGETARCH=arm64`。`axoxe:local` 是本机构建的镜像名。首个注册账号成为 Owner。已有实例保留原来的数据挂载和认证配置。

## Docker Compose

在源码目录中执行，`JWT_SECRET` 应已配置：

```shell
docker compose -f docker/docker-compose.yml up -d --build
```

Compose 会构建二开镜像，数据保存在 `docker/data/`。ARM64 服务器先设置 `AXOXE_TARGETARCH=arm64`。升级已有实例时继续使用原数据目录与 JWT 密钥。

## 后续配置

升级见 [部署指南](https://github.com/Versior/axoxe/blob/main/DEPLOYMENT.md)，`ECH0_*` 配置项见 [配置参考](https://github.com/Versior/axoxe/blob/main/docs/usage/configuration.md)。
