import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Clock3,
  Droplets,
  Edit3,
  FlaskConical,
  Gauge,
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Search,
  Thermometer,
  Waves,
  X,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import * as XLSX from 'xlsx';
import { obtenerCicloActivo, useAquaProStore } from '../store/aquaProStore';

type RegistroCalidadAgua = {
  id: number;
  piscinaId: number;
  cicloId: number;
  ciclo: number;
  fecha: string;
  hora: string;
  oxigeno: number;
  saturacion: number;
  temperatura: number;
  salinidad: number | null;
  ph: number | null;
  observacion: string;
};

type FilaImportacion = RegistroCalidadAgua & {
  piscinaNombre: string;
};

type IncidenciaImportacion = {
  tipo: 'error' | 'aviso';
  mensaje: string;
};

type VistaPreviaImportacion = {
  archivo: string;
  registros: FilaImportacion[];
  incidencias: IncidenciaImportacion[];
  hojasDetectadas: string[];
  hojasOpcionalesAusentes: string[];
  duplicados: number;
  omitidos: number;
};

const normalizarTexto = (valor: unknown) =>
  String(valor ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

const normalizarFechaExcel = (valor: unknown): string => {
  if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
    const y = valor.getFullYear();
    const m = String(valor.getMonth() + 1).padStart(2, '0');
    const d = String(valor.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  if (typeof valor === 'number' && Number.isFinite(valor)) {
    const partes = XLSX.SSF.parse_date_code(valor);
    if (partes) {
      return `${String(partes.y).padStart(4, '0')}-${String(partes.m).padStart(
        2,
        '0'
      )}-${String(partes.d).padStart(2, '0')}`;
    }
  }

  const texto = String(valor ?? '').trim();
  if (!texto) return '';

  const iso = texto.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (iso)
    return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;

  const latino = texto.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (latino)
    return `${latino[3]}-${latino[2].padStart(2, '0')}-${latino[1].padStart(
      2,
      '0'
    )}`;

  const fecha = new Date(texto);
  if (!Number.isNaN(fecha.getTime())) {
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const d = String(fecha.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return '';
};

const normalizarHoraExcel = (valor: unknown): string => {
  if (typeof valor === 'number' && Number.isFinite(valor)) {
    const totalMinutos = Math.round((valor % 1) * 24 * 60);
    const h = Math.floor(totalMinutos / 60) % 24;
    const m = totalMinutos % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  const texto = String(valor ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
  if (!texto) return '';
  const hh24 = texto.match(/^(\d{1,2}):(\d{2})$/);
  if (hh24) {
    const h = Number(hh24[1]);
    const m = Number(hh24[2]);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59)
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  const hh12 = texto.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/);
  if (hh12) {
    let h = Number(hh12[1]);
    const m = Number(hh12[2] ?? 0);
    if (h < 1 || h > 12 || m < 0 || m > 59) return '';
    if (hh12[3] === 'AM' && h === 12) h = 0;
    if (hh12[3] === 'PM' && h !== 12) h += 12;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  return '';
};

const leerHojaMatriz = (
  workbook: XLSX.WorkBook,
  nombreRealHoja: string
): Map<string, number> => {
  const hoja = workbook.Sheets[nombreRealHoja];
  if (!hoja) return new Map();
  const filas = XLSX.utils.sheet_to_json<unknown[]>(hoja, {
    header: 1,
    raw: true,
    defval: '',
  });
  if (!filas.length) return new Map();
  const encabezados = (filas[0] ?? []) as unknown[];
  const resultado = new Map<string, number>();

  for (let i = 1; i < filas.length; i += 1) {
    const fila = (filas[i] ?? []) as unknown[];
    const fecha = normalizarFechaExcel(fila[0]);
    const piscina = String(fila[1] ?? '')
      .trim()
      .toUpperCase();
    if (!fecha || !piscina) continue;
    for (let c = 2; c < encabezados.length; c += 1) {
      const hora = normalizarHoraExcel(encabezados[c]);
      if (!hora) continue;
      const celda = fila[c];
      if (celda === '' || celda === null || celda === undefined) continue;
      const valor = Number(celda);
      if (!Number.isFinite(valor)) continue;
      resultado.set(`${fecha}|${piscina}|${hora}`, valor);
    }
  }
  return resultado;
};

const STORAGE_KEY = 'aquapro-calidad-agua-v1';

type EstadoOxigeno = 'critico' | 'atencion' | 'optimo';

const obtenerEstadoOxigeno = (valor: number): EstadoOxigeno => {
  if (valor <= 3.5) return 'critico';
  if (valor < 5.6) return 'atencion';
  return 'optimo';
};

const datosEstadoOxigeno: Record<
  EstadoOxigeno,
  { etiqueta: string; emoji: string; color: string; fondo: string }
> = {
  critico: {
    etiqueta: 'Crítico',
    emoji: '🔴',
    color: '#c83f4d',
    fondo: '#fff0f1',
  },
  atencion: {
    etiqueta: 'Atención',
    emoji: '🟡',
    color: '#b77900',
    fondo: '#fff8df',
  },
  optimo: {
    etiqueta: 'Óptimo',
    emoji: '🟢',
    color: '#23845f',
    fondo: '#eaf8f1',
  },
};

const hoy = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const horaActual = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes()
  ).padStart(2, '0')}`;
};

const numero = (valor: unknown) => {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
};

const formato = (valor: unknown, decimales = 2) => {
  if (valor === null || valor === undefined || valor === '') return '—';
  return numero(valor).toLocaleString('es-EC', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });
};

const fechaBonita = (fecha: string) => {
  if (!fecha) return '—';
  const [y, m, d] = fecha.split('-').map(Number);
  if (!y || !m || !d) return fecha;
  return new Intl.DateTimeFormat('es-EC', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(Date.UTC(y, m - 1, d)));
};

const cargarRegistros = (): RegistroCalidadAgua[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];

    return data
      .map((r: Partial<RegistroCalidadAgua>, index: number) => ({
        id: numero(r.id) || Date.now() + index,
        piscinaId: numero(r.piscinaId),
        cicloId: numero(r.cicloId),
        ciclo: numero(r.ciclo),
        fecha: String(r.fecha ?? ''),
        hora: String(r.hora ?? ''),
        oxigeno: numero(r.oxigeno),
        saturacion: numero(r.saturacion),
        temperatura: numero(r.temperatura),
        salinidad:
          r.salinidad === null ||
          r.salinidad === undefined ||
          r.salinidad === ''
            ? null
            : numero(r.salinidad),
        ph:
          r.ph === null || r.ph === undefined || r.ph === ''
            ? null
            : numero(r.ph),
        observacion: String(r.observacion ?? ''),
      }))
      .filter((r) => r.piscinaId > 0);
  } catch {
    return [];
  }
};

export default function CalidadAgua() {
  const { piscinas: piscinasStore, ciclos } = useAquaProStore();

  const piscinas = useMemo(
    () =>
      piscinasStore
        .map((piscina) => {
          const ciclo = obtenerCicloActivo(piscina.id);
          return ciclo?.siembra ? { ...piscina, cicloActivo: ciclo } : null;
        })
        .filter(Boolean) as Array<
        (typeof piscinasStore)[number] & {
          cicloActivo: NonNullable<ReturnType<typeof obtenerCicloActivo>>;
        }
      >,
    [piscinasStore, ciclos]
  );

  const [registros, setRegistros] =
    useState<RegistroCalidadAgua[]>(cargarRegistros);
  const [piscinaSeleccionadaId, setPiscinaSeleccionadaId] = useState(0);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);

  const [fecha, setFecha] = useState(hoy());
  const [hora, setHora] = useState(horaActual());
  const [oxigeno, setOxigeno] = useState('');
  const [saturacion, setSaturacion] = useState('');
  const [temperatura, setTemperatura] = useState('');
  const [salinidad, setSalinidad] = useState('');
  const [ph, setPh] = useState('');
  const [observacion, setObservacion] = useState('');
  const [error, setError] = useState('');

  const [busqueda, setBusqueda] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [periodoOxigeno, setPeriodoOxigeno] = useState<
    'hoy' | '7dias' | '30dias' | 'todo'
  >('7dias');

  const [importando, setImportando] = useState(false);
  const [vistaPreviaImportacion, setVistaPreviaImportacion] =
    useState<VistaPreviaImportacion | null>(null);

  useEffect(() => {
    if (piscinas.length === 0) {
      if (piscinaSeleccionadaId !== 0) setPiscinaSeleccionadaId(0);
      return;
    }

    if (!piscinas.some((p) => p.id === piscinaSeleccionadaId)) {
      setPiscinaSeleccionadaId(piscinas[0].id);
    }
  }, [piscinas, piscinaSeleccionadaId]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(registros));
    } catch {
      // La interfaz continúa funcionando aunque el navegador bloquee storage.
    }
  }, [registros]);

  const piscinaSeleccionada =
    piscinas.find((p) => p.id === piscinaSeleccionadaId) ?? null;

  const registrosPiscina = useMemo(() => {
    return registros
      .filter((r) => r.piscinaId === piscinaSeleccionadaId)
      .filter((r) => !desde || r.fecha >= desde)
      .filter((r) => !hasta || r.fecha <= hasta)
      .filter((r) => {
        const q = busqueda.trim().toLowerCase();
        if (!q) return true;
        return (
          r.fecha.toLowerCase().includes(q) ||
          r.hora.toLowerCase().includes(q) ||
          r.observacion.toLowerCase().includes(q) ||
          String(r.ciclo).includes(q)
        );
      })
      .sort((a, b) =>
        `${b.fecha}T${b.hora}`.localeCompare(`${a.fecha}T${a.hora}`)
      );
  }, [registros, piscinaSeleccionadaId, desde, hasta, busqueda]);

  const registrosCicloActual = useMemo(() => {
    if (!piscinaSeleccionada) return [];

    return registros
      .filter(
        (r) =>
          r.piscinaId === piscinaSeleccionada.id &&
          r.cicloId === piscinaSeleccionada.cicloActivo.id
      )
      .sort((a, b) =>
        `${a.fecha}T${a.hora}`.localeCompare(`${b.fecha}T${b.hora}`)
      );
  }, [registros, piscinaSeleccionada]);

  const datosOxigeno = useMemo(() => {
    const fechaHoy = hoy();

    const restarDias = (fechaBase: string, dias: number) => {
      const [y, m, d] = fechaBase.split('-').map(Number);
      const fechaUTC = new Date(Date.UTC(y, m - 1, d));
      fechaUTC.setUTCDate(fechaUTC.getUTCDate() - dias);
      return `${fechaUTC.getUTCFullYear()}-${String(
        fechaUTC.getUTCMonth() + 1
      ).padStart(2, '0')}-${String(fechaUTC.getUTCDate()).padStart(2, '0')}`;
    };

    let desdeGrafica = '';
    if (periodoOxigeno === 'hoy') desdeGrafica = fechaHoy;
    if (periodoOxigeno === '7dias') desdeGrafica = restarDias(fechaHoy, 6);
    if (periodoOxigeno === '30dias') desdeGrafica = restarDias(fechaHoy, 29);

    return registrosCicloActual
      .filter((r) => !desdeGrafica || r.fecha >= desdeGrafica)
      .map((r) => {
        const [, mes, dia] = r.fecha.split('-');
        return {
          id: r.id,
          momento: `${dia}/${mes} ${r.hora}`,
          oxigeno: r.oxigeno,
          fecha: r.fecha,
          hora: r.hora,
        };
      });
  }, [registrosCicloActual, periodoOxigeno]);

  const resumenOxigeno = useMemo(() => {
    if (!datosOxigeno.length) {
      return { promedio: 0, minimo: 0, maximo: 0 };
    }

    const valores = datosOxigeno.map((d) => d.oxigeno);
    return {
      promedio: valores.reduce((a, b) => a + b, 0) / valores.length,
      minimo: Math.min(...valores),
      maximo: Math.max(...valores),
    };
  }, [datosOxigeno]);

  const comparativaOxigeno = useMemo(() => {
    return piscinas
      .map((piscina) => {
        const ultimaMedicion = registros
          .filter(
            (r) =>
              r.piscinaId === piscina.id && r.cicloId === piscina.cicloActivo.id
          )
          .sort((a, b) =>
            `${b.fecha}T${b.hora}`.localeCompare(`${a.fecha}T${a.hora}`)
          )[0];

        if (!ultimaMedicion) return null;

        return {
          piscinaId: piscina.id,
          piscina: piscina.nombre,
          ciclo: piscina.cicloActivo.numero,
          oxigeno: ultimaMedicion.oxigeno,
          fecha: ultimaMedicion.fecha,
          hora: ultimaMedicion.hora,
        };
      })
      .filter(
        (
          item
        ): item is {
          piscinaId: number;
          piscina: string;
          ciclo: number;
          oxigeno: number;
          fecha: string;
          hora: string;
        } => item !== null
      )
      .sort((a, b) => b.oxigeno - a.oxigeno);
  }, [piscinas, registros]);

  const resumenEstadosOxigeno = useMemo(() => {
    return comparativaOxigeno.reduce(
      (acc, item) => {
        acc[obtenerEstadoOxigeno(item.oxigeno)] += 1;
        return acc;
      },
      { critico: 0, atencion: 0, optimo: 0 }
    );
  }, [comparativaOxigeno]);

  const maximoGraficaOxigeno = useMemo(() => {
    const maximo = datosOxigeno.length
      ? Math.max(...datosOxigeno.map((item) => item.oxigeno))
      : 7;
    return Math.max(7, Math.ceil((maximo + 0.5) * 10) / 10);
  }, [datosOxigeno]);

  const ultimoRegistro = registrosPiscina[0] ?? null;

  const promedio = (
    campo: keyof Pick<
      RegistroCalidadAgua,
      'oxigeno' | 'saturacion' | 'temperatura' | 'salinidad' | 'ph'
    >
  ) => {
    const valores = registrosPiscina
      .map((r) => r[campo])
      .filter(
        (valor): valor is number =>
          valor !== null &&
          valor !== undefined &&
          Number.isFinite(Number(valor))
      )
      .map(Number);

    if (!valores.length) return 0;
    return valores.reduce((acc, valor) => acc + valor, 0) / valores.length;
  };

  const limpiarFormulario = () => {
    setFecha(hoy());
    setHora(horaActual());
    setOxigeno('');
    setSaturacion('');
    setTemperatura('');
    setSalinidad('');
    setPh('');
    setObservacion('');
    setError('');
    setEditandoId(null);
  };

  const abrirNuevo = () => {
    limpiarFormulario();
    setModalAbierto(true);
  };

  const editar = (registro: RegistroCalidadAgua) => {
    setEditandoId(registro.id);
    setFecha(registro.fecha);
    setHora(registro.hora);
    setOxigeno(String(registro.oxigeno));
    setSaturacion(String(registro.saturacion));
    setTemperatura(String(registro.temperatura));
    setSalinidad(registro.salinidad == null ? '' : String(registro.salinidad));
    setPh(registro.ph == null ? '' : String(registro.ph));
    setObservacion(registro.observacion ?? '');
    setError('');
    setModalAbierto(true);
  };

  const guardar = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!piscinaSeleccionada) {
      setError('Selecciona una piscina con ciclo activo.');
      return;
    }

    const valores = {
      oxigeno: Number(oxigeno),
      saturacion: Number(saturacion),
      temperatura: Number(temperatura),
      salinidad: salinidad.trim() === '' ? null : Number(salinidad),
      ph: ph.trim() === '' ? null : Number(ph),
    };

    if (!fecha || !hora) {
      setError('Ingresa la fecha y la hora de la medición.');
      return;
    }

    if (
      oxigeno.trim() === '' ||
      saturacion.trim() === '' ||
      temperatura.trim() === '' ||
      [valores.oxigeno, valores.saturacion, valores.temperatura].some(
        (valor) => !Number.isFinite(valor) || valor < 0
      )
    ) {
      setError('Completa correctamente oxígeno, saturación y temperatura.');
      return;
    }

    if (
      valores.salinidad !== null &&
      (!Number.isFinite(valores.salinidad) || valores.salinidad < 0)
    ) {
      setError('Revisa el valor ingresado en salinidad.');
      return;
    }

    if (
      valores.ph !== null &&
      (!Number.isFinite(valores.ph) || valores.ph < 0 || valores.ph > 14)
    ) {
      setError('El pH debe estar entre 0 y 14.');
      return;
    }

    if (valores.saturacion > 300) {
      setError(
        'Revisa la saturación ingresada; el valor parece demasiado alto.'
      );
      return;
    }

    const ciclo = piscinaSeleccionada.cicloActivo;

    const nuevo: RegistroCalidadAgua = {
      id: editandoId ?? Date.now(),
      piscinaId: piscinaSeleccionada.id,
      cicloId: ciclo.id,
      ciclo: ciclo.numero,
      fecha,
      hora,
      ...valores,
      observacion: observacion.trim(),
    };

    setRegistros((prev) => {
      if (editandoId !== null) {
        return prev.map((r) => (r.id === editandoId ? nuevo : r));
      }
      return [nuevo, ...prev];
    });

    setModalAbierto(false);
    limpiarFormulario();
  };

  const procesarExcel = async (archivo: File) => {
    setImportando(true);
    setVistaPreviaImportacion(null);

    try {
      const buffer = await archivo.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
      const nombrePorTipo = new Map<string, string>();
      workbook.SheetNames.forEach((nombre) => {
        const n = normalizarTexto(nombre);
        if (n === 'OXIGENO') nombrePorTipo.set('OXIGENO', nombre);
        if (n === 'SATURACION') nombrePorTipo.set('SATURACION', nombre);
        if (n === 'TEMPERATURA') nombrePorTipo.set('TEMPERATURA', nombre);
        if (n === 'SALINIDAD') nombrePorTipo.set('SALINIDAD', nombre);
        if (n === 'PH') nombrePorTipo.set('PH', nombre);
      });

      const faltantes = ['OXIGENO', 'SATURACION', 'TEMPERATURA'].filter(
        (n) => !nombrePorTipo.has(n)
      );
      const opcionalesAusentes = ['SALINIDAD', 'PH'].filter(
        (n) => !nombrePorTipo.has(n)
      );
      const incidencias: IncidenciaImportacion[] = [];

      if (faltantes.length) {
        faltantes.forEach((nombre) =>
          incidencias.push({
            tipo: 'error',
            mensaje: `Falta la hoja obligatoria ${nombre}.`,
          })
        );
        setVistaPreviaImportacion({
          archivo: archivo.name,
          registros: [],
          incidencias,
          hojasDetectadas: Array.from(nombrePorTipo.keys()),
          hojasOpcionalesAusentes: opcionalesAusentes,
          duplicados: 0,
          omitidos: 0,
        });
        return;
      }

      const oxigenos = leerHojaMatriz(workbook, nombrePorTipo.get('OXIGENO')!);
      const saturaciones = leerHojaMatriz(
        workbook,
        nombrePorTipo.get('SATURACION')!
      );
      const temperaturas = leerHojaMatriz(
        workbook,
        nombrePorTipo.get('TEMPERATURA')!
      );
      const salinidades = nombrePorTipo.has('SALINIDAD')
        ? leerHojaMatriz(workbook, nombrePorTipo.get('SALINIDAD')!)
        : new Map<string, number>();
      const phs = nombrePorTipo.has('PH')
        ? leerHojaMatriz(workbook, nombrePorTipo.get('PH')!)
        : new Map<string, number>();

      const activas = new Map(
        piscinas.map((p) => [p.nombre.trim().toUpperCase(), p])
      );
      const todas = new Map(
        piscinasStore.map((p) => [p.nombre.trim().toUpperCase(), p])
      );
      const existentes = new Set(
        registros.map((r) => `${r.piscinaId}|${r.cicloId}|${r.fecha}|${r.hora}`)
      );
      const nuevos: FilaImportacion[] = [];
      const avisos = new Set<string>();
      let duplicados = 0;
      let omitidos = 0;
      const baseId = Date.now() * 1000;

      Array.from(oxigenos.entries()).forEach(([clave, valorOxigeno], index) => {
        const [fechaExcel, piscinaNombre, horaExcel] = clave.split('|');
        const piscina = activas.get(piscinaNombre);
        if (!piscina) {
          omitidos += 1;
          const mensaje = todas.has(piscinaNombre)
            ? `${piscinaNombre}: existe, pero no tiene ciclo activo. Se omitió.`
            : `${piscinaNombre}: no existe en AquaPro. Se omitió.`;
          if (!avisos.has(mensaje)) {
            avisos.add(mensaje);
            incidencias.push({ tipo: 'aviso', mensaje });
          }
          return;
        }

        const ciclo = piscina.cicloActivo;
        if (ciclo.fechaInicio && fechaExcel < ciclo.fechaInicio) {
          omitidos += 1;
          const mensaje = `${piscinaNombre} · ${fechaExcel}: fecha anterior al inicio del Ciclo ${ciclo.numero}. No se asignó a un ciclo anterior.`;
          if (!avisos.has(mensaje)) {
            avisos.add(mensaje);
            incidencias.push({ tipo: 'aviso', mensaje });
          }
          return;
        }

        const sat = saturaciones.get(clave);
        const temp = temperaturas.get(clave);
        if (sat === undefined || temp === undefined) {
          omitidos += 1;
          const mensaje = `${piscinaNombre} · ${fechaExcel} ${horaExcel}: falta Saturación o Temperatura. Se omitió.`;
          if (!avisos.has(mensaje)) {
            avisos.add(mensaje);
            incidencias.push({ tipo: 'aviso', mensaje });
          }
          return;
        }
        if (valorOxigeno < 0 || sat < 0 || temp < 0 || sat > 300) {
          omitidos += 1;
          return;
        }
        const valorPh = phs.get(clave);
        if (valorPh !== undefined && (valorPh < 0 || valorPh > 14)) {
          omitidos += 1;
          return;
        }

        const claveDup = `${piscina.id}|${ciclo.id}|${fechaExcel}|${horaExcel}`;
        if (existentes.has(claveDup)) {
          duplicados += 1;
          return;
        }
        existentes.add(claveDup);

        nuevos.push({
          id: baseId + index,
          piscinaId: piscina.id,
          piscinaNombre: piscina.nombre,
          cicloId: ciclo.id,
          ciclo: ciclo.numero,
          fecha: fechaExcel,
          hora: horaExcel,
          oxigeno: valorOxigeno,
          saturacion: sat,
          temperatura: temp,
          salinidad: salinidades.get(clave) ?? null,
          ph: valorPh ?? null,
          observacion: `Importado desde Excel: ${archivo.name}`,
        });
      });

      setVistaPreviaImportacion({
        archivo: archivo.name,
        registros: nuevos,
        incidencias,
        hojasDetectadas: Array.from(nombrePorTipo.keys()),
        hojasOpcionalesAusentes: opcionalesAusentes,
        duplicados,
        omitidos,
      });
    } catch {
      setVistaPreviaImportacion({
        archivo: archivo.name,
        registros: [],
        incidencias: [
          {
            tipo: 'error',
            mensaje:
              'No se pudo leer el Excel. Verifica que sea un .xlsx válido y conserve la estructura de la plantilla.',
          },
        ],
        hojasDetectadas: [],
        hojasOpcionalesAusentes: [],
        duplicados: 0,
        omitidos: 0,
      });
    } finally {
      setImportando(false);
    }
  };

  const confirmarImportacion = () => {
    if (!vistaPreviaImportacion?.registros.length) return;
    const nuevos = vistaPreviaImportacion.registros.map(
      ({ piscinaNombre: _piscinaNombre, ...registro }) => registro
    );
    setRegistros((prev) => [...nuevos, ...prev]);
    setPiscinaSeleccionadaId(vistaPreviaImportacion.registros[0].piscinaId);
    setVistaPreviaImportacion(null);
  };

  if (piscinas.length === 0) {
    return (
      <div style={styles.pagina}>
        <div style={styles.encabezado}>
          <div>
            <div style={styles.eyebrow}>MONITOREO PRODUCTIVO</div>
            <h1 style={styles.titulo}>💧 Calidad de agua</h1>
            <p style={styles.subtitulo}>
              Registra y consulta las mediciones de cada ciclo.
            </p>
          </div>
        </div>

        <div style={styles.vacioGrande}>
          <div style={{ fontSize: 52 }}>🌊</div>
          <h3 style={{ margin: '10px 0 6px' }}>
            No hay piscinas en producción
          </h3>
          <p style={styles.textoSuave}>
            Cuando registres una siembra y exista un ciclo activo, la piscina
            aparecerá automáticamente aquí.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.pagina}>
      <div style={styles.encabezado}>
        <div>
          <div style={styles.eyebrow}>MONITOREO PRODUCTIVO</div>
          <h1 style={styles.titulo}>💧 Calidad de agua</h1>
          <p style={styles.subtitulo}>
            Control por piscina, ciclo, fecha y hora.
          </p>
        </div>

        <div style={styles.accionesEncabezado}>
          <label style={styles.botonImportar}>
            <Upload size={18} />
            {importando ? 'Leyendo Excel...' : 'Importar Excel'}
            <input
              type="file"
              accept=".xlsx,.xls"
              disabled={importando}
              style={{ display: 'none' }}
              onChange={(e) => {
                const archivo = e.target.files?.[0];
                if (archivo) void procesarExcel(archivo);
                e.currentTarget.value = '';
              }}
            />
          </label>
          <button
            type="button"
            style={styles.botonPrincipal}
            onClick={abrirNuevo}
          >
            <Plus size={18} />
            Nueva medición
          </button>
        </div>
      </div>

      <section style={styles.panelPiscina}>
        <div style={styles.selectorGrupo}>
          <label style={styles.label}>Piscina en producción</label>
          <select
            value={piscinaSeleccionadaId}
            onChange={(e) => setPiscinaSeleccionadaId(Number(e.target.value))}
            style={styles.select}
          >
            {piscinas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre} · Ciclo {p.cicloActivo.numero}
              </option>
            ))}
          </select>
        </div>

        {piscinaSeleccionada && (
          <div style={styles.datosPiscina}>
            <span style={styles.chipActivo}>● Ciclo activo</span>
            <span>
              🦐 <b>Ciclo {piscinaSeleccionada.cicloActivo.numero}</b>
            </span>
            <span>📍 {piscinaSeleccionada.zona}</span>
            <span>📐 {formato(piscinaSeleccionada.hectareas, 2)} ha</span>
          </div>
        )}
      </section>

      <section style={styles.tarjetasGrid}>
        <Tarjeta
          icono={<Activity size={20} />}
          etiqueta="Oxígeno"
          valor={
            ultimoRegistro ? `${formato(ultimoRegistro.oxigeno)} mg/L` : '—'
          }
          detalle={
            registrosPiscina.length
              ? `Prom. ${formato(promedio('oxigeno'))} mg/L`
              : 'Sin mediciones'
          }
        />
        <Tarjeta
          icono={<Gauge size={20} />}
          etiqueta="Saturación"
          valor={
            ultimoRegistro ? `${formato(ultimoRegistro.saturacion, 1)} %` : '—'
          }
          detalle={
            registrosPiscina.length
              ? `Prom. ${formato(promedio('saturacion'), 1)} %`
              : 'Sin mediciones'
          }
        />
        <Tarjeta
          icono={<Thermometer size={20} />}
          etiqueta="Temperatura"
          valor={
            ultimoRegistro
              ? `${formato(ultimoRegistro.temperatura, 1)} °C`
              : '—'
          }
          detalle={
            registrosPiscina.length
              ? `Prom. ${formato(promedio('temperatura'), 1)} °C`
              : 'Sin mediciones'
          }
        />
        <Tarjeta
          icono={<Waves size={20} />}
          etiqueta="Salinidad"
          valor={
            ultimoRegistro ? `${formato(ultimoRegistro.salinidad, 1)} ppt` : '—'
          }
          detalle={
            registrosPiscina.length
              ? `Prom. ${formato(promedio('salinidad'), 1)} ppt`
              : 'Sin mediciones'
          }
        />
        <Tarjeta
          icono={<FlaskConical size={20} />}
          etiqueta="pH"
          valor={ultimoRegistro ? formato(ultimoRegistro.ph, 2) : '—'}
          detalle={
            registrosPiscina.length
              ? `Prom. ${formato(promedio('ph'), 2)}`
              : 'Sin mediciones'
          }
        />
      </section>

      <section style={styles.estadoOxigenoResumen}>
        <div style={styles.estadoResumenTitulo}>
          <div>
            <strong>🚦 Estado actual del oxígeno</strong>
            <span>
              Clasificación según la última medición de cada piscina activa
            </span>
          </div>
          <div style={styles.rangosLeyenda}>
            <span>🔴 ≤ 3.5 mg/L</span>
            <span>🟡 3.6–5.5 mg/L</span>
            <span>🟢 ≥ 5.6 mg/L</span>
          </div>
        </div>

        <div style={styles.estadoResumenGrid}>
          {(['critico', 'atencion', 'optimo'] as EstadoOxigeno[]).map(
            (estado) => {
              const info = datosEstadoOxigeno[estado];
              return (
                <div
                  key={estado}
                  style={{
                    ...styles.estadoResumenCard,
                    background: info.fondo,
                    borderColor: `${info.color}33`,
                  }}
                >
                  <span style={styles.estadoResumenEmoji}>{info.emoji}</span>
                  <div>
                    <strong
                      style={{
                        ...styles.estadoResumenNumero,
                        color: info.color,
                      }}
                    >
                      {resumenEstadosOxigeno[estado]}
                    </strong>
                    <span style={styles.estadoResumenLabel}>
                      {info.etiqueta}
                    </span>
                  </div>
                </div>
              );
            }
          )}
        </div>
      </section>

      <section style={styles.analisisOxigenoGrid}>
        <div style={styles.panel}>
          <div style={styles.graficaCabecera}>
            <div>
              <div style={styles.graficaTituloFila}>
                <span style={{ fontSize: 22 }}>📈</span>
                <h2 style={styles.panelTitulo}>Evolución del oxígeno</h2>
              </div>
              <p style={styles.panelSubtitulo}>
                {piscinaSeleccionada?.nombre} · Ciclo{' '}
                {piscinaSeleccionada?.cicloActivo.numero} · Oxígeno disuelto
              </p>
            </div>

            <div style={styles.periodos}>
              {[
                ['hoy', 'Hoy'],
                ['7dias', '7 días'],
                ['30dias', '30 días'],
                ['todo', 'Todo'],
              ].map(([valor, etiqueta]) => (
                <button
                  key={valor}
                  type="button"
                  onClick={() =>
                    setPeriodoOxigeno(
                      valor as 'hoy' | '7dias' | '30dias' | 'todo'
                    )
                  }
                  style={{
                    ...styles.botonPeriodo,
                    ...(periodoOxigeno === valor
                      ? styles.botonPeriodoActivo
                      : {}),
                  }}
                >
                  {etiqueta}
                </button>
              ))}
            </div>
          </div>

          {datosOxigeno.length === 0 ? (
            <div style={styles.graficaVacia}>
              <Activity size={30} />
              <strong>No hay datos de oxígeno en este período</strong>
              <span>
                Registra una medición o cambia el período para visualizar la
                evolución.
              </span>
            </div>
          ) : (
            <>
              <div style={styles.resumenGrafica}>
                <div style={styles.resumenDato}>
                  <span>Último</span>
                  <strong>
                    {formato(datosOxigeno[datosOxigeno.length - 1].oxigeno)}{' '}
                    mg/L
                  </strong>
                  {(() => {
                    const estado = obtenerEstadoOxigeno(
                      datosOxigeno[datosOxigeno.length - 1].oxigeno
                    );
                    const info = datosEstadoOxigeno[estado];
                    return (
                      <small style={{ color: info.color, fontWeight: 800 }}>
                        {info.emoji} {info.etiqueta}
                      </small>
                    );
                  })()}
                </div>
                <div style={styles.resumenDato}>
                  <span>Promedio</span>
                  <strong>{formato(resumenOxigeno.promedio)} mg/L</strong>
                </div>
                <div style={styles.resumenDato}>
                  <span>Mínimo</span>
                  <strong>{formato(resumenOxigeno.minimo)} mg/L</strong>
                </div>
                <div style={styles.resumenDato}>
                  <span>Máximo</span>
                  <strong>{formato(resumenOxigeno.maximo)} mg/L</strong>
                </div>
              </div>

              <div style={styles.graficaContenedor}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={datosOxigeno}
                    margin={{ top: 10, right: 18, left: 0, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="momento"
                      tick={{ fontSize: 11 }}
                      minTickGap={22}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      width={42}
                      domain={[0, maximoGraficaOxigeno]}
                      label={{
                        value: 'mg/L',
                        angle: -90,
                        position: 'insideLeft',
                        style: { fontSize: 11, fill: '#71827f' },
                      }}
                    />

                    <ReferenceArea
                      y1={0}
                      y2={3.5}
                      fill="#f45b69"
                      fillOpacity={0.08}
                    />
                    <ReferenceArea
                      y1={3.5}
                      y2={5.6}
                      fill="#e5ad26"
                      fillOpacity={0.09}
                    />
                    <ReferenceArea
                      y1={5.6}
                      y2={maximoGraficaOxigeno}
                      fill="#39a979"
                      fillOpacity={0.07}
                    />

                    <ReferenceLine
                      y={3.5}
                      stroke="#cf5360"
                      strokeDasharray="5 5"
                      label={{
                        value: 'Crítico 3.5',
                        position: 'insideBottomRight',
                        fill: '#b94b56',
                        fontSize: 10,
                      }}
                    />
                    <ReferenceLine
                      y={5.6}
                      stroke="#3b9b74"
                      strokeDasharray="5 5"
                      label={{
                        value: 'Óptimo 5.6',
                        position: 'insideTopRight',
                        fill: '#2d8062',
                        fontSize: 10,
                      }}
                    />

                    <Tooltip
                      formatter={(value) => [
                        `${formato(Number(value))} mg/L`,
                        'Oxígeno',
                      ]}
                      labelFormatter={(label) => `Medición: ${label}`}
                    />
                    <Line
                      type="monotone"
                      dataKey="oxigeno"
                      name="Oxígeno"
                      stroke="#1e7669"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#ffffff', strokeWidth: 2 }}
                      activeDot={{ r: 6 }}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div style={styles.leyendaEstados}>
                <span>🔴 Crítico ≤ 3.5</span>
                <span>🟡 Atención 3.6–5.5</span>
                <span>🟢 Óptimo ≥ 5.6</span>
              </div>
            </>
          )}
        </div>

        <div style={styles.panel}>
          <div style={styles.graficaCabecera}>
            <div>
              <div style={styles.graficaTituloFila}>
                <span style={{ fontSize: 22 }}>🦐</span>
                <h2 style={styles.panelTitulo}>Comparativa entre piscinas</h2>
              </div>
              <p style={styles.panelSubtitulo}>
                Última medición de oxígeno de cada piscina activa
              </p>
            </div>
          </div>

          {comparativaOxigeno.length === 0 ? (
            <div style={styles.graficaVacia}>
              <Droplets size={30} />
              <strong>Aún no hay piscinas para comparar</strong>
              <span>
                Registra mediciones de oxígeno en varias piscinas activas.
              </span>
            </div>
          ) : (
            <>
              <div style={styles.comparativaAyuda}>
                Haz clic en una barra para abrir esa piscina.
              </div>

              <div style={styles.comparativaScroll}>
                <div
                  style={{
                    width: '100%',
                    height: Math.max(280, comparativaOxigeno.length * 38),
                  }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={comparativaOxigeno}
                      layout="vertical"
                      margin={{ top: 6, right: 26, left: 8, bottom: 6 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 11 }}
                        domain={[0, 'auto']}
                        unit=" mg/L"
                      />
                      <YAxis
                        type="category"
                        dataKey="piscina"
                        width={66}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip
                        formatter={(value) => [
                          `${formato(Number(value))} mg/L`,
                          'Oxígeno',
                        ]}
                        labelFormatter={(label) => `Piscina ${label}`}
                      />
                      <Bar
                        dataKey="oxigeno"
                        name="Oxígeno"
                        radius={[0, 7, 7, 0]}
                        cursor="pointer"
                        onClick={(dato: any) => {
                          const piscinaId =
                            dato?.piscinaId ?? dato?.payload?.piscinaId;
                          if (piscinaId) {
                            setPiscinaSeleccionadaId(Number(piscinaId));
                          }
                        }}
                      >
                        {comparativaOxigeno.map((item) => {
                          const estado = obtenerEstadoOxigeno(item.oxigeno);
                          return (
                            <Cell
                              key={`ox-${item.piscinaId}`}
                              fill={datosEstadoOxigeno[estado].color}
                            />
                          );
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div style={styles.listaEstadosPiscinas}>
                {comparativaOxigeno.map((item) => {
                  const estado = obtenerEstadoOxigeno(item.oxigeno);
                  const info = datosEstadoOxigeno[estado];
                  return (
                    <button
                      key={item.piscinaId}
                      type="button"
                      style={styles.filaEstadoPiscina}
                      onClick={() => setPiscinaSeleccionadaId(item.piscinaId)}
                    >
                      <strong>{item.piscina}</strong>
                      <span>{formato(item.oxigeno)} mg/L</span>
                      <span style={{ color: info.color, fontWeight: 800 }}>
                        {info.emoji} {info.etiqueta}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div style={styles.comparativaSeleccion}>
                Seleccionada:{' '}
                <strong>{piscinaSeleccionada?.nombre ?? '—'}</strong>
              </div>
            </>
          )}
        </div>
      </section>

      <section style={styles.panel}>
        <div style={styles.panelTituloFila}>
          <div>
            <h2 style={styles.panelTitulo}>Historial de mediciones</h2>
            <p style={styles.panelSubtitulo}>
              {registrosPiscina.length} registro
              {registrosPiscina.length === 1 ? '' : 's'} visible
              {registrosPiscina.length === 1 ? '' : 's'}
            </p>
          </div>

          {ultimoRegistro && (
            <div style={styles.ultimaLectura}>
              <Clock3 size={15} />
              Última: {fechaBonita(ultimoRegistro.fecha)} ·{' '}
              {ultimoRegistro.hora}
            </div>
          )}
        </div>

        <div style={styles.filtros}>
          <div style={styles.buscarWrap}>
            <Search size={17} style={{ opacity: 0.55 }} />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar fecha, hora u observación..."
              style={styles.inputSinBorde}
            />
          </div>

          <div style={styles.filtroFecha}>
            <span style={styles.filtroTexto}>Desde</span>
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              style={styles.inputFecha}
            />
          </div>

          <div style={styles.filtroFecha}>
            <span style={styles.filtroTexto}>Hasta</span>
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              style={styles.inputFecha}
            />
          </div>
        </div>

        {registrosPiscina.length === 0 ? (
          <div style={styles.vacio}>
            <Droplets size={34} />
            <h3 style={{ margin: '10px 0 4px' }}>Sin mediciones todavía</h3>
            <p style={styles.textoSuave}>
              Registra la primera lectura de calidad de agua para esta piscina.
            </p>
            <button
              type="button"
              style={styles.botonSecundario}
              onClick={abrirNuevo}
            >
              <Plus size={17} />
              Registrar medición
            </button>
          </div>
        ) : (
          <div style={styles.tablaScroll}>
            <table style={styles.tabla}>
              <thead>
                <tr>
                  <th style={styles.th}>Fecha / hora</th>
                  <th style={styles.th}>Oxígeno</th>
                  <th style={styles.th}>Saturación</th>
                  <th style={styles.th}>Temperatura</th>
                  <th style={styles.th}>Salinidad</th>
                  <th style={styles.th}>pH</th>
                  <th style={styles.th}>Observación</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {registrosPiscina.map((registro) => (
                  <tr key={registro.id}>
                    <td style={styles.td}>
                      <div style={{ fontWeight: 750 }}>
                        {fechaBonita(registro.fecha)}
                      </div>
                      <div style={styles.valorSecundario}>
                        {registro.hora} · Ciclo {registro.ciclo}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <Dato valor={formato(registro.oxigeno)} unidad="mg/L" />
                    </td>
                    <td style={styles.td}>
                      <Dato
                        valor={formato(registro.saturacion, 1)}
                        unidad="%"
                      />
                    </td>
                    <td style={styles.td}>
                      <Dato
                        valor={formato(registro.temperatura, 1)}
                        unidad="°C"
                      />
                    </td>
                    <td style={styles.td}>
                      <Dato
                        valor={formato(registro.salinidad, 1)}
                        unidad="ppt"
                      />
                    </td>
                    <td style={styles.td}>
                      <Dato valor={formato(registro.ph, 2)} unidad="" />
                    </td>
                    <td style={{ ...styles.td, maxWidth: 250 }}>
                      <span style={styles.observacionTabla}>
                        {registro.observacion || 'Sin observación'}
                      </span>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      <button
                        type="button"
                        title="Editar medición"
                        onClick={() => editar(registro)}
                        style={styles.botonEditar}
                      >
                        <Edit3 size={16} />
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div style={styles.nota}>
        <span style={{ fontSize: 20 }}>💡</span>
        <div>
          <b>Los registros quedan vinculados al ciclo.</b>
          <div style={styles.textoSuave}>
            Más adelante podremos comparar calidad de agua con pesos, biomasa,
            alimentación y resultados de cosecha en Reportes.
          </div>
        </div>
      </div>

      {vistaPreviaImportacion && (
        <div
          style={styles.overlay}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setVistaPreviaImportacion(null);
          }}
        >
          <div style={{ ...styles.modal, maxWidth: 820 }}>
            <div style={styles.modalHeader}>
              <div>
                <div style={styles.eyebrow}>IMPORTACIÓN MASIVA</div>
                <h2 style={{ ...styles.panelTitulo, marginTop: 4 }}>
                  📥 Vista previa del Excel
                </h2>
                <p style={styles.modalSub}>{vistaPreviaImportacion.archivo}</p>
              </div>
              <button
                type="button"
                aria-label="Cerrar"
                style={styles.cerrar}
                onClick={() => setVistaPreviaImportacion(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div style={styles.importResumenGrid}>
              <div style={styles.importResumenCard}>
                <CheckCircle2 size={20} />
                <div>
                  <strong>{vistaPreviaImportacion.registros.length}</strong>
                  <span>Listos para importar</span>
                </div>
              </div>
              <div style={styles.importResumenCard}>
                <AlertTriangle size={20} />
                <div>
                  <strong>{vistaPreviaImportacion.omitidos}</strong>
                  <span>Omitidos</span>
                </div>
              </div>
              <div style={styles.importResumenCard}>
                <FileSpreadsheet size={20} />
                <div>
                  <strong>{vistaPreviaImportacion.duplicados}</strong>
                  <span>Duplicados</span>
                </div>
              </div>
            </div>

            <div style={styles.importHojas}>
              <b>Hojas detectadas:</b>{' '}
              {vistaPreviaImportacion.hojasDetectadas.length
                ? vistaPreviaImportacion.hojasDetectadas.join(' · ')
                : 'ninguna'}
              {vistaPreviaImportacion.hojasOpcionalesAusentes.length > 0 && (
                <div style={styles.textoSuave}>
                  Opcionales no incluidas:{' '}
                  {vistaPreviaImportacion.hojasOpcionalesAusentes.join(' · ')} —
                  no es un error.
                </div>
              )}
            </div>

            {vistaPreviaImportacion.incidencias.length > 0 && (
              <div style={styles.importIncidencias}>
                {vistaPreviaImportacion.incidencias
                  .slice(0, 12)
                  .map((item, i) => (
                    <div
                      key={`${item.mensaje}-${i}`}
                      style={
                        item.tipo === 'error'
                          ? styles.importIncidenciaError
                          : styles.importIncidenciaAviso
                      }
                    >
                      {item.tipo === 'error' ? '❌' : '⚠️'} {item.mensaje}
                    </div>
                  ))}
                {vistaPreviaImportacion.incidencias.length > 12 && (
                  <div style={styles.textoSuave}>
                    + {vistaPreviaImportacion.incidencias.length - 12} avisos
                    adicionales.
                  </div>
                )}
              </div>
            )}

            {vistaPreviaImportacion.registros.length > 0 && (
              <div style={styles.importTablaWrap}>
                <table style={styles.tabla}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Piscina</th>
                      <th style={styles.th}>Ciclo</th>
                      <th style={styles.th}>Fecha / hora</th>
                      <th style={styles.th}>O₂</th>
                      <th style={styles.th}>Sat.</th>
                      <th style={styles.th}>Temp.</th>
                      <th style={styles.th}>Sal.</th>
                      <th style={styles.th}>pH</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vistaPreviaImportacion.registros.slice(0, 20).map((r) => (
                      <tr key={r.id}>
                        <td style={styles.td}>
                          <b>{r.piscinaNombre}</b>
                        </td>
                        <td style={styles.td}>{r.ciclo}</td>
                        <td style={styles.td}>
                          {fechaBonita(r.fecha)} · {r.hora}
                        </td>
                        <td style={styles.td}>{formato(r.oxigeno)} mg/L</td>
                        <td style={styles.td}>{formato(r.saturacion, 1)} %</td>
                        <td style={styles.td}>
                          {formato(r.temperatura, 1)} °C
                        </td>
                        <td style={styles.td}>{formato(r.salinidad, 1)}</td>
                        <td style={styles.td}>{formato(r.ph, 2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {vistaPreviaImportacion.registros.length > 20 && (
                  <div style={styles.importMasRegistros}>
                    Mostrando 20 de {vistaPreviaImportacion.registros.length}{' '}
                    registros listos.
                  </div>
                )}
              </div>
            )}

            <div style={styles.importReglaSeguridad}>
              🔒 AquaPro solo asigna datos a piscinas con <b>ciclo activo</b>.
              Si la fecha es anterior al inicio del ciclo activo, el dato se
              omite y <b>no se envía a un ciclo anterior</b>.
            </div>
            <div style={styles.modalAcciones}>
              <button
                type="button"
                style={styles.botonCancelar}
                onClick={() => setVistaPreviaImportacion(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                style={{
                  ...styles.botonPrincipal,
                  opacity: vistaPreviaImportacion.registros.length ? 1 : 0.5,
                }}
                disabled={!vistaPreviaImportacion.registros.length}
                onClick={confirmarImportacion}
              >
                <CheckCircle2 size={17} />
                Importar {vistaPreviaImportacion.registros.length} registros
              </button>
            </div>
          </div>
        </div>
      )}

      {modalAbierto && (
        <div
          style={styles.overlay}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setModalAbierto(false);
              limpiarFormulario();
            }
          }}
        >
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <div>
                <div style={styles.eyebrow}>
                  {editandoId ? 'EDITAR REGISTRO' : 'NUEVA MEDICIÓN'}
                </div>
                <h2 style={{ ...styles.panelTitulo, marginTop: 4 }}>
                  💧 Calidad de agua
                </h2>
                {piscinaSeleccionada && (
                  <p style={styles.modalSub}>
                    {piscinaSeleccionada.nombre} · Ciclo{' '}
                    {piscinaSeleccionada.cicloActivo.numero}
                  </p>
                )}
              </div>

              <button
                type="button"
                aria-label="Cerrar"
                style={styles.cerrar}
                onClick={() => {
                  setModalAbierto(false);
                  limpiarFormulario();
                }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={guardar}>
              <div style={styles.fechaHoraGrid}>
                <Campo label="Fecha">
                  <input
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    style={styles.input}
                    required
                  />
                </Campo>
                <Campo label="Hora">
                  <input
                    type="time"
                    value={hora}
                    onChange={(e) => setHora(e.target.value)}
                    style={styles.input}
                    required
                  />
                </Campo>
              </div>

              <div style={styles.parametrosGrid}>
                <Parametro
                  emoji="💨"
                  titulo="Oxígeno"
                  unidad="mg/L"
                  valor={oxigeno}
                  setValor={setOxigeno}
                  placeholder="Ej. 5.20"
                />
                <Parametro
                  emoji="📊"
                  titulo="Saturación"
                  unidad="%"
                  valor={saturacion}
                  setValor={setSaturacion}
                  placeholder="Ej. 92"
                />
                <Parametro
                  emoji="🌡️"
                  titulo="Temperatura"
                  unidad="°C"
                  valor={temperatura}
                  setValor={setTemperatura}
                  placeholder="Ej. 29.5"
                />
                <Parametro
                  emoji="🌊"
                  titulo="Salinidad"
                  unidad="ppt"
                  valor={salinidad}
                  setValor={setSalinidad}
                  placeholder="Ej. 18"
                  requerido={false}
                />
                <Parametro
                  emoji="🧪"
                  titulo="pH"
                  unidad=""
                  valor={ph}
                  setValor={setPh}
                  placeholder="Ej. 8.10"
                  requerido={false}
                />
              </div>

              <Campo label="Observación (opcional)">
                <textarea
                  value={observacion}
                  onChange={(e) => setObservacion(e.target.value)}
                  placeholder="Ej. Lluvia durante la madrugada, agua turbia, aireadores encendidos..."
                  style={styles.textarea}
                  rows={3}
                />
              </Campo>

              {error && <div style={styles.error}>{error}</div>}

              <div style={styles.modalAcciones}>
                <button
                  type="button"
                  style={styles.botonCancelar}
                  onClick={() => {
                    setModalAbierto(false);
                    limpiarFormulario();
                  }}
                >
                  Cancelar
                </button>
                <button type="submit" style={styles.botonPrincipal}>
                  {editandoId ? <Edit3 size={17} /> : <Plus size={17} />}
                  {editandoId ? 'Guardar cambios' : 'Guardar medición'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Tarjeta({
  icono,
  etiqueta,
  valor,
  detalle,
}: {
  icono: React.ReactNode;
  etiqueta: string;
  valor: string;
  detalle: string;
}) {
  return (
    <div style={styles.tarjeta}>
      <div style={styles.tarjetaIcono}>{icono}</div>
      <div style={styles.tarjetaEtiqueta}>{etiqueta}</div>
      <div style={styles.tarjetaValor}>{valor}</div>
      <div style={styles.valorSecundario}>{detalle}</div>
    </div>
  );
}

function Dato({ valor, unidad }: { valor: string; unidad: string }) {
  return (
    <div>
      <span style={{ fontWeight: 800 }}>{valor}</span>
      {unidad && <span style={styles.unidadTabla}> {unidad}</span>}
    </div>
  );
}

function Campo({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label style={styles.campo}>
      <span style={styles.label}>{label}</span>
      {children}
    </label>
  );
}

function Parametro({
  emoji,
  titulo,
  unidad,
  valor,
  setValor,
  placeholder,
  requerido = true,
}: {
  emoji: string;
  titulo: string;
  unidad: string;
  valor: string;
  setValor: (valor: string) => void;
  placeholder: string;
  requerido?: boolean;
}) {
  return (
    <label style={styles.parametroCard}>
      <div style={styles.parametroCabecera}>
        <span style={{ fontSize: 21 }}>{emoji}</span>
        <div>
          <div style={styles.parametroTitulo}>{titulo}</div>
          <div style={styles.parametroUnidad}>{unidad || 'escala 0–14'}</div>
        </div>
      </div>
      <input
        type="number"
        min="0"
        step="any"
        inputMode="decimal"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        placeholder={placeholder}
        style={styles.inputParametro}
        required={requerido}
      />
    </label>
  );
}

const styles: Record<string, React.CSSProperties> = {
  pagina: {
    minHeight: '100%',
    background: '#f7faf9',
    padding: '28px',
    color: '#16312d',
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  encabezado: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 18,
    flexWrap: 'wrap',
    marginBottom: 22,
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: '0.12em',
    fontWeight: 800,
    color: '#6b8580',
  },
  titulo: {
    margin: '5px 0 3px',
    fontSize: 29,
    lineHeight: 1.15,
    color: '#173b35',
  },
  subtitulo: {
    margin: 0,
    color: '#71827f',
    fontSize: 14,
  },
  accionesEncabezado: {
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    flexWrap: 'wrap',
  },
  botonImportar: {
    border: '1px solid #cfe0dc',
    borderRadius: 12,
    padding: '10px 15px',
    minHeight: 42,
    background: '#ffffff',
    color: '#1e7669',
    fontWeight: 800,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    boxSizing: 'border-box',
  },
  importResumenGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: 10,
    marginBottom: 14,
  },
  importResumenCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 14px',
    borderRadius: 12,
    background: '#f7faf9',
    border: '1px solid #e2ece9',
    color: '#315a52',
  },
  importHojas: {
    padding: '11px 12px',
    borderRadius: 10,
    background: '#f7faf9',
    border: '1px solid #e2ece9',
    color: '#4b6862',
    fontSize: 12,
    lineHeight: 1.55,
    marginBottom: 12,
  },
  importIncidencias: {
    maxHeight: 170,
    overflowY: 'auto',
    display: 'grid',
    gap: 7,
    marginBottom: 12,
  },
  importIncidenciaAviso: {
    padding: '9px 11px',
    borderRadius: 9,
    background: '#fff9e8',
    border: '1px solid #f2dfaa',
    color: '#84600d',
    fontSize: 12,
  },
  importIncidenciaError: {
    padding: '9px 11px',
    borderRadius: 9,
    background: '#fff1f2',
    border: '1px solid #efc9ce',
    color: '#a84550',
    fontSize: 12,
    fontWeight: 700,
  },
  importTablaWrap: {
    maxHeight: 330,
    overflow: 'auto',
    border: '1px solid #e2ece9',
    borderRadius: 12,
    marginBottom: 12,
  },
  importMasRegistros: {
    padding: '9px 12px',
    background: '#fbfdfc',
    color: '#71827f',
    fontSize: 11,
    borderTop: '1px solid #e2ece9',
  },
  importReglaSeguridad: {
    padding: '10px 12px',
    borderRadius: 10,
    background: '#eef7f5',
    border: '1px solid #cfe4df',
    color: '#38665d',
    fontSize: 12,
    lineHeight: 1.5,
  },
  botonPrincipal: {
    border: 0,
    borderRadius: 12,
    padding: '11px 16px',
    minHeight: 42,
    background: '#1e7669',
    color: '#fff',
    fontWeight: 800,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    boxShadow: '0 5px 16px rgba(30,118,105,.18)',
  },
  panelPiscina: {
    background: '#fff',
    border: '1px solid #e2ece9',
    borderRadius: 16,
    padding: 18,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'end',
    gap: 18,
    flexWrap: 'wrap',
    marginBottom: 18,
  },
  selectorGrupo: {
    minWidth: 250,
    flex: '1 1 300px',
  },
  label: {
    display: 'block',
    fontSize: 12,
    fontWeight: 800,
    color: '#536d68',
    marginBottom: 7,
  },
  select: {
    width: '100%',
    minHeight: 43,
    borderRadius: 10,
    border: '1px solid #d8e5e1',
    background: '#fbfdfc',
    color: '#193a35',
    padding: '0 12px',
    fontSize: 14,
    outline: 'none',
  },
  datosPiscina: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
    fontSize: 13,
    color: '#4f6863',
  },
  chipActivo: {
    background: '#edf8f4',
    color: '#267462',
    borderRadius: 999,
    padding: '6px 9px',
    fontWeight: 800,
    fontSize: 12,
  },
  tarjetasGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))',
    gap: 12,
    marginBottom: 18,
  },
  tarjeta: {
    background: '#fff',
    border: '1px solid #e2ece9',
    borderRadius: 15,
    padding: 16,
    minWidth: 0,
  },
  tarjetaIcono: {
    width: 36,
    height: 36,
    borderRadius: 10,
    display: 'grid',
    placeItems: 'center',
    background: '#eef5f3',
    color: '#426d65',
    marginBottom: 12,
  },
  tarjetaEtiqueta: {
    fontSize: 12,
    color: '#71827f',
    fontWeight: 750,
    marginBottom: 4,
  },
  tarjetaValor: {
    fontSize: 22,
    fontWeight: 850,
    color: '#173b35',
    lineHeight: 1.15,
    marginBottom: 5,
  },
  valorSecundario: {
    fontSize: 12,
    color: '#84948f',
  },
  estadoOxigenoResumen: {
    background: '#fff',
    border: '1px solid #e2ece9',
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
    boxShadow: '0 5px 18px rgba(30, 71, 62, .04)',
  },
  estadoResumenTitulo: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    flexWrap: 'wrap',
    marginBottom: 13,
  },
  rangosLeyenda: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
    fontSize: 11,
    color: '#687d78',
    fontWeight: 750,
  },
  estadoResumenGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(120px, 1fr))',
    gap: 10,
  },
  estadoResumenCard: {
    border: '1px solid',
    borderRadius: 13,
    padding: '12px 14px',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  estadoResumenEmoji: {
    fontSize: 22,
  },
  estadoResumenNumero: {
    display: 'block',
    fontSize: 22,
    lineHeight: 1,
  },
  estadoResumenLabel: {
    display: 'block',
    marginTop: 4,
    fontSize: 11,
    fontWeight: 800,
    color: '#687d78',
  },
  leyendaEstados: {
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap',
    padding: '0 18px 14px',
    color: '#667c77',
    fontSize: 11,
    fontWeight: 750,
  },
  listaEstadosPiscinas: {
    maxHeight: 160,
    overflowY: 'auto',
    borderTop: '1px solid #edf2f0',
  },
  filaEstadoPiscina: {
    width: '100%',
    border: 0,
    borderBottom: '1px solid #edf2f0',
    background: '#fff',
    padding: '8px 14px',
    display: 'grid',
    gridTemplateColumns: '1fr auto auto',
    alignItems: 'center',
    gap: 10,
    color: '#38514c',
    cursor: 'pointer',
    textAlign: 'left',
    fontSize: 11,
  },
  analisisOxigenoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))',
    gap: 18,
    alignItems: 'stretch',
    marginBottom: 18,
  },
  graficaCabecera: {
    padding: '18px 20px 14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    flexWrap: 'wrap',
  },
  graficaTituloFila: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  periodos: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap',
    padding: 4,
    background: '#f3f7f6',
    borderRadius: 11,
  },
  botonPeriodo: {
    border: 0,
    background: 'transparent',
    color: '#647a75',
    minHeight: 34,
    padding: '6px 10px',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 750,
  },
  botonPeriodoActivo: {
    background: '#ffffff',
    color: '#1e7669',
    boxShadow: '0 1px 4px rgba(24, 62, 54, .10)',
  },
  resumenGrafica: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
    gap: 1,
    borderTop: '1px solid #edf2f0',
    borderBottom: '1px solid #edf2f0',
    background: '#edf2f0',
  },
  resumenDato: {
    background: '#fbfcfc',
    padding: '11px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    minWidth: 0,
  },
  graficaContenedor: {
    width: '100%',
    height: 310,
    padding: '18px 14px 10px 4px',
    boxSizing: 'border-box',
  },
  comparativaAyuda: {
    padding: '0 20px 10px',
    color: '#7d8f8a',
    fontSize: 12,
  },
  comparativaScroll: {
    height: 310,
    overflowY: 'auto',
    overflowX: 'hidden',
    padding: '2px 8px 6px 0',
    borderTop: '1px solid #edf2f0',
  },
  comparativaSeleccion: {
    padding: '10px 16px',
    borderTop: '1px solid #edf2f0',
    background: '#fbfcfc',
    color: '#71827f',
    fontSize: 12,
  },
  graficaVacia: {
    minHeight: 220,
    padding: 24,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    color: '#758a84',
    borderTop: '1px solid #edf2f0',
    textAlign: 'center',
    fontSize: 13,
  },
  panel: {
    background: '#fff',
    border: '1px solid #e2ece9',
    borderRadius: 16,
    overflow: 'hidden',
  },
  panelTituloFila: {
    padding: '18px 20px 13px',
    display: 'flex',
    justifyContent: 'space-between',
    gap: 14,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  panelTitulo: {
    margin: 0,
    fontSize: 18,
    color: '#193a35',
  },
  panelSubtitulo: {
    margin: '4px 0 0',
    color: '#879792',
    fontSize: 12,
  },
  ultimaLectura: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12,
    color: '#56706a',
    background: '#f4f8f7',
    borderRadius: 9,
    padding: '7px 10px',
  },
  filtros: {
    borderTop: '1px solid #edf2f0',
    borderBottom: '1px solid #edf2f0',
    padding: '12px 20px',
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
    alignItems: 'center',
    background: '#fbfcfc',
  },
  buscarWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: '#fff',
    border: '1px solid #dce7e4',
    borderRadius: 10,
    padding: '0 10px',
    minHeight: 39,
    flex: '1 1 260px',
  },
  inputSinBorde: {
    width: '100%',
    border: 0,
    outline: 0,
    fontSize: 13,
    background: 'transparent',
    color: '#193a35',
  },
  filtroFecha: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    border: '1px solid #dce7e4',
    borderRadius: 10,
    background: '#fff',
    padding: '0 9px',
    minHeight: 39,
  },
  filtroTexto: {
    fontSize: 11,
    color: '#7a8d88',
    fontWeight: 700,
  },
  inputFecha: {
    border: 0,
    outline: 0,
    color: '#36524c',
    background: 'transparent',
    fontSize: 12,
  },
  tablaScroll: {
    overflowX: 'auto',
  },
  tabla: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: 930,
  },
  th: {
    textAlign: 'left',
    padding: '11px 14px',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '.04em',
    color: '#728680',
    background: '#f8faf9',
    borderBottom: '1px solid #e8efed',
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '13px 14px',
    borderBottom: '1px solid #edf2f0',
    fontSize: 13,
    color: '#314d47',
    verticalAlign: 'middle',
  },
  unidadTabla: {
    color: '#81928d',
    fontSize: 11,
  },
  observacionTabla: {
    display: 'inline-block',
    color: '#687d78',
    lineHeight: 1.35,
  },
  botonEditar: {
    border: '1px solid #d8e5e1',
    background: '#fff',
    color: '#315f56',
    borderRadius: 9,
    minHeight: 34,
    padding: '6px 9px',
    cursor: 'pointer',
    fontWeight: 750,
    fontSize: 12,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  },
  vacio: {
    padding: '42px 20px',
    textAlign: 'center',
    color: '#668079',
  },
  vacioGrande: {
    marginTop: 20,
    padding: '58px 24px',
    textAlign: 'center',
    background: '#fff',
    border: '1px solid #e2ece9',
    borderRadius: 18,
    color: '#58736d',
  },
  textoSuave: {
    color: '#84948f',
    fontSize: 13,
    margin: 0,
    lineHeight: 1.5,
  },
  botonSecundario: {
    marginTop: 15,
    border: '1px solid #cfe1dc',
    background: '#f6fbf9',
    color: '#28695e',
    borderRadius: 10,
    minHeight: 40,
    padding: '8px 13px',
    cursor: 'pointer',
    fontWeight: 800,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
  },
  nota: {
    marginTop: 14,
    display: 'flex',
    gap: 10,
    alignItems: 'flex-start',
    background: '#fffdf5',
    border: '1px solid #eee7cb',
    borderRadius: 13,
    padding: '13px 15px',
    fontSize: 13,
    color: '#5b5b45',
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(13, 35, 31, .44)',
    display: 'grid',
    placeItems: 'center',
    padding: 18,
    zIndex: 1000,
    overflowY: 'auto',
  },
  modal: {
    width: 'min(760px, 100%)',
    maxHeight: 'calc(100vh - 36px)',
    overflowY: 'auto',
    background: '#fff',
    borderRadius: 19,
    boxShadow: '0 24px 70px rgba(0,0,0,.22)',
    padding: 22,
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 17,
  },
  modalSub: {
    margin: '4px 0 0',
    color: '#768983',
    fontSize: 13,
  },
  cerrar: {
    width: 38,
    height: 38,
    border: 0,
    borderRadius: 10,
    background: '#f2f6f5',
    color: '#49635e',
    cursor: 'pointer',
    display: 'grid',
    placeItems: 'center',
  },
  fechaHoraGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 12,
    marginBottom: 15,
  },
  campo: {
    display: 'block',
    minWidth: 0,
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    minHeight: 42,
    border: '1px solid #d8e5e1',
    borderRadius: 10,
    padding: '0 11px',
    outline: 'none',
    fontSize: 14,
    color: '#24463f',
    background: '#fbfdfc',
  },
  parametrosGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 11,
    marginBottom: 15,
  },
  parametroCard: {
    display: 'block',
    border: '1px solid #e0eae7',
    borderRadius: 13,
    padding: 12,
    background: '#fbfdfc',
  },
  parametroCabecera: {
    display: 'flex',
    gap: 9,
    alignItems: 'center',
    marginBottom: 10,
  },
  parametroTitulo: {
    fontSize: 13,
    fontWeight: 850,
    color: '#274940',
  },
  parametroUnidad: {
    fontSize: 10,
    color: '#899994',
    marginTop: 1,
  },
  inputParametro: {
    width: '100%',
    boxSizing: 'border-box',
    minHeight: 40,
    border: '1px solid #d5e2de',
    borderRadius: 9,
    padding: '0 10px',
    background: '#fff',
    color: '#193a35',
    fontSize: 15,
    fontWeight: 750,
    outline: 'none',
  },
  textarea: {
    width: '100%',
    boxSizing: 'border-box',
    border: '1px solid #d8e5e1',
    borderRadius: 10,
    padding: 11,
    outline: 'none',
    resize: 'vertical',
    minHeight: 78,
    fontFamily: 'inherit',
    fontSize: 13,
    color: '#24463f',
    background: '#fbfdfc',
  },
  error: {
    marginTop: 12,
    padding: '10px 12px',
    borderRadius: 10,
    background: '#fff2f2',
    border: '1px solid #f2cccc',
    color: '#a04646',
    fontSize: 12,
    fontWeight: 700,
  },
  modalAcciones: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 9,
    flexWrap: 'wrap',
    marginTop: 18,
    paddingTop: 15,
    borderTop: '1px solid #edf2f0',
  },
  botonCancelar: {
    border: '1px solid #d9e4e1',
    background: '#fff',
    color: '#526a65',
    borderRadius: 11,
    minHeight: 42,
    padding: '9px 14px',
    cursor: 'pointer',
    fontWeight: 800,
  },
};
