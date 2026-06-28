# 🔁 Continuidad — hablar con Claude sin perder el hilo (aunque se compacte o abras otro chat)

> **La verdad honesta:** ninguna conversación es infinita — toda sesión termina compactando o se reemplaza por una nueva.
> La solución robusta NO es "un solo chat eterno", sino que **cualquier sesión nueva arranque ya sabiendo todo**.
> Eso se logra con: (1) una **memoria persistente** (`MEMORY.md`, ya existe), (2) un **hook que la auto-carga** al iniciar,
> y (3) una **disciplina de actualizar** la memoria al cerrar. Con esto, compactar o abrir un chat nuevo es indoloro.

## Cómo funciona
- `MEMORY.md` (raíz del repo) es el **cerebro**: resumen, decisiones, estado y pendientes. Vive en git (sobrevive a todo).
- El **hook SessionStart** vuelca `MEMORY.md` al contexto en cada arranque/resume/clear/**compact** → Claude siempre "recuerda".
- Al terminar de trabajar, se actualiza `MEMORY.md` y se commitea. Loop cerrado.

## Activación del hook (requiere tu aprobación una vez)
> Por seguridad, Claude no puede crear solo un hook que se auto-ejecuta. Estos 2 archivos los apruebas tú
> (pégalos en el repo y commitea, o dile a Claude "crea estos archivos" fuera del modo automático / con permiso de Bash).

**Archivo 1 — `.claude/hooks/session-start.sh`** (dale permiso de ejecución: `chmod +x`):
```bash
#!/bin/bash
# SessionStart hook — CONTINUIDAD. Inyecta MEMORY.md al inicio de cada sesión.
set -uo pipefail
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"
MEM="$PROJECT_DIR/MEMORY.md"
if [ -f "$MEM" ]; then
  echo "===== MEMORIA PERSISTENTE (MEMORY.md) — LEER ANTES DE ACTUAR. Empezar por §0. ====="
  cat "$MEM"
  echo "===== FIN MEMORIA ====="
fi
# Dependencias del dashboard (idempotente, silencioso, solo remoto):
if [ "${CLAUDE_CODE_REMOTE:-}" = "true" ] && [ -f "$PROJECT_DIR/package.json" ]; then
  ( cd "$PROJECT_DIR" && npm install --no-audit --no-fund ) >/dev/null 2>&1 || true
fi
exit 0
```

**Archivo 2 — `.claude/settings.json`** (si ya existe, fusionar la clave `hooks`):
```json
{
  "hooks": {
    "SessionStart": [
      { "hooks": [ { "type": "command", "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/session-start.sh" } ] }
    ]
  }
}
```
Una vez en la rama por defecto, **todas** las sesiones futuras (web y local) arrancan con la memoria cargada.

## Plan B sin hook — "frase de arranque" (para web/otra PC/celular)
Pega esto como primer mensaje en cualquier sesión nueva:
> "Lee `MEMORY.md` de este repo (o adjunto el archivo) — es mi memoria maestra de RentingOS/Multitech.
> Empieza por §0 (resumen + pendientes accionables) y continúa desde ahí. No pierdas nada."

## Disciplina de cierre (lo que mantiene esto vivo)
Al terminar cada sesión, pídele a Claude: **"actualiza MEMORY.md con lo de hoy y commitea"**. Idealmente se automatiza
con un hook `Stop`/`SessionEnd` más adelante, pero el commit manual ya basta.

## Notas
- `MEMORY.md` es la **memoria única** (consolida todo lo conversado). No fragmentar en varios archivos de memoria.
- Si crece mucho, mantener el **§0-TL;DR** al día (es lo que más importa) y archivar detalle viejo al final.
- Datos sensibles (claves/tokens/IPs) **no** van en `MEMORY.md` ni en el repo — solo punteros (ver `DEPLOY-SECRETS.txt`/Key Vault).
