<template>
  <div class="space-y-6">
    <!-- Encabezado -->
    <div class="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-800 p-6">
      <h2 class="text-2xl font-bold text-neutral-900 dark:text-white mb-1">📋 Requerimientos de Proveedor</h2>
      <p class="text-sm text-neutral-500">Consulta productos faltantes por proveedor</p>
    </div>

    <!-- Filtros -->
    <div class="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-800 p-6">
      <div class="flex flex-wrap items-end gap-4">
        <div class="flex-1 min-w-[200px]">
          <label class="lbl">🏢 Proveedor (vendor)</label>
          <input v-model="vendor" class="inp w-full" placeholder="Ej: ACME (opcional)" />
        </div>
        <div>
          <label class="lbl">📄 Filas por página</label>
          <select v-model.number="pageSize" class="inp">
            <option :value="25">25</option>
            <option :value="50">50</option>
            <option :value="100">100</option>
          </select>
        </div>
        <button class="btn-primary" @click="load">
          🔍 Consultar
        </button>
        <button class="btn-success" :disabled="!allRows.length" @click="exportCsv">
          💾 Descargar CSV
        </button>
      </div>
      <div v-if="status" class="mt-4 px-4 py-2 rounded-lg text-sm" :class="status.startsWith('Error') ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300' : 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'">
        {{ status }}
      </div>
    </div>

    <!-- Tabla -->
    <DataGrid
      :columns="cols" :rows="rows"
      :page="page" :page-size="pageSize" :total="total"
      :sort-by="sortBy" :asc="asc"
      @sort="toggleSort" @prev="prevPage" @next="nextPage"
    >
      <template #cell-a_pedir="{ row }">
        <span :class="row.a_pedir>0 ? 'text-red-600 dark:text-red-400 font-bold' : 'text-green-600 dark:text-green-400'">
          {{ fmt(row.a_pedir) }}
        </span>
      </template>
    </DataGrid>
  </div>
</template>

<script setup lang="ts">
import { ref, watchEffect } from "vue";
import { supabase } from "@/lib/supabase";
import DataGrid from "@/components/DataGrid.vue";
import { downloadCsv } from "@/lib/csv";
import { loadRequerimientosFromCSV } from "@/lib/csvLoader";

type Row = {
  corte: string;
  vendor: string | null;
  producto: string;
  lineitem_name: string | null;
  descripcion: string | null;
  demanda: number;
  stock: number;
  a_pedir: number;
};

const vendor = ref(""); const page = ref(1); const pageSize = ref(50);
const sortBy = ref<keyof Row>('a_pedir'); const asc = ref(false);
const status = ref(""); const allRows = ref<Row[]>([]); const rows = ref<Row[]>([]); const total = ref<number>();

const cols = [
  { key: "vendor", label: "Proveedor" },
  { key: "producto", label: "SKU" },
  { key: "lineitem_name", label: "Item" },
  { key: "descripcion", label: "Descripción" },
  { key: "demanda", label: "Demanda", align: "right", fmt: fmt },
  { key: "stock", label: "Stock", align: "right", fmt: fmt },
  { key: "a_pedir", label: "A pedir", align: "right", fmt: fmt },
];

function fmt(n:any){ return Number(n ?? 0).toLocaleString(); }
function toggleSort(k:string){ if (sortBy.value===k) asc.value=!asc.value; else { sortBy.value=k as keyof Row; asc.value=false; } paginate(); }
function sort(list:Row[]){ const k=sortBy.value as string, a=asc.value; return [...list].sort((x:any,y:any)=> (x[k]>y[k]?1:-1) * (a?1:-1)); }

async function load(){
  status.value = "Cargando…";
  // 1) Intentar Supabase RPC
  try {
    const { data, error } = await supabase.rpc("get_requerimientos_proveedor", { p_vendor: vendor.value || null });
    console.log("[requerimientos] supabase.rpc result", { error, rows: data?.length });
    if (error) throw error;
    if (Array.isArray(data) && data.length > 0) {
      allRows.value = data as Row[]; page.value = 1; paginate();
      status.value = `OK (Supabase): ${allRows.value.length} filas`;
      return;
    }
  } catch (e:any) {
    console.warn("[requerimientos] Supabase RPC falló o vacío", e?.message || e);
  }
  // 2) Fallback: calcular desde CSV locales
  try {
    const csvRows = await loadRequerimientosFromCSV(vendor.value || null);
    allRows.value = csvRows as unknown as Row[]; page.value = 1; paginate();
    status.value = `OK (CSV local): ${allRows.value.length} filas`;
  } catch (e:any) {
    status.value = `Error: ${e.message}`;
    allRows.value = []; paginate();
  }
}

function paginate(){ total.value = allRows.value.length; const s=(page.value-1)*pageSize.value; rows.value = sort(allRows.value).slice(s, s + pageSize.value); }
function nextPage(){ if (page.value*pageSize.value < (total.value||0)) { page.value++; paginate(); } }
function prevPage(){ if (page.value>1) { page.value--; paginate(); } }
function exportCsv(){ downloadCsv(`requerimientos_${vendor.value||'todos'}`, allRows.value); }

load(); watchEffect(()=>{ paginate(); });
</script>

<style scoped>
.lbl { @apply block text-xs mb-1.5 text-neutral-600 dark:text-neutral-400 font-medium; }
.inp { 
  @apply px-4 py-2.5 rounded-lg border-2 border-neutral-300 dark:border-neutral-700;
  @apply bg-white dark:bg-neutral-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 outline-none transition-all;
}
.btn-primary { 
  @apply px-6 py-2.5 rounded-lg font-medium transition-all;
  @apply bg-blue-600 text-white hover:bg-blue-700 active:scale-95;
  @apply shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed;
}
.btn-success { 
  @apply px-6 py-2.5 rounded-lg font-medium transition-all;
  @apply bg-green-600 text-white hover:bg-green-700 active:scale-95;
  @apply shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed;
}
</style>
