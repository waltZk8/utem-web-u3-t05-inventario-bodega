import React, { useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { BarraSubpantalla } from '../components/BarraSubpantalla';
import { Boton } from '../components/Boton';
import { Cargando } from '../components/Estados';
import {
  correrMedicion,
  N_PRODUCTOS,
  REPETICIONES,
  type ResultadoBench,
} from '../bench/medicion';
import { formatearFechaHoraSlash } from '../lib/periodo';
import { useTema } from '../theme';

function percentilSimple(valores: number[], p: number): number {
  if (valores.length === 0) return 0;
  const orden = [...valores].sort((a, b) => a - b);
  const idx = Math.min(orden.length - 1, Math.ceil((p / 100) * orden.length) - 1);
  return orden[Math.max(0, idx)] ?? 0;
}

/**
 * Diagnóstico de rendimiento M1, M2 y M3 accesible desde Ajustes.
 * Presenta evidencia visual y numérica explícita sobre hardware físico.
 */
export function PantallaMedicion({
  onVolver,
  arranqueMs,
  muestrasM2,
}: {
  onVolver: () => void;
  arranqueMs: number | null;
  muestrasM2: number[];
}) {
  const db = useSQLiteContext();
  const { paleta } = useTema();
  const [fase, setFase] = useState<'inicio' | 'corriendo' | 'listo' | 'error'>('inicio');
  const [res, setRes] = useState<ResultadoBench[]>([]);
  const [fechaEjecucion, setFechaEjecucion] = useState<number | null>(null);
  const [msg, setMsg] = useState('');

  const correr = async () => {
    if (fase === 'corriendo') return;
    setFase('corriendo');
    try {
      const salida = await correrMedicion(db);
      setRes(salida);
      setFechaEjecucion(Date.now());
      setFase('listo');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Error en la medición.');
      setFase('error');
    }
  };

  if (fase === 'corriendo') {
    return (
      <Cargando
        texto={`Sembrando ${N_PRODUCTOS.toLocaleString('es-CL')} productos y midiendo ${REPETICIONES} consultas por motor…`}
      />
    );
  }

  const sqlite = res.find((r) => r.motor === 'SQLite');
  const asyncS = res.find((r) => r.motor === 'AsyncStorage');
  const factorP95 = sqlite && asyncS && sqlite.p95 > 0 ? asyncS.p95 / sqlite.p95 : null;
  const factorP50 = sqlite && asyncS && sqlite.p50 > 0 ? asyncS.p50 / sqlite.p50 : null;

  const promedioM2 =
    muestrasM2.length > 0
      ? muestrasM2.reduce((acc, v) => acc + v, 0) / muestrasM2.length
      : null;
  const minM2 = muestrasM2.length > 0 ? Math.min(...muestrasM2) : null;
  const p95M2 = muestrasM2.length > 0 ? percentilSimple(muestrasM2, 95) : null;
  const maxM2 = muestrasM2.length > 0 ? Math.max(...muestrasM2) : null;

  const cumpleM3 = arranqueMs !== null && arranqueMs < 800;
  const cumpleM2 = promedioM2 !== null && promedioM2 < 1000;

  const barrasComparativas =
    sqlite && asyncS
      ? [
          { etiqueta: 'Mediana (p50)', sql: sqlite.p50, as: asyncS.p50 },
          { etiqueta: 'Percentil 95 (p95)', sql: sqlite.p95, as: asyncS.p95 },
          { etiqueta: 'Peor caso (máx)', sql: sqlite.peor, as: asyncS.peor },
        ]
      : [];

  return (
    <View style={[s.raiz, { backgroundColor: paleta.fondo }]}>
      <BarraSubpantalla
        titulo="Diagnóstico y benchmark"
        subtitulo="Telemetría M1 · M2 · M3"
        onVolver={onVolver}
      />

      <ScrollView contentContainerStyle={s.cont}>
        {/* Tarjeta 1: Entorno */}
        <View
          style={[
            s.tarjeta,
            { backgroundColor: paleta.superficie, borderColor: paleta.borde },
          ]}
        >
          <View style={s.filaCabecera}>
            <Text style={[s.kicker, { color: paleta.textoTerciario }]}>
              ENTORNO DE EJECUCIÓN DETECTADO
            </Text>
            <View
              style={[
                s.badgeModo,
                { backgroundColor: __DEV__ ? paleta.ambarSuave : paleta.verdeSuave },
              ]}
            >
              <Text
                style={[
                  s.badgeModoTxt,
                  { color: __DEV__ ? paleta.ambar : paleta.verde },
                ]}
              >
                {__DEV__ ? 'Desarrollo' : 'Release'}
              </Text>
            </View>
          </View>

          <Text style={[s.entorno, { color: paleta.texto }]}>
            {Platform.OS === 'ios' ? 'iOS' : 'Android'} {String(Platform.Version)} ·{' '}
            {__DEV__ ? 'Expo Go / Metro (__DEV__)' : 'Binario Release nativo'}
          </Text>

          {fechaEjecucion ? (
            <Text style={[s.metaFecha, { color: paleta.textoSecundario }]}>
              Última medición M1: {formatearFechaHoraSlash(fechaEjecucion, true)}
            </Text>
          ) : null}

          {__DEV__ ? (
            <View style={[s.aviso, { backgroundColor: paleta.ambarSuave }]}>
              <Text style={[s.avisoTxt, { color: paleta.ambar }]}>
                En modo desarrollo existe sobrecarga JS. Para los valores oficiales del informe,
                ejecuta esta misma pantalla en el APK Release sobre equipo físico.
              </Text>
            </View>
          ) : null}
        </View>

        {/* Tarjeta 2: Telemetría M3 y M2 en vivo */}
        <View
          style={[
            s.tarjeta,
            { backgroundColor: paleta.superficie, borderColor: paleta.borde },
          ]}
        >
          <Text style={[s.kicker, { color: paleta.textoTerciario }]}>
            TELEMETRÍA DE LA SESIÓN ACTUAL (METAS SLA)
          </Text>

          {/* M3 */}
          <View
            style={[
              s.bloqueMetrica,
              { backgroundColor: paleta.superficieElevada, borderColor: paleta.borde },
            ]}
          >
            <View style={s.filaCabecera}>
              <Text style={[s.lblDato, { color: paleta.texto }]}>
                M3 · Arranque JS hasta UI lista
              </Text>
              {arranqueMs !== null ? (
                <View
                  style={[
                    s.badgeModo,
                    { backgroundColor: cumpleM3 ? paleta.verdeSuave : paleta.ambarSuave },
                  ]}
                >
                  <Text
                    style={[
                      s.badgeModoTxt,
                      { color: cumpleM3 ? paleta.verde : paleta.ambar },
                    ]}
                  >
                    {cumpleM3 ? '✓ < 800 ms' : '> 800 ms'}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text style={[s.valorGrande, { color: paleta.acento }]}>
              {arranqueMs !== null ? `${arranqueMs.toFixed(1)} ms` : '—'}
            </Text>
            {arranqueMs !== null ? (
              <View style={[s.pistaBarra, { backgroundColor: paleta.inputFondo }]}>
                <View
                  style={[
                    s.rellenoBarra,
                    {
                      width: `${Math.max(4, Math.min(100, (arranqueMs / 800) * 100))}%`,
                      backgroundColor: cumpleM3 ? paleta.verde : paleta.ambar,
                    },
                  ]}
                />
              </View>
            ) : null}
            <Text style={[s.notaMini, { color: paleta.textoTerciario }]}>
              Meta arquitectura: &lt; 800 ms · Mide el montaje JS inicial (excluye arranque nativo).
            </Text>
          </View>

          {/* M2 */}
          <View
            style={[
              s.bloqueMetrica,
              { backgroundColor: paleta.superficieElevada, borderColor: paleta.borde },
            ]}
          >
            <View style={s.filaCabecera}>
              <Text style={[s.lblDato, { color: paleta.texto }]}>
                M2 · Consulta SQLite tras escaneo
              </Text>
              {promedioM2 !== null ? (
                <View
                  style={[
                    s.badgeModo,
                    { backgroundColor: cumpleM2 ? paleta.verdeSuave : paleta.rojoSuave },
                  ]}
                >
                  <Text
                    style={[
                      s.badgeModoTxt,
                      { color: cumpleM2 ? paleta.verde : paleta.rojo },
                    ]}
                  >
                    {cumpleM2 ? '✓ < 1 s' : '> 1 s'}
                  </Text>
                </View>
              ) : null}
            </View>

            {promedioM2 !== null ? (
              <>
                <Text style={[s.valorGrande, { color: paleta.verde }]}>
                  {promedioM2.toFixed(2)} ms{' '}
                  <Text style={[s.subValor, { color: paleta.textoSecundario }]}>
                    promedio ({muestrasM2.length} muestras)
                  </Text>
                </Text>
                <View style={s.gridMini}>
                  <View style={s.celdaMini}>
                    <Text style={[s.miniLbl, { color: paleta.textoTerciario }]}>MÍN</Text>
                    <Text style={[s.miniVal, { color: paleta.texto }]}>
                      {minM2!.toFixed(2)} ms
                    </Text>
                  </View>
                  <View style={s.celdaMini}>
                    <Text style={[s.miniLbl, { color: paleta.textoTerciario }]}>P95</Text>
                    <Text style={[s.miniVal, { color: paleta.acento }]}>
                      {p95M2!.toFixed(2)} ms
                    </Text>
                  </View>
                  <View style={s.celdaMini}>
                    <Text style={[s.miniLbl, { color: paleta.textoTerciario }]}>MÁX</Text>
                    <Text style={[s.miniVal, { color: paleta.texto }]}>
                      {maxM2!.toFixed(2)} ms
                    </Text>
                  </View>
                </View>
              </>
            ) : (
              <Text style={[s.parrafo, { color: paleta.textoSecundario }]}>
                Aún sin muestras en esta sesión. Escanea o busca un producto para registrar M2.
              </Text>
            )}
          </View>
        </View>

        {/* Tarjeta 3: Prueba M1 */}
        <View
          style={[
            s.tarjeta,
            { backgroundColor: paleta.superficie, borderColor: paleta.borde },
          ]}
        >
          <Text style={[s.kicker, { color: paleta.textoTerciario }]}>
            PRUEBA M1 · SQLITE VS ASYNCSTORAGE ({N_PRODUCTOS.toLocaleString('es-CL')} SKUS)
          </Text>
          <Text style={[s.parrafo, { color: paleta.textoSecundario }]}>
            Ejecuta {REPETICIONES} búsquedas por código distinto sobre{' '}
            {N_PRODUCTOS.toLocaleString('es-CL')} artículos comparando índice primario B-tree
            (SQLite) frente a lectura y parseo JSON lineal (AsyncStorage).
          </Text>

          {fase === 'error' ? (
            <Text style={[s.error, { color: paleta.rojo }]}>{msg}</Text>
          ) : null}

          {fase === 'listo' && sqlite && asyncS ? (
            <>
              {/* Hero ganador */}
              {factorP95 ? (
                <View
                  style={[
                    s.heroGanador,
                    { backgroundColor: paleta.verdeSuave, borderColor: paleta.verde },
                  ]}
                >
                  <Ionicons name="flash" size={22} color={paleta.verde} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[s.ganadorTitulo, { color: paleta.verde }]}>
                      SQLite fue {factorP95.toFixed(1)}× más rápido en p95
                    </Text>
                    <Text style={[s.ganadorSub, { color: paleta.texto }]}>
                      En mediana (p50): {factorP50 ? `${factorP50.toFixed(1)}×` : '—'} ·{' '}
                      {sqlite.p95.toFixed(2)} ms vs {asyncS.p95.toFixed(2)} ms
                    </Text>
                  </View>
                </View>
              ) : null}

              {/* Gráfico visual de barras comparativas */}
              <View
                style={[
                  s.bloqueMetrica,
                  { backgroundColor: paleta.superficieElevada, borderColor: paleta.borde },
                ]}
              >
                <Text style={[s.kicker, { color: paleta.textoTerciario }]}>
                  COMPARACIÓN VISUAL DE LATENCIA (MENOR ES MEJOR)
                </Text>
                {barrasComparativas.map((b) => {
                  const maxVal = Math.max(0.01, b.sql, b.as);
                  const wSql = Math.max(3, Math.round((b.sql / maxVal) * 100));
                  const wAs = Math.max(3, Math.round((b.as / maxVal) * 100));
                  return (
                    <View key={b.etiqueta} style={s.grupoBarra}>
                      <Text style={[s.etqBarra, { color: paleta.texto }]}>{b.etiqueta}</Text>
                      <View style={s.filaBarra}>
                        <Text style={[s.lblMotor, { color: paleta.verde }]}>SQLite</Text>
                        <View style={[s.pistaBarraFlex, { backgroundColor: paleta.inputFondo }]}>
                          <View
                            style={[
                              s.rellenoBarra,
                              { width: `${wSql}%`, backgroundColor: paleta.verde },
                            ]}
                          />
                        </View>
                        <Text style={[s.valBarra, { color: paleta.verde }]}>
                          {b.sql.toFixed(2)} ms
                        </Text>
                      </View>
                      <View style={s.filaBarra}>
                        <Text style={[s.lblMotor, { color: paleta.rojo }]}>AsyncSt.</Text>
                        <View style={[s.pistaBarraFlex, { backgroundColor: paleta.inputFondo }]}>
                          <View
                            style={[
                              s.rellenoBarra,
                              { width: `${wAs}%`, backgroundColor: paleta.rojo },
                            ]}
                          />
                        </View>
                        <Text style={[s.valBarra, { color: paleta.rojo }]}>
                          {b.as.toFixed(2)} ms
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* Tabla numérica completa */}
              <View
                style={[
                  s.tabla,
                  { borderColor: paleta.borde, backgroundColor: paleta.superficieElevada },
                ]}
              >
                <View style={[s.filaTabla, { borderBottomColor: paleta.separador }]}>
                  <Text
                    style={[
                      s.celda,
                      { flex: 1.5, textAlign: 'left', color: paleta.textoTerciario },
                    ]}
                  >
                    MOTOR (ms)
                  </Text>
                  <Text style={[s.celda, { color: paleta.textoTerciario }]}>mín</Text>
                  <Text style={[s.celda, { color: paleta.textoTerciario }]}>p50</Text>
                  <Text style={[s.celda, { color: paleta.textoTerciario }]}>p95</Text>
                  <Text style={[s.celda, { color: paleta.textoTerciario }]}>peor</Text>
                </View>
                {res.map((r) => (
                  <View
                    key={r.motor}
                    style={[s.filaTabla, { borderBottomColor: paleta.separador }]}
                  >
                    <Text
                      style={[
                        s.celda,
                        {
                          flex: 1.5,
                          textAlign: 'left',
                          fontWeight: '800',
                          color: r.motor === 'SQLite' ? paleta.verde : paleta.rojo,
                        },
                      ]}
                    >
                      {r.motor}
                    </Text>
                    <Text style={[s.celda, { color: paleta.textoSecundario }]}>
                      {r.mejor.toFixed(2)}
                    </Text>
                    <Text style={[s.celda, { color: paleta.texto }]}>{r.p50.toFixed(2)}</Text>
                    <Text style={[s.celda, { color: paleta.texto, fontWeight: '800' }]}>
                      {r.p95.toFixed(2)}
                    </Text>
                    <Text style={[s.celda, { color: paleta.textoSecundario }]}>
                      {r.peor.toFixed(2)}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Indicadores técnicos adicionales */}
              <View style={s.gridDetalles}>
                <View
                  style={[
                    s.cardDetalle,
                    { backgroundColor: paleta.superficieElevada, borderColor: paleta.borde },
                  ]}
                >
                  <Text style={[s.miniLbl, { color: paleta.textoTerciario }]}>
                    CAPACIDAD (OPS/SEG)
                  </Text>
                  <Text style={[s.detVal, { color: paleta.verde }]}>
                    SQLite: {Math.round(sqlite.opsPorSeg).toLocaleString('es-CL')}/s
                  </Text>
                  <Text style={[s.detSub, { color: paleta.rojo }]}>
                    AsyncSt.: {Math.round(asyncS.opsPorSeg).toLocaleString('es-CL')}/s
                  </Text>
                </View>
                <View
                  style={[
                    s.cardDetalle,
                    { backgroundColor: paleta.superficieElevada, borderColor: paleta.borde },
                  ]}
                >
                  <Text style={[s.miniLbl, { color: paleta.textoTerciario }]}>
                    LEÍDO POR BÚSQUEDA
                  </Text>
                  <Text style={[s.detVal, { color: paleta.verde }]}>SQLite: 1 fila (~0,1 KB)</Text>
                  <Text style={[s.detSub, { color: paleta.rojo }]}>
                    AsyncSt.: {asyncS.tamanoKB.toFixed(0)} KB JSON
                  </Text>
                </View>
              </View>

              <Text style={[s.notaMini, { color: paleta.textoSecundario }]}>
                Siembra 5.000 SKUs: SQLite {sqlite.siembraMs.toFixed(0)} ms (transacción única) ·
                AsyncStorage {asyncS.siembraMs.toFixed(0)} ms · Complejidad: O(log n) B-tree vs
                O(n) JSON.parse.
              </Text>
            </>
          ) : null}

          <Boton
            titulo={fase === 'listo' ? 'Repetir prueba M1' : 'Ejecutar prueba M1 (5.000 SKUs)'}
            onPress={correr}
          />
          <Text style={[s.notaMini, { color: paleta.textoTerciario }]}>
            Resultados en milisegundos. La tabla temporal de prueba se elimina automáticamente al
            terminar y no modifica tu inventario real.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  raiz: { flex: 1 },
  cont: { padding: 16, paddingBottom: 42, gap: 14 },
  tarjeta: {
    borderRadius: 18,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 11,
  },
  filaCabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  kicker: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.6 },
  entorno: { fontSize: 15, fontWeight: '700' },
  metaFecha: { fontSize: 12, fontVariant: ['tabular-nums'] },
  badgeModo: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeModoTxt: { fontSize: 11.5, fontWeight: '800' },
  aviso: { borderRadius: 12, padding: 11 },
  avisoTxt: { fontSize: 12.5, fontWeight: '600', lineHeight: 18 },
  bloqueMetrica: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 8,
  },
  lblDato: { flex: 1, fontSize: 13.5, fontWeight: '700' },
  valorGrande: { fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] },
  subValor: { fontSize: 13, fontWeight: '600' },
  gridMini: { flexDirection: 'row', gap: 8, marginTop: 2 },
  celdaMini: { flex: 1, gap: 2 },
  miniLbl: { fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },
  miniVal: { fontSize: 13.5, fontWeight: '800', fontVariant: ['tabular-nums'] },
  parrafo: { fontSize: 13.5, lineHeight: 19 },
  notaMini: { fontSize: 12, lineHeight: 17 },
  error: { fontSize: 14, fontWeight: '700' },
  heroGanador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  ganadorTitulo: { fontSize: 15.5, fontWeight: '800' },
  ganadorSub: { fontSize: 12.5, fontWeight: '600', fontVariant: ['tabular-nums'] },
  grupoBarra: { gap: 5 },
  etqBarra: { fontSize: 12.5, fontWeight: '700' },
  filaBarra: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  lblMotor: { width: 58, fontSize: 11.5, fontWeight: '700' },
  pistaBarra: { height: 8, borderRadius: 999, overflow: 'hidden' },
  pistaBarraFlex: { flex: 1, height: 10, borderRadius: 999, overflow: 'hidden' },
  rellenoBarra: { height: '100%', borderRadius: 999 },
  valBarra: {
    width: 68,
    textAlign: 'right',
    fontSize: 11.5,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  tabla: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  filaTabla: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  celda: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 6,
    fontSize: 12,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  gridDetalles: { flexDirection: 'row', gap: 10 },
  cardDetalle: {
    flex: 1,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 11,
    gap: 4,
  },
  detVal: { fontSize: 12.5, fontWeight: '800', fontVariant: ['tabular-nums'] },
  detSub: { fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
