#!/bin/sh
# Mirrors standalone/ and hostile-standalone/ into the plugin's static-documents/ folder,
# under a dedicated test-corpus/ subfolder so --delete can never touch a site owner's
# unrelated files.
set -e
cd "$(dirname "$0")"
. ./lib/config.sh

DEST="$WP_PATH/static-documents/test-corpus"
mkdir -p "$DEST/standalone" "$DEST/hostile-standalone"

rsync -a --delete ../standalone/ "$DEST/standalone/"
rsync -a --delete ../hostile-standalone/ "$DEST/hostile-standalone/"

echo "Deployed standalone/ and hostile-standalone/ to $DEST"
