import { TODO_EL_HISTORIAL, validarPeriodo, type Periodo } from '../lib/periodo.ts';
import type { SQLiteDatabase } from 'expo-sqlite';
import { validarMovimiento, validarPrecio } from '../lib/stock.ts';
import { procesarLectura } from '../lib/gtin.ts';

export interface Producto {
  codigo: string;
  nombre: string;
  stock: number;
  minimo: number;
  precio: number;
  creado_en: number;
}

export interface Movimiento {
  id: number;
  codigo: string;
  tipo: 'IN' | 'OUT' | 'ADJ';
  stock_antes?: number | null;
  stock_despues?: number | null;
  cantidad: number;
  cantidad_original?: number;
  entrada_corregida_id?: number | null;
  entrada_cantidad_antes?: number | null;
  entrada_cantidad_despues?: number | null;
  precio_unitario: number;
  nota: string;
  fecha: number;
}

export interface MovimientoDetallado extends Movimiento {
  nombre_producto: string;
}

export interface ResumenEjecutivo {
  totalSkus: number;
  unidadesTotales: number;
  skusCriticos: number;
  skusAgotados: number;
  skusBajoMinimo: number;
  skusOptimos: number;
  valorInventarioCLP: number;
  entradasUnidades: number;
  entradasMontoCLP: number;
  salidasUnidades: number;
  salidasMontoCLP: number;
  totalMovimientos: number;
  primeraFecha: number | null;
  ultimaFecha: number | null;
  topValorizados: Array<{
    codigo: string;
    nombre: string;
    stock: number;
    precio: number;
    valorTotal: number;
  }>;
}

export type FiltroEstadoLista = 'todos' | 'bajo' | 'agotado';

/**
 * Todas las consultas usan sentencias preparadas con marcadores (?) sobre
 * getFirstAsync, getAllAsync y runAsync. Jamás se interpola entrada del
 * usuario en execAsync, eliminando cualquier vector de inyección SQL.
 */

export async function buscarPorCodigo(
  db: SQLiteDatabase,
  codigo: string
): Promise<Producto | null> {
  return db.getFirstAsync<Producto>('SELECT * FROM productos WHERE codigo = ?', codigo);
}

export async function listarProductos(
  db: SQLiteDatabase,
  opciones: {
    soloStockBajo?: boolean;
    filtroEstado?: FiltroEstadoLista;
    busqueda?: string;
  } = {}
): Promise<Producto[]> {
  const { soloStockBajo = false, filtroEstado = 'todos', busqueda = '' } = opciones;
  const condiciones: string[] = [];
  const params: (string | number)[] = [];

  if (filtroEstado === 'agotado') {
    condiciones.push('stock <= 0');
  } else if (filtroEstado === 'bajo' || soloStockBajo) {
    condiciones.push('stock <= minimo');
  }

  if (busqueda.trim()) {
    condiciones.push('(nombre LIKE ? OR codigo LIKE ?)');
    params.push(`%${busqueda.trim()}%`, `%${busqueda.trim()}%`);
  }

  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  return db.getAllAsync<Producto>(
    `SELECT * FROM productos ${where}
     ORDER BY (stock <= 0) DESC, (stock <= minimo) DESC, stock ASC, nombre ASC`,
    ...params
  );
}

export async function contarStockBajo(db: SQLiteDatabase): Promise<number> {
  const fila = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM productos WHERE stock <= minimo'
  );
  return fila?.n ?? 0;
}

export async function crearProducto(
  db: SQLiteDatabase,
  datos: {
    codigo: string;
    nombre: string;
    stockInicial: number;
    minimo: number;
    precio?: number;
  }
): Promise<void> {
  const { nombre, stockInicial, minimo, precio = 0 } = datos;
  const lectura = procesarLectura(datos.codigo);
  if (!lectura.ok) throw new Error('El código GTIN no es válido. Revisa sus dígitos.');
  const codigo = lectura.codigo;
  if (!nombre.trim()) throw new Error('El nombre del producto no puede ir vacío.');
  if (!Number.isInteger(stockInicial) || stockInicial < 0 || stockInicial > 99999) {
    throw new Error('El stock inicial debe ser un entero entre 0 y 99.999.');
  }
  if (!Number.isInteger(minimo) || minimo < 1 || minimo > 99999) {
    throw new Error('El stock mínimo debe ser un entero entre 1 y 99.999.');
  }
  const errPrecio = validarPrecio(precio);
  if (errPrecio) throw new Error(errPrecio);

  await db.withExclusiveTransactionAsync(async (tx) => {
    const ahora = Date.now();
    await tx.runAsync(
      `INSERT INTO productos (codigo, nombre, stock, minimo, precio, creado_en)
       VALUES (?, ?, ?, ?, ?, ?)`,
      codigo,
      nombre.trim(),
      stockInicial,
      minimo,
      precio,
      ahora
    );
    if (stockInicial > 0) {
      await tx.runAsync(
        `INSERT INTO movimientos (codigo, tipo, cantidad, precio_unitario, nota, fecha)
         VALUES (?, ?, ?, ?, ?, ?)`,
        codigo,
        'IN',
        stockInicial,
        precio,
        'Stock inicial de alta',
        ahora
      );
    }
  });
}

export async function actualizarProducto(
  db: SQLiteDatabase,
  datos: {
    codigo: string;
    nombre: string;
    minimo: number;
    precio: number;
    stock?: number;
    stockAnterior?: number;
    motivo?: string;
    correccionEntrada?: { id: number; cantidadAnterior: number };
    ajustarEntradas?: boolean;
  }
): Promise<void> {
  const { codigo, nombre, minimo, precio } = datos;
  if (!nombre.trim()) throw new Error('El nombre no puede quedar vacío.');
  if (!Number.isInteger(minimo) || minimo < 1 || minimo > 99999) {
    throw new Error('El stock mínimo debe ser un entero entre 1 y 99.999.');
  }
  const errPrecio = validarPrecio(precio);
  if (errPrecio) throw new Error(errPrecio);

  if (datos.stock !== undefined && (!Number.isSafeInteger(datos.stock) || datos.stock < 0)) {
    throw new Error('La cantidad corregida debe ser un entero no negativo y seguro.');
  }
  await db.withExclusiveTransactionAsync(async (tx) => {
    const anterior = await buscarPorCodigo(tx as SQLiteDatabase, codigo);
    if (!anterior) throw new Error('El producto ya no existe.');
    const stock = datos.stock ?? anterior.stock;
    if (datos.stock !== undefined && datos.stockAnterior !== anterior.stock) {
      throw new Error('El stock cambió mientras editabas. Cierra y vuelve a abrir la ficha antes de corregirlo.');
    }
    const cambiaStock = stock !== anterior.stock;
    const motivo = datos.motivo?.trim() ?? '';
    if (cambiaStock && (!motivo || motivo.length > 160)) throw new Error('Indica el motivo del ajuste (1 a 160 caracteres).');
    let entrada: Movimiento | null = null;
    let nuevaCantidadEntrada: number | null = null;
    let insertoEntradaNueva = false;

    if (cambiaStock && datos.correccionEntrada) {
      entrada = await tx.getFirstAsync<Movimiento>(
        `SELECT ${COLUMNAS_MOVIMIENTO} FROM movimientos m WHERE m.id = ? AND m.codigo = ? AND m.tipo = 'IN'`,
        datos.correccionEntrada.id, codigo
      );
      if (!entrada || entrada.cantidad !== datos.correccionEntrada.cantidadAnterior) {
        throw new Error('La entrada cambió o ya no existe. Vuelve a seleccionarla antes de corregir.');
      }
      nuevaCantidadEntrada = entrada.cantidad + stock - anterior.stock;
      if (!Number.isSafeInteger(nuevaCantidadEntrada) || nuevaCantidadEntrada < 0) {
        throw new Error('La corrección dejaría esa entrada con cantidad negativa. Revisa la entrada elegida y el stock correcto.');
      }
      await tx.runAsync('UPDATE movimientos SET cantidad_corregida = ? WHERE id = ?', nuevaCantidadEntrada, entrada.id);
    } else if (cambiaStock && datos.ajustarEntradas) {
      // Ajusta automáticamente las entradas (de la más reciente a la más antigua)
      // para reflejar la corrección en Entradas y Stock sin generar ninguna Salida.
      const diff = stock - anterior.stock;
      const entradas = await tx.getAllAsync<Movimiento>(
        `SELECT ${COLUMNAS_MOVIMIENTO} FROM movimientos m WHERE m.codigo = ? AND m.tipo = 'IN' ORDER BY m.fecha DESC, m.id DESC`,
        codigo
      );
      if (diff < 0) {
        let porDescontar = Math.abs(diff);
        let tocadas = 0;
        let unica: Movimiento | null = null;
        let unicaNueva: number | null = null;
        for (const e of entradas) {
          if (porDescontar <= 0) break;
          if (e.cantidad <= 0) continue;
          const descuento = Math.min(e.cantidad, porDescontar);
          const nuevaCant = e.cantidad - descuento;
          await tx.runAsync(
            'UPDATE movimientos SET cantidad_corregida = ? WHERE id = ?',
            nuevaCant,
            e.id
          );
          porDescontar -= descuento;
          tocadas += 1;
          unica = e;
          unicaNueva = nuevaCant;
        }
        if (tocadas === 1 && unica && unicaNueva !== null) {
          entrada = unica;
          nuevaCantidadEntrada = unicaNueva;
        }
      } else if (diff > 0) {
        if (entradas[0]) {
          entrada = entradas[0];
          nuevaCantidadEntrada = entrada.cantidad + diff;
          await tx.runAsync(
            'UPDATE movimientos SET cantidad_corregida = ? WHERE id = ?',
            nuevaCantidadEntrada,
            entrada.id
          );
        } else {
          await tx.runAsync(
            `INSERT INTO movimientos (codigo, tipo, cantidad, precio_unitario, nota, fecha)
             VALUES (?, 'IN', ?, ?, ?, ?)`,
            codigo,
            diff,
            precio,
            motivo,
            Date.now()
          );
          insertoEntradaNueva = true;
        }
      }
    }

    await tx.runAsync('UPDATE productos SET nombre = ?, minimo = ?, precio = ?, stock = ? WHERE codigo = ?', nombre.trim(), minimo, precio, stock, codigo);
    if (cambiaStock && !insertoEntradaNueva) await tx.runAsync(
      `INSERT INTO movimientos(codigo,tipo,cantidad,precio_unitario,nota,fecha,stock_antes,stock_despues,
         entrada_corregida_id,entrada_cantidad_antes,entrada_cantidad_despues)
       VALUES (?, 'ADJ', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      codigo, Math.abs(stock - anterior.stock), entrada?.precio_unitario ?? anterior.precio, motivo, Date.now(), anterior.stock, stock,
      entrada?.id ?? null, entrada?.cantidad ?? null, nuevaCantidadEntrada
    );
  });
}

export async function eliminarProducto(db: SQLiteDatabase, codigo: string): Promise<void> {
  // ON DELETE CASCADE elimina automáticamente su historial en `movimientos`.
  await db.runAsync('DELETE FROM productos WHERE codigo = ?', codigo);
}

export async function vaciarBodega(db: SQLiteDatabase): Promise<void> {
  await db.withExclusiveTransactionAsync(async (tx) => {
    await tx.runAsync('DELETE FROM movimientos');
    await tx.runAsync('DELETE FROM productos');
  });
}

export async function listarCriticos(db: SQLiteDatabase, limite = 6): Promise<Producto[]> {
  return db.getAllAsync<Producto>(
    `SELECT * FROM productos
     WHERE stock <= minimo
     ORDER BY (stock <= 0) DESC, stock ASC, nombre ASC
     LIMIT ?`,
    limite
  );
}

/**
 * Registra una entrada (recepción) o salida (despacho/venta) dentro de una
 * transacción exclusiva, congelando el precio unitario vigente del producto.
 */
export async function registrarMovimiento(
  db: SQLiteDatabase,
  codigo: string,
  tipo: 'IN' | 'OUT',
  cantidad: number,
  nota = ''
): Promise<number> {
  let stockFinal = 0;

  await db.withExclusiveTransactionAsync(async (tx) => {
    const producto = await tx.getFirstAsync<Producto>(
      'SELECT * FROM productos WHERE codigo = ?',
      codigo
    );
    if (!producto) throw new Error(`El producto ${codigo} ya no existe en la base.`);

    const error = validarMovimiento(tipo, cantidad, producto.stock);
    if (error) throw new Error(error);

    stockFinal = tipo === 'IN' ? producto.stock + cantidad : producto.stock - cantidad;

    await tx.runAsync('UPDATE productos SET stock = ? WHERE codigo = ?', stockFinal, codigo);
    await tx.runAsync(
      `INSERT INTO movimientos (codigo, tipo, cantidad, precio_unitario, nota, fecha)
       VALUES (?, ?, ?, ?, ?, ?)`,
      codigo,
      tipo,
      cantidad,
      producto.precio ?? 0,
      nota.trim().slice(0, 80),
      Date.now()
    );
  });

  return stockFinal;
}

/** Cantidad efectiva para consultas; la original se conserva para auditoría. */
export const CANTIDAD_EFECTIVA = 'COALESCE(m.cantidad_corregida, m.cantidad)';
export const COLUMNAS_MOVIMIENTO = `m.id,m.codigo,m.tipo,${CANTIDAD_EFECTIVA} AS cantidad,
  m.cantidad AS cantidad_original,m.precio_unitario,m.nota,m.fecha,m.stock_antes,m.stock_despues,
  m.entrada_corregida_id,m.entrada_cantidad_antes,m.entrada_cantidad_despues`;

export async function historial(
  db: SQLiteDatabase,
  codigo: string,
  limite = 25
): Promise<Movimiento[]> {
  return db.getAllAsync<Movimiento>(
    `SELECT ${COLUMNAS_MOVIMIENTO} FROM movimientos m WHERE codigo = ? ORDER BY fecha DESC, id DESC LIMIT ?`,
    codigo,
    limite
  );
}

export interface OpcionesMovimientos {
  tipo?: 'TODOS' | 'IN' | 'OUT' | 'ADJ';
  periodo?: Periodo;
  codigo?: string;
  busqueda?: string;
  limite?: number;
  antesDe?: { fecha: number; id: number };
}

/** Filtro compartido por totales, historial y exportaciones; solo valores parametrizados. */
export function filtroMovimientos(opciones: OpcionesMovimientos = {}) {
  const { tipo = 'TODOS', periodo = TODO_EL_HISTORIAL, codigo, busqueda = '', antesDe } = opciones;
  validarPeriodo(periodo);
  const condiciones: string[] = [];
  const params: Array<string | number> = [];
  if (periodo.desde !== null) { condiciones.push('m.fecha >= ?'); params.push(periodo.desde); }
  if (periodo.hasta !== null) { condiciones.push('m.fecha < ?'); params.push(periodo.hasta); }
  if (tipo !== 'TODOS') { condiciones.push('m.tipo = ?'); params.push(tipo); }
  if (codigo) { condiciones.push('m.codigo = ?'); params.push(codigo); }
  if (busqueda.trim()) {
    condiciones.push('(p.nombre LIKE ? OR m.codigo LIKE ? OR m.nota LIKE ?)');
    params.push(...Array(3).fill(`%${busqueda.trim()}%`));
  }
  if (antesDe) {
    condiciones.push('(m.fecha < ? OR (m.fecha = ? AND m.id < ?))');
    params.push(antesDe.fecha, antesDe.fecha, antesDe.id);
  }
  return { where: condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '', params };
}

export async function listarMovimientosGlobales(
  db: SQLiteDatabase, opciones: OpcionesMovimientos = {}
): Promise<MovimientoDetallado[]> {
  const { where, params } = filtroMovimientos(opciones);
  const limite = opciones.limite ?? 50;
  if (!Number.isInteger(limite) || limite < 1 || limite > 20000) throw new Error('Límite de consulta inválido.');
  return db.getAllAsync<MovimientoDetallado>(
    `SELECT ${COLUMNAS_MOVIMIENTO}, COALESCE(p.nombre, m.codigo) AS nombre_producto
     FROM movimientos m LEFT JOIN productos p ON p.codigo = m.codigo
     ${where} ORDER BY m.fecha DESC, m.id DESC LIMIT ?`, ...params, limite
  );
}

export async function contarMovimientos(db: SQLiteDatabase, opciones: OpcionesMovimientos = {}): Promise<number> {
  const { where, params } = filtroMovimientos({ ...opciones, antesDe: undefined });
  const fila = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) AS n FROM movimientos m LEFT JOIN productos p ON p.codigo = m.codigo ${where}`, ...params
  );
  return fila?.n ?? 0;
}

/**
 * Calcula las métricas con dos agregaciones y una consulta de los cinco
 * productos de mayor valor. Su duración debe medirse en el dispositivo.
 */
export async function obtenerResumenEjecutivo(db: SQLiteDatabase, periodo: Periodo = TODO_EL_HISTORIAL): Promise<ResumenEjecutivo> {
  const { where, params } = filtroMovimientos({ periodo });
  const [aggProd, aggMov, top] = await Promise.all([
    db.getFirstAsync<{
      totalSkus: number;
      unidadesTotales: number;
      skusAgotados: number;
      skusBajoMinimo: number;
      skusOptimos: number;
      valorInventarioCLP: number;
    }>(`
      SELECT
        COUNT(*) AS totalSkus,
        COALESCE(SUM(stock), 0) AS unidadesTotales,
        COALESCE(SUM(CASE WHEN stock <= 0 THEN 1 ELSE 0 END), 0) AS skusAgotados,
        COALESCE(SUM(CASE WHEN stock > 0 AND stock <= minimo THEN 1 ELSE 0 END), 0) AS skusBajoMinimo,
        COALESCE(SUM(CASE WHEN stock > minimo THEN 1 ELSE 0 END), 0) AS skusOptimos,
        COALESCE(SUM(stock * precio), 0) AS valorInventarioCLP
      FROM productos
    `),
    db.getFirstAsync<{
      totalMovimientos: number;
      primeraFecha: number | null;
      ultimaFecha: number | null;
      entradasUnidades: number;
      entradasMontoCLP: number;
      salidasUnidades: number;
      salidasMontoCLP: number;
    }>(`
      SELECT
        COUNT(*) AS totalMovimientos,
        MIN(fecha) AS primeraFecha,
        MAX(fecha) AS ultimaFecha,
        COALESCE(SUM(CASE WHEN tipo = 'IN' THEN ${CANTIDAD_EFECTIVA} ELSE 0 END), 0) AS entradasUnidades,
        COALESCE(SUM(CASE WHEN tipo = 'IN' THEN ${CANTIDAD_EFECTIVA} * precio_unitario ELSE 0 END), 0) AS entradasMontoCLP,
        COALESCE(SUM(CASE WHEN tipo = 'OUT' THEN ${CANTIDAD_EFECTIVA} ELSE 0 END), 0) AS salidasUnidades,
        COALESCE(SUM(CASE WHEN tipo = 'OUT' THEN ${CANTIDAD_EFECTIVA} * precio_unitario ELSE 0 END), 0) AS salidasMontoCLP
      FROM movimientos m ${where}
    `, ...params),
    db.getAllAsync<{
      codigo: string;
      nombre: string;
      stock: number;
      precio: number;
      valorTotal: number;
    }>(`
      SELECT
        codigo,
        nombre,
        stock,
        precio,
        (stock * precio) AS valorTotal
      FROM productos
      ORDER BY valorTotal DESC, stock DESC
      LIMIT 5
    `),
  ]);

  const skusAgotados = aggProd?.skusAgotados ?? 0;
  const skusBajoMinimo = aggProd?.skusBajoMinimo ?? 0;

  return {
    totalSkus: aggProd?.totalSkus ?? 0,
    unidadesTotales: aggProd?.unidadesTotales ?? 0,
    skusCriticos: skusAgotados + skusBajoMinimo,
    skusAgotados,
    skusBajoMinimo,
    skusOptimos: aggProd?.skusOptimos ?? 0,
    valorInventarioCLP: aggProd?.valorInventarioCLP ?? 0,
    entradasUnidades: aggMov?.entradasUnidades ?? 0,
    entradasMontoCLP: aggMov?.entradasMontoCLP ?? 0,
    salidasUnidades: aggMov?.salidasUnidades ?? 0,
    salidasMontoCLP: aggMov?.salidasMontoCLP ?? 0,
    totalMovimientos: aggMov?.totalMovimientos ?? 0,
    primeraFecha: aggMov?.primeraFecha ?? null,
    ultimaFecha: aggMov?.ultimaFecha ?? null,
    topValorizados: top,
  };
}

/**
 * Carga un lote ficticio con códigos de dígito verificador válido cuando la
 * bodega está vacía y el usuario desea probar el dashboard y la exportación
 * inmediatamente.
 */
export async function sembrarCatalogoDemo(db: SQLiteDatabase): Promise<void> {
  const muestras: Array<{
    codigo: string;
    nombre: string;
    stock: number;
    minimo: number;
    precio: number;
    salidasDemo: number;
  }> = [
    { codigo: '4006381333931', nombre: 'Destacador Escolar Amarillo', stock: 24, minimo: 6, precio: 1290, salidasDemo: 8 },
    { codigo: '5012345670003', nombre: 'Café Tostado Molido 250 g', stock: 3, minimo: 5, precio: 4890, salidasDemo: 9 },
    { codigo: '0036000291452', nombre: 'Pañuelos Desechables Pack x6', stock: 0, minimo: 4, precio: 2190, salidasDemo: 6 },
    { codigo: '7801610001622', nombre: 'Bebida Cola Retornable 2 L', stock: 18, minimo: 8, precio: 1950, salidasDemo: 12 },
    { codigo: '7802900001018', nombre: 'Arroz Grado 1 Selección 1 kg', stock: 4, minimo: 6, precio: 1690, salidasDemo: 10 },
  ];

  await db.withExclusiveTransactionAsync(async (tx) => {
    const ahora = Date.now();
    for (let idx = 0; idx < muestras.length; idx++) {
      const m = muestras[idx];
      if (!m) continue;
      const yaExiste = await tx.getFirstAsync<{ codigo: string }>(
        'SELECT codigo FROM productos WHERE codigo = ?',
        m.codigo
      );
      if (yaExiste) continue;

      const stockInicial = m.stock + m.salidasDemo;
      await tx.runAsync(
        `INSERT INTO productos (codigo, nombre, stock, minimo, precio, creado_en)
         VALUES (?, ?, ?, ?, ?, ?)`,
        m.codigo,
        m.nombre,
        m.stock,
        m.minimo,
        m.precio,
        ahora - (idx + 1) * 3_600_000
      );
      await tx.runAsync(
        `INSERT INTO movimientos (codigo, tipo, cantidad, precio_unitario, nota, fecha)
         VALUES (?, 'IN', ?, ?, 'Recepción proveedor', ?)`,
        m.codigo,
        stockInicial,
        m.precio,
        ahora - (idx + 1) * 3_500_000
      );
      if (m.salidasDemo > 0) {
        await tx.runAsync(
          `INSERT INTO movimientos (codigo, tipo, cantidad, precio_unitario, nota, fecha)
           VALUES (?, 'OUT', ?, ?, 'Despacho mostrador', ?)`,
          m.codigo,
          m.salidasDemo,
          m.precio,
          ahora - idx * 900_000
        );
      }
    }
  });
}
