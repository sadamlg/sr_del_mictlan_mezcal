#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
base_env="$project_root/.env"
lan_env="$project_root/.env.dev-lan"

usage() {
  cat <<'EOF'
Activa o desactiva el acceso de desarrollo desde la red local.

Uso:
  scripts/dev-lan.sh up <ip-del-equipo>
  scripts/dev-lan.sh up <ip-del-equipo> --media-url <url-https-publica>
  scripts/dev-lan.sh off

Sin --media-url, usa los archivos locales servidos desde la IP indicada.
Con --media-url, usa esa URL HTTPS pública para MEDIA_BASE_URL y
STRIPE_MEDIA_BASE_URL (por ejemplo, el origen público de un bucket R2).
EOF
}

fail() {
  printf 'Error: %s\n' "$1" >&2
  exit 1
}

require_setup() {
  [[ -f "$base_env" ]] || fail "No existe .env. Cópialo desde .env.example antes de usar este script."
  command -v docker >/dev/null 2>&1 || fail "Docker CLI no está instalado o no está en PATH."
  docker compose version >/dev/null 2>&1 || fail "No está disponible el plugin docker compose."
}

is_ipv4() {
  local address="$1"
  local octet
  local octets

  [[ "$address" =~ ^[0-9]{1,3}(\.[0-9]{1,3}){3}$ ]] || return 1
  IFS=. read -r -a octets <<< "$address"
  for octet in "${octets[@]}"; do
    [[ "$octet" != 0* || "${#octet}" -eq 1 ]] || return 1
    ((10#$octet <= 255)) || return 1
  done
  [[ "$address" != 0.0.0.0 && "$address" != 127.* ]]
}

compose_setting() {
  local name="$1"
  docker compose --env-file "$base_env" config --environment |
    awk -F= -v name="$name" '
      $1 == name {
        value = substr($0, index($0, "=") + 1)
        found = 1
      }
      END {
        if (found) print value
        else exit 1
      }
    '
}

read_port() {
  local name="$1"
  local fallback="$2"
  local value

  value="$(compose_setting "$name")" || value="$fallback"
  [[ "$value" =~ ^[0-9]{1,5}$ ]] || fail "$name debe ser un puerto numérico."
  ((10#$value > 0 && 10#$value <= 65535)) || fail "$name debe estar entre 1 y 65535."
  printf '%s\n' "$value"
}

up_lan() {
  local lan_ip="$1"
  local media_url="${2:-}"
  local frontend_port
  local backend_port
  local mailpit_port
  local default_media_url
  local temp_env

  is_ipv4 "$lan_ip" || fail "Indica la IPv4 asignada al equipo anfitrión, no localhost ni 0.0.0.0."
  if [[ -n "$media_url" && ! "$media_url" =~ ^https://[A-Za-z0-9.-]+(:[0-9]+)?(/[A-Za-z0-9._~/-]+)?$ ]]; then
    fail "--media-url debe ser una URL HTTPS pública sin espacios ni barra final."
  fi

  docker compose --env-file "$base_env" config --quiet
  frontend_port="$(read_port FRONTEND_PORT 3000)"
  backend_port="$(read_port BACKEND_PORT 4000)"
  mailpit_port="$(read_port MAILPIT_PORT 8025)"
  default_media_url="http://${lan_ip}:${frontend_port}"

  temp_env="$(mktemp "$project_root/.env.dev-lan.XXXXXX")"
  trap 'rm -f "$temp_env"' EXIT
  {
    printf 'FRONTEND_BIND_ADDRESS=0.0.0.0\n'
    printf 'BACKEND_BIND_ADDRESS=0.0.0.0\n'
    printf 'MAILPIT_BIND_ADDRESS=0.0.0.0\n'
    printf 'NEXT_ALLOWED_DEV_ORIGIN=%s\n' "$lan_ip"
    printf 'NEXT_PUBLIC_API_URL=http://%s:%s\n' "$lan_ip" "$backend_port"
    printf 'FRONTEND_ORIGIN=http://%s:%s\n' "$lan_ip" "$frontend_port"
    printf 'APP_BASE_URL=http://%s:%s\n' "$lan_ip" "$frontend_port"
    if [[ -n "$media_url" ]]; then
      printf 'MEDIA_BASE_URL=%s\n' "$media_url"
      printf 'STRIPE_MEDIA_BASE_URL=%s\n' "$media_url"
    else
      printf 'MEDIA_BASE_URL=%s\n' "$default_media_url"
    fi
  } > "$temp_env"
  mv "$temp_env" "$lan_env"
  trap - EXIT

  if [[ -n "$media_url" ]]; then
    docker compose --env-file "$base_env" --env-file "$lan_env" \
      up --build --detach --force-recreate frontend backend worker mailpit
  else
    docker compose --env-file "$base_env" --env-file "$lan_env" \
      up --detach --force-recreate frontend backend worker mailpit
  fi

  printf '\nTienda:  http://%s:%s\n' "$lan_ip" "$frontend_port"
  printf 'API:     http://%s:%s\n' "$lan_ip" "$backend_port"
  printf 'Mailpit: http://%s:%s\n' "$lan_ip" "$mailpit_port"
  if [[ -n "$media_url" ]]; then
    printf 'Medios:  %s\n' "$media_url"
  else
    printf 'Medios:  servidos por la aplicación desde la LAN\n'
  fi
}

turn_off_lan() {
  docker compose --env-file "$base_env" config --quiet
  docker compose --env-file "$base_env" \
    up --detach --force-recreate frontend backend worker mailpit
  rm -f "$lan_env"
  printf 'Acceso LAN desactivado; frontend, API, worker y Mailpit usan de nuevo los valores de .env.\n'
}

action="${1:-}"
if [[ "$action" == "-h" || "$action" == "--help" || -z "$action" ]]; then
  usage
  exit 0
fi
shift

require_setup
cd "$project_root"

case "$action" in
  up)
    [[ $# -ge 1 ]] || { usage >&2; exit 2; }
    lan_ip="$1"
    shift
    media_url=""
    if [[ $# -gt 0 ]]; then
      [[ $# -eq 2 && "$1" == "--media-url" ]] || { usage >&2; exit 2; }
      media_url="$2"
    fi
    up_lan "$lan_ip" "$media_url"
    ;;
  off)
    [[ $# -eq 0 ]] || { usage >&2; exit 2; }
    turn_off_lan
    ;;
  *)
    usage >&2
    exit 2
    ;;
esac
