<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">Resumen de Recepción — Comparativo</h1>
      <div class="flex items-center gap-2">
        <button class="btn-outline" @click="exportPdf" :disabled="!rows.length">Descargar PDF</button>
        <router-link class="btn-outline" :to="{ name: 'recepcion-wizard' }">Volver al Wizard</router-link>
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
      <div class="stat"><span class="stat-label">SKUs en pedido</span><span class="stat-value">{{ skusPedido }}</span></div>
      <div class="stat"><span class="stat-label">Total pedido</span><span class="stat-value">{{ nf(totalPedido) }}</span></div>
      <div class="stat"><span class="stat-label">Total enviado</span><span class="stat-value">{{ nf(totalEnviado) }}</span></div>
    </div>

    <div class="rounded-xl border overflow-auto">
      <table class="min-w-full text-sm">
        <thead class="bg-gray-50">
          <tr>
            <th class="th">Producto</th>
            <th class="th">Nombre</th>
            <th class="th">Billing Name</th>
            <th class="th text-right">Artículos pedidos</th>
            <th class="th text-right">Artículos enviados</th>
            <th class="th text-right">Diferencia</th>
            <th class="th">Estado</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in rows"
            :key="row.producto"
            class="odd:bg-white even:bg-gray-50 hover:bg-blue-50 cursor-pointer"
            @click="editar(row.producto)"
          >
            <td class="td">{{ row.producto }}</td>
            <td class="td">{{ row.nombre }}</td>
            <td class="td">{{ row.billingName || '' }}</td>
            <td class="td text-right">{{ nf(row.pedida) }}</td>
            <td class="td text-right" :class="row.diff!==0 ? 'text-rose-700 font-semibold' : ''">
              {{ nf(row.enviada) }}
            </td>
            <td class="td text-right" :class="row.diff!==0 ? 'text-rose-700 font-semibold' : ''">
              {{ nf(row.diff) }}
            </td>
            <td class="td"><span :class="badgeClass(row.estado)">{{ row.estado }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>

    <p class="text-sm text-gray-600">
      * En <span class="text-rose-700 font-semibold">rojo</span> se marcan diferencias: enviados ≠ pedidos. Clic para editar en el Wizard.
    </p>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRecepcionStore } from '@/stores/recepcion'
import { useRouter, useRoute } from 'vue-router'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const store = useRecepcionStore()
const router = useRouter()
const route = useRoute()
const nf = (n: number) => new Intl.NumberFormat().format(n)
const rows = computed(() => store.difByProducto)

// Totales del resumen: usar comparativo si existe; si no, caer al estado local
const tieneComparativo = computed(() => store.comparativo.length > 0)
const skusPedido = computed(() => tieneComparativo.value
  ? store.comparativo.filter((r: any) => Number(r.articulos_pedidos ?? r.pedidos ?? r.cantidad_pedida ?? 0) > 0).length
  : store.pedido.length
)
const totalPedido = computed(() => tieneComparativo.value
  ? store.comparativo.reduce((s: number, r: any) => s + Number(r.articulos_pedidos ?? r.pedidos ?? r.cantidad_pedida ?? 0), 0)
  : store.totalPedido
)
const totalEnviado = computed(() => tieneComparativo.value
  ? store.comparativo.reduce((s: number, r: any) => s + Number(r.articulos_enviados ?? r.enviado ?? r.cantidad_recibida ?? 0), 0)
  : store.totalRecibido
)

function editar(producto: string){
  store.seleccionarPorProducto(producto)
  router.push({ name: 'recepcion-wizard' })
}

function badgeClass(s: string){
  const base = "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
  switch(s){
    case "completa": return base+" bg-green-100 text-green-800"
    case "parcial": return base+" bg-amber-100 text-amber-800"
    case "excedente": return base+" bg-blue-100 text-blue-800"
    case "no pedido": return base+" bg-gray-200 text-gray-700"
    case "sin recibir": return base+" bg-slate-100 text-slate-700"
    default: return base+" bg-slate-100 text-slate-700"
  }
}

onMounted(async () => {
  try {
    if (!store.ordenId) {
      // 1) Query string ?orden=... o ?orden_id=...
      const qOrden = (route.query.orden as string) || (route.query.orden_id as string) || ''
      if (qOrden) store.setOrdenId(qOrden)

      // 2) Fallback al último orden usado
      const last = localStorage.getItem('recepcion:currentOrdenId') || ''
      if (!store.ordenId && last) store.setOrdenId(last)
    }
    if (store.ordenId) await store.fetchComparativo()
  } catch {}
})

async function exportPdf(){
  const data = rows.value
  if (!data.length) { alert('No hay filas para exportar'); return }

  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const margin = 40, line = 18
  const today = new Date().toLocaleString()
  const orden = store.ordenId || '-'

  data.forEach((r, idx) => {
    if (idx > 0) doc.addPage()

    // Encabezado
    doc.setFont('helvetica', 'bold'); doc.setFontSize(16)
    doc.text(r.billingName || '—', margin, margin)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(11)
    doc.text(`Resumen de Recepción — Faltantes`, margin, margin + line)
    doc.text(`Orden: ${orden}`, margin, margin + line*2)
    doc.text(`Generado: ${today}`, margin, margin + line*3)

    // Detalle principal del SKU
    const infoRows = [
      ['Producto', r.producto],
      ['Nombre', r.nombre || ''],
      ['Proveedor', r.vendor || ''],
    ]
    autoTable(doc, {
      startY: margin + line*4,
      head: [['Campo','Valor']],
      body: infoRows,
      styles: { fontSize: 11 },
      headStyles: { fillColor: [15, 23, 42] },
      theme: 'striped',
      margin: { left: margin, right: margin },
      tableWidth: 'auto'
    })

    const startY2 = (doc as any).lastAutoTable.finalY + 12
    autoTable(doc, {
      startY: startY2,
      head: [['Artículos pedidos','Artículos enviados','Diferencia','Estado']],
      body: [[ nf(r.pedida), nf(r.enviada), nf(r.diff), r.estado ]],
      styles: { fontSize: 12 },
      headStyles: { fillColor: [2, 132, 199] },
      theme: 'grid',
      margin: { left: margin, right: margin },
      tableWidth: 'auto'
    })

    // Pie de página
    const pageCount = (doc as any).getNumberOfPages()
    doc.setFontSize(9)
    doc.text(`Página ${idx+1} de ${data.length}`, 595 - margin, 842 - margin/2, { align: 'right' })
  })

  const file = `faltantes_${orden || 'orden'}.pdf`
  doc.save(file)
}
</script>

<style scoped>
.btn-outline { @apply rounded-lg px-3 py-2 border hover:bg-gray-50; }
.th { @apply text-left px-3 py-2 font-semibold; }
.td { @apply px-3 py-1; }
.stat { @apply p-3 rounded-lg border bg-white; }
.stat-label { @apply block text-gray-500; }
.stat-value { @apply text-lg font-semibold; }
</style>
