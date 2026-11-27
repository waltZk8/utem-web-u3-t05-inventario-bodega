import React, { useEffect, useRef, useState } from 'react';
import { FlatList, Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { listarMovimientosGlobales, type Movimiento } from '../db/inventario';
import { formatearFechaHoraSlash } from '../lib/periodo';
import { useTema } from '../theme';
import { Boton } from './Boton';

export function ElegirEntradaCorreccion({ codigo, seleccion, diferencia, onElegir, deshabilitado = false }: {
  codigo: string; seleccion: Movimiento | null; diferencia: number | null;
  onElegir: (m: Movimiento | null) => void; deshabilitado?: boolean;
}) {
  const db = useSQLiteContext(); const { paleta: c } = useTema();
  const [entradas, setEntradas] = useState<Movimiento[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [hayMas, setHayMas] = useState(false);
  const [ocupado, setOcupado] = useState(true);
  const [error, setError] = useState('');
  const [reintento, setReintento] = useState(0);
  const generacion = useRef(0); const cargando = useRef(false);
  useEffect(() => {
    const n = ++generacion.current; cargando.current = true; setOcupado(true); setError(''); setEntradas([]); setHayMas(false);
    onElegir(null);
    listarMovimientosGlobales(db, { tipo: 'IN', codigo, limite: 51 })
      .then((filas) => {
        if (n !== generacion.current) return;
        setEntradas(filas.slice(0, 50)); setHayMas(filas.length > 50);
        if (filas.length === 1) onElegir(filas[0]!);
      })
      .catch((e) => { if (n === generacion.current) setError(e instanceof Error ? e.message : 'No se pudieron consultar las entradas.'); })
      .finally(() => { if (n === generacion.current) { cargando.current = false; setOcupado(false); } });
    return () => { generacion.current++; };
  }, [db, codigo, reintento, onElegir]);
  const mas = async () => {
    const ultimo = entradas.at(-1); if (!ultimo || cargando.current || !hayMas) return;
    cargando.current = true; setOcupado(true); setError(''); const n = generacion.current;
    try {
      const filas = await listarMovimientosGlobales(db, { tipo: 'IN', codigo, limite: 51, antesDe: { fecha: ultimo.fecha, id: ultimo.id } });
      if (n === generacion.current) { setEntradas((prev) => [...prev, ...filas.slice(0, 50)]); setHayMas(filas.length > 50); }
    } catch (e) { if (n === generacion.current) setError(e instanceof Error ? e.message : 'No se pudo continuar.'); }
    finally { if (n === generacion.current) { cargando.current = false; setOcupado(false); } }
  };
  const nuevaCantidad = seleccion && diferencia !== null ? seleccion.cantidad + diferencia : null;
  const botonElegir = <Boton estilo="secundario" titulo={seleccion ? `Entrada #${seleccion.id} · cambiar` : 'Elegir entrada a corregir'}
    deshabilitado={deshabilitado || (ocupado && !entradas.length)} onPress={() => setAbierto(true)} />;
  const mensajeError = error ? <View style={{ gap: 8 }}>
    <Text accessibilityRole="alert" style={{ color: c.rojo }}>{error}</Text>
    <Boton titulo="Reintentar consulta" estilo="secundario" deshabilitado={ocupado} onPress={() => setReintento((v) => v + 1)} />
  </View> : null;
  return <View style={{ gap: 10 }}>
    <Text style={{ color: c.texto, fontWeight: '700' }}>Entrada que se corregirá</Text>
    {ocupado && !entradas.length ? <Text style={{ color: c.textoSecundario }}>Consultando entradas…</Text> : null}
    {seleccion ? <View style={{ padding: 12, gap: 4, borderRadius: 12, backgroundColor: c.acentoSuave }}>
      <Text style={{ color: c.texto }}>Entrada #{seleccion.id} · {formatearFechaHoraSlash(seleccion.fecha)}</Text>
      <Text style={{ color: c.textoSecundario }}>{seleccion.nota || 'Sin nota'}</Text>
      {nuevaCantidad !== null ? <Text style={{ color: nuevaCantidad < 0 ? c.rojo : c.acento, fontWeight: '800' }}>Cantidad de entrada: {seleccion.cantidad} → {nuevaCantidad} u.</Text> : null}
      {nuevaCantidad !== null && nuevaCantidad < 0 ? <Text accessibilityRole="alert" style={{ color: c.rojo }}>Esta corrección supera la cantidad de esa entrada. Revisa la cantidad o elige otra entrada.</Text> : null}
    </View> : !ocupado && !entradas.length && !error ? <Text style={{ color: c.textoSecundario }}>No hay entradas que corregir. Puedes guardar nombre, precio y mínimo sin cambiar la cantidad.</Text> : null}
    {entradas.length > 1 || hayMas ? botonElegir : !seleccion && entradas.length ? botonElegir : null}
    {!abierto ? mensajeError : null}
    <Modal visible={abierto} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setAbierto(false)}>
      <SafeAreaView style={{ flex: 1, backgroundColor: c.fondo }}>
        <View style={{ padding: 16, gap: 12 }}>
          <Text style={{ color: c.texto, fontSize: 22, fontWeight: '800' }}>Elegir entrada</Text>
          <Text style={{ color: c.textoSecundario }}>Elige la recepción mal digitada por su fecha y nota. La corrección no genera despachos.</Text>
          <Boton titulo="Volver sin cambiar selección" estilo="secundario" onPress={() => setAbierto(false)} />
        </View>
        <FlatList data={entradas} keyExtractor={(m) => String(m.id)} contentContainerStyle={{ padding: 16, gap: 8 }}
          renderItem={({ item: m }) => <Pressable accessibilityRole="button" accessibilityState={{ selected: seleccion?.id === m.id }}
            onPress={() => { onElegir(m); setAbierto(false); }}
            style={{ minHeight: 56, padding: 14, gap: 6, borderWidth: 1, borderRadius: 12, borderColor: seleccion?.id === m.id ? c.acento : c.borde, backgroundColor: c.superficie }}>
            <Text style={{ color: c.texto, fontWeight: '700' }}>Entrada #{m.id} · {m.cantidad} u.{seleccion?.id === m.id ? ' · seleccionada' : ''}</Text>
            <Text style={{ color: c.textoSecundario }}>{formatearFechaHoraSlash(m.fecha)}</Text>
            <Text style={{ color: c.textoSecundario }}>{m.nota || 'Sin nota'}</Text>
          </Pressable>}
          ListFooterComponent={<View style={{ gap: 12 }}>{mensajeError}{hayMas ? <Boton titulo={ocupado ? 'Cargando…' : 'Cargar más entradas'} estilo="secundario" deshabilitado={ocupado} onPress={mas} /> : null}</View>} />
      </SafeAreaView>
    </Modal>
  </View>;
}
