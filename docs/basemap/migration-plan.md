# Basemap migration: MapTiler → self-hosted Protomaps

The approved look is `demo.html` in this folder (`confessioFlavor`, `buildingLayers`
in "3d" mode). To view it, run `python3 serve.py 8765` here and open
`http://127.0.0.1:8765/demo.html`. Add `?key=<NEXT_PUBLIC_MAP_TILER_API_KEY>` to compare
with the current MapTiler map. It needs `paris.pmtiles` next to it, which is gitignored:

```
pmtiles extract https://build.protomaps.com/<YYYYMMDD>.pmtiles paris.pmtiles --bbox=2.15,48.75,2.55,48.95
```

## Coverage

One archive, `france.pmtiles`, about 5.8 GB. It covers mainland France, Corsica,
Guadeloupe, Martinique, Guyane, La Réunion, Mayotte, Saint-Pierre-et-Miquelon,
Saint-Martin and Saint-Barthélemy, each with a ~15 km margin
(`../confessio/ansible/prod/roles/tiles_install/files/france.geojson`, built from
Natural Earth 10m). The Pacific territories are left out because the backend rejects
98x zipcodes (`timezone_service.py`).

## Phase 1: serve the tiles (`../confessio`). Done, not run on prod yet

Role `tiles_install`: the pinned `pmtiles` CLI, Noto Sans glyphs and the `light`
sprites from `protomaps/basemaps-assets`, `pmtiles extract --region` into
`/var/www/tiles-work`, `pmtiles verify`, then an atomic `mv` to
`/var/www/tiles/france.pmtiles`. A stamp file makes re-runs no-ops. The nginx snippet
`/tiles/` is included by the main vhost. Tested end to end in an Ubuntu 24.04 amd64
container: first run, idempotent re-run, refresh on a new date, 206 range responses
with ETag/CORS, and nothing served outside `/tiles/`.

To run:

1. Set `tiles_build_date` in `group_vars/all` to a build from the last 7 days.
2. Dry run. Both are read-only on prod:
   ```
   source .env; export ANSIBLE_CONFIG=ansible/ansible.cfg
   # architecture, build still published, free disk, what will happen to the archive
   ansible-playbook ansible/prod/tiles_install.yml --tags preflight -K -u ubuntu -i ansible/prod/hosts
   # vhost diff that step 4 would apply (expect only the tiles include line)
   ansible-playbook ansible/prod/install.yml --tags nginx --check --diff -K -u ubuntu -i ansible/prod/hosts
   ```
3. `./prod.sh tiles_install`. The extract takes ~10 min, at low CPU/IO priority.
4. Apply the vhost include. It restarts nginx about twice, a second each:
   ```
   source .env; ANSIBLE_CONFIG=ansible/ansible.cfg ansible-playbook ansible/prod/install.yml \
     --tags nginx -K -u ubuntu -i ansible/prod/hosts
   ```
5. Check:
   ```
   curl -sI -H "Range: bytes=0-126" https://confessio.fr/tiles/france.pmtiles   # 206, ETag
   curl -sI "https://confessio.fr/tiles/fonts/Noto%20Sans%20Regular/0-255.pbf"  # 200
   ```

## Phase 2: switch the front (`confessio-front`)

| File | Change |
|---|---|
| `package.json` | Remove `@maptiler/leaflet-maptilersdk`. Add `maplibre-gl`, `@maplibre/maplibre-gl-leaflet`, `pmtiles`, `@protomaps/basemaps`. |
| `src/components/Map/basemapStyle.ts` (new) | Port `confessioFlavor`, `buildingLayers("3d")` and the hidden layers (`pois`, `roads_shields`, `address_label`) from `demo.html` with the values unchanged. Hard-code `TILES_URL = "https://confessio.fr/tiles"` for every environment. `glyphs` and `sprite` point at `${TILES_URL}/fonts/...` and `${TILES_URL}/sprites/light`. Attribution: Protomaps + © OpenStreetMap. |
| `src/components/Map/Map.tsx` | Replace `MaptilerLayer` with `L.maplibreGL({ style })`. Register `pmtiles.Protocol` once (module scope). Keep the WebGL2 guard and `setTilesReady` on the GL map's first `load` (`getMaplibreMap()`). |
| `src/lib/leaflet-active-area.ts` | Patch the MapLibre layer's prototype instead of `MaptilerLayer`'s. Rename `_maptilerMap` → `_glMap`. The plugin MapTiler forked from has the same `_transformGL` / `_pinchZoom` / `_animateZoom` / `_transitionEnd` and `_actualCanvas`. Update the header comment. |
| `src/app/globals.css` | Import `maplibre-gl/dist/maplibre-gl.css`. The shimmer comment at line ~100 mentions MapTiler. |
| `tests/ui.spec.ts` | The map reaches `load`, tile requests hit `/tiles/france.pmtiles`, and no request goes to `api.maptiler.com`. |
| `docs/design.md` | Add a "Basemap" section: paper neutrals, MapTiler road yellows, no POIs/shields/house numbers, soft warm 3D buildings at 0.3 opacity over a flat block fill. |

Verify with `pnpm tsc --noEmit`, `pnpm build` and `pnpm test:ui`.

## Phase 3: release

1. Staging (NAS, docker compose) reads the prod tiles through CORS.
2. Manual mobile QA (`docs/manual-tests/mobile-pre-release.md`). Focus on the
   active-area offset, pinch zoom and fly-to on church selection, plus one overseas
   diocese (Martinique).
3. Prod: `/deploy-prod`, then Ansible `front_deploy`.

## Phase 4: remove MapTiler (a week after the prod release)

- `../confessio`: `NEXT_PUBLIC_MAP_TILER_API_KEY` in `front_deploy/templates/env.local.j2`,
  `map_tiler_api_key` in `group_vars/all`, the comments in `front_deploy/tasks/01_git.yml`
  and `front_install/templates/front_start`.
- `confessio-front`: `Dockerfile`, `docker-compose.yml`, `.env`, `MAP_TILER_API_KEY` in
  `src/utils.ts`.
- Revoke the key and cancel the MapTiler plan.

## Refresh (every ~6 months)

Set `tiles_build_date` to a build from the last 7 days, then run `./prod.sh tiles_install`.
No front deploy is needed.

## Noticed along the way

- Diocese bounding boxes from `/front/api/dioceses` reach into the Americas for Séez
  (min lon -71.4) and Carcassonne et Narbonne (min lon -73.8, max lon 14.4). These look
  like mis-geocoded churches. La Rochelle reaching -56.4 is expected: it includes
  Saint-Pierre-et-Miquelon.
