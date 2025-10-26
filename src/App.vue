<template>
  <div class="min-h-screen grid grid-cols-[280px_1fr] bg-neutral-50 dark:bg-neutral-950">
    <Sidebar />
    <main class="p-8">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import Sidebar from "@/components/Sidebar.vue";
</script>
