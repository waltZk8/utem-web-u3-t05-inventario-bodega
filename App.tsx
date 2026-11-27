import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  Keyboard,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider, useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import { ProveedorPeriodo } from './src/periodo';
import { PantallaHistorial } from './src/screens/PantallaHistorial';
import { migrar } from './src/db/schema';
import { buscarPorCodigo, type Producto } from './src/db/inventario';
import { Cargando, ErrorEstado } from './src/components/Estados';
import { PantallaInicio } from './src/screens/PantallaInicio';
import { PantallaDashboard } from './src/screens/PantallaDashboard';
import { PantallaLista } from './src/screens/PantallaLista';
import { PantallaEscaner } from './src/screens/PantallaEscaner';
import { PantallaProducto } from './src/screens/PantallaProducto';
import { PantallaAlta } from './src/screens/PantallaAlta';
import { PantallaManual } from './src/screens/PantallaManual';
import { PantallaMedicion } from './src/screens/PantallaMedicion';
import { PantallaAjustes } from './src/screens/PantallaAjustes';
import { ProveedorTema, TOQUE_MINIMO, useTema } from './src/theme';

const T_INICIO_MODULO = performance.now();

type Pestana = 'inicio' | 'inventario' | 'escaner' | 'dashboard' | 'ajustes';

type Subvista =
  | { tipo: 'ninguna' }
  | { tipo: 'manual' }
  | { tipo: 'producto'; codigo: string; origenHistorial?: { codigo?: string } }
  | { tipo: 'alta'; codigo: string }
  | { tipo: 'medicion' }
  | { tipo: 'historial'; codigo?: string };

type NombreIcono = React.ComponentProps<typeof Ionicons>['name'];

const TABS: ReadonlyArray<{
  id: Pestana;
  etiqueta: string;
  icono: NombreIcono;
  iconoActivo: NombreIcono;
}> = [
  { id: 'inicio', etiqueta: 'Inicio', icono: 'home-outline', iconoActivo: 'home' },
  { id: 'inventario', etiqueta: 'Inventario', icono: 'cube-outline', iconoActivo: 'cube' },
  { id: 'escaner', etiqueta: 'Escanear', icono: 'barcode-outline', iconoActivo: 'barcode' },
  {
    id: 'dashboard',
    etiqueta: 'Dashboard',
    icono: 'bar-chart-outline',
    iconoActivo: 'bar-chart',
  },
  { id: 'ajustes', etiqueta: 'Ajustes', icono: 'options-outline', iconoActivo: 'options' },
];

function ContenedorPrincipal() {
  const db = useSQLiteContext();
  const { paleta } = useTema();
  const [pestana, setPestana] = useState<Pestana>('inicio');
  const [subvista, setSubvista] = useState<Subvista>({ tipo: 'ninguna' });
  const [fallo, setFallo] = useState<string | null>(null);
  const [arranqueMs, setArranqueMs] = useState<number | null>(null);
  const [muestrasM2, setMuestrasM2] = useState<number[]>([]);
  const arranqueMedido = useRef(false);

  useEffect(() => {
    if (!arranqueMedido.current) {
      arranqueMedido.current = true;
      setArranqueMs(performance.now() - T_INICIO_MODULO);
    }
  }, []);

  const cerrarSubvista = useCallback(() => {
    Keyboard.dismiss();
    setSubvista({ tipo: 'ninguna' });
  }, []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (subvista.tipo === 'producto' && subvista.origenHistorial) {
        setSubvista({ tipo: 'historial', codigo: subvista.origenHistorial.codigo });
        return true;
      }
      if (subvista.tipo === 'historial' && subvista.codigo) {
        setSubvista({ tipo: 'producto', codigo: subvista.codigo });
        return true;
      }
      if (subvista.tipo !== 'ninguna') {
        cerrarSubvista();
        return true;
      }
      if (pestana !== 'inicio') {
        setPestana('inicio');
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [subvista, pestana, cerrarSubvista]);

  const resolverCodigo = useCallback(
    async (codigo: string) => {
      const t0 = performance.now();
      try {
        const p: Producto | null = await buscarPorCodigo(db, codigo);
        const duracion = performance.now() - t0;
        setMuestrasM2((prev) => [...prev.slice(-29), duracion]);
        if (pestana === 'escaner') {
          setPestana('inventario');
        }
        setSubvista(p ? { tipo: 'producto', codigo } : { tipo: 'alta', codigo });
      } catch (e) {
        setFallo(e instanceof Error ? e.message : 'No se pudo consultar la bodega.');
      }
    },
    [db, pestana]
  );

  if (fallo) return <ErrorEstado mensaje={fallo} onReintentar={() => setFallo(null)} />;

  const mostrarTabBar = subvista.tipo === 'ninguna';

  return (
    <SafeAreaView style={[s.raiz, { backgroundColor: paleta.fondo }]}>
      <StatusBar style={paleta.oscura ? 'light' : 'dark'} />

      <View style={s.contenido}>
        {subvista.tipo === 'historial' ? (
          <PantallaHistorial codigo={subvista.codigo}
            onVolver={() => subvista.codigo ? setSubvista({ tipo: 'producto', codigo: subvista.codigo }) : cerrarSubvista()}
            onAbrirCodigo={(codigo) => setSubvista({ tipo: 'producto', codigo, origenHistorial: { codigo: subvista.codigo } })} />
        ) : subvista.tipo === 'manual' ? (
          <PantallaManual onConfirmar={resolverCodigo} onCancelar={cerrarSubvista} />
        ) : subvista.tipo === 'producto' ? (
          <PantallaProducto codigo={subvista.codigo}
            onVolver={() => subvista.origenHistorial ? setSubvista({ tipo: 'historial', codigo: subvista.origenHistorial.codigo }) : cerrarSubvista()}
            onHistorial={() => setSubvista({ tipo: 'historial', codigo: subvista.codigo })} />
        ) : subvista.tipo === 'alta' ? (
          <PantallaAlta
            codigo={subvista.codigo}
            onCreado={(codigo) => setSubvista({ tipo: 'producto', codigo })}
            onCancelar={cerrarSubvista}
          />
        ) : subvista.tipo === 'medicion' ? (
          <PantallaMedicion
            onVolver={cerrarSubvista}
            arranqueMs={arranqueMs}
            muestrasM2={muestrasM2}
          />
        ) : pestana === 'inicio' ? (
          <PantallaInicio
            onHistorial={() => setSubvista({ tipo: 'historial' })}
            onEscanear={() => setPestana('escaner')}
            onManual={() => setSubvista({ tipo: 'manual' })}
            onIrDashboard={() => setPestana('dashboard')}
            onIrInventario={() => setPestana('inventario')}
            onAbrirProducto={(p) => setSubvista({ tipo: 'producto', codigo: p.codigo })}
          />
        ) : pestana === 'inventario' ? (
          <PantallaLista
            onEscanear={() => setPestana('escaner')}
            onManual={() => setSubvista({ tipo: 'manual' })}
            onAbrirProducto={(p) => setSubvista({ tipo: 'producto', codigo: p.codigo })}
          />
        ) : pestana === 'escaner' ? (
          <PantallaEscaner
            onLeido={resolverCodigo}
            onCancelar={() => setPestana('inicio')}
            onManual={() => {
              setPestana('inventario');
              setSubvista({ tipo: 'manual' });
            }}
          />
        ) : pestana === 'dashboard' ? (
          <PantallaDashboard
            onHistorial={() => setSubvista({ tipo: 'historial' })}
            onAbrirCodigo={(codigo) => setSubvista({ tipo: 'producto', codigo })}
            onIrAEscanear={() => setPestana('escaner')}
          />
        ) : (
          <PantallaAjustes
            onAbrirMedicion={() => setSubvista({ tipo: 'medicion' })}
            arranqueMs={arranqueMs}
          />
        )}
      </View>

      {mostrarTabBar ? (
        <View
          style={[
            s.tabBar,
            {
              backgroundColor: paleta.barraTab,
              borderTopColor: paleta.separador,
            },
          ]}
        >
          {TABS.map((t) => {
            const activa = pestana === t.id;
            const color = activa ? paleta.acento : paleta.textoTerciario;
            return (
              <Pressable
                key={t.id}
                onPress={() => {
                  Keyboard.dismiss();
                  setPestana(t.id);
                }}
                accessibilityRole="tab"
                accessibilityState={{ selected: activa }}
                style={({ pressed }) => [s.tabItem, pressed && { opacity: 0.7 }]}
              >
                <Ionicons name={activa ? t.iconoActivo : t.icono} size={22} color={color} />
                <Text style={[s.tabTexto, { color }, activa && { fontWeight: '700' }]}>
                  {t.etiqueta}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </SafeAreaView>
  );
}

export default function Raiz() {
  const [errorDb, setErrorDb] = useState<Error | null>(null);
  const [intento, setIntento] = useState(0);
  const [iniciando, setIniciando] = useState(true);
  const inicializar = useCallback(async (db: SQLiteDatabase) => {
    await migrar(db);
    setIniciando(false);
  }, []);

  return (
    <ProveedorTema>
    <ProveedorPeriodo>
      {errorDb ? (
        <ErrorEstado mensaje={`No se pudo abrir la bodega: ${errorDb.message}`} onReintentar={() => {
          setIniciando(true);
          setIntento((n) => n + 1);
          setErrorDb(null);
        }} />
      ) : (
        <>
          {iniciando ? <Cargando texto="Inicializando motor SQLite…" /> : null}
          <SQLiteProvider key={intento} databaseName="bodega.db" onInit={inicializar} onError={setErrorDb}>
            <ContenedorPrincipal />
          </SQLiteProvider>
        </>
      )}
    </ProveedorPeriodo>
    </ProveedorTema>
  );
}

const s = StyleSheet.create({
  raiz: { flex: 1 },
  contenido: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 4 : 10,
  },
  tabItem: {
    flex: 1,
    minHeight: TOQUE_MINIMO,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  tabTexto: {
    fontSize: 10.5,
    fontWeight: '500',
  },
});
