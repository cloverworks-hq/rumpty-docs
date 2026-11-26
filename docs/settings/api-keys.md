---
id: api-keys
title: API Keys
sidebar_label: API keys
---

# API Keys

API keys are tokens for CLI tools and automation, used with the Rumpty CLI, the [Rumpty MCP](/mcp) and GitHub Actions workflows. Manage them under **Manage Profile → My profile → Personal API keys**.

API keys are personal and must not be shared with teammates. A key can act only in workspaces where you are a member, and only for the permissions on the key. Your role still applies, so a key cannot do something your role cannot do.

## Permissions

Set `permissions` when you [create a key](/api/api-keys/create-an-api-key). If you leave it out, the key gets the default set. Keys that already exist use that same default.

| Permission | Allows |
|---|---|
| `workspace.read` | List and view resources. Included by default. |
| `resource.write` | Create, change and delete resources. Included by default. |
| `runtime.connect` | SSH, command execution, and the terminal. Included by default. |
| `secrets.read` | Read credentials and environment variable names. Included by default. |
| `secrets.manage` | Change secrets, reveal environment variables, and manage SSH keys. Included by default. |
| `members.manage` | Invite people and change roles. |
| `audit.read` | Read the audit log. |
| `billing.read` | Read the wallet, invoices, and inference usage. |
| `billing.manage` | Change inference overage. |
| `workspace.manage` | Change workspace settings. |
| `workspace.transfer` | Transfer the workspace. |
| `workspace.delete` | Delete the workspace. |

A key cannot change your password, second factor, or profile, add or remove a payment card, top up the wallet, mint or revoke API keys, accept a workspace invitation, or call the admin API. Sign in to the console for those.

:::warning
The token is only shown once immediately after creation. Copy it before leaving the page; it cannot be viewed again.
:::

## Create an API key

1. Enter a **Key name** (e.g. `Laptop CLI`, `CI deploy`, `staging bot`)
2. Set an **Expiration**: 30 days, 90 days, 1 year (default), 2 years, or never expires
3. Choose **Permissions**. Recommended is already selected. Choose **All** to also allow billing, members, the audit log, workspace settings, and deleting a workspace. You can tick or clear any individual permission.
4. Click **Create key**
5. Copy the token immediately

## Existing keys

The **Existing Keys** panel lists all active tokens:

| Field | Details |
|-------|---------|
| **Name** | The label you gave the key |
| **Prefix** | First few characters of the token for identification |
| **Created** | Creation date and time |
| **Expires** | Expiry date and time, or `Never` |
| **Last used** | When the key was last used in a request |

## Revoke a key

Click **Revoke** next to a key to immediately invalidate it. Any CLI or automation using that token will stop working.

## Connected apps

When you connect an AI assistant to the [Rumpty MCP](/mcp) by signing in with your browser, it gets a key named `<app> (connected app)` in this list. It works like any other key, with the permissions you approved, and its tokens refresh every hour. Revoke it to disconnect the assistant from all your workspaces.

## Using an API key

API keys are used by the Rumpty CLI for authentication:

```bash
rumpty login --token <your-api-key>
```

AI agents in Cursor, Claude Code and VS Code use them to connect to the [Rumpty MCP](/mcp).

They are also used as the `RUMPTY_TOKEN` secret in GitHub Actions deploy workflows. See [Deploy](/virtual-machines/deploy) for the full GitHub Actions setup.