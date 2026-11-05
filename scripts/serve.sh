#!/usr/bin/env bash
# Build the site locally and serve it on this Mac and over Tailscale.
#   scripts/serve.sh            build, then (re)start the server
#   scripts/serve.sh start      (re)start without building
#   scripts/serve.sh stop
#   scripts/serve.sh status
# Binds 127.0.0.1 and this Mac's Tailscale IPv4 only, never 0.0.0.0, so the LAN cannot reach it. Tailscale already encrypts the tailnet path.
# Other tailnet devices open  http://<this Mac's Tailscale IP>:PORT  (MagicDNS names do not resolve while accept-dns is off).
# Builds run locally on purpose: the owner asked for local builds of this site (2026-11-03), which is the host-local exception in the build-fleet rules.
set -euo pipefail
cd "$(dirname "$0")/.."
PORT="${PORT:-4173}"
RUN=".serve"; mkdir -p "$RUN"
TS_IP="$(tailscale ip -4 2>/dev/null | head -1 || true)"

stop() {
  for f in "$RUN"/*.pid; do
    [ -e "$f" ] || continue
    pid="$(cat "$f")"
    # only stop a process we started: it must still be a python http.server
    if ps -p "$pid" -o command= 2>/dev/null | grep -q "http.server"; then kill "$pid" 2>/dev/null || true; fi
    rm -f "$f"
  done
}
start() {
  stop
  [ -f dist/index.html ] || { echo "dist/index.html missing: run scripts/serve.sh (with build)"; exit 1; }
  nohup python3 -m http.server "$PORT" --bind 127.0.0.1 --directory dist >"$RUN/local.log" 2>&1 & echo $! >"$RUN/local.pid"
  if [ -n "$TS_IP" ]; then
    nohup python3 -m http.server "$PORT" --bind "$TS_IP" --directory dist >"$RUN/tailscale.log" 2>&1 & echo $! >"$RUN/tailscale.pid"
  else
    echo "warning: no Tailscale IPv4 found; serving on localhost only"
  fi
  sleep 1; status
}
status() {
  echo "Local:     http://127.0.0.1:$PORT/  ($(curl -s -o /dev/null -m 5 -w '%{http_code}' "http://127.0.0.1:$PORT/" || echo down))"
  if [ -n "$TS_IP" ]; then echo "Tailscale: http://$TS_IP:$PORT/  ($(curl -s -o /dev/null -m 5 -w '%{http_code}' "http://$TS_IP:$PORT/" || echo down))"; fi
  echo "Built:     $(stat -f '%Sm' dist/index.html 2>/dev/null || echo 'no dist')"
}
case "${1:-build}" in
  stop) stop; echo stopped ;;
  status) status ;;
  start) start ;;
  build) BUILDFLEET_LOCAL=1 npm run build && start ;;
  *) echo "usage: $0 [build|start|stop|status]"; exit 2 ;;
esac
