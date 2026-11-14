# Home parking cameras (admin-only)

Status: **idea / plan, 2026-11-14. Nothing built, no hardware bought.** Implementation is for a later session.

## Context

Two cameras at home watch the parking places on both sides of the street. The owner checks them from the web on demand ("can I park at home now?") and sees the free spots marked by AI. Choices made: Reolink battery + solar cameras with a Reolink Home Hub; the ASUS RT-BE50 router as the bridge; an admin-only page in this app; v1 = snapshot + AI free-spot overlay, with a short live view as an extra. Everything runs on the existing VPS, so no new hosting.

### Research findings that shaped this

- **Battery cameras sleep and have no RTSP on their own.** Tapo battery models (C425/C460) have **no RTSP at all**, so they are ruled out. Reolink battery cameras get RTSP **only when paired with a Reolink Home Hub**. The hub wakes the camera when a client connects and drops it after **~5 min**. That is the "off until needed" behaviour. Continuous streaming would drain the battery, so we use snapshots plus short live views.
- Wake-up takes a few seconds (allow a **20-25 s** timeout on the first frame).
- Open-source alternatives without a hub (Neolink / Bairelay, the new direct mode in Home Assistant's `reolink_aio` 0.20) are still early. The hub is the stable path.
- **The VPS cannot reach into the home network.** Opening router ports is unsafe. Instead the **router dials out to the VPS over WireGuard**. ASUS VPN Fusion supports WireGuard (firmware >= 3.0.0.4.388.2x000; check the RT-BE50 is on ASUS's supported-model list first), and ASUS documents a **WireGuard site-to-site** setup. No PC or extra box is needed (a Raspberry Pi is the fallback if the RT-BE50 does not work for this).

## Hardware (home side)

- 2x Reolink battery camera that is **on the Home Hub compatibility list** (e.g. Argus 4 Pro / Argus 3 Pro / Argus PT), plus a Reolink solar panel each. Mount them south-ish where possible. November-February sun in Ukraine is weak, and cold cuts battery capacity.
- 1x Reolink **Home Hub** (or Home Hub Pro), connected to the RT-BE50 by Ethernet. The hub makes its own Wi-Fi for the cameras, so the range to the street is the hub's, not the router's.
- Put the router and the hub on a **DC UPS / power bank** (blackouts). The cameras run on their own batteries.
- Setup: give the hub a DHCP reservation (fixed IP). In the Reolink app, create a **view-only local user** for the VPS. Set **privacy masks** over neighbours' windows and yards. Turn on RTSP in the hub. Turn off UPnP on the router. No port forwarding.

## Camera options (cheap to rich)

Requirement: the camera must give its stream over RTSP (directly or through a hub). Prices are rough USD, so check Rozetka/Brain. Prefer colour night vision (the AI works better at night) and 2.4 GHz Wi-Fi.

**1. Plug-in Wi-Fi (power cable only, always on, native RTSP, no hub)**

| Model | ~Price | Notes |
|---|---|---|
| TP-Link Tapo C310 / C320WS | $30-50 | 2K/3MP, RTSP/ONVIF turned on in the app. Fine for snapshots + AI |
| TP-Link Tapo C325WB | ~$70 | Better colour at night, RTSP |
| Reolink E1 Outdoor / E1 Outdoor Pro | $55-100 | Pan-tilt (4K on Pro), Wi-Fi or Ethernet. One camera can cover both sides with 2 saved positions |
| Reolink W320 / RLC-510WA | $60-80 | Fixed 5MP, light at night, stable RTSP |

**2. Battery + solar via Reolink Home Hub (no wires, sleeps until asked; the chosen path)**

Hub ~$100, bought once. Not supported: Reolink 2MP battery cameras, 4G cameras. A session lasts up to ~5 min.

| Model | ~Price | Notes |
|---|---|---|
| Reolink Argus 3 Pro | $90-130 | 2K, cheapest hub-compatible option (check the list) |
| Reolink Argus PT Ultra | $130-160 | 4K pan-tilt. One camera with 2 saved positions can cover both sides. Turning costs battery. Needs a firmware upgrade to work with the hub |
| Reolink Argus 4 Pro | $150-200 | 4K 180-degree dual-lens, colour at night. One camera at the fence may see both ways |
| Reolink Altas PT Ultra | ~$200+ | Big battery, 4K PT. One Reolink post says it pairs with the **Home Hub Pro** |

Totals: hub + 1x Argus PT Ultra ~ $230-260 · hub + 2x Argus 3 Pro ~ $280-360 · hub + 2x Argus 4 Pro ~ $400-500.

**3. Eufy battery/solar: possible, unverified**

| Model | ~Price | Notes |
|---|---|---|
| Eufy SoloCam S340 | $150-200 | Solar, dual lens, no hub. RTSP can be turned on in the app, but on battery it is known to be limited or flaky. Confirm on the exact model before buying |

**4. PoE wired (one cable for power + data; richest and most reliable)**

| Model | ~Price | Notes |
|---|---|---|
| Reolink RLC-510A / RLC-811A | $60-120 | 5MP-4K, rock-solid RTSP |
| Reolink Duo 3 PoE | $150-250 | 16MP 180-degree dual lens. One camera covers the whole street |
| Hikvision / Dahua ColorVu 4-8MP | $100-200 | Colour picture at night with almost no light. Plus a PoE switch or injector ($20-60) |

**Do not fit (no RTSP at all):** Tapo C425 / C460 / C660, Ring, Blink, Arlo, Google Nest, most Ezviz/Imou battery models, and Reolink Go (4G).

**Picks:** cheapest = 2x Tapo C320WS (if power is available) · no-wires budget = hub + 1x Argus PT Ultra · best no-wires = hub + 2x Argus 4 Pro (this plan) · best overall with a cable = Reolink Duo 3 PoE.

The software below is the same for every option. Only the go2rtc source URL changes (direct camera RTSP vs hub channel).

## Network path

```
camera --(hub Wi-Fi)--> Home Hub --LAN--> RT-BE50 ==WireGuard (outbound)==> VPS wg0
                                                                          |
VPS docker: go2rtc (internal only) --RTSP over tunnel--> hub:554
            alpr (existing ONNX svc) <- frame -> api (AdminGuard) <- Caddy/Cloudflare <- browser
```

- VPS: new `wg0` (UDP 51820). Peer = router. Firewall: the VPS may reach **only `HUB_IP:554` (and :80 for snapshot CGI)** through the tunnel. Nothing else on the LAN.
- go2rtc only connects to a camera while someone is watching or asking for a frame, which gives on-demand wake for free. It has **no auth**, so it publishes no ports. Only the `api` container and Caddy (behind `forward_auth`) reach it.

## Code changes

**infra**

- `infra/docker-compose.prod.yml`: add a `go2rtc` service (pinned version, internal network, no `ports:`). Config: `cam_left` / `cam_right` = `rtsp://${CAM_USER}:${CAM_PASS}@${HUB_IP}:554/h264Preview_0N_sub` (channel per camera). Secrets go in env, not the repo.
- `infra/vps/wireguard.sh` (new, idempotent like `bootstrap.sh`): install wg, write `wg0.conf`, iptables allow-list to the hub IP, and print the client `.conf` to upload into ASUS VPN Fusion / site-to-site.
- `infra/Caddyfile`: route `/api/admin/cameras/live/*` to `forward_auth api:3000 uri /api/admin/cameras/auth`, then `reverse_proxy go2rtc:1984` (MSE over WebSocket; Cloudflare passes WS). Add the header `Cache-Control: no-store`.

**services/alpr** (reuse the existing ONNX runtime, FastAPI app, `anonymize.py`)

- `app.py`: new `POST /parking`, input = JPEG + spot polygons. It runs a **vehicle detector** (COCO car/truck/bus/motorcycle). Use an **Apache-2.0 model (YOLOX-nano/tiny or RF-DETR-nano ONNX)**, not Ultralytics (AGPL). A spot counts as **taken** when a vehicle box's bottom-centre falls inside the polygon, or box/polygon overlap > ~30% of the polygon. It returns `{spots:[{id, free, score}]}` + an annotated JPEG (green = free, red = taken). Faces are blurred via `anonymize.py`.
- Add the model download to `Dockerfile`/`warmup.py`. Add a unit test next to `test_anonymize.py` (polygon/box occupancy logic).

**packages/shared**: new `src/cameras.ts` (own contract file, not `schemas.ts`): Zod `CameraSchema`, `ParkingSpotSchema` (id, label, polygon `[x,y][]` normalized 0-1), `ParkingCheckResultSchema`. Then rebuild shared.

**packages/db**: migration `NNNN_parking_spots.sql`: `app.parking_spots (id, camera_id text, label text, polygon jsonb, sort int, updated_at)`. Camera list stays in env (2 fixed cameras).

**apps/api** `src/cameras/` (explicit `@Inject`, Zod inputs, no logic in the controller, all routes `AdminGuard` + `@Throttle`, `no-store`, edge cache bypass per `docs/checklists.md`):

- `GET /api/admin/cameras`: cameras + spots
- `POST /api/admin/cameras/:id/check`: go2rtc `/api/frame.jpeg?src=...` (25 s timeout = wake), then alpr `/parking`, then return the result + image (base64 or a short-lived in-memory blob). **Nothing is stored on disk.**
- `PUT /api/admin/cameras/:id/spots`: save polygons
- `GET /api/admin/cameras/auth`: 204/403 for Caddy `forward_auth`
- `env.ts`: `GO2RTC_URL`, `CAMERAS` (ids + labels).

**apps/web** route `/admin/parking` (admin-only, noindex, not in `STATIC_PAGES`/sitemap, not offline-cached):

- `ParkingPage` with a `CameraCard` per camera: "Check parking" button, annotated image, "Free: 2 / 5" chip, check time, a spinner with the text "waking camera...".
- `LiveView`: go2rtc's `video-rtc` web component (vendored) over same-origin WS. It **auto-stops after 60 s** to save battery.
- `SpotEditor`: click points on a snapshot to draw/rename/delete spot polygons, then save.
- `use-parking-actions.ts` (TanStack `queryOptions` + mutations), `helpers.ts`/`types.ts`, i18n keys (ua/en), a link from the existing admin area. Bump `releases.ts`.

**Docs**: a features-reference section "Home parking cameras", PLAN "After deploy" boxes (WireGuard up, hub reachable, env set, first spot drawing), plan-done.

## Security & privacy

- No port forwarding, no UPnP. The tunnel goes outbound from home. The VPS firewall allows only hub:554/80. Disable the WireGuard peer to cut access instantly.
- A view-only hub account. Strong unique passwords, kept in VPS env only. Keep hub/camera firmware updated. Consider turning off Reolink cloud P2P once local access works.
- go2rtc is never publicly exposed: admin session check via `forward_auth`. The API routes use `AdminGuard`. No caching at Cloudflare (`no-store`).
- Risk: if the VPS is compromised, the attacker reaches the hub. The firewall allow-list limits that to the hub only. If the RT-BE50 site-to-site mode exposes the whole LAN, use the Pi fallback or an ASUS IoT network for the hub.
- Privacy: filming the public street from your own home for personal use is generally fine. Mask neighbours' windows and yards. No recording/storage. Faces are blurred in the AI output. Do not publish the images.

## Verification

1. Home: the Reolink app sees both cameras via the hub. On the LAN, `ffprobe rtsp://...@HUB_IP:554/h264Preview_01_sub` wakes the camera and returns a stream.
2. VPS: `wg show` has a recent handshake. From the go2rtc container, `curl go2rtc:1984/api/frame.jpeg?src=cam_left` returns a JPEG in under 25 s. From another LAN IP: blocked.
3. alpr: run the unit tests for occupancy. `POST /parking` with saved street photos returns the expected free/taken.
4. API: Vitest for the service (mocked go2rtc/alpr) and a guard test (non-admin gets 403). Run `pnpm format`, lint, typecheck.
5. Web: as admin, open `/admin/parking`, draw spots, Check, and the overlay matches reality. Live view stops after 60 s. As a non-admin or logged out, the page and `/api/admin/cameras/live/*` are denied.
6. Battery: watch the % in the Reolink app over a week of ~20 checks/day.

## Sources

[Reolink Argus series](https://store.reolink.com/gb/argus-series-cameras/) · [Altas PT Ultra vs Argus 4 Pro](https://reolink.com/blog/altas-pt-ultra-vs-argus-4-pro/) · [Home Hub + Argus 4 Pro](https://reolink.com/review/home-hub-with-argus-4-pro) · [T3 prices](https://t3.com/home-living/smart-home/this-reolink-security-camera-looks-like-e-t-and-it-has-wider-views-than-before) · [SmartRTSP outdoor guide](https://www.smartrtsp.com/guides/outdoor-security-cameras) · [Reolink battery cams + 3rd-party](https://support.reolink.com/articles/360004441753-Can-Reolink-Battery-Powered-Cameras-Work-with-3rd-Party-Software/) · [Frigate: battery Reolink via Home Hub](https://github.com/blakeblackshear/frigate/discussions/22019) · [Reolink RTSP model compatibility (Jul 2026)](https://www.smartrtsp.com/guides/reolink-rtsp-onvif-model-compatibility) · [Tapo RTSP FAQ](https://www.tapo.com/faq/724/) · [Bairelay](https://docs.rs/crate/bairelay/1.1.2) · [ASUS WireGuard client](https://asus.com/support/faq/1048282) · [ASUS WireGuard site-to-site](https://www.asus.com/us/support/faq/1048281/)
