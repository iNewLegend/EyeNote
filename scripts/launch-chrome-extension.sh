#!/usr/bin/env bash
set -euo pipefail

# Launch Chrome with the same flags as the VSCode "Launch Chrome Extension" config.
# Places:
#  - workspace: default = current working directory
#  - frontend: default = $WORKSPACE/apps/frontend
#  - extension: default = $FRONTEND/extension
#
# Usage: ./scripts/launch-chrome-extension.sh [options]
# Options:
#   -w|--workspace PATH     set workspace folder (default: current working dir)
#   -f|--frontend PATH      set frontend folder (default: $WORKSPACE/apps/frontend)
#   -e|--extension PATH     set extension folder (default: $FRONTEND/extension)
#   -u|--url URL            set initial URL to open (default: https://github.com/iNewLegend/iNewLegend)
#   --chrome PATH           explicit path to Chrome binary
#   --port PORT             remote debugging port (default: 9222)
#   --dry-run               print the command but don't run it
#   --background|-b         launch Chrome in background and return
#   -h|--help               show this help

# Defaults
WORKSPACE_DEFAULT="$(pwd)"
WORKSPACE="$WORKSPACE_DEFAULT"
FRONTEND=""
EXTENSION=""
URL_DEFAULT="https://github.com/iNewLegend/iNewLegend"
URL="$URL_DEFAULT"
USER_DATA_DIR=""
REMOTE_DEBUGGING_PORT=9222
CHROME_BIN=""
DRY_RUN=0
BACKGROUND=0

print_usage() {
  sed -n '1,120p' "$0" | sed -n '1,80p'
}

# parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    -w|--workspace)
      WORKSPACE="$2"; shift 2;;
    -f|--frontend)
      FRONTEND="$2"; shift 2;;
    -e|--extension)
      EXTENSION="$2"; shift 2;;
    -u|--url)
      URL="$2"; shift 2;;
    --chrome)
      CHROME_BIN="$2"; shift 2;;
    --port)
      REMOTE_DEBUGGING_PORT="$2"; shift 2;;
    --dry-run)
      DRY_RUN=1; shift 1;;
    -b|--background)
      BACKGROUND=1; shift 1;;
    -h|--help)
      print_usage; exit 0;;
    *)
      echo "Unknown arg: $1" >&2; print_usage; exit 2;;
  esac
done

# Resolve defaults
FRONTEND="${FRONTEND:-$WORKSPACE/apps/frontend}"
EXTENSION="${EXTENSION:-$FRONTEND/extension}"
USER_DATA_DIR="${USER_DATA_DIR:-$WORKSPACE/.vscode/chrome-debug-profile}"

# Find a Chrome binary if none provided
find_chrome() {
  if [[ -n "$CHROME_BIN" ]]; then
    echo "$CHROME_BIN"
    return
  fi

  # macOS common paths
  if [[ "$(uname -s)" == "Darwin" ]]; then
    candidates=(
      "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary"
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
      "/Applications/Chromium.app/Contents/MacOS/Chromium"
    )
    for c in "${candidates[@]}"; do
      if [[ -x "$c" ]]; then
        echo "$c"; return
      fi
    done
  fi

  # Try common linux/windows names available on PATH
  for name in google-chrome-stable google-chrome chrome chromium chromium-browser google-chrome; do
    if command -v "$name" >/dev/null 2>&1; then
      command -v "$name"; return
    fi
  done

  echo ""
}

CHROME_BIN_RESOLVED="$(find_chrome)"
if [[ -z "$CHROME_BIN_RESOLVED" ]]; then
  echo "Error: Could not find a Chrome/Chromium binary. Provide one with --chrome /path/to/chrome" >&2
  exit 3
fi

# Build command
mkdir -p "$USER_DATA_DIR"

CMD=("$CHROME_BIN_RESOLVED"
  "--disable-web-security"
  "--user-data-dir=$USER_DATA_DIR"
  "--load-extension=$EXTENSION"
  "--remote-debugging-port=$REMOTE_DEBUGGING_PORT"
  "--no-first-run"
  "--no-default-browser-check"
  "--new-window"
  "$URL"
)

# Print summary
echo "Workspace: $WORKSPACE"
echo "Frontend: $FRONTEND"
echo "Extension: $EXTENSION"
echo "User data dir: $USER_DATA_DIR"
echo "Remote debugging port: $REMOTE_DEBUGGING_PORT"
echo "Chrome binary: $CHROME_BIN_RESOLVED"
echo

echo "Command to run:"
echo "${CMD[*]}"

if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "Dry run; not launching Chrome."
  exit 0
fi

# Launch
if [[ "$BACKGROUND" -eq 1 ]]; then
  # start in background and detach
  nohup "${CMD[@]}" > /dev/null 2>&1 &
  disown
  echo "Chrome launched in background."
else
  exec "${CMD[@]}"
fi

