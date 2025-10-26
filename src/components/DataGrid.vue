<template>
  <div class="bg-white dark:bg-neutral-900 border-2 border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-lg">
    <div class="flex items-center justify-between p-4 border-b-2 border-neutral-200 dark:border-neutral-800 bg-gradient-to-r from-neutral-50 to-white dark:from-neutral-900 dark:to-neutral-800">
      <div class="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
        📊 {{ totalText }}
      </div>
      <div class="flex items-center gap-2"><slot name="actions"></slot></div>
    </div>
    <div class="overflow-auto max-h-[600px]">
      <table class="min-w-full text-sm">
        <thead class="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 sticky top-0 z-10">
          <tr>
            <th v-for="c in columns" :key="c.key"
                class="px-4 py-3 text-left font-bold text-neutral-700 dark:text-neutral-200 cursor-pointer select-none hover:bg-blue-200 dark:hover:bg-blue-700/40 transition-colors"
                @click="$emit('sort', c.key)">
              <div class="flex items-center gap-2">
                <span>{{ c.label }}</span>
                <span v-if="sortBy===c.key" class="text-blue-600 dark:text-blue-400">{{ asc ? '▲' : '▼' }}</span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row,i) in rows" :key="i"
              class="border-t border-neutral-200 dark:border-neutral-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
              :class="i % 2 === 0 ? 'bg-white dark:bg-neutral-900' : 'bg-neutral-50/50 dark:bg-neutral-800/30'">
            <td v-for="c in columns" :key="c.key" class="px-4 py-3"
                :class="{'text-right tabular-nums font-semibold': c.align==='right'}">
              <slot :name="`cell-${c.key}`" :row="row">{{ c.fmt ? c.fmt(row[c.key]) : (row[c.key] ?? '') }}</slot>
            </td>
          </tr>
          <tr v-if="!rows?.length">
            <td :colspan="columns.length" class="px-4 py-16 text-center">
              <div class="text-neutral-400 dark:text-neutral-500 text-lg">📭</div>
              <div class="text-neutral-500 dark:text-neutral-400 mt-2">Sin resultados</div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="flex items-center justify-between p-4 border-t-2 border-neutral-200 dark:border-neutral-800 bg-gradient-to-r from-neutral-50 to-white dark:from-neutral-900 dark:to-neutral-800">
      <div class="text-xs font-medium text-neutral-600 dark:text-neutral-400">
        Página {{ page }} de {{ totalPages || 1 }}
      </div>
      <div class="flex items-center gap-3">
        <button class="btn-nav" :disabled="page<=1" @click="$emit('prev')">
          ◀ Anterior
        </button>
        <button class="btn-nav" :disabled="page>=totalPages" @click="$emit('next')">
          Siguiente ▶
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

type Col = { key: string; label: string; align?: 'left'|'right'; fmt?: (v:any)=>string };
const props = defineProps<{ columns:Col[]; rows:any[]; page:number; pageSize:number; total?:number; sortBy?:string; asc?:boolean }>();
const totalPages = computed(()=> Math.ceil((props.total ?? props.rows.length)/props.pageSize));
const totalText  = computed(()=> props.total!=null? `${props.total} filas` : `${props.rows.length} filas`);
</script>

<style scoped>
.btn-nav { 
  @apply px-4 py-2 rounded-lg font-medium transition-all;
  @apply bg-blue-600 text-white hover:bg-blue-700 active:scale-95;
  @apply shadow-md hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-blue-600;
}
</style>
