import React from 'react';
import { Pressable, Text, View } from 'react-native';
import type { ResumenEjecutivo } from '../db/inventario';
import { usePeriodo } from '../periodo';
import { formatearFechaSlash } from '../lib/periodo';
import { formatearCLP } from '../lib/stock';
import { useTema } from '../theme';

/** Fechas y cifras se muestran juntas para que el alcance no se pierda al desplazarse. */
export function ResumenFlujos({ resumen, onCambiarFechas }: { resumen: ResumenEjecutivo; onCambiarFechas?: () => void }) {
  const { periodo } = usePeriodo();
  const { paleta: c } = useTema();
  return <View style={{ padding: 14, gap: 10, borderRadius: 18, backgroundColor: c.superficie, borderWidth: 1, borderColor: c.borde }}>
    <Text style={{ color: c.texto, fontSize: 17, fontWeight: '800' }}>Movimientos · {periodo.etiqueta}</Text>
    <Text style={{ color: c.texto, fontWeight: '600' }}>{periodo.detalle}</Text>
    {periodo.desde === null ? <Text style={{ color: c.textoSecundario }}>{resumen.primeraFecha !== null && resumen.ultimaFecha !== null
      ? `Registros: ${formatearFechaSlash(resumen.primeraFecha)} — ${formatearFechaSlash(resumen.ultimaFecha)}`
      : 'Sin movimientos registrados'}</Text> : null}
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
      <View style={{ flex: 1, minWidth: 115, gap: 4 }}>
        <Text style={{ color: c.textoSecundario, fontSize: 12, fontWeight: '700' }}>ENTRADAS / RECEPCIÓN</Text>
        <Text style={{ color: c.verde, fontSize: 22, fontWeight: '800' }}>{formatearCLP(resumen.entradasMontoCLP)}</Text>
        <Text style={{ color: c.verde }}>{resumen.entradasUnidades.toLocaleString('es-CL')} unidades</Text>
      </View>
      <View style={{ flex: 1, minWidth: 115, gap: 4 }}>
        <Text style={{ color: c.textoSecundario, fontSize: 12, fontWeight: '700' }}>SALIDAS / DESPACHOS</Text>
        <Text style={{ color: c.salida, fontSize: 22, fontWeight: '800' }}>{formatearCLP(resumen.salidasMontoCLP)}</Text>
        <Text style={{ color: c.salida }}>{resumen.salidasUnidades.toLocaleString('es-CL')} unidades</Text>
      </View>
    </View>
    <Text style={{ color: c.textoSecundario, fontSize: 12 }}>Entradas con correcciones aplicadas · salidas registradas · conteos separados</Text>
    {onCambiarFechas ? <Pressable onPress={onCambiarFechas} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}>
      <Text style={{ color: c.acento, fontWeight: '700' }}>Cambiar período en Dashboard ›</Text>
    </Pressable> : null}
  </View>;
}
