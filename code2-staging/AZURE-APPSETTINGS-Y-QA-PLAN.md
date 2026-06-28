# Ítem 2 — App Settings de `rentingos-api` + Plan de QA en vivo

> Del `HANDOFF-CODE2-BIG-ITEMS-2026-06-27.md`. Lo que Jhovan gestiona (KYC/2FA/cuentas) vs lo que se setea.
> **Recomendado:** que cada valor viva en **Azure Key Vault** y el App Setting lo referencie con `@Microsoft.KeyVault(...)`.

## A. App Settings a setear en `rentingos-api-prod` (nombres; valores en Key Vault / DEPLOY-SECRETS.txt)
| Variable | Para qué | Estado |
|---|---|---|
| `DATABASE_URL` | Postgres Flexible (server nuevo) | ✅ seteada |
| `JWT_SECRET` (+ refresh) | auth | ✅ |
| `ANTHROPIC_API_KEY` · `ANTHROPIC_MODEL=claude-sonnet-4-6` | IA Claude real | ✅ (model corregido del 4-5 descontinuado) |
| `STRIPE_SECRET_KEY` · `STRIPE_PUBLISHABLE_KEY` · `STRIPE_WEBHOOK_SECRET` | pagos | ✅ TEST · ⏳ LIVE tras QA+KYC (Jhovan) |
| `CONNECT_FEE_PCT` | comisión Connect (1%) | ✅ |
| `QBO_CLIENT_ID` · `QBO_CLIENT_SECRET` · `QBO_REDIRECT_URI` · `QBO_ENVIRONMENT` | QuickBooks 2-way | ⏳ app Intuit (Jhovan) |
| `PLAID_CLIENT_ID` · `PLAID_SECRET` · `PLAID_ENV` | ACH | ⏳ prod (Jhovan) |
| `AVALARA_ACCOUNT_ID` · `AVALARA_LICENSE_KEY` · `AVALARA_ENV` | sales tax 51-estados | ⏳ (Jhovan) |
| `BREVO_API_KEY` (+ sender) | correo | ✅ |
| `SIIGO_ACCESS_KEY` · `SIIGO_PARTNER_ID` · `SIIGO_USER` | ERP / reconciliación | ✅ (en App Settings) |
| `CLOUDFLARE_API_TOKEN` | DNS (Zone.DNS:Edit) | ✅ |
| `AI_GLOBAL_DAILY_MAX_CALLS` · `..._TOKENS` | cost-guard IA | ✅ |
| `RELOAD_BUMP` | forzar recycle del App Service | usar al desplegar |
| CORS origins | `*.rentingos.com`, `*.azurestaticapps.net` | ✅ |

## B. Plan de QA en vivo (P0-1) — convertir "REAL en repo" → "verificado"
Correr con **sandbox keys** antes de re-afirmar claims en sitio/Marketplace.
1. **Auth/RBAC:** login por cada uno de los 8 roles; `/api/admin/*` → **403** para no-admin; recurso de otro tenant → **404**; sin token → **401**.
2. **Portal cliente:** `/me/assets` NO expone costo/proveedor/propietario/internalCode/márgenes; IDOR (factura/activo ajenos) → 404/403; escalada bloqueada.
3. **Stripe (sandbox):** checkout → webhook → factura `PAID`; Connect con `application_fee` 1%.
4. **Dunning d1/d3/d7:** dispara correo + WhatsApp (CO y US, bilingüe).
5. **e-sign:** firmar doc → registro de auditoría con SHA-256 + IP + UA + timestamp + consentimiento ESIGN/Ley 527.
6. **QuickBooks (sandbox):** OAuth connect + sync 2-way de una factura de prueba.
7. **Plaid (sandbox):** link + ACH.
8. **Avalara (sandbox):** cálculo de impuesto multi-estado.
9. **IA:** `/api/ai/status` → `configured:true`; cotización y cobranza generan texto coherente.
10. **Dashboard:** MRR ≈ $154–162M (desde `assets.monthlyCanon`); aging desde facturas emitidas (no DRAFT).
11. **i18n EN/ES:** páginas US renderizan en inglés (no `lang="es"` fijo).
12. **Salud/deploy:** `/health` 200; arranque desde `wwwroot/backend_deploy/src/index.js`; recycle vía `RELOAD_BUMP`.

## C. Backup automático de DB (Jhovan: GRAVE — nunca hubo)
- Configurar `pg_dump` cifrado off-Azure (ver `runbooks/BACKUP-Y-DR-INTEGRAL.md` §1, capa B) **apenas la sub esté arriba**.
- **Tomar un dump fresco YA** (el más reciente en disco es `rentingos_db_2026-04-27.dump`, ~2 meses viejo).
- Confirmar que PITR 35d + geo-redundante siguen activos en `rentingosdb-prod`.

## D. Criterio de cierre Ítem 2
App Settings documentadas ✅ · plan QA listo para correr ✅ · backup automático configurado + dump fresco (cuando haya acceso) ⏳.
