#!/bin/sh
# Create-or-update WP pages from pages/<slug>/ and hostile-pages/<slug>/ ingredients.
# Same idempotent-by-slug logic as deploy-posts.sh — see lib/deploy-content.sh.
set -e
cd "$(dirname "$0")"
. ./lib/config.sh
. ./lib/safety-check.sh
. ./lib/deploy-content.sh

# tail -n1 defends against stray warning lines (e.g. a PHP extension mismatch) that some
# environments print to stdout ahead of wp-cli's actual output.
SITE_URL=$(wp option get siteurl | tail -n1)

deploy_content_type page ../pages ../hostile-pages
