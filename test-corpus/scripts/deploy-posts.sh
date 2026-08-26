#!/bin/sh
# Create-or-update WP pages from posts/<slug>/ and hostile-posts/<slug>/ ingredients.
# Idempotent: identity is tracked via the _test_corpus_slug meta key (not title or
# post_name), so re-running after editing a fixture updates the same page in place
# instead of creating a duplicate. Requires jq.
set -e
cd "$(dirname "$0")"
. ./lib/config.sh
. ./lib/safety-check.sh

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required (used to read meta.json) but was not found on PATH." >&2
  exit 1
fi

# tail -n1 defends against stray warning lines (e.g. a PHP extension mismatch) that some
# environments print to stdout ahead of wp-cli's actual output.
SITE_URL=$(wp option get siteurl | tail -n1)

deploy_post_dir() {
  dir="$1"
  meta="$dir/meta.json"
  [ -f "$meta" ] || return 0

  slug=$(jq -r '.slug' "$meta")
  title=$(jq -r '.title' "$meta")
  toc_group=$(jq -r '.toc_group' "$meta")
  doc_type=$(jq -r '.doc_type' "$meta")
  display_mode=$(jq -r '.display_mode' "$meta")
  author_name_display=$(jq -r '.author_name_display' "$meta")
  publish_date_display=$(jq -r '.publish_date_display' "$meta")
  republishing_policy=$(jq -r '.republishing_policy' "$meta")
  sidebar=$(jq -r '.sidebar // empty' "$meta")
  connections_file=$(jq -r '.connections_file // empty' "$meta")
  cdoc_svg_file=$(jq -r '.cdoc_svg_file // empty' "$meta")
  condoc_main_url=$(jq -r '.condoc_main_url // empty' "$meta")
  condoc_description=$(jq -r '.condoc_description // empty' "$meta")

  full_title="[test-corpus] $title"
  content=$(sed "s|{{SITE_URL}}|$SITE_URL|g" "$dir/content.html")

  existing_id=$(wp post list --meta_key=_test_corpus_slug --meta_value="$slug" \
    --post_type=page --post_status=any --field=ID | grep -E '^[0-9]+$' | head -n1)

  if [ -n "$existing_id" ]; then
    post_id="$existing_id"
    wp post update "$post_id" --post_title="$full_title" --post_content="$content" \
      --post_type=page --post_status=publish >/dev/null
  else
    post_id=$(wp post create --post_title="$full_title" --post_content="$content" \
      --post_type=page --post_status=publish --porcelain | tail -n1)
    wp post meta update "$post_id" _test_corpus_slug "$slug" >/dev/null
  fi

  wp post meta update "$post_id" _test_corpus_toc_group "$toc_group" >/dev/null
  wp post meta update "$post_id" _doc_type "$doc_type" >/dev/null
  wp post meta update "$post_id" _hdoc_display_mode "$display_mode" >/dev/null
  wp post meta update "$post_id" _hdoc_author_name_display "$author_name_display" >/dev/null
  wp post meta update "$post_id" _hdoc_publish_date_display "$publish_date_display" >/dev/null
  wp post meta update "$post_id" _republishing_policy "$republishing_policy" >/dev/null

  if [ -n "$sidebar" ]; then
    wp post meta update "$post_id" _stwbpb_sidebar "$sidebar" >/dev/null
  fi

  if [ -n "$connections_file" ] && [ -f "$dir/$connections_file" ]; then
    connections=$(sed "s|{{SITE_URL}}|$SITE_URL|g" "$dir/$connections_file")
    wp post meta update "$post_id" _static_web_connections_info "$connections" >/dev/null
  fi

  if [ -n "$cdoc_svg_file" ] && [ -f "$dir/$cdoc_svg_file" ]; then
    wp post meta update "$post_id" _cdoc_svg "$(cat "$dir/$cdoc_svg_file")" >/dev/null
  fi

  if [ -n "$condoc_main_url" ]; then
    wp post meta update "$post_id" _condoc_main_url "$condoc_main_url" >/dev/null
  fi

  if [ -n "$condoc_description" ]; then
    wp post meta update "$post_id" _condoc_description "$condoc_description" >/dev/null
  fi

  echo "  $slug -> post $post_id"
}

echo "Deploying posts/ ..."
for dir in ../posts/*/; do
  deploy_post_dir "${dir%/}"
done

echo "Deploying hostile-posts/ ..."
for dir in ../hostile-posts/*/; do
  deploy_post_dir "${dir%/}"
done
