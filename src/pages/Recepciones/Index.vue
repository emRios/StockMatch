<template>
  <div class="max-w-7xl mx-auto p-4 space-y-4">
    <header class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">Recepción de Mercadería</h1>
      <nav class="flex gap-2">
        <router-link class="btn-outline" to="/recepciones/pedidos">Pedidos en curso</router-link>
        <router-link class="btn-outline" to="/recepciones/wizard">Wizard</router-link>
        <router-link class="btn-outline" to="/recepciones/resumen">Resumen</router-link>
      </nav>
    </header>

    <!-- Aquí se renderizan las rutas hijas -->
    <RouterView />
  </div>
</template>

<script setup lang="ts">
// No necesitas lógica aquí; este archivo actúa como layout
</script>

<style scoped>
/* Si usas Tailwind, puedes omitir esto y usar utilidades */
.btn-outline {
  padding: .5rem .75rem;
  border: 1px solid #ddd;
  border-radius: .5rem;
  text-decoration: none;
  color: inherit;
}
.btn-outline.router-link-active {
  background: #f5f5f5;
}
</style>
