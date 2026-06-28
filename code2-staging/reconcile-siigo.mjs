#!/usr/bin/env node
/**
 * reconcile-siigo.mjs — Ítem 3 del HANDOFF-CODE2-BIG-ITEMS-2026-06-27.
 *
 * Reconcilia el canon ESPERADO (Excel maestro "RENTING - MAYO 2026.xlsx") contra las facturas
 * EMITIDAS en Siigo, cruzando por NIT/OC, y emite un reporte de diferencias.
 *
 * ⚠️ READ-ONLY: NO escribe en Siigo ni en la BD, NO emite ni dispara facturación.
 *    El motor de facturación SIGUE EN MODO PRUEBA hasta que la reconciliación esté limpia.
 *
 * Cómo correr (en el repo de producto, con acceso):
 *   npm i xlsx                      # SheetJS para leer el Excel
 *   export SIIGO_ACCESS_KEY=...     # tomar de App Settings de rentingos-api (o pedir a Jhovan)
 *   export SIIGO_PARTNER_ID=...     # Partner-Id de Siigo
 *   export SIIGO_USER=diroperativa@dinamicatecnologica.com
 *   node reconcile-siigo.mjs --xlsx "RENTING - MAYO 2026.xlsx" --period 2026-05 --out reporte-recon.csv
 *
 * Reglas de negocio confirmadas (handoff + memoria rentingos-datos-facturacion-carolina):
 *   - Canon Siigo: AED (renting c/IVA 19%), AEE (renting excluido de IVA), CLOUD code `cloudex330` = $42.288,98/equipo.
 *   - Retención = ValorMensualIPC * 4%.
 *   - SIN IPC: Fácil Crédito, Eléctricas (de Medellín), Grupo Interaseo.
 *   - Interaseo y Eléctricas facturan por ORDEN DE COMPRA (una factura por OC), no por cliente.
 *   - Mayo 2026: 64 clientes/NIT, bruto esperado ≈ $167.072.910 (64/64 facturados).
 *
 * NOTA DE HONESTIDAD: el contrato exacto de la API de Siigo (endpoints/paginación/campos) debe
 * confirmarse contra su doc oficial; los puntos marcados con TODO(siigo) son los que hay que cerrar
 * cuando se corra con credencial real.
 */

import fs from 'node:fs';
import process from 'node:process';

// ---------- args ----------
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1]]);
    return acc;
  }, [])
);
const XLSX_PATH = args.xlsx || 'RENTING - MAYO 2026.xlsx';
const PERIOD = args.period || '2026-05';            // YYYY-MM
const OUT = args.out || 'reporte-reconciliacion.csv';
const CLOUD_UNIT = 42288.98;                         // cloudex330 por equipo
const IVA = 0.19;
const RETENCION = 0.04;                              // sobre ValorMensualIPC
const NO_IPC = new Set(['FACIL CREDITO', 'ELECTRICAS DE MEDELLIN', 'GRUPO INTERASEO', 'INTERASEO']);
const POR_OC = new Set(['INTERASEO', 'GRUPO INTERASEO', 'ELECTRICAS DE MEDELLIN']);

const SIIGO = {
  accessKey: process.env.SIIGO_ACCESS_KEY,
  partnerId: process.env.SIIGO_PARTNER_ID,
  user: process.env.SIIGO_USER,
  base: process.env.SIIGO_BASE || 'https://api.siigo.com',
};

const norm = (s) => String(s ?? '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
const nit = (s) => String(s ?? '').replace(/[^0-9]/g, '');

// ---------- 1) leer canon esperado del Excel ----------
async function loadExpected() {
  const XLSX = await import('xlsx').catch(() => {
    console.error('Falta dependencia: npm i xlsx'); process.exit(2);
  });
  const wb = XLSX.readFile(XLSX_PATH, { cellDates: true });
  // El maestro trae ~71 hojas (una por cliente) + posiblemente un consolidado.
  // Estrategia: agregamos por NIT a partir de cada hoja-cliente.
  const expected = new Map(); // key: NIT -> { cliente, equipos, aee, cloud, aed, baseIPC, oc:Set }
  for (const sheetName of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: null });
    for (const r of rows) {
      // TODO(excel): confirmar nombres reales de columnas en el maestro.
      const clienteNit = nit(r.NIT ?? r.Nit ?? r.nit);
      if (!clienteNit) continue;
      const cliente = norm(r.CLIENTE ?? r.Cliente ?? sheetName);
      const costo = Number(r.Costo ?? r.COSTO ?? 0) || 0;        // ≠ "Costo proveedor"
      const cloudCol = Number(r.CLOUD ?? r.Cloud ?? 0) || 0;     // por cliente (IPC-dependiente)
      const aed = Number(r.AED ?? 0) || 0;
      const aeeFromCosto = costo > 0 ? costo / 60 : 0;           // AEE = Costo/60
      const oc = r.OC ?? r['Orden de Compra'] ?? r.ORDEN_COMPRA ?? null;

      const cur = expected.get(clienteNit) || {
        cliente, equipos: 0, aee: 0, cloud: 0, aed: 0, oc: new Set(),
      };
      cur.equipos += 1;
      cur.aee += aeeFromCosto;
      cur.cloud += (cloudCol || CLOUD_UNIT);   // si la hoja no trae cloud, usar unitario cloudex330
      cur.aed += aed;
      if (oc) cur.oc.add(String(oc).trim());
      expected.set(clienteNit, cur);
    }
  }
  // canon = AEE + CLOUD + AED ; IVA solo sobre AED ; retención sobre baseIPC (=canon sin IVA salvo no-IPC)
  for (const [k, v] of expected) {
    v.canonSinIva = v.aee + v.cloud + v.aed;
    v.iva = v.aed * IVA;                              // IVA solo sobre AED
    v.total = v.canonSinIva + v.iva;
    const noIpc = [...NO_IPC].some((n) => v.cliente.includes(n));
    v.retencion = noIpc ? 0 : Math.round(v.canonSinIva * RETENCION);
    v.facturaPorOC = [...POR_OC].some((n) => v.cliente.includes(n));
  }
  return expected;
}

// ---------- 2) traer facturas emitidas de Siigo ----------
async function loadSiigoInvoices() {
  if (!SIIGO.accessKey) {
    console.warn('⚠️ SIIGO_ACCESS_KEY no seteada → se omite el lado Siigo (solo se imprime el canon esperado).');
    return null;
  }
  // TODO(siigo): autenticación real. Siigo usa OAuth: POST /auth con { username, access_key } → Bearer token.
  const tokenResp = await fetch(`${SIIGO.base}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Partner-Id': SIIGO.partnerId || '' },
    body: JSON.stringify({ username: SIIGO.user, access_key: SIIGO.accessKey }),
  });
  if (!tokenResp.ok) throw new Error(`Siigo auth falló: ${tokenResp.status}`);
  const { access_token } = await tokenResp.json();

  // TODO(siigo): paginar GET /v1/invoices?created_start=...&created_end=... del período.
  const [y, m] = PERIOD.split('-').map(Number);
  const start = `${PERIOD}-01`;
  const end = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  const out = [];
  let page = 1;
  for (;;) {
    const resp = await fetch(`${SIIGO.base}/v1/invoices?created_start=${start}&created_end=${end}&page=${page}&page_size=100`, {
      headers: { Authorization: `Bearer ${access_token}`, 'Partner-Id': SIIGO.partnerId || '' },
    });
    if (!resp.ok) throw new Error(`Siigo invoices ${resp.status}`);
    const data = await resp.json();
    const items = data.results ?? data ?? [];
    if (!items.length) break;
    for (const inv of items) {
      out.push({
        nit: nit(inv.customer?.identification),
        cliente: norm(inv.customer?.name),
        oc: inv.observations || inv.order_reference || null, // TODO(siigo): dónde viene la OC
        total: Number(inv.total ?? 0),
        iva: Number((inv.taxes || []).reduce((s, t) => s + (t.value || 0), 0)),
        fecha: inv.date,
        pagada: (inv.balance ?? 1) === 0,
      });
    }
    if (items.length < 100) break;
    page += 1;
  }
  // agregamos por NIT
  const byNit = new Map();
  for (const inv of out) {
    const cur = byNit.get(inv.nit) || { cliente: inv.cliente, total: 0, iva: 0, facturas: 0, pagadas: 0, ocs: new Set() };
    cur.total += inv.total; cur.iva += inv.iva; cur.facturas += 1; cur.pagadas += inv.pagada ? 1 : 0;
    if (inv.oc) cur.ocs.add(String(inv.oc).trim());
    byNit.set(inv.nit, cur);
  }
  return byNit;
}

// ---------- 3) cruzar y reportar ----------
function reconcile(expected, siigo) {
  const rows = [['NIT', 'Cliente', 'Canon_esperado', 'IVA_esperado', 'Total_esperado', 'Total_Siigo', 'Diff', 'Facturas_Siigo', 'Pagadas', 'PorOC', 'Estado']];
  const TOL = 1000; // tolerancia de redondeo COP
  for (const [k, e] of expected) {
    const s = siigo?.get(k);
    const totalSiigo = s ? Math.round(s.total) : null;
    const diff = totalSiigo == null ? null : Math.round(e.total) - totalSiigo;
    let estado;
    if (!s) estado = 'SIN_FACTURA_EN_SIIGO';
    else if (Math.abs(diff) <= TOL) estado = 'OK';
    else if (diff > 0) estado = 'FALTA_FACTURAR';     // esperado > emitido
    else estado = 'FACTURADO_DE_MAS';                 // emitido > esperado (ojo: no cobrar de más)
    rows.push([
      k, e.cliente, Math.round(e.canonSinIva), Math.round(e.iva), Math.round(e.total),
      totalSiigo ?? '', diff ?? '', s?.facturas ?? '', s?.pagadas ?? '',
      e.facturaPorOC ? `SI(${e.oc.size}OC)` : 'no', estado,
    ]);
  }
  return rows;
}

// ---------- main ----------
(async () => {
  const expected = await loadExpected();
  console.log(`Canon esperado cargado: ${expected.size} clientes/NIT.`);
  const siigo = await loadSiigoInvoices();
  const rows = reconcile(expected, siigo);
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  fs.writeFileSync(OUT, csv, 'utf8');
  const diffs = rows.slice(1).filter((r) => r[10] !== 'OK');
  console.log(`Reporte escrito en ${OUT}. Diferencias/pendientes: ${diffs.length}.`);
  if (!siigo) console.log('(Lado Siigo omitido por falta de SIIGO_ACCESS_KEY — solo canon esperado.)');
  console.log('⚠️ Recordatorio: motor de facturación SIGUE EN MODO PRUEBA. No encender hasta reconciliación limpia + OK de Jhovan/Carolina.');
})().catch((e) => { console.error(e); process.exit(1); });
