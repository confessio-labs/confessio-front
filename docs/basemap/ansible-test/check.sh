set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq >/dev/null && apt-get install -y -qq ansible-core nginx curl sudo python3-apt tar >/dev/null 2>&1
id ubuntu >/dev/null 2>&1 || useradd -m ubuntu
mkdir -p /etc/nginx/snippets && rm -f /etc/nginx/sites-enabled/default && cp /t/site.conf /etc/nginx/sites-enabled/site.conf && service nginx start >/dev/null
cd /t
f() { grep -E '"msg":|^fatal|localhost +:' | sed 's/^ *//'; }
echo "=== 1. preflight on a fresh host"; ansible-playbook test.yml --tags preflight 2>&1 | f
echo "--- host after preflight:"; ls /var/www; ls /etc/nginx/snippets
echo "=== 2. real install"; ansible-playbook test.yml 2>&1 | f
echo "=== 3. preflight, same date"; ansible-playbook test.yml --tags preflight 2>&1 | f
echo "=== 4. preflight, new date"; ansible-playbook test.yml --tags preflight -e tiles_build_date=20261004 2>&1 | f
echo "=== 5. preflight, expired date"; ansible-playbook test.yml --tags preflight -e tiles_build_date=20250101 2>&1 | f | cut -c1-200
echo "=== 6. preflight, region edited"; echo ' ' >> roles/tiles_install/files/france.geojson; ansible-playbook test.yml --tags preflight 2>&1 | f
echo "=== 7. real install, region edited"; ansible-playbook test.yml 2>&1 | f
echo "=== 8. real install again (idempotent)"; ansible-playbook test.yml 2>&1 | f
