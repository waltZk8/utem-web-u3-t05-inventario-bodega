import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { MovimientoDetallado } from '../db/inventario';
import { formatearFechaHoraSlash } from '../lib/periodo';
import { formatearCLP } from '../lib/stock';
import { useTema } from '../theme';

export function FilaMovimiento({
  movimiento: m,
  onPress,
}: {
  movimiento: MovimientoDetallado;
  onPress: (codigo: string) => void;
}) {
  const { paleta } = useTema();
  const esAjuste = m.tipo === 'ADJ';
  const esEntrada = m.tipo === 'IN';
  const color = esAjuste ? paleta.acento : esEntrada ? paleta.verde : paleta.salida;
  const fondoBadge = esAjuste
    ? paleta.acentoSuave
    : esEntrada
      ? paleta.verdeSuave
      : paleta.salidaSuave;

  const tituloTipo = esAjuste
    ? m.entrada_corregida_id
      ? `Rectificación · ${m.stock_antes} → ${m.stock_despues} u.`
      : `Ajuste de stock · ${m.stock_antes} → ${m.stock_despues} u.`
    : `${esEntrada ? 'Entrada' : 'Salida'} · ${m.cantidad} u.`;

  return (
    <Pressable
      onPress={() => onPress(m.codigo)}
      accessibilityRole="button"
      style={({ pressed }) => [
        s.fila,
        { backgroundColor: paleta.superficie, borderColor: paleta.borde },
        pressed && { opacity: 0.85 },
      ]}
    >
      <View style={s.encabezado}>
        <View style={[s.badge, { backgroundColor: fondoBadge }]}>
          <Text style={[s.tipo, { color }]}>{tituloTipo}</Text>
        </View>
        <Text style={[s.monto, { color: esAjuste ? paleta.acento : paleta.texto }]}>
          {esAjuste ? 'Sin salida' : formatearCLP(m.cantidad * m.precio_unitario)}
        </Text>
      </View>

      <Text style={[s.nombre, { color: paleta.texto }]}>{m.nombre_producto}</Text>
      <Text style={[s.meta, { color: paleta.textoSecundario }]}>
        {formatearFechaHoraSlash(m.fecha, true)} · GTIN {m.codigo} · #{m.id}
      </Text>

      {esEntrada && m.cantidad_original !== undefined && m.cantidad_original !== m.cantidad ? (
        <View style={[s.notaBox, { backgroundColor: paleta.acentoSuave }]}>
          <Text style={[s.notaDestacada, { color: paleta.acento }]}>
            Entrada corregida: original {m.cantidad_original} u. → vigente {m.cantidad} u.
          </Text>
        </View>
      ) : null}

      {m.entrada_corregida_id ? (
        <View style={[s.notaBox, { backgroundColor: paleta.acentoSuave }]}>
          <Text style={[s.notaDestacada, { color: paleta.acento }]}>
            Entrada #{m.entrada_corregida_id} ajustada de {m.entrada_cantidad_antes} →{' '}
            {m.entrada_cantidad_despues} u. (no se registró salida)
          </Text>
        </View>
      ) : null}

      {m.nota ? <Text style={[s.nota, { color: paleta.texto }]}>{m.nota}</Text> : null}
    </Pressable>
  );
}

const s = StyleSheet.create({
  fila: {
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    gap: 6,
    marginBottom: 8,
  },
  encabezado: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  tipo: { fontSize: 12.5, fontWeight: '800', fontVariant: ['tabular-nums'] },
  monto: { fontSize: 14, fontWeight: '800', fontVariant: ['tabular-nums'] },
  nombre: { fontWeight: '700', fontSize: 15.5 },
  meta: { fontSize: 12, fontVariant: ['tabular-nums'] },
  notaBox: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  notaDestacada: { fontSize: 12, fontWeight: '700' },
  nota: { fontSize: 13 },
});
