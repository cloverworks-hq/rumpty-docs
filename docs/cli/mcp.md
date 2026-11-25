---
id: mcp
title: Connect an AI Client
sidebar_label: MCP
---

# Connect an AI Client

`rumpty mcp` prints what you need to connect Cursor, Claude Code, VS Code or another AI client to [Rumpty MCP](/mcp): the server URL, how to authenticate, and setup steps for each client. It needs no login and makes no API calls. Available in CLI v0.2.0 and later.

## Quick start

```bash
rumpty mcp            # server details and the list of clients
rumpty mcp cursor     # setup steps for Cursor
rumpty mcp -o json    # the same details as JSON, for scripts
```

Clients: `claude-code`, `cursor`, `vscode`, `codex`, `gemini`, `zed`, `claude-desktop`.

## Write the config for you

`rumpty mcp install <client>` adds Rumpty MCP to the client's config file. It changes only the `rumpty` entry and keeps your other servers as they are. Available in CLI v0.3.0 and later.

```bash
rumpty mcp install cursor               # ~/.cursor/mcp.json
rumpty mcp install cursor --scope project   # ./.cursor/mcp.json
rumpty mcp install vscode --dry-run     # show the change, write nothing
```

| Client | `--scope user` | `--scope project` |
|--------|----------------|-------------------|
| `cursor` | `~/.cursor/mcp.json` (default) | `./.cursor/mcp.json` |
| `vscode` | not supported | `./.vscode/mcp.json` (default) |
| `claude-code` | runs `claude mcp add --scope user` | `./.mcp.json` (default) |
| `gemini` | `~/.gemini/settings.json` (default) | `./.gemini/settings.json` |
| `codex` | `~/.codex/config.toml` (default) | not supported |

Zed and Claude Desktop need the key pasted into their config, so `install` prints the steps instead of editing those files.

The written config refers to `RUMPTY_API_KEY` (VS Code asks for the key once instead), so the key itself never lands in a file. Because the config sends your key as a header, the client won't offer browser sign-in; to use [sign-in](/mcp#sign-in-with-your-browser) instead, add just the server URL in your client. If a different `rumpty` entry is already there, `install` stops; add `--force` to replace it. It also stops, without touching the file, if it can't safely rewrite it, for example JSON with comments.

## Your API key

Where the client supports it, the steps read your key from the `RUMPTY_API_KEY` environment variable, and `rumpty mcp` never prints a key. It tells you whether `RUMPTY_API_KEY` is set in your shell; if not, it links to [Personal API keys](/settings/api-keys) where you create one.

The tools an agent sees depend on the key's permissions. See [Rumpty MCP](/mcp#tools).

## Flags

| Flag | Description |
|------|-------------|
| `-o, --output` | `table` (default) or `json` |
| `--scope` | `install` only: `user` or `project` |
| `--dry-run` | `install` only: print the change and write nothing |
| `--force` | `install` only: replace an existing, different `rumpty` entry |
