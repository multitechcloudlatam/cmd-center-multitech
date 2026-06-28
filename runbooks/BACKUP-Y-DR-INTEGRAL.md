# 🛡️ Respaldo integral + Disaster Recovery — RentingOS

> Principio #1 (Jhovan): **cuidar los datos y restablecer lo más rápido posible ante una falla.**
> Este runbook cubre los 4 frentes: **código · infraestructura · claves · base de datos**, más el monitoreo 24/7.
> Estado actual (26-jun): PITR 35d + geo-redundante ✅ activos; respaldo off-Azure y monitoreo cloud ❌ pendientes (brechas críticas).
>
> ⚠️ No se ejecuta desde la sesión web (sin acceso a Azure/BD; repo da 403). Correr con `az login` como
> `cloud@dinamicatecnologica.com` en un entorno con `az`, `pg_dump`, `node` y acceso. Valores reales NUNCA en el repo
> (van en variables de entorno / Key Vault / `DEPLOY-SECRETS.txt`).

## Objetivos (SLA)
- **RPO** (pérdida máx. de datos) ≈ 5–10 min (PITR continuo).
- **RTO** (tiempo de recuperación) ≈ 15–40 min según escenario.
- **Regla de oro:** nunca depender de un solo proveedor (la sub vieja `f049d131` se deshabilitó con la BD adentro).

---

## 1. 🗄️ Base de datos (lo más crítico)

**Capa A — Nativo Azure (ya activo):** PostgreSQL Flexible `rentingosdb-prod` con PITR 35 días + backup geo-redundante.
Restauración: `az postgres flexible-server restore --restore-time <ISO>` (crea servidor nuevo, no sobrescribe) /
`geo-restore --location centralus` si cae la región.

**Capa B — Respaldo lógico OFF-Azure (PENDIENTE — activar ya).** `pg_dump` semanal cifrado a almacenamiento
independiente (Backblaze B2 / S3 / OneDrive). Script idempotente:

```bash
#!/usr/bin/env bash
# backup-db-offsite.sh — dump lógico cifrado fuera de Azure. Correr semanal (cron/Task Scheduler).
set -euo pipefail
: "${PGHOST:?}"; : "${PGUSER:?}"; : "${PGDATABASE:?}"; : "${PGPASSWORD:?}"   # de Key Vault / env, NO hardcodear
: "${GPG_RECIPIENT:?}"            # clave pública para cifrar (age o gpg)
OUT="rentingos_$(date -u +%Y%m%dT%H%M%SZ).sql.gz.gpg"
DEST_DIR="${DEST_DIR:-/backups/rentingos}"
mkdir -p "$DEST_DIR"
pg_dump --no-owner --no-privileges --format=plain "$PGDATABASE" \
  | gzip -9 \
  | gpg --batch --yes --encrypt --recipient "$GPG_RECIPIENT" \
  > "$DEST_DIR/$OUT"
# Subir a destino independiente de Azure (elegir uno):
#   rclone copy "$DEST_DIR/$OUT" b2:rentingos-backups/          # Backblaze B2
#   aws s3 cp "$DEST_DIR/$OUT" s3://rentingos-backups/          # S3
#   rclone copy "$DEST_DIR/$OUT" onedrive:rentingos-backups/    # OneDrive
# Retención: conservar 8 semanales + 12 mensuales; borrar el resto.
find "$DEST_DIR" -name 'rentingos_*.sql.gz.gpg' -mtime +60 -delete
echo "OK: $OUT"
```
Restaurar: `gpg -d archivo.sql.gz.gpg | gunzip | psql "$DATABASE_URL_NUEVO"`.
**Probar la restauración 1×/mes** (un backup que no se restaura no es un backup).

---

## 2. 💻 Código

Fuente de verdad: GitHub `multitechcloudlatam/rentingos` (+ `multitechcloudlatam/cmd-center-multitech`).
Respaldo = espejo en un 2º remoto + *bundle* frío off-site:

```bash
#!/usr/bin/env bash
# backup-repos.sh — espejo + bundle de los repos. Idempotente.
set -euo pipefail
REPOS=(multitechcloudlatam/rentingos multitechcloudlatam/cmd-center-multitech)
DEST="${DEST:-/backups/repos}"; mkdir -p "$DEST"
for R in "${REPOS[@]}"; do
  NAME="${R##*/}"
  git clone --mirror "https://github.com/$R.git" "$DEST/$NAME.git" 2>/dev/null \
    || git -C "$DEST/$NAME.git" remote update --prune
  git -C "$DEST/$NAME.git" bundle create "$DEST/${NAME}_$(date -u +%Y%m%d).bundle" --all
  # Opcional: push a 2º remoto (Azure DevOps / GitLab) para redundancia de proveedor:
  #   git -C "$DEST/$NAME.git" push --mirror <remoto-secundario>
done
```
Notas: ramas vivas hoy en rentingos → `main` + `feat/projects-module` (PR #1, sin merge). Subir/respaldar el PR antes de tocar nada.

---

## 3. 🏗️ Infraestructura (Infra-as-Code)

Exportar la definición de los recursos para poder reconstruir todo (ver §11/§12 de MEMORY y `PROJECT-STATE-RECONSTRUCTION`):

```bash
#!/usr/bin/env bash
# backup-infra.sh — exporta plantilla ARM + inventario del RG. Correr tras cambios de infra.
set -euo pipefail
SUB="9a941d16-ba44-4943-939e-ca42fd49b5bb"   # sub crédito $5.000
RG="rentingos-rg"; DEST="${DEST:-/backups/infra}"; mkdir -p "$DEST"
az account set --subscription "$SUB"
az group export --name "$RG" > "$DEST/${RG}_arm_$(date -u +%Y%m%d).json"   # plantilla reconstruible
az resource list -g "$RG" -o table > "$DEST/${RG}_inventory_$(date -u +%Y%m%d).txt"
# Config del App Service (nombres de app settings, SIN valores secretos):
az webapp config appsettings list -g "$RG" -n rentingos-api-prod \
  --query "[].name" -o tsv > "$DEST/appsettings_keys_$(date -u +%Y%m%d).txt"
# DNS Cloudflare (zona rentingos.com) export vía API (token en env), guardar el JSON de records.
```
Meta: tener `main.bicep`/ARM en el repo para `az deployment group create` y levantar todo en minutos.

---

## 4. 🔑 Claves / secretos

**Fuente de verdad recomendada: Azure Key Vault** (el App Service referencia los secretos con `@Microsoft.KeyVault(...)`,
no se guardan en texto). Beneficios: rotación, versionado, auditoría, soft-delete + purge protection.

- **Migrar** los valores de `DEPLOY-SECRETS.txt` (DB, JWT, Brevo, Stripe, Anthropic, SWA token, Cloudflare token) a un Key Vault
  `rentingos-kv` con **soft-delete + purge protection** (eso ya es respaldo y recuperación de secretos).
- **Respaldo del Key Vault:** `az keyvault secret backup`/`restore` por secreto → blob cifrado off-Azure.
- **Copia de emergencia:** `DEPLOY-SECRETS.txt` cifrado (gpg/age) en almacenamiento independiente; NUNCA en el repo ni en docs.
- **Rotación:** rotar la Anthropic key vieja `rentingos-prod`; apagar el toggle de acceso elevado de Global Admin en Entra.
- **RBAC:** mantener `cloud@dinamicatecnologica.com` como Owner del RG; dar a `jdlopera@` al menos Reader/Contributor para no quedar sin manos si cloud@ falla.

---

## 5. 📡 Monitoreo 24/7 (independiente del PC)

Hoy el monitor corre como **tarea de Windows en el PC de Jhovan** → si el PC está apagado, no hay monitoreo (punto único de falla).
**Mover a Azure nativo:**
```bash
# Application Insights + alerta de disponibilidad sobre /health (corre en la nube, 24/7)
az monitor app-insights component create -g rentingos-rg -a rentingos-ai -l eastus2
# Availability (URL ping) test cada 5 min a https://api.rentingos.com/health  (configurar test + alert rule)
# Alertas → grupo de acción con correo (jdlopera@/cloud@) y SMS.
az monitor metrics alert create -g rentingos-rg -n api-5xx \
  --scopes <appservice-id> --condition "count requests/failed > 5" --window-size 5m \
  --action <action-group-id>
```
Complementa (no reemplaza) el `monitor-rentingos.ps1` con auto-remediación (`az webapp restart` / `postgres start`).
Métricas a vigilar: `/health` ≠ 200, CPU/memoria App Service, conexiones/almacenamiento Postgres, 5xx, latencia, presupuesto del crédito.

---

## 6. ✅ Checklist de activación (qué falta para cumplir el Principio #1)
- [ ] Activar `backup-db-offsite.sh` semanal cifrado (Capa B) + probar restauración mensual.
- [ ] Migrar secretos a Key Vault (soft-delete + purge protection) + backup off-Azure.
- [ ] Exportar ARM/Bicep del RG y guardarlo en el repo (`infra/`).
- [ ] Espejar repos a 2º remoto + bundle semanal.
- [ ] Montar Application Insights + availability test + alertas (correo/SMS).
- [ ] Dar Reader/Contributor a jdlopera@ en el RG (evitar dependencia de una sola cuenta).
- [ ] Documentar y probar 1 simulacro de DR completo (restore PITR + restore lógico) end-to-end.
