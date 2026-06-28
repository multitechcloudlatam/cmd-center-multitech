# ✅ PLAN-QA-RENTINGOS-US — QA funcional en vivo (P0-1)

> El P0-1 que faltaba escribir. Convierte cada feature "REAL en el repo" en **"verificado en vivo"** ANTES de
> re-afirmar el claim en el sitio/Marketplace. Regla del ground-truth (26-jun): **no re-afirmar IA/QuickBooks/ACH/tax
> como activos hasta (1) app viva + (2) este QA en sandbox PASS + (3) keys productivas + KYC.**
>
> **Pre-requisitos:** app viva (`/health` 200), sandbox keys seteadas (ver `AZURE-APPSETTINGS-Y-QA-PLAN.md`),
> tenants de prueba CO + US, un usuario por rol. Ejecutar en rama/sub de prueba, NO contra datos reales de clientes.
> 🚨 **Q13 (motor de facturación) es SOLO LECTURA/preview — NO emitir ni encender** (Carolina incapacitada; Ley 1116).

## Cómo se usa
Por cada fila: ejecutar los **pasos** → marcar **PASS/FAIL** contra el **criterio** → si PASS, queda habilitado el **claim**.
Un claim NO se publica si su Q está FAIL o sin correr. Llenar la tabla de resultados al final.

## Matriz Q1–Q14

| # | Módulo | Qué se prueba (pasos) | Criterio PASS | Claim que habilita | Gate (keys) |
|---|--------|------------------------|---------------|--------------------|-------------|
| **Q1** | Auth + RBAC (8 roles) | Login por cada rol; pegar `/api/admin/*` con rol no-admin; token vencido | Admin-only → **403** a no-admin; token inválido → **401**; los 8 roles entran | "Control de acceso por rol (RBAC)" | — |
| **Q2** | Multi-tenant | Con token del tenant A pedir recursos del tenant B (cliente/factura/activo por id) | Recurso ajeno → **404** (no fuga); sin token → 401; cada query filtra por `tenantId` | "SaaS multi-tenant aislado" | — |
| **Q3** | Portal cliente (privacidad) | `GET /api/portal/me/assets` y `/me/invoices` con token de cliente; intentar IDOR a id ajeno | NO expone costo/proveedor/propietario/internalCode/márgenes; IDOR → 404/403; escalada bloqueada | "Portal self-service sin fuga de datos internos" | — |
| **Q4** | IA Claude (real) | `/api/ai/status`; generar cotización y mensaje de cobranza vía endpoints de IA | `status.configured=true`, modelo `claude-sonnet-4-6`; textos coherentes y on-topic (no placeholder) | "Cotización y cobranza asistidas por IA (real)" | `ANTHROPIC_API_KEY` ✅ |
| **Q5** | Stripe pagos | Checkout con tarjeta test → webhook → estado factura | Pago test → factura pasa a **PAID** vía webhook; idempotente | "Pagos con tarjeta en línea" | `STRIPE_*` (test) |
| **Q6** | Stripe Connect | Cobro sobre cuenta Express con `application_fee` 1%; ledger `connect_payouts` | Cargo crea fee 1% + asiento en ledger; payout a la cuenta conectada | "Cobros en nombre del cliente (marketplace)" | Stripe Connect |
| **Q7** | Dunning d1/d3/d7 | Forzar factura vencida; correr el job de cobranza (CO y US) | Dispara correo **y** WhatsApp en d1/d3/d7, bilingüe (ES/EN según país) | "Cobranza automática escalonada" | Brevo + WhatsApp |
| **Q8** | Firma electrónica | Firmar un doc de prueba; revisar registro de auditoría | Registro con **SHA-256** del doc + IP + UA + timestamp + consentimiento (ESIGN/UETA/Ley 527) | "Firma electrónica con validez legal y trazabilidad" | — |
| **Q9** | QuickBooks 2-way | OAuth connect (sandbox Intuit); crear factura → ver en QBO; cambio en QBO → ver en app | Sync bidireccional de una factura sin duplicar; tokens refrescan | "Integración nativa con QuickBooks" | `QBO_*` sandbox |
| **Q10** | Plaid ACH | Link de cuenta (sandbox); iniciar débito ACH | Link OK; intento de débito sandbox aceptado/estado correcto | "Pagos ACH desde banco (US)" | `PLAID_*` sandbox |
| **Q11** | Avalara tax | Calcular impuesto para 2-3 estados US (FL, CA, TX) en una factura | Tasa correcta por estado/jurisdicción; se adjunta a la factura | "Sales tax US automatizado (51 estados)" | `AVALARA_*` sandbox |
| **Q12** | Dashboard MRR + aging | Abrir dashboard tras seed conocido | **MRR ≈ $154–162M** (desde `assets.monthlyCanon`, no $8M); aging desde facturas emitidas (no DRAFT) | "Analítica de MRR y cartera en tiempo real" | — |
| **Q13** | Motor facturación / split (⚠️ PREVIEW only) | `billing-preview` + `split-pending` (NO emitir); correr conteo del período | Endpoints **200** (no 500); split `AEE=Costo/60 + CLOUD + AED`, IVA solo AED; conteo junio = **96**; padrón ~66 | "Facturación recurrente por activo (split contable)" | **NO encender** |
| **Q14** | i18n EN/ES | Cargar portal + dashboard con `lang=en` y `lang=es` | Render 100% en el idioma elegido (no `lang="es"` fijo); un solo sistema i18n | "Producto bilingüe EN/ES (habilita US)" | — |

## Tabla de resultados (llenar al correr)
| # | PASS/FAIL | Evidencia (log/screenshot/id) | Notas | Claim re-afirmado |
|---|---|---|---|---|
| Q1 | | | | ☐ |
| Q2 | | | | ☐ |
| … | | | | ☐ |
| Q14 | | | | ☐ |

## Reglas de cierre
- **Claim ↔ Q:** ningún claim de IA/QuickBooks/ACH/tax/pagos se publica si su Q no está **PASS**.
- **Producción real:** repetir Q5–Q11 con **keys productivas + KYC** antes de cobrar dinero real (switch Stripe LIVE).
- **Q13:** se mantiene en modo prueba; "encender" auto-billing es decisión aparte, **post-reconciliación Siigo** (ver `reconcile-siigo.mjs` + §13 de MEMORY).
- Registrar el resultado en memoria (`rentingos-features-ground-truth`) para que las sesiones de marketing sepan qué claim ya es verdad.
