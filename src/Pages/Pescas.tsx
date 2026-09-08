import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import {
  
  Plus,
  Search,
  Trash2,
  Pencil,
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

const PESCAS_STORAGE_KEY = 'aquapro-pescas-v1';

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

const datosIniciales: RegistroPesca[] = [
  {
    id: 1,
    piscina: 'IS063',
    cicloActual: 3,
    tipo: 'Raleo',
    fecha: '2026-08-18',
    libras: 8500,
    estado: 'Finalizado',
    observacion: 'Primer raleo del ciclo',
  },

  {
    id: 2,
    piscina: 'IS045',
    cicloActual: 4,
    tipo: 'Pesca',
    fecha: '2026-09-02',
    libras: 65400,
    estado: 'Finalizado',

    noches: [
      {
        id: 1,
        numero: 1,
        fecha: '2026-09-02',
        libras: 34500,
      },
      {
        id: 2,
        numero: 2,
        fecha: '2026-09-03',
        libras: 30900,
      },
    ],
  },

  {
    id: 3,
    piscina: 'IS029',
    cicloActual: 5,
    tipo: 'Venta local',
    fecha: '2026-08-25',
    libras: 450,
    estado: 'Finalizado',
    comprador: 'Cliente local',
    precioLibra: 2.25,
  },

  {
    id: 4,
    piscina: 'IS098',
    cicloActual: 6,
    tipo: 'Pesca',
    fecha: '2026-09-10',
    libras: 0,
    estado: 'Programada',
    noches: [],
  },
];

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
    piscinaSeleccionada?.cicloActual ?? registroEditando?.cicloActual ?? null;

  const cicloId = piscinaSeleccionada?.cicloId ?? null;

  const piscinaId = piscinaSeleccionada?.id ?? null;

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
    limpiarFormulario();
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
              {registrosFiltrados.map((registro) => (
                <tr key={registro.id}>
                  <td>{registro.fecha || '-'}</td>

                  <td>
                    <strong>{registro.piscina}</strong>
                  </td>

                  <td>
                    <strong>Ciclo {registro.cicloActual}</strong>
                  </td>

                  <td>
                    <span
                      className={`harvest-type harvest-${registro.tipo
                        .toLowerCase()
                        .replace(' ', '-')}`}
                    >
                      {registro.tipo}
                    </span>
                  </td>

                  <td>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '3px',
                      }}
                    >
                      <span>
                        {registro.tipo === 'Pesca'
                          ? `${registro.noches?.length || 0} noche(s)`
                          : registro.tipo === 'Venta local'
                          ? registro.comprador || 'Venta local'
                          : registro.observacion || 'Raleo'}
                      </span>

                      {registro.tipo === 'Raleo' &&
                        registro.pesoInicial &&
                        registro.pesoFinal && (
                          <small>
                            ⚖️ {registro.pesoInicial} g → {registro.pesoFinal} g
                          </small>
                        )}

                      {registro.tipo === 'Venta local' &&
                        registro.pesoVentaLocal && (
                          <small>⚖️ {registro.pesoVentaLocal} g</small>
                        )}
                    </div>
                  </td>

                  <td>
                    <strong>{registro.libras.toLocaleString()} lb</strong>
                  </td>

                  <td>
                    <span
                      className={`harvest-status status-${registro.estado
                        .toLowerCase()
                        .replace(' ', '-')}`}
                    >
                      {registro.estado}
                    </span>

                    {registro.cosechaCerrada && (
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
                        onClick={() => editarRegistro(registro)}
                        title="Editar"
                        aria-label="Editar registro"
                      >
                        <Pencil size={16} />
                      </button>

                      {registro.tipo === 'Pesca' &&
                        registro.estado === 'Finalizado' && (
                          <button
                            type="button"
                            className="icon-button"
                            onClick={() => cerrarCosecha(registro)}
                            title={
                              registro.cosechaCerrada
                                ? 'Cosecha liquidada'
                                : 'Liquidar cosecha'
                            }
                            aria-label={
                              registro.cosechaCerrada
                                ? 'Cosecha liquidada'
                                : 'Liquidar cosecha'
                            }
                            disabled={registro.cosechaCerrada}
                            style={
                              registro.cosechaCerrada
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
              ))}

              {registrosFiltrados.length === 0 && (
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
                  {registroEditando ? 'Editar registro' : 'Nuevo registro'}
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
                >
                  <option value="">Selecciona una piscina</option>

                  {piscinasDisponibles.map((piscinaDisponible) => (
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
                Este registro se guardará automáticamente en{' '}
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
