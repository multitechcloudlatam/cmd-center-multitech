#!/bin/bash
# SessionStart hook — CONTINUIDAD para Claude Code (web + local).
# Inyecta la memoria persistente del proyecto al inicio de CADA sesión
# (startup / resume / clear / compact) para que nunca se pierda el hilo.
set -uo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"
MEM="$PROJECT_DIR/MEMORY.md"

if [ -f "$MEM" ]; then
  echo "=================================================================="
  echo " MEMORIA PERSISTENTE DEL PROYECTO (MEMORY.md) — LEER ANTES DE ACTUAR"
  echo " Fuente única de verdad entre sesiones. Empezar por §0-TL;DR."
  echo " Si se decide/hace algo nuevo: actualizar MEMORY.md y commitear."
  echo "=================================================================="
  cat "$MEM"
  echo ""
  echo "=================== FIN MEMORIA PERSISTENTE ======================="
fi

# Dependencias del dashboard (idempotente, silencioso; solo entorno remoto)
if [ "${CLAUDE_CODE_REMOTE:-}" = "true" ] && [ -f "$PROJECT_DIR/package.json" ]; then
  ( cd "$PROJECT_DIR" && npm install --no-audit --no-fund ) >/dev/null 2>&1 || true
fi

exit 0
