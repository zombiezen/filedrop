#!/bin/bash
if [[ $# -ne 2 ]]; then
  echo "usage: $(basename "$0") URL NAME" 1>&2
  exit 64
fi

url="$1"
token="$(echo "$url" | sed -e 's/^.*#//')"
base="$(echo "$url" | sed -e 's/#.*$//')"
shift 1
exec curl -sSL -H "Authorization: Bearer $token" "$base/file/$1"
