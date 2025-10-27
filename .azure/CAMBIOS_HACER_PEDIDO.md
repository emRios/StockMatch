# 📦 Cambios: Mover "Hacer Pedido" a Requerimientos

## 🎯 Objetivo
Mover la funcionalidad de "Hacer Pedido" desde el Wizard de Recepciones hacia la página de **Requerimientos de Proveedor**.

---

## ✅ Cambios Implementados

### 1️⃣ **Requerimientos de Proveedor** (`src/pages/Reportes/Requerimientos.vue`)

#### **Botón "Hacer Pedido" agregado**
```vue
<button class="btn-warning" :disabled="!allRows.length || !vendor" @click="hacerPedido">
  📦 Hacer Pedido
</button>
```

**Ubicación:** Entre "🔍 Consultar" y "💾 Descargar CSV"

**Estado:** 
- ✅ **Habilitado** cuando hay datos (`allRows.length > 0`) Y se especificó un proveedor
- ❌ **Deshabilitado** si no hay datos o no hay proveedor seleccionado

---

#### **Función `hacerPedido()`**

**Flujo:**

1. **Validaciones:**
   - Verifica que exista un `vendor` especificado
   - Verifica que existan datos en `allRows`

2. **Prompt para Orden ID:**
   ```javascript
   const ordenId = prompt(
     `Ingresa el ID de la orden para el proveedor "${vendor.value}":`, 
     `OC-${vendor.value}-${new Date().getFullYear()}`
   );
   ```

3. **Crear registro en `pedidos_curso`:**
   ```javascript
   await pedidosStore.crear(
     ordenId.trim(), 
     vendor.value, 
     'Pedido generado desde Requerimientos'
   );
   ```

4. **Insertar productos en `pedido_base`:**
   - Solo productos con `a_pedir > 0`
   - Campos: `orden_id`, `producto`, `lineitem_name`, `descripcion`, `vendor`, `cantidad_pedida`
   - Usa `upsert` con conflicto en `(orden_id, producto)`

5. **Notificaciones:**
   - ✅ Mensaje de éxito con resumen (Orden, Proveedor, # de productos)
   - ❌ Mensaje de error si falla

---

### 2️⃣ **Wizard de Recepciones** (`src/components/RecepcionWizard.vue`)

#### **Eliminado:**
- ❌ Sección completa "Pedido base" (importar CSV de pedidos)
- ❌ Botón "Hacer Pedido"
- ❌ Función `hacerPedido()`
- ❌ Función `onLoadPedidoCSV()`
- ❌ Input file `pedidoRef`
- ❌ Import de `usePedidosStore`

#### **Mantenido:**
- ✅ Input "Orden ID" (para asociar recepción a pedido existente)
- ✅ Botones "Cargar cache" y "Limpiar cache"
- ✅ Sección "Recepción masiva (CSV)"
- ✅ Wizard manual de captura
- ✅ Botón "Finalizar Carga"

---

## 🔄 Flujo de Trabajo Actualizado

### **Antes:**
```
Requerimientos → Consultar → Descargar CSV
                    ↓
              (manualmente)
                    ↓
Recepciones → Wizard → Importar Pedido CSV → Hacer Pedido → Importar Recepción
```

### **Después:**
```
Requerimientos → Consultar → 📦 Hacer Pedido (guarda en DB)
                                      ↓
Recepciones → Pedidos en curso → Seleccionar pedido → Wizard → Importar Recepción CSV
```

---

## 📊 Tablas Modificadas

### `app.pedidos_curso`
**Acción:** INSERT
```sql
{
  orden_id: 'OC-ACME-2025',
  vendor: 'ACME',
  estado: 'nuevo',
  notas: 'Pedido generado desde Requerimientos',
  created_at: NOW(),
  updated_at: NOW()
}
```

### `app.pedido_base`
**Acción:** UPSERT (conflict: orden_id + producto)
```sql
{
  orden_id: 'OC-ACME-2025',
  producto: 'SKU001',
  lineitem_name: 'Producto A',
  descripcion: 'Descripción del producto',
  vendor: 'ACME',
  cantidad_pedida: 50
}
```

---

## 🎨 Estilos Nuevos

```css
.btn-warning { 
  @apply px-6 py-2.5 rounded-lg font-medium transition-all;
  @apply bg-amber-600 text-white hover:bg-amber-700 active:scale-95;
  @apply shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed;
}
```

**Color:** Ámbar (diferenciado de azul "Consultar" y verde "Descargar")

---

## ✅ Verificación

**Build exitoso:**
```
✓ 148 modules transformed.
dist/assets/index-kiagY9lG.js   297.54 kB │ gzip: 91.33 kB
✓ built in 3.50s
```

**Imports agregados:**
- `import { usePedidosStore } from "@/stores/pedidos"` en Requerimientos.vue

**Imports removidos:**
- `import { usePedidosStore } from "@/stores/pedidos"` de RecepcionWizard.vue

---

## 🧪 Cómo Probar

1. **Ir a "Reportes > Requerimientos de Proveedor"**
2. **Ingresar un proveedor** (ej: "ACME")
3. **Click en "🔍 Consultar"** → Debe mostrar productos con `a_pedir > 0`
4. **Click en "📦 Hacer Pedido"**
5. **Ingresar ID de orden** (ej: "OC-ACME-2025")
6. **Verificar mensaje:** "✅ Pedido creado exitosamente"
7. **Ir a "Recepciones > Pedidos en curso"**
8. **Verificar** que aparece el nuevo pedido con estado "nuevo"
9. **Click en "Continuar recepción"** → Abre el Wizard con la orden ID precargada
10. **Importar CSV de recepción** y finalizar

---

## 📝 Notas Importantes

- ⚠️ El botón está **deshabilitado** si no se especifica proveedor
- ⚠️ Solo se guardan productos con `a_pedir > 0`
- ✅ El Wizard ahora solo maneja **recepción** (no creación de pedidos)
- ✅ El flujo queda más claro: **Pedidos → Requerimientos**, **Recepciones → Wizard**
