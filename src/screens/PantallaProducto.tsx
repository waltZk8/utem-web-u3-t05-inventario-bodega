import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  Vibration,
  View,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { BarraSubpantalla } from '../components/BarraSubpantalla';
import { ElegirEntradaCorreccion } from '../components/ElegirEntradaCorreccion';
import { Boton } from '../components/Boton';
import { Cargando, ErrorEstado, Vacio } from '../components/Estados';
import {
  actualizarProducto,
  buscarPorCodigo,
  eliminarProducto,
  historial,
  registrarMovimiento,
  type Movimiento,
  type Producto,
} from '../db/inventario';
import { formatearFechaHoraSlash } from '../lib/periodo';
import { estadoDeStock, ETIQUETA_ESTADO, formatearCLP, validarMovimiento } from '../lib/stock';
import { coloresEstado, useTema } from '../theme';

const LOTES_RAPIDOS = [1, 5, 10, 24] as const;

/**
 * Ficha ejecutiva y operativa del producto:
 * - Operaciones de Entrada (recepción) y Salida (despacho/venta) con presets
 *   rápidos (+1, +5, +10, +24), vista previa en CLP y nota opcional.
 * - Edición en sitio de Nombre, Precio CLP y Stock Mínimo.
 * - Historial auditable con precio unitario histórico congelado.
 */
export function PantallaProducto({
  codigo,
  onHistorial,
  onVolver,
}: {
  codigo: string;
  onHistorial: () => void;
  onVolver: () => void;
}) {
  const db = useSQLiteContext();
  const { paleta } = useTema();
  const [producto, setProducto] = useState<Producto | null>(null);
  const [movs, setMovs] = useState<Movimiento[]>([]);
  const [cantidad, setCantidad] = useState('1');
  const [nota, setNota] = useState('');
  const [editandoFicha, setEditandoFicha] = useState(false);
  const [editNombre, setEditNombre] = useState('');
  const [editPrecio, setEditPrecio] = useState('0');
  const [editMinimo, setEditMinimo] = useState('5');
  const [editStock, setEditStock] = useState('0');
  const [motivoAjuste, setMotivoAjuste] = useState('');
  const [entradaCorregir, setEntradaCorregir] = useState<Movimiento | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [cargando, setCargando] = useState(true);

  const enVuelo = useRef(false);

  const refrescar = useCallback(async () => {
    setError(null);
    try {
      const p = await buscarPorCodigo(db, codigo);
      setProducto(p);
      if (p) {
        setEditNombre(p.nombre);
        setEditPrecio(String(p.precio ?? 0));
        setEditMinimo(String(p.minimo));
        setEditStock(String(p.stock));
        setMotivoAjuste('');
        setEntradaCorregir(null);
        setMovs(await historial(db, codigo, 5));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo leer el producto.');
    } finally {
      setCargando(false);
    }
  }, [db, codigo]);

  useEffect(() => {
    refrescar();
  }, [refrescar]);

  const mover = useCallback(
    async (tipo: 'IN' | 'OUT', cantOverride?: number) => {
      if (!producto || enVuelo.current) return;
      Keyboard.dismiss();
      enVuelo.current = true;

      const n = cantOverride ?? Number(cantidad);
      const problema = validarMovimiento(tipo, n, producto.stock);
      if (problema) {
        setError(problema);
        setAviso(null);
        enVuelo.current = false;
        return;
      }

      setOcupado(true);
      setError(null);
      try {
        const final = await registrarMovimiento(db, codigo, tipo, n, nota);
        Vibration.vibrate(25);
        const montoMov = n * (producto.precio ?? 0);
        setAviso(
          `${tipo === 'IN' ? 'Entrada' : 'Salida'} de ${n} u. (${formatearCLP(
            montoMov
          )}) registrada · Nuevo saldo: ${final}.`
        );
        setCantidad('1');
        setNota('');
        await refrescar();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo registrar el movimiento.');
      } finally {
        setOcupado(false);
        enVuelo.current = false;
      }
    },
    [producto, cantidad, nota, codigo, db, refrescar]
  );

  const confirmarEliminar = () => {
    if (!producto || ocupado) return;
    Alert.alert(
      'Eliminar producto',
      `¿Eliminar "${producto.nombre}" (GTIN ${producto.codigo}) y todo su historial de movimientos?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setOcupado(true);
            try {
              await eliminarProducto(db, producto.codigo);
              onVolver();
            } catch (e) {
              setError(e instanceof Error ? e.message : 'No se pudo eliminar el producto.');
              setOcupado(false);
            }
          },
        },
      ]
    );
  };

  const guardarEdicion = async () => {
    if (!producto || enVuelo.current) return;
    if (!editStock.trim()) { setError('Indica la cantidad corregida; usa 0 si no hay unidades.'); return; }
    if (Number(editStock) !== producto.stock && !entradaCorregir) { setError('Selecciona la entrada que quedó mal registrada.'); return; }
    enVuelo.current = true;
    Keyboard.dismiss();
    setOcupado(true);
    setError(null);
    try {
      await actualizarProducto(db, {
        codigo: producto.codigo,
        nombre: editNombre,
        minimo: Number(editMinimo),
        precio: Number(editPrecio || '0'),
        stock: Number(editStock), stockAnterior: producto.stock, motivo: motivoAjuste,
        correccionEntrada: entradaCorregir ? { id: entradaCorregir.id, cantidadAnterior: entradaCorregir.cantidad } : undefined,
      });
      setEditandoFicha(false);
      setAviso('Ficha del producto actualizada.');
      await refrescar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al actualizar el producto.');
    } finally {
      enVuelo.current = false;
      setOcupado(false);
    }
  };

  if (cargando) return <Cargando texto="Cargando ficha del artículo…" />;
  if (error && !producto) return <ErrorEstado mensaje={error} onReintentar={refrescar} />;
  if (!producto) {
    return (
      <Vacio
        titulo="Producto no encontrado"
        detalle={`El código ${codigo} no existe actualmente en la bodega.`}
        accion={{ titulo: 'Volver', onPress: onVolver }}
      />
    );
  }

  const estado = estadoDeStock(producto);
  const tono = coloresEstado(paleta)[estado];
  const { texto, icono } = ETIQUETA_ESTADO[estado];
  const cantNum = Number(cantidad || '0');
  const subtotalMovimiento =
    Number.isInteger(cantNum) && cantNum > 0 ? cantNum * (producto.precio ?? 0) : 0;
  const valorizadoActual = producto.stock * (producto.precio ?? 0);
  const stockEditado = editStock.trim() ? Number(editStock) : NaN;
  const cambiaCantidad = stockEditado !== producto.stock;
  const correccionValida = Number.isSafeInteger(stockEditado) && stockEditado >= 0 &&
    (!cambiaCantidad || (!!entradaCorregir && entradaCorregir.cantidad + stockEditado - producto.stock >= 0 && !!motivoAjuste.trim()));

  return (
    <View style={[s.raiz, { backgroundColor: paleta.fondo }]}>
      <BarraSubpantalla
        titulo="Ficha de inventario"
        subtitulo={`GTIN ${producto.codigo}`}
        onVolver={onVolver}
        mostrarCerrarTeclado
      />

      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={s.cont}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View style={s.bloque}>
            {/* Tarjeta principal del producto */}
            <View
              style={[
                s.tarjeta,
                { backgroundColor: paleta.superficie, borderColor: paleta.borde },
              ]}
            >
              <View style={s.cabeceraFicha}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.nombre, { color: paleta.texto }]}>{producto.nombre}</Text>
                  <Text style={[s.gtin, { color: paleta.textoTerciario }]}>
                    Código {producto.codigo}
                  </Text>
                </View>
                <Pressable
                  disabled={ocupado}
                  onPress={() => {
                    setEditNombre(producto.nombre); setEditPrecio(String(producto.precio)); setEditMinimo(String(producto.minimo));
                    setEditStock(String(producto.stock)); setMotivoAjuste(''); setEntradaCorregir(null); setError(null); setAviso(null);
                    setEditandoFicha((v) => !v);
                  }}
                  style={[s.btnEditar, { backgroundColor: paleta.acentoSuave }]}
                >
                  <Text style={[s.txtEditar, { color: paleta.acento }]}>
                    {editandoFicha ? 'Cancelar' : 'Editar'}
                  </Text>
                </Pressable>
              </View>

              <View style={s.gridMetricas}>
                <View style={[s.celdaMetrica, { backgroundColor: paleta.superficieElevada }]}>
                  <Text style={[s.lblMetrica, { color: paleta.textoTerciario }]}>DISPONIBLE</Text>
                  <Text style={[s.valStock, { color: tono.fg }]}>{producto.stock}</Text>
                  <View style={[s.chip, { backgroundColor: tono.bg }]}>
                    <Text style={[s.chipTexto, { color: tono.fg }]}>
                      {icono} {texto}
                    </Text>
                  </View>
                </View>

                <View style={[s.celdaMetrica, { backgroundColor: paleta.superficieElevada }]}>
                  <Text style={[s.lblMetrica, { color: paleta.textoTerciario }]}>PRECIO UNIT.</Text>
                  <Text style={[s.valDinero, { color: paleta.texto }]}>
                    {formatearCLP(producto.precio ?? 0)}
                  </Text>
                  <Text style={[s.subMetrica, { color: paleta.textoSecundario }]}>
                    Mínimo: {producto.minimo} u.
                  </Text>
                </View>

                <View style={[s.celdaMetrica, { backgroundColor: paleta.superficieElevada }]}>
                  <Text style={[s.lblMetrica, { color: paleta.textoTerciario }]}>VALOR EN STOCK</Text>
                  <Text style={[s.valDinero, { color: paleta.acento }]}>
                    {formatearCLP(valorizadoActual)}
                  </Text>
                  <Text style={[s.subMetrica, { color: paleta.textoSecundario }]}>
                    Capital bodega
                  </Text>
                </View>
              </View>

              {estado === 'agotado' ? (
                <View style={[s.alertaEstado, { backgroundColor: paleta.rojoSuave }]}>
                  <Text style={[s.alertaTexto, { color: paleta.rojo }]}>
                    ✕ Sin unidades disponibles. Registra una entrada antes de despachar.
                  </Text>
                </View>
              ) : estado === 'bajo' ? (
                <View style={[s.alertaEstado, { backgroundColor: paleta.ambarSuave }]}>
                  <Text style={[s.alertaTexto, { color: paleta.ambar }]}>
                    ! Stock en nivel crítico ({producto.stock} de {producto.minimo} mín.). Programar
                    reposición.
                  </Text>
                </View>
              ) : null}

              {editandoFicha ? (
                <View style={[s.panelEdicion, { borderTopColor: paleta.separador }]}>
                  <Text style={[s.rotulo, { color: paleta.textoSecundario }]}>
                    EDITAR PRODUCTO Y CORREGIR EXISTENCIAS
                  </Text>
                  <TextInput
                    value={editNombre}
                    onChangeText={setEditNombre}
                    placeholder="Nombre del producto"
                    placeholderTextColor={paleta.textoTerciario}
                    style={[
                      s.input,
                      { backgroundColor: paleta.inputFondo, color: paleta.texto },
                    ]}
                  />
                  <View style={s.filaDos}>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.miniLbl, { color: paleta.textoTerciario }]}>Precio CLP</Text>
                      <TextInput
                        value={editPrecio}
                        onChangeText={(t) => setEditPrecio(t.replace(/[^0-9]/g, ''))}
                        keyboardType="number-pad"
                        maxLength={8}
                        style={[
                          s.input,
                          { backgroundColor: paleta.inputFondo, color: paleta.texto },
                        ]}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.miniLbl, { color: paleta.textoTerciario }]}>Mínimo</Text>
                      <TextInput
                        value={editMinimo}
                        onChangeText={(t) => setEditMinimo(t.replace(/[^0-9]/g, ''))}
                        keyboardType="number-pad"
                        maxLength={5}
                        style={[
                          s.input,
                          { backgroundColor: paleta.inputFondo, color: paleta.texto },
                        ]}
                      />
                    </View>
                  </View>
                  <Text style={{ color: paleta.texto }}>Cantidad disponible corregida</Text>
                  <TextInput value={editStock} editable={!ocupado} onChangeText={(t) => setEditStock(t.replace(/[^0-9]/g, ''))}
                    accessibilityLabel="Cantidad disponible corregida" keyboardType="number-pad" maxLength={16}
                    style={[s.input, { backgroundColor: paleta.inputFondo, color: paleta.texto }]} />
                  <ElegirEntradaCorreccion codigo={codigo} seleccion={entradaCorregir}
                    onElegir={setEntradaCorregir} deshabilitado={ocupado}
                    diferencia={editStock.trim() && Number.isSafeInteger(Number(editStock)) ? Number(editStock) - producto.stock : null} />
                  <Text style={{ color: paleta.acento }}>{Number.isSafeInteger(stockEditado)
                    ? `Stock: ${producto.stock} → ${stockEditado} u. Las salidas no cambian.`
                    : 'Escribe la cantidad disponible correcta.'}</Text>
                    <Text style={{ color: paleta.texto }}>Motivo (obligatorio si cambias la cantidad)</Text>
                    <TextInput value={motivoAjuste} onChangeText={setMotivoAjuste} maxLength={160}
                      editable={!ocupado} accessibilityLabel="Motivo obligatorio de la corrección" placeholder="Ej.: anoté 20 y se recibieron 15"
                      placeholderTextColor={paleta.textoTerciario}
                      style={[s.input, { backgroundColor: paleta.inputFondo, color: paleta.texto }]} />
                  {error ? <Text accessibilityRole="alert" style={{ color: paleta.rojo }}>{error}</Text> : null}
                  <Boton
                    titulo="Guardar cambios"
                    onPress={guardarEdicion}
                    deshabilitado={ocupado || !correccionValida}
                    compacto
                  />
                  <Boton
                    titulo="Eliminar artículo de la bodega"
                    onPress={confirmarEliminar}
                    estilo="peligro"
                    deshabilitado={ocupado}
                    compacto
                  />
                </View>
              ) : null}
            </View>

            {/* Panel profesional de Entrada y Salida */}
            <View
              style={[
                s.tarjeta,
                { backgroundColor: paleta.superficie, borderColor: paleta.borde },
              ]}
            >
              <Text style={[s.rotulo, { color: paleta.textoSecundario }]}>
                REGISTRAR ENTRADA O SALIDA
              </Text>

              <View style={s.filaStepper}>
                <Pressable
                  onPress={() => {
                    const actual = Math.max(1, Number(cantidad || '1') - 1);
                    setCantidad(String(actual));
                  }}
                  style={[s.btnStep, { backgroundColor: paleta.inputFondo }]}
                  accessibilityRole="button"
                  accessibilityLabel="Restar uno"
                >
                  <Text style={[s.txtStep, { color: paleta.texto }]}>−</Text>
                </Pressable>

                <TextInput
                  value={cantidad}
                  onChangeText={(t) => setCantidad(t.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  returnKeyType="done"
                  maxLength={5}
                  style={[
                    s.inputCantidad,
                    { backgroundColor: paleta.inputFondo, color: paleta.texto },
                  ]}
                  accessibilityLabel="Cantidad de unidades"
                />

                <Pressable
                  onPress={() => {
                    const actual = Math.min(99999, Number(cantidad || '0') + 1);
                    setCantidad(String(actual));
                  }}
                  style={[s.btnStep, { backgroundColor: paleta.inputFondo }]}
                  accessibilityRole="button"
                  accessibilityLabel="Sumar uno"
                >
                  <Text style={[s.txtStep, { color: paleta.texto }]}>+</Text>
                </Pressable>
              </View>

              <View style={s.presetsRow}>
                {LOTES_RAPIDOS.map((lote) => {
                  const sel = Number(cantidad) === lote;
                  return (
                    <Pressable
                      key={lote}
                      onPress={() => {
                        Keyboard.dismiss();
                        setCantidad(String(lote));
                      }}
                      style={[
                        s.chipPreset,
                        {
                          backgroundColor: sel ? paleta.acento : paleta.superficieElevada,
                          borderColor: paleta.borde,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          s.txtPreset,
                          { color: sel ? '#FFFFFF' : paleta.textoSecundario },
                        ]}
                      >
                        {lote} u.
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <TextInput
                value={nota}
                onChangeText={setNota}
                placeholder="Motivo opcional (ej: Guía proveedor, Venta mostrador, Merma)"
                placeholderTextColor={paleta.textoTerciario}
                returnKeyType="done"
                maxLength={60}
                style={[
                  s.inputNota,
                  { backgroundColor: paleta.inputFondo, color: paleta.texto },
                ]}
              />

              <View
                style={[
                  s.barraSubtotal,
                  { backgroundColor: paleta.superficieElevada },
                ]}
              >
                <Text style={[s.subtotalLbl, { color: paleta.textoSecundario }]}>
                  Valorización de esta operación
                </Text>
                <Text style={[s.subtotalVal, { color: paleta.texto }]}>
                  {formatearCLP(subtotalMovimiento)}
                </Text>
              </View>

              <View style={s.filaDos}>
                <Boton
                  titulo={`+ Entrada (${cantNum || 0})`}
                  onPress={() => mover('IN')}
                  estilo="exito"
                  deshabilitado={ocupado || editandoFicha}
                  ancho="48.5%"
                />
                <Boton
                  titulo={`− Salida (${cantNum || 0})`}
                  onPress={() => mover('OUT')}
                  estilo="salida"
                  deshabilitado={ocupado || editandoFicha || producto.stock === 0}
                  ancho="48.5%"
                />
              </View>

              {error ? (
                <View style={[s.alertaEstado, { backgroundColor: paleta.rojoSuave }]}>
                  <Text style={[s.alertaTexto, { color: paleta.rojo }]}>{error}</Text>
                </View>
              ) : null}
              {aviso ? (
                <View style={[s.alertaEstado, { backgroundColor: paleta.verdeSuave }]}>
                  <Text style={[s.alertaTexto, { color: paleta.verde }]}>{aviso}</Text>
                </View>
              ) : null}
            </View>

            {/* Historial auditable del producto */}
            <View
              style={[
                s.tarjeta,
                { backgroundColor: paleta.superficie, borderColor: paleta.borde },
              ]}
            >
              <Text style={[s.rotulo, { color: paleta.textoSecundario }]}>
                ÚLTIMOS {movs.length} MOVIMIENTOS · TODO EL HISTORIAL
              </Text>
              {movs.length === 0 ? (
                <Text style={[s.vacioTxt, { color: paleta.textoTerciario }]}>
                  Aún no existen entradas ni salidas registradas para este código.
                </Text>
              ) : (
                movs.map((m, idx) => {
                  const esEntrada = m.tipo === 'IN';
                  const monto = m.cantidad * (m.precio_unitario ?? 0);
                  return (
                    <View
                      key={m.id}
                      style={[
                        s.filaMov,
                        idx > 0 && {
                          borderTopWidth: StyleSheet.hairlineWidth,
                          borderTopColor: paleta.separador,
                        },
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            s.movTipo,
                            { color: m.tipo === 'ADJ' ? paleta.acento : esEntrada ? paleta.verde : paleta.salida },
                          ]}
                        >
                          {m.tipo === 'ADJ' ? `↔ Ajuste · ${m.stock_antes} → ${m.stock_despues} u.` : `${esEntrada ? '▲ Entrada · +' : '▼ Salida · −'}${m.cantidad} u.`}
                        </Text>
                        <Text style={[s.movNota, { color: paleta.textoSecundario }]}>
                          {m.entrada_corregida_id ? `Corrección entrada #${m.entrada_corregida_id}: ${m.entrada_cantidad_antes} → ${m.entrada_cantidad_despues} u. · ` : ''}
                          {m.tipo === 'IN' && m.cantidad_original !== m.cantidad ? `Original: ${m.cantidad_original} u. · ` : ''}
                          {m.nota ? `${m.nota} · ` : ''}
                          {formatearFechaHoraSlash(m.fecha)}
                        </Text>
                      </View>
                      <Text style={[s.movMonto, { color: paleta.texto }]}>
                        {m.tipo === 'ADJ' ? 'Corrección' : monto > 0 ? formatearCLP(monto) : '—'}
                      </Text>
                    </View>
                  );
                })
              )}
              <Boton titulo="Ver historial completo y elegir fechas" estilo="secundario" onPress={onHistorial} />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  raiz: { flex: 1 },
  flex: { flex: 1 },
  cont: { padding: 16, paddingBottom: 42 },
  bloque: { gap: 14 },
  tarjeta: {
    borderRadius: 18,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  cabeceraFicha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  nombre: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  gtin: { fontSize: 12, marginTop: 2, fontVariant: ['tabular-nums'] },
  btnEditar: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  txtEditar: { fontSize: 13, fontWeight: '700' },
  gridMetricas: { flexDirection: 'row', gap: 8 },
  celdaMetrica: {
    flex: 1,
    borderRadius: 14,
    padding: 10,
    gap: 4,
  },
  lblMetrica: { fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },
  valStock: { fontSize: 28, fontWeight: '900', fontVariant: ['tabular-nums'] },
  valDinero: { fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'], marginTop: 4 },
  subMetrica: { fontSize: 11, fontVariant: ['tabular-nums'] },
  chip: { alignSelf: 'flex-start', borderRadius: 7, paddingHorizontal: 7, paddingVertical: 2 },
  chipTexto: { fontSize: 9.5, fontWeight: '800' },
  alertaEstado: { borderRadius: 12, padding: 11 },
  alertaTexto: { fontSize: 13.5, fontWeight: '700', lineHeight: 19 },
  panelEdicion: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    gap: 8,
  },
  rotulo: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6 },
  miniLbl: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  input: {
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '600',
  },
  filaStepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  btnStep: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txtStep: { fontSize: 26, fontWeight: '700' },
  inputCantidad: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  presetsRow: { flexDirection: 'row', gap: 8 },
  chipPreset: {
    flex: 1,
    minHeight: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  txtPreset: { fontSize: 13, fontWeight: '700' },
  inputNota: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
  },
  barraSubtotal: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subtotalLbl: { fontSize: 13, fontWeight: '600' },
  subtotalVal: { fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'] },
  filaDos: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  vacioTxt: { fontSize: 14 },
  filaMov: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    gap: 8,
  },
  movTipo: { fontSize: 14, fontWeight: '700' },
  movNota: { fontSize: 12, marginTop: 2 },
  movMonto: { fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
