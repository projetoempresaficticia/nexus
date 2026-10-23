#!/usr/bin/env bash
# Falha se o build tiver uma chave secreta do Supabase: "sb_secret_..." ou JWT com role service_role.
# (O texto "service_role" sozinho aparece no código do supabase-js e não é segredo.)
set -euo pipefail
DIR=${1:-dist}
if grep -rEoh 'sb_secret_[A-Za-z0-9_-]{10,}' "$DIR" | grep -q .; then
  echo "::error::Chave sb_secret_ encontrada em $DIR"; exit 1
fi
for jwt in $(grep -rEoh 'eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+' "$DIR" | sort -u); do
  carga=$(echo "$jwt" | cut -d. -f2 | tr '_-' '/+')
  while [ $(( ${#carga} % 4 )) -ne 0 ]; do carga="$carga="; done
  if echo "$carga" | base64 -d 2>/dev/null | grep -q '"role":"service_role"'; then
    echo "::error::JWT service_role encontrado em $DIR"; exit 1
  fi
done
echo "Nenhuma chave secreta em $DIR."
