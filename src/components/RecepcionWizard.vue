<template>
  <div class="space-y-4">
    <!-- Encabezado / cache -->
    <div class="p-3 rounded-xl border flex flex-col sm:flex-row gap-3 sm:items-end sm:justify-between">
      <div>
        <label class="block text-sm font-medium">Orden ID</label>
        <input v-model="orden" class="input mt-1" placeholder="OC-2025-001" @blur="applyOrden" />
        <p class="text-xs text-gray-500 mt-1">ID de orden para cachear progreso y persistir en Supabase.</p>
      </div>
      <div class="flex gap-2">
        <button class="btn-outline" :disabled="!orden" @click="store.loadCache()">Cargar cache</button>
        <button class="btn-outline" :disabled="!orden" @click="store.clearCache()">Limpiar cache</button>
      </div>
    </div>

    <!-- Wizard manual/edición -->
    <div class="p-3 rounded-xl border">
      <div class="flex items-center justify-between">
        <h2 class="font-semibold">Carga de productos</h2>
        <div class="flex gap-2">
          <button class="btn-outline" :disabled="store.recepciones.length===0" @click="vaciarRecepcion">Vaciar</button>
          <button class="btn" @click="agregar">Nuevo</button>
        </div>
      </div>

      <div v-if="!store.recepciones.length" class="mt-2 text-sm text-gray-600">
        Sin artículos. Usa <b>Nuevo</b> para agregar artículos.
      </div>

      <div v-else class="mt-3 rounded-lg border p-3">
        <div class="flex items-center justify-between">
          <div class="text-sm text-gray-600">Artículo {{ store.idxActual+1 }} de {{ store.recepciones.length }}</div>
          <div class="text-sm"><span :class="badgeClass(estadoActual)">{{ estadoActual }}</span></div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
          <div>
            <label class="label">Vendor</label>
            <input class="input" v-model.trim="frm.vendor" />
          </div>
          <div>
            <label class="label">Producto</label>
            <input class="input" v-model.trim="frm.producto" @blur="autoFillFromPedido" />
            <p class="hint" v-if="frm.producto && store.pedido.length > 0 && !existeEnPedido">Producto no existe en pedido</p>
          </div>
          <div>
            <label class="label">Nombre</label>
            <input class="input" v-model.trim="frm.lineitem_name" />
          </div>
          <div class="md:col-span-2">
            <label class="label">Descripción</label>
            <input class="input" v-model.trim="frm.descripcion" />
          </div>
          <div>
            <label class="label">Cantidad Recibida</label>
            <input type="number" min="0" step="1" class="input text-right" v-model.number="frm.cantidad_recibida" />
            <p class="hint" v-if="frm.cantidad_recibida < 0">No puede ser negativa</p>
          </div>
          <div>
            <label class="label">Pedida (ref.)</label>
            <input class="input text-right bg-gray-50" :value="nf(pedida)" disabled />
          </div>
          <div>
            <label class="label">Faltante (post-acum.)</label>
            <input class="input text-right bg-gray-50" :value="nf(faltante)" disabled />
          </div>
        </div>

        <div class="mt-4 flex items-center justify-between">
          <div class="flex gap-2">
            <button class="btn-outline" @click="store.irPrev" :disabled="store.idxActual===0">Anterior</button>
            <button class="btn" @click="store.irNext" :disabled="!puedeSiguiente">Siguiente Artículo</button>
          </div>
          <div class="flex gap-2">
            <button class="btn-outline" @click="guardar" :disabled="!valido">Guardar Cambios</button>
            <button class="btn-danger" @click="store.eliminar(store.idxActual)">Eliminar</button>
            <button class="btn bg-green-600 hover:bg-green-700" @click="finalizarRecepcion" :disabled="!store.ordenId || loading">
              <span v-if="!loading">Finalizar Carga</span>
              <span v-else>Guardando…</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabla de artículos cargados -->
    <div v-if="productosGuardados.length" class="p-3 rounded-xl border">
      <div class="max-h-40 overflow-auto border rounded-lg">
        <table class="min-w-full text-sm">
          <thead class="bg-gray-50">
            <tr><th class="th">#</th><th class="th">Vendor</th><th class="th">Producto</th><th class="th">Nombre</th><th class="th text-right">Cantidad</th><th class="th">Acciones</th></tr>
          </thead>
          <tbody>
            <tr v-for="(r,i) in productosGuardados" :key="r.uid" class="odd:bg-white even:bg-gray-50">
              <td class="td">{{ i+1 }}</td>
              <td class="td">{{ r.vendor }}</td>
              <td class="td">{{ r.producto }}</td>
              <td class="td">{{ r.lineitem_name || r.descripcion }}</td>
              <td class="td text-right">{{ nf(r.cantidad_recibida) }}</td>
              <td class="td">
                <div class="flex gap-2">
                  <button class="action-btn action-btn-primary" @click="irAProducto(r)" title="Ir a este artículo">
                    Ir
                  </button>
                  <button class="action-btn action-btn-danger" @click="eliminarProducto(r)" title="Eliminar este artículo">
                    Eliminar
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'vue-router'
import { useRecepcionStore } from '@/stores/recepcion'

const router = useRouter()
const store = useRecepcionStore()
const loading = ref(false)

const nf = (n: number) => new Intl.NumberFormat().format(n)

// Computed para mostrar solo productos guardados (con producto no vacío)
const productosGuardados = computed(() => 
  store.recepciones.filter(r => r.producto?.trim())
)

const orden = ref(store.ordenId)

// Sincronizar orden con el store cuando cambie
watch(() => store.ordenId, (newOrdenId) => {
  orden.value = newOrdenId
}, { immediate: true })

function applyOrden(){ store.setOrdenId(orden.value || ''); store.saveCache() }

// Botón de importación CSV eliminado por solicitud

function vaciarRecepcion(){ store.recepciones = []; store.idxActual = 0; store.saveCache() }

// Wizard - Formulario temporal (no sincronizado automáticamente con el store)
const frm = reactive({ vendor:'', producto:'', lineitem_name:'', descripcion:'', cantidad_recibida:0 })
const formularioLimpio = ref(false)

// Cargar datos del store al formulario cuando cambia el artículo actual
watch(() => store.actual, (cur) => {
  // Si acabamos de limpiar manualmente el formulario, no sobrescribir
  if (formularioLimpio.value) {
    formularioLimpio.value = false
    return
  }
  
  if (!cur) {
    // Si no hay artículo actual, limpiar el formulario
    frm.vendor = ''
    frm.producto = ''
    frm.lineitem_name = ''
    frm.descripcion = ''
    frm.cantidad_recibida = 0
  } else {
    // Cargar datos del artículo actual
    frm.vendor = cur.vendor
    frm.producto = cur.producto
    frm.lineitem_name = cur.lineitem_name
    frm.descripcion = cur.descripcion
    frm.cantidad_recibida = cur.cantidad_recibida
  }
}, { immediate: true })

// Funciones auxiliares para la tabla
function irAProducto(producto: any) {
  const index = store.recepciones.findIndex(r => r.uid === producto.uid)
  if (index >= 0) {
    store.irA(index)
  }
}

function eliminarProducto(producto: any) {
  const index = store.recepciones.findIndex(r => r.uid === producto.uid)
  if (index >= 0) {
    const confirmar = confirm(`¿Eliminar el producto "${producto.producto}"?`)
    if (confirmar) {
      store.eliminar(index)
    }
  }
}

// Función sync ya no se usa - removida
function agregar(){ 
  // Solo crear nuevo si no hay artículo actual o si el actual ya tiene datos guardados
  if (!store.actual || store.actual.producto) {
    store.agregarNuevo()
  }
}

function guardar(){ 
  if (!store.ordenId) {
    alert('❌ Debes asignar un Orden ID antes de guardar.');
    return;
  }
  
  // Validar datos antes de guardar
  if (!frm.producto?.trim()) {
    alert('❌ El campo Producto es obligatorio.');
    return;
  }
  
  if (!Number.isFinite(frm.cantidad_recibida) || frm.cantidad_recibida < 0) {
    alert('❌ La cantidad recibida debe ser un número válido y no negativo.');
    return;
  }
  // Si el artículo actual ya tiene datos y el formulario corresponde a otro producto,
  // crear una nueva fila para evitar sobreescribir la anterior cuando el usuario olvidó pulsar "Nuevo".
  if (store.actual && store.actual.producto?.trim() && frm.producto?.trim() && frm.producto.trim() !== store.actual.producto.trim()) {
    store.agregarNuevo()
  }
  
  // Actualizar el artículo actual con los datos del formulario
  store.actualizarActual({
    vendor: frm.vendor,
    producto: frm.producto,
    lineitem_name: frm.lineitem_name,
    descripcion: frm.descripcion,
    cantidad_recibida: frm.cantidad_recibida
  });
  
  // Guardar en cache
  store.saveCache();
  
  // Limpiar el formulario para el siguiente producto
  formularioLimpio.value = true;
  frm.vendor = '';
  frm.producto = '';
  frm.lineitem_name = '';
  frm.descripcion = '';
  frm.cantidad_recibida = 0;
  
  // Mensaje de confirmación
  alert('✅ Producto guardado. Haz clic en "Nuevo" para agregar otro.');
}

const pedida = computed(() => store.pedidoMap[frm.producto?.trim()]?.cantidad_pedida ?? 0)
const existeEnPedido = computed(() => !!store.pedidoMap[frm.producto?.trim()])
const recibidaAcum = computed(() => store.recibidoPorProducto[frm.producto?.trim()] ?? 0)
const faltante = computed(() => Math.max(0, pedida.value - recibidaAcum.value))

function estadoPorValores(pedida: number, recibida: number) {
  if (recibida === 0) return 'sin recibir'
  if (recibida < pedida) return 'parcial'
  if (recibida === pedida) return 'completa'
  return 'excedente'
}
const estadoActual = computed(() => estadoPorValores(pedida.value, recibidaAcum.value))

function autoFillFromPedido(){
  const base = store.pedidoMap[frm.producto?.trim()]
  if (base) {
    // Solo llenar campos vacíos del formulario (no actualiza el store hasta guardar)
    if (!frm.lineitem_name) frm.lineitem_name = base.lineitem_name || base.descripcion || ''
    if (!frm.descripcion)   frm.descripcion   = base.descripcion || base.lineitem_name || ''
    if (!frm.vendor)        frm.vendor        = base.vendor || ''
  }
}

const valido = computed(() => !!frm.producto?.trim() && Number.isFinite(frm.cantidad_recibida) && frm.cantidad_recibida >= 0)
const puedeSiguiente = computed(() => store.recepciones.length > 0 && valido.value)

async function finalizarRecepcion(){
  if(!store.ordenId){ 
    alert('❌ Debes asignar un Orden ID antes de finalizar.'); 
    return 
  }
  
  // Construir payload desde los ítems en memoria (solo con producto informado)
  const payload = store.recepciones
    .map(r => ({
      vendor: (r.vendor ?? '').trim(),
      producto: (r.producto ?? '').trim(),
      lineitem_name: (r.lineitem_name ?? '').trim(),
      descripcion: (r.descripcion ?? '').trim(),
      cantidad_recibida: Number(r.cantidad_recibida) || 0
    }))
    .filter(it => it.producto)

  if(payload.length === 0){
    alert('⚠️ No hay artículos válidos para guardar.');
    return
  }

  const confirmar = confirm(`¿Finalizar la carga de recepción?\n\n📋 Orden: ${store.ordenId}\n📦 Artículos a enviar: ${payload.length}\n\nSe realizará un guardado masivo y luego se cargará el comparativo.`)
  if(!confirmar) return

  loading.value = true
  try {
    // RPC 1: insertar_recepcion_json (public)
    const { error: errUpsert } = await supabase.rpc('insertar_recepcion_json', {
      p_orden_id: store.ordenId,
      p_items: payload
    })
    if (errUpsert) {
      console.error('[finalizarRecepcion] insertar_recepcion_json error', errUpsert)
      alert(`❌ Error al guardar recepción`)
      return
    }

    // RPC 2: get_comparativo_recepcion (public)
    const { data: comparativo, error: errComp } = await supabase.rpc('get_comparativo_recepcion', {
      p_orden_id: store.ordenId
    })
    if (errComp) {
      console.error('[finalizarRecepcion] get_comparativo_recepcion error', errComp)
      alert(`❌ Error al cargar comparativo`)
      return
    }

    // Actualizar store y navegar a resumen
    store.setComparativo(comparativo as any[])
    alert('✅ Recepción guardada y comparativo actualizado')

    // Limpiar edición temporal y borrar cache local de esta orden
    if (typeof (store as any).clearRecepcionTemporal === 'function') {
      ;(store as any).clearRecepcionTemporal()
    }
    if (typeof (store as any).clearCache === 'function') {
      ;(store as any).clearCache()
    }

    router.push({ name: 'recepcion-resumen' })
  } catch (e: any) {
    console.error('[finalizarRecepcion] unexpected error', e)
    alert(`❌ Error al finalizar: ${e?.message || e}`)
  } finally {
    loading.value = false
  }
}

// Estilos
function badgeClass(s: string){
  const base = "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
  switch(s){
    case "completa": return base+" bg-green-100 text-green-800"
    case "parcial": return base+" bg-amber-100 text-amber-800"
    case "excedente": return base+" bg-blue-100 text-blue-800"
    case "sin recibir": return base+" bg-slate-100 text-slate-700"
    default: return base+" bg-slate-100 text-slate-700"
  }
}
</script>

<style scoped>
.input { @apply w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-300; }
.label { @apply block text-sm font-medium; }
.btn { @apply rounded-lg px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50; }
.btn-outline { @apply rounded-lg px-3 py-2 border hover:bg-gray-50 disabled:opacity-50; }
.btn-danger { @apply rounded-lg px-3 py-2 bg-rose-600 text-white hover:bg-rose-700; }
.link { @apply underline hover:no-underline; }
.th { @apply text-left px-3 py-2 font-semibold; }
.td { @apply px-3 py-1; }
.hint { @apply text-xs text-rose-700 mt-1; }

/* Botones de acción en tabla */
.action-btn {
  @apply px-2 py-1 text-xs font-medium rounded transition-all;
  @apply border border-transparent;
}
.action-btn-primary {
  @apply bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-300;
}
.action-btn-danger {
  @apply bg-rose-50 text-rose-700 hover:bg-rose-100 hover:border-rose-300;
}
</style>
