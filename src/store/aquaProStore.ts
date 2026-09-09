import { useSyncExternalStore } from 'react';

/* =========================================================
   TIPOS
========================================================= */

export type EstadoPiscina =
  | 'Activa'
  | 'Disponible'
  | 'Descanso'
  | 'Mantenimiento'
  | 'Vacía';

export type EstadoCiclo = 'Activo' | 'Cerrado';

export type Siembra = {
  id: number;
  fecha: string;
  cantidadSembrada: number;

  // Se conserva nullable para poder leer registros antiguos.
  // Las nuevas siembras exigen un peso mayor que cero.
  pesoInicial: number | null;

  // Compatibilidad con versiones anteriores.
  procedencia: string;

  // Nuevos campos.
  nauplios?: string[];
  laboratorios?: string[];

  observacion: string;

  piscinaId: number;
  cicloId: number;
  ciclo: number;
};

export type Ciclo = {
  id: number;
  piscinaId: number;
  numero: number;
  estado: EstadoCiclo;
  fechaInicio: string;
  fechaCierre: string | null;
  siembra: Siembra | null;
};

export type Piscina = {
  id: number;
  nombre: string;
  zona: string;
  hectareas: number;
  estado: EstadoPiscina;

  /*
    Este número se usa solamente cuando la piscina
    todavía nunca ha tenido un ciclo registrado.
  */
  cicloInicial: number;
};

export type NuevaPiscinaInput = {
  nombre: string;
  zona: string;
  hectareas: number;
  estado?: EstadoPiscina;
  cicloInicial: number;
};

export type EditarPiscinaInput = {
  nombre?: string;
  zona?: string;
  hectareas?: number;
  estado?: EstadoPiscina;
};

export type NuevaSiembraInput = {
  piscinaId: number;
  fecha: string;
  cantidadSembrada: number;
  pesoInicial: number | null;
  procedencia: string;
  nauplios?: string[];
  laboratorios?: string[];
  observacion: string;
};

export type EditarSiembraInput = {
  fecha: string;
  cantidadSembrada: number;
  pesoInicial: number | null;
  procedencia: string;
  nauplios?: string[];
  laboratorios?: string[];
  observacion: string;
};

/* =========================================================
   ESTADO GENERAL DEL STORE
========================================================= */

export type AquaProState = {
  piscinas: Piscina[];
  ciclos: Ciclo[];
};

/* =========================================================
   DATOS INICIALES DE PRUEBA
========================================================= */

const piscinasIniciales: Piscina[] = [
  {
    id: 1,
    nombre: 'IS045',
    zona: 'Sur',
    hectareas: 18.85,
    estado: 'Activa',
    cicloInicial: 4,
  },
  {
    id: 2,
    nombre: 'IS051',
    zona: 'Norte',
    hectareas: 7.2,
    estado: 'Disponible',
    cicloInicial: 2,
  },
  {
    id: 3,
    nombre: 'IS063',
    zona: 'Sur',
    hectareas: 10.4,
    estado: 'Disponible',
    cicloInicial: 3,
  },
  {
    id: 4,
    nombre: 'IS029',
    zona: 'Norte',
    hectareas: 9.1,
    estado: 'Disponible',
    cicloInicial: 5,
  },
  {
    id: 5,
    nombre: 'IS074',
    zona: 'Sur',
    hectareas: 6.8,
    estado: 'Descanso',
    cicloInicial: 1,
  },
  {
    id: 6,
    nombre: 'IS034',
    zona: 'Norte',
    hectareas: 11.2,
    estado: 'Disponible',
    cicloInicial: 2,
  },
  {
    id: 7,
    nombre: 'IS081',
    zona: 'Sur',
    hectareas: 8.7,
    estado: 'Mantenimiento',
    cicloInicial: 3,
  },
  {
    id: 8,
    nombre: 'IS098',
    zona: 'Sur',
    hectareas: 9.8,
    estado: 'Disponible',
    cicloInicial: 6,
  },
];

const ciclosIniciales: Ciclo[] = [
  {
    id: 1001,
    piscinaId: 1,
    numero: 4,
    estado: 'Activo',
    fechaInicio: '2026-06-12',
    fechaCierre: null,
    siembra: {
      id: 101,
      fecha: '2026-06-12',
      cantidadSembrada: 2500000,
      pesoInicial: 0.015,
      procedencia: 'Laboratorio',
      nauplios: [],
      laboratorios: ['Laboratorio'],
      observacion: 'Siembra inicial de prueba.',
      piscinaId: 1,
      cicloId: 1001,
      ciclo: 4,
    },
  },
];

/* =========================================================
   LOCAL STORAGE
========================================================= */

const STORAGE_KEY = 'aquapro-store-v1';

function normalizarLista(valor: unknown): string[] {
  if (!Array.isArray(valor)) return [];

  return valor
    .map((item) => String(item).trim())
    .filter(Boolean);
}

function normalizarSiembra(siembra: Siembra | null): Siembra | null {
  if (!siembra) return null;

  const nauplios = normalizarLista(siembra.nauplios);
  let laboratorios = normalizarLista(siembra.laboratorios);

  // Migración suave de registros antiguos que solo tenían procedencia.
  if (laboratorios.length === 0 && siembra.procedencia?.trim()) {
    laboratorios = [siembra.procedencia.trim()];
  }

  return {
    ...siembra,
    nauplios,
    laboratorios,
    procedencia:
      laboratorios.length > 0
        ? laboratorios.join(', ')
        : siembra.procedencia ?? '',
  };
}

function normalizarEstado(datos: AquaProState): AquaProState {
  return {
    piscinas: Array.isArray(datos.piscinas) ? datos.piscinas : [],
    ciclos: Array.isArray(datos.ciclos)
      ? datos.ciclos.map((ciclo) => ({
          ...ciclo,
          siembra: normalizarSiembra(ciclo.siembra),
        }))
      : [],
  };
}

function cargarEstadoInicial(): AquaProState {
  if (typeof window === 'undefined') {
    return {
      piscinas: piscinasIniciales,
      ciclos: ciclosIniciales,
    };
  }

  try {
    const guardado = window.localStorage.getItem(STORAGE_KEY);

    if (!guardado) {
      return {
        piscinas: piscinasIniciales,
        ciclos: ciclosIniciales,
      };
    }

    const parsed = JSON.parse(guardado) as AquaProState;

    if (
      !Array.isArray(parsed.piscinas) ||
      !Array.isArray(parsed.ciclos)
    ) {
      throw new Error('Datos locales inválidos');
    }

    return normalizarEstado(parsed);
  } catch {
    return {
      piscinas: piscinasIniciales,
      ciclos: ciclosIniciales,
    };
  }
}

let state: AquaProState = cargarEstadoInicial();

/* =========================================================
   SUSCRIPCIONES
========================================================= */

const listeners = new Set<() => void>();

function guardarEnLocalStorage() {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(state)
    );
  } catch (error) {
    console.error(
      'No se pudo guardar AquaPro en localStorage:',
      error
    );
  }
}

function emitirCambios() {
  guardarEnLocalStorage();
  listeners.forEach((listener) => listener());
}

function actualizarEstado(
  updater: (actual: AquaProState) => AquaProState
) {
  state = updater(state);
  emitirCambios();
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return state;
}

/* =========================================================
   HOOK PARA REACT
========================================================= */

export function useAquaProStore() {
  return useSyncExternalStore(
    subscribe,
    getSnapshot,
    getSnapshot
  );
}

/* =========================================================
   UTILIDADES
========================================================= */

function crearId() {
  return Date.now() + Math.floor(Math.random() * 10000);
}

export function obtenerPiscina(piscinaId: number) {
  return state.piscinas.find(
    (piscina) => piscina.id === piscinaId
  );
}

export function obtenerCiclosPiscina(piscinaId: number) {
  return state.ciclos
    .filter((ciclo) => ciclo.piscinaId === piscinaId)
    .sort((a, b) => b.numero - a.numero);
}

export function obtenerCicloActivo(piscinaId: number) {
  return state.ciclos.find(
    (ciclo) =>
      ciclo.piscinaId === piscinaId &&
      ciclo.estado === 'Activo'
  );
}

export function obtenerSiembraActual(piscinaId: number) {
  return obtenerCicloActivo(piscinaId)?.siembra ?? null;
}

export function obtenerNumeroCicloActual(
  piscinaId: number
): number | null {
  const ciclo = obtenerCicloActivo(piscinaId);
  return ciclo?.numero ?? null;
}

export function obtenerUltimoNumeroCiclo(
  piscinaId: number
): number | null {
  const ciclos = obtenerCiclosPiscina(piscinaId);

  if (ciclos.length === 0) {
    return null;
  }

  return Math.max(...ciclos.map((ciclo) => ciclo.numero));
}

export function obtenerProximoNumeroCiclo(
  piscinaId: number
): number {
  const piscina = obtenerPiscina(piscinaId);

  if (!piscina) {
    throw new Error('La piscina no existe.');
  }

  const ultimoCiclo =
    obtenerUltimoNumeroCiclo(piscinaId);

  if (ultimoCiclo === null) {
    return piscina.cicloInicial;
  }

  return ultimoCiclo + 1;
}

/* =========================================================
   CREAR PISCINA
========================================================= */

export function crearPiscina(datos: NuevaPiscinaInput) {
  const nombre = datos.nombre.trim().toUpperCase();

  if (!nombre) {
    throw new Error('Ingresa el nombre de la piscina.');
  }

  if (!datos.hectareas || datos.hectareas <= 0) {
    throw new Error('Ingresa un área válida.');
  }

  if (!datos.cicloInicial || datos.cicloInicial < 1) {
    throw new Error('Ingresa un ciclo inicial válido.');
  }

  const yaExiste = state.piscinas.some(
    (piscina) =>
      piscina.nombre.trim().toUpperCase() === nombre
  );

  if (yaExiste) {
    throw new Error(
      `La piscina ${nombre} ya está registrada.`
    );
  }

  const nuevaPiscina: Piscina = {
    id: crearId(),
    nombre,
    zona: datos.zona,
    hectareas: datos.hectareas,
    estado:
      datos.estado === 'Mantenimiento'
        ? 'Mantenimiento'
        : 'Disponible',
    cicloInicial: datos.cicloInicial,
  };

  actualizarEstado((actual) => ({
    ...actual,
    piscinas: [...actual.piscinas, nuevaPiscina],
  }));

  return nuevaPiscina;
}

/* =========================================================
   EDITAR PISCINA
========================================================= */

export function editarPiscina(
  piscinaId: number,
  datos: EditarPiscinaInput
) {
  const piscina = obtenerPiscina(piscinaId);

  if (!piscina) {
    throw new Error('La piscina no existe.');
  }

  if (
    datos.hectareas !== undefined &&
    datos.hectareas <= 0
  ) {
    throw new Error('El área debe ser mayor que cero.');
  }

  if (datos.nombre !== undefined) {
    const nuevoNombre =
      datos.nombre.trim().toUpperCase();

    const duplicada = state.piscinas.some(
      (p) =>
        p.id !== piscinaId &&
        p.nombre.trim().toUpperCase() === nuevoNombre
    );

    if (duplicada) {
      throw new Error(
        `La piscina ${nuevoNombre} ya existe.`
      );
    }
  }

  actualizarEstado((actual) => ({
    ...actual,
    piscinas: actual.piscinas.map((p) =>
      p.id === piscinaId
        ? {
            ...p,
            ...(datos.nombre !== undefined
              ? {
                  nombre:
                    datos.nombre.trim().toUpperCase(),
                }
              : {}),
            ...(datos.zona !== undefined
              ? { zona: datos.zona }
              : {}),
            ...(datos.hectareas !== undefined
              ? { hectareas: datos.hectareas }
              : {}),
            ...(datos.estado !== undefined
              ? { estado: datos.estado }
              : {}),
          }
        : p
    ),
  }));
}

/* =========================================================
   ELIMINAR PISCINA
========================================================= */

export function eliminarPiscina(piscinaId: number) {
  actualizarEstado((actual) => ({
    piscinas: actual.piscinas.filter(
      (piscina) => piscina.id !== piscinaId
    ),
    ciclos: actual.ciclos.filter(
      (ciclo) => ciclo.piscinaId !== piscinaId
    ),
  }));
}

/* =========================================================
   REGISTRAR NUEVA SIEMBRA
========================================================= */

export function registrarNuevaSiembra(
  datos: NuevaSiembraInput
) {
  const piscina = obtenerPiscina(datos.piscinaId);

  if (!piscina) {
    throw new Error(
      'La piscina seleccionada no existe.'
    );
  }

  const cicloActivo =
    obtenerCicloActivo(datos.piscinaId);

  if (cicloActivo) {
    throw new Error(
      `La piscina ${piscina.nombre} ya tiene el Ciclo ${cicloActivo.numero} activo.`
    );
  }

  if (!datos.fecha) {
    throw new Error('Ingresa la fecha de siembra.');
  }

  if (
    !datos.cantidadSembrada ||
    datos.cantidadSembrada <= 0
  ) {
    throw new Error(
      'Ingresa una cantidad sembrada válida.'
    );
  }

  if (
    datos.pesoInicial === null ||
    datos.pesoInicial === undefined ||
    !Number.isFinite(datos.pesoInicial) ||
    datos.pesoInicial <= 0
  ) {
    throw new Error(
      'Ingresa un peso inicial válido.'
    );
  }

  const nauplios = normalizarLista(datos.nauplios);
  const laboratorios =
    normalizarLista(datos.laboratorios);

  const numeroCiclo =
    obtenerProximoNumeroCiclo(datos.piscinaId);

  const cicloId = crearId();
  const siembraId = crearId();

  const nuevaSiembra: Siembra = {
    id: siembraId,
    fecha: datos.fecha,
    cantidadSembrada: datos.cantidadSembrada,
    pesoInicial: datos.pesoInicial,
    nauplios,
    laboratorios,
    procedencia:
      laboratorios.length > 0
        ? laboratorios.join(', ')
        : datos.procedencia.trim(),
    observacion: datos.observacion.trim(),
    piscinaId: datos.piscinaId,
    cicloId,
    ciclo: numeroCiclo,
  };

  const nuevoCiclo: Ciclo = {
    id: cicloId,
    piscinaId: datos.piscinaId,
    numero: numeroCiclo,
    estado: 'Activo',
    fechaInicio: datos.fecha,
    fechaCierre: null,
    siembra: nuevaSiembra,
  };

  actualizarEstado((actual) => ({
    piscinas: actual.piscinas.map((p) =>
      p.id === datos.piscinaId
        ? {
            ...p,
            estado: 'Activa',
          }
        : p
    ),
    ciclos: [...actual.ciclos, nuevoCiclo],
  }));

  return nuevoCiclo;
}

/* =========================================================
   EDITAR SIEMBRA ACTUAL
========================================================= */

export function actualizarSiembraActual(
  piscinaId: number,
  datos: EditarSiembraInput
) {
  const cicloActivo =
    obtenerCicloActivo(piscinaId);

  if (!cicloActivo) {
    throw new Error(
      'Esta piscina no tiene un ciclo activo.'
    );
  }

  if (!cicloActivo.siembra) {
    throw new Error(
      'Este ciclo no tiene una siembra registrada.'
    );
  }

  if (!datos.fecha) {
    throw new Error('Ingresa la fecha de siembra.');
  }

  if (
    !datos.cantidadSembrada ||
    datos.cantidadSembrada <= 0
  ) {
    throw new Error(
      'Ingresa una cantidad sembrada válida.'
    );
  }

  if (
    datos.pesoInicial === null ||
    datos.pesoInicial === undefined ||
    !Number.isFinite(datos.pesoInicial) ||
    datos.pesoInicial <= 0
  ) {
    throw new Error(
      'Ingresa un peso inicial válido.'
    );
  }

  const nauplios = normalizarLista(datos.nauplios);
  const laboratorios =
    normalizarLista(datos.laboratorios);

  actualizarEstado((actual) => ({
    ...actual,
    ciclos: actual.ciclos.map((ciclo) =>
      ciclo.id === cicloActivo.id
        ? {
            ...ciclo,
            fechaInicio: datos.fecha,
            siembra: ciclo.siembra
              ? {
                  ...ciclo.siembra,
                  fecha: datos.fecha,
                  cantidadSembrada:
                    datos.cantidadSembrada,
                  pesoInicial: datos.pesoInicial,
                  nauplios,
                  laboratorios,
                  procedencia:
                    laboratorios.length > 0
                      ? laboratorios.join(', ')
                      : datos.procedencia.trim(),
                  observacion:
                    datos.observacion.trim(),
                }
              : null,
          }
        : ciclo
    ),
  }));
}

/* =========================================================
   ELIMINAR SIEMBRA ACTUAL
========================================================= */

export function eliminarSiembraActual(
  piscinaId: number
) {
  const cicloActivo =
    obtenerCicloActivo(piscinaId);

  if (!cicloActivo) {
    throw new Error(
      'Esta piscina no tiene un ciclo activo.'
    );
  }

  actualizarEstado((actual) => ({
    piscinas: actual.piscinas.map((piscina) =>
      piscina.id === piscinaId
        ? {
            ...piscina,
            estado:
              piscina.estado === 'Mantenimiento'
                ? 'Mantenimiento'
                : 'Disponible',
          }
        : piscina
    ),
    ciclos: actual.ciclos.filter(
      (ciclo) => ciclo.id !== cicloActivo.id
    ),
  }));
}

/* =========================================================
   CERRAR CICLO
========================================================= */

export function cerrarCicloPorLiquidacion(
  piscinaId: number,
  fechaCierre?: string
) {
  const piscina = obtenerPiscina(piscinaId);

  if (!piscina) {
    throw new Error('La piscina no existe.');
  }

  const cicloActivo =
    obtenerCicloActivo(piscinaId);

  if (!cicloActivo) {
    throw new Error(
      `La piscina ${piscina.nombre} no tiene un ciclo activo.`
    );
  }

  const fecha =
    fechaCierre ??
    new Date().toISOString().slice(0, 10);

  actualizarEstado((actual) => ({
    piscinas: actual.piscinas.map((p) =>
      p.id === piscinaId
        ? {
            ...p,
            estado: 'Descanso',
          }
        : p
    ),
    ciclos: actual.ciclos.map((ciclo) =>
      ciclo.id === cicloActivo.id
        ? {
            ...ciclo,
            estado: 'Cerrado',
            fechaCierre: fecha,
          }
        : ciclo
    ),
  }));

  return {
    piscinaId,
    piscina: piscina.nombre,
    cicloCerrado: cicloActivo.numero,
    proximoCiclo: cicloActivo.numero + 1,
  };
}

/* =========================================================
   SABER SI PUEDE RECIBIR NUEVA SIEMBRA
========================================================= */

export function puedeRegistrarNuevaSiembra(
  piscinaId: number
) {
  const piscina = obtenerPiscina(piscinaId);

  if (!piscina) {
    return false;
  }

  if (piscina.estado === 'Mantenimiento') {
    return false;
  }

  return !obtenerCicloActivo(piscinaId);
}

/* =========================================================
   INFORMACIÓN COMPLETA PARA PISCINAS
========================================================= */

export function obtenerDatosPiscina(piscinaId: number) {
  const piscina = obtenerPiscina(piscinaId);

  if (!piscina) {
    return null;
  }

  const cicloActivo =
    obtenerCicloActivo(piscinaId);

  const ciclos =
    obtenerCiclosPiscina(piscinaId);

  return {
    ...piscina,
    cicloActual: cicloActivo?.numero ?? null,
    cicloActivo: cicloActivo ?? null,
    siembraActual: cicloActivo?.siembra ?? null,
    proximoCiclo: cicloActivo
      ? cicloActivo.numero
      : obtenerProximoNumeroCiclo(piscinaId),
    totalCiclos: ciclos.length,
    historialCiclos: ciclos,
  };
}

/* =========================================================
   INFORMACIÓN PARA REPORTES FUTUROS
========================================================= */

export function obtenerHistorialPiscina(
  piscinaId: number
) {
  const piscina = obtenerPiscina(piscinaId);

  if (!piscina) {
    return null;
  }

  return {
    piscina,
    ciclos: obtenerCiclosPiscina(piscinaId),
  };
}

/* =========================================================
   REINICIAR DATOS DE PRUEBA
========================================================= */

export function reiniciarAquaPro() {
  state = {
    piscinas: piscinasIniciales.map((piscina) => ({
      ...piscina,
    })),
    ciclos: ciclosIniciales.map((ciclo) => ({
      ...ciclo,
      siembra: ciclo.siembra
        ? {
            ...ciclo.siembra,
            nauplios: [
              ...(ciclo.siembra.nauplios ?? []),
            ],
            laboratorios: [
              ...(ciclo.siembra.laboratorios ?? []),
            ],
          }
        : null,
    })),
  };

  emitirCambios();
}
