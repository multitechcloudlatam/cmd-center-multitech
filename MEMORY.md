# MEMORY — RentingOS / Multitech (mirror versionado en git)

> **Qué es esto:** memoria de coordinación entre sesiones de Claude, **versionada en este repo**
> porque las sesiones de Claude Code on the web corren en contenedores efímeros sin acceso de
> escritura a OneDrive. Fuente viva canónica = `_CLAUDE-SYNC/SYNC-DIARIO.md` en OneDrive/SharePoint
> (solo lectura desde la web). Este archivo es el espejo que SÍ puedo actualizar y pushear.
>
> **Regla de actualización:** cuando hagamos algo nuevo en una sesión web, se añade una entrada
> fechada abajo y se commitea/pushea. Al volver al PC, copiar lo relevante al SYNC-DIARIO de OneDrive.
>
> **Última ingesta:** 2026-06-14 — leído `SYNC-DIARIO.md` (mod. 2026-06-14 02:50).

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

## 8. Indicaciones de Carolina (Teams, 2026-06-12) — ACCIÓN PENDIENTE

Chat 1:1 Jhovan ↔ **Carolina Carmona Arias** (analista operaciones / facturación).

**Mensaje 1 (19:11):** *"¿De dónde está tomando datos de 437 contratos? En renting solo están activos
los clientes que compartimos."* → adjunta la lista de clientes activos en renting (whitelist canónica).
**Mensaje 2 (19:13):** *"45 facturas, no son 45 facturas. En el mes de junio fueron 96 facturas."*

**Interpretación / acción (en repo de producto):**
1. El motor de auto-billing está incluyendo **437 contratos** — demasiados. Debe **restringirse a la
   whitelist de clientes activos** que dio Carolina (abajo). Contratos de clientes fuera de la lista
   = NO facturar (probablemente demos/inactivos/duplicados).
2. La corrida de junio debe **cuadrar en 96 facturas** (no 45). Tras aplicar la whitelist, reconciliar
   el conteo y el monto contra la realidad de junio que maneja Carolina.

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

> ⚠️ No pude responderle en Teams desde la web (conector de solo lectura) ni aplicar el fix (repo de producto
> fuera de scope). Pendiente: implementar el filtro por whitelist + reconciliar a 96 facturas en una sesión
> con el repo del producto, y confirmarle a Carolina.

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
