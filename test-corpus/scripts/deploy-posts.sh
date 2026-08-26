#!/bin/sh
# Create-or-update WP posts from posts/<slug>/ and hostile-posts/<slug>/ ingredients.
# Idempotent: identity is tracked via the _test_corpus_slug meta key (not title or
# post_name), so re-running after editing a fixture updates the same post in place
# instead of creating a duplicate. Requires jq. Shared logic lives in
# lib/deploy-content.sh (also used by deploy-pages.sh).
set -e
cd "$(dirname "$0")"
. ./lib/config.sh
. ./lib/safety-check.sh
. ./lib/deploy-content.sh

# tail -n1 defends against stray warning lines (e.g. a PHP extension mismatch) that some
# environments print to stdout ahead of wp-cli's actual output.
SITE_URL=$(wp option get siteurl | tail -n1)

deploy_content_type post ../posts ../hostile-posts
