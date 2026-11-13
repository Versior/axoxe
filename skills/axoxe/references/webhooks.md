# Webhooks

Webhooks push AXOXE events to an HTTP(S) URL. Every webhook command requires an
admin account; the API scope is `admin:webhook`.

## List

```bash
axoxe webhook list --json
```

Each entry has `id`, `name`, `url`, `is_active`, `last_status`, `last_trigger`,
`created_at` and `updated_at`. The signing `secret` is never returned.

## Create

```bash
axoxe webhook create --name ci --url https://example.com/hook --is-active
axoxe webhook create --name ci --url https://example.com/hook --secret <secret> --is-active
```

`--name` and `--url` are required. The URL must be reachable over HTTP(S).
`--secret` enables the `X-Ech0-Signature: sha256=<hex>` header. Omitting
`--is-active` on create leaves the server default (active).

## Update

```bash
axoxe webhook update --id <webhook_id> --name ci --url https://example.com/hook --is-active
```

Update is a full replace: fetch `webhook list` first. **Omitting `--is-active`
deactivates the webhook; omitting `--secret` clears the signing secret.**

## Test and delete

```bash
axoxe webhook test --id <webhook_id>       # send one test event
axoxe webhook delete --id <webhook_id> --yes
```

`webhook test` reports delivery failure as an error. Deleting only removes the
local webhook configuration.
