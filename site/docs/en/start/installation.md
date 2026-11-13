---
title: Installation
description: Docker / Compose / binary / Helm; ports, data, and security essentials
---

# AXOXE installation

Build this fork to get the AXOXE interface and icons. Upstream images do not include these changes.

```shell
git clone https://github.com/Versior/Ech0.git AXOXE
cd AXOXE
pnpm -C web install --frozen-lockfile
pnpm -C web build
go build -o bin/axoxe ./cmd/ech0
./bin/axoxe serve
```

Requirements: Go 1.27.3+, a C compiler, Node.js 26+, and pnpm 12.14.0. Build the frontend before the backend so the SPA is embedded in the binary. Set a persistent `JWT_SECRET` before running a persistent instance.

## Docker

```shell
docker build -f docker/build.Dockerfile --build-arg TARGETOS=linux --build-arg TARGETARCH=amd64 -t axoxe:local .
docker run -d --name axoxe -p 6277:6277 -v /opt/axoxe/data:/app/data -e JWT_SECRET axoxe:local
```

For ARM64 use `TARGETARCH=arm64`. The first registered account becomes owner. Existing instance data and configuration keys are preserved.

## Docker Compose

From the cloned repository, with `JWT_SECRET` set:

```shell
docker compose -f docker/docker-compose.yml up -d --build
```

The Compose example builds the local image and mounts `docker/data/`. Back up your existing data before upgrading and reuse its directory and JWT secret.

## Further configuration

Consult [the deployment guide](https://github.com/Versior/Ech0/blob/main/DEPLOYMENT.md) for upgrades and [the configuration reference](https://github.com/Versior/Ech0/blob/main/docs/usage/configuration.md) for `ECH0_*` variables.
