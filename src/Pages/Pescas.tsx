import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import {
  
  Plus,
  Search,
  Trash2,
  Pencil,
  Eye,
  Lock,
  X,
  Moon,
  Store,
  Waves,
} from 'lucide-react';

import {
  useAquaProStore,
  obtenerCicloActivo,
  obtenerCiclosPiscina,
  cerrarCicloPorLiquidacion,
} from '../store/aquaProStore';

type TipoSalida = 'Raleo' | 'Pesca' | 'Venta local';

const PESCAS_STORAGE_KEY = 'aquapro-pescas-v2';

type EstadoRegistro = 'Finalizado' | 'En proceso' | 'Programada';

type NochePesca = {
  id: number;
  numero: number;
  fecha: string;
  libras: number;
  pesoInicial?: number;
  pesoFinal?: number;
  empacadora?: string; // Compatibilidad con registros anteriores
  destinoProduccion?: string;
};

type RegistroPesca = {
  id: number;
  piscina: string;
  piscinaId?: number;
  cicloId?: number;
  cicloActual: number;
  tipo: TipoSalida;
  fecha: string;
  libras: number;
  estado: EstadoRegistro;

  pesoInicial?: number;
  pesoFinal?: number;
  empacadora?: string; // Compatibilidad con registros anteriores
  destinoProduccion?: string;
  pesoVentaLocal?: number;

  comprador?: string;
  precioLibra?: number;
  observacion?: string;
  noches?: NochePesca[];

  // Esta marca indica que el ciclo productivo ya fue cerrado.
  cosechaCerrada?: boolean;
  fechaCierreCosecha?: string;
};

/* =========================================================
   DATOS DE PRUEBA
========================================================= */

const datosIniciales: RegistroPesca[] = [];

export default function Pescas() {
  const { piscinas } = useAquaProStore();

  /*
    Solo aparecen para NUEVOS registros las piscinas que
    realmente tienen un ciclo activo y una siembra activa.
  */
  const piscinasDisponibles = useMemo(
    () =>
      piscinas
        .map((piscina) => {
          const ciclo = obtenerCicloActivo(piscina.id);

          if (!ciclo?.siembra) return null;

          return {
            id: piscina.id,
            nombre: piscina.nombre,
            cicloId: ciclo.id,
            cicloActual: ciclo.numero,
            estado: piscina.estado,
          };
        })
        .filter(
  (piscina): piscina is NonNullable<typeof piscina> =>
    piscina !== null
),
[piscinas]
);

  const [registros, setRegistros] = useState<RegistroPesca[]>(() => {
    try {
      const guardado = localStorage.getItem(PESCAS_STORAGE_KEY);

      if (guardado) {
        const parseado = JSON.parse(guardado);

        if (Array.isArray(parseado)) {
          return parseado;
        }
      }
    } catch (error) {
      console.error('No se pudieron cargar las pescas guardadas:', error);
    }

    return datosIniciales;
  });

  useEffect(() => {
    try {
      localStorage.setItem(PESCAS_STORAGE_KEY, JSON.stringify(registros));
    } catch (error) {
      console.error('No se pudieron guardar las pescas:', error);
    }
  }, [registros]);

  /* =======================================================
     FILTROS
  ======================================================= */

  const [busqueda, setBusqueda] = useState('');

  const [filtroTipo, setFiltroTipo] = useState('Todos');

  const [filtroPiscina, setFiltroPiscina] = useState('Todas');

  const [filtroCiclo, setFiltroCiclo] = useState('Todos');

  const [filtroFechaDesde, setFiltroFechaDesde] = useState('');

  const [filtroFechaHasta, setFiltroFechaHasta] = useState('');

  /* =======================================================
     MODAL
  ======================================================= */

  const [modalAbierto, setModalAbierto] = useState(false);

  // Confirmación previa al guardado de un movimiento válido.
  const [mostrarConfirmacionGuardado, setMostrarConfirmacionGuardado] = useState(false);

  const [registroEditando, setRegistroEditando] =
    useState<RegistroPesca | null>(null);

  const [detalleCiclo, setDetalleCiclo] = useState<{
    piscina: string;
    piscinaId?: number;
    cicloActual: number;
  } | null>(null);

  const [contextoMovimiento, setContextoMovimiento] = useState<{
    piscina: string;
    piscinaId?: number;
    cicloId?: number;
    cicloActual: number;
  } | null>(null);

  // Solo se elimina el movimiento seleccionado desde el historial productivo.
  const [movimientoPendienteEliminar, setMovimientoPendienteEliminar] =
    useState<RegistroPesca | null>(null);

  /* =======================================================
     FORMULARIO
  ======================================================= */

  const [tipo, setTipo] = useState<TipoSalida>('Raleo');

  const [piscina, setPiscina] = useState('');

  const [fecha, setFecha] = useState('');

  const [libras, setLibras] = useState('');

  const [pesoInicial, setPesoInicial] = useState('');

  const [pesoFinal, setPesoFinal] = useState('');
  const [destinoProduccion, setDestinoProduccion] = useState('');

  const [pesoVentaLocal, setPesoVentaLocal] = useState('');

  const [comprador, setComprador] = useState('');

  const [precioLibra, setPrecioLibra] = useState('');

  const [observacion, setObservacion] = useState('');

  const [noches, setNoches] = useState<NochePesca[]>([]);

  const [pescaFinalizada, setPescaFinalizada] = useState(false);

  // Mensajes de validación visibles debajo del campo, sin alertas del navegador.
  const [erroresFormulario, setErroresFormulario] = useState<Record<string, string>>({});

  function limpiarError(campo: string) {
    setErroresFormulario((anteriores) => {
      if (!anteriores[campo]) return anteriores;
      const siguientes = { ...anteriores };
      delete siguientes[campo];
      return siguientes;
    });
  }

  /* =======================================================
     CICLO AUTOMÁTICO
  ======================================================= */

  const piscinaSeleccionada = piscinasDisponibles.find(
    (p) => p.nombre === piscina
  );

  const cicloActual =
    contextoMovimiento?.cicloActual ??
    piscinaSeleccionada?.cicloActual ??
    registroEditando?.cicloActual ??
    null;

  const cicloId =
    contextoMovimiento?.cicloId ?? piscinaSeleccionada?.cicloId ?? null;

  const piscinaId =
    contextoMovimiento?.piscinaId ?? piscinaSeleccionada?.id ?? null;

  // Incluye piscinas con ciclos anteriores, aunque ya no tengan siembra activa.
  const nombresPiscinasFiltro = useMemo(
    () =>
      Array.from(new Set([
        ...piscinas.map((item) => item.nombre),
        ...registros.map((registro) => registro.piscina),
      ])).sort((a, b) => a.localeCompare(b, 'es', { numeric: true })),
    [piscinas, registros]
  );

  // Los ciclos se toman del historial de pescas, no solamente del ciclo activo.
  const ciclosDisponiblesFiltro = useMemo(
    () =>
      filtroPiscina === 'Todas'
        ? []
        : Array.from(
            new Set(
              registros
                .filter((registro) => registro.piscina === filtroPiscina)
                .map((registro) => registro.cicloActual)
            )
          ).sort((a, b) => b - a),
    [filtroPiscina, registros]
  );

  /* =======================================================
     FILTRAR REGISTROS
  ======================================================= */

  const registrosFiltrados = useMemo(() => {
    return registros.filter((registro) => {
      const textoBusqueda = busqueda.trim().toLowerCase();

      const coincideBusqueda =
        registro.piscina.toLowerCase().includes(textoBusqueda) ||
        `ciclo ${registro.cicloActual}`.toLowerCase().includes(textoBusqueda);

      const coincideTipo =
        filtroTipo === 'Todos' || registro.tipo === filtroTipo;

      const coincidePiscina =
        filtroPiscina === 'Todas' || registro.piscina === filtroPiscina;

      const coincideCiclo =
        filtroCiclo === 'Todos' || registro.cicloActual === Number(filtroCiclo);

      const fechasRegistro =
        registro.tipo === 'Pesca' &&
        registro.noches &&
        registro.noches.length > 0
          ? registro.noches.map((noche) => noche.fecha).filter(Boolean)
          : [registro.fecha].filter(Boolean);

      const coincideFecha =
        (!filtroFechaDesde && !filtroFechaHasta) ||
        fechasRegistro.some(
          (fechaRegistro) =>
            (!filtroFechaDesde || fechaRegistro >= filtroFechaDesde) &&
            (!filtroFechaHasta || fechaRegistro <= filtroFechaHasta)
        );

      return (
        coincideBusqueda && coincideTipo && coincidePiscina && coincideCiclo && coincideFecha
      );
    });
  }, [
    registros,
    busqueda,
    filtroTipo,
    filtroPiscina,
    filtroCiclo,
    filtroFechaDesde,
    filtroFechaHasta,
  ]);


  const ciclosFiltrados = useMemo(() => {
    const clavesVisibles = new Set(
      registrosFiltrados.map(
        (registro) => `${registro.piscina}__${registro.cicloActual}`
      )
    );

    const grupos = new Map<
      string,
      {
        piscina: string;
        piscinaId?: number;
        cicloActual: number;
        registros: RegistroPesca[];
      }
    >();

    registros.forEach((registro) => {
      const clave = `${registro.piscina}__${registro.cicloActual}`;

      if (!clavesVisibles.has(clave)) return;

      const existente = grupos.get(clave);

      if (existente) {
        existente.registros.push(registro);
      } else {
        grupos.set(clave, {
          piscina: registro.piscina,
          piscinaId: registro.piscinaId,
          cicloActual: registro.cicloActual,
          registros: [registro],
        });
      }
    });

    return Array.from(grupos.values())
      .map((grupo) => {
        const ordenados = [...grupo.registros].sort((a, b) => {
          const fechaA =
            a.tipo === 'Pesca' && a.noches && a.noches.length > 0
              ? [...a.noches]
                  .filter((noche) => noche.fecha)
                  .sort((x, y) => x.fecha.localeCompare(y.fecha))[0]?.fecha ||
                a.fecha
              : a.fecha;

          const fechaB =
            b.tipo === 'Pesca' && b.noches && b.noches.length > 0
              ? [...b.noches]
                  .filter((noche) => noche.fecha)
                  .sort((x, y) => x.fecha.localeCompare(y.fecha))[0]?.fecha ||
                b.fecha
              : b.fecha;

          const cmp = fechaA.localeCompare(fechaB);
          return cmp !== 0 ? cmp : a.id - b.id;
        });

        const pescaFinal = [...ordenados]
          .reverse()
          .find(
            (registro) =>
              registro.tipo === 'Pesca' && registro.estado === 'Finalizado'
          );

        return {
          ...grupo,
          registros: ordenados,
          primeraFecha: ordenados[0]?.fecha || '',
          ultimaFecha: ordenados.at(-1)?.fecha || '',
          totalLibras: ordenados.reduce(
            (total, registro) => total + registro.libras,
            0
          ),
          pescaFinal,
          cicloCerrado: ordenados.some((registro) => registro.cosechaCerrada),
        };
      })
      .sort((a, b) => b.ultimaFecha.localeCompare(a.ultimaFecha));
  }, [registros, registrosFiltrados]);

  const piscinasSinRegistro = useMemo(
    () =>
      piscinasDisponibles.filter(
        (piscinaDisponible) =>
          !registros.some(
            (registro) =>
              registro.piscina === piscinaDisponible.nombre &&
              registro.cicloActual === piscinaDisponible.cicloActual
          )
      ),
    [piscinasDisponibles, registros]
  );

  /* =======================================================
     TOTALES
  ======================================================= */

  const totalRaleos = registrosFiltrados
    .filter((registro) => registro.tipo === 'Raleo')
    .reduce((total, registro) => total + registro.libras, 0);

  const totalPescas = registrosFiltrados
    .filter((registro) => registro.tipo === 'Pesca')
    .reduce((total, registro) => total + registro.libras, 0);

  const totalVentaLocal = registrosFiltrados
    .filter((registro) => registro.tipo === 'Venta local')
    .reduce((total, registro) => total + registro.libras, 0);

  const produccionTotal = totalRaleos + totalPescas + totalVentaLocal;

  /* =======================================================
     NUEVO REGISTRO
  ======================================================= */

  function abrirNuevoRegistro() {
    if (piscinasSinRegistro.length === 0) {
      alert(
        'Las piscinas con ciclo activo ya tienen un registro de movimientos. Entra en 👁 Detalle y usa “Agregar movimiento”.'
      );
      return;
    }

    limpiarFormulario();
    setContextoMovimiento(null);
    setModalAbierto(true);
  }

  function limpiarFormulario() {
    setErroresFormulario({});
    setRegistroEditando(null);

    setTipo('Raleo');

    setPiscina('');

    setFecha('');

    setLibras('');

    setPesoInicial('');

    setPesoFinal('');
    setDestinoProduccion('');

    setPesoVentaLocal('');

    setComprador('');

    setPrecioLibra('');

    setObservacion('');

    setNoches([]);

    setPescaFinalizada(false);
  }

  function cerrarModal() {
    setMostrarConfirmacionGuardado(false);
    setModalAbierto(false);
    setContextoMovimiento(null);
    limpiarFormulario();
  }

  /* =======================================================
     NOCHES DE PESCA
  ======================================================= */

  function obtenerNumeroInicialNochesPesca() {
    if (!piscina || cicloActual === null) return 1;

    const pescasPrevias = registros
      .filter(
        (registro) =>
          registro.tipo === 'Pesca' &&
          registro.piscina === piscina &&
          registro.cicloActual === cicloActual &&
          registro.id !== registroEditando?.id
      )
      .flatMap((registro) =>
        (registro.noches ?? []).map((noche) => ({
          registroId: registro.id,
          noche,
        }))
      )
      .sort((a, b) => {
        const fechaComparacion = a.noche.fecha.localeCompare(b.noche.fecha);

        if (fechaComparacion !== 0) return fechaComparacion;

        const registroComparacion = a.registroId - b.registroId;

        if (registroComparacion !== 0) return registroComparacion;

        return a.noche.id - b.noche.id;
      });

    if (!registroEditando || registroEditando.tipo !== 'Pesca') {
      return pescasPrevias.length + 1;
    }

    const primeraFechaActual =
      registroEditando.noches && registroEditando.noches.length > 0
        ? [...registroEditando.noches]
            .filter((noche) => noche.fecha)
            .sort((a, b) => a.fecha.localeCompare(b.fecha))[0]?.fecha ||
          registroEditando.fecha
        : registroEditando.fecha;

    const anteriores = pescasPrevias.filter(({ registroId, noche }) => {
      if (!noche.fecha) return false;

      if (noche.fecha < primeraFechaActual) return true;

      if (noche.fecha > primeraFechaActual) return false;

      return registroId < registroEditando.id;
    });

    return anteriores.length + 1;
  }

  function agregarNoche() {
    limpiarError('fecha');
    const numeroInicial = obtenerNumeroInicialNochesPesca();

    const nuevaNoche: NochePesca = {
      id: Date.now(),
      numero: numeroInicial + noches.length,
      fecha: '',
      libras: 0,
      pesoInicial: undefined,
      pesoFinal: undefined,
      destinoProduccion: '',
    };

    setNoches([...noches, nuevaNoche]);
  }

  function actualizarNoche(
    id: number,
    campo: 'fecha' | 'libras' | 'pesoInicial' | 'pesoFinal' | 'destinoProduccion',
    valor: string
  ) {
    limpiarError(`noche-${id}-${campo}`);
    setNoches(
      noches.map((noche) => {
        if (noche.id !== id) {
          return noche;
        }

        if (campo === 'destinoProduccion') {
          return { ...noche, destinoProduccion: valor };
        }

        if (campo === 'fecha') {
          return {
            ...noche,
            fecha: valor,
          };
        }

        if (campo === 'libras') {
          return {
            ...noche,
            libras: Number(valor || 0),
          };
        }

        return {
          ...noche,
          [campo]: valor.trim() === '' ? undefined : Number(valor),
        };
      })
    );
  }

  function eliminarNoche(id: number) {
    const numeroInicial = obtenerNumeroInicialNochesPesca();

    const nuevasNoches = noches
      .filter((noche) => noche.id !== id)
      .map((noche, index) => ({
        ...noche,
        numero: numeroInicial + index,
      }));

    setNoches(nuevasNoches);
  }

  /* =======================================================
     GUARDAR
  ======================================================= */

  function guardarRegistro() {
    const errores: Record<string, string> = {};

    if (!piscina) {
      errores.piscina = 'Selecciona una piscina.';
    } else if (cicloActual === null) {
      errores.piscina = 'No se pudo determinar el ciclo de esta piscina.';
    }

    if (tipo !== 'Pesca') {
      if (!fecha) errores.fecha = 'Selecciona una fecha.';
      if (!libras.trim() || !Number.isFinite(Number(libras)) || Number(libras) <= 0) {
        errores.libras = 'Ingresa una cantidad de libras mayor que cero.';
      }
    }

    if (tipo === 'Raleo') {
      if (!pesoInicial.trim() || Number(pesoInicial) <= 0) {
        errores.pesoInicial = 'Ingresa el peso inicial en gramos.';
      }
      if (!pesoFinal.trim() || Number(pesoFinal) <= 0) {
        errores.pesoFinal = 'Ingresa el peso final en gramos.';
      }
    }

    if (tipo === 'Venta local' && (!pesoVentaLocal.trim() || Number(pesoVentaLocal) <= 0)) {
      errores.pesoVentaLocal = 'Ingresa el peso del camarón en gramos.';
    }

    if (tipo === 'Pesca') {
      if (noches.length === 0 && !fecha) {
        errores.fecha = 'Selecciona la fecha programada.';
      }
      noches.forEach((noche) => {
        if (!noche.fecha) {
          errores[`noche-${noche.id}-fecha`] = 'Selecciona la fecha de esta noche.';
        }
        if (!Number.isFinite(noche.libras) || noche.libras <= 0) {
          errores[`noche-${noche.id}-libras`] = 'Ingresa las libras obtenidas (mayor que cero).';
        }
      });
    }

    setErroresFormulario(errores);
    if (Object.keys(errores).length > 0 || cicloActual === null) return;

    // Primero confirmar; todavía no se escribe ningún registro.
    setMostrarConfirmacionGuardado(true);
  }

  function confirmarGuardarRegistro() {
    if (!mostrarConfirmacionGuardado || cicloActual === null || !piscina) return;

    /* =====================================================
       PESCA
    ===================================================== */

    let librasFinales = Number(libras);

    let fechaRegistro = fecha;

    let estadoRegistro: EstadoRegistro = 'Finalizado';

    if (tipo === 'Pesca') {
      librasFinales = noches.reduce(
        (total, noche) => total + Number(noche.libras || 0),
        0
      );

      /*
        Si todavía no tiene noches,
        la pesca queda programada.

        Si tiene noches pero no ha
        terminado, queda En proceso.

        Cuando se marca como finalizada,
        queda Finalizado.
      */

      if (noches.length === 0) {
        fechaRegistro = fecha;

        estadoRegistro = 'Programada';
      } else {
        fechaRegistro = noches[0].fecha;

        estadoRegistro = pescaFinalizada ? 'Finalizado' : 'En proceso';
      }
    }

    const nuevoRegistro: RegistroPesca = {
      id: registroEditando?.id ?? Date.now(),

      piscina,

      piscinaId: piscinaId ?? registroEditando?.piscinaId,

      cicloId: cicloId ?? registroEditando?.cicloId,

      cicloActual,

      tipo,

      fecha: fechaRegistro,

      libras: librasFinales,

      estado: estadoRegistro,

      pesoInicial: tipo === 'Raleo' ? Number(pesoInicial) : undefined,

      pesoFinal: tipo === 'Raleo' ? Number(pesoFinal) : undefined,

      destinoProduccion: tipo === 'Raleo' ? destinoProduccion.trim() : undefined,

      pesoVentaLocal:
        tipo === 'Venta local' ? Number(pesoVentaLocal) : undefined,

      comprador: tipo === 'Venta local' ? comprador : undefined,

      precioLibra:
        tipo === 'Venta local' ? Number(precioLibra || 0) : undefined,

      observacion,

      noches: tipo === 'Pesca' ? noches : undefined,

      // Al editar, conservar la marca de liquidación del ciclo histórico.
      cosechaCerrada: registroEditando?.cosechaCerrada,
      fechaCierreCosecha: registroEditando?.fechaCierreCosecha,
    };

    if (registroEditando) {
      setRegistros(
        registros.map((registro) =>
          registro.id === registroEditando.id ? nuevoRegistro : registro
        )
      );
    } else {
      setRegistros([nuevoRegistro, ...registros]);
    }

    cerrarModal();
  }

  /* =======================================================
     EDITAR
  ======================================================= */

  function editarRegistro(registro: RegistroPesca) {
    setErroresFormulario({});
    setContextoMovimiento(null);
    setRegistroEditando(registro);

    setTipo(registro.tipo);

    setPiscina(registro.piscina);

    setFecha(registro.fecha);

    setLibras(String(registro.libras));

    setPesoInicial(registro.pesoInicial ? String(registro.pesoInicial) : '');

    setPesoFinal(registro.pesoFinal ? String(registro.pesoFinal) : '');
    setDestinoProduccion(registro.destinoProduccion ?? registro.empacadora ?? '');

    setPesoVentaLocal(
      registro.pesoVentaLocal ? String(registro.pesoVentaLocal) : ''
    );

    setComprador(registro.comprador || '');

    setPrecioLibra(registro.precioLibra ? String(registro.precioLibra) : '');

    setObservacion(registro.observacion || '');

    if (registro.tipo === 'Pesca') {
      const movimientos = movimientosDelCiclo(
        registro.piscina,
        registro.cicloActual
      );

      const movimientoActual = movimientos.find(
        ({ registro: item }) => item.id === registro.id
      );

      const nochesNormalizadas = [...(registro.noches ?? [])]
        .sort((a, b) => {
          const fechaComparacion = a.fecha.localeCompare(b.fecha);

          if (fechaComparacion !== 0) return fechaComparacion;

          return a.id - b.id;
        })
        .map((noche) => ({
          ...noche,
          numero:
            movimientoActual?.numeroNochePorClave.get(
              `${registro.id}-${noche.id}`
            ) ?? noche.numero,
        }));

      setNoches(nochesNormalizadas);
    } else {
      setNoches([]);
    }

    setPescaFinalizada(registro.estado === 'Finalizado');

    setModalAbierto(true);
  }

  /* =======================================================
     DETALLE COMPLETO DEL CICLO
  ======================================================= */

  function abrirDetalleCiclo(registro: RegistroPesca) {
    setDetalleCiclo({
      piscina: registro.piscina,
      piscinaId: registro.piscinaId,
      cicloActual: registro.cicloActual,
    });
  }

  function cerrarDetalleCiclo() {
    setDetalleCiclo(null);
  }

  function solicitarEliminarMovimiento(registro: RegistroPesca) {
    // Un movimiento que liquidó la cosecha no puede borrarse porque el
    // cierre del ciclo está guardado por separado en Piscinas.
    if (registro.cosechaCerrada) return;
    setMovimientoPendienteEliminar(registro);
  }

  function confirmarEliminarMovimiento() {
    if (!movimientoPendienteEliminar) return;
    const idEliminar = movimientoPendienteEliminar.id;

    // Conserva todos los demás movimientos, la siembra y el ciclo.
    setRegistros((actuales) =>
      actuales.filter((registro) => registro.id !== idEliminar)
    );
    setMovimientoPendienteEliminar(null);
  }

  function agregarMovimientoAlCiclo() {
    if (!detalleCiclo) return;

    const piscinaDetalle = piscinasDisponibles.find(
      (item) =>
        item.nombre === detalleCiclo.piscina &&
        item.cicloActual === detalleCiclo.cicloActual
    );

    if (!piscinaDetalle) {
      alert(
        'Este ciclo ya no está activo. No se pueden agregar nuevos movimientos.'
      );
      return;
    }

    limpiarFormulario();
    setPiscina(detalleCiclo.piscina);
    setContextoMovimiento({
      piscina: detalleCiclo.piscina,
      piscinaId: piscinaDetalle.id,
      cicloId: piscinaDetalle.cicloId,
      cicloActual: detalleCiclo.cicloActual,
    });
    setDetalleCiclo(null);
    setModalAbierto(true);
  }

  function fechaBonita(fechaValor?: string | null) {
    if (!fechaValor) return 'No registrada';

    const [anio, mes, dia] = fechaValor.split('-');

    if (!anio || !mes || !dia) return fechaValor;

    return `${dia}/${mes}/${anio}`;
  }

  function movimientosDelCiclo(piscinaNombre: string, numeroCiclo: number) {
    const movimientos = registros.filter(
      (registro) =>
        registro.piscina === piscinaNombre &&
        registro.cicloActual === numeroCiclo
    );

    const raleosOrdenados = movimientos
      .filter((registro) => registro.tipo === 'Raleo')
      .sort((a, b) => {
        const fechaComparacion = a.fecha.localeCompare(b.fecha);

        if (fechaComparacion !== 0) return fechaComparacion;

        return a.id - b.id;
      });

    const numeroRaleo = new Map<number, number>();

    raleosOrdenados.forEach((registro, indice) => {
      numeroRaleo.set(registro.id, indice + 1);
    });

    const numeroNochePorClave = new Map<string, number>();

    movimientos
      .filter((registro) => registro.tipo === 'Pesca')
      .flatMap((registro) =>
        (registro.noches ?? []).map((noche) => ({
          registroId: registro.id,
          noche,
        }))
      )
      .sort((a, b) => {
        const fechaComparacion = a.noche.fecha.localeCompare(b.noche.fecha);

        if (fechaComparacion !== 0) return fechaComparacion;

        const registroComparacion = a.registroId - b.registroId;

        if (registroComparacion !== 0) return registroComparacion;

        return a.noche.id - b.noche.id;
      })
      .forEach(({ registroId, noche }, indice) => {
        numeroNochePorClave.set(`${registroId}-${noche.id}`, indice + 1);
      });

    return movimientos
      .map((registro) => ({
        registro,
        numeroRaleo:
          registro.tipo === 'Raleo'
            ? numeroRaleo.get(registro.id) ?? 1
            : null,
        numeroNochePorClave,
      }))
      .sort((a, b) => {
        const fechaA =
          a.registro.tipo === 'Pesca' &&
          a.registro.noches &&
          a.registro.noches.length > 0
            ? [...a.registro.noches]
                .filter((noche) => noche.fecha)
                .sort((x, y) => x.fecha.localeCompare(y.fecha))[0]?.fecha ||
              a.registro.fecha
            : a.registro.fecha;

        const fechaB =
          b.registro.tipo === 'Pesca' &&
          b.registro.noches &&
          b.registro.noches.length > 0
            ? [...b.registro.noches]
                .filter((noche) => noche.fecha)
                .sort((x, y) => x.fecha.localeCompare(y.fecha))[0]?.fecha ||
              b.registro.fecha
            : b.registro.fecha;

        const fechaComparacion = fechaA.localeCompare(fechaB);

        if (fechaComparacion !== 0) return fechaComparacion;

        return a.registro.id - b.registro.id;
      });
  }

  /* =======================================================
     LIQUIDAR COSECHA / CERRAR CICLO
  ======================================================= */

  function cerrarCosecha(registro: RegistroPesca) {
    if (registro.tipo !== 'Pesca') {
      alert('Solo una pesca puede cerrar la cosecha del ciclo.');
      return;
    }

    if (registro.estado !== 'Finalizado') {
      alert('Primero debes marcar esta pesca como finalizada.');
      return;
    }

    if (registro.cosechaCerrada) {
      alert('Esta cosecha ya se encuentra liquidada.');
      return;
    }

    if (!registro.piscinaId) {
      alert(
        'No se encontró la relación de esta pesca con la piscina. Edita y guarda nuevamente el registro antes de cerrar la cosecha.'
      );
      return;
    }

    const confirmar = window.confirm(
      `¿Liquidar la cosecha de ${registro.piscina} - Ciclo ${registro.cicloActual}?

` +
        'El registro de pesca se conservará, pero el ciclo productivo se cerrará y la piscina quedará disponible para una nueva siembra.'
    );

    if (!confirmar) return;

    const fechaCierre =
      registro.noches && registro.noches.length > 0
        ? [...registro.noches]
            .filter((noche) => noche.fecha)
            .sort((a, b) => a.fecha.localeCompare(b.fecha))
            .at(-1)?.fecha || registro.fecha
        : registro.fecha;

    const resultado = cerrarCicloPorLiquidacion(
      registro.piscinaId,
      fechaCierre
    );

    if (!resultado) {
      alert(
        'No se pudo cerrar el ciclo. Verifica que la piscina todavía tenga un ciclo activo.'
      );
      return;
    }

    setRegistros((actuales) =>
      actuales.map((item) =>
        item.id === registro.id
          ? {
              ...item,
              cosechaCerrada: true,
              fechaCierreCosecha: fechaCierre,
            }
          : item
      )
    );

    alert(
      `Cosecha liquidada correctamente. ${registro.piscina} quedó lista para iniciar el próximo ciclo.`
    );
  }

  /* =======================================================
     PANTALLA
  ======================================================= */

  return (
    <div className="module-page">
      {/* ===============================================
          ENCABEZADO
      =============================================== */}

      <div className="module-heading">
        <div>
          <p className="module-eyebrow">Producción</p>

          <h1>Pescas</h1>

          <p>Control de raleos, pescas por noches y ventas locales.</p>
        </div>

        <button className="primary-button" onClick={abrirNuevoRegistro}>
          <Plus size={18} />
          Nuevo registro
        </button>
      </div>

      {/* ===============================================
          RESUMEN
      =============================================== */}

      <div className="harvest-summary-grid">
        <HarvestSummary
          icon={<Waves />}
          title="Raleos"
          value={`${totalRaleos.toLocaleString()} lb`}
        />

        <HarvestSummary
          icon={<Moon />}
          title="Pescas"
          value={`${totalPescas.toLocaleString()} lb`}
        />

        <HarvestSummary
          icon={<Store />}
          title="Venta local"
          value={`${totalVentaLocal.toLocaleString()} lb`}
        />

        <HarvestSummary
          icon={
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 8c3-4 9-5 13-2 3 2 4 6 2 9-2 3-6 4-9 2" />
              <path d="M10 17c-3 0-5-2-5-5" />
              <path d="M8 7c1 2 3 3 5 3" />
              <path d="M12 10c1 2 3 3 5 3" />
              <path d="M18 14l3 2-3 2" />
              <circle cx="6.5" cy="7.5" r=".5" fill="currentColor" />
            </svg>
          }
          title="Producción total"
          value={`${produccionTotal.toLocaleString()} lb`}
          highlighted
        />
      </div>

      {/* ===============================================
          TABLA
      =============================================== */}

      <section className="pools-panel">
        <div
          className="pools-toolbar"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
            gap: '10px',
          }}
        >
          {/* Primera fila: búsqueda compacta y filtros principales */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(180px, 1.6fr) repeat(3, minmax(125px, 1fr))',
              gap: '10px',
              alignItems: 'center',
              width: '100%',
            }}
          >
            <div className="search-box" style={{ width: '100%', minWidth: 0 }}>
              <Search size={18} />
              <input
                type="text"
                placeholder="Buscar piscina o ciclo..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>

            <select
              aria-label="Filtrar por piscina"
              style={{ width: '100%', minWidth: 0 }}
              value={filtroPiscina}
              onChange={(e) => {
                setFiltroPiscina(e.target.value);
                setFiltroCiclo('Todos');
              }}
            >
              <option value="Todas">Todas las piscinas</option>
              {nombresPiscinasFiltro.map((nombre) => (
                <option key={nombre} value={nombre}>{nombre}</option>
              ))}
            </select>

            <select
              aria-label="Filtrar por ciclo"
              style={{ width: '100%', minWidth: 0 }}
              value={filtroCiclo}
              onChange={(e) => setFiltroCiclo(e.target.value)}
              disabled={filtroPiscina === 'Todas'}
              title={filtroPiscina === 'Todas' ? 'Primero selecciona una piscina' : 'Selecciona el ciclo'}
            >
              <option value="Todos">Todos los ciclos</option>
              {ciclosDisponiblesFiltro.map((numero) => (
                <option key={numero} value={String(numero)}>Ciclo {numero}</option>
              ))}
            </select>

            <select
              aria-label="Filtrar por tipo"
              style={{ width: '100%', minWidth: 0 }}
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
            >
              <option value="Todos">Todos los tipos</option>
              <option value="Raleo">Raleo</option>
              <option value="Pesca">Pesca</option>
              <option value="Venta local">Venta local</option>
            </select>
          </div>

          {/* FILTRO POR FECHA */}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap',
              justifyContent: 'flex-start',
              width: '100%',
            }}
          >
            <label
              style={{
                fontSize: '12px',
                fontWeight: 700,
              }}
            >
              Desde
            </label>

            <input
              type="date"
              value={filtroFechaDesde}
              onChange={(e) => setFiltroFechaDesde(e.target.value)}
              style={{
                minHeight: '42px',
                border: '1px solid #dbe4ea',
                borderRadius: '10px',
                padding: '0 10px',}}
            />

            <label
              style={{
                fontSize: '12px',
                fontWeight: 700,
              }}
            >
              Hasta
            </label>

            <input
              type="date"
              value={filtroFechaHasta}
              min={filtroFechaDesde || undefined}
              onChange={(e) => setFiltroFechaHasta(e.target.value)}
              style={{
                minHeight: '42px',
                border: '1px solid #dbe4ea',
                borderRadius: '10px',
                padding: '0 10px',
              }}
            />

            {(filtroFechaDesde || filtroFechaHasta) && (
              <button
                type="button"
                className="icon-button"
                title="Limpiar fechas"
                aria-label="Limpiar filtro de fechas"
                onClick={() => {
                  setFiltroFechaDesde('');
                  setFiltroFechaHasta('');
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        <div className="table-scroll">
          <table className="pools-table">
            <thead>
              <tr>
                <th>Fecha</th>

                <th>Piscina</th>

                <th>Ciclo</th>

                <th>Tipo</th>

                <th>Libras</th>

                <th>Detalle</th>

                <th>Estado</th>

                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {ciclosFiltrados.map((grupo) => {
                const tipos = Array.from(
                  new Set(grupo.registros.map((registro) => registro.tipo))
                );

                const ultimaObservacion = [...grupo.registros]
                  .reverse()
                  .find((registro) => registro.observacion?.trim())
                  ?.observacion?.trim();

                return (
                  <tr key={`${grupo.piscina}-${grupo.cicloActual}`}>
                    <td>
                      {grupo.primeraFecha === grupo.ultimaFecha
                        ? grupo.primeraFecha || '-'
                        : `${grupo.primeraFecha} → ${grupo.ultimaFecha}`}
                    </td>

                    <td>
                      <strong>{grupo.piscina}</strong>
                    </td>

                    <td>
                      <strong>Ciclo {grupo.cicloActual}</strong>
                    </td>

                    <td>
                      <div
                        style={{
                          display: 'flex',
                          gap: '5px',
                          flexWrap: 'wrap',
                        }}
                      >
                        {tipos.map((tipoGrupo) => (
                          <span
                            key={tipoGrupo}
                            className={`harvest-type harvest-${tipoGrupo
                              .toLowerCase()
                              .replace(' ', '-')}`}
                          >
                            {tipoGrupo}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td>
                      <strong>{grupo.totalLibras.toLocaleString()} lb</strong>
                    </td>

                    <td>
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '3px',
                        }}
                      >
                        <strong>
                          {grupo.registros.length} movimiento(s) del ciclo
                        </strong>
                        <small style={{ color: '#7b8d91' }}>
                          {ultimaObservacion
                            ? `📝 ${ultimaObservacion}`
                            : 'Sin observaciones'}
                        </small>
                      </div>
                    </td>

                    <td>
                      <span
                        className={`harvest-status status-${(
                          grupo.cicloCerrado ? 'Finalizado' : 'En proceso'
                        )
                          .toLowerCase()
                          .replace(' ', '-')}`}
                      >
                        {grupo.cicloCerrado ? 'Finalizado' : 'En producción'}
                      </span>

                      {grupo.cicloCerrado && (
                        <div
                          style={{
                            marginTop: '6px',
                            fontSize: '12px',
                            fontWeight: 700,
                            color: '#64748b',
                          }}
                        >
                          🔒 Ciclo cerrado
                        </div>
                      )}
                    </td>

                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="icon-button"
                          onClick={() =>
                            abrirDetalleCiclo(grupo.registros[0])
                          }
                          title="Ver detalle del ciclo"
                          aria-label="Ver detalle del ciclo"
                          style={{
                            color: '#0f8f83',
                            background: '#eefaf8',
                          }}
                        >
                          <Eye size={17} />
                        </button>

                        {grupo.pescaFinal && (
                          <button
                            type="button"
                            className="icon-button"
                            onClick={() => cerrarCosecha(grupo.pescaFinal!)}
                            title={
                              grupo.pescaFinal.cosechaCerrada
                                ? 'Cosecha liquidada'
                                : 'Liquidar cosecha'
                            }
                            aria-label={
                              grupo.pescaFinal.cosechaCerrada
                                ? 'Cosecha liquidada'
                                : 'Liquidar cosecha'
                            }
                            disabled={grupo.pescaFinal.cosechaCerrada}
                            style={
                              grupo.pescaFinal.cosechaCerrada
                                ? {
                                    opacity: 0.45,
                                    cursor: 'not-allowed',
                                  }
                                : undefined
                            }
                          >
                            <Lock size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {ciclosFiltrados.length === 0 && (
                <tr>
                  <td colSpan={8} className="empty-table">
                    No existen registros con esos filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ===============================================
          DETALLE DEL CICLO
      =============================================== */}

      {detalleCiclo && (() => {
        const piscinaDetalle = piscinas.find(
          (item) =>
            item.nombre === detalleCiclo.piscina ||
            (detalleCiclo.piscinaId !== undefined &&
              item.id === detalleCiclo.piscinaId)
        );

        const cicloDetalle = piscinaDetalle
          ? obtenerCiclosPiscina(piscinaDetalle.id).find(
              (ciclo) => ciclo.numero === detalleCiclo.cicloActual
            ) ?? null
          : null;

        const siembraDetalle = cicloDetalle?.siembra ?? null;

        // Mostrar Agregar movimiento solo cuando este mismo ciclo tiene siembra activa.
        const puedeAgregarMovimiento = piscinasDisponibles.some(
          (item) =>
            item.nombre === detalleCiclo.piscina &&
            item.cicloActual === detalleCiclo.cicloActual
        );

        const movimientos = movimientosDelCiclo(
          detalleCiclo.piscina,
          detalleCiclo.cicloActual
        );

        const totalRaleoCiclo = movimientos
          .filter(({ registro }) => registro.tipo === 'Raleo')
          .reduce((total, { registro }) => total + registro.libras, 0);

        const totalPescaCiclo = movimientos
          .filter(({ registro }) => registro.tipo === 'Pesca')
          .reduce((total, { registro }) => total + registro.libras, 0);

        const totalVentaLocalCiclo = movimientos
          .filter(({ registro }) => registro.tipo === 'Venta local')
          .reduce((total, { registro }) => total + registro.libras, 0);

        const produccionCiclo =
          totalRaleoCiclo + totalPescaCiclo + totalVentaLocalCiclo;

        return (
          <div className="modal-backdrop" onClick={cerrarDetalleCiclo}>
            <div
              className="pool-modal harvest-modal"
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: '900px',
                width: 'min(94vw, 900px)',
                maxHeight: '90vh',
                overflowY: 'auto',
              }}
            >
              <div className="modal-header">
                <div>
                  <p
                    style={{
                      margin: '0 0 5px',
                      color: '#0f8f83',
                      fontSize: '12px',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '.08em',
                    }}
                  >
                    Historial productivo
                  </p>

                  <h2 style={{ marginBottom: '5px' }}>
                    🌊 {detalleCiclo.piscina}
                  </h2>

                  <p style={{ margin: 0 }}>
                    🔄 Ciclo {detalleCiclo.cicloActual}
                  </p>
                </div>

                <button
                  type="button"
                  className="icon-button"
                  onClick={cerrarDetalleCiclo}
                  aria-label="Cerrar detalle"
                >
                  <X size={20} />
                </button>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '12px',
                  marginTop: '18px',
                }}
              >
                <DetalleDato
                  emoji="🌱"
                  titulo="Fecha de siembra"
                  valor={fechaBonita(siembraDetalle?.fecha)}
                />

                <DetalleDato
                  emoji="🦐"
                  titulo="Cantidad sembrada"
                  valor={
                    siembraDetalle
                      ? siembraDetalle.cantidadSembrada.toLocaleString()
                      : 'No disponible'
                  }
                />

                <DetalleDato
                  emoji="⚖️"
                  titulo="Peso inicial"
                  valor={
                    siembraDetalle?.pesoInicial != null
                      ? `${siembraDetalle.pesoInicial} g`
                      : 'No disponible'
                  }
                />

                <DetalleDato
                  emoji="📦"
                  titulo="Producción acumulada"
                  valor={`${produccionCiclo.toLocaleString()} lb`}
                  destacado
                />
              </div>

              <div
                style={{
                  marginTop: '22px',
                  padding: '16px',
                  borderRadius: '16px',
                  background: '#f7fbfa',
                  border: '1px solid #e2eeeb',
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                    gap: '10px',
                  }}
                >
                  <ResumenMovimiento
                    titulo="🌊 Raleos"
                    valor={`${totalRaleoCiclo.toLocaleString()} lb`}
                  />

                  <ResumenMovimiento
                    titulo="🎣 Pescas"
                    valor={`${totalPescaCiclo.toLocaleString()} lb`}
                  />

                  <ResumenMovimiento
                    titulo="🏪 Venta local"
                    valor={`${totalVentaLocalCiclo.toLocaleString()} lb`}
                  />
                </div>
              </div>

              <div style={{ marginTop: '25px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    marginBottom: '14px',
                  }}
                >
                  <div>
                    <h3
                      style={{
                        margin: 0,
                        color: '#173f47',
                        fontSize: '17px',
                      }}
                    >
                      Movimientos del ciclo
                    </h3>

                    <p
                      style={{
                        margin: '4px 0 0',
                        color: '#7b8d91',
                        fontSize: '12px',
                      }}
                    >
                      Ordenados automáticamente por fecha.
                    </p>
                  </div>

                  <span
                    style={{
                      padding: '7px 11px',
                      borderRadius: '999px',
                      background: '#edf8f6',
                      color: '#0f8f83',
                      fontSize: '12px',
                      fontWeight: 800,
                    }}
                  >
                    {movimientos.length} movimiento(s)
                  </span>
                </div>

                {movimientos.length === 0 ? (
                  <div
                    style={{
                      padding: '28px',
                      textAlign: 'center',
                      borderRadius: '16px',
                      background: '#f8fafb',
                      color: '#7c8c91',
                    }}
                  >
                    Todavía no existen movimientos en este ciclo.
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                    }}
                  >
                    {movimientos.map(
                      ({ registro, numeroRaleo, numeroNochePorClave }) => (
                      <div
                        key={registro.id}
                        style={{
                          border: '1px solid #e2ecea',
                          borderRadius: '16px',
                          padding: '16px',
                          background: '#ffffff',
                          boxShadow: '0 6px 18px rgba(28, 78, 70, 0.05)',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'space-between',
                            gap: '12px',
                            flexWrap: 'wrap',
                          }}
                        >
                          <div>
                            <span
                              style={{
                                display: 'block',
                                color: '#82918f',
                                fontSize: '12px',
                                fontWeight: 700,
                                marginBottom: '5px',
                              }}
                            >
                              📅 {fechaBonita(registro.fecha)}
                            </span>

                            <strong
                              style={{
                                color: '#173f47',
                                fontSize: '16px',
                              }}
                            >
                              {registro.tipo === 'Raleo'
                                ? `🌊 Raleo ${numeroRaleo}`
                                : registro.tipo === 'Pesca'
                                ? '🎣 Pesca'
                                : '🏪 Venta local'}
                            </strong>
                          </div>

                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                            }}
                          >
                            <button
                              type="button"
                              className="icon-button"
                              onClick={() => {
                                cerrarDetalleCiclo();
                                editarRegistro(registro);
                              }}
                              title="Editar este movimiento"
                              aria-label="Editar este movimiento"
                            >
                              <Pencil size={15} />
                            </button>

                            <button
                              type="button"
                              className="icon-button"
                              onClick={() => solicitarEliminarMovimiento(registro)}
                              disabled={Boolean(registro.cosechaCerrada)}
                              title={registro.cosechaCerrada
                                ? 'Este movimiento liquidó el ciclo y no puede eliminarse'
                                : 'Eliminar este movimiento'}
                              aria-label={registro.cosechaCerrada
                                ? 'No se puede eliminar la pesca que liquidó el ciclo'
                                : `Eliminar ${registro.tipo} del ${fechaBonita(registro.fecha)}`}
                              style={{
                                color: '#c43d3d',
                                background: '#fff0f0',
                                opacity: registro.cosechaCerrada ? 0.45 : 1,
                                cursor: registro.cosechaCerrada ? 'not-allowed' : 'pointer',
                              }}
                            >
                              <Trash2 size={15} />
                            </button>


                          </div>
                        </div>

                        {registro.tipo === 'Raleo' && (
                          <div style={{ marginTop: '13px' }}>
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'minmax(130px, 1fr) minmax(100px, auto)',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '11px 13px',
                                borderRadius: '12px',
                                background: '#f8fafb',
                                border: '1px solid #edf1f2',
                              }}
                            >
                              <div>
                                <strong style={{ color: '#35545a', fontSize: '13px' }}>
                                  ⚖️ Pesos del camarón
                                </strong>
                                <div style={{ marginTop: '5px', color: '#61767a', fontSize: '11px' }}>
                                  ⚖️ Inicial: {registro.pesoInicial != null ? `${registro.pesoInicial} g` : '—'}
                                  {' '}→ Final: {registro.pesoFinal != null ? `${registro.pesoFinal} g` : '—'}
                                </div>
                                {(registro.destinoProduccion ?? registro.empacadora)?.trim() && (
                                  <div style={{ marginTop: '5px', color: '#61767a', fontSize: '11px' }}>
                                    📦 Destino: {registro.destinoProduccion ?? registro.empacadora}
                                  </div>
                                )}
                              </div>
                              <strong style={{ color: '#173f47', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                {registro.libras.toLocaleString()} lb
                              </strong>
                            </div>
                          </div>
                        )}

                        {registro.tipo === 'Pesca' && (
                          <div
                            style={{
                              marginTop: '14px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '9px',
                            }}
                          >
                            {registro.noches && registro.noches.length > 0 ? (
                              [...registro.noches]
                                .sort((a, b) => {
                                  const fechaComparacion =
                                    a.fecha.localeCompare(b.fecha);

                                  if (fechaComparacion !== 0) {
                                    return fechaComparacion;
                                  }

                                  return a.numero - b.numero;
                                })
                                .map((noche) => (
                                  <div
                                    key={noche.id}
                                    style={{
                                      display: 'grid',
                                      gridTemplateColumns:
                                        'minmax(130px, 1fr) minmax(100px, auto)',
                                      gap: '10px',
                                      padding: '11px 13px',
                                      borderRadius: '12px',
                                      background: '#f8fafb',
                                      border: '1px solid #edf1f2',
                                    }}
                                  >
                                    <div>
                                      <strong
                                        style={{
                                          color: '#35545a',
                                          fontSize: '13px',
                                        }}
                                      >
                                        🌙{' '}
                                        {numeroNoche(
                                          numeroNochePorClave.get(
                                            `${registro.id}-${noche.id}`
                                          ) ?? noche.numero
                                        )}
                                      </strong>

                                      {(noche.pesoInicial != null ||
                                        noche.pesoFinal != null) && (
                                        <div
                                          style={{
                                            marginTop: '5px',
                                            color: '#61767a',
                                            fontSize: '11px',
                                          }}
                                        >
                                          ⚖️ Inicial:{' '}
                                          {noche.pesoInicial != null
                                            ? `${noche.pesoInicial} g`
                                            : '—'}{' '}
                                          → Final:{' '}
                                          {noche.pesoFinal != null
                                            ? `${noche.pesoFinal} g`
                                            : '—'}
                                        </div>
                                      )}
                                      {(noche.destinoProduccion ?? noche.empacadora)?.trim() && (
                                        <div style={{ marginTop: '5px', color: '#61767a', fontSize: '11px' }}>
                                          📦 Destino: {noche.destinoProduccion ?? noche.empacadora}
                                        </div>
                                      )}
                                    </div>

                                    <strong
                                      style={{
                                        color: '#173f47',
                                        alignSelf: 'center',
                                        textAlign: 'right',
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      {noche.libras.toLocaleString()} lb
                                    </strong>
                                  </div>
                                ))
                            ) : (
                              <div
                                style={{
                                  padding: '11px 13px',
                                  borderRadius: '12px',
                                  background: '#fff8e8',
                                  color: '#8b6a24',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                }}
                              >
                                📅 Pesca programada para{' '}
                                {fechaBonita(registro.fecha)}
                              </div>
                            )}

                            {registro.noches && registro.noches.length > 1 && (
                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  gap: '10px',
                                  paddingTop: '5px',
                                  color: '#173f47',
                                }}
                              >
                                <strong>Total pesca</strong>
                                <strong>
                                  {registro.libras.toLocaleString()} lb
                                </strong>
                              </div>
                            )}
                          </div>
                        )}

                        {registro.tipo === 'Venta local' && (
                          <div style={{ marginTop: '13px' }}>
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'minmax(130px, 1fr) minmax(100px, auto)',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '11px 13px',
                                borderRadius: '12px',
                                background: '#f8fafb',
                                border: '1px solid #edf1f2',
                              }}
                            >
                              <div>
                                <strong style={{ color: '#35545a', fontSize: '13px' }}>
                                  🏪 Detalle de venta
                                </strong>
                                <div style={{ marginTop: '5px', color: '#61767a', fontSize: '11px' }}>
                                  ⚖️ Peso: {registro.pesoVentaLocal != null ? `${registro.pesoVentaLocal} g` : '—'}
                                  {registro.precioLibra != null && registro.precioLibra > 0
                                    ? ` · Precio: $${registro.precioLibra.toFixed(2)}/lb`
                                    : ''}
                                </div>
                                {registro.comprador && (
                                  <div style={{ marginTop: '4px', color: '#61767a', fontSize: '11px' }}>
                                    👤 Comprador: {registro.comprador}
                                  </div>
                                )}
                              </div>
                              <strong style={{ color: '#173f47', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                {registro.libras.toLocaleString()} lb
                              </strong>
                            </div>
                          </div>
                        )}

                        {registro.observacion && (
                          <div
                            style={{
                              marginTop: '12px',
                              padding: '10px 12px',
                              borderRadius: '11px',
                              background: '#f7f9fa',
                              color: '#65777b',
                              fontSize: '12px',
                            }}
                          >
                            📝 {registro.observacion}
                          </div>
                        )}
                      </div>
                    )
                    )}
                  </div>
                )}
              </div>

              {puedeAgregarMovimiento && (
                <div
                  className="modal-actions"
                  style={{
                    marginTop: '22px',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '10px',
                    flexWrap: 'wrap',
                  }}
                >
                  <button
                    type="button"
                    className="primary-button"
                    onClick={agregarMovimientoAlCiclo}
                  >
                    <Plus size={17} />
                    Agregar movimiento
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ===============================================
          MODAL
      =============================================== */}

      {modalAbierto && !mostrarConfirmacionGuardado && (
        <div className="modal-backdrop" onClick={cerrarModal}>
          <div
            className="pool-modal harvest-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2>
                  {registroEditando
                    ? 'Editar movimiento'
                    : contextoMovimiento
                    ? 'Agregar movimiento'
                    : 'Nuevo registro'}
                </h2>

                <p>Registra una salida de producción.</p>
              </div>

              <button
                type="button"
                className="icon-button"
                onClick={cerrarModal}
              >
                <X size={20} />
              </button>
            </div>

            {/* =========================================
                TIPO
            ========================================= */}

            <div className="type-selector">
              <button
                type="button"
                className={tipo === 'Raleo' ? 'active' : ''}
                onClick={() => { setTipo('Raleo'); setErroresFormulario({}); }}
              >
                <Waves size={18} />
                Raleo
              </button>

              <button
                type="button"
                className={tipo === 'Pesca' ? 'active' : ''}
                onClick={() => { setTipo('Pesca'); setErroresFormulario({}); }}
              >
                <Moon size={18} />
                Pesca
              </button>

              <button
                type="button"
                className={tipo === 'Venta local' ? 'active' : ''}
                onClick={() => { setTipo('Venta local'); setErroresFormulario({}); }}
              >
                <Store size={18} />
                Venta local
              </button>
            </div>

            {/* =========================================
                PISCINA + CICLO
            ========================================= */}

            <div className="form-grid">
              <label>
                Piscina
                <select
                  value={piscina}
                  onChange={(e) => { setPiscina(e.target.value); limpiarError('piscina'); }}
                  disabled={Boolean(contextoMovimiento || registroEditando)}
                  aria-invalid={Boolean(erroresFormulario.piscina)}
                  style={erroresFormulario.piscina ? { borderColor: '#d94848', backgroundColor: '#fffafa' } : undefined}
                >
                  <option value="">Selecciona una piscina</option>

                  {(contextoMovimiento || registroEditando
                    ? piscinasDisponibles
                    : piscinasSinRegistro
                  ).map((piscinaDisponible) => (
                    <option
                      key={piscinaDisponible.nombre}
                      value={piscinaDisponible.nombre}
                    >
                      {piscinaDisponible.nombre}
                    </option>
                  ))}
                </select>
                <ErrorCampo mensaje={erroresFormulario.piscina} />
              </label>

              <label>
                Ciclo actual
                <input
                  type="text"
                  value={cicloActual !== null ? `Ciclo ${cicloActual}` : ''}
                  disabled
                  placeholder="Automático"
                />
              </label>
            </div>

            {/* =========================================
                RALEO / VENTA LOCAL
            ========================================= */}

            {tipo !== 'Pesca' && (
              <div className="form-grid">
                <label>
                  Fecha
                  <input
                    type="date"
                    value={fecha}
                    onChange={(e) => { setFecha(e.target.value); limpiarError('fecha'); }}
                    aria-invalid={Boolean(erroresFormulario.fecha)}
                    style={erroresFormulario.fecha ? { borderColor: '#d94848', backgroundColor: '#fffafa' } : undefined}
                  />
                  <ErrorCampo mensaje={erroresFormulario.fecha} />
                </label>

                <label>
                  Libras
                  <input
                    type="number"
                    min="0"
                    value={libras}
                    onChange={(e) => { setLibras(e.target.value); limpiarError('libras'); }}
                    placeholder="Ej. 8500"
                    aria-invalid={Boolean(erroresFormulario.libras)}
                    style={erroresFormulario.libras ? { borderColor: '#d94848', backgroundColor: '#fffafa' } : undefined}
                  />
                  <ErrorCampo mensaje={erroresFormulario.libras} />
                </label>
              </div>
            )}

            {/* =========================================
                PESOS
            ========================================= */}

            {tipo === 'Raleo' && (
              <div
                style={{
                  marginTop: '16px',
                  padding: '14px',
                  borderRadius: '12px',
                  background: '#f3f8f7',
                }}
              >
                <div
                  style={{
                    marginBottom: '10px',
                    fontWeight: 700,
                  }}
                >
                  ⚖️ Pesos del camarón
                </div>

                <div className="form-grid">
                  <label>
                    Peso inicial (g)
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={pesoInicial}
                      onChange={(e) => { setPesoInicial(e.target.value); limpiarError('pesoInicial'); }}
                      aria-invalid={Boolean(erroresFormulario.pesoInicial)}
                      style={erroresFormulario.pesoInicial ? { borderColor: '#d94848', backgroundColor: '#fffafa' } : undefined}
                      placeholder="Ej. 18.50"
                    />
                    <ErrorCampo mensaje={erroresFormulario.pesoInicial} />
                  </label>

                  <label>
                    Peso final (g)
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={pesoFinal}
                      onChange={(e) => { setPesoFinal(e.target.value); limpiarError('pesoFinal'); }}
                      aria-invalid={Boolean(erroresFormulario.pesoFinal)}
                      style={erroresFormulario.pesoFinal ? { borderColor: '#d94848', backgroundColor: '#fffafa' } : undefined}
                      placeholder="Ej. 24.70"
                    />
                    <ErrorCampo mensaje={erroresFormulario.pesoFinal} />
                  </label>
                </div>
                <div className="form-grid" style={{ marginTop: '12px' }}>
                  <label style={{ gridColumn: '1 / -1' }}>
                    Destino
                    <input
                      type="text"
                      value={destinoProduccion}
                      onChange={(e) => setDestinoProduccion(e.target.value)}
                      placeholder="Ej. Empacadora ABC"
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                  </label>
                </div>
              </div>
            )}

            {/* =========================================
                PESCA
            ========================================= */}

            {tipo === 'Pesca' && (
              <div className="nights-section">
                <div className="nights-header">
                  <div>
                    <h3>Noches de pesca</h3>

                  </div>

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={agregarNoche}>
                    <Plus size={17} />
                    Agregar noche
                  </button>
                </div>

                {/* FECHA PROGRAMADA */}

                {noches.length === 0 && (
                  <div className="form-grid">
                    <label>
                      Fecha programada
                      <input
                        type="date"
                        value={fecha}
                        onChange={(e) => { setFecha(e.target.value); limpiarError('fecha'); }}
                        aria-invalid={Boolean(erroresFormulario.fecha)}
                        style={erroresFormulario.fecha ? { borderColor: '#d94848', backgroundColor: '#fffafa' } : undefined}
                      />
                      <ErrorCampo mensaje={erroresFormulario.fecha} />
                    </label>
                  </div>
                )}

                {noches.length === 0 && (
                  <div className="empty-nights">
                    Todavía no has agregado ninguna noche. Si guardas solamente
                    la fecha, la pesca quedará como programada.
                  </div>
                )}

                {noches.map((noche) => (
                  <div className="night-card" key={noche.id}>
                    <div className="night-title">
                      <strong>{numeroNoche(noche.numero)}</strong>

                      <button
                        type="button"
                        className="icon-button danger"
                        onClick={() => eliminarNoche(noche.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="form-grid">
                      <label>
                        Fecha
                        <input
                          type="date"
                          value={noche.fecha}
                          onChange={(e) =>
                            actualizarNoche(noche.id, 'fecha', e.target.value)
                          }
                          aria-invalid={Boolean(erroresFormulario[`noche-${noche.id}-fecha`])}
                          style={erroresFormulario[`noche-${noche.id}-fecha`] ? { borderColor: '#d94848', backgroundColor: '#fffafa' } : undefined}
                        />
                        <ErrorCampo mensaje={erroresFormulario[`noche-${noche.id}-fecha`]} />
                      </label>

                      <label>
                        Libras obtenidas
                        <input
                          type="number"
                          min="0"
                          value={noche.libras || ''}
                          onChange={(e) =>
                            actualizarNoche(noche.id, 'libras', e.target.value)
                          }
                          placeholder="Ej. 35000"
                          aria-invalid={Boolean(erroresFormulario[`noche-${noche.id}-libras`])}
                          style={erroresFormulario[`noche-${noche.id}-libras`] ? { borderColor: '#d94848', backgroundColor: '#fffafa' } : undefined}
                        />
                        <ErrorCampo mensaje={erroresFormulario[`noche-${noche.id}-libras`]} />
                      </label>

                      <label>
                        Peso inicial (g) — opcional
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={noche.pesoInicial ?? ''}
                          onChange={(e) =>
                            actualizarNoche(
                              noche.id,
                              'pesoInicial',
                              e.target.value
                            )
                          }
                          placeholder="Ej. 18.50"
                        />
                      </label>

                      <label>
                        Peso final (g) — opcional
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={noche.pesoFinal ?? ''}
                          onChange={(e) =>
                            actualizarNoche(
                              noche.id,
                              'pesoFinal',
                              e.target.value
                            )
                          }
                          placeholder="Ej. 24.70"
                        />
                      </label>
                      <label style={{ gridColumn: '1 / -1' }}>
                        Destino
                        <input
                          type="text"
                          value={noche.destinoProduccion ?? noche.empacadora ?? ''}
                          onChange={(e) => actualizarNoche(noche.id, 'destinoProduccion', e.target.value)}
                          placeholder="Ej. Empacadora ABC"
                          style={{ width: '100%', boxSizing: 'border-box' }}
                        />
                      </label>
                    </div>
                  </div>
                ))}

                {noches.length > 0 && (
                  <>
                    <div className="night-total">
                      <span>Total de la pesca</span>

                      <strong>
                        {noches
                          .reduce(
                            (total, noche) => total + Number(noche.libras || 0),
                            0
                          )
                          .toLocaleString()}{' '}
                        lb
                      </strong>
                    </div>

                    <label
                      style={{
                        marginTop: '15px',
                        display: 'flex',
                        gap: '10px',
                        alignItems: 'center',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={pescaFinalizada}
                        onChange={(e) => setPescaFinalizada(e.target.checked)}
                        style={{
                          width: '18px',
                          height: '18px',
                        }}
                      />
                      Marcar esta pesca como finalizada
                    </label>

                    {!pescaFinalizada && (
                      <p
                        style={{
                          marginTop: '8px',
                          color: '#7b8992',
                          fontSize: '13px',
                        }}
                      >
                        La pesca se guardará como
                        <strong> En proceso</strong>. Después podrás editarla y
                        agregar otra noche.
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            {/* =========================================
                VENTA LOCAL
            ========================================= */}

            {tipo === 'Venta local' && (
              <div className="form-grid">
                <label>
                  Peso del camarón (g)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={pesoVentaLocal}
                    onChange={(e) => { setPesoVentaLocal(e.target.value); limpiarError('pesoVentaLocal'); }}
                    placeholder="Ej. 22.50"
                    aria-invalid={Boolean(erroresFormulario.pesoVentaLocal)}
                    style={erroresFormulario.pesoVentaLocal ? { borderColor: '#d94848', backgroundColor: '#fffafa' } : undefined}
                  />
                  <ErrorCampo mensaje={erroresFormulario.pesoVentaLocal} />
                </label>

                <label>
                  Comprador
                  <input
                    value={comprador}
                    onChange={(e) => setComprador(e.target.value)}
                    placeholder="Nombre del comprador"
                  />
                </label>

                <label>
                  Precio por libra
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={precioLibra}
                    onChange={(e) => setPrecioLibra(e.target.value)}
                    placeholder="Ej. 2.25"
                  />
                </label>
              </div>
            )}

            {/* TOTAL VENTA LOCAL */}

            {tipo === 'Venta local' &&
              Number(libras) > 0 &&
              Number(precioLibra) > 0 && (
                <div className="sale-total">
                  <span>Total venta</span>

                  <strong>
                    $
                    {(Number(libras) * Number(precioLibra)).toLocaleString(
                      undefined,
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }
                    )}
                  </strong>
                </div>
              )}

            {/* =========================================
                OBSERVACIÓN
            ========================================= */}

            <label className="full-label">
              Observación
              <textarea
                value={observacion}
                onChange={(e) => setObservacion(e.target.value)}
                placeholder="Observaciones adicionales..."
                rows={3}
              />
            </label>

            {/* =========================================
                BOTONES
            ========================================= */}

            <div className="modal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={cerrarModal}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="primary-button"
                onClick={guardarRegistro}
              >
                {registroEditando ? 'Guardar cambios' : 'Guardar registro'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmación de guardado integrada: aplica a Raleo, Pesca y Venta local. */}
      {mostrarConfirmacionGuardado && (
        <div
          className="modal-backdrop"
          onClick={() => setMostrarConfirmacionGuardado(false)}
        >
          <div
            className="pool-modal harvest-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-confirmar-guardado"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '450px', width: 'min(92vw, 450px)' }}
          >
            <div style={{ textAlign: 'center', padding: '12px 8px' }}>
              <div
                style={{
                  width: '60px', height: '60px', margin: '0 auto 14px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: '#eaf8f5', borderRadius: '17px', fontSize: '28px',
                }}
              >
                {tipo === 'Raleo' ? '🌊' : tipo === 'Pesca' ? '🎣' : '🏪'}
              </div>
              <h2
                id="titulo-confirmar-guardado"
                style={{ color: '#173f47', fontSize: '21px', marginBottom: '10px' }}
              >
                {registroEditando
                  ? `¿Deseas guardar los cambios de ${tipo === 'Venta local' ? 'esta venta local' : tipo === 'Pesca' ? 'esta pesca' : 'este raleo'}?`
                  : `¿Deseas guardar ${tipo === 'Venta local' ? 'esta venta local' : tipo === 'Pesca' ? 'esta pesca' : 'este raleo'}?`}
              </h2>
              <p style={{ color: '#52696c', fontSize: '14px', lineHeight: 1.7 }}>
                <strong>{piscina}</strong> — Ciclo <strong>{cicloActual}</strong>
                <br />
                <strong>{tipo}</strong>
                {tipo === 'Pesca' ? (
                  <>
                    <br />
                    {noches.length === 0 ? 'Pesca programada' : `${noches.length} noche(s) registrada(s)`}
                    {' · '}
                    <strong>{noches.reduce((suma, noche) => suma + Number(noche.libras || 0), 0).toLocaleString()} lb</strong>
                  </>
                ) : (
                  <>
                    <br />
                    <strong>{Number(libras).toLocaleString()} lb</strong>
                  </>
                )}
              </p>
              <p style={{ color: '#647c7a', fontSize: '12px', lineHeight: 1.55 }}>
                Confirma para {registroEditando ? 'actualizar' : 'registrar'} este movimiento en el historial productivo.
              </p>
            </div>
            <div
              className="modal-actions"
              style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}
            >
              <button
                type="button"
                className="secondary-button"
                onClick={() => setMostrarConfirmacionGuardado(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={confirmarGuardarRegistro}
              >
                {registroEditando ? 'Confirmar cambios' : 'Confirmar guardado'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmar eliminación individual sin tocar el cierre del ciclo. */}
      {movimientoPendienteEliminar && (
        <div
          className="modal-backdrop"
          onClick={() => setMovimientoPendienteEliminar(null)}
        >
          <div
            className="pool-modal harvest-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-eliminar-movimiento"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '470px', width: 'min(92vw, 470px)' }}
          >
            <div style={{ textAlign: 'center', padding: '12px 8px' }}>
              <div style={{
                width: '60px', height: '60px', margin: '0 auto 14px',
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                background: '#fff1f1', color: '#bf3939', borderRadius: '17px',
              }}>
                <Trash2 size={27} />
              </div>
              <h2
                id="titulo-eliminar-movimiento"
                style={{ color: '#613d3d', fontSize: '21px', marginBottom: '9px' }}
              >
                ¿Eliminar este movimiento?
              </h2>
              <p style={{ color: '#52696c', fontSize: '14px', lineHeight: 1.65 }}>
                <strong>{movimientoPendienteEliminar.piscina}</strong> — Ciclo{' '}
                <strong>{movimientoPendienteEliminar.cicloActual}</strong>
                <br />
                <strong>{movimientoPendienteEliminar.tipo}</strong> ·{' '}
                {fechaBonita(movimientoPendienteEliminar.fecha)}
                <br />
                <strong>{movimientoPendienteEliminar.libras.toLocaleString()} lb</strong>
              </p>
              <p style={{ color: '#8a5858', fontSize: '13px', lineHeight: 1.55 }}>
                Se borrará únicamente este movimiento
                {movimientoPendienteEliminar.tipo === 'Pesca'
                  ? ' y todas sus noches registradas'
                  : ''}. Esta acción no se puede deshacer.
              </p>
              <p style={{ color: '#647c7a', fontSize: '12px', lineHeight: 1.55 }}>
                Los otros movimientos, la siembra y el estado del ciclo se conservarán.
              </p>
            </div>
            <div
              className="modal-actions"
              style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}
            >
              <button
                type="button"
                className="secondary-button"
                onClick={() => setMovimientoPendienteEliminar(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarEliminarMovimiento}
                style={{
                  border: 'none', borderRadius: '11px', padding: '11px 18px',
                  background: '#c43d3d', color: '#fff', cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                Eliminar movimiento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ErrorCampo({ mensaje }: { mensaje?: string }) {
  if (!mensaje) return null;
  return (
    <span role="alert" style={{ display: 'block', color: '#c63737', fontSize: '12px', marginTop: '5px', fontWeight: 600 }}>
      {mensaje}
    </span>
  );
}

/* =========================================================
   COMPONENTES DEL DETALLE
========================================================= */

function DetalleDato({
  emoji,
  titulo,
  valor,
  destacado = false,
}: {
  emoji: string;
  titulo: string;
  valor: string;
  destacado?: boolean;
}) {
  return (
    <div
      style={{
        padding: '14px',
        borderRadius: '14px',
        background: destacado ? '#edf9f6' : '#f8fafb',
        border: destacado ? '1px solid #cfece5' : '1px solid #e8eeee',
      }}
    >
      <span
        style={{
          display: 'block',
          color: '#7b8c90',
          fontSize: '11px',
          fontWeight: 700,
          marginBottom: '6px',
        }}
      >
        {emoji} {titulo}
      </span>

      <strong
        style={{
          color: destacado ? '#0f8f83' : '#173f47',
          fontSize: '15px',
        }}
      >
        {valor}
      </strong>
    </div>
  );
}

function ResumenMovimiento({
  titulo,
  valor,
}: {
  titulo: string;
  valor: string;
}) {
  return (
    <div
      style={{
        padding: '11px 12px',
        borderRadius: '12px',
        background: '#ffffff',
        border: '1px solid #e4eeec',
      }}
    >
      <span
        style={{
          display: 'block',
          color: '#7d8e91',
          fontSize: '11px',
          marginBottom: '4px',
        }}
      >
        {titulo}
      </span>

      <strong
        style={{
          color: '#173f47',
          fontSize: '14px',
        }}
      >
        {valor}
      </strong>
    </div>
  );
}

function MovimientoDato({
  titulo,
  valor,
}: {
  titulo: string;
  valor: string;
}) {
  return (
    <div
      style={{
        padding: '10px 12px',
        borderRadius: '11px',
        background: '#f8fafb',
        border: '1px solid #edf1f2',
      }}
    >
      <span
        style={{
          display: 'block',
          color: '#839397',
          fontSize: '10px',
          fontWeight: 700,
          marginBottom: '4px',
        }}
      >
        {titulo}
      </span>

      <strong
        style={{
          color: '#35545a',
          fontSize: '12px',
        }}
      >
        {valor}
      </strong>
    </div>
  );
}

/* =========================================================
   TARJETAS DE RESUMEN
========================================================= */

function HarvestSummary({
  icon,
  title,
  value,
  highlighted = false,
}: {
  icon: ReactNode;
  title: string;
  value: string;
  highlighted?: boolean;
}) {
  return (
    <div className={`harvest-summary-card ${highlighted ? 'highlighted' : ''}`}>
      <div className="harvest-summary-icon">{icon}</div>

      <div>
        <span>{title}</span>

        <strong>{value}</strong>
      </div>
    </div>
  );
}

/* =========================================================
   NOMBRE DE LAS NOCHES
========================================================= */

function numeroNoche(numero: number) {
  const nombres = [
    'Primera noche',
    'Segunda noche',
    'Tercera noche',
    'Cuarta noche',
    'Quinta noche',
    'Sexta noche',
    'Séptima noche',
    'Octava noche',
    'Novena noche',
    'Décima noche',
  ];

  return nombres[numero - 1] || `Noche ${numero}`;
}