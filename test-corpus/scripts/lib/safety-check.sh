#!/bin/sh
# Sourced after lib/config.sh. Refuses to run unless the target site looks like a
# disposable dev/test site, since the deploy scripts overwrite content by design.

if [ "$SKIP_SAFETY_CHECK" != "1" ]; then
  # tail -n1 defends against stray warning lines (e.g. a PHP extension mismatch) that some
  # environments print to stdout ahead of wp-cli's actual output.
  site_url=$(wp option get siteurl | tail -n1)
  case "$site_url" in
    *"$SAFE_URL_PATTERN"*) : ;;
    *)
      echo "Refusing to deploy: '$site_url' does not match SAFE_URL_PATTERN ('$SAFE_URL_PATTERN')." >&2
      echo "Set SKIP_SAFETY_CHECK=1 in config.sh only if you're sure this is a disposable site." >&2
      exit 1
      ;;
  esac
fi
