import Requerimientos from "@/pages/Reportes/Requerimientos.vue";
import FaltantesCliente from "@/pages/Reportes/FaltantesCliente.vue";
import FaltantesPedido from "@/pages/Reportes/FaltantesPedido.vue";
import Recepciones from "@/pages/Recepciones/Index.vue";
import PorCliente from "@/pages/Consultas/PorCliente.vue";

export const routes = [
  { path: "/", redirect: "/reportes/requerimientos" },
  { path: "/reportes/requerimientos", component: Requerimientos },
  { path: "/reportes/faltantes-cliente", component: FaltantesCliente },
  { path: "/reportes/faltantes-pedido", component: FaltantesPedido },
  { path: "/recepciones", component: Recepciones },
  { path: "/consultas/cliente", component: PorCliente }
];
