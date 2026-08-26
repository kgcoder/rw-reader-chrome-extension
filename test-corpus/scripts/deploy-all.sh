#!/bin/sh
# Runs the full deploy: standalone/hostile files, embedded HTML pages, WP posts, then the
# table of contents (which must run last since it needs final permalinks/paths).
set -e
cd "$(dirname "$0")"

./deploy-standalone.sh
./deploy-embedded.sh
./deploy-posts.sh
./generate-toc.sh
