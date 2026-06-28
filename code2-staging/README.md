# 📦 code2-staging — entregables para `multitechcloudlatam/rentingos`

> Estos artefactos responden al `HANDOFF-CODE2-BIG-ITEMS-2026-06-27.md`. Se redactaron desde la sesión web
> `cmd-center-multitech` porque **el repo de producto da 403 a esta sesión** (no se puede pushear allá desde aquí).
> **Mover a `multitechcloudlatam/rentingos` (en rama, no a `main`) y ejecutar con acceso + keys.**

## Qué hay aquí
- `reconcile-siigo.mjs` — **Ítem 3**: script READ-ONLY que cruza el Excel maestro de canon vs facturas Siigo por NIT/OC
  y emite reporte de diferencias. No escribe nada, no dispara facturación.
- `AZURE-APPSETTINGS-Y-QA-PLAN.md` — **Ítem 2**: lista exacta de App Settings a setear + plan de QA en vivo (P0-1).
- `main.bicep` — Infra-as-Code del stack (App Service Node22 + Postgres Flexible PITR35/geo + Static Web App +
  App Insights + Key Vault + alertas). Validar con `az bicep build` / `what-if`. Base para reconstrucción/DR.

## Estado de los 3 ítems del handoff
| Ítem | Qué | Estado desde esta sesión |
|---|---|---|
| 1 | **Módulo Proyectos** | **Ya construido en PR #1 `feat/projects-module`** (ground-truth 26-jun). Falta QA en vivo + portar tablas a `schema.prisma` + reemplazar `prompt()` por formularios + merge → requiere el repo. NO ejecutable aquí. |
| 2 | **Azure vivo + keys + QA** | Gestión de Jhovan (KYC/2FA). Preparado aquí: App Settings + plan QA + backup (ver `runbooks/BACKUP-Y-DR-INTEGRAL.md`). |
| 3 | **Reconciliar Siigo↔RentingOS** | Script escrito aquí (`reconcile-siigo.mjs`). Correr con DB + `SIIGO_ACCESS_KEY`. |

## 🚨 REGLA DE SEGURIDAD (del handoff, no negociable)
El **motor de facturación sigue en MODO PRUEBA — NO encenderlo** hasta reconciliar pagos Siigo↔RentingOS
(para no cobrar de más a quien ya pagó). Carolina en incapacidad desde 25-jun; empresa en **Reorganización
Abreviada (Ley 1116)**. Backup de DB = **GRAVE**: el dump más reciente en disco es de hace ~2 meses
(`rentingos_db_2026-04-27.dump`) → tomar dump fresco apenas la sub esté arriba.
