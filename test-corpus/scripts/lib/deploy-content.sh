#!/bin/sh
# Shared create-or-update logic for WP content deployed from a "slug folder" convention:
# <dir>/<slug>/meta.json + content.html (+ optional connections.xml / cdoc.svg). Sourced
# by deploy-posts.sh (post_type=post) and deploy-pages.sh (post_type=page) — both just
# supply the WP post_type and source directories. Requires lib/config.sh already sourced
# (for wp()/WP_PATH) and SITE_URL already set by the caller.

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required (used to read meta.json) but was not found on PATH." >&2
  exit 1
fi

deploy_content_dir() {
  post_type="$1"
  dir="$2"
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

  # --post_type=any: _test_corpus_slug values must be unique across posts AND pages, so
  # look up by slug regardless of which post_type this fixture is deployed as.
  existing_id=$(wp post list --meta_key=_test_corpus_slug --meta_value="$slug" \
    --post_type=any --post_status=any --field=ID | grep -E '^[0-9]+$' | head -n1)

  if [ -n "$existing_id" ]; then
    post_id="$existing_id"
    wp post update "$post_id" --post_title="$full_title" --post_content="$content" \
      --post_type="$post_type" --post_status=publish >/dev/null
  else
    post_id=$(wp post create --post_title="$full_title" --post_content="$content" \
      --post_type="$post_type" --post_status=publish --porcelain | tail -n1)
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

  echo "  $slug -> $post_type $post_id"
}

deploy_content_type() {
  post_type="$1"
  shift
  for base_dir in "$@"; do
    echo "Deploying $base_dir/ as $post_type ..."
    for dir in "$base_dir"/*/; do
      deploy_content_dir "$post_type" "${dir%/}"
    done
  done
}
