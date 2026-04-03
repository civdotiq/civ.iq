#!/usr/bin/env bash
# PreToolUse hook: block destructive shell commands before they execute.
# Exit 2 = block and tell Claude why. Exit 0 = allow.
set -euo pipefail

cmd=$(jq -r '.tool_input.command // ""')

dangerous_patterns=(
  "rm -rf"
  "git reset --hard"
  "git push.*--force"
  "git push -f"
  "git clean -f"
  "git branch -D main"
  "git branch -D master"
  "DROP TABLE"
  "DROP DATABASE"
  "TRUNCATE "
  "curl.*\\|.*sh"
  "wget.*\\|.*bash"
  "chmod 777"
  "> /dev/sd"
  "mkfs\."
  "dd if="
)

for pattern in "${dangerous_patterns[@]}"; do
  if echo "$cmd" | grep -qiE "$pattern"; then
    echo "BLOCKED: matches dangerous pattern '$pattern'. Propose a safer alternative." >&2
    exit 2
  fi
done

exit 0
