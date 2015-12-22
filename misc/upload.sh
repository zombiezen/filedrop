#!/bin/bash
if [[ $# -lt 2 ]]; then
  echo "usage: $(basename "$0") URL FILE [...]" 1>&2
  exit 64
fi

url="$1"
token="$(echo "$url" | sed -e 's/^.*#//')"
base="$(echo "$url" | sed -e 's/#.*$//')"
shift 1
for name in "$@"; do
  curl -H "Authorization: Bearer $token" -T "$name" "$base/file/" || exit 1
done
