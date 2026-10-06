The front's map is moving off MapTiler to vector tiles we host ourselves. This PR is the server half. It adds a `tiles_install` playbook that serves one `france.pmtiles` archive, plus the glyphs and sprites the style needs, as static files under `/tiles/` from the existing nginx. Until the front change lands nothing reads them, so merging and running this changes nothing users can see.

**How it works.** `pmtiles extract` cuts the covered area out of a [Protomaps](https://docs.protomaps.com/basemaps/downloads) daily planet build, fetching only the byte ranges it needs. It is a ~6 GB download, not a tile build: no Java, no Planetiler, no tile server, no new apt package or service. The area is mainland France, Corsica, the overseas departments, Saint-Pierre-et-Miquelon, Saint-Martin and Saint-Barthélemy (`files/france.geojson`; how it was generated is in the README). The archive is written outside the served folder, checked with `pmtiles verify`, then `mv`'d into place atomically. To refresh it every ~6 months, bump `tiles_build_date` and re-run. The browser client notices the new ETag, so a refresh needs no front deploy.

**Footprint on prod.** ~6 GB under `/var/www/tiles` (~12 GB briefly during a refresh), plus a ~40 MB `pmtiles` binary in `/var/www/tiles-work`. That folder is not served. The extract runs under `nice`/`ionice` so Postgres and gunicorn keep priority. The nginx snippet is applied with a reload. If `nginx -t` rejects it, it is removed again so a later restart can't trip on it.

**Rollout.**
1. Set `tiles_build_date` to a build from the last 7 days (Protomaps deletes older ones).
2. Dry run, which writes nothing:
   ```
   source .env; export ANSIBLE_CONFIG=ansible/ansible.cfg
   ansible-playbook ansible/prod/tiles_install.yml --tags preflight -K -u ubuntu -i ansible/prod/hosts
   ansible-playbook ansible/prod/install.yml --tags nginx --check --diff -K -u ubuntu -i ansible/prod/hosts
   ```
   The first prints architecture, build availability, free disk and what will happen. The second should show only the new `include` line in the vhost.
3. `./prod.sh tiles_install`, about 10 min.
4. `ansible-playbook ansible/prod/install.yml --tags nginx ...` adds the include to the vhost. This one restarts nginx, as `install` always does.
5. `curl -sI -H "Range: bytes=0-126" https://confessio.fr/tiles/france.pmtiles` should return `206`.

**Rollback.** Delete `/etc/nginx/snippets/confessio-tiles.conf` and reload nginx. The include is a wildcard, so the vhost keeps working without it.

**Tested** end to end in an Ubuntu 24.04 amd64 container, with a small region instead of France:
- first install, idempotent re-run, refresh on a new build date, region change;
- dry run on a fresh host (writes nothing);
- expired build date (clear error);
- `nginx -t` rejecting the snippet (snippet removed, running nginx unaffected);
- `206` range responses with ETag/CORS, and nothing outside `/tiles/` served.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
