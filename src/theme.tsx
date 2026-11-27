import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Sistema de diseño minimalista con paleta Azul Claro Fino (Sky/Azure Slate)
 * inspirado en guías modernas de iOS. Soporta Modo Claro, Modo Oscuro
 * (azul medianoche elegante), Automático del sistema y Alto Contraste.
 */

export type PreferenciaTema = 'sistema' | 'claro' | 'oscuro';

export interface Paleta {
  oscura: boolean;
  altoContraste: boolean;
  fondo: string;
  superficie: string;
  superficieElevada: string;
  inputFondo: string;
  barraTab: string;
  texto: string;
  textoSecundario: string;
  textoTerciario: string;
  borde: string;
  separador: string;
  acento: string;
  acentoClaro: string;
  acentoSuave: string;
  verde: string;
  verdeSuave: string;
  ambar: string;
  ambarSuave: string;
  rojo: string;
  rojoSuave: string;
  salida: string;
  salidaSuave: string;
  chipTexto: string;
}

const PALETA_CLARA: Paleta = {
  oscura: false,
  altoContraste: false,
  fondo: '#F4F8FC',
  superficie: '#FFFFFF',
  superficieElevada: '#EEF5FB',
  inputFondo: '#E8F1F8',
  barraTab: 'rgba(255,255,255,0.97)',
  texto: '#0F172A',
  textoSecundario: '#475569',
  textoTerciario: '#64748B',
  borde: '#D8E6F3',
  separador: '#E2ECF5',
  acento: '#0284C7',
  acentoClaro: '#38BDF8',
  acentoSuave: '#E0F2FE',
  verde: '#15803D',
  verdeSuave: '#DCFCE7',
  ambar: '#B45309',
  ambarSuave: '#FEF3C7',
  rojo: '#DC2626',
  rojoSuave: '#FEE2E2',
  salida: '#6D28D9',
  salidaSuave: '#EDE9FE',
  chipTexto: '#FFFFFF',
};

const PALETA_OSCURA: Paleta = {
  oscura: true,
  altoContraste: false,
  fondo: '#0B1220',
  superficie: '#131C2E',
  superficieElevada: '#1B273F',
  inputFondo: '#1E293B',
  barraTab: 'rgba(15,23,42,0.97)',
  texto: '#F1F5F9',
  textoSecundario: '#CBD5E1',
  textoTerciario: '#94A3B8',
  borde: '#26354D',
  separador: '#1E293B',
  acento: '#38BDF8',
  acentoClaro: '#7DD3FC',
  acentoSuave: 'rgba(56,189,248,0.16)',
  verde: '#4ADE80',
  verdeSuave: 'rgba(74,222,128,0.16)',
  ambar: '#FBBF24',
  ambarSuave: 'rgba(251,191,36,0.18)',
  rojo: '#F87171',
  rojoSuave: 'rgba(248,113,113,0.18)',
  salida: '#C4B5FD',
  salidaSuave: 'rgba(196,181,253,0.16)',
  chipTexto: '#FFFFFF',
};

function aplicarAltoContraste(base: Paleta): Paleta {
  if (base.oscura) {
    return {
      ...base,
      altoContraste: true,
      fondo: '#050912',
      superficie: '#101828',
      texto: '#FFFFFF',
      textoSecundario: '#E2E8F0',
      borde: '#64748B',
      acento: '#7DD3FC',
      verde: '#4ADE80',
      ambar: '#FDE047',
      rojo: '#FCA5A5',
    };
  }
  return {
    ...base,
    altoContraste: true,
    fondo: '#EAF1F8',
    texto: '#000000',
    textoSecundario: '#1E293B',
    borde: '#64748B',
    acento: '#0369A1',
    verde: '#14532D',
    ambar: '#92400E',
    rojo: '#991B1B',
  };
}

export const C = {
  azul: '#0284C7',
  azulOscuro: '#0369A1',
  navy: '#0F172A',
  teal: '#0EA5E9',
  verde: '#15803D',
  ambar: '#B45309',
  rojo: '#DC2626',
  gris: '#475569',
  linea: '#D8E6F3',
  fondo: '#F4F8FC',
  blanco: '#FFFFFF',
};

export function coloresEstado(p: Paleta) {
  return {
    agotado: { fg: p.rojo, bg: p.rojoSuave },
    bajo: { fg: p.ambar, bg: p.ambarSuave },
    ok: { fg: p.verde, bg: p.verdeSuave },
  } as const;
}

export const TOQUE_MINIMO = 48;
export const VERSION_APP = '1.6.1';

const CLAVE_PREFS = 'prefs_ui_v1';

interface ContextoTema {
  paleta: Paleta;
  preferencia: PreferenciaTema;
  altoContraste: boolean;
  cambiarPreferencia: (p: PreferenciaTema) => void;
  alternarAltoContraste: () => void;
}

const TemaCtx = createContext<ContextoTema>({
  paleta: PALETA_CLARA,
  preferencia: 'sistema',
  altoContraste: false,
  cambiarPreferencia: () => {},
  alternarAltoContraste: () => {},
});

export function ProveedorTema({ children }: { children: React.ReactNode }) {
  const esquemaSistema = useColorScheme();
  const [preferencia, setPreferencia] = useState<PreferenciaTema>('sistema');
  const [altoContraste, setAltoContraste] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(CLAVE_PREFS)
      .then((crudo) => {
        if (!crudo) return;
        const parsed = JSON.parse(crudo) as {
          preferencia?: PreferenciaTema;
          altoContraste?: boolean;
        };
        if (
          parsed.preferencia === 'sistema' ||
          parsed.preferencia === 'claro' ||
          parsed.preferencia === 'oscuro'
        ) {
          setPreferencia(parsed.preferencia);
        }
        if (typeof parsed.altoContraste === 'boolean') {
          setAltoContraste(parsed.altoContraste);
        }
      })
      .catch(() => {});
  }, []);

  const guardar = useCallback((pref: PreferenciaTema, hc: boolean) => {
    AsyncStorage.setItem(CLAVE_PREFS, JSON.stringify({ preferencia: pref, altoContraste: hc })).catch(
      () => {}
    );
  }, []);

  const cambiarPreferencia = useCallback(
    (nueva: PreferenciaTema) => {
      setPreferencia(nueva);
      guardar(nueva, altoContraste);
    },
    [altoContraste, guardar]
  );

  const alternarAltoContraste = useCallback(() => {
    setAltoContraste((actual) => {
      const sig = !actual;
      guardar(preferencia, sig);
      return sig;
    });
  }, [preferencia, guardar]);

  const paleta = useMemo(() => {
    const usarOscuro =
      preferencia === 'oscuro' || (preferencia === 'sistema' && esquemaSistema === 'dark');
    const base = usarOscuro ? PALETA_OSCURA : PALETA_CLARA;
    return altoContraste ? aplicarAltoContraste(base) : base;
  }, [preferencia, esquemaSistema, altoContraste]);

  const valor = useMemo(
    () => ({
      paleta,
      preferencia,
      altoContraste,
      cambiarPreferencia,
      alternarAltoContraste,
    }),
    [paleta, preferencia, altoContraste, cambiarPreferencia, alternarAltoContraste]
  );

  return <TemaCtx.Provider value={valor}>{children}</TemaCtx.Provider>;
}

export function useTema(): ContextoTema {
  return useContext(TemaCtx);
}
