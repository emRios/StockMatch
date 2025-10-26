<template>
  <aside class="h-screen border-r border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 p-6 shadow-sm">
    <div class="mb-8">
      <h1 class="font-bold text-2xl text-blue-600 dark:text-blue-400 mb-1">AbastFlow</h1>
      <p class="text-xs text-neutral-500">Panel de Gestión</p>
    </div>
    <nav class="space-y-6">
      <div>
        <div class="text-xs uppercase tracking-wider text-neutral-500 mb-3 font-semibold">📊 Reportes</div>
        <ul class="space-y-1">
          <li><RouterLink class="link" to="/reportes/requerimientos">Requerimientos</RouterLink></li>
          <li><RouterLink class="link" to="/reportes/faltantes-cliente">Faltantes por Cliente</RouterLink></li>
          <li><RouterLink class="link" to="/reportes/faltantes-pedido">Faltantes del pedido</RouterLink></li>
        </ul>
      </div>
      <div>
        <div class="text-xs uppercase tracking-wider text-neutral-500 mb-3 font-semibold">📦 Recepciones</div>
        <ul class="space-y-1">
          <li><RouterLink class="link" to="/recepciones">Recepciones</RouterLink></li>
        </ul>
      </div>
      <div>
        <div class="text-xs uppercase tracking-wider text-neutral-500 mb-3 font-semibold">🔍 Consultas</div>
        <ul class="space-y-1">
          <li><RouterLink class="link" to="/consultas/cliente">Por Cliente</RouterLink></li>
        </ul>
      </div>
    </nav>
  </aside>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router';
</script>

<style scoped>
.link { 
  @apply block px-3 py-2 rounded-lg transition-all duration-200 text-neutral-700 dark:text-neutral-300;
  @apply hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/20 dark:hover:text-blue-300;
}
.router-link-active { 
  @apply bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-semibold shadow-sm;
}
</style>
