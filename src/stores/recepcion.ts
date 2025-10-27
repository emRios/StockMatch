import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabase'

export type PedidoItem = {
  producto: string
  lineitem_name?: string
  descripcion?: string
  vendor?: string
  cantidad_pedida: number
}

export type RecepcionItem = {
  uid: string
  vendor: string
  producto: string
  lineitem_name: string
  descripcion: string
  cantidad_recibida: number
}

type ComparativoRow = {
  orden_id: string
  producto: string
  lineitem_name: string | null
  descripcion: string | null
  vendor: string | null
  articulos_pedidos: number
  articulos_enviados: number
  diferencia: number
  estado: 'sin recibir'|'parcial'|'completa'|'excedente'|'no pedido'|'desconocido'
}

type State = {
  ordenId: string
  pedido: PedidoItem[]
  recepciones: RecepcionItem[]
  idxActual: number
  comparativo: ComparativoRow[]
}

const SEP = (txt: string) => (txt.includes('\t') ? '\t' : ',')

function parseCSVFlexible(txt: string): string[][] {
  const sep = SEP(txt)
  const rows = txt.replace(/\r/g,'').split('\n').map(l=>l.trim()).filter(Boolean)
  if (!rows.length) return []
  const arr = rows.map(l=>l.split(sep).map(c=>c.trim()))
  const H = arr[0].map(x=>x.toLowerCase())
  const hasHeader = ['vendor','producto','lineitem_name','descripcion','cantidad','cantidad_pedida','cantidad_recibida'].some(k=>H.includes(k))
  return hasHeader ? arr.slice(1) : arr
}

function uuid() { return crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) }

export const useRecepcionStore = defineStore('recepcion', {
  state: (): State => ({
    ordenId: '',
    pedido: [],
    recepciones: [],
    idxActual: 0,
    comparativo: [],
  }),

  getters: {
    pedidoMap(state): Record<string, PedidoItem> {
      const m: Record<string, PedidoItem> = {}
      for (const p of state.pedido) m[p.producto.trim()] = p
      return m
    },
    recibidoPorProducto(state): Record<string, number> {
      const acc: Record<string, number> = {}
      for (const r of state.recepciones) {
        const k = r.producto.trim()
        acc[k] = (acc[k] ?? 0) + (Number.isFinite(r.cantidad_recibida) ? r.cantidad_recibida : 0)
      }
      return acc
    },
    totalPedido(): number { return this.pedido.reduce((s, p) => s + p.cantidad_pedida, 0) },
    totalRecibido(): number {
      return Object.values(this.recibidoPorProducto).reduce((s, n) => s + n, 0)
    },
    actual(): RecepcionItem | null {
      return this.recepciones.length ? this.recepciones[this.idxActual] : null
    },
    difByProducto(): Array<{producto:string; nombre:string; billingName?: string; vendor?: string; pedida:number; enviada:number; diff:number; estado:string}> {
      const rows = (this.comparativo.length
        ? this.comparativo.map((r: any) => {
            // Toma columnas del RPC y admite alias comunes por si difieren en el esquema
            const producto = r.producto
            const nombre = r.lineitem_name || r.descripcion || ''
            const billingName = r.billing_name || r.billingName || undefined
            const vendor = r.vendor || undefined
            const pedida = Number(r.articulos_pedidos ?? r.pedidos ?? r.cantidad_pedida ?? 0)
            const enviada = Number(r.articulos_enviados ?? r.enviado ?? r.cantidad_recibida ?? 0)
            const diff = Number(r.diferencia ?? (enviada - pedida))
            const estado = (r.estado
              ?? (enviada === 0
                    ? 'sin recibir'
                    : enviada < pedida
                      ? 'parcial'
                      : enviada === pedida
                        ? 'completa'
                        : 'excedente')) as string
            return { producto, nombre, billingName, vendor, pedida, enviada, diff, estado }
          })
        : this.pedido.map(p => {
            const enviada = this.recibidoPorProducto[p.producto] ?? 0
            const diff = enviada - p.cantidad_pedida
            let estado: string = 'desconocido'
            if (enviada === 0) estado = 'sin recibir'
            else if (enviada < p.cantidad_pedida) estado = 'parcial'
            else if (enviada === p.cantidad_pedida) estado = 'completa'
            else estado = 'excedente'
            return { producto: p.producto, nombre: p.lineitem_name || p.descripcion || '', billingName: undefined, vendor: undefined, pedida: p.cantidad_pedida, enviada, diff, estado }
          })
      )
      // Emular WHERE diferencia > 0 en el frontend para este resumen
      return rows.filter(r => r.diff > 0)
    },
  },

  actions: {
    setOrdenId(id: string) {
      this.ordenId = id
      try { localStorage.setItem('recepcion:currentOrdenId', id) } catch {}
    },
    setComparativo(data: any[]) { this.comparativo = (data ?? []) as any },
    clearRecepcionTemporal(){
      this.recepciones = []
      this.idxActual = 0
      this.saveCache()
    },

    // Cache local
    keyCache(){ return `recepcion:${this.ordenId || 'default'}` },
    saveCache(){
      if(!this.ordenId) return
      const data = { pedido: this.pedido, recepciones: this.recepciones, idxActual: this.idxActual }
      localStorage.setItem(this.keyCache(), JSON.stringify(data))
    },
    loadCache(){
      if(!this.ordenId) return
      const raw = localStorage.getItem(this.keyCache()); if(!raw) return
      try{
        const d = JSON.parse(raw)
        this.pedido = (d.pedido ?? [])
        this.recepciones = (d.recepciones ?? [])
        this.idxActual = Math.min(Number(d.idxActual ?? 0), Math.max(0, this.recepciones.length - 1))
      }catch{}
    },
    clearCache(){ if(this.ordenId) localStorage.removeItem(this.keyCache()) },

    // Importar Pedido (Tarea 1) desde CSV (cliente)
    importPedidoFromCSV(text: string) {
      const rows = parseCSVFlexible(text)
      const out: PedidoItem[] = rows.map(r => ({
        producto:        (r[0] ?? '').trim(),
        lineitem_name:   (r[1] ?? '').trim(),
        descripcion:     (r[2] ?? '').trim(),
        vendor:          (r[3] ?? '').trim(),
        cantidad_pedida: Number(r[4] ?? 0) || 0,
      })).filter(x => x.producto)
      // agrupa por producto
      const agg = new Map<string, PedidoItem>()
      for (const it of out) {
        const k = it.producto
        const prev = agg.get(k)
        if (!prev) agg.set(k, { ...it })
        else prev.cantidad_pedida += it.cantidad_pedida
      }
      this.pedido = Array.from(agg.values())
      this.saveCache()
    },

    // Importar Recepción masiva (cliente) — vendor, producto, lineitem_name, descripcion, Cantidad
    importRecepcionFromCSV(text: string) {
      const rows = parseCSVFlexible(text)
      this.recepciones = rows.map(r => ({
        uid: uuid(),
        vendor:         (r[0] ?? '').trim(),
        producto:       (r[1] ?? '').trim(),
        lineitem_name:  (r[2] ?? '').trim(),
        descripcion:    (r[3] ?? '').trim(),
        cantidad_recibida: Number(r[4] ?? 0) || 0,
      })).filter(x => x.producto)
      this.idxActual = this.recepciones.length ? 0 : 0
      this.saveCache()
    },

    // Persistir en Supabase (pedido/recepción/comparativo)
    async upsertPedidoBaseEnDB(){
      // sube pedido actual al detalle app.pedido_base
      const payload = this.pedido.map(p => ({
        orden_id: this.ordenId, producto: p.producto, lineitem_name: p.lineitem_name,
        descripcion: p.descripcion, vendor: p.vendor, cantidad_pedida: p.cantidad_pedida
      }))
      const { error } = await supabase.from('app.pedido_base').upsert(payload, { onConflict: 'orden_id,producto' })
      if (error) throw error
    },

    async upsertRecepcionEnDB(){
      const payload = this.recepciones.map(r => ({
        orden_id: this.ordenId, vendor: r.vendor, producto: r.producto,
        lineitem_name: r.lineitem_name, descripcion: r.descripcion, cantidad_recibida: r.cantidad_recibida
      }))
      const { error } = await supabase.from('app.recepcion_staging').upsert(payload, { onConflict: 'orden_id,producto' })
      if (error) throw error
    },

    async fetchComparativo(){
      const { data, error } = await supabase
        .rpc('get_comparativo_recepcion', { p_orden_id: this.ordenId })
      if (error) throw error
      this.comparativo = data as any
    },

    // Wizard helpers
    agregarNuevo(){
      this.recepciones.push({ uid: uuid(), vendor:'', producto:'', lineitem_name:'', descripcion:'', cantidad_recibida:0 })
      this.idxActual = this.recepciones.length-1
      this.saveCache()
    },
    eliminar(i: number){
      if(i<0 || i>=this.recepciones.length) return
      this.recepciones.splice(i,1)
      this.idxActual = Math.max(0, Math.min(this.idxActual, this.recepciones.length-1))
      this.saveCache()
    },
    actualizarActual(p: Partial<RecepcionItem>){
      const cur = this.actual; if(!cur) return
      Object.assign(cur, p); this.saveCache()
    },
    irA(i:number){ if(i>=0 && i<this.recepciones.length){ this.idxActual=i; this.saveCache() } },
    irPrev(){ if(this.idxActual>0){ this.idxActual--; this.saveCache() } },
    irNext(){ if(this.idxActual < this.recepciones.length-1){ this.idxActual++ } else { this.agregarNuevo() } this.saveCache() },
    seleccionarPorProducto(prod: string){
      let i = this.recepciones.findIndex(r => r.producto.trim() === prod.trim())
      if (i < 0) {
        const base = this.pedidoMap[prod]
        this.recepciones.push({
          uid: uuid(), vendor: base?.vendor || '', producto: prod,
          lineitem_name: base?.lineitem_name || base?.descripcion || '',
          descripcion: base?.descripcion || '', cantidad_recibida: 0
        })
        i = this.recepciones.length-1
      }
      this.idxActual = i; this.saveCache()
    },
  },
})
