# MEMORY — RentingOS / Multitech (mirror versionado en git)

> **Qué es esto:** memoria de coordinación entre sesiones de Claude, **versionada en este repo**
> porque las sesiones de Claude Code on the web corren en contenedores efímeros sin acceso de
> escritura a OneDrive. Fuente viva canónica = `_CLAUDE-SYNC/SYNC-DIARIO.md` en OneDrive/SharePoint
> (solo lectura desde la web). Este archivo es el espejo que SÍ puedo actualizar y pushear.
>
> **Regla de actualización:** cuando hagamos algo nuevo en una sesión web, se añade una entrada
> fechada abajo y se commitea/pushea. Al volver al PC, copiar lo relevante al SYNC-DIARIO de OneDrive.
>
> **Última ingesta:** 2026-06-26 — leído SYNC-DIARIO + equipo de sesiones + handoffs deploy/Azure (§10)
> + `rentingos-features-ground-truth.md` + `ARQUITECTURA-Y-DISASTER-RECOVERY-2026-06-26.md` (§11, §12)
> + `PENDIENTES-AL-CAMBIO-DE-PC-2026-06-18.md` (transcript sesión continuation → §8 ampliado). (Ingesta previa: 2026-06-14.)
>
> **Azure:** la identidad con RBAC sobre `rentingos-rg` es **`cloud@dinamicatecnologica.com`** (Owner);
> `jdlopera@` NO tiene roles ahí (entra a Azure pero ve 0 recursos). Para `az` usar cloud@ (device-code si Windows
> cachea jdlopera@). DB directa bloqueada por firewall salvo IP autorizada; backend API público y sano (`/health` ok).
>
> 🥇 **PRINCIPIO OPERATIVO #1 (Jhovan, 2026-06-26): CUIDAR LOS DATOS + RESTABLECER LO MÁS RÁPIDO POSIBLE
> ANTE CUALQUIER FALLA.** Por eso es VITAL el **monitoreo de toda la infraestructura y la app**. Antes de
> cualquier cambio, no comprometer la integridad/disponibilidad de los datos. Detalle y estado en §12.

---

## ⚡ §0-TL;DR — Resumen de temas + Pendientes accionables (LEER PRIMERO)

> Actualizado 2026-06-26. Esta es la **memoria única** del proyecto entre sesiones de Claude. Índice de secciones:
> §0 identidad · §1 RentingOS (snapshot viejo, ver §11) · §2 cifras honestas · §3 Microsoft/Azure · §4 marketing ·
> §5 acciones manuales · §6 reglas · §8 facturación/Carolina · §9 pista internacional · §10 equipo de sesiones ·
> §11 producto REAL 26-jun · §12 monitoreo/DR (prioridad #1) · §7 bitácora.

**Temas vivos:** (1) RentingOS producto en Azure (app viva en sub $5.000); (2) facturación junio / reglas de Carolina;
(3) monitoreo + respaldo + DR (prioridad #1 de Jhovan); (4) Marketplace Microsoft (LIVE); (5) marketing 3 marcas;
(6) continuidad de memoria entre sesiones.

**🔴 Pendientes accionables (orden sugerido):**
1. **Acceso real para ejecutar:** abrir sesión con el repo `multitechcloudlatam/rentingos` y/o `az login` como
   **`cloud@dinamicatecnologica.com`** (jdlopera@ no tiene RBAC). Desde la web actual el repo da 403.
2. **Respaldo OBLIGATORIO off-Azure** (brecha crítica): activar `pg_dump` semanal cifrado fuera de Azure. Plan+script:
   `runbooks/BACKUP-Y-DR-INTEGRAL.md`. (Lección jun: la sub vieja se deshabilitó con la BD adentro.)
3. **Monitoreo 24/7 independiente del PC:** mover el monitor (hoy tarea de Windows en el PC) a Azure nativo
   (Application Insights + availability test sobre `/health` + alertas). Mismo runbook.
4. **Re-verificar en la sub nueva** lo que se hizo el 19-jun en la vieja (Fruty Green→33, cierre de 410 contratos,
   conteo 96 facturas). Checklist: `runbooks/CHECKLIST-REVERIFICACION-SUB-NUEVA.md`.
5. **Facturación junio (corte día 27):** decisión canon = **Opción A** (confirmada) → ajustar `billing_split.js`;
   construir modelo **OC + prefactura** (Interaseo/Eléctricas); pedir a Carolina export Siigo de pagadas + Costo/CLOUD
   faltantes; luego **encender auto-billing**.
6. **Bugs producto (§11):** i18n EN/ES (bloquea US), emitir lote 2.750 facturas DRAFT (decisión fiscal Carolina),
   re-sync drift `ai.js`. Terminar/mergear PR #1 módulo **Proyectos**.
7. **Marketing:** Chrome visible → programar carruseles; logo LinkedIn; créditos Kling; cuenta Google Ads US (bono vence 12-jul).

**🔁 CONTINUIDAD (cómo no perder el hilo nunca):** esta `MEMORY.md` es el cerebro persistente. El mecanismo está en
`runbooks/CONTINUIDAD-claude.md` (hook SessionStart que la auto-carga + frase de arranque). Al cerrar cualquier sesión:
actualizar esta memoria y commitear. Al abrir una nueva (o tras compactar): se relee y se retoma sin perder nada.

---

## 0. Identidad y alcance de esta sesión

- **Sesión:** "RentingOS Code2" (rama `claude/rentingos-code2-w59hcd`).
- **Repo en scope:** `multitechcloudlatam/cmd-center-multitech` — **solo el dashboard ejecutivo**
  (Express `server.js` + `public/index.html`, sin build, vanilla, mobile-first). Ver `CLAUDE.md`.
- ⚠️ **El código del PRODUCTO RentingOS NO está en este repo** (siigo.js, auto_billing, frontend
  i18n, módulos, Prisma) — vive en otro repo/Azure no accesible desde esta sesión. Decisión Jhovan
  2026-06-14: *nada en el repo de producto por ahora desde la web.*
- **Conectores disponibles aquí:** M365/SharePoint (lectura), Google Drive (lectura+escritura),
  GitHub (scope = cmd-center-multitech), Supabase, Stripe, Microsoft Learn, dominios, Outlook/Teams (lectura).

---

## 1. Estado RentingOS (producto) — al 2026-06-13

**Desplegado y verificado:**
- `cost_guard.js`: tope global diario + cap mensual por tenant por plan (fallback suave, nunca rompe).
- `demo_seed.js` por **vertical/businessType** (8 verticales EN/ES) al registrar tenant; idempotente.
- **Connect v1**: Stripe Express + cargo con comisión 1% (`CONNECT_FEE_PCT`) + ledger `connect_payouts`.
- `/api/reports` montado. Cliente Prisma regenerado → `currency` operativa (truco: generar local + subir JS;
  el `prisma generate` en server falla al renombrar engine por CIFS).
- `usdemo@rentingos.com` (tenant `b40718d8-b5cd-41c7-8668-a052b61ce5da`, EN/USD) poblado:
  4 clientes / 2 contratos / 3 facturas / MRR $1,089.
- Portal cliente **EN/ES** desplegado (merge `feat/portal-i18n`, CO-safe).
- Inmobiliaria multi-país: cobranza escalonada d1/d3/d7 (correo+WhatsApp bilingüe), contrato US ESIGN/UETA,
  checklist FCRA, endpoint `screening/providers`.

**Motor de facturación (Carolina):** recalibrado con reglas reales —
`AEE = Costo/60`, `CLOUD` = columna del Excel por cliente (IPC-dependiente), `AED` = resto,
**IVA solo sobre AED**; layout Siigo N AED + consolidadas; prefactura taggeada; facturación por OC
(flujo prefactura+revisión, sin tabla central). DRY-RUN junio OK: 45 pendientes, $73.9M. Canon app ≈ $188.1M
(diferencia de $31.6M vs real explicada 100%).

**Pendientes técnicos Code2 (en repo de producto — NO accionables desde esta sesión):**
- 🔴 **CORRECCIÓN DE CAROLINA (Teams, 2026-06-12) — bloquea encender auto-billing.** Ver §8.
  El 12-jun se cargó el split de **768 equipos** (costo/cloud/renting de RENTING-MAYO) y la corrida
  de junio dio **45 facturas ~$84M c/IVA**. Carolina respondió que **está MAL**:
  (a) el motor toma **437 contratos** pero **en renting solo están activos los ~67 clientes de su lista**
  (whitelist en §8); (b) **junio NO son 45 facturas, son 96**. → Hay que **filtrar por su whitelist de
  clientes activos** y **reconciliar hasta llegar a 96 facturas** antes de encender. (Trabajo en repo de producto.)
- i18n EN frontend A1 (dashboard) + A2 (moneda por tenant en frontend, quitar COP hardcodeado).
- Impuesto por país A3 (quitar IVA hardcodeado). Poblar más demo A4.
- Módulo **CASOS legal** (correo→caso→doc→facturación; reutiliza Track 2 Graph).
- Módulo **FLOTA** (app conductor GPS + mantenimiento por km).
- Limpieza: `reports.js`/`import.js` dead routes (ya montado reports); consolidar `absolute.js` vs `absolute_env.js`.
- Backlog paridad: Tap to Pay, booking online, reseñas Google, dispatch, Twilio SMS a prod (🔑 Jhovan), 1099 US.
- 🧹 ~12 tenants de prueba `qa+*@rentingos-test.com` en prod (aislados; Jhovan decide si borra).

---

## 2. Cifras de marca HONESTAS (regla dura — usar SIEMPRE)

**18 años · miles de pymes · USD $15M+ · 988 activos / 64 clientes · 4 países (CO/MX/CR/PA).**
NO usar: 17 años, 1.500+, 2.418, $858M, "3 beta US customers", "99.97% uptime", "98% retención".
Posicionamiento v3: plataforma de **contratos recurrentes + activos**, 6 verticales (inmobiliarias,
copropiedades, maquinaria amarilla, flotas GPS, bufetes legales, asset mgmt). Nunca más "solo computadores".

---

## 3. Microsoft ISV / Azure

- **Marketplace Publication Session con Carlos Rentería: MIÉ 17-jun 1:00–2:00pm (Teams).** Objetivos:
  SaaS transactable, requisitos de fulfillment. Prep en `RentingOS/Microsoft-ISV/PREP-Marketplace-Publication-Session-2026-06-17.md`.
- WAF 61/61 (overall ~28/100 honesto). Azure oficial calculadora = **$101.08/mes**; gasto real $37–42/mes.
  Presupuesto "presupuesto-mensual-azure" $90/mes, alerta 80% → jdlopera@.
- EIN 35-2726030 / Florida / LLC 2021.

---

## 4. Marketing / contenido (estado)

- LinkedIn **Company Page live**: linkedin.com/company/rentingos (id 129064080). Logo punteado oficial
  pendiente de subir (picker no abre vía Win32 → 1 clic manual Jhovan).
- Publicado orgánico reciente: reel bodeguero, carrusel inmobiliarias, reel abogados (@multitechcloud);
  carrusel flota programado. 8 carruseles nuevos + kit US listos en `ENTREGABLES/`.
- Metricool: solo `@multitechcloud` conectado (publish OK). Kling 3.0 = generador oficial de video (free 66 créditos/día).
- **Bloqueo navegador conocido:** ventana Chrome del grupo MCP queda oculta → `document.hidden=true` →
  SPAs se congelan. **Fix:** mover Chrome a 2º monitor visible. (memoria `tecnica_render_carruseles`).

---

## 5. Pendientes que requieren acción manual de Jhovan (🔑)

1. Dejar Chrome al frente/visible → programar carruseles copropiedades (mié 18) y abogados (jue 19) en Metricool.
2. Subir logo punteado a LinkedIn.
3. Créditos Kling para videos "La Obra".
4. Confirmar/crear cuenta **Google Ads US** RentingOS (bono $350 vence **12-jul**; no mezclar con la CO de Multitech).
5. Re-deploy de sitios editados: rentingos-us + homepage Multitech a GoDaddy cPanel; coming-soon/landing a Cloudflare Pages.
6. Validación de Carolina del split → encender auto-billing.

---

## 6. Reglas de operación

- **Dinámica Tecnológica NUNCA aparece en el sitio público.**
- Contacto: contacto@multi-tech.com.co · +57 300 746 7691.
- Estrategia/marketing NO toca backend/app/DNS; Code2 ejecuta producto. Todo ramificado por `tenant.country` — **CO no cambia**.
- Claude no crea cuentas (política) ni hace hard-delete: prepara y Jhovan da el clic.

---

## 8. Facturación / Carolina — indicaciones del 12-jun + ejecución (sesión continuation)

> Fuente ampliada: `automatizacion/renting/PENDIENTES-AL-CAMBIO-DE-PC-2026-06-18.md` (act. 19-jun) +
> `REGLAS-FACTURACION-CAROLINA-2026-06-09.md`. Chat 1:1 Jhovan ↔ **Carolina Carmona Arias** (ops/facturación).

**🟢 Ya hecho/desplegado (no rehacer):** split recalibrado (commit `77c46df`):
**`CANON = AEE(Costo/60) + CLOUD(columna Excel) + AED`; IVA 19% SOLO sobre AED** (el Cloud va DENTRO del canon).
768 equipos cargados con split a `assets.aee_monthly/cloud_monthly/aed_monthly` (backup reversible). Pantalla
"Facturación automática" (3 pasos) desplegada. GRUPO CTL resuelto.

**✅ Carolina respondió el 12-jun (tarde, hora CO) — 3 indicaciones** (la búsqueda por palabras NO las captaba;
hay que leer el hilo directo):
1. **Los "437 contratos" no son reales** → padrón AUTORITATIVO de ~66/67 clientes activos (whitelist abajo).
   Inactivar todo lo que no esté en él (artefactos de la importación Siigo).
2. **Junio = 96 facturas, no 45** (FV-501-14679→14796 + NC-2-1277, reporte Siigo "Ventas por centro de costo
   RENTING", 19-jun). El motor sub-contaba por falta de split por **OC** (Interaseo 3 OC, Eléctricas ≈16) + multi-contrato.
3. **FRUTY GREEN PACKING: 45 equipos → deben ser 33** (retiros del mes; adjuntó `FRUTY GREEN PACKING.xlsx`).

**✅ Ejecutado el 19-jun (sesión continuation, sobre la sub vieja f049d131):**
- **Tarea 1 — Fruty Green 45→33:** el "45" era el **Portal del Cliente**; `GET /api/portal/me/assets`
  (`portal.js:497`) listaba todos los equipos sin filtrar → fix: `status:'RENTED'` (33). Desplegado vía Kudu VFS
  + recycle. Backup `C:\ClaudeBackups\snapshots\portal.js.original-20260619-152914`. Sin tocar plata.
- **Tarea 2 — limpieza de contratos artefacto:** cerrados **410 contratos** ACTIVE→TERMINATED (valor $0 / 0 equipos /
  fuera de padrón). **Activos 601 → 191.** Reversible (`...\task2-pre-20260619-103343\`). NO tocados: 73 del padrón
  sin equipos linkeados, 48 con valor>0, 23 demo USA.

**🔴 DECISIÓN JHOVAN: Canon = OPCIÓN A** (confirmada) → canon = suma del Excel por equipo (AEE+CLOUD+AED),
reconcilia automático con los 768 splits; ajustar `billing_split.js` + re-deploy. (B = canon del contrato, descartada.)
**Autorizado:** usar login admin del API de RentingOS para los cambios de Carolina (con confirmación antes de destructivo).

**⏱️ Corte de facturación: día 27** (junio anticipado). Encender auto-billing requiere: decisión de canon (✅ A) +
datos de Carolina ANTES del 27.

**🟡 Pendiente de Carolina:** export Siigo de facturas REALMENTE pagadas (limpiar aging inflado ~$2.000M antes del
dunning); Costo/CLOUD de los equipos en `split_pendiente_carolina.csv` que no casaron.
**🟠 Por construir:** modelo **OC** (facturar por orden de compra; OC vencida → NO facturar) + flujo **prefactura**
(Interaseo/Eléctricas: prefactura por correo → 1-2 días para revisar OC → recién a DIAN).
**🔵 Operativos:** nombre real de Andrey (Frutygreen); barrido duplicados por NIT (patrón `DUP-`); botón "servicio
público" en dinamicatecnologica.com; DataCrédito/Experian + encender facturación.

**Whitelist de clientes activos en renting (Carolina, 2026-06-12) — ~67:**
SIMPLE (Sist. Integrado Múltiple de Pagos) · FESATECH · OPTIMA INGENIERIA · COLEGIO JESUS MARIA ·
NOVA SEGURIDAD PRIVADA · REGGIO EMILIA (Grupo Empr. Innovación Educativa) · FENIXPUNTONET · CREATIVE AGENCY ·
FRUTY GREEN PACKING · FRESHCOLOMBIA INTERNATIONAL · INVERSIONES INNOVO · ELECTRICAS DE MEDELLIN ·
AHORA (Servicios Temporales) · TRES TRIGOS · AZIMUT ENERGIA · GENESIS INVESTMENTS C.S.C · THE INSIDER VOX ·
HINO MOTORS MANUFACTURING COLOMBIA · PROMOSUMMA · INTERASEO · AUTOFAX · OSSA CONSULTORIA · FRUTY GREEN SAS ·
ATESA DE OCCIDENTE · VIVIR EN EL POBLADO · QUALITY RESULTS · CDA AJUSTEV · 24 H SERVICES · RBO DIGITAL ·
DUE-LEGAL · KAIROS LOGISTICS · INTERASEO DEL ARCHIPIELAGO · G.I.R GESTION INTEGRAL DEL RIESGO ·
EXTRUSIONES · RAIN COLOR · GOMEZ PAZOS & ASOCIADOS · METAWAY GROUP · OBRAZ ENTERPRISES ·
ANTICIPACION Y CONTROL DE RIESGOS EMPRESARIALES · VERDE 2 GO · GALVACEROS · EMPRESA DE DESECHOS ESPECIALES (AEE) ·
FRUTY GREEN EL SILENCIO · TECHNOLOGY SOLUTIONS FACTORY · ENERGY360 · OPERADORES DE SERVICIOS DE LA SIERRA ·
ARENA SPORT CLUB · ALINA VELEZ COMUNICACIONES · PROSALCO · GRUPO CTL · SANTO FRIO · PROMOTORA DE COMERCIO SOCIAL ·
MADERAS & PROYECTOS JCF · MAUTICA ENGLISH (Natalia Vélez) · DONAU SEGUROS · FACILCREDITOS · UNICO INTERIOR ·
GRUPO 10Z · GLOBAL DYNAMICS GG · ALMEL DISTRIBUTOR GROUP · MANUFACTURA · IMPRESOS · GTD COLOMBIA · GT CONSULTING ·
COMPAÑIA DE INVERSIONES Y LIBRANZAS · RECAUDOS DE VALORES.

> ✅ **Respondido a Carolina** (la sesión continuation LOCAL escribió por la pestaña de Teams en Chrome, 19-jun
> 21:01: Fruty Green→33, padrón oficial, cuadrar 96 facturas). El conector de Teams de esta sesión web es de
> **solo lectura** (no envía) — para escribirle se usa el Chrome del PC. Carolina sin respuesta nueva desde el 12-jun.

---

## 9. Pista "Multitech International Business Route" (sesión 2026-06-13) — espejo

> Fuente única en OneDrive: `_CLAUDE-SYNC/ENTREGABLES/2026-06-13_ESTADO-MAESTRO-Internacionalizacion-y-Marketing.md`.
> Backup/migración al PC nuevo: carpetas `MIGRACION-CLAUDE-2026-06-15`, `MIGRACION-HISTORIAL-COMPLETO-2026-06-15`,
> `MIGRACION-CLAUDE-CONFIG-2026-06-15` (config `.claude` + memoria completa). Migración COMPLETA.
>
> Reanudar la sesión local: `claude --continue` (o `--resume`) en la carpeta del proyecto; si arranca limpia,
> adjuntar ese ESTADO-MAESTRO + recargar memorias permanentes: `stack_video_kling`, `tecnica_publicar_metricool`,
> `tecnica_render_carruseles`, `cifras_honestas_materiales_internacionales`.

**Hecho:** higiene cifras honestas (16+ archivos externos); 12 carruseles (5 EN-US + 7 ES, watermark);
Kit redes RentingOS US (perfiles + 10 tweets + captions IG + posts LinkedIn EN); 4 posts SEO en blog
(bilingual-invoices-florida-tax, jobber-vs-housecall, property-management-small-landlords, fleet-maintenance-mileage);
prep sesión Microsoft Marketplace; video **"LA OBRA"** completo (15s 1080×1920 c/audio).

**⏳ En vuelo / pendiente inmediato:**
1. **Kling** "El viernes de Laura" (RentingOS inmobiliaria): clip 1 escrito en el editor, falta disparar Generate
   (se desconectó la extensión); prompts clips 2-3 listos en el doc. Sigue M2 Multitech, D1 Dinámica, etc.
2. **Publicar** LA OBRA (reel) + carrusel copropiedades en Metricool (@multitechcloud) vía clipboard+CDP.
3. **Cuenta Google Ads US** (decisión Jhovan) → lanzar $50 (no mezclar con CO 466-731-6205; bono $350 vence 12-jul).
4. **Re-deploy**: rentingos-us + homepage Multitech → GoDaddy cPanel; rentingos.com blog/coming-soon → Cloudflare Pages.
5. **LinkedIn**: subir logo punteado `rentingos-logo-PUNTOS-300.png`.
6. Reddit u/rentingos (+u/Multitech); Track 2 captura Graph/Outlook (dormido, flip cuando Carolina dé buzón);
   botón servicio público en dinamicatecnologica.com.

**Microsoft ISV:** sesión Marketplace **mié 17-jun 1pm**; specs en `RentingOS/Microsoft-ISV/`
(`PREP-Marketplace-Publication-Session-2026-06-17.md`, `SPEC-CODE2-AppSource-SaaS-Transactable.md`).
Quick-win: publicar AppSource como "Contact me" ya.

**Técnicas dominadas (detalle en memorias):** Kling (editor contenteditable → teclear con CDP, no JS .value;
descargar URL real output.mp4 del CDN vía performance.getEntriesByType + Invoke-WebRequest; no screenshots en kling.ai);
Metricool (clipboard PowerShell STA + Ctrl+V CDP); render carruseles (headless Chrome HTML→PNG 1080×1350);
clic confiable SPAs (computer left_click CDP isTrusted, no .click() JS); ⚠️ Chrome oculto congela SPAs → 2º monitor visible.

---

## 10. Equipo de sesiones + sesión "rentingOS continuation" (deploy/infra/Azure) — 2026-06-25/26

**Modelo de equipo (decidido 25-jun):** Jhovan trabaja con VARIAS sesiones de Claude Code en paralelo, por carril.
Coordinan por **archivos HANDOFF-*.md** (mismo cwd `Documentos`) + **memoria** (no por mensaje directo;
`send_message` entre sesiones está bloqueado en modo no supervisado). Memoria fuente: `equipo-sesiones-claude.md`.
- **"Estrategia/Marketing"** (id a0ed7061): marca, redes, Ads, contenido/videos, Marketplace (listing/diagnóstico).
- **"rentingOS continuation"** (id `local_a11545ad-…`): **deploy/infra/Azure**.
- Otras: "Publicador autónomo redes", "Followup ANDI leads t2", "Dinámica website redesign".

**Qué hace / estado de "rentingOS continuation" (carril deploy/infra/Azure):**
- 🔴 **RentingOS está CAÍDO (403).** La sub Azure `f049d131` se deshabilitó al agotarse el crédito de $100.
- 💰 **Nuevo crédito USD $5.000 Azure**, válido **hasta 26-jun-2027** (cuenta jdlopera@). Uso acordado:
  **infra/producto, NO ads** → mantener RentingOS vivo + rápido + IA real (Azure OpenAI) + ambientes demo
  para prospectos del Marketplace (ya LIVE) y de los Ads. Incidente/caso soporte: `rentingos-azure-access.md`.
- ⛔ **Bloqueo de acceso (26-jun):** ni `cloud@` ni `jdlopera@` tienen rol RBAC sobre "Suscripción de Azure 1"
  (`9a941d16-…`) → no se puede desplegar hasta que **Jhovan asigne Owner** (Claude no asigna roles).
  Pasos: Entra → Identidad → Propiedades → "Administración de acceso para recursos Azure: Sí" → IAM de la sub
  → Agregar asignación de rol Owner a jdlopera@ y cloud@ → (revertir toggle).
- 🗄️ **Dato crítico:** la BD de producción está encerrada en la sub deshabilitada f049d131. Camino A (preferido):
  reactivar f049d131 (caso Azure **2606240040005180**) → `pg_dump` → restaurar (cero pérdida). Camino B: deploy
  fresco + cargar `RENTING - MAYO 2026.xlsx` (inventario maestro de Carolina, respaldado) — se pierde historial.
- 🚀 **Procedimiento de deploy** (`RentingOS/PROJECT-STATE-RECONSTRUCTION-2026-06-25.md`): nuevo `rentingos-rg`
  en sub 9a941d16 · Azure Postgres Flexible + restaurar dump + **PITR día 1** · App Service Node 22 desde GitHub
  **`multitechcloudlatam/rentingos`** (`backend_deploy/src/index.js`) · Static Web App (frontend) · env vars
  (DATABASE_URL, JWT_SECRET, BREVO/SIIGO/STRIPE/QBO/PLAID/AVALARA) · DNS app/api.rentingos.com · activar
  `backup-db-rentingos.ps1` (Task Scheduler, `RUNBOOK-BACKUP-DB-AUTOMATICO.md`).
- 📄 También en su cola: **deploy de 3 páginas legales** en www.rentingos.com + **reenvío/confirmación del Marketplace**.

**Otros handoffs vivos del 25-26 jun (en `Documentos/RentingOS/`):**
`HANDOFF-MARKETPLACE-DEPLOY-2026-06-25.md`, `HANDOFF-MARKETPLACE-CONFIRMAR-2026-06-25.md`,
`HANDOFF-rentingOS-continuation-SIIGO-RECONCILIACION-2026-06-26.md` (reconciliación Siigo — liga con §8 Carolina),
`HANDOFF-AZURE-CREDITO-5000-2026-06-26.md`, `HANDOFF-DEPLOY-SUB-5000-2026-06-26.md`,
`HANDOFF-MARKETING-LANZAMIENTO-MARKETPLACE-2026-06-26.md`. Estado real de features:
`rentingos-features-ground-truth.md` (06-26, corrige auditoría parcial del 25-jun). Marketplace ya **LIVE**;
plan de amplificación: `ENTREGABLES/LANZAMIENTO-MARKETPLACE-2026-06-26/PLAN-AMPLIFICACION.md`.

> 🔓 **El código de producto SÍ está en GitHub:** `multitechcloudlatam/rentingos`. Si se agrega a una sesión,
> desde ahí se puede ejecutar el fix de auto-billing de Carolina (§8) y los deploys, sin depender del PC.

**Pendientes que solo destraba Jhovan (carril Azure):** (1) asignar RBAC Owner en sub 9a941d16; (2) decidir
reactivar f049d131 (caso 2606240040005180) vs deploy fresco; (3) confirmar términos del crédito $5.000.

---

## 11. RentingOS PRODUCTO — estado REAL al 2026-06-26 (sesión Code2 / ground-truth)

> Fuentes: `rentingos-features-ground-truth.md` + `RentingOS/ARQUITECTURA-Y-DISASTER-RECOVERY-2026-06-26.md`.
> **SUPERSEDE el snapshot de §1 (era del 14-jun).** Repo de producto: **GitHub `multitechcloudlatam/rentingos@main`**
> (acceso git DENEGADO 403 desde esta sesión web — ver bitácora). Doc fuente marcado CONFIDENCIAL (mapa de ataque):
> aquí NO van credenciales/tokens/IPs; los valores viven en `C:\ClaudeBackups\rentingos-deploy\DEPLOY-SECRETS.txt`.

**✅ LA APP YA ESTÁ ARRIBA de nuevo** — redeployada en la sub del crédito $5.000 (`9a941d16-…`, RG `rentingos-rg`):
- Frontend: Static Web App `rentingos-frontend` (Free, eastus2) → **app.rentingos.com** (~48 páginas, PWA vanilla).
- Backend: App Service `rentingos-api-prod` (B1 Linux Node22, centralus) → **api.rentingos.com** (`/health`); ~30 routers Express+Prisma.
- BD: PostgreSQL Flexible `rentingosdb-prod` (B1ms v16, eastus2), **PITR 35 días + geo-redundante**.
- DNS Cloudflare (zona rentingos.com). Costo ~US$40-60/mes (cubierto por crédito, vence 26-jun-2027).
- **Microsoft Marketplace: LIVE** (oferta `rentingos-saas`).

**Encendido y verificado (26-jun):**
- **IA Claude REAL viva** (`claude-sonnet-4-6`, key "RentingOS Production 26jun26"); `/api/ai/status` → `configured:true`. **NO es demo** (la "demo sin LLM" era solo el `demo.html` de marketing).
- **Stripe TEST completo** (cuenta Dynamic Tech LLC `acct_1TbXRBA…`) + webhook al backend. Switch a LIVE = copiar sk_live/pk_live tras QA de pagos. Brevo + Siigo activos.
- **Datos cargados:** 2.432 clientes · 1.124 activos (RENTED, ligados a contratos) · 2.750 facturas · 206 contratos. **Canon real $153.999.381/mes**. Activos del Excel maestro `RENTING - MAYO 2026.xlsx` (65 clientes; script idempotente `load_assets.cjs`).

**Features que SÍ existen en el repo (gated por keys, código listo):** IA Claude (cost-guard), QuickBooks 2-way (OAuth), Plaid ACH, Avalara tax (51 estados), Stripe Connect completo, CRM, firma electrónica con audit trail real (SHA-256 + IP + UA + timestamp + consent ESIGN/Ley 527), dashboard MRR + AR aging.
- **Único gap real era PROYECTOS** → **YA CONSTRUIDO** en PR borrador #1 (`feat/projects-module`): backend `routes/projects.js` (projects/milestones/tasks/time_entries/project_assets, multi-tenant, CRUD + facturación + `/ai/plan`) + `proyectos.html`. SIN merge, SIN probar en vivo → lo termina/QA la sesión **"rentingOS continuation"**.

**🔒 QA de seguridad en prod (5 agentes por rol) — APROBADO:** RBAC `/api/admin/*` → 403 a roles no-admin; aislamiento por tenant (401 sin token, 404 a ajenos); **portal cliente NO filtra campos internos** (costo/proveedor/propietario/márgenes/internalCode ocultos); IDOR y escalada bloqueados. 8 roles, JWT 12h+refresh.

**🐛 Roadmap de bugs (estado vivo del doc):**
- [P0] split (aee/cloud/aed_monthly) → `billing-preview`/`split-pending` 500 → **✅ HECHO (BD)**.
- [P1] Dashboard MRR ($8M falso vs $154M real; canon vive en `assets.monthlyCanon`) → **✅ HECHO ($162M desde activos)**.
- [P2] token de cliente en endpoint interno → 403 (no 500) → ✅ código listo, **redeploy en curso**.
- [P1] **i18n EN/ES** cableado (hoy español hardcodeado; 2 sistemas paralelos a unificar) → 🔄 en curso (bloquea US).
- [P1] **Emitir lote de 2.750 facturas DRAFT** (dueDate null → aging $0) → ⏸️ espera **decisión fiscal de Carolina** (la herramienta ya funciona) — liga con §8.
- Drift: `ai.js` de prod permite SUPERVISOR pero el backup no → re-sincronizar repo/backup. Seed: ligar activos↔contratos.

**Regla de claims (Marketplace + sitio):** reafirmar IA/QuickBooks/ACH/tax como activos SOLO tras (1) app viva, (2) QA en vivo, (3) keys productivas + KYC. Keys productivas pendientes: Stripe LIVE, QuickBooks (Intuit), Plaid prod, Avalara, Wompi.

---

## 12. 🥇 Monitoreo + Protección de datos + Disaster Recovery (PRIORIDAD #1)

> Doc maestro: `automatizacion/renting/RUNBOOK-MONITOREO-Y-DR-RENTINGOS.md` + `ARQUITECTURA-Y-DISASTER-RECOVERY-2026-06-26.md`.
> **Objetivos:** RPO ≈ 5–10 min (PITR continuo) · RTO ≈ 15–40 min según escenario.

**Red de seguridad ACTIVA:**
- **Monitor cada 5 min** (`monitor-rentingos.ps1`, tarea Windows `RentingOS-Monitor`) con **auto-remediación**:
  /health ≠ 200 → `az webapp restart`; Postgres state ≠ Ready → `az postgres flexible-server start`. Logs en `C:\ClaudeBackups\rentingos-monitor\`.
- **Backup Azure:** PITR **35 días** + **geo-redundante** (activo desde creación).
- DR por escenario: datos corruptos → `az postgres flexible-server restore --restore-time` (servidor nuevo, no sobreescribe); región caída → `geo-restore`; pérdida total → reconstrucción §9.2 de `PROJECT-STATE-RECONSTRUCTION`.

**⚠️ BRECHAS DE MONITOREO/DR (cerrar — alineado con Principio #1):**
1. 🔴 **Respaldo lógico off-Azure NO está activo:** `pg_dump` semanal cifrado (runbook `RUNBOOK-BACKUP-DB-AUTOMATICO.md`).
   **OBLIGATORIO** — lección jun-2026: la sub vieja `f049d131` quedó deshabilitada y su BD inaccesible; no depender de un solo proveedor.
2. 🔴 **El monitor corre en el PC de Jhovan** (tarea Windows) → si el PC está apagado/dormido, **no hay monitoreo**.
   **Recomendación (mía):** mover a monitoreo **nativo en la nube** — Application Insights + *availability test* sobre `/health`
   + alertas de Azure Monitor (correo/SMS) → independiente del PC, cumple "monitoreo de toda la infra y app" 24/7.
3. 🟡 Apagar el toggle de acceso elevado de Global Admin en Entra; rotar la Anthropic key vieja `rentingos-prod`.

**Comandos clave (referencia):** `curl https://api.rentingos.com/health` · `az webapp log tail -g rentingos-rg -n rentingos-api-prod`
· redeploy backend `az webapp deploy … --type zip` · frontend `swa deploy … --deployment-token`.
Secrets: Azure App Settings (fuente de verdad) + respaldo local `DEPLOY-SECRETS.txt` (NUNCA en repo).

---

## 7. Bitácora de sesiones web (git)

### 2026-06-14 — Sesión web "Code2" (este contenedor)
- **Ingerí** la memoria viva desde OneDrive (`SYNC-DIARIO.md`, mod. 02:50) vía conector M365.
- **Hallazgo:** la rama `claude/rentingos-code2-w59hcd` no había llegado a `origin` (el push desde el PC no
  aterrizó aquí); este repo solo contiene el dashboard, no el producto.
- **Decisiones Jhovan:** (1) nada en el repo de producto por ahora desde la web; (2) persistir memoria en git.
- **Hecho:** creado este `MEMORY.md` como espejo versionado de la memoria + push + PR draft.
- ⚠️ Recordatorio para la sesión del PC: copiar novedades de este archivo de vuelta al SYNC-DIARIO de OneDrive
  (el conector web es de solo lectura).

### 2026-06-14 (2) — App de escritorio caída; revisión de Teams (Carolina)
- App de escritorio de Jhovan no responde → cambió de PC; pidió revisar respuestas de Carolina en Teams.
- **Leí el hilo de Teams** (vía conector Graph, no el Chrome): Carolina respondió el **12-jun** con dos
  correcciones al auto-billing (whitelist de ~67 clientes activos + junio = 96 facturas, no 45). Documentado en §8.
- **No pude continuar la implementación**: el fix es en el repo del producto RentingOS (fuera de scope) y el
  conector de Teams es de solo lectura (no pude responderle). Capturé sus indicaciones aquí para ejecutarlas
  apenas haya repo de producto.

### 2026-06-14 (3) — Reanudar sesiones locales + verificar backup migración
- App de escritorio caída y sesiones locales ("rentingOS Code2", "multitech international business route") pegadas.
  Aclarado: no puedo revivir procesos locales desde la web; di pasos `claude --continue/--resume`.
- **Backup VERIFICADO íntegro** en OneDrive: `claude-memory-backup/` (28 archivos) + `_CLAUDE-SYNC/` + master
  `RentingOS-CONTEXTO-MAESTRO.md` (305KB) + 3 carpetas `MIGRACION-*-2026-06-15` (config .claude + memoria completa).
  Nada perdido — 4 copias en 2 nubes (OneDrive + git).
- **Espejé la pista internacional** en este archivo (§9) como copia extra versionada.

### 2026-06-26 — Ingesta de la sesión "rentingOS continuation" (deploy/infra/Azure)
- Esta sesión web "revivió" con un mensaje del usuario tras quedar inactiva post-migración (igual les pasó a
  las sesiones nuevas que creó). Pedido: actualizarme y espejar lo de "rentingOS continuation".
- Leí: `equipo-sesiones-claude.md` (modelo de equipo de sesiones) + handoffs Azure/deploy del 25-26 jun.
- **Espejé todo en §10:** RentingOS caído (403), crédito Azure $5.000 (hasta 26-jun-2027), bloqueo RBAC en
  sub 9a941d16, dato encerrado en f049d131, procedimiento de deploy, y que el **código de producto está en
  GitHub `multitechcloudlatam/rentingos`** (desbloquea el fix de Carolina §8 si se agrega a una sesión).
- Marketplace ya LIVE. Pendientes Azure = clics de Jhovan (RBAC, decisión de datos, términos del crédito).

### 2026-06-26 (2) — Ingesta profunda Code2 + producto vivo + prioridad monitoreo/DR
- Pedido Jhovan: agregar repo de producto, no perder nada, continuar; **prioridad = cuidar datos + recuperación
  rápida + monitoreo de toda la infra/app**; "leer y actualizar cada línea de la sesión rentingOS Code2".
- **Repo `multitechcloudlatam/rentingos`: acceso git DENEGADO (403)** desde esta sesión (scope = cmd-center-multitech).
  Para ejecutar el fix de Carolina (§8) / merge del PR #1 de Proyectos / deploys → abrir una sesión scopeada a ese repo.
- **Leí y espejé el estado REAL del producto** (`features-ground-truth` + doc Arquitectura/DR): la app **ya está
  arriba** en la sub nueva (app/api.rentingos.com), IA Claude + Stripe TEST verificados, 1.124 activos / $154M canon,
  QA de seguridad APROBADO, bugs P0/P1 mayormente resueltos, módulo Proyectos en PR #1. Todo en §11.
- **Monitoreo/DR → §12** como Principio #1, con las 2 brechas críticas (pg_dump off-Azure inactivo; monitor depende
  del PC) y mi recomendación de monitoreo nativo Azure (App Insights + availability test + alertas) 24/7.
- ⚠️ El doc fuente es CONFIDENCIAL (mapa de ataque): NO copié credenciales/tokens/IPs al repo, solo arquitectura/estado.

### 2026-06-26 (3) — Ingesta del historial de la sesión "rentingOS continuation" (billing 18-19 jun)
- Jhovan pegó el historial de continuation y pidió revisar los MD/rutas que menciona y actualizarme.
- Leí `PENDIENTES-AL-CAMBIO-DE-PC-2026-06-18.md` (act. 19-jun). **§8 ampliado** con: 3ª indicación de Carolina
  (**Fruty Green 45→33**, era el Portal del Cliente; fix `portal.js:497` `status:'RENTED'`), fórmula del split
  (commit 77c46df), **decisión canon = Opción A** (confirmada), **autorización** de usar el admin del API,
  y **2 tareas ya ejecutadas el 19-jun**: Fruty Green→33 y cierre de **410 contratos artefacto** (activos 601→191).
- Registrada la identidad Azure correcta (**cloud@**, jdlopera@ sin RBAC) y respuesta enviada a Carolina por Chrome (19-jun).
- Pendientes vivos de facturación: export Siigo pagadas, split_pendiente_carolina.csv, modelo OC + prefactura,
  duplicados DUP-, Andrey, DataCrédito → encender auto-billing **antes del corte día 27**.

### 2026-06-26 (4) — Memoria única + continuidad + plan de respaldo/DR
- Consolidé esta `MEMORY.md` como **memoria única** y agregué **§0-TL;DR** (resumen de temas + pendientes accionables + cómo retomar).
- **Continuidad:** `runbooks/CONTINUIDAD-claude.md` (hook SessionStart que auto-carga MEMORY.md + frase de arranque + disciplina de cierre).
  ⚠️ El clasificador de seguridad bloqueó que YO creara el hook auto-ejecutable + `.claude/settings.json`; quedan listos para que Jhovan los apruebe (1 vez).
- **Respaldo integral:** `runbooks/BACKUP-Y-DR-INTEGRAL.md` — código (mirror+bundle), infra (ARM/Bicep export), claves (Key Vault + copia cifrada), BD (PITR ✅ + `pg_dump` off-Azure cifrado ❌ pendiente), monitoreo Azure 24/7. No ejecutable desde la web (sin acceso Azure/BD); listo para correr con `cloud@`.
- **Re-verificación:** `runbooks/CHECKLIST-REVERIFICACION-SUB-NUEVA.md` (confirmar en la sub $5.000 lo hecho el 19-jun en la vieja).
