# Mexico Hub Events MCP

stdio MCP server for **event management** backed by GitHub JSON (`data/*.json` in [mexico-hub](https://github.com/SumitJindalMX/mexico-hub)).

## Setup

```bash
cd mcp
npm install
```

## Environment

| Variable | Required | Default |
|----------|----------|---------|
| `MEXICO_HUB_OWNER` | no | `SumitJindalMX` |
| `MEXICO_HUB_REPO` | no | `mexico-hub` |
| `MEXICO_HUB_GITHUB_TOKEN` | **writes** | — |
| `MEXICO_HUB_PAGES_BASE` | no | `https://sumitjindalmx.github.io/mexico-hub/` |
| `MEXICO_HUB_BRANCH` | no | `main` |

Token needs **Contents: Read and Write** on the repo (classic `repo` or fine-grained Contents).

## Cursor `mcp.json`

```json
{
  "mcpServers": {
    "mexico-hub-events": {
      "command": "node",
      "args": [
        "c:/laptop_data/Projects/ATT/aSDLC/Cursor/tools/gdl-site-visibility/mcp/src/server.js"
      ],
      "env": {
        "MEXICO_HUB_OWNER": "SumitJindalMX",
        "MEXICO_HUB_REPO": "mexico-hub",
        "MEXICO_HUB_GITHUB_TOKEN": "YOUR_PAT_HERE"
      }
    }
  }
}
```

Adjust the `args` path to your machine. Restart Cursor after saving.

## Tools

**Read:** `events_list`, `events_get`, `registrations_list`, `scores_list`, `invites_list`

**Write:** `events_upsert`, `events_set_registration`, `registrations_add`, `scores_upsert`, `scores_publish`, `invites_create`

## Embed (portals)

For UI embed in other sites, see [../embed/](../embed/) and [../docs/events-mcp-embed.md](../docs/events-mcp-embed.md).
