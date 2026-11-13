# AXOXE deployment

AXOXE is built from this fork, based on Ech0 v5.9.8. The upstream image does not contain AXOXE branding. Existing configuration keys and data formats remain compatible; see the [brand guide](./docs/brand/README.md).

## Build and run locally

Requirements: Go 1.27.3+, a C compiler, Node.js 26+, and pnpm 12.14.0. SQLite and vector search use CGO.

```shell
pnpm -C web install --frozen-lockfile
pnpm -C web build
go build -o bin/axoxe ./cmd/ech0
./bin/axoxe serve
```

The default server port is `6277`. The Go binary embeds the built frontend from `template/dist/`; build the frontend before compiling the backend.

The first registered account becomes the owner. Configure a persistent `JWT_SECRET` before running a persistent instance. A generated ephemeral secret invalidates sessions after a restart.

## Docker

Build the branded image from the repository root:

```shell
docker build -f docker/build.Dockerfile \
  --build-arg TARGETOS=linux \
  --build-arg TARGETARCH=amd64 \
  -t axoxe:local .
```

For an ARM64 server, use `TARGETARCH=arm64`. Set `JWT_SECRET` in your shell, then run:

```shell
docker run -d --name axoxe --restart unless-stopped \
  -p 6277:6277 \
  -v /opt/axoxe/data:/app/data \
  -e JWT_SECRET \
  axoxe:local
```

`axoxe:local` is a local image name, not a claim that an AXOXE image is published to a registry.

## Docker Compose

The [Compose example](./docker/docker-compose.yml) builds the fork and persists data in `docker/data/`.

```shell
docker compose -f docker/docker-compose.yml up -d --build
```

Set `JWT_SECRET` before starting. On ARM64, set `AXOXE_TARGETARCH=arm64`.

## Upgrade an existing instance

1. Export a snapshot and back up the current data directory. Include externally stored media when object storage is enabled.
2. Build the AXOXE image or binary from the source version you intend to deploy.
3. Point it at the existing data directory and retain the existing `JWT_SECRET` and authentication settings.
4. Start the new version and verify sign-in, the timeline, media, RSS, and the About page.

Do not replace or rename the existing database and media directories as part of branding. SQLite migrations run during startup; keep the pre-upgrade backup for rollback. A downgrade after schema migration should restore the matching backup and binary together.

Custom instance titles and saved content are retained. Change an existing instance's title in the settings panel if you want it to display AXOXE. Legacy `/Ech0.svg` and `/Ech0.png` URLs serve the new mark so saved settings continue to work.

## Configuration and integrations

Runtime configuration still uses `ECH0_*` keys and the existing `JWT_SECRET` alias rules. Webhook headers, capsule formats, importers, and the Go module path retain their compatibility names.

- [Configuration reference](./docs/usage/configuration.md)
- [Development guide](./docs/dev/development.md)
- [Storage migration](./docs/usage/storage-migration.md)
- [AGPL requirements](./docs/legal/agpl-compliance.md)
- [Source code](https://github.com/Versior/Ech0)

## Distribution

The installer, Helm chart, and release automation remain available for maintainers preparing releases. They require actual release artifacts or a configured image registry. Use the source build above until an AXOXE distribution has been published.
