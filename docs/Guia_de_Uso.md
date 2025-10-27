# Guía de uso de AbastoFlow

Esta guía resume cómo levantar el proyecto, ejecutar los flujos principales (Requerimientos → Pedido → Recepción → Resumen) y resolver incidencias frecuentes con Supabase.

## 1) Requisitos previos

- Node.js 18+ y npm
- Cuenta y proyecto en Supabase con las funciones y tablas requeridas
- Variables de entorno para el cliente JS de Supabase

## 2) Configuración rápida

1. Instala dependencias

```powershell
npm install
```

2. Crea un archivo `.env` en la raíz con:

```dotenv
VITE_SUPABASE_URL=tu_url
VITE_SUPABASE_ANON_KEY=tu_key
```

3. Ejecuta en desarrollo

```powershell
npm run dev
```

4. Compila para producción (opcional)

```powershell
npm run build
```

## 3) Flujo de trabajo

### 3.1 Reportes → Requerimientos

- Filtra por proveedor (opcional) y pulsa “Consultar”.
- Botones:
  - “📦 Hacer Pedido”: invoca el RPC `public.crear_pedido_desde_requerimientos(p_refresh_mv boolean)` pasando `p_refresh_mv = false` para evitar ambigüedad de sobrecarga. Devuelve un `orden_id`.
  - “💾 Descargar CSV”: exporta la tabla actual.

Si el pedido se crea correctamente, se muestra el `orden_id` y puedes continuar en Recepciones.

### 3.2 Recepciones → Pedidos en curso

- Lista los pedidos con filtro por estado.
- Acciones por fila (alineadas en una sola línea):
  - “Ver comparativo”: fija `ordenId` en el store, consulta RPC `get_comparativo_recepcion` y te lleva a “Resumen”.
  - “Continuar recepción”: fija `ordenId`, carga caché local si existe y abre el Wizard.

Nota: El `Orden ID` del Wizard se autoasigna al entrar desde esta grilla.

### 3.3 Recepciones → Wizard

- Se usa para capturar artículos recibidos de la OC.
- Botones importantes:
  - “Nuevo”: agrega un renglón para captura manual.
  - “Guardar Cambios”: persiste en el estado local del Wizard (no en DB).
  - “Finalizar Carga”:
    1) Llama `public.insertar_recepcion_json(p_orden_id, p_items)` para guardar masivo.
    2) Llama `public.get_comparativo_recepcion(p_orden_id)` para refrescar la vista.
    3) Limpia la edición temporal y borra el caché local de la orden.
    4) Navega al “Resumen”.
- Caché (localStorage) — por cada `ordenId`:
  - “Cargar cache”: restaura `pedido[]`, `recepciones[]` e `idxActual`.
  - “Limpiar cache”: borra la entrada local.

### 3.4 Resumen de Recepción — Comparativo

- Tarjetas muestran SKUs, total pedido y total enviado (si hay comparativo; de lo contrario, valores locales).
- Tabla muestra sólo filas con diferencia `> 0` (faltantes) y resalta el estado.
- Columnas incluyen Billing Name y Vendor cuando los provee el RPC.
- Botón “Descargar PDF”: genera un PDF de una página por fila (faltantes), con Billing Name como encabezado.

## 4) Decisiones UI recientes

- Se eliminó “Consultas → Por Cliente” del menú y su ruta.
- Se eliminó el botón “Importar Recepción CSV” del Wizard.
- En "Pedidos en curso", las acciones aparecen en línea: “Ver comparativo | Continuar recepción”.

## 5) Solución de problemas

### 5.1 Error PGRST203 (ambigüedad de función)

Mensaje: `Could not choose the best candidate function ... crear_pedido_desde_requerimientos()`

Causa: Existen dos funciones homónimas: una con parámetro boolean y otra sin parámetros. PostgREST no puede elegir.

Solución en el frontend (ya aplicado): llamar con parámetro explícito

```ts
await supabase.rpc('crear_pedido_desde_requerimientos', { p_refresh_mv: false })
```

Si quieres refrescar la MV, usa `true`.

### 5.2 Error 42P10 “no unique or exclusion constraint matching the ON CONFLICT”

Ocurre cuando un `INSERT ... ON CONFLICT` apunta a columnas sin `UNIQUE`/`PRIMARY KEY` o a un constraint inexistente.

En esta función se usan:
- `public.pedidos_cliente`: `ON CONFLICT (numero_pedido)`
- `public.pedidos_cliente_detalle`: `ON CONFLICT (numero_pedido, sku)`

Crea los índices/constraints:

```sql
-- Índices únicos (o constraints) requeridos por el RPC
create unique index if not exists ux_pedidos_cliente_numero_pedido
  on public.pedidos_cliente (numero_pedido);

create unique index if not exists ux_pedidos_cliente_detalle_pedido_sku
  on public.pedidos_cliente_detalle (numero_pedido, sku);

-- (Opcional) convertirlos en constraints con nombre
alter table public.pedidos_cliente
  add constraint pedidos_cliente_numero_pedido_key
  unique using index ux_pedidos_cliente_numero_pedido;

alter table public.pedidos_cliente_detalle
  add constraint pedidos_cliente_detalle_pedido_sku_key
  unique using index ux_pedidos_cliente_detalle_pedido_sku;
```

Si falla por duplicados, detecta y consolida:

```sql
-- Duplicados cabecera
select numero_pedido, count(*)
from public.pedidos_cliente
group by 1
having count(*) > 1;

-- Duplicados detalle
select numero_pedido, sku, count(*)
from public.pedidos_cliente_detalle
group by 1,2
having count(*) > 1;
```

Para el resto del flujo, también es recomendable (si aún no se tienen) unicidad en:

```sql
-- app: soporte de upserts usados por la app
create unique index if not exists ux_pedidos_curso_orden on app.pedidos_curso (orden_id);
create unique index if not exists ux_pedido_base_orden_producto on app.pedido_base (orden_id, producto);
create unique index if not exists ux_recepcion_staging_orden_producto on app.recepcion_staging (orden_id, producto);
```

### 5.3 Resumen vacío o sin fila esperada

- Asegúrate de tener `ordenId` activo (se autoasigna desde “Pedidos en curso”).
- El Resumen acepta `?orden=` o `?orden_id=` en la URL y también intenta restaurar `recepcion:currentOrdenId` desde localStorage.
- El frontend filtra `diff > 0`; verifica en DB que la función ya calcule `diferencia` como esperas.

## 6) Referencias de RPC/Tablas

- RPCs:
  - `public.crear_pedido_desde_requerimientos(p_refresh_mv boolean)`
  - `public.get_requerimientos_proveedor(p_vendor text|null)`
  - `public.insertar_recepcion_json(p_orden_id text, p_items json)`
  - `public.get_comparativo_recepcion(p_orden_id text)`
- Tablas clave:
  - `public.pedidos_cliente`, `public.pedidos_cliente_detalle`, `public.clientes_billing`
  - `app.pedidos_curso`, `app.pedido_base`, `app.recepcion_staging`

## 7) Notas de rendimiento

- La generación de PDF agrega peso a los bundles; Vite puede advertir por chunks >500kB. Si es necesario, se puede aplicar code-splitting o `manualChunks`.

---

¿Quieres que agreguemos capturas de pantalla o una guía rápida de "prueba de punta a punta" con datos de ejemplo? Puedo extender esta guía cuando lo indiques.