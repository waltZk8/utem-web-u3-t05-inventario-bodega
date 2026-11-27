import React, { useState } from 'react';
import { Modal, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { fechaLocal, formatearFechaSlash, leerFechaLocal, resolverPeriodo, type ModoPeriodo } from '../lib/periodo';
import { usePeriodo } from '../periodo';
import { useTema } from '../theme';
import { Boton } from './Boton';

const OPCIONES: Array<[ModoPeriodo, string]> = [['hoy', 'Hoy'], ['7dias', '7 días'], ['30dias', '1M'], ['3meses', '3M'], ['6meses', '6M'], ['1ano', '1A'], ['mes', 'Este mes'], ['ano', 'Este año'], ['todo', 'Todo'], ['rango', 'Elegir fechas']];

export function SelectorPeriodo() {
  const { seleccion, periodo, cambiar } = usePeriodo();
  const { paleta } = useTema();
  const [abierto, abrir] = useState(false);
  const [desde, setDesde] = useState(seleccion.desde);
  const [hasta, setHasta] = useState(seleccion.hasta);
  const [campo, setCampo] = useState<'desde' | 'hasta' | null>(null);
  const [error, setError] = useState('');
  const elegir = () => {
    setDesde(periodo.desde === null ? seleccion.desde : fechaLocal(new Date(periodo.desde)));
    setHasta(periodo.hasta === null ? seleccion.hasta : fechaLocal(new Date(periodo.hasta - 1)));
    setCampo(null); setError(''); abrir(true);
  };

  return (
    <View style={[s.caja, { backgroundColor: paleta.superficie, borderColor: paleta.borde }]}>
      <Text style={[s.titulo, { color: paleta.texto }]}>Período de movimientos</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.opciones}>
        {OPCIONES.map(([modo, texto]) => (
          <Pressable key={modo} accessibilityRole="button" accessibilityState={{ selected: seleccion.modo === modo }}
            onPress={() => modo === 'rango' ? elegir() : cambiar({ ...seleccion, modo })}
            style={[s.chip, { backgroundColor: seleccion.modo === modo ? paleta.acentoSuave : paleta.inputFondo }]}>
            <Text style={{ color: seleccion.modo === modo ? paleta.acento : paleta.texto, fontWeight: '700' }}>{texto}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <Text style={{ color: paleta.texto, fontWeight: '600' }}>{periodo.etiqueta}</Text>
      <Text style={{ color: paleta.textoSecundario }}>{periodo.detalle}</Text>
      <Text style={{ color: paleta.textoTerciario, fontSize: 12 }}>Hora local del teléfono · stock y alertas siempre actuales</Text>
      <Modal visible={abierto} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => abrir(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: paleta.fondo }}>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 18 }}>
            <Text style={[s.titulo, { color: paleta.texto }]}>Elegir período</Text>
            <Text style={{ color: paleta.textoSecundario }}>Incluye los días inicial y final completos. Cambiar el período también actualiza Inicio, historial y reportes.</Text>
            {(['desde', 'hasta'] as const).map((c) => (
              <Boton key={c} titulo={`${c === 'desde' ? 'Desde' : 'Hasta'}: ${formatearFechaSlash(leerFechaLocal(c === 'desde' ? desde : hasta))}`}
                estilo="secundario" onPress={() => setCampo(c)} />
            ))}
            {campo ? <DateTimePicker value={leerFechaLocal(campo === 'desde' ? desde : hasta)} mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'calendar'} themeVariant={paleta.oscura ? 'dark' : 'light'}
              onChange={(evento, fecha) => {
                if (Platform.OS === 'android') setCampo(null);
                if (evento.type === 'set' && fecha) (campo === 'desde' ? setDesde : setHasta)(fechaLocal(fecha));
              }} /> : null}
            {error ? <Text accessibilityRole="alert" style={{ color: paleta.rojo }}>{error}</Text> : null}
            <Boton titulo="Aplicar período" onPress={() => {
              try { resolverPeriodo({ modo: 'rango', desde, hasta }); cambiar({ modo: 'rango', desde, hasta }); abrir(false); }
              catch (e) { setError(e instanceof Error ? e.message : 'Revisa las fechas.'); }
            }} />
            <Boton titulo="Cancelar" estilo="fantasma" onPress={() => abrir(false)} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  caja: { padding: 14, borderWidth: StyleSheet.hairlineWidth, borderRadius: 18, gap: 8 },
  titulo: { fontSize: 18, fontWeight: '800' }, opciones: { flexDirection: 'row', gap: 6 },
  chip: { minHeight: 44, paddingHorizontal: 12, paddingVertical: 12, borderRadius: 12, justifyContent: 'center' },
});
