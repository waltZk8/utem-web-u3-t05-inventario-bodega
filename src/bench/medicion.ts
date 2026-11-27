import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * Medición M1: búsqueda de un producto por código en una bodega de 5.000
 * productos, comparando SQLite con índice contra AsyncStorage con un arreglo
 * JSON. Es la evidencia de la decisión de arquitectura: AsyncStorage obliga
 * a leer y parsear el arreglo completo en cada búsqueda, mientras SQLite
 * resuelve por PRIMARY KEY.
 *
 * Se ejecuta DENTRO de la app, en el teléfono físico y con build de
 * release. Medir esto en el emulador o en modo desarrollo da números que no
 * corresponden a lo que vive el usuario.
 */

export const N_PRODUCTOS = 5000;
export const REPETICIONES = 30;
const CLAVE_AS = 'bench_productos';

function codigoSintetico(i: number): string {
  // Códigos sintéticos de 13 dígitos. No son GTIN reales ni se validan:
  // la medición compara el costo de la búsqueda, no el del parseo.
  return String(7800000000000 + i);
}

function percentil(valores: number[], p: number): number {
  const orden = [...valores].sort((a, b) => a - b);
  const i = Math.min(orden.length - 1, Math.ceil((p / 100) * orden.length) - 1);
  return orden[Math.max(0, i)] ?? 0;
}

export interface ResultadoBench {
  motor: 'SQLite' | 'AsyncStorage';
  mejor: number;
  p50: number;
  promedio: number;
  p95: number;
  peor: number;
  siembraMs: number;
  tamanoKB: number;
  opsPorSeg: number;
  muestras: number;
}

async function sembrarSQLite(db: SQLiteDatabase): Promise<number> {
  await db.execAsync('DROP TABLE IF EXISTS bench_productos');
  await db.execAsync(
    'CREATE TABLE bench_productos (codigo TEXT PRIMARY KEY, nombre TEXT, stock INTEGER)'
  );
  const t0 = performance.now();
  // Una sola transacción para 5.000 INSERT: sin ella, cada INSERT confirma
  // en disco por separado y la siembra tarda minutos en vez de segundos.
  await db.withExclusiveTransactionAsync(async (tx) => {
    const stmt = await tx.prepareAsync(
      'INSERT INTO bench_productos (codigo, nombre, stock) VALUES (?, ?, ?)'
    );
    try {
      for (let i = 0; i < N_PRODUCTOS; i++) {
        await stmt.executeAsync(codigoSintetico(i), `Producto ${i}`, i % 50);
      }
    } finally {
      await stmt.finalizeAsync();
    }
  });
  return performance.now() - t0;
}

async function sembrarAsyncStorage(): Promise<{ siembraMs: number; tamanoKB: number }> {
  const t0 = performance.now();
  const arreglo = Array.from({ length: N_PRODUCTOS }, (_, i) => ({
    codigo: codigoSintetico(i),
    nombre: `Producto ${i}`,
    stock: i % 50,
  }));
  const json = JSON.stringify(arreglo);
  await AsyncStorage.setItem(CLAVE_AS, json);
  return {
    siembraMs: performance.now() - t0,
    tamanoKB: json.length / 1024,
  };
}

export async function medirSQLite(
  db: SQLiteDatabase,
  siembraMs = 0
): Promise<ResultadoBench> {
  const t: number[] = [];
  for (let r = 0; r < REPETICIONES; r++) {
    // Un código distinto por repetición. Aun así, el motor puede reutilizar
    // páginas en caché; esta es una medición con calentamiento, no de disco frío.
    const objetivo = codigoSintetico(Math.floor((r * 997) % N_PRODUCTOS));
    const t0 = performance.now();
    await db.getFirstAsync('SELECT * FROM bench_productos WHERE codigo = ?', objetivo);
    t.push(performance.now() - t0);
  }
  const promedio = t.reduce((a, v) => a + v, 0) / Math.max(1, t.length);
  return {
    motor: 'SQLite',
    mejor: Math.min(...t),
    p50: percentil(t, 50),
    promedio,
    p95: percentil(t, 95),
    peor: Math.max(...t),
    siembraMs,
    tamanoKB: 0.08, // lectura puntual de 1 fila vía índice B-tree
    opsPorSeg: promedio > 0 ? 1000 / promedio : 0,
    muestras: t.length,
  };
}

export async function medirAsyncStorage(
  siembraMs = 0,
  tamanoKB = 0
): Promise<ResultadoBench> {
  const t: number[] = [];
  let bytesLeidos = tamanoKB;
  for (let r = 0; r < REPETICIONES; r++) {
    const objetivo = codigoSintetico(Math.floor((r * 997) % N_PRODUCTOS));
    const t0 = performance.now();
    // Este es el costo real del enfoque: leer la cadena completa, parsearla
    // y recorrer el arreglo. No hay índice posible.
    const crudo = await AsyncStorage.getItem(CLAVE_AS);
    if (r === 0 && crudo && bytesLeidos === 0) bytesLeidos = crudo.length / 1024;
    const arreglo = crudo ? (JSON.parse(crudo) as { codigo: string }[]) : [];
    arreglo.find((p) => p.codigo === objetivo);
    t.push(performance.now() - t0);
  }
  const promedio = t.reduce((a, v) => a + v, 0) / Math.max(1, t.length);
  return {
    motor: 'AsyncStorage',
    mejor: Math.min(...t),
    p50: percentil(t, 50),
    promedio,
    p95: percentil(t, 95),
    peor: Math.max(...t),
    siembraMs,
    tamanoKB: bytesLeidos,
    opsPorSeg: promedio > 0 ? 1000 / promedio : 0,
    muestras: t.length,
  };
}

export async function correrMedicion(db: SQLiteDatabase): Promise<ResultadoBench[]> {
  try {
    const siembraSql = await sembrarSQLite(db);
    const { siembraMs: siembraAs, tamanoKB } = await sembrarAsyncStorage();
    // Una pasada en vacío antes de medir: la primera consulta paga la apertura
    // de la base y el calentamiento del motor de JavaScript.
    await db.getFirstAsync('SELECT * FROM bench_productos LIMIT 1');
    await AsyncStorage.getItem(CLAVE_AS);

    const sqlite = await medirSQLite(db, siembraSql);
    const asyncS = await medirAsyncStorage(siembraAs, tamanoKB);
    return [sqlite, asyncS];
  } finally {
    await limpiarMedicion(db);
  }
}

export async function limpiarMedicion(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('DROP TABLE IF EXISTS bench_productos');
  await AsyncStorage.removeItem(CLAVE_AS);
}
