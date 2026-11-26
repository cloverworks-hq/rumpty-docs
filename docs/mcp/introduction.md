---
id: introduction
title: "Rumpty MCP: Connect Cursor, Claude Code & VS Code"
sidebar_label: Rumpty MCP
image: /img/og-mcp.jpg
slug: /mcp
description: Connect Cursor, Claude Code, VS Code, Codex, Zed or any MCP client to RumptyCloud. AI agents get over 100 tools to deploy apps, read logs, and manage VMs, databases, buckets, firewalls and billing.
keywords:
  - Rumpty MCP
  - RumptyCloud MCP
  - Model Context Protocol
  - MCP server
  - Cursor MCP
  - Claude Code MCP
  - VS Code MCP
  - AI agent cloud deployment
---

# Rumpty MCP

Rumpty MCP lets AI agents manage your account. Connect Cursor, Claude Code, VS Code or any other [Model Context Protocol](https://modelcontextprotocol.io) client, then ask in plain language: "deploy my repo and show me the build logs", "why is my app crashing?", "create a free Postgres database and connect it to my API".

| | |
|---|---|
| **Server URL** | `https://mcp.rumptycloud.com/mcp` |
| **Transport** | Streamable HTTP |
| **Authentication** | Sign in with your browser (OAuth), or `Authorization: Bearer <your API key>` |
| **Price** | Free. You pay only for the resources an agent creates. |

## Sign in with your browser

Clients that support MCP sign-in (OAuth), such as Claude, Cursor and VS Code, need only the server URL. Add `https://mcp.rumptycloud.com/mcp` as a remote server; the client opens RumptyCloud in your browser, where you choose what the agent may do and approve. There is no key to copy.

- The approval screen shows the app's name and the address it will send you back to. Only approve if you started the connection and that address belongs to your app.
- The connection appears under **Personal API keys** as `<app> (connected app)`. Revoke it there to disconnect the app.
- Access tokens last an hour and the client refreshes them on its own. If an app stops using the connection, it lapses after 30 days.

If your client can't sign in this way, use an API key instead. Don't do both: a client configured with an `Authorization` header sends that header and never offers browser sign-in.

## Use an API key

Create a personal API key under **Manage Profile → My profile → Personal API keys**. See [API keys](/settings/api-keys). Then put it in an environment variable so client configs can refer to it instead of holding the key:

```bash
export RUMPTY_API_KEY=rumpty_...
```

The agent uses that key. In each workspace it can do only what the key's permissions and your role both allow, and the server only lists the tools the key's permissions cover. A key created in the console with the default permissions can manage resources and secrets, and cannot see billing, members or audit logs. A viewer still cannot change anything. Give the key a clear name such as `Cursor MCP` so you can spot it in [audit logs](/audit-logs/introduction), and revoke it to cut the agent off.

:::tip
With the [Rumpty CLI](/cli/introduction), `rumpty mcp <client>` prints the setup below for one client, and `rumpty mcp install <client>` writes it into the client's config file for you. Neither ever prints or saves your key. See [Connect an AI client](/cli/mcp).
:::

## Connect your client

### Claude Code

Add to `.mcp.json` in your project. Claude Code fills in `${RUMPTY_API_KEY}` when it starts:

```json
{
  "mcpServers": {
    "rumpty": {
      "type": "http",
      "url": "https://mcp.rumptycloud.com/mcp",
      "headers": { "Authorization": "Bearer ${RUMPTY_API_KEY}" }
    }
  }
}
```

Or add it for every project. Run this where `RUMPTY_API_KEY` is set; your shell fills in the key, so it is saved in Claude Code's config:

```bash
claude mcp add --transport http --scope user rumpty \
  https://mcp.rumptycloud.com/mcp \
  --header "Authorization: Bearer $RUMPTY_API_KEY"
```

Run `claude mcp list` to confirm it connected.

### Cursor

Add the server to `~/.cursor/mcp.json` (all projects) or `.cursor/mcp.json` (one project):

```json
{
  "mcpServers": {
    "rumpty": {
      "url": "https://mcp.rumptycloud.com/mcp",
      "headers": { "Authorization": "Bearer ${env:RUMPTY_API_KEY}" }
    }
  }
}
```

Cursor reads `RUMPTY_API_KEY` from the environment it was started in. If you open Cursor from the dock, start it from a terminal instead or set the variable where desktop apps see it. Check **Output → MCP Logs** to confirm the tools loaded.

### VS Code

Add the server to `.vscode/mcp.json` in your project. VS Code asks for the key once and stores it securely:

```json
{
  "inputs": [
    { "type": "promptString", "id": "rumpty-key", "description": "RumptyCloud API key", "password": true }
  ],
  "servers": {
    "rumpty": {
      "type": "http",
      "url": "https://mcp.rumptycloud.com/mcp",
      "headers": { "Authorization": "Bearer ${input:rumpty-key}" }
    }
  }
}
```

Run **MCP: List Servers** from the command palette and start `rumpty`.

### OpenAI Codex CLI

```bash
codex mcp add rumpty --url https://mcp.rumptycloud.com/mcp --bearer-token-env-var RUMPTY_API_KEY
```

Or in `~/.codex/config.toml`:

```toml
[mcp_servers.rumpty]
url = "https://mcp.rumptycloud.com/mcp"
bearer_token_env_var = "RUMPTY_API_KEY"
```

Run `codex mcp list` to confirm.

### Gemini CLI

Run this where `RUMPTY_API_KEY` is set; your shell fills in the key, so it is saved in Gemini's `settings.json`:

```bash
gemini mcp add --scope user --transport http \
  --header "Authorization: Bearer $RUMPTY_API_KEY" rumpty https://mcp.rumptycloud.com/mcp
```

Run `gemini mcp list` to confirm.

### Zed

Zed does not read environment variables here, so paste the key itself. Add to `settings.json`:

```json
"context_servers": {
  "rumpty": {
    "url": "https://mcp.rumptycloud.com/mcp",
    "headers": { "Authorization": "Bearer rumpty_..." }
  }
}
```

The dot next to `rumpty` under **Settings → AI → MCP Servers** turns green when it is connected.

### Claude Desktop

Claude Desktop reaches remote servers with custom headers through [`mcp-remote`](https://github.com/geelen/mcp-remote), which needs Node.js. Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "rumpty": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://mcp.rumptycloud.com/mcp", "--header", "Authorization:${AUTH_HEADER}"],
      "env": { "AUTH_HEADER": "Bearer rumpty_..." }
    }
  }
}
```

Keep `Authorization:${AUTH_HEADER}` without spaces and put the key in `env`. Restart Claude Desktop.

### Other clients

Any client that can reach a remote HTTP MCP server and send a custom header works. Use the server URL above and send your API key in the `Authorization` header as `Bearer <key>`.

:::warning
Your API key can do everything its permissions and your role allow. Keep config files that contain it out of version control, and prefer the environment variable or secret input forms above.
:::

## Limit what the agent sees

Add parameters to the server URL to give an agent less to work with. Fewer tools also means the agent picks the right one more often.

| Parameter | Effect |
|-----------|--------|
| `workspace=<slug>` | Pins one workspace. Tools use it by default, refuse any other workspace, and hide what your role there can't do. |
| `read_only=true` | Hides every tool that creates, changes or deletes something. |
| `features=<groups>` | Lists only these tool groups, comma-separated: `account`, `deployments`, `vms`, `databases`, `storage`, `networking`, `billing`, `kubernetes`, `apps`, `inference`, `docs`. `whoami` and `list_workspaces` are always there. |

For example, a read-only agent for one workspace's apps and databases:

```text
https://mcp.rumptycloud.com/mcp?workspace=acme&read_only=true&features=deployments,databases
```

Group names the server doesn't know are ignored. If none of the groups is known, or `read_only` or `workspace` is malformed, the server answers `400 Bad Request`, so a typo never quietly gives the agent every tool.

## Command access

`run_vm_command` and `run_database_query` are off in every workspace until a workspace owner or admin turns them on under **Settings → AI assistants → Run commands and queries**. Until then those tools return an error.

With command access on, assistants can:

- run one non-interactive shell command at a time on the workspace's VMs, as the VM's default user. Commands act on the real server and can change it.
- run read-only SQL on PostgreSQL and MySQL databases and read-only Redis commands. Statements that write are refused.

Commands stop after at most 60 seconds and queries after 15. Both are recorded in the [audit log](/audit-logs/introduction), and members still need developer access or higher.

The setting blocks VM commands for every caller. For database queries it applies to assistants that signed in with the browser; a client set up with a personal API key can run read-only queries with the key's permissions whether the setting is on or off.

## Check that it works

Ask your agent "Which RumptyCloud workspaces do I have?". It calls `list_workspaces` and lists them. Most other tools take a workspace slug, so agents usually start there.

## Safety

- **Agents confirm first.** The server tells agents that creating, changing or deleting resources acts on real, billed infrastructure, and to confirm with you before doing so.
- **Deletes need the name typed back.** Permanent deletes (deployments, VMs, volumes, snapshots, firewall policies, SSH keys) require the resource's name as confirmed by you.
- **Commands are off until you turn them on.** `run_vm_command`, and `run_database_query` for browser sign-ins, need [command access](#command-access) in the workspace.
- **Database access is read-only.** `run_database_query` runs one read-only SQL statement on PostgreSQL or MySQL, or one read-only Redis command.
- **Payments stay with you.** Topping up the wallet, adding or removing cards, settling a balance and redeeming promo codes are not available to API keys, so an agent cannot start a payment.
- **Everything is audited.** Every change the agent makes shows up in [audit logs](/audit-logs/introduction) under your name.

## Tools

The server has 108 tools. It lists only those your key's permissions cover, so an agent never tries a tool the key can't use. A key with the default permissions doesn't see the billing tools, `get_inference_usage`, `list_audit_logs` or `list_workspace_members`: those need `billing.read`, `audit.read` and `members.manage`. The payment tools (`top_up_wallet`, `add_payment_card`, `remove_payment_card`, `settle_outstanding_balance`, `redeem_promo_code`) never appear for an API key.

| Area | Tools |
|------|-------|
| **Account** | `whoami`, `list_workspaces`, `get_workspace_overview`, `list_workspace_members`, `list_audit_logs`, `list_operations`, `get_catalog`, `list_apps` |
| **Deployments** | `list_deployments`, `create_deployment`, `deploy`, `restart_deployment`, `rollback_deployment`, `delete_deployment`, `update_deployment_settings`, `change_deployment_plan`, `list_deployment_runs`, `list_deployment_instances`, `get_deployment_activity` |
| **Logs & metrics** | `get_build_logs`, `get_runtime_logs`, `get_metrics` |
| **Environment** | `list_deployment_env_vars`, `set_deployment_env_var`, `delete_deployment_env_var`, `connect_database_to_deployment`, `connect_bucket_to_deployment` |
| **GitHub** | `connect_github`, `link_github_connection`, `list_github_repositories` |
| **Domains** | `list_domains`, `add_deployment_domain`, `verify_deployment_domain`, `remove_deployment_domain`, `add_vm_domain`, `verify_vm_domain`, `remove_vm_domain` |
| **Virtual machines** | `list_vms`, `create_vm`, `start_vm`, `stop_vm`, `reboot_vm`, `resize_vm`, `delete_vm`, `run_vm_command`, `expose_vm_port`, `unexpose_vm_port`, `list_vm_exposed_ports`, `set_vm_app_port` |
| **Snapshots** | `list_snapshots`, `create_vm_snapshot`, `restore_vm_snapshot`, `delete_vm_snapshot` |
| **Volumes** | `list_volumes`, `create_volume`, `attach_volume`, `detach_volume`, `delete_volume` |
| **Databases** | `list_databases`, `create_database`, `resize_database`, `delete_database`, `rotate_database_password`, `create_database_snapshot`, `restore_database_snapshot`, `delete_database_snapshot`, `list_database_tables`, `browse_database_table`, `run_database_query`, `list_redis_keys` |
| **Buckets** | `list_buckets`, `create_bucket`, `delete_bucket`, `list_bucket_objects`, `get_object_download_url`, `delete_bucket_object`, `set_bucket_cors`, `list_bucket_access_keys`, `revoke_bucket_access_key` |
| **Firewalls** | `list_firewall_policies`, `create_firewall_policy`, `update_firewall_policy`, `delete_firewall_policy`, `add_firewall_rule`, `update_firewall_rule`, `delete_firewall_rule`, `attach_firewall_policy`, `detach_firewall_policy` |
| **SSH keys** | `list_ssh_keys`, `add_ssh_key`, `delete_ssh_key` |
| **Kubernetes** | `list_kubernetes_clusters` |
| **AI inference** | `list_inference_projects`, `get_inference_usage` |
| **Billing** | `get_billing`, `list_invoices`, `list_wallet_transactions`, `list_wallet_ledger`, `list_payment_methods`, `top_up_wallet`, `add_payment_card`, `remove_payment_card`, `settle_outstanding_balance`, `get_promotions`, `redeem_promo_code` |
| **Support** | `list_support_tickets` |
| **Docs** | `search_docs` |

After a deploy, agents call `wait_for_deploy`. It waits for the build to finish and returns the app's URL, or the end of the build log if it failed. It waits up to 50 seconds per call and tells the agent to call again if the build is still running.

## Example prompts

- "Deploy github.com/me/my-api to my workspace and show me the build logs."
- "My deployment keeps restarting. Check the runtime logs and tell me why."
- "Create a free Postgres database, connect it to my api deployment, and redeploy."
- "Spin up a small VM, expose port 3000 and give me the URL."
- "Only allow 203.0.113.10 to reach my database."
- "What did I spend this month, and on what?" (needs a key with `billing.read`)

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `401 Unauthorized` | The key is wrong, expired or revoked. Create a new one and check the header reads `Bearer <key>`. With browser sign-in, reconnect the server in your client. |
| `400 Bad Request` | A URL parameter is invalid, for example `features` lists no group the server knows. |
| `429 Too Many Requests` | The agent is sending requests too fast. Clients retry after the time the server gives. |
| The agent can read but not change things | Your role in that workspace is viewer. Ask an admin to change it. |
| Tools don't appear | Restart your client after editing its config, and check the URL ends in `/mcp`. If the header shows a literal `${...}`, the client did not see `RUMPTY_API_KEY`; start it from a shell where the variable is set. |
| A tool you expected is missing | The key's permissions don't cover it. Create a key with the permission the tool needs, such as `billing.read` for billing tools and `get_inference_usage`. |
