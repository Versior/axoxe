---
title: Updating
description: Upgrade the AXOXE source build while retaining data and configuration
---

Export a snapshot and back up the data directory before upgrading. Back up object storage too when enabled. Preserve the existing `JWT_SECRET`, authentication settings, and data mount.

## Docker Compose

From your AXOXE checkout, fetch the source version you intend to deploy, then rebuild:

```bash
git pull --ff-only
docker compose -f docker/docker-compose.yml up -d --build
```

This command uses the fork's Compose configuration. An existing deployment must continue to use its current data mount; do not switch it to an empty directory.

## Docker

Rebuild the branded image using the [installation guide](/docs/start/installation). Stop and replace your existing container with the new image, retaining its data volume and environment. Source builds use `axoxe:local`; the upstream image does not contain this fork's branding.

## Kubernetes (Helm)

Build and publish the AXOXE image to your cluster's registry, then update the existing Helm release:

```bash
helm upgrade axoxe ./charts/ech0 \
  --set image.repository=YOUR_REGISTRY/axoxe \
  --set image.tag=YOUR_IMAGE_TAG
```

Use your existing release name, namespace, and values file. The `charts/ech0` source path remains for compatibility.

## Verify and roll back

Check sign-in, the timeline, media, RSS, and the About page after startup. SQLite migrations run at startup. If a downgrade requires an older schema, restore the matching pre-upgrade snapshot and binary together.

See the [deployment guide](https://github.com/Versior/axoxe/blob/main/DEPLOYMENT.md) for the full build commands and [FAQ](/docs/start/faq) for troubleshooting.
