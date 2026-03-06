#!/usr/bin/env bash
# Token validation — checks that custom design tokens (--color-*, --space-*, --text-*,
# --shadow-*, --radius-*, --duration-*, --ease-*, --font-*, --tracking-*, --line-*, --size-*)
# referenced via var() are defined in the :root block of custom.scss.
#
# Usage: bash scripts/validate-tokens.sh

set -euo pipefail

ROOT_FILE="quartz/styles/custom.scss"
SEARCH_DIRS="quartz/components quartz/styles"

# Only validate our custom token prefixes — skip Quartz builtins and component-scoped vars
TOKEN_PATTERN='var\(--(color|space|text|shadow|radius|duration|ease|font|tracking|line|size)-[a-z0-9-]+'

echo "=== Token Validation ==="
echo ""

# 1. Extract all custom token definitions from custom.scss
DEFINED=$(grep -oE '\-\-(color|space|text|shadow|radius|duration|ease|font|tracking|line|size)-[a-z0-9-]+' "$ROOT_FILE" | sort -u)

# 2. Extract all var(--token-*) references across components and styles
REFERENCED=$(grep -rhoE "$TOKEN_PATTERN" $SEARCH_DIRS | sed 's/var(//g' | sort -u)

# 3. Check for references to undefined tokens
MISSING=0
for ref in $REFERENCED; do
  if ! echo "$DEFINED" | grep -qx -- "$ref"; then
    echo "  MISSING: $ref"
    MISSING=$((MISSING + 1))
  fi
done

if [ "$MISSING" -eq 0 ]; then
  echo "  All referenced tokens are defined."
fi

# 4. Check for unused tokens (defined but never referenced in any file)
echo ""
echo "=== Unused Tokens ==="
UNUSED=0
for def in $DEFINED; do
  # Count total occurrences (not files). The definition line is 1, so usage needs >= 2.
  COUNT=$(grep -r --include='*.tsx' --include='*.scss' --include='*.ts' -c -- "$def" $SEARCH_DIRS 2>/dev/null | awk -F: '{s+=$NF} END {print s+0}')
  if [ "$COUNT" -le 1 ]; then
    echo "  UNUSED: $def"
    UNUSED=$((UNUSED + 1))
  fi
done

if [ "$UNUSED" -eq 0 ]; then
  echo "  All defined tokens are referenced."
fi

echo ""
echo "Summary: $MISSING missing, $UNUSED unused"
exit $MISSING
