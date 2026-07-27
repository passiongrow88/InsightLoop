#!/usr/bin/env bash
set -euo pipefail

if [[ ! -d .bootstrap ]]; then
  exit 0
fi

cat .bootstrap/newfiles.tar.gz.b64.part* | base64 --decode > /tmp/insightloop-v2-newfiles.tar.gz
base64 --decode .bootstrap/insightloop_v2_existing.patch.b64 > /tmp/insightloop-v2-existing.patch

git apply --check /tmp/insightloop-v2-existing.patch
git apply /tmp/insightloop-v2-existing.patch
tar -xzf /tmp/insightloop-v2-newfiles.tar.gz -C .

echo "InsightLoop V2 source prepared for build."
