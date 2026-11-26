---
id: load-balancers
title: Load Balancers
sidebar_label: Load balancers
description: Put 1 to 10 VMs behind one HTTPS address with health checks, sticky sessions and IP allow rules. HTTP, HTTPS and gRPC, $2 a month.
---

# Load Balancers

A load balancer puts 1 to 10 of your VMs behind one HTTPS address. Requests are spread across the VMs that pass the health check, and a VM that stops answering is taken out of rotation until it recovers.

Every load balancer gets its own address with a certificate managed for you:

```
https://<name>-<8 hex characters>.rumptycloud.app
```

For example, a load balancer named `web` might be `https://web-5d6e7f80.rumptycloud.app`. Plain `http://` requests are redirected to `https://`.

## When to use one

- **Run more than one copy of a web app or API** so traffic keeps flowing when one VM is stopped, rebooted or being updated.
- **Roll out changes one VM at a time.** Remove a VM, update it, add it back.
- **Restrict an HTTP service to known client IPs**, such as your office or a partner's network.

If you only need one VM on a public URL, [exposing a port](/virtual-machines/settings#exposed-ports) is simpler and free.

## What it supports

| | |
|---|---|
| **Protocols** | HTTP and HTTPS from clients. Your VMs receive plain HTTP or cleartext gRPC (h2c): TLS ends at the load balancer. |
| **Address** | `<name>-<id>.rumptycloud.app`, HTTPS with an automatic certificate |
| **Targets** | 1 to 10 VMs in the same workspace |
| **Balancing** | Round robin across healthy VMs, or sticky sessions with a cookie |
| **Health checks** | HTTP path or TCP connect |
| **Access** | Everyone, or only the IP ranges you allow |
| **Price** | $2/month, billed hourly |

Not available yet: TCP or UDP forwarding, dedicated IP addresses, and custom domains.

## Before you start

- The VMs must be in the workspace where you create the load balancer.
- Your app must listen on the same port on every VM, and on `0.0.0.0:<port>`, not only `127.0.0.1`. A service bound to `127.0.0.1` can't be reached from outside the VM.
- If a [firewall policy](/firewall-policies/introduction) is attached to the VMs, it must allow the port. See [Firewall policies on the VMs](#firewall-policies-on-the-vms).

## Create a load balancer in the console

1. Go to **Networking & Security → Load Balancers** and click **Create load balancer**.
2. Enter a **name**. It becomes part of the address, so use lowercase letters, digits and hyphens (up to 40 characters). Names are unique in a workspace and can't be changed later.
3. Pick the **VMs** to send traffic to.
4. Enter the **port** your app listens on inside each VM, and choose the protocol: **HTTP**, or **gRPC** for gRPC services.
5. Optionally set the [health check](#health-checks), turn on [sticky sessions](#sticky-sessions), or add [allowed IP ranges](#allowed-ip-ranges).
6. Click **Create**.

The load balancer shows **Pending** while it is being set up and **Ready** once its routing is live. Open its address to check it. If it shows **Failed**, the detail page shows why.

From the detail page you can add or remove VMs, change the port, protocol, health check, sticky sessions and allowed IP ranges, and delete the load balancer. Each change shows **Pending** until it is live. You can't start another change while one is pending, but you can always delete. A deleted load balancer shows **Deleting** until its address is removed.

## Add or remove VMs

A new load balancer, or one whose VMs were all removed or deleted, answers every request with a short page saying it has no VMs yet (HTTP 503). Nothing is broken: add a VM and traffic starts reaching it once it passes its [health check](#health-checks), about 30 seconds with the default settings.

**In the console:** open **Networking & Security → Load Balancers**, click the load balancer, and in the **Targets** card click **Add VMs**, choose up to 10 VMs and confirm. To take a VM out, click **Remove target** next to it.

**With the CLI:**

```bash
rumpty lb add-target web web-1 web-2
rumpty lb remove-target web web-2
```

The VMs must be in the same workspace and running your app on the load balancer's port. Check their [firewall policies](#firewall-policies-on-the-vms) allow that port.

## Use the CLI

The [Rumpty CLI](/cli/introduction) manages load balancers with `rumpty load-balancer`, or `rumpty lb` for short:

```bash
rumpty lb create web --vm web-1 --vm web-2 --port 8080 --health-path /healthz
rumpty lb ls
rumpty lb add-target web web-3
rumpty lb update web --sticky --allow 203.0.113.0/24
rumpty lb delete web
```

See [Manage Load Balancers](/cli/load-balancer) for every command and flag.

## Use an AI agent

[Rumpty MCP](/mcp) has tools for load balancers: `list_load_balancers`, `get_load_balancer`, `create_load_balancer`, `update_load_balancer`, `delete_load_balancer`, `add_load_balancer_targets` and `remove_load_balancer_target`. Ask your agent, for example, "put web-1 and web-2 behind a load balancer on port 8080 with a health check on /healthz".

## Use the API

See the [Load Balancers API reference](/api/load-balancers). Changes are asynchronous: each request returns an operation you can follow while the load balancer is **pending**.

## Health checks

The load balancer checks every VM on a schedule. A VM is taken out of rotation after it fails the check enough times in a row, and is put back automatically once it passes enough times in a row again.

| Setting | Default | Allowed values |
|---|---|---|
| **Protocol** | `http` (`tcp` for gRPC) | `http`: requests the path and passes on a `2xx` or `3xx` response. `tcp`: only opens a connection. |
| **Path** | `/` | For `http` checks. Must start with `/`, up to 255 characters. |
| **Port** | The target port | 1 to 65535 |
| **Interval** | 10 seconds | 1 to 300 seconds |
| **Timeout** | 5 seconds | 1 second up to the interval |
| **Healthy threshold** | 3 | 1 to 10 passing checks before a VM gets traffic |
| **Unhealthy threshold** | 3 | 1 to 10 failing checks before a VM is removed |

With the defaults, a VM that stops answering is removed after about 30 seconds, and a recovering VM gets traffic again about 30 seconds after it starts answering.

Point the HTTP check at a cheap endpoint such as `/healthz` that returns `200` when the app is ready to serve. Any `4xx` or `5xx` response, such as a `401` from a page that needs a login, counts as a failure.

The load balancer also watches real traffic: a VM that returns 5 `5xx` responses in a row, or fails 5 connections in a row, is taken out of rotation for about 30 seconds, even between health checks. At most half of the VMs are taken out this way at once. An app that returns `5xx` on purpose for some requests can trigger this.

**gRPC services always use a TCP check.** HTTP health checks can't talk to gRPC servers, so for a gRPC load balancer the check only confirms the port accepts connections. If you need a deeper check, serve a small HTTP health endpoint on another port and keep the TCP check on the gRPC port.

## Sticky sessions

By default each request can go to any healthy VM. Turn on **sticky sessions** to keep a client on the same VM: the load balancer sets a cookie named `rumpty-lb`, and requests carrying it go to the same VM.

The cookie lasts 300 seconds and is not renewed while the client is active, so a client is pinned for at most 5 minutes before it may move to another VM. Adding or removing VMs, or a VM becoming unhealthy or recovering, also moves some clients. Clients that don't keep cookies, such as most API clients and scripts, are not pinned.

Sticky sessions reduce how often clients move between VMs; they don't stop it. If your app keeps sessions in memory, store them in a shared database or cache instead.

## Allowed IP ranges

By default anyone on the internet can reach the load balancer. Add **allowed IP ranges** to accept only clients from those ranges, written as CIDR blocks:

```
203.0.113.0/24
198.51.100.7/32
```

Use `/32` for a single IPv4 address. You can add up to 50 ranges. Requests from any other address are refused with `403 Forbidden`. Remove all ranges to allow everyone again.

## Firewall policies on the VMs

If a [firewall policy](/firewall-policies/introduction) is attached to a target VM, it can block inbound traffic from the load balancer that no rule allows. The VM then fails its health check and gets no traffic.

Add an inbound allow rule to the policy for the target port, and for the health check port if it is different:

| Direction | Protocol | Port | Source |
|---|---|---|---|
| INBOUND | TCP | your target port, e.g. `8080` | `0.0.0.0/0` |

Use `0.0.0.0/0` as the source: firewall source ranges are not applied to HTTP traffic yet (see [Allow rules](/firewall-policies/allow-rules)). To limit who can reach your app, use the load balancer's [allowed IP ranges](#allowed-ip-ranges) instead.

New firewall policies already allow port `8080`.

## Deleting VMs and load balancers

- **Deleting a VM** removes it from every load balancer it belongs to. The other VMs keep serving. A load balancer left with no VMs stays up and answers with a short "No VMs behind this load balancer yet" page and HTTP `503` until you [add one](#add-or-remove-vms).
- **Stopping a VM** keeps it on the load balancer, but it fails its health check and gets no traffic until it is running again.
- **Removing a VM** from a load balancer doesn't change the VM.
- **Deleting a load balancer** removes its address. Your VMs are not touched.

## Pricing

Each load balancer costs **$2 per month**, billed hourly from when you create it, like other resources. See [Billing](/billing/introduction).

- Billing stops as soon as you delete the load balancer.
- If a new load balancer fails to set up before it is ever ready, billing stops when it fails, so you pay for a few minutes at most.

## Limits

| Limit | Value |
|---|---|
| Load balancers per workspace | 10 |
| VMs per load balancer | 1 to 10, in the same workspace |
| Name | Up to 40 characters, unique in the workspace |
| Allowed IP ranges | Up to 50 |
| Protocols | HTTP and gRPC to the VMs. No TCP or UDP. |
| Addresses | `*.rumptycloud.app` only. No custom domains or dedicated IPs yet. |

## Troubleshooting

| Symptom | What to check |
|---|---|
| The address returns `503` | No VM is passing the health check. Check that the VMs are running, the app listens on `0.0.0.0` on the target port, the health check path returns `2xx` or `3xx`, and any attached firewall policy allows the port. |
| The address shows "No VMs behind this load balancer yet" with `503` | The load balancer has no VMs, for example after you removed or deleted them all. [Add one](#add-or-remove-vms). |
| One VM never gets traffic | It is failing the health check. SSH in and run `curl -i http://localhost:<port><path>`, then check the VM's firewall policy. |
| A gRPC load balancer reports VMs healthy but calls fail | The TCP check only confirms the port is open. Check that the load balancer's protocol is **gRPC**, not **HTTP**, and that the gRPC server on the VM doesn't use TLS: the load balancer connects with cleartext HTTP/2. |
| `403 Forbidden` from the load balancer | Your IP isn't in the allowed IP ranges. |
| Status is **Failed** | Open the load balancer to see the reason, fix it, and save again. |
| A change is refused while another is in progress | Wait for the load balancer to leave **Pending**, then retry. |
| `429 Too Many Requests` | The load balancer has a per-second request limit that protects the platform. If you need a higher limit, contact support. |
| Users are logged out when traffic moves between VMs | The app keeps sessions in memory. Store sessions in a shared database or cache. [Sticky sessions](#sticky-sessions) reduce moves but pin a client for at most 5 minutes. |
| A VM can't be added: "not ready to be added" or "being deleted" | Wait until a new VM has finished provisioning. A VM that is being deleted can't be added. |

## Related

- [Exposed ports](/virtual-machines/settings#exposed-ports)
- [Firewall policies](/firewall-policies/introduction)
- [Private networking](/networking/private-networking)
- [Load Balancers API](/api/load-balancers)
