#!/usr/bin/env bash
# Refreshes the list of Cloudflare addresses that Caddy trusts for the visitor's IP.
#
# Cloudflare publishes its ranges at https://www.cloudflare.com/ips and changes them
# rarely. Run this on the server when they do (or every month from cron):
#   sudo bash deploy/refresh-cloudflare-ips.sh
#
# It only rewrites /etc/caddy/cloudflare-ips.caddy and reloads Caddy if the new
# configuration validates; otherwise the old one stays in place.
#
# The AWS security group lists the same ranges for ports 80/443. That part is not
# done here (the server has no AWS credentials); compare the output of
#   curl -s https://www.cloudflare.com/ips-v4; curl -s https://www.cloudflare.com/ips-v6
# with the group's rules and add any new range.
set -euo pipefail

target=/etc/caddy/cloudflare-ips.caddy
v4=$(curl -fsS https://www.cloudflare.com/ips-v4 | tr '\n' ' ')
v6=$(curl -fsS https://www.cloudflare.com/ips-v6 | tr '\n' ' ')

# Sanity check: a failed or empty download must never produce a config that trusts nobody.
[ "$(echo "$v4" | wc -w)" -ge 5 ] && [ "$(echo "$v6" | wc -w)" -ge 3 ] || { echo "unexpected Cloudflare list, not changing anything" >&2; exit 1; }

previous=$(mktemp)
cp "$target" "$previous" 2>/dev/null || true
echo "trusted_proxies static $v4 $v6" > "$target"

if caddy validate --config /etc/caddy/Caddyfile >/dev/null 2>&1; then
  systemctl reload caddy
  echo "updated: $(echo "$v4 $v6" | wc -w) Cloudflare ranges"
else
  cp "$previous" "$target"
  echo "new configuration did not validate; kept the previous list" >&2
  exit 1
fi
