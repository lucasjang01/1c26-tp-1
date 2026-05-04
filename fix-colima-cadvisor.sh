#!/usr/bin/env bash
set -euo pipefail

COLIMA_CONFIG="$HOME/.colima/default/colima.yaml"
REPO_DIR="/Users/tomasfarall/Documents/fiuba/1c26-tp-1/"

echo "==> fix-colima-cadvisor: desactivando containerd-snapshotter en Colima"
echo "    Repo: $REPO_DIR"
echo "    Config: $COLIMA_CONFIG"
echo ""

# --- 1. Verificar que Colima está instalado ---
if ! command -v colima &> /dev/null; then
  echo "ERROR: colima no está instalado o no está en PATH" >&2
  exit 1
fi

if [[ ! -f "$COLIMA_CONFIG" ]]; then
  echo "ERROR: no se encontró $COLIMA_CONFIG — ¿alguna vez corriste 'colima start'?" >&2
  exit 1
fi

# --- 2. Backup del config ---
cp "$COLIMA_CONFIG" "${COLIMA_CONFIG}.bak"
echo "==> Backup guardado en ${COLIMA_CONFIG}.bak"

# --- 3. Editar el YAML ---
edit_config() {
  if command -v yq &> /dev/null; then
    echo "==> Usando yq para editar el config..."
    yq -i '.docker.features["containerd-snapshotter"] = false' "$COLIMA_CONFIG"
  elif python3 -c "import yaml" &> /dev/null 2>&1; then
    echo "==> Usando python3+PyYAML para editar el config..."
    python3 <<PY
import yaml, sys

with open("$COLIMA_CONFIG") as f:
    cfg = yaml.safe_load(f) or {}

cfg.setdefault("docker", {})
cfg["docker"].setdefault("features", {})
cfg["docker"]["features"]["containerd-snapshotter"] = False

with open("$COLIMA_CONFIG", "w") as f:
    yaml.safe_dump(cfg, f, default_flow_style=False, sort_keys=False)

print("containerd-snapshotter = false escrito en config")
PY
  else
    echo "==> PyYAML no encontrado, instalando..."
    if pip3 install --user pyyaml &> /dev/null; then
      echo "==> PyYAML instalado, reintentando..."
      python3 <<PY
import yaml, sys

with open("$COLIMA_CONFIG") as f:
    cfg = yaml.safe_load(f) or {}

cfg.setdefault("docker", {})
cfg["docker"].setdefault("features", {})
cfg["docker"]["features"]["containerd-snapshotter"] = False

with open("$COLIMA_CONFIG", "w") as f:
    yaml.safe_dump(cfg, f, default_flow_style=False, sort_keys=False)

print("containerd-snapshotter = false escrito en config")
PY
    else
      echo "ERROR: no se pudo editar el config automáticamente." >&2
      echo "  Instalá yq (brew install yq) o PyYAML (pip3 install pyyaml) y volvé a correr el script." >&2
      cp "${COLIMA_CONFIG}.bak" "$COLIMA_CONFIG"
      exit 1
    fi
  fi
}

# --- 4. Parar Colima ---
echo "==> Parando Colima..."
colima stop || true

edit_config

echo ""
echo "==> Config resultante (docker section):"
grep -A 10 "^docker:" "$COLIMA_CONFIG" || echo "(no se encontró sección docker — verificar manualmente)"
echo ""

# --- 5. Arrancar Colima con nuevo config ---
echo "==> Arrancando Colima..."
colima start

# --- 6. Verificar driver ---
echo "==> Verificando storage driver..."
DRIVER=$(docker info --format '{{.Driver}}' 2>/dev/null || echo "unknown")
echo "    Driver: $DRIVER"

if [[ "$DRIVER" != "overlay2" ]]; then
  echo ""
  echo "ERROR: El driver sigue siendo '$DRIVER', no 'overlay2'." >&2
  echo "  El config puede no haberse aplicado correctamente." >&2
  echo "  Verificá manualmente: cat $COLIMA_CONFIG" >&2
  exit 1
fi

echo "    OK — driver es overlay2"

# --- 7. Reconstruir el stack ---
echo ""
echo "==> Reconstruyendo stack Docker en $REPO_DIR..."
cd "$REPO_DIR"
#docker compose down
#docker compose pull
#docker compose build
docker compose up -d

# --- 8. Esperar y validar ---
echo ""
echo "==> Esperando 30 s para que cAdvisor registre los contenedores..."
sleep 30

echo ""
echo "==> Logs de cAdvisor (últimas 20 líneas, filtrando errores de layer):"
ERRORS=$(docker compose logs --tail 20 cadvisor 2>&1 | grep -i "failed to create existing container" || true)
if [[ -n "$ERRORS" ]]; then
  echo "ADVERTENCIA: siguen apareciendo errores de layerdb:"
  echo "$ERRORS"
else
  echo "    OK — sin errores de 'Failed to create existing container'"
fi

echo ""
echo "==> Métricas de cAdvisor en Graphite:"
curl -s 'http://localhost:8090/metrics/find?query=stats.gauges.cadvisor.*' | python3 -m json.tool

echo ""
echo "==> Verificá que la lista anterior NO muestre solo '-'."
echo "    Si ves exchange-api-1, exchange-nginx-1, etc., el fix funcionó."
echo "    Abrí Grafana (http://localhost:80) y chequeá el panel Resources."
