import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Polygon,
  Polyline,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import type { Evolucion, PuntoEvolucion } from '../db/evolucion';
import { formatearFechaSlash } from '../lib/periodo';
import { useTema } from '../theme';
import { SelectorSegmentado } from './SelectorSegmentado';

const intervalo = (p: PuntoEvolucion) => {
  const f1 = formatearFechaSlash(p.desde);
  const f2 = formatearFechaSlash(p.hasta - 1);
  return f1 === f2 ? f1 : `${f1} al ${f2}`;
};

export function GraficoEvolucion({ datos }: { datos: Evolucion }) {
  const { paleta: c } = useTema();
  const [ancho, setAncho] = useState(280);
  const [indice, setIndice] = useState<number | null>(null);
  const [tabla, setTabla] = useState(false);
  const [tipo, setTipo] = useState<'entradas' | 'salidas'>('entradas');

  const color = tipo === 'entradas' ? c.verde : c.salida;
  const fondoSuave = tipo === 'entradas' ? c.verdeSuave : c.salidaSuave;
  const etiqueta = tipo === 'entradas' ? 'Entradas' : 'Salidas';
  const { puntos } = datos;
  const i = Math.max(0, Math.min(indice ?? puntos.length - 1, puntos.length - 1));
  const seleccionado = puntos[i];

  const izquierda = 46;
  const derecha = Math.max(izquierda + 1, ancho - 12);
  const arriba = 16;
  const abajo = 186;
  const maximo = Math.max(0, ...puntos.map((p) => p[tipo]));
  const techo = maximo <= 4 ? 4 : Math.ceil(maximo / 4) * 4;
  const x = (n: number) =>
    puntos.length <= 1
      ? (izquierda + derecha) / 2
      : izquierda + (n * (derecha - izquierda)) / (puntos.length - 1);
  const y = (n: number) => abajo - (n / techo) * (abajo - arriba);
  const elegir = (px: number) => {
    if (puntos.length <= 1) {
      setIndice(0);
      return;
    }
    setIndice(
      Math.max(
        0,
        Math.min(
          puntos.length - 1,
          Math.round(((px - izquierda) / (derecha - izquierda)) * (puntos.length - 1))
        )
      )
    );
  };

  const puntosLinea = puntos.map((p, j) => `${x(j)},${y(p[tipo])}`).join(' ');
  const puntosArea =
    puntos.length > 0
      ? `${x(0)},${abajo} ${puntosLinea} ${x(puntos.length - 1)},${abajo}`
      : '';

  const totalSerie = puntos.reduce((acc, p) => acc + p[tipo], 0);
  const promedio = puntos.length > 0 ? totalSerie / puntos.length : 0;

  return (
    <View style={[s.tarjeta, { backgroundColor: c.superficie, borderColor: c.borde }]}>
      <View style={s.cabecera}>
        <View style={{ flex: 1 }}>
          <Text style={[s.kicker, { color: c.textoTerciario }]}>
            ANÁLISIS TEMPORAL · POR {datos.agrupacion.toUpperCase()}
          </Text>
          <Text style={[s.titulo, { color: c.texto }]}>Evolución por fecha</Text>
        </View>
        <View style={[s.chipModo, { backgroundColor: fondoSuave }]}>
          <Ionicons
            name={tipo === 'entradas' ? 'trending-up' : 'trending-down'}
            size={14}
            color={color}
          />
          <Text style={[s.chipModoTxt, { color }]}>{etiqueta}</Text>
        </View>
      </View>

      <SelectorSegmentado
        valor={tipo}
        onChange={setTipo}
        opciones={[
          { valor: 'entradas', etiqueta: 'Entradas' },
          { valor: 'salidas', etiqueta: 'Salidas' },
        ]}
      />

      <View style={s.tabsRow}>
        {['Gráfico', 'Tabla'].map((nombre, j) => {
          const activo = tabla === !!j;
          return (
            <Pressable
              key={nombre}
              accessibilityRole="button"
              accessibilityState={{ selected: activo }}
              onPress={() => setTabla(!!j)}
              style={[
                s.tabBtn,
                { borderBottomColor: activo ? c.acento : 'transparent' },
              ]}
            >
              <Text
                style={{
                  color: activo ? c.acento : c.textoSecundario,
                  fontWeight: '700',
                  fontSize: 13.5,
                }}
              >
                {nombre}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {!puntos.length ? (
        <Text style={{ color: c.textoSecundario }}>
          No hay entradas ni salidas registradas en este período.
        </Text>
      ) : tabla ? (
        <ScrollView style={{ maxHeight: 300 }} nestedScrollEnabled>
          <View style={[s.tablaHead, { borderBottomColor: c.borde }]}>
            <Text style={{ color: c.textoSecundario, fontWeight: '700', fontSize: 12 }}>
              FECHA
            </Text>
            <Text style={{ color: c.textoSecundario, fontWeight: '700', fontSize: 12 }}>
              {etiqueta.toUpperCase()} (U.)
            </Text>
          </View>
          {puntos.map((p) => (
            <View
              key={p.desde}
              style={[s.tablaFila, { borderBottomColor: c.separador }]}
            >
              <Text style={{ color: c.texto, fontVariant: ['tabular-nums'] }}>
                {intervalo(p)}
              </Text>
              <Text style={{ color, fontWeight: '800', fontVariant: ['tabular-nums'] }}>
                {p[tipo].toLocaleString('es-CL')} u.
              </Text>
            </View>
          ))}
        </ScrollView>
      ) : (
        <>
          <View
            accessibilityLiveRegion="polite"
            style={[
              s.inspector,
              { backgroundColor: c.superficieElevada, borderColor: c.borde },
            ]}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[s.inspectorFecha, { color: c.textoSecundario }]}>
                {seleccionado ? intervalo(seleccionado) : ''}
              </Text>
              <Text style={[s.inspectorValor, { color }]}>
                {seleccionado?.[tipo].toLocaleString('es-CL')} u.
              </Text>
            </View>
            <View style={s.inspectorStats}>
              <Text style={[s.statMiniLbl, { color: c.textoTerciario }]}>
                MÁX: <Text style={{ color: c.texto, fontWeight: '800' }}>{maximo} u.</Text>
              </Text>
              <Text style={[s.statMiniLbl, { color: c.textoTerciario }]}>
                PROM: <Text style={{ color: c.texto, fontWeight: '800' }}>{promedio.toFixed(1)} u.</Text>
              </Text>
            </View>
          </View>

          <View
            onLayout={(e) => setAncho(e.nativeEvent.layout.width)}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderGrant={(e) => elegir(e.nativeEvent.locationX)}
            onResponderMove={(e) => elegir(e.nativeEvent.locationX)}
            accessibilityLabel={`Evolución de ${etiqueta.toLowerCase()}. Usa Tabla para consultar todos los valores.`}
          >
            <Svg width={ancho} height={222} pointerEvents="none">
              <Defs>
                <LinearGradient id="gradArea" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor={color} stopOpacity="0.28" />
                  <Stop offset="100%" stopColor={color} stopOpacity="0.02" />
                </LinearGradient>
              </Defs>

              {[0, 1, 2, 3, 4].map((n) => (
                <React.Fragment key={n}>
                  <Line
                    x1={izquierda}
                    x2={derecha}
                    y1={y((n * techo) / 4)}
                    y2={y((n * techo) / 4)}
                    stroke={c.borde}
                    strokeDasharray={n === 0 ? undefined : '3 4'}
                  />
                  <SvgText
                    x={izquierda - 6}
                    y={y((n * techo) / 4) + 4}
                    textAnchor="end"
                    fill={c.textoSecundario}
                    fontSize={10}
                  >
                    {Intl.NumberFormat('es-CL', { notation: 'compact' }).format(
                      (n * techo) / 4
                    )}
                  </SvgText>
                </React.Fragment>
              ))}

              {puntos.length > 1 ? (
                <Polygon points={puntosArea} fill="url(#gradArea)" />
              ) : null}

              <Polyline
                points={puntosLinea}
                fill="none"
                stroke={color}
                strokeWidth={3}
                strokeLinejoin="round"
                strokeLinecap="round"
              />

              <Line
                x1={x(i)}
                x2={x(i)}
                y1={arriba}
                y2={abajo}
                stroke={c.acento}
                strokeDasharray="4 4"
              />

              {seleccionado ? (
                <>
                  <Circle
                    cx={x(i)}
                    cy={y(seleccionado[tipo])}
                    r={9}
                    fill={color}
                    fillOpacity={0.2}
                  />
                  <Circle
                    cx={x(i)}
                    cy={y(seleccionado[tipo])}
                    r={5}
                    fill={color}
                    stroke={c.superficie}
                    strokeWidth={2}
                  />
                </>
              ) : null}

              {[0, Math.floor((puntos.length - 1) / 2), puntos.length - 1]
                .filter((v, j, a) => a.indexOf(v) === j)
                .map((j, k) => (
                  <SvgText
                    key={j}
                    x={x(j)}
                    y={210}
                    textAnchor={
                      k === 0
                        ? 'start'
                        : j === puntos.length - 1
                          ? 'end'
                          : 'middle'
                    }
                    fill={c.textoSecundario}
                    fontSize={10}
                  >
                    {formatearFechaSlash(puntos[j]!.desde)}
                  </SvgText>
                ))}
            </Svg>
          </View>

          <Text style={{ color: c.textoTerciario, fontSize: 12, textAlign: 'center' }}>
            Toca o desliza sobre la curva para consultar cualquier fecha.
          </Text>

          <View style={s.navRow}>
            {[-1, 1].map((paso) => {
              const disabled = i + paso < 0 || i + paso >= puntos.length;
              return (
                <Pressable
                  key={paso}
                  accessibilityRole="button"
                  disabled={disabled}
                  onPress={() => setIndice(i + paso)}
                  style={[
                    s.navBtn,
                    { backgroundColor: c.inputFondo, opacity: disabled ? 0.45 : 1 },
                  ]}
                >
                  <Text style={{ color: disabled ? c.textoTerciario : c.acento, fontWeight: '700', fontSize: 13 }}>
                    {paso < 0 ? '‹ Fecha anterior' : 'Fecha siguiente ›'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  tarjeta: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  kicker: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.6 },
  titulo: { fontSize: 19, fontWeight: '800', marginTop: 2 },
  chipModo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  chipModoTxt: { fontSize: 12, fontWeight: '800' },
  tabsRow: { flexDirection: 'row', gap: 12 },
  tabBtn: { minHeight: 40, paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 2 },
  inspector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  inspectorFecha: { fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },
  inspectorValor: { fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] },
  inspectorStats: { alignItems: 'flex-end', gap: 3 },
  statMiniLbl: { fontSize: 11, fontWeight: '600', fontVariant: ['tabular-nums'] },
  tablaHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    marginBottom: 4,
  },
  tablaFila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  navBtn: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
