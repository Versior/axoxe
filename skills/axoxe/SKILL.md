---
name: axoxe
description: 'Use the axoxe CLI to inspect an AXOXE instance, browse Echoes and files, upload media, create and edit posts with tags, files and extensions, publish and moderate comments, manage Connect federation links and peer health, tags and webhooks, and log in with profiles or device authorization. Use when the task involves ech0, an AXOXE instance, or its timeline.'
---

# axoxe

`axoxe` is the command-line client for an AXOXE instance (a self-hosted microblog).
Run `axoxe help --json` to see what this instance supports, and look commands up
instead of assuming flags.

Add `--json` whenever you parse output. Exit codes: `0` success, `2` usage error,
`1` server or network error. Destructive commands (`echo delete`, `tag delete`,
`connect delete`, `comment panel delete`, `webhook delete`) never prompt in pipes
or with `--json`; they require `--yes`, so confirm with the human first.

## Before you start

```bash
axoxe info                   # server, version, site, counts, token state, catalog
axoxe auth status            # which profile and server are active
axoxe auth login --server https://ech0.example.com --device
```

Login modes, profiles and CI: [references/auth.md](references/auth.md).

## Common tasks

```bash
# Read the timeline, one Echo, or a curated view
axoxe echo list --page 1 --page-size 20 --json
axoxe echo list --cursor "" --page-size 50 --json        # keyset paging: then pass data.nextCursor
axoxe echo list --search daily --sort-by reactions --json
axoxe echo list --tag-ids <tag_id> --no-private --json   # public only
axoxe echo get --id <echo_id> --json
axoxe echo hot --limit 10 --json
axoxe echo today --json
axoxe echo random --json
axoxe echo onthisday --json

# Publish text
axoxe echo create --content "今天的想法" --tag daily

# Publish with a file: upload first, then reference the file id
axoxe file upload --file ./photo.png --json
axoxe echo create --content "配图" --file-id <file_id>

# Browse files, inspect metadata, download content
axoxe file list --search photo --json
axoxe file get --id <file_id> --json
axoxe file download --id <file_id> --output ./photo.png

# Register media that already lives elsewhere (no bytes uploaded)
axoxe file external --url https://example.com/photo.png --category image --json

# Edit: fetch it, change it, send it back
axoxe echo get --id <echo_id> --json
axoxe echo update --id <echo_id> --content "改过的正文" --tag daily

# Delete (ask the human first; non-interactive runs must add --yes)
axoxe echo delete --id <echo_id> --yes

# Read, write and moderate comments
axoxe comment list --echo-id <echo_id> --json
axoxe comment create --echo-id <echo_id> --content "写得好" --nickname "CI Bot"
axoxe comment panel list --status pending --json          # needs comment:review
axoxe comment panel status --id <comment_id> --status approved
axoxe comment panel delete --id <comment_id> --yes        # needs comment:delete

# Inspect and manage Connect federation links
axoxe connect list --json
axoxe connect info --json
axoxe connect health --json
axoxe connect add --connect-url https://peer.example
axoxe connect delete --id <uuid> --yes

# Tags: list ids for --tag-ids, or clean up a tag everywhere
axoxe tag list --json
axoxe echo list --tag-ids <tag_id>,<tag_id> --json
axoxe tag delete --id <tag_id> --yes

# Webhooks: list, create, test or remove automation targets
axoxe webhook list --json
axoxe webhook create --name ci --url https://example.com/hook --is-active
axoxe webhook test --id <webhook_id>
axoxe webhook delete --id <webhook_id> --yes
```

Echo create/update/delete, tag delete, Connect add/delete, comment deletion and
every webhook command require an admin account. Field
meanings, attachment rules and merge behaviour:
[references/echo.md](references/echo.md). Comment creation uses the trusted
integration route (`comment:write`); moderation needs `comment:review`, deletion
needs `comment:delete`: [references/comments.md](references/comments.md). Peer
links and health: [references/connect.md](references/connect.md). Tags and
webhooks: [references/tags.md](references/tags.md),
[references/webhooks.md](references/webhooks.md).

## Finding the right command

- `axoxe help --json` — everything you can run, local and server-side.
- `axoxe help <namespace> --json` — commands in one group (`axoxe help echo`).
- `axoxe help <words> --json` — search by name or field (`axoxe help upload`).
- `axoxe help <id> --json` — one command in full: fields, examples, hints.
  `<command> --help` prints the same.

## Output and errors

`--json` prints the response body; errors go to stderr with a hint. Streams print
one JSON line per event. Binary results go to a file with `--output <path>`.

Flags, arrays, payloads and error handling:
[references/operations.md](references/operations.md).
