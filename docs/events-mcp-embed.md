# Mexico Hub Events — MCP + Embed

Reusable **event management** for Mexico Hub, backed by GitHub JSON (`data/*.json`).

| Piece | Path | Use |
|-------|------|-----|
| **MCP server** | [`mcp/`](../mcp/) | Cursor / agents: list, create, register, score |
| **Embed widget** | [`embed/`](../embed/) | Drop into any portal HTML page |
| **Full portal** | site root | Branded Mexico Hub on GitHub Pages |

## Embed in another portal

```html
<link
  rel="stylesheet"
  href="https://sumitjindalmx.github.io/mexico-hub/embed/mexico-hub-events.css"
/>
<script
  type="module"
  src="https://sumitjindalmx.github.io/mexico-hub/embed/mexico-hub-events.js"
></script>

<mexico-hub-events
  base-url="https://sumitjindalmx.github.io/mexico-hub/"
  view="catalog"
  lang="en"
></mexico-hub-events>
```

### Attributes

| Attribute | Description |
|-----------|-------------|
| `base-url` | Pages root (must end with `/`) |
| `view` | `catalog` (default), `detail`, or `judge` |
| `event-id` | Pre-select / lock an event |
| `lang` | `en` or `es` (uses `event.es` when present) |
| `owner` / `repo` | GitHub repo for writes (defaults `SumitJindalMX` / `mexico-hub`) |
| `github-token` | Optional PAT for register/score writes from the widget |

Local demo: open [`embed/demo.html`](../embed/demo.html) (or serve the folder over HTTP).

**Security:** Prefer Hub sign-in for production writes. Passing `github-token` in a browser exposes it to that page’s JS — use only in trusted internal hosts.

## MCP (agents)

```bash
cd mcp
npm install
```

Cursor `mcp.json` example — see [`mcp/README.md`](../mcp/README.md).

Tools: `events_list`, `events_get`, `events_upsert`, `events_set_registration`, `registrations_list`, `registrations_add`, `scores_list`, `scores_upsert`, `scores_publish`, `invites_list`, `invites_create`.

Writes need `MEXICO_HUB_GITHUB_TOKEN`.

## Data contract

Same files as the live Hub:

- `data/events.json`
- `data/registrations.json`
- `data/scores.json`
- `data/invites.json`
