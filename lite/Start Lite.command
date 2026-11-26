#!/bin/zsh -l
cd -- "${0:A:h}" || exit 1
export PATH="$PATH:/opt/homebrew/bin:/usr/local/bin"
if ! command -v node >/dev/null 2>&1; then
  print -u2 'Node.js 22 is required. Install native arm64 Node.js and put it on PATH.'
  read -k 1 '?Press any key to close.'
  exit 1
fi
node lite/start.js "$@"
status_code=$?
if (( status_code != 0 )); then read -k 1 '?Press any key to close.'; fi
exit "$status_code"
