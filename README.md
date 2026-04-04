# TraefikUI

A self-hosted web UI for managing Traefik reverse proxy configuration across multiple servers.

## Features

- Browse and edit Traefik YAML config files
- View routers, services, middlewares, certificates, and entrypoints
- YAML templates with `{{variable}}` placeholders
- Duplicate config files
- Multi-instance management — manage multiple Traefik servers from a single UI
- Email/password authentication with optional two-factor

## Architecture

TraefikUI runs in two modes from the same Docker image:

- **Master** — The main UI instance. Has authentication, database, templates, and proxies requests to remote agents.
- **Agent** — A lightweight instance deployed alongside each Traefik server. Exposes an API for the master to manage config files and read Traefik data. No UI, no database, no auth (secured by API key).

```
┌─────────────────┐         ┌──────────────────┐
│   Master UI     │───────▶│ Agent (Server A) │──▶ Traefik A
│  (browser)      │         └──────────────────┘
│                 │         ┌──────────────────┐
│                 │───────▶│ Agent (Server B) │──▶ Traefik B
└─────────────────┘         └──────────────────┘
```

The master can also manage a local Traefik instance directly (no agent needed for the server it runs on).

## Prerequisites

- Docker
- Traefik with the API enabled (see [Traefik Configuration](#traefik-configuration))

## Quick Start

### 1. Traefik Configuration

Traefik must have its API enabled for TraefikUI to read router/service/middleware data. Add this to your Traefik static configuration:

```yaml
# traefik.yml
api:
  insecure: true    # Exposes API on port 8080 (internal only)
  dashboard: false  # Optional — disable if using TraefikUI instead

providers:
  file:
    directory: /etc/traefik/configurations
    watch: true
```

The `api.insecure: true` setting exposes the Traefik API on port 8080 without TLS. This is safe when only accessible from internal Docker networks (not exposed to the internet). TraefikUI connects to this API to read Traefik state.

The `file.directory` should point to the same directory that TraefikUI manages via `CONFIG_DIR`.

### 2. Master Instance Setup

The master is the main UI that users log into. Deploy it on the same Docker network as Traefik.

**docker-compose.yml:**

```yaml
services:
  traefikui:
    image: ghcr.io/skint007Labs/traefikui:latest
    container_name: traefikui
    restart: unless-stopped
    volumes:
      - /opt/traefik-config/configurations:/traefik-config:rw
      - /opt/traefikui/data:/app/data
    environment:
      - TRAEFIK_API_URL=http://traefik:8080
      - CONFIG_DIR=/traefik-config
      - DATABASE_URL=file:/app/data/auth.db
      - BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}
      - BETTER_AUTH_URL=https://traefikui.example.com
      - NEXT_PUBLIC_APP_URL=https://traefikui.example.com
      - TRAEFIKUI_MODE=master
      - AGENT_API_KEY=${AGENT_API_KEY}
    networks:
      - reverseproxy-network

networks:
  reverseproxy-network:
    external: true
```

**Environment variables:**

| Variable | Required | Description |
|---|---|---|
| `TRAEFIK_API_URL` | Yes | URL to the local Traefik API (e.g. `http://traefik:8080`) |
| `CONFIG_DIR` | Yes | Path to the Traefik config directory inside the container |
| `DATABASE_URL` | Yes | SQLite database path (e.g. `file:/app/data/auth.db`) |
| `BETTER_AUTH_SECRET` | Yes | Secret key for session encryption. Generate with `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | Yes | Public URL of the TraefikUI instance |
| `NEXT_PUBLIC_APP_URL` | Yes | Same as `BETTER_AUTH_URL` |
| `TRAEFIKUI_MODE` | No | Set to `master` (default) or `agent` |
| `AGENT_API_KEY` | No | API key for agent authentication. Required if you also run agents. Generate with `openssl rand -base64 32` |

**Traefik dynamic config** to route traffic to TraefikUI:

```yaml
# traefikui.yaml (in your Traefik configurations directory)
http:
  routers:
    traefikui:
      entryPoints:
        - websecure
      rule: "Host(`traefikui.example.com`)"
      service: traefikui-service
      tls: {}

  services:
    traefikui-service:
      loadBalancer:
        servers:
          - url: "http://traefikui:3000"
```

**First run:** Visit the URL and register your admin account.

### 3. Agent Instance Setup

Deploy an agent on each remote server that has a Traefik instance you want to manage.

**docker-compose.yml:**

```yaml
services:
  traefikui-agent:
    image: ghcr.io/skint007Labs/traefikui:latest
    container_name: traefikui-agent
    restart: unless-stopped
    ports:
      - "3666:3000"   # Or use a reverse proxy
    volumes:
      - /opt/traefik-config/configurations:/traefik-config:rw
    environment:
      - TRAEFIKUI_MODE=agent
      - AGENT_API_KEY=${AGENT_API_KEY}
      - TRAEFIK_API_URL=http://traefik:8080
      - CONFIG_DIR=/traefik-config
    networks:
      - reverseproxy-network

networks:
  reverseproxy-network:
    external: true
```

**Environment variables:**

| Variable | Required | Description |
|---|---|---|
| `TRAEFIKUI_MODE` | Yes | Must be `agent` |
| `AGENT_API_KEY` | Yes | Must match the key configured on the master |
| `TRAEFIK_API_URL` | Yes | URL to the local Traefik API on this server |
| `CONFIG_DIR` | Yes | Path to the Traefik config directory |

No database, auth secrets, or `NEXT_PUBLIC_*` variables are needed for agents.

**Important:** The agent must be on the same Docker network as the Traefik instance on that server, so it can reach the Traefik API.

### 4. Connecting Agents to the Master

1. Open the master UI and go to **Settings**
2. Click **Add Server**
3. Enter:
   - **Name**: A friendly name (e.g. "Production Server")
   - **URL**: The agent's URL with protocol (e.g. `http://10.1.1.10:3666`)
   - **API Key**: The same `AGENT_API_KEY` value
4. Click **Test** to verify the connection
5. Click **Add**

The server will appear in the dropdown in the sidebar. Select it to manage that server's configs and view its Traefik data.

## Templates

Templates are YAML files with `{{variable}}` placeholders, stored on the master instance. When you create a config from a template, you fill in the variable values and the result is written to the selected server's config directory.

Manage templates from the **Templates** page in the sidebar.

Example template:

```yaml
http:
  routers:
    {{service_name}}:
      entryPoints:
        - websecure
      rule: "Host(`{{domain}}`)"
      service: {{service_name}}-service
      tls: {}

  services:
    {{service_name}}-service:
      loadBalancer:
        servers:
          - url: "http://{{service_name}}:{{port}}"
```

## Development

```bash
pnpm install
pnpm dev
```

Requires Node.js 22+ and pnpm.

## Tech Stack

- Next.js 15 (App Router, standalone output)
- better-auth (email/password, two-factor)
- Drizzle ORM + SQLite (better-sqlite3)
- TanStack React Query
- Radix UI + Tailwind CSS
- CodeMirror (YAML editor)
