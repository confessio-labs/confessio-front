set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq >/dev/null && apt-get install -y -qq ansible-core nginx curl sudo python3-apt tar >/dev/null
id ubuntu >/dev/null 2>&1 || useradd -m ubuntu
mkdir -p /etc/nginx/snippets && rm -f /etc/nginx/sites-enabled/default && cp /t/site.conf /etc/nginx/sites-enabled/site.conf && service nginx start >/dev/null
cd /t
echo "=== RUN 1"; ansible-playbook test.yml 2>&1 | grep -E "^(TASK|changed|ok|fatal|failed|skipping)|PLAY RECAP|localhost +:" | grep -vE "^ok:|^skipping:" ; 
echo "=== RUN 2 (idempotence)"; ansible-playbook test.yml 2>&1 | grep -E "localhost +:"
echo "=== RUN 3 (new build date)"; ansible-playbook test.yml -e tiles_build_date=20261004 2>&1 | grep -E "^changed|localhost +:|fatal"
ls -la /var/www/tiles /var/www/tiles-work; cat /var/www/tiles-work/france.build; ls /var/www/tiles/fonts /var/www/tiles/sprites
echo "=== HTTP"; curl -s -D - -o /dev/null -H "Range: bytes=0-126" -H "Origin: https://staging.example" http://127.0.0.1:8080/tiles/france.pmtiles
curl -s -D - -o /dev/null "http://127.0.0.1:8080/tiles/fonts/Noto%20Sans%20Regular/0-255.pbf" | grep -iE "^HTTP|cache-control|access-control"
curl -s -D - -o /dev/null http://127.0.0.1:8080/tiles/sprites/light@2x.png | grep -iE "^HTTP|cache-control"
curl -s -o /dev/null -w "tiles-work: %{http_code}\n" http://127.0.0.1:8080/tiles-work/france.build
curl -s -o /dev/null -w "traversal: %{http_code}\n" --path-as-is http://127.0.0.1:8080/tiles/../tiles-work/france.build
