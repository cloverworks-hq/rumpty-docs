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

## Your API key

Where the client supports it, the steps read your key from the `RUMPTY_API_KEY` environment variable, and `rumpty mcp` never prints a key. It tells you whether `RUMPTY_API_KEY` is set in your shell; if not, it links to [Personal API keys](/settings/api-keys) where you create one.

The tools an agent sees depend on the key's permissions. See [Rumpty MCP](/mcp#tools).

## Flags

| Flag | Description |
|------|-------------|
| `-o, --output` | `table` (default) or `json` |
