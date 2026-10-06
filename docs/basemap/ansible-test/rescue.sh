set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq >/dev/null && apt-get install -y -qq ansible-core nginx curl sudo python3-apt tar >/dev/null 2>&1
id ubuntu >/dev/null 2>&1 || useradd -m ubuntu
mkdir -p /etc/nginx/snippets && rm -f /etc/nginx/sites-enabled/default && cp /t/site.conf /etc/nginx/sites-enabled/site.conf && service nginx start >/dev/null
cd /t
f() { grep -E '"msg":|^fatal|localhost +:|RUNNING HANDLER' | sed 's/^ *//' | cut -c1-260; }
echo "=== 1. normal install"; ansible-playbook test.yml 2>&1 | f
curl -s -o /dev/null -w "tiles: %{http_code}\n" -H "Range: bytes=0-6" http://127.0.0.1:8080/tiles/france.pmtiles
echo "=== 2. nginx rejects the snippet"
sed -i 's|location / { return 404; }|location / { return 404; }\n    location ^~ /tiles/ { return 418; }|' /etc/nginx/sites-enabled/site.conf
echo "# changed" >> roles/tiles_install/templates/confessio-tiles.conf
ansible-playbook test.yml 2>&1 | f || true
echo "--- snippet still on disk?"; ls /etc/nginx/snippets/ | grep tiles || echo "removed"
echo "--- nginx still serving (old config in memory):"; curl -s -o /dev/null -w "%{http_code}\n" -H "Range: bytes=0-6" http://127.0.0.1:8080/tiles/france.pmtiles
