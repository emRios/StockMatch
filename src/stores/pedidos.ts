import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabase'

export type PedidoCurso = {
  orden_id: string
  vendor: string | null
  estado: 'nuevo'|'en_proceso'|'finalizado'|'cerrado'
  notas: string | null
  created_at: string
  updated_at: string
}

type State = {
  items: PedidoCurso[]
  loading: boolean
}

export const usePedidosStore = defineStore('pedidos', {
  state: (): State => ({ items: [], loading: false }),
  actions: {
    async listar(estado?: string){
      this.loading = true
      
      // Usar el RPC get_pedidos_en_curso
      const { data, error } = await supabase.rpc("get_pedidos_en_curso")
      
      this.loading = false
      
      if (error) {
        console.error("Error al obtener pedidos en curso:", error)
        throw error
      }
      
      // Aplicar filtro de estado si fue proporcionado
      let pedidos = (data ?? []) as PedidoCurso[]
      if (estado) {
        pedidos = pedidos.filter(p => p.estado === estado)
      }
      
      this.items = pedidos
    },
    async crear(orden_id: string, vendor?: string|null, notas?: string|null){
      const now = new Date().toISOString()
      const { data, error } = await supabase.from('app.pedidos_curso').upsert([{
        orden_id, vendor: vendor ?? null, estado: 'nuevo', notas: notas ?? null, created_at: now, updated_at: now
      }])
      if (error) throw error
      return data
    },
    async actualizarEstado(orden_id: string, estado: PedidoCurso['estado']){
      const { error } = await supabase.from('app.pedidos_curso')
        .update({ estado, updated_at: new Date().toISOString() })
        .eq('orden_id', orden_id)
      if (error) throw error
    }
  }
})
