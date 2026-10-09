# VPS: HTTP/2 + HTTP/3, compression, caching

The Nest/Fastify API speaks plain HTTP/1.1 and does **no compression**; it sets `Cache-Control` itself
(`apps/api/src/spa/spa.controller.ts`: hashed `/assets/*` long-cache, `index.html` / `sw.js` / `registerSW.js` /
`manifest.webmanifest` `no-cache`). Everything else — TLS, h2, h3, Brotli, rate limiting — belongs to the reverse proxy
(Caddy, per PLAN.md Phase 4). Local dev (Vite `:5173`) is HTTP/1.1 and unbundled (~20+ MB of `.tsx`); it says nothing
about production. Measure production-like with `pnpm preview:prod` (below).

## Caddy (recommended)

```caddyfile
carsua.app {
	encode zstd br gzip
	# rate_limit blocks: see PLAN.md "Rate-limit policy"
	reverse_proxy api:3000
}
```

- Caddy gets Let's Encrypt certificates automatically and enables **h2 and h3 by default**.
- Compose: publish **both** `443:443` and `443:443/udp` (+ `80:80`). h3 is QUIC over UDP — without the UDP port it silently
  falls back to h2.
- Firewall / provider security group: allow TCP 80, TCP 443 **and UDP 443**.
- Caddy advertises h3 through the `Alt-Svc` header; browsers use h2 on the first visit and h3 afterwards.
- Do not add a second `Cache-Control` for `/assets/*` in Caddy — the app already sends the right one.
- Put a Caddy/CDN cache in front of `/og/*` (PLAN.md Phase 4).

```yaml
# infra/docker-compose.prod.yml (excerpt)
caddy:
  image: caddy:2
  ports: ['80:80', '443:443', '443:443/udp']
  volumes: ['./Caddyfile:/etc/caddy/Caddyfile:ro', 'caddy_data:/data', 'caddy_config:/config']
```

`encode` needs `br`/`zstd`: they ship with stock Caddy 2.

## nginx (alternative)

```nginx
server {
  listen 443 ssl;           # TCP: h1.1/h2
  listen 443 quic reuseport; # UDP: h3
  http2 on;
  http3 on;
  add_header Alt-Svc 'h3=":443"; ma=86400' always;
  # brotli needs the ngx_brotli module; gzip is built in
  gzip on; gzip_types text/css application/javascript application/json image/svg+xml;
  location / { proxy_pass http://127.0.0.1:3000; proxy_set_header Host $host; }
}
```

## Cloudflare in front (optional)

Orange-cloud the domain: h2/h3 + Brotli are on by default, and `/assets/*` (hashed, immutable) is cached at the edge.
Set SSL mode to Full (strict). Rate limiting then moves partly to Cloudflare rules; the client IP arrives in
`CF-Connecting-IP` (configure Fastify `trustProxy` + the throttler tracker accordingly).

## Verify

```bash
curl -sI --http2 https://carsua.app | head -1        # HTTP/2 200
curl -sI --http3 https://carsua.app | head -1        # HTTP/3 200 (needs a curl built with HTTP/3)
curl -sI -H 'accept-encoding: br' https://carsua.app/assets/<hashed>.js | grep -i 'content-encoding\|cache-control'
```

Or DevTools → Network → right-click the header row → enable **Protocol** (`h2` / `h3`).

## Production-like check on your machine

`pnpm preview:prod` = `pnpm build` + start the API with `apps/api/preview.env` (`WEB_DIST_DIR=../web/dist`, after `.env`),
so Nest serves the built SPA on `:3000`. Stop `pnpm dev`'s API first (same port) or pass `PORT=3100`. It is still
HTTP/1.1 and **uncompressed** — judge transfer by gzip/brotli sizes (or put Caddy locally). The PWA service worker is
active there, so use DevTools → Application → "Update on reload" / clear storage when comparing runs.
