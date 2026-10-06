#!/bin/bash
# Builds a throwaway copy of the tiles_install role with a small Paris region, then
# runs one scenario in an Ubuntu 24.04 amd64 container (prod's OS and architecture):
#   ./prepare.sh run.sh      # install, idempotent re-run, refresh, HTTP checks
#   ./prepare.sh check.sh    # preflight dry run and re-run decisions
#   ./prepare.sh rescue.sh   # nginx -t rejecting the snippet
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
ansible_dir="${CONFESSIO_DIR:-$here/../../../../confessio}/ansible/prod"
work="$(mktemp -d)"

mkdir -p "$work/roles"
cp -r "$ansible_dir/roles/tiles_install" "$work/roles/"
cp "$ansible_dir/group_vars/all" "$work/group_vars_all.yml"
cp "$here"/{test.yml,site.conf,run.sh,check.sh,rescue.sh} "$work/"
echo '{"type":"Feature","properties":{},"geometry":{"type":"Polygon","coordinates":[[[2.32,48.84],[2.37,48.84],[2.37,48.87],[2.32,48.87],[2.32,48.84]]]}}' \
  > "$work/roles/tiles_install/files/france.geojson"

docker run --rm --platform linux/amd64 -v "$work:/t" ubuntu:24.04 bash "/t/${1:-run.sh}"
rm -rf "$work"
