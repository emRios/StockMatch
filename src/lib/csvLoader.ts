/**
 * Carga y procesa archivos CSV locales
 */

type Pedido = {
  'Lineitem sku': string;
  'Lineitem quantity': number;
  'Lineitem name'?: string;
  'Vendor'?: string;
};

type Inventario = {
  'Producto': string;
  'Existencias': number;
  'Descripcion'?: string;
  'Vendor'?: string;
};

export type Requerimiento = {
  corte: string;
  vendor: string | null;
  producto: string;
  lineitem_name: string | null;
  descripcion: string | null;
  demanda: number;
  stock: number;
  a_pedir: number;
};

/**
 * Parse CSV con separador de punto y coma
 */
function parseCSV(text: string): any[] {
  const lines = text.trim().split('\n');
  if (lines.length === 0) return [];
  
  const headers = lines[0].split(';').map(h => h.trim());
  const rows: any[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(';');
    const row: any = {};
    headers.forEach((header, idx) => {
      const value = values[idx]?.trim() || '';
      // Intentar convertir a número si es posible
      row[header] = !isNaN(Number(value)) && value !== '' ? Number(value) : value;
    });
    rows.push(row);
  }
  
  return rows;
}

/**
 * Carga los CSV y calcula requerimientos por proveedor
 */
export async function loadRequerimientosFromCSV(vendor?: string | null): Promise<Requerimiento[]> {
  try {
    // Cargar ambos archivos
    const [pedidosText, inventarioText] = await Promise.all([
      fetch('/Pedidos.csv').then(r => r.text()),
      fetch('/Inventario.csv').then(r => r.text())
    ]);

    const pedidos = parseCSV(pedidosText) as Pedido[];
    const inventario = parseCSV(inventarioText) as Inventario[];

    // Agrupar pedidos por SKU
    const demandaPorSKU = new Map<string, { cantidad: number; vendor?: string; lineitem_name?: string }>();
    
    pedidos.forEach(p => {
      const sku = p['Lineitem sku'];
      if (!sku) return;
      
      const current = demandaPorSKU.get(sku) || { cantidad: 0 };
      current.cantidad += Number(p['Lineitem quantity']) || 0;
      current.vendor = p['Vendor'] || current.vendor;
      current.lineitem_name = p['Lineitem name'] || current.lineitem_name;
      demandaPorSKU.set(sku, current);
    });

    // Crear mapa de inventario
    const inventarioMap = new Map<string, Inventario>();
    inventario.forEach(inv => {
      const producto = inv['Producto'];
      if (producto) {
        inventarioMap.set(producto, inv);
      }
    });

    // Calcular requerimientos
    const requerimientos: Requerimiento[] = [];
    const today = new Date().toISOString().split('T')[0];

    demandaPorSKU.forEach((demanda, sku) => {
      const inv = inventarioMap.get(sku);
      const stock = inv?.['Existencias'] || 0;
      const cantidad_a_pedir = Math.max(0, demanda.cantidad - stock);
      
      const vendorValue = inv?.['Vendor'] || demanda.vendor || null;
      
      // Filtrar por vendor si se especifica
      if (vendor && vendorValue && !vendorValue.toLowerCase().includes(vendor.toLowerCase())) {
        return;
      }

      requerimientos.push({
        corte: today,
        vendor: vendorValue,
        producto: sku,
        lineitem_name: demanda.lineitem_name || null,
        descripcion: inv?.['Descripcion'] || null,
        demanda: demanda.cantidad,
        stock: stock,
        a_pedir: cantidad_a_pedir
      });
    });

    // Ordenar por cantidad a pedir (descendente)
    return requerimientos.sort((a, b) => b.a_pedir - a.a_pedir);

  } catch (error) {
    console.error('Error cargando CSV:', error);
    throw new Error('No se pudieron cargar los archivos CSV. Asegúrate de que Pedidos.csv e Inventario.csv estén en la carpeta public/');
  }
}
