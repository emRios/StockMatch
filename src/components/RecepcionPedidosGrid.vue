<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">Pedidos en curso</h1>
      <div class="flex gap-2">
        <select v-model="filtro" class="rounded-lg border px-3 py-2">
          <option value="">Todos</option>
          <option value="nuevo">Nuevo</option>
          <option value="en_proceso">En proceso</option>
          <option value="finalizado">Finalizado</option>
          <option value="cerrado">Cerrado</option>
        </select>
        <button class="btn" @click="refrescar">Refrescar</button>
      </div>
    </div>

    <div class="rounded-xl border overflow-auto">
      <table class="min-w-full text-sm">
        <thead class="bg-gray-50">
          <tr>
            <th class="th">Orden</th>
            <th class="th">Vendor</th>
            <th class="th">Estado</th>
            <th class="th">Creado</th>
            <th class="th">Actualizado</th>
            <th class="th">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in pedidos.items" :key="p.orden_id" class="odd:bg-white even:bg-gray-50">
            <td class="td font-medium">{{ p.orden_id }}</td>
            <td class="td">{{ p.vendor || '—' }}</td>
            <td class="td"><span :class="badgeClass(p.estado)">{{ p.estado }}</span></td>
            <td class="td">{{ fmt(p.created_at) }}</td>
            <td class="td">{{ fmt(p.updated_at) }}</td>
            <td class="td">
              <div class="flex items-center gap-3">
                <button class="link" @click="verResumen(p.orden_id)">Ver comparativo</button>
                <span class="text-neutral-300">|</span>
                <button class="link-primary" @click="abrirWizard(p.orden_id)">Continuar recepción</button>
              </div>
            </td>
          </tr>
          <tr v-if="!pedidos.items.length">
            <td class="td" colspan="6">No hay pedidos para mostrar.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="flex justify-end">
      <router-link class="btn-outline" :to="{ name:'recepcion-wizard'}">Ir al Wizard</router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { usePedidosStore } from '@/stores/pedidos'
import { useRecepcionStore } from '@/stores/recepcion'
import { useRouter } from 'vue-router'

const pedidos = usePedidosStore()
const recep = useRecepcionStore()
const router = useRouter()

const filtro = ref<string>('')

function fmt(s: string){ return new Date(s).toLocaleString() }
function badgeClass(s: string){
  const base = "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
  switch(s){
    case 'nuevo': return base+' bg-slate-100 text-slate-700'
    case 'en_proceso': return base+' bg-amber-100 text-amber-800'
    case 'finalizado': return base+' bg-green-100 text-green-800'
    case 'cerrado': return base+' bg-gray-200 text-gray-700'
    default: return base+' bg-slate-100 text-slate-700'
  }
}

async function refrescar(){ 
  try {
    await pedidos.listar(filtro.value || undefined)
  } catch (error: any) {
    console.error("Error al refrescar pedidos:", error)
    alert(`❌ No se pudieron cargar los pedidos:\n\n${error.message}`)
  }
}
watch(filtro, refrescar)

function abrirWizard(ordenId: string){
  recep.setOrdenId(ordenId)
  recep.loadCache()
  router.push({ name: 'recepcion-wizard' })
}
async function verResumen(ordenId: string){
  recep.setOrdenId(ordenId)
  await recep.fetchComparativo()
  router.push({ name: 'recepcion-resumen' })
}

onMounted(refrescar)
</script>

<style scoped>
.btn { @apply rounded-lg px-3 py-2 bg-blue-600 text-white hover:bg-blue-700; }
.btn-outline { @apply rounded-lg px-3 py-2 border hover:bg-gray-50; }
.link { @apply underline hover:no-underline text-blue-600; }
.link-primary { @apply underline hover:no-underline text-blue-700 font-semibold; }
.th { @apply text-left px-3 py-2 font-semibold; }
.td { @apply px-3 py-1; }
</style>
