# Phase 1 — Test Corpus + Deploy Scripts (implementation plan)

> **Where this lives:** written from the plugin repo, but everything described here belongs
> in the **extension repo** (own top-level folder, e.g. `test-corpus/`), per
> [Testing_roadmap.md §2](Testing_roadmap.md). This file should be moved into that repo's
> `noinclude/` folder and can then be deleted from here. It refines the sketch in
> Testing_roadmap.md §2 into something buildable — concrete config, idempotency rules, and
> a table-of-contents step that the roadmap didn't cover.

---

## 1. Goal

One versioned corpus of test documents, consumed two ways:

- **`standalone/` + `hostile/`** → mirrored into a WordPress site's `static-documents/`
  folder, served at `/static/...`.
- **`posts/`** → turned into real WP posts (with meta) on a WordPress site via `wp-cli`.

Re-running the deploy must be **safe and idempotent**: editing a fixture in the repo and
re-running updates the existing WP post/file in place — no duplicate posts, no manual
cleanup, no `{{SITE_URL}}` mismatches. A generated **table-of-contents post** links to
everything that was just deployed, so a manual tester has one page to start from.

## 2. Non-goals (for this phase)

- No automated assertions — this phase produces *fixtures and a deploy mechanism*, not
  tests. Parser unit tests (Phase 3) and PHPUnit (Phase 4) consume this corpus later.
- No deletion of posts/files removed from the corpus by default (see §6 — pruning is
  opt-in and explicit, not automatic, since it's destructive).
- No support for deploying to a public/production site. This targets local dev sites
  (e.g. Local by Flywheel) and disposable staging sites only — see the safety gate in §7.

## 3. Directory layout

```
test-corpus/
  config.sh.example       # checked in; copy to config.sh and fill in
  config.sh                # gitignored — real paths/URLs for the dev's machine(s)
  .gitignore                # ignores config.sh

  standalone/                # raw .hdoc / .cdoc / .condoc files (see Testing_roadmap §2)
    basic.hdoc
    long-document.hdoc
    ...
  hostile/
    broken-xml.hdoc
    script-in-content.hdoc
    svg-with-script.cdoc

  posts/
    basic-post/
      meta.json             # see schema in §5
      content.html          # post_content (post body, may use {{SITE_URL}})
      connections.xml       # optional — raw XML for _static_web_connections_info
    cdoc-post/
      meta.json
      content.html            # for CDOC/CONDOC posts this can be a short description
      cdoc.svg                # raw SVG, referenced by meta.json's cdoc_svg_file
    ...

  scripts/
    lib/
      config.sh              # loads + validates config.sh, defines the wp() wrapper
      safety-check.sh         # confirms target site is a dev/test site (§7)
    deploy-standalone.sh      # mirrors standalone/ + hostile/ into static-documents/
    deploy-posts.sh           # create-or-update posts from posts/*
    generate-toc.sh           # (re)writes the table-of-contents post
    deploy-all.sh             # runs the three above in order
  README.md                    # what each fixture exercises (per Testing_roadmap §2)
```

Standalone files are mirrored under a **dedicated subfolder**,
`static-documents/test-corpus/`, not directly into `static-documents/`. That keeps the
mirror (which uses `rsync --delete`) scoped to files this tool owns, so it can never touch
unrelated files a site owner might have dropped into `static-documents/`.

## 4. `config.sh` — one file, no repeated flags

Checked-in template `config.sh.example`:

```sh
# Copy to config.sh and fill in. config.sh is gitignored.

# Absolute path to the WordPress install (ABSPATH). For a Local by Flywheel site this is
# the "app/public" folder shown in Local's site info panel.
WP_PATH="/path/to/local-site/app/public"

# Optional: wp-cli binary or wrapper if `wp` isn't on PATH (e.g. Local's shell provides
# its own `wp`; a remote/staging setup might need an SSH wrapper here instead).
WP_CLI_BIN="wp"

# Safety gate (see README §7): deploy scripts refuse to run unless the site's URL
# contains this substring. Prevents an accidental run against a real/production site.
SAFE_URL_PATTERN=".local"

# Set to 1 to skip the safety gate entirely (e.g. a disposable staging box that doesn't
# match SAFE_URL_PATTERN). Never set this for a real site.
SKIP_SAFETY_CHECK=0
```

`scripts/lib/config.sh` sources this, validates `WP_PATH` exists and contains a
`wp-config.php`, and defines:

```sh
wp() { "$WP_CLI_BIN" --path="$WP_PATH" "$@"; }
```

Every script sources `lib/config.sh` first, so nothing ever hardcodes a path or re-asks
for it. No WordPress *credentials* are needed for this design — `wp-cli` run via
`--path` operates directly on the database/filesystem, the same way Testing_roadmap.md's
`import.sh` sketch already assumed. If a future target site only allows remote `wp-cli`
over SSH, `WP_CLI_BIN` becomes the SSH wrapper and everything else is unchanged.

## 5. `meta.json` schema (one per `posts/<slug>/` folder)

```json
{
  "slug": "basic-post",
  "title": "Basic HDOC post",
  "toc_group": "starter",
  "doc_type": "HDOC",
  "display_mode": "doc_in_reader",
  "author_name_display": "default",
  "publish_date_display": "default",
  "republishing_policy": "default",
  "connections_file": "connections.xml",
  "cdoc_svg_file": null,
  "condoc_main_url": null,
  "condoc_description": null
}
```

- **`slug`** is the stable identity used for idempotent updates (§6) — it becomes the WP
  `post_name` and is never regenerated from the title, so renaming `title` doesn't create
  a duplicate post.
- **`toc_group`** (`starter` / `full` / `hostile`) drives how `generate-toc.sh` sections
  the ToC page — matches the Starter/Full/Hostile split already in Testing_roadmap §2.
- Everything else maps 1:1 to the post-meta keys documented in the plugin's CLAUDE.md
  (`_doc_type`, `_hdoc_display_mode`, `_hdoc_author_name_display`,
  `_hdoc_publish_date_display`, `_republishing_policy`, `_static_web_connections_info`,
  `_cdoc_svg`, `_condoc_main_url`, `_condoc_description`). A missing/`null` field means
  "don't set that meta key."

`content.html` and `connections.xml` (or `cdoc.svg`) may contain the literal string
`{{SITE_URL}}`, substituted at deploy time — see §6.

## 6. Idempotency — "deploy always overrides, never duplicates"

**Posts (`deploy-posts.sh`):** for each `posts/<slug>/meta.json`, look up an existing post
by a dedicated meta key rather than by title or `post_name` (titles/slugs can collide with
real content on a shared dev site):

```sh
existing_id=$(wp post list --meta_key=_test_corpus_slug --meta_value="$slug" \
              --post_type=any --post_status=any --field=ID)
```

- If found → `wp post update $existing_id ...` (content, all meta keys, `post_status`
  forced back to `publish` in case a tester had trashed it).
- If not found → `wp post create ... --porcelain`, then immediately
  `wp post meta update $new_id _test_corpus_slug "$slug"` so the next run finds it.

This means editing a fixture and re-running the script updates that exact post in place —
matching the user's requirement that the data "overrides existing data on the site."

`{{SITE_URL}}` substitution happens on a **temp copy** of `content.html` /
`connections.xml` (never edits the fixture in the repo), using
`wp option get siteurl` read once at the top of the script and `sed`.

**Standalone files (`deploy-standalone.sh`):**

```sh
rsync -a --delete standalone/ hostile/ "$WP_PATH/static-documents/test-corpus/"
```

(two `rsync` calls into `test-corpus/standalone/` and `test-corpus/hostile/`
subfolders, or flatten with a manifest — decide during implementation; keeping the
`standalone/` vs `hostile/` split as subfolders under `static-documents/test-corpus/`
mirrors the repo layout 1:1 and makes the ToC grouping trivial).
`--delete` makes this a true mirror: removing a fixture from the repo removes the served
file on next deploy, with **zero risk** to unrelated files because the mirror target is a
subfolder this tool exclusively owns.

**Table of contents (`generate-toc.sh`):** same find-or-update pattern as posts, keyed off
a fixed `_test_corpus_slug` value of `test-corpus-toc`. Runs **last**, after posts and
standalone files are deployed, because it needs final permalinks:

- Standalone/hostile entries: list files actually present under
  `static-documents/test-corpus/`, linked as `/static/test-corpus/<subfolder>/<file>`.
- Post entries: `wp post list --meta_key=_test_corpus_slug --field=... ` to get permalink,
  title, and read back `_doc_type` / `_hdoc_display_mode` for a label — grouped by
  `toc_group` (Starter / Full / Hostile), matching Testing_roadmap §2's inventory split.

The ToC post itself gets `_hdoc_display_mode = none` — it's a navigation aid for the
tester, not a fixture, so it should render as an ordinary WP page unaffected by the
plugin's HDOC machinery.

## 7. Safety gate

Because deploys **overwrite** existing content by design, `deploy-all.sh` (and each
sub-script, if run standalone) must refuse to run against anything that doesn't look like
a disposable dev/test site:

```sh
site_url=$(wp option get siteurl)
if [ "$SKIP_SAFETY_CHECK" != "1" ]; then
  case "$site_url" in
    *"$SAFE_URL_PATTERN"*) : ;;
    *) echo "Refusing to deploy: '$site_url' does not match SAFE_URL_PATTERN ('$SAFE_URL_PATTERN')." >&2
       echo "Set SKIP_SAFETY_CHECK=1 in config.sh only if you're sure this is a disposable site." >&2
       exit 1 ;;
  esac
fi
```

## 8. `deploy-all.sh` — the one command

```sh
#!/bin/sh
set -e
cd "$(dirname "$0")"
. ./lib/config.sh
. ./lib/safety-check.sh
./deploy-standalone.sh
./deploy-posts.sh
./generate-toc.sh
echo "Done. ToC: $(wp post list --meta_key=_test_corpus_slug --meta_value=test-corpus-toc --field=url)"
```

## 9. Pruning (explicitly out of scope for the default flow)

Deleting posts/files removed from the corpus is deliberately **not** automatic — the user
should decide this per the CLAUDE.md guidance on destructive actions being opt-in. Once
this is built, a future `deploy-all.sh --prune` could safely find everything tagged
`_test_corpus_slug` on the site, diff against the repo's current fixture slugs, and
delete only the leftovers — with a confirmation prompt. Not part of the initial build.

## 10. Build order

1. `config.sh.example` + `lib/config.sh` + `lib/safety-check.sh`.
2. `deploy-standalone.sh` against the starter `standalone/` + `hostile/` files already
   listed in Testing_roadmap §2's starter set.
3. `deploy-posts.sh` against 2–3 `posts/` fixtures (one HDOC, one CDOC, one CONDOC) to
   prove the find-or-update-by-slug logic before writing the rest of the corpus.
4. `generate-toc.sh`.
5. `deploy-all.sh` wrapper.
6. Fill out the rest of the starter corpus per Testing_roadmap §2's inventory.
7. `README.md` documenting what each fixture exercises.

## 11. Open decisions for whoever picks this up

- Exact WP post type for corpus posts/ToC (`post` vs a dedicated `page`) — either works,
  pick whatever keeps them out of the way of real content in the sidebar (e.g. `page`
  with a consistent title prefix like `[test-corpus]`).
- Whether `standalone/`/`hostile/` mirror flat into `static-documents/test-corpus/` or
  keep the two subfolders — subfolders are recommended (§6) for clean ToC grouping.
