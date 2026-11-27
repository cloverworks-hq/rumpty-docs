---
id: load-balancer
title: Manage Load Balancers
sidebar_label: Load balancer
---

# Manage Load Balancers

`rumpty load-balancer` (aliases `lb` and `load-balancers`) puts 1 to 10 VMs behind one HTTPS address and manages it from the terminal. See [Load Balancers](/networking/load-balancers) for how load balancers work.

## Quick start

```bash
rumpty lb create web --vm web-1 --vm web-2 --port 8080 --health-path /healthz
```

The command waits until the load balancer is ready, then prints its URL and targets:

```
✓ Created load balancer web (42s)
URL: https://web-5d6e7f80.rumptycloud.app
Targets: web-1, web-2
Billed $2/month, hourly, until you delete it.
View: rumpty lb get web --ws my-workspace
```

## Commands

| Command | What it does |
|---------|--------------|
| `rumpty lb ls` (alias `list`) | List load balancers in the workspace |
| `rumpty lb get <load-balancer>` | Show a load balancer's settings, health and targets |
| `rumpty lb traffic <load-balancer>` | Show live health and request traffic |
| `rumpty lb create <name> --vm <vm>... --port <port>` | Create a load balancer in front of your VMs |
| `rumpty lb update <load-balancer>` | Change settings or replace the targets |
| `rumpty lb add-target <load-balancer> <vm>...` | Send traffic to more VMs |
| `rumpty lb remove-target <load-balancer> <vm>` | Stop sending traffic to a VM |
| `rumpty lb delete <load-balancer>` (alias `rm`) | Delete a load balancer |

Load balancers and VMs can be given by name or UID. `create`, `update`, `add-target`, `remove-target` and `delete` wait until the change is live, for up to 10 minutes.

## List and inspect

```bash
rumpty lb ls
rumpty lb ls -o json
rumpty lb get web
rumpty lb get web -o json
```

`ls` shows each load balancer's name, status, protocol, port, targets and URL. `get` adds the live health (how many targets are taking traffic right now), the health check, sticky sessions, allowed IPs, the last failure if there is one, and a table of targets with each VM's health and status. The JSON output of `get` doesn't include health; use `rumpty lb traffic -o json` for that.

| Flag | Description |
|------|-------------|
| `-o`, `--output` | Output format: `table` (default) or `json` |

## Traffic and health

```bash
rumpty lb traffic web
rumpty lb traffic web --range 7d
rumpty lb traffic web -o json
```

```
Load balancer:   web
Health:          degraded (1/2 targets healthy)
  web-1          healthy
  web-2          unhealthy (failing health checks or returning errors)

Traffic (1h)
  ▂▃▅▇█▆▅▃▂▃▅▆▇
  Requests:      8.3k (138/min)
  5xx errors:    30 (0.36%)
  4xx:           41
  Avg response:  23 ms
  Bandwidth:     1.8 MB in, 50.0 MB out
```

Health is one of `healthy`, `degraded` (some targets out), `down` (no target is passing its health check, so visitors get a 503 page), `no targets`, or `unknown` when it can't be read right now. Below it, each target is `healthy`, `unhealthy`, `starting` or `stopped`, with the reason. It is usually 15 to 45 seconds behind, depending on your health check settings.

| Flag | Description |
|------|-------------|
| `--range` | Time range: `1h` (default), `6h`, `24h` or `7d` |
| `-o`, `--output` | Output format: `table` (default) or `json`. JSON has a `health` and a `traffic` object |

## Create

```bash
rumpty lb create web --vm web-1 --vm web-2 --port 8080
rumpty lb create web --vm web-1,web-2 -p 8080 --health-path /healthz --sticky
rumpty lb create api --vm api-1 --port 50051 --protocol grpc
rumpty lb create admin --vm admin-1 --port 3000 --allow 203.0.113.0/24
```

The name becomes part of the address, `https://<name>-<id>.rumptycloud.app`. `--vm` and `--port` are required. The app in each VM must listen on `0.0.0.0:<port>`.

| Flag | Description |
|------|-------------|
| `--vm` | VM name or UID to send traffic to. Repeat it or separate with commas, 1 to 10 VMs |
| `-p`, `--port` | Port your app listens on inside each VM (required) |
| `--protocol` | Backend protocol: `http` (default) or `grpc` |
| `--health-protocol` | Health check: `http` or `tcp`. Default `http`, or `tcp` for gRPC, which must use `tcp` |
| `--health-path` | Path for `http` health checks; passes on a `2xx` or `3xx` response. Default `/` |
| `--health-interval` | Seconds between health checks, 1 to 300. Default 10 |
| `--health-timeout` | Seconds before a health check fails, at most the interval. Default 5 |
| `--healthy-threshold` | Passing checks before a VM gets traffic again, 1 to 10. Default 3 |
| `--unhealthy-threshold` | Failing checks before a VM is taken out, 1 to 10. Default 3 |
| `--sticky` | Pin each client to one VM with a cookie (`rumpty-lb`, 300 seconds) |
| `--allow` | Client CIDR allowed to connect. Repeat it or separate with commas. Leave it out to allow everyone |

The sticky cookie name and lifetime are fixed; there are no flags to change them.

## Update

```bash
rumpty lb update web --health-path /ready --health-interval 5
rumpty lb update web --vm web-1 --vm web-2 --vm web-3
rumpty lb update web --sticky=false
rumpty lb update web --allow 203.0.113.0/24 --allow 198.51.100.7/32
rumpty lb update web --allow-all
```

`update` takes the same flags as `create`, and changes only the settings you pass. The name can't be changed.

- `--vm` replaces the whole target list. Use `add-target` and `remove-target` to change one VM at a time.
- `--sticky` turns sticky sessions on; `--sticky=false` turns them off.
- `--allow` replaces the allow list. `--allow-all` clears it so every client can connect. You can't pass both.

## Add and remove VMs

```bash
rumpty lb add-target web web-3
rumpty lb add-target web web-3 web-4
rumpty lb remove-target web web-1
```

VMs that are already targets are skipped. A load balancer can have at most 10 targets. Removing a VM doesn't change the VM itself.

## Delete

```bash
rumpty lb delete web
rumpty lb rm web --yes
```

Deleting removes the load balancer and its address. Billing stops at once, and your VMs are not changed. The command asks for confirmation; in scripts and other non-interactive shells, pass `--yes`.

| Flag | Description |
|------|-------------|
| `-y`, `--yes` | Delete without asking for confirmation |

## Requirements

- A signed-in session (`rumpty login`) or the `RUMPTY_API_KEY` environment variable. See [Login & Logout](./login).
- A workspace: the `--ws` flag or `$RUMPTY_WORKSPACE`. The examples without `--ws` assume `RUMPTY_WORKSPACE` is set.
- A recent CLI. If `rumpty lb` isn't recognised, [reinstall the latest release](./introduction#install).

Run `rumpty lb <command> --help` for the full help of any command. Shell completion suggests load balancer and VM names.
