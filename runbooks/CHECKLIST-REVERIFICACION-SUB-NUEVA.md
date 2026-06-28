# ✅ Checklist — Re-verificar en la sub nueva ($5.000) lo hecho en la vieja

> Contexto: el trabajo de facturación del **18-19 jun** (sesión continuation) se hizo sobre la sub vieja `f049d131`.
> El **25-26 jun** el producto se redeployó a la sub del crédito `9a941d16` (`rentingos-rg`). Hay que **confirmar que
> esos cambios viajaron** a la sub nueva (pudieron quedar solo en la BD vieja). Correr con acceso (`cloud@` / API admin).

## A. Datos / facturación (sub nueva)
- [ ] **Fruty Green Packing = 33 equipos** en el Portal del Cliente (no 45). Verificar fix `portal.js:497` (`status:'RENTED'`) desplegado en `rentingos-api-prod`.
- [ ] **Contratos artefacto cerrados:** activos ≈ 191 (no 601). Confirmar que los 410 cierres ACTIVE→TERMINATED están aplicados; si no, re-ejecutar con el snapshot `task2-pre-20260619-103343`.
- [ ] **Conteo junio = 96 facturas** (FV-501-14679→14796 + NC-2-1277) al correr el motor; cuadra con el reporte Siigo de Carolina.
- [ ] **Split por activo** (`assets.aee_monthly/cloud_monthly/aed_monthly`) presente: `CANON = AEE(Costo/60)+CLOUD+AED`, IVA 19% solo AED. Confirmar que P0 `billing-preview`/`split-pending` ya NO dan 500.
- [ ] **Dashboard MRR ≈ $154–162M** (desde `assets.monthlyCanon`), no $8M.
- [ ] **Padrón ~66/67 clientes activos** (lista en MEMORY §8) = la única base activa; lo demás inactivo.

## B. Decisiones aplicadas
- [ ] Canon **Opción A** reflejado en `billing_split.js` + re-deploy.
- [ ] Pendiente de Carolina recibido: export Siigo de pagadas (limpiar aging ~$2.000M) + Costo/CLOUD de `split_pendiente_carolina.csv`.
- [ ] Modelo **OC + prefactura** (Interaseo 3 OC, Eléctricas ≈16) construido antes de encender auto-billing.

## C. Resiliencia (antes de “encender” nada en serio) — ver BACKUP-Y-DR-INTEGRAL.md
- [ ] Respaldo off-Azure (`pg_dump` cifrado) activo + 1 restauración de prueba OK.
- [ ] Application Insights + availability test sobre `/health` + alertas activas.
- [ ] Secretos en Key Vault; jdlopera@ con rol de lectura en el RG.

## D. Producto (§11)
- [ ] i18n EN/ES cableado (bloquea US).
- [ ] Decisión fiscal Carolina sobre emitir el lote de 2.750 facturas DRAFT.
- [ ] PR #1 `feat/projects-module`: QA en vivo, portar tablas a `schema.prisma`, reemplazar `prompt()` por formularios → merge.
- [ ] Re-sync del drift `ai.js` (prod permite SUPERVISOR, backup no).

## E. Corte de tiempo
- [ ] **Día 27** = corte de facturación junio (anticipado). A/B/C de facturación deben quedar antes.
