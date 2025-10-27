import { createClient } from '@supabase/supabase-js';

// Usage:
//  PowerShell:
//    $env:VITE_SUPABASE_URL="https://<your-project>.supabase.co"
//    $env:VITE_SUPABASE_ANON_KEY="<your-anon-key>"
//    node scripts/test-rpc-get-comparativo.mjs OC-YYYYMMDD-HHMMSS
//
// Env fallback: ORDEN_ID

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
const ordenId = process.argv[2] || process.env.ORDEN_ID;

if (!url || !key) {
  console.error('[test] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables');
  process.exit(1);
}
if (!ordenId) {
  console.error('[test] Provide an orden_id as argv[2] or set ORDEN_ID env var.');
  process.exit(1);
}

const supabase = createClient(url, key);

function normalizeRow(r) {
  const pedidos = Number(r.articulos_pedidos ?? r.pedidos ?? r.cantidad_pedida ?? 0);
  const enviado = Number(r.articulos_enviados ?? r.enviado ?? r.cantidad_recibida ?? 0);
  const diferencia = Number(r.diferencia ?? (enviado - pedidos));
  return { ...r, pedidos, enviado, diferencia };
}

try {
  console.log(`[test] get_comparativo_recepcion(${ordenId}) ...`);
  const { data, error } = await supabase.rpc('get_comparativo_recepcion', { p_orden_id: ordenId });
  if (error) throw error;
  const rows = (data || []).map(normalizeRow);

  console.table(rows.map(r => ({ producto: r.producto, pedidos: r.pedidos, enviado: r.enviado, diferencia: r.diferencia, estado: r.estado })));

  // Expectation: for this orden, rows with diferencia>0 should be returned by the function (if the filter was added in SQL) or at least detectable here.
  const diffPos = rows.filter(r => r.diferencia > 0);
  const result = {
    total_rows: rows.length,
    diff_gt_0: diffPos.length,
  };
  console.log('[test] summary', result);

  if (diffPos.length === 1) {
    console.log('[test] ✅ PASS: exactly one row with diferencia > 0');
    process.exit(0);
  } else {
    console.warn('[test] ⚠️ EXPECTATION NOT MET: expected 1 row with diferencia > 0');
    process.exit(2);
  }
} catch (e) {
  console.error('[test] ❌ Error', e.message || e);
  process.exit(1);
}
