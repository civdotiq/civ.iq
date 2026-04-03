#!/usr/bin/env bash
# PreToolUse hook: block edits to sensitive files.
# Exit 2 = block and tell Claude why. Exit 0 = allow.
set -euo pipefail

file=$(jq -r '.tool_input.file_path // .tool_input.path // ""')

if [ -z "$file" ]; then
  exit 0
fi

# Normalize to just the filename/relative path for matching
basename=$(basename "$file")
relpath="${file##*/civ.iq/}"

protected_exact=(
  "package-lock.json"
  "yarn.lock"
  "pnpm-lock.yaml"
)

protected_patterns=(
  "^\.env"
  "\.pem$"
  "\.key$"
  "\.p12$"
  "^secrets/"
  "credentials"
)

for name in "${protected_exact[@]}"; do
  if [ "$basename" = "$name" ]; then
    echo "BLOCKED: '$basename' is a protected file. Explain why this edit is necessary." >&2
    exit 2
  fi
done

for pattern in "${protected_patterns[@]}"; do
  if echo "$basename" | grep -qiE "$pattern" || echo "$relpath" | grep -qiE "$pattern"; then
    echo "BLOCKED: '$file' matches protected pattern '$pattern'. Explain why this edit is necessary." >&2
    exit 2
  fi
done

exit 0
