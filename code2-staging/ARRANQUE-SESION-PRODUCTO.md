# ▶️ Arranque — sesión nueva sobre `multitechcloudlatam/rentingos`

> Para cuando abras Claude Code apuntando al repo de producto (PC: `C:\ClaudeBackups\rentingos-deploy\rentingos\`,
> o sesión web scopeada a `multitechcloudlatam/rentingos`). Objetivo: retomar con TODA la memoria y ejecutar el handoff.

## Primer mensaje (pegar tal cual)
> "Estamos en el repo de producto `multitechcloudlatam/rentingos`. Antes de actuar:
> 1) Lee `MEMORY.md` del repo `cmd-center-multitech` (rama `claude/rentingos-code2-w59hcd`) — es mi memoria maestra; empieza por §0-TL;DR y §13.
> 2) Trae los entregables ya escritos de `code2-staging/` (reconcile-siigo.mjs, PLAN-QA-RENTINGOS-US.md, AZURE-APPSETTINGS-Y-QA-PLAN.md, main.bicep) e intégralos en este repo (en rama, no en main).
> Luego ejecuta el HANDOFF-CODE2-BIG-ITEMS en este orden, confirmándome antes de cualquier cosa destructiva o de cobro."

## Orden de ejecución (con `az login` como cloud@dinamicatecnologica.com)
1. **Datos primero (Principio #1):** `pg_dump` FRESCO de `rentingosdb-prod` → cifrar → subir off-Azure; activar el backup semanal (`runbooks/BACKUP-Y-DR-INTEGRAL.md`). Confirmar PITR 35d + geo activos.
2. **Infra versionada:** `az bicep build --file main.bicep`; `az deployment group what-if -g rentingos-rg -f main.bicep` (revisar drift, NO aplicar a ciegas).
3. **Monitoreo 24/7:** App Insights + availability test sobre `/health` + alertas (correo cloud@/jdlopera@).
4. **Proyectos (PR #1 `feat/projects-module`):** correr local → crear tablas → QA multi-tenant → portar tablas a `schema.prisma` → reemplazar `prompt()` por formularios → **PLAN-QA** → merge.
5. **QA en vivo (sandbox):** correr `PLAN-QA-RENTINGOS-US.md` Q1–Q14; registrar PASS/FAIL; re-afirmar solo los claims PASS.
6. **Reconciliación Siigo:** `node reconcile-siigo.mjs --xlsx "RENTING - MAYO 2026.xlsx" --period 2026-06` con `SIIGO_ACCESS_KEY`; revisar diferencias.
7. **Facturación:** SOLO tras reconciliación limpia + OK de Jhovan/Carolina. Motor sigue en MODO PRUEBA hasta entonces (Ley 1116).

## Reglas duras
- Cuidar datos > velocidad. Nada destructivo sin backup + confirmación.
- No encender auto-billing hasta reconciliar Siigo. Carolina incapacitada desde 25-jun.
- Al cerrar: actualizar `MEMORY.md` (y `_CLAUDE-SYNC/SYNC-DIARIO.md` en OneDrive) + commitear.
