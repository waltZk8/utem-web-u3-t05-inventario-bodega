import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { SQLiteDatabase } from 'expo-sqlite';
import { migrar } from './schema.ts';
import {
  actualizarProducto, buscarPorCodigo, crearProducto, historial, listarProductos,
  obtenerResumenEjecutivo, registrarMovimiento, sembrarCatalogoDemo,
} from './inventario.ts';
import { esGtinValido } from '../lib/gtin.ts';
import { obtenerEvolucion } from './evolucion.ts';
import { cargarDatosReporte } from './reportes.ts';
import { crearLibroReporte } from '../lib/reporteExcel.ts';
import { resolverPeriodo, TODO_EL_HISTORIAL } from '../lib/periodo.ts';

// Ejecuta las funciones de producción contra SQLite real de Node.
// Este adaptador cubre SQL, transacciones y disco; no sustituye el puente nativo de Expo.
function adaptar(sql: DatabaseSync) {
  const db = {
    async execAsync(query: string) { sql.exec(query); },
    async getFirstAsync(query: string, ...params: (string | number)[]) {
      return sql.prepare(query).get(...params) ?? null;
    },
    async getAllAsync(query: string, ...params: (string | number)[]) {
      return sql.prepare(query).all(...params);
    },
    async runAsync(query: string, ...params: (string | number)[]) {
      return sql.prepare(query).run(...params);
    },
    async withExclusiveTransactionAsync(task: (tx: unknown) => Promise<void>) {
      sql.exec('BEGIN IMMEDIATE');
      try {
        await task(db);
        sql.exec('COMMIT');
      } catch (error) {
        sql.exec('ROLLBACK');
        throw error;
      }
    },
  };
  return db as unknown as SQLiteDatabase;
}

const ficha = { codigo: '4006381333931', nombre: 'Producto de prueba', stockInicial: 10, minimo: 5, precio: 1290 };

test('rectifica entrada 20→15→20→0 sin despacho y conserva original, precio, fecha y constancias', async () => {
  const sql = new DatabaseSync(':memory:'); const db = adaptar(sql);
  try {
    await migrar(db); await crearProducto(db, { ...ficha, stockInicial: 20, precio: 1000 });
    const entrada = (await historial(db, ficha.codigo))[0]!;
    const fecha = new Date(2026, 10, 1, 12).getTime();
    sql.prepare('UPDATE movimientos SET fecha=? WHERE id=?').run(fecha, entrada.id);
    const periodo = resolverPeriodo({ modo: 'rango', desde: '2026-11-01', hasta: '2026-11-01' });
    for (const [anterior, nueva] of [[20, 15], [15, 20], [20, 0]]) {
      await actualizarProducto(db, { ...ficha, precio: 2000, stock: nueva, stockAnterior: anterior,
        motivo: 'Cantidad de recepción mal digitada', correccionEntrada: { id: entrada.id, cantidadAnterior: anterior! } });
      const r = await obtenerResumenEjecutivo(db, periodo);
      assert.equal(r.unidadesTotales, nueva); assert.equal(r.valorInventarioCLP, nueva! * 2000);
      assert.equal(r.entradasUnidades, nueva); assert.equal(r.entradasMontoCLP, nueva! * 1000);
      assert.equal(r.salidasUnidades, 0); assert.equal(r.salidasMontoCLP, 0);
      const e = (await historial(db, ficha.codigo)).find((m) => m.id === entrada.id)!;
      assert.equal(e.cantidad, nueva); assert.equal(e.cantidad_original, 20); assert.equal(e.fecha, fecha);
      const serie = await obtenerEvolucion(db, periodo);
      assert.equal(serie.puntos[0]?.entradas, nueva); assert.equal(serie.puntos[0]?.salidas, 0);
      const reporte = await cargarDatosReporte(db, periodo);
      assert.equal(reporte.porProducto[0]?.entradas, nueva); assert.equal(reporte.porDia[0]?.montoEntradas, nueva! * 1000);
      const ws = crearLibroReporte(reporte).Sheets.Movimientos!;
      assert.equal(ws.G7.v, nueva); assert.equal(ws.O7.v, 20); assert.equal(ws.I7.v, nueva! * 1000);
    }
    const constancias = (await historial(db, ficha.codigo)).filter((m) => m.entrada_corregida_id === entrada.id);
    assert.equal(constancias.length, 3);
    assert.equal(constancias[0]?.entrada_cantidad_antes, 20); assert.equal(constancias[0]?.entrada_cantidad_despues, 0);
    assert.equal(constancias[0]?.tipo, 'ADJ');
    assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM movimientos WHERE tipo='OUT'").get()?.n, 0);
    const completo = await cargarDatosReporte(db, TODO_EL_HISTORIAL);
    const ws = crearLibroReporte(completo).Sheets.Movimientos!;
    assert.equal(ws.D7.v, 'RECTIFICACIÓN ENTRADA'); assert.equal(ws.P7.v, entrada.id);
    assert.equal(ws.Q7.v, 20); assert.equal(ws.R7.v, 0);
  } finally { sql.close(); }
});

test('corregir recepción con despachos previos conserva salidas y revierte todo ante fallo o selección inválida', async () => {
  const sql = new DatabaseSync(':memory:'); const db = adaptar(sql);
  try {
    await migrar(db); await crearProducto(db, { ...ficha, stockInicial: 20 });
    const entrada = (await historial(db, ficha.codigo))[0]!;
    await registrarMovimiento(db, ficha.codigo, 'OUT', 5);
    const salida = (await historial(db, ficha.codigo))[0]!;
    const datos = { ...ficha, stockAnterior: 15, stock: 10, precio: 1290, motivo: 'Debieron entrar 15', correccionEntrada: { id: entrada.id, cantidadAnterior: 20 } };
    await assert.rejects(actualizarProducto(db, { ...datos, correccionEntrada: { id: salida.id, cantidadAnterior: 5 } }), /entrada/);
    await assert.rejects(actualizarProducto(db, { ...datos, correccionEntrada: { id: entrada.id, cantidadAnterior: 19 } }), /entrada/);
    sql.exec("CREATE TRIGGER fallo_rectificacion BEFORE INSERT ON movimientos WHEN NEW.entrada_corregida_id IS NOT NULL BEGIN SELECT RAISE(ABORT,'fallo rectificacion'); END;");
    await assert.rejects(actualizarProducto(db, datos), /fallo rectificacion/);
    assert.equal((await buscarPorCodigo(db, ficha.codigo))?.stock, 15);
    assert.equal((await historial(db, ficha.codigo)).find((m) => m.id === entrada.id)?.cantidad, 20);
    sql.exec('DROP TRIGGER fallo_rectificacion');
    await actualizarProducto(db, datos);
    const r = await obtenerResumenEjecutivo(db);
    assert.equal(r.entradasUnidades, 15); assert.equal(r.salidasUnidades, 5); assert.equal(r.salidasMontoCLP, 5 * ficha.precio);
    assert.equal(r.unidadesTotales, 10);
    // Otra recepción aporta saldo, pero no permite rectificar esta entrada por debajo de cero.
    await registrarMovimiento(db, ficha.codigo, 'IN', 100);
    await assert.rejects(actualizarProducto(db, { ...datos, stockAnterior: 110, stock: 0, correccionEntrada: { id: entrada.id, cantidadAnterior: 15 } }), /negativa/);
    assert.equal((await buscarPorCodigo(db, ficha.codigo))?.stock, 110);
  } finally { sql.close(); }
});

test('migra v3 con ajustes existentes sin perder saldos y revierte columnas si falla v4', async () => {
  const sql = new DatabaseSync(':memory:'); const db = adaptar(sql);
  try {
    sql.exec(`CREATE TABLE productos(codigo TEXT PRIMARY KEY,nombre TEXT,stock INTEGER,minimo INTEGER,precio INTEGER,creado_en INTEGER);
      CREATE TABLE movimientos(id INTEGER PRIMARY KEY AUTOINCREMENT,codigo TEXT REFERENCES productos(codigo) ON DELETE CASCADE,tipo TEXT,cantidad INTEGER,precio_unitario INTEGER,nota TEXT,fecha INTEGER,stock_antes INTEGER,stock_despues INTEGER);
      INSERT INTO productos VALUES('4006381333931','Producto',15,5,1290,1);
      INSERT INTO movimientos VALUES(1,'4006381333931','IN',20,1290,'Alta',1,NULL,NULL);
      INSERT INTO movimientos VALUES(2,'4006381333931','ADJ',5,1290,'Conteo anterior',2,20,15);
      PRAGMA user_version=3;`);
    const original = db.execAsync.bind(db);
    db.execAsync = async (q: string) => { await original(q); if (q.includes('ADD COLUMN entrada_cantidad_despues')) throw new Error('fallo migración'); };
    await assert.rejects(migrar(db), /fallo migración/);
    assert.equal(sql.prepare('PRAGMA user_version').get()?.user_version, 3);
    assert.equal(sql.prepare('PRAGMA table_info(movimientos)').all().some((c) => c.name === 'cantidad_corregida'), false);
    db.execAsync = original; await migrar(db); await migrar(db);
    const filas = await historial(db, ficha.codigo);
    assert.equal(filas[0]?.stock_antes, 20); assert.equal(filas[0]?.stock_despues, 15);
    assert.equal(filas[0]?.nota, 'Conteo anterior'); assert.equal(filas.length, 2);
    assert.equal(sql.prepare('PRAGMA user_version').get()?.user_version, 4);
  } finally { sql.close(); }
});

test('corregir cantidad conserva flujos y exporta saldos y motivo; valida y evita edición obsoleta', async () => {
  const sql = new DatabaseSync(':memory:'); const db = adaptar(sql);
  try {
    await migrar(db); await crearProducto(db, ficha);
    const editar = { ...ficha, stock: 7, stockAnterior: 10, motivo: 'Error al digitar alta', precio: 1500 };
    await assert.rejects(actualizarProducto(db, { ...editar, motivo: '' }), /motivo/);
    await assert.rejects(actualizarProducto(db, { ...editar, stock: -1 }), /entero/);
    await assert.rejects(actualizarProducto(db, { ...editar, stock: 2.5 }), /entero/);
    await actualizarProducto(db, editar);
    assert.equal((await buscarPorCodigo(db, ficha.codigo))?.stock, 7);
    let eventos = await historial(db, ficha.codigo);
    assert.equal(eventos[0]?.tipo, 'ADJ');
    assert.equal(eventos[0]?.stock_antes, 10); assert.equal(eventos[0]?.stock_despues, 7);
    assert.equal(eventos[0]?.cantidad, 3);
    const resumen = await obtenerResumenEjecutivo(db);
    assert.equal(resumen.entradasUnidades, 10); assert.equal(resumen.salidasUnidades, 0);
    assert.equal(resumen.entradasMontoCLP, 12900); assert.equal(resumen.valorInventarioCLP, 10500);
    await assert.rejects(actualizarProducto(db, editar), /cambió/);
    await actualizarProducto(db, { ...editar, stock: 7, stockAnterior: 7 });
    assert.equal((await historial(db, ficha.codigo)).length, 2);
    await actualizarProducto(db, { ...editar, stock: 0, stockAnterior: 7 });
    await actualizarProducto(db, { ...editar, stock: 5, stockAnterior: 0 });
    const d = await cargarDatosReporte(db, TODO_EL_HISTORIAL);
    const ws = crearLibroReporte(d).Sheets.Movimientos!;
    assert.equal(ws.D7.v, 'AJUSTE'); assert.equal(ws.L7.v, 0); assert.equal(ws.M7.v, 5);
    assert.equal(ws.N7.v, 5); assert.equal(ws.J7.v, editar.motivo); assert.equal(ws.I7?.f, undefined);
    // La ficha y el asiento se revierten juntos si el almacenamiento falla.
    sql.exec("CREATE TRIGGER fallo_ajuste BEFORE INSERT ON movimientos WHEN NEW.tipo='ADJ' BEGIN SELECT RAISE(ABORT,'fallo simulado'); END;");
    await assert.rejects(actualizarProducto(db, { ...editar, nombre: 'No guardar', stock: 9, stockAnterior: 5 }), /fallo simulado/);
    assert.equal((await buscarPorCodigo(db, ficha.codigo))?.stock, 5);
    assert.equal((await buscarPorCodigo(db, ficha.codigo))?.nombre, ficha.nombre);
  } finally { sql.close(); }
});

test('evolución completa días sin actividad, suma flujos y excluye ajustes y límites externos', async () => {
  const sql = new DatabaseSync(':memory:'); const db = adaptar(sql);
  try {
    await migrar(db); await crearProducto(db, { ...ficha, stockInicial: 0 });
    const p = resolverPeriodo({ modo: 'rango', desde: '2026-11-01', hasta: '2026-11-03' });
    const insertar = sql.prepare('INSERT INTO movimientos(codigo,tipo,cantidad,fecha) VALUES(?,?,?,?)');
    insertar.run(ficha.codigo, 'IN', 8, p.desde!); insertar.run(ficha.codigo, 'IN', 2, p.desde! + 100);
    insertar.run(ficha.codigo, 'OUT', 3, new Date(2026, 10, 3, 12).getTime());
    insertar.run(ficha.codigo, 'IN', 99, p.hasta!);
    sql.prepare("INSERT INTO movimientos(codigo,tipo,cantidad,nota,fecha,stock_antes,stock_despues) VALUES(?,'ADJ',4,'Conteo',?,0,4)").run(ficha.codigo, p.desde!);
    const serie = await obtenerEvolucion(db, p);
    assert.deepEqual(serie.puntos.map((v) => [v.entradas, v.salidas]), [[10, 0], [0, 0], [0, 3]]);
    assert.equal(serie.puntos.at(-1)?.hasta, p.hasta);
    const anual = await obtenerEvolucion(db, resolverPeriodo({ modo: 'rango', desde: '2026-01-01', hasta: '2026-12-31' }));
    assert.equal(anual.agrupacion, 'mes'); assert.equal(anual.puntos.length, 12);
    assert.equal(anual.puntos[10]?.entradas, 109);
    const largo = await obtenerEvolucion(db, resolverPeriodo({ modo: 'rango', desde: '2010-01-01', hasta: '2026-12-31' }));
    assert.equal(largo.agrupacion, 'año'); assert.equal(largo.puntos.length, 17);
  } finally { sql.close(); }
});

test('migra v2 a v4 conservando IDs, secuencia incluso eliminados y cascada', async () => {
  const sql = new DatabaseSync(':memory:'); const db = adaptar(sql);
  try {
    sql.exec(`CREATE TABLE productos(codigo TEXT PRIMARY KEY,nombre TEXT,stock INTEGER,minimo INTEGER,precio INTEGER,creado_en INTEGER);
      CREATE TABLE movimientos(id INTEGER PRIMARY KEY AUTOINCREMENT,codigo TEXT REFERENCES productos(codigo) ON DELETE CASCADE,tipo TEXT CHECK(tipo IN ('IN','OUT')),cantidad INTEGER,precio_unitario INTEGER,nota TEXT,fecha INTEGER);
      INSERT INTO productos VALUES('4006381333931','Producto',10,5,1290,1);
      INSERT INTO movimientos VALUES(17,'4006381333931','IN',10,1290,'Original',1);
      INSERT INTO movimientos VALUES(99,'4006381333931','OUT',1,1290,'Eliminado',2);
      DELETE FROM movimientos WHERE id=99; PRAGMA user_version=2;`);
    await migrar(db); await migrar(db);
    await actualizarProducto(db, { ...ficha, stock: 8, stockAnterior: 10, motivo: 'Error', precio: 1290 });
    const filas = await historial(db, ficha.codigo);
    assert.equal(filas[0]?.id, 100); assert.equal(filas[1]?.id, 17); assert.equal(filas[1]?.nota, 'Original');
    assert.equal(sql.prepare('PRAGMA foreign_key_check').all().length, 0);
    sql.prepare('DELETE FROM productos WHERE codigo=?').run(ficha.codigo);
    assert.equal((await historial(db, ficha.codigo)).length, 0);
  } finally { sql.close(); }
});

test('persiste alta, entrada, salida e historial al cerrar y reabrir el archivo', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'bodega-'));
  const archivo = join(dir, 'bodega.db');
  let sql = new DatabaseSync(archivo);
  try {
    let db = adaptar(sql);
    await migrar(db);
    await migrar(db); // inicialización repetida sin pérdida de datos
    await crearProducto(db, ficha);
    assert.equal(await registrarMovimiento(db, ficha.codigo, 'IN', 3), 13);
    await actualizarProducto(db, { ...ficha, minimo: 5, precio: 1500 });
    assert.equal(await registrarMovimiento(db, ficha.codigo, 'OUT', 8), 5);
    await assert.rejects(registrarMovimiento(db, ficha.codigo, 'OUT', 6), /solo hay 5/);
    const resumen = await obtenerResumenEjecutivo(db);
    assert.equal(resumen.totalMovimientos, 3);
    assert.equal(resumen.skusCriticos, 1);
    assert.equal(resumen.entradasMontoCLP, 13 * 1290);
    assert.equal(resumen.salidasMontoCLP, 8 * 1500);
    sql.close();
    sql = new DatabaseSync(archivo);
    db = adaptar(sql);
    await migrar(db);
    assert.equal((await buscarPorCodigo(db, ficha.codigo))?.stock, 5);
    assert.equal((await historial(db, ficha.codigo)).length, 3);
    assert.equal((await listarProductos(db, { filtroEstado: 'bajo' })).length, 1);
    assert.equal((await listarProductos(db, { filtroEstado: 'agotado' })).length, 0);
  } finally {
    sql.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('rechaza datos inválidos y códigos duplicados antes de alterar el inventario', async () => {
  const sql = new DatabaseSync(':memory:');
  const db = adaptar(sql);
  try {
    await migrar(db);
    for (const cambio of [
      { stockInicial: -1 }, { stockInicial: 1.5 }, { stockInicial: NaN },
      { minimo: 0 }, { minimo: 2.5 }, { minimo: Infinity }, { precio: -1 },
      { codigo: '4006381333932' }, { nombre: '   ' },
    ]) {
      await assert.rejects(crearProducto(db, { ...ficha, ...cambio }));
    }
    await crearProducto(db, { ...ficha, codigo: '036000291452' });
    await assert.rejects(crearProducto(db, { ...ficha, codigo: '0036000291452' }), /UNIQUE/);
    assert.equal((await listarProductos(db)).length, 1);
    assert.equal((await buscarPorCodigo(db, '0036000291452'))?.stock, 10);
  } finally { sql.close(); }
});

test('revierte el saldo si falla la escritura del movimiento', async () => {
  const sql = new DatabaseSync(':memory:');
  const db = adaptar(sql);
  try {
    await migrar(db);
    await crearProducto(db, ficha);
    sql.exec("CREATE TRIGGER fallo BEFORE INSERT ON movimientos BEGIN SELECT RAISE(ABORT, 'fallo simulado'); END");
    await assert.rejects(registrarMovimiento(db, ficha.codigo, 'OUT', 2), /fallo simulado/);
    assert.equal((await buscarPorCodigo(db, ficha.codigo))?.stock, 10);
    assert.equal((await historial(db, ficha.codigo)).length, 1);
  } finally { sql.close(); }
});

test('migra v1 sin perder productos ni historial y revierte una migración interrumpida', async () => {
  const sql = new DatabaseSync(':memory:');
  const db = adaptar(sql);
  try {
    sql.exec(`
      CREATE TABLE productos (codigo TEXT PRIMARY KEY, nombre TEXT NOT NULL, stock INTEGER NOT NULL, minimo INTEGER NOT NULL, creado_en INTEGER NOT NULL);
      CREATE TABLE movimientos (id INTEGER PRIMARY KEY AUTOINCREMENT, codigo TEXT REFERENCES productos(codigo), tipo TEXT, cantidad INTEGER, fecha INTEGER);
      INSERT INTO productos VALUES ('4006381333931', 'Anterior', 3, 5, 1);
      INSERT INTO movimientos (codigo,tipo,cantidad,fecha) VALUES ('4006381333931','IN',3,1);
      PRAGMA user_version = 1;
      CREATE INDEX idx_mov_fecha ON movimientos(fecha DESC);
    `);
    const fallando = adaptar(sql);
    const transaccion = fallando.withExclusiveTransactionAsync.bind(fallando);
    fallando.withExclusiveTransactionAsync = (task) => transaccion(async (tx) => {
      await task(tx);
      throw new Error('corte simulado');
    });
    await assert.rejects(migrar(fallando), /corte simulado/);
    assert.equal(sql.prepare('PRAGMA user_version').get()?.user_version, 1);
    assert.ok(!sql.prepare('PRAGMA table_info(productos)').all().some((col) => col.name === 'precio'));
    await migrar(db);
    assert.equal((await buscarPorCodigo(db, ficha.codigo))?.precio, 0);
    assert.equal((await historial(db, ficha.codigo))[0]?.cantidad, 3);
    sql.exec('PRAGMA user_version = 99');
    await assert.rejects(migrar(db), /versión más reciente/);
  } finally { sql.close(); }
});

test('catálogo demo usa dígitos válidos y conserva saldos e historial al repetirse', async () => {
  const sql = new DatabaseSync(':memory:');
  const db = adaptar(sql);
  try {
    await migrar(db);
    await sembrarCatalogoDemo(db);
    const antes = await obtenerResumenEjecutivo(db);
    await sembrarCatalogoDemo(db);
    assert.deepEqual(await obtenerResumenEjecutivo(db), antes);
    const productos = await listarProductos(db);
    assert.equal(productos.length, 5);
    assert.ok(productos.every((p) => esGtinValido(p.codigo)));
    for (const p of productos) {
      const movs = await historial(db, p.codigo);
      assert.equal(movs.reduce((saldo, m) => saldo + (m.tipo === 'IN' ? m.cantidad : -m.cantidad), 0), p.stock);
    }
  } finally { sql.close(); }
});

test('ajuste directo con ajustarEntradas disminuye entradas (24→14 y múltiples entradas) manteniendo salidas intactas', async () => {
  const sql = new DatabaseSync(':memory:');
  const db = adaptar(sql);
  try {
    await migrar(db);
    await crearProducto(db, { ...ficha, stockInicial: 20, precio: 1000 });
    await registrarMovimiento(db, ficha.codigo, 'IN', 4, 'Recepción extra');
    // Stock = 24, Entradas = 24, Salidas = 0
    await actualizarProducto(db, {
      codigo: ficha.codigo,
      nombre: ficha.nombre,
      minimo: ficha.minimo,
      precio: 1000,
      stock: 14,
      stockAnterior: 24,
      motivo: 'Error al ingresar',
      ajustarEntradas: true,
    });
    const prod = await buscarPorCodigo(db, ficha.codigo);
    const resumen = await obtenerResumenEjecutivo(db);
    assert.equal(prod?.stock, 14);
    assert.equal(resumen.entradasUnidades, 14);
    assert.equal(resumen.entradasMontoCLP, 14000);
    assert.equal(resumen.salidasUnidades, 0);
    assert.equal(resumen.salidasMontoCLP, 0);
  } finally { sql.close(); }
});

