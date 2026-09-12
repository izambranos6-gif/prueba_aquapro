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
  pesoVentaLocal?: number;

  comprador?: string;
  precioLibra?: number;
  observacion?: string;
  noches?: NochePesca[];

  // El registro nunca se elimina.
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

  const [filtroFechaDesde, setFiltroFechaDesde] = useState('');

  const [filtroFechaHasta, setFiltroFechaHasta] = useState('');

  /* =======================================================
     MODAL
  ======================================================= */

  const [modalAbierto, setModalAbierto] = useState(false);

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

  /* =======================================================
     FORMULARIO
  ======================================================= */

  const [tipo, setTipo] = useState<TipoSalida>('Raleo');

  const [piscina, setPiscina] = useState('');

  const [fecha, setFecha] = useState('');

  const [libras, setLibras] = useState('');

  const [pesoInicial, setPesoInicial] = useState('');

  const [pesoFinal, setPesoFinal] = useState('');

  const [pesoVentaLocal, setPesoVentaLocal] = useState('');

  const [comprador, setComprador] = useState('');

  const [precioLibra, setPrecioLibra] = useState('');

  const [observacion, setObservacion] = useState('');

  const [noches, setNoches] = useState<NochePesca[]>([]);

  const [pescaFinalizada, setPescaFinalizada] = useState(false);

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
        coincideBusqueda && coincideTipo && coincidePiscina && coincideFecha
      );
    });
  }, [
    registros,
    busqueda,
    filtroTipo,
    filtroPiscina,
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

  const totalRaleos = registros
    .filter((registro) => registro.tipo === 'Raleo')
    .reduce((total, registro) => total + registro.libras, 0);

  const totalPescas = registros
    .filter((registro) => registro.tipo === 'Pesca')
    .reduce((total, registro) => total + registro.libras, 0);

  const totalVentaLocal = registros
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
    setRegistroEditando(null);

    setTipo('Raleo');

    setPiscina('');

    setFecha('');

    setLibras('');

    setPesoInicial('');

    setPesoFinal('');

    setPesoVentaLocal('');

    setComprador('');

    setPrecioLibra('');

    setObservacion('');

    setNoches([]);

    setPescaFinalizada(false);
  }

  function cerrarModal() {
    setModalAbierto(false);
    setContextoMovimiento(null);
    limpiarFormulario();
  }

  /* =======================================================
     NOCHES DE PESCA
  ======================================================= */

  function agregarNoche() {
    const nuevaNoche: NochePesca = {
      id: Date.now(),
      numero: noches.length + 1,
      fecha: '',
      libras: 0,
      pesoInicial: undefined,
      pesoFinal: undefined,
    };

    setNoches([...noches, nuevaNoche]);
  }

  function actualizarNoche(
    id: number,
    campo: 'fecha' | 'libras' | 'pesoInicial' | 'pesoFinal',
    valor: string
  ) {
    setNoches(
      noches.map((noche) => {
        if (noche.id !== id) {
          return noche;
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
    const nuevasNoches = noches
      .filter((noche) => noche.id !== id)
      .map((noche, index) => ({
        ...noche,
        numero: index + 1,
      }));

    setNoches(nuevasNoches);
  }

  /* =======================================================
     GUARDAR
  ======================================================= */

  function guardarRegistro() {
    if (!piscina) {
      alert('Selecciona una piscina.');

      return;
    }

    if (cicloActual === null) {
      alert('No se pudo determinar el ciclo actual de la piscina.');

      return;
    }

    if (
      tipo === 'Raleo' &&
      (Number(pesoInicial) <= 0 || Number(pesoFinal) <= 0)
    ) {
      alert('Ingresa el peso inicial y el peso final en gramos.');

      return;
    }

    if (tipo === 'Venta local' && Number(pesoVentaLocal) <= 0) {
      alert('Ingresa el peso del camarón en gramos.');

      return;
    }

    if (tipo !== 'Pesca' && !fecha) {
      alert('Selecciona una fecha.');

      return;
    }

    if (tipo !== 'Pesca' && Number(libras) <= 0) {
      alert('Ingresa una cantidad válida de libras.');

      return;
    }

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
        if (!fecha) {
          alert('Selecciona la fecha programada de la pesca.');

          return;
        }

        fechaRegistro = fecha;

        estadoRegistro = 'Programada';
      } else {
        const nocheSinFecha = noches.some((noche) => !noche.fecha);

        if (nocheSinFecha) {
          alert('Ingresa la fecha de todas las noches de pesca.');

          return;
        }

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

      pesoVentaLocal:
        tipo === 'Venta local' ? Number(pesoVentaLocal) : undefined,

      comprador: tipo === 'Venta local' ? comprador : undefined,

      precioLibra:
        tipo === 'Venta local' ? Number(precioLibra || 0) : undefined,

      observacion,

      noches: tipo === 'Pesca' ? noches : undefined,
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
    setContextoMovimiento(null);
    setRegistroEditando(registro);

    setTipo(registro.tipo);

    setPiscina(registro.piscina);

    setFecha(registro.fecha);

    setLibras(String(registro.libras));

    setPesoInicial(registro.pesoInicial ? String(registro.pesoInicial) : '');

    setPesoFinal(registro.pesoFinal ? String(registro.pesoFinal) : '');

    setPesoVentaLocal(
      registro.pesoVentaLocal ? String(registro.pesoVentaLocal) : ''
    );

    setComprador(registro.comprador || '');

    setPrecioLibra(registro.precioLibra ? String(registro.precioLibra) : '');

    setObservacion(registro.observacion || '');

    setNoches(registro.noches || []);

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

    return movimientos
      .map((registro) => ({
        registro,
        numeroRaleo:
          registro.tipo === 'Raleo'
            ? numeroRaleo.get(registro.id) ?? 1
            : null,
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
        <div className="pools-toolbar">
          <div className="search-box">
            <Search size={18} />

            <input
              type="text"
              placeholder="Buscar por piscina o ciclo..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

          {/* FILTRO POR PISCINA */}

          <select
            value={filtroPiscina}
            onChange={(e) => setFiltroPiscina(e.target.value)}
          >
            <option value="Todas">Todas las piscinas</option>

            {piscinasDisponibles.map((piscina) => (
              <option key={piscina.nombre} value={piscina.nombre}>
                {piscina.nombre}
              </option>
            ))}
          </select>

          {/* FILTRO POR TIPO */}

          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
          >
            <option value="Todos">Todos los tipos</option>

            <option value="Raleo">Raleo</option>

            <option value="Pesca">Pesca</option>

            <option value="Venta local">Venta local</option>
          </select>

          {/* FILTRO POR FECHA */}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap',
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
                padding: '0 10px',
              }}
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

                <th>Detalle</th>

                <th>Libras</th>

                <th>Estado</th>

                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {ciclosFiltrados.map((grupo) => {
                const tipos = Array.from(
                  new Set(grupo.registros.map((registro) => registro.tipo))
                );

                const ultimoRegistro = grupo.registros.at(-1);

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
                          👁 Ver detalle para revisar Raleo 1, Raleo 2, noches de
                          pesca y ventas locales
                        </small>
                      </div>
                    </td>

                    <td>
                      <strong>{grupo.totalLibras.toLocaleString()} lb</strong>
                    </td>

                    <td>
                      <span
                        className={`harvest-status status-${(
                          grupo.cicloCerrado
                            ? 'Finalizado'
                            : ultimoRegistro?.estado || 'En proceso'
                        )
                          .toLowerCase()
                          .replace(' ', '-')}`}
                      >
                        {grupo.cicloCerrado
                          ? 'Finalizado'
                          : ultimoRegistro?.estado || 'En proceso'}
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
          ? obtenerCicloActivo(piscinaDetalle.id)
          : null;

        const siembraDetalle =
          cicloDetalle?.numero === detalleCiclo.cicloActual
            ? cicloDetalle.siembra
            : null;

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
                    {movimientos.map(({ registro, numeroRaleo }) => (
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

                            <strong
                            style={{
                              padding: '7px 11px',
                              borderRadius: '10px',
                              background: '#eef9f7',
                              color: '#0f8f83',
                              fontSize: '14px',
                            }}
                          >
                            {registro.libras.toLocaleString()} lb
                            </strong>
                          </div>
                        </div>

                        {registro.tipo === 'Raleo' && (
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns:
                                'repeat(auto-fit, minmax(150px, 1fr))',
                              gap: '10px',
                              marginTop: '13px',
                            }}
                          >
                            <MovimientoDato
                              titulo="Peso inicial"
                              valor={
                                registro.pesoInicial != null
                                  ? `${registro.pesoInicial} g`
                                  : 'No registrado'
                              }
                            />

                            <MovimientoDato
                              titulo="Peso final"
                              valor={
                                registro.pesoFinal != null
                                  ? `${registro.pesoFinal} g`
                                  : 'No registrado'
                              }
                            />
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
                                .map((noche, indice) => (
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
                                        🌙 {numeroNoche(indice + 1)}
                                      </strong>

                                      <div
                                        style={{
                                          marginTop: '3px',
                                          color: '#849397',
                                          fontSize: '11px',
                                        }}
                                      >
                                        {fechaBonita(noche.fecha)}
                                      </div>

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
                                    </div>

                                    <strong
                                      style={{
                                        color: '#173f47',
                                        alignSelf: 'center',
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

                            {registro.noches && registro.noches.length > 0 && (
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
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns:
                                'repeat(auto-fit, minmax(150px, 1fr))',
                              gap: '10px',
                              marginTop: '13px',
                            }}
                          >
                            <MovimientoDato
                              titulo="Peso del camarón"
                              valor={
                                registro.pesoVentaLocal != null
                                  ? `${registro.pesoVentaLocal} g`
                                  : 'No registrado'
                              }
                            />

                            <MovimientoDato
                              titulo="Comprador"
                              valor={registro.comprador || 'No registrado'}
                            />

                            <MovimientoDato
                              titulo="Precio por libra"
                              valor={
                                registro.precioLibra != null &&
                                registro.precioLibra > 0
                                  ? `$${registro.precioLibra.toFixed(2)}`
                                  : 'No registrado'
                              }
                            />
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
                    ))}
                  </div>
                )}
              </div>

              <div
                className="modal-actions"
                style={{
                  marginTop: '22px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '10px',
                  flexWrap: 'wrap',
                }}
              >
                <button
                  type="button"
                  className="secondary-button"
                  onClick={cerrarDetalleCiclo}
                >
                  Cerrar detalle
                </button>

                <button
                  type="button"
                  className="primary-button"
                  onClick={agregarMovimientoAlCiclo}
                >
                  <Plus size={17} />
                  Agregar movimiento
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ===============================================
          MODAL
      =============================================== */}

      {modalAbierto && (
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
                onClick={() => setTipo('Raleo')}
              >
                <Waves size={18} />
                Raleo
              </button>

              <button
                type="button"
                className={tipo === 'Pesca' ? 'active' : ''}
                onClick={() => setTipo('Pesca')}
              >
                <Moon size={18} />
                Pesca
              </button>

              <button
                type="button"
                className={tipo === 'Venta local' ? 'active' : ''}
                onClick={() => setTipo('Venta local')}
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
                  onChange={(e) => setPiscina(e.target.value)}
                  disabled={Boolean(contextoMovimiento || registroEditando)}
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
                      {piscinaDisponible.nombre} — Ciclo{' '}
                      {piscinaDisponible.cicloActual}
                    </option>
                  ))}
                </select>
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

            {/* MENSAJE DEL CICLO */}

            {piscina && cicloActual !== null && (
              <div
                style={{
                  marginTop: '10px',
                  marginBottom: '16px',
                  padding: '11px 14px',
                  background: '#eef8f6',
                  borderRadius: '10px',
                  color: '#376b64',
                  fontSize: '13px',
                }}
              >
                {contextoMovimiento
                  ? 'Este movimiento se agregará al historial de '
                  : 'Este registro iniciará el historial de '}{' '}
                <strong>
                  {piscina} — Ciclo {cicloActual}
                </strong>
                .
              </div>
            )}

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
                    onChange={(e) => setFecha(e.target.value)}
                  />
                </label>

                <label>
                  Libras
                  <input
                    type="number"
                    min="0"
                    value={libras}
                    onChange={(e) => setLibras(e.target.value)}
                    placeholder="Ej. 8500"
                  />
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
                      onChange={(e) => setPesoInicial(e.target.value)}
                      placeholder="Ej. 18.50"
                    />
                  </label>

                  <label>
                    Peso final (g)
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={pesoFinal}
                      onChange={(e) => setPesoFinal(e.target.value)}
                      placeholder="Ej. 24.70"
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

                    <p>
                      Puedes programar la pesca o agregar tantas noches como sea
                      necesario. Cada noche puede tener su propio peso inicial y
                      final (opcional).
                    </p>
                  </div>

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={agregarNoche}
                  >
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
                        onChange={(e) => setFecha(e.target.value)}
                      />
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
                        />
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
                        />
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
                    onChange={(e) => setPesoVentaLocal(e.target.value)}
                    placeholder="Ej. 22.50"
                  />
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
    </div>
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
