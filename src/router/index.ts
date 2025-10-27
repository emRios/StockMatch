// Páginas existentes
import Requerimientos from "@/pages/Reportes/Requerimientos.vue";
// import FaltantesCliente from "@/pages/Reportes/FaltantesCliente.vue";
import FaltantesPedido from "@/pages/Reportes/FaltantesPedido.vue";
import Recepciones from "@/pages/Recepciones/Index.vue";
// import PorCliente from "@/pages/Consultas/PorCliente.vue";

// NUEVAS vistas hijas de /recepciones
import RecepcionPedidosGrid from "@/components/RecepcionPedidosGrid.vue";
import RecepcionWizard from "@/components/RecepcionWizard.vue";
import RecepcionGrid from "@/components/RecepcionGrid.vue";

export const routes = [
  // Home → reportes (no lo tocamos)
  { path: "/", redirect: "/reportes/requerimientos" },

  // Reportes (ya existentes)
  { path: "/reportes/requerimientos", component: Requerimientos },
  // { path: "/reportes/faltantes-cliente", component: FaltantesCliente }, // removido por solicitud
  { path: "/reportes/faltantes-pedido", component: FaltantesPedido },

  // Recepciones (layout contenedor) + rutas hijas
  {
    path: "/recepciones",
    component: Recepciones, // /pages/Recepciones/Index.vue
    children: [
      { path: "", redirect: "/recepciones/pedidos" },
      { path: "pedidos", name: "recepcion-pedidos", component: RecepcionPedidosGrid },
      { path: "wizard",  name: "recepcion-wizard",  component: RecepcionWizard },
      { path: "resumen", name: "recepcion-resumen", component: RecepcionGrid },
    ],
  },

  // Consultas (removidas por solicitud)

  // (Opcional) 404 básico
  // { path: "/:pathMatch(.*)*", component: NotFoundPage },
];
