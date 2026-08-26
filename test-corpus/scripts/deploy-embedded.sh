#!/bin/sh
# Mirrors embedded/ and hostile-embedded/ to a separate, independently configured
# destination (EMBEDDED_DEPLOY_PATH), since these are plain HTML pages that piggyback on
# arbitrary publisher sites and don't belong in the plugin's own static-documents/ folder.
# Does not touch WordPress at all, so it skips the WP safety gate.
set -e
cd "$(dirname "$0")"
. ./lib/config.sh

if [ -z "$EMBEDDED_DEPLOY_PATH" ] || [ ! -d "$EMBEDDED_DEPLOY_PATH" ]; then
  echo "EMBEDDED_DEPLOY_PATH ('$EMBEDDED_DEPLOY_PATH') is not set or does not exist — check config.sh." >&2
  exit 1
fi

DEST="$EMBEDDED_DEPLOY_PATH/test-corpus"
mkdir -p "$DEST/embedded" "$DEST/hostile-embedded"

rsync -a --delete ../embedded/ "$DEST/embedded/"
rsync -a --delete ../hostile-embedded/ "$DEST/hostile-embedded/"

echo "Deployed embedded/ and hostile-embedded/ to $DEST"
echo "Served (per config) under: $EMBEDDED_BASE_URL/test-corpus/"
