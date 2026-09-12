import { useMemo, useState, type FormEvent } from 'react';

import {
  useAquaProStore,
  crearPiscina,
  editarPiscina as editarPiscinaStore,
  eliminarPiscina as eliminarPiscinaStore,
  registrarNuevaSiembra,
  actualizarSiembraActual,
  eliminarSiembraActual,
  obtenerCicloActivo,
  obtenerCiclosPiscina,
  obtenerProximoNumeroCiclo,
  obtenerDestinosPrecria,
  liquidarPrecria,
  type Piscina,
  type EstadoPiscina,
  type TipoPiscina,
  type TipoOrigenSiembra,
} from '../store/aquaProStore';

/* =========================================================
   FORMULARIOS
========================================================= */

const formularioPiscinaInicial = {
  nombre: '',
  zona: 'Norte',
  hectareas: '',
  estado: 'Disponible' as EstadoPiscina,
  tipo: 'Engorde' as TipoPiscina,
  cicloInicial: '1',
};

const formularioSiembraInicial = {
  fecha: '',
  cantidadSembrada: '',
  pesoInicial: '',
  procedencia: '',
  nauplios: [] as string[],
  laboratorios: [] as string[],
  tipoOrigen: 'Directa' as TipoOrigenSiembra,
  piscinaOrigenId: '',
  observacion: '',
};

/* =========================================================
   COMPONENTE PRINCIPAL
========================================================= */

export default function Piscinas() {
  /* =======================================================
     STORE GENERAL
  ======================================================= */

  const { piscinas } = useAquaProStore();

  /* =======================================================
     FILTROS
  ======================================================= */

  const [busqueda, setBusqueda] = useState('');
  const [zonaFiltro, setZonaFiltro] = useState('Todas');
  const [estadoFiltro, setEstadoFiltro] = useState('Todos');

  /* =======================================================
     MODAL PISCINA
  ======================================================= */

  const [mostrarFormularioPiscina, setMostrarFormularioPiscina] =
    useState(false);

  const [editandoPiscinaId, setEditandoPiscinaId] = useState<number | null>(
    null
  );

  const [formularioPiscina, setFormularioPiscina] = useState(
    formularioPiscinaInicial
  );

  /* =======================================================
     MODAL SIEMBRA
  ======================================================= */

  const [mostrarSiembra, setMostrarSiembra] = useState(false);

  const [piscinaSiembraId, setPiscinaSiembraId] = useState<number | null>(null);

  const [editandoSiembra, setEditandoSiembra] = useState(false);

  const [formularioSiembra, setFormularioSiembra] = useState(
    formularioSiembraInicial
  );

  const [nuevoNauplio, setNuevoNauplio] = useState('');
  const [nuevoLaboratorio, setNuevoLaboratorio] = useState('');

  /* =======================================================
     MODAL LIQUIDACIÓN PRECRÍA
  ======================================================= */

  const [mostrarLiquidacionPrecria, setMostrarLiquidacionPrecria] =
    useState(false);

  const [fechaLiquidacionPrecria, setFechaLiquidacionPrecria] =
    useState('');

  const [observacionLiquidacionPrecria, setObservacionLiquidacionPrecria] =
    useState('');

  /* =======================================================
     PISCINA SELECCIONADA
  ======================================================= */

  const piscinaSiembra =
    piscinas.find((piscina) => piscina.id === piscinaSiembraId) ?? null;

  const cicloActivoSiembra =
    piscinaSiembraId !== null
      ? obtenerCicloActivo(piscinaSiembraId)
      : undefined;

  const siembraActual = cicloActivoSiembra?.siembra ?? null;

  const destinosPrecria =
    piscinaSiembra &&
    piscinaSiembra.tipo === 'Precría' &&
    cicloActivoSiembra
      ? obtenerDestinosPrecria(
          piscinaSiembra.id,
          cicloActivoSiembra.numero
        )
      : [];

  const totalTransferidoPrecria = destinosPrecria.reduce(
    (total, destino) => total + destino.cantidadSembrada,
    0
  );

  const diferenciaPrecria =
    siembraActual
      ? Math.max(
          siembraActual.cantidadSembrada - totalTransferidoPrecria,
          0
        )
      : 0;

  const supervivenciaPrecria =
    siembraActual && siembraActual.cantidadSembrada > 0
      ? (totalTransferidoPrecria /
          siembraActual.cantidadSembrada) *
        100
      : 0;

  const piscinasPrecriaDisponibles = useMemo(
    () =>
      piscinas.filter((piscina) => {
        if (piscina.id === piscinaSiembraId) return false;
        if (piscina.tipo !== 'Precría') return false;

        return obtenerCicloActivo(piscina.id)?.siembra != null;
      }),
    [piscinas, piscinaSiembraId]
  );

  const piscinasMadreDisponibles = useMemo(
    () =>
      piscinas.filter((piscina) => {
        if (piscina.id === piscinaSiembraId) return false;
        if (piscina.tipo !== 'Engorde') return false;

        return obtenerCicloActivo(piscina.id)?.siembra != null;
      }),
    [piscinas, piscinaSiembraId]
  );

  const piscinaOrigenSeleccionada = formularioSiembra.piscinaOrigenId
    ? piscinas.find(
        (piscina) => piscina.id === Number(formularioSiembra.piscinaOrigenId)
      ) ?? null
    : null;

  const cicloOrigenSeleccionado = piscinaOrigenSeleccionada
    ? obtenerCicloActivo(piscinaOrigenSeleccionada.id)
    : undefined;

  const siembraOrigenSeleccionada = cicloOrigenSeleccionado?.siembra ?? null;

  /* =======================================================
     PISCINA EN EDICIÓN
  ======================================================= */

  const piscinaEditando =
    editandoPiscinaId !== null
      ? piscinas.find((p) => p.id === editandoPiscinaId) ?? null
      : null;

  const cicloActivoPiscinaEditando = piscinaEditando
    ? obtenerCicloActivo(piscinaEditando.id)
    : undefined;

  /* =======================================================
     DATOS PARA TABLA
  ======================================================= */

  const piscinasFiltradas = useMemo(() => {
    return piscinas.filter((piscina) => {
      const texto = busqueda.trim().toLowerCase();

      const coincideBusqueda =
        piscina.nombre.toLowerCase().includes(texto) ||
        piscina.zona.toLowerCase().includes(texto);

      const coincideZona =
        zonaFiltro === 'Todas' || piscina.zona === zonaFiltro;

      const coincideEstado =
        estadoFiltro === 'Todos' || piscina.estado === estadoFiltro;

      return coincideBusqueda && coincideZona && coincideEstado;
    });
  }, [piscinas, busqueda, zonaFiltro, estadoFiltro]);

  /* =======================================================
     RESUMEN
  ======================================================= */

  const activas = piscinas.filter(
    (piscina) => piscina.estado === 'Activa'
  ).length;

  const descanso = piscinas.filter(
    (piscina) =>
      piscina.estado === 'Descanso' || piscina.estado === 'Disponible'
  ).length;

  const mantenimiento = piscinas.filter(
    (piscina) => piscina.estado === 'Mantenimiento'
  ).length;

  const piscinasSembradas = piscinas.filter((piscina) => {
    const ciclo = obtenerCicloActivo(piscina.id);

    return ciclo?.siembra != null;
  }).length;

  /* =======================================================
     NUEVA PISCINA
  ======================================================= */

  function abrirNuevaPiscina() {
    setEditandoPiscinaId(null);

    setFormularioPiscina(formularioPiscinaInicial);

    setMostrarFormularioPiscina(true);
  }

  /* =======================================================
     EDITAR PISCINA
  ======================================================= */

  function abrirEditarPiscina(piscina: Piscina) {
    setEditandoPiscinaId(piscina.id);

    setFormularioPiscina({
      nombre: piscina.nombre,
      zona: piscina.zona,
      hectareas: piscina.hectareas.toString(),
      estado: piscina.estado,
      tipo: piscina.tipo ?? 'Engorde',
      cicloInicial: piscina.cicloInicial.toString(),
    });

    setMostrarFormularioPiscina(true);
  }

  /* =======================================================
     CERRAR MODAL PISCINA
  ======================================================= */

  function cerrarFormularioPiscina() {
    setMostrarFormularioPiscina(false);

    setEditandoPiscinaId(null);

    setFormularioPiscina(formularioPiscinaInicial);
  }

  /* =======================================================
     GUARDAR PISCINA
  ======================================================= */

  function guardarPiscina(e: FormEvent) {
    e.preventDefault();

    try {
      if (editandoPiscinaId !== null) {
        /*
          Si existe un ciclo activo,
          NO permitimos cambiar manualmente
          el estado productivo.
        */

        editarPiscinaStore(editandoPiscinaId, {
          nombre: formularioPiscina.nombre,

          zona: formularioPiscina.zona,

          hectareas: Number(formularioPiscina.hectareas),

          tipo: formularioPiscina.tipo,

          ...(cicloActivoPiscinaEditando
            ? {}
            : {
                estado: formularioPiscina.estado,
              }),
        });

        alert('✅ Piscina actualizada correctamente.');
      } else {
        crearPiscina({
          nombre: formularioPiscina.nombre,

          zona: formularioPiscina.zona,

          hectareas: Number(formularioPiscina.hectareas),

          estado: formularioPiscina.estado,

          tipo: formularioPiscina.tipo,

          cicloInicial: Number(formularioPiscina.cicloInicial),
        });

        alert(
          '🌊 Piscina registrada correctamente. Ahora puedes ingresar su primera siembra.'
        );
      }

      cerrarFormularioPiscina();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Ocurrió un error.');
    }
  }

  /* =======================================================
     ELIMINAR PISCINA
  ======================================================= */

  function eliminarPiscina(piscina: Piscina) {
    const ciclos = obtenerCiclosPiscina(piscina.id);

    let mensaje = `¿Seguro que deseas eliminar la piscina ${piscina.nombre}?`;

    if (ciclos.length > 0) {
      mensaje =
        `⚠️ La piscina ${piscina.nombre} tiene ${ciclos.length} ciclo(s) registrado(s).\n\n` +
        'Si la eliminas también se eliminará su historial local de ciclos y siembras.\n\n' +
        '¿Deseas continuar?';
    }

    const confirmar = window.confirm(mensaje);

    if (!confirmar) return;

    eliminarPiscinaStore(piscina.id);

    alert('🗑️ Piscina eliminada.');
  }

  /* =======================================================
     ABRIR SIEMBRA
  ======================================================= */

  function abrirSiembra(piscina: Piscina) {
    setPiscinaSiembraId(piscina.id);

    const ciclo = obtenerCicloActivo(piscina.id);

    const siembra = ciclo?.siembra ?? null;

    /*
      Si ya existe siembra,
      primero mostramos el detalle.
    */

    if (siembra) {
      setFormularioSiembra({
        fecha: siembra.fecha,

        cantidadSembrada: siembra.cantidadSembrada.toString(),

        pesoInicial:
          siembra.pesoInicial !== null ? siembra.pesoInicial.toString() : '',

        procedencia: siembra.procedencia,

        nauplios: siembra.nauplios ?? [],

        laboratorios:
          siembra.laboratorios && siembra.laboratorios.length > 0
            ? siembra.laboratorios
            : siembra.procedencia
            ? [siembra.procedencia]
            : [],

        tipoOrigen: siembra.tipoOrigen ?? 'Directa',

        piscinaOrigenId: siembra.piscinaOrigenId
          ? String(siembra.piscinaOrigenId)
          : '',

        observacion: siembra.observacion,
      });

      setEditandoSiembra(false);
    } else {
      /*
        No tiene ciclo activo:
        preparamos una NUEVA siembra.
      */

      setFormularioSiembra(formularioSiembraInicial);

      setEditandoSiembra(true);
    }

    setNuevoNauplio('');
    setNuevoLaboratorio('');
    setMostrarSiembra(true);
  }

  /* =======================================================
     CERRAR SIEMBRA
  ======================================================= */

  function cerrarSiembra() {
    setMostrarSiembra(false);

    setPiscinaSiembraId(null);

    setEditandoSiembra(false);

    setFormularioSiembra(formularioSiembraInicial);

    setNuevoNauplio('');
    setNuevoLaboratorio('');
  }

  /* =======================================================
     AGREGAR / QUITAR NAUPLIOS Y LABORATORIOS
  ======================================================= */

  function agregarNauplio() {
    const valor = nuevoNauplio.trim();

    if (!valor) return;

    if (
      formularioSiembra.nauplios.some(
        (item) => item.toLowerCase() === valor.toLowerCase()
      )
    ) {
      alert('⚠️ Ese nauplio ya fue agregado.');
      return;
    }

    setFormularioSiembra({
      ...formularioSiembra,
      nauplios: [...formularioSiembra.nauplios, valor],
    });

    setNuevoNauplio('');
  }

  function quitarNauplio(indice: number) {
    setFormularioSiembra({
      ...formularioSiembra,
      nauplios: formularioSiembra.nauplios.filter(
        (_, posicion) => posicion !== indice
      ),
    });
  }

  function agregarLaboratorio() {
    const valor = nuevoLaboratorio.trim();

    if (!valor) return;

    if (
      formularioSiembra.laboratorios.some(
        (item) => item.toLowerCase() === valor.toLowerCase()
      )
    ) {
      alert('⚠️ Ese laboratorio ya fue agregado.');
      return;
    }

    setFormularioSiembra({
      ...formularioSiembra,
      laboratorios: [...formularioSiembra.laboratorios, valor],
      procedencia: [...formularioSiembra.laboratorios, valor].join(', '),
    });

    setNuevoLaboratorio('');
  }

  function quitarLaboratorio(indice: number) {
    const nuevos = formularioSiembra.laboratorios.filter(
      (_, posicion) => posicion !== indice
    );

    setFormularioSiembra({
      ...formularioSiembra,
      laboratorios: nuevos,
      procedencia: nuevos.join(', '),
    });
  }

  /* =======================================================
     GUARDAR SIEMBRA
  ======================================================= */

  function guardarSiembra(e: FormEvent) {
    e.preventDefault();

    if (!piscinaSiembra) return;

    try {
      if (!formularioSiembra.fecha) {
        throw new Error('Ingresa la fecha de siembra.');
      }

      if (
        !formularioSiembra.cantidadSembrada ||
        Number(formularioSiembra.cantidadSembrada) <= 0
      ) {
        throw new Error('Ingresa una cantidad sembrada válida.');
      }

      if (
        !formularioSiembra.pesoInicial ||
        Number(formularioSiembra.pesoInicial) <= 0
      ) {
        throw new Error('Ingresa un peso inicial válido.');
      }

      const tipoOrigen: TipoOrigenSiembra =
        piscinaSiembra.tipo === 'Precría'
          ? 'Directa'
          : formularioSiembra.tipoOrigen;

      let piscinaOrigenId: number | undefined;
      let piscinaOrigenNombre: string | undefined;
      let cicloOrigen: number | undefined;
      let fechaSiembraOrigen: string | undefined;
      let cantidadSembradaOrigen: number | undefined;
      let pesoInicialOrigen: number | null | undefined;
      let naupliosOrigen: string[] = [];
      let laboratoriosOrigen: string[] = [];

      if (tipoOrigen !== 'Directa') {
        piscinaOrigenId = Number(formularioSiembra.piscinaOrigenId);

        if (!piscinaOrigenId) {
          throw new Error(
            tipoOrigen === 'Precría'
              ? 'Selecciona la precría de origen.'
              : 'Selecciona la piscina madre.'
          );
        }

        const origen = piscinas.find((piscina) => piscina.id === piscinaOrigenId);
        const cicloOrigenActivo = origen
          ? obtenerCicloActivo(origen.id)
          : undefined;
        const siembraOrigen = cicloOrigenActivo?.siembra ?? null;

        if (!origen || !cicloOrigenActivo || !siembraOrigen) {
          throw new Error(
            'La piscina de origen debe tener una siembra activa para realizar la transferencia.'
          );
        }

        if (tipoOrigen === 'Precría' && origen.tipo !== 'Precría') {
          throw new Error('La piscina seleccionada no es una precría.');
        }

        piscinaOrigenNombre = origen.nombre;
        cicloOrigen = cicloOrigenActivo.numero;
        fechaSiembraOrigen = siembraOrigen.fecha;
        cantidadSembradaOrigen = siembraOrigen.cantidadSembrada;
        pesoInicialOrigen = siembraOrigen.pesoInicial;
        naupliosOrigen = [...(siembraOrigen.nauplios ?? [])];
        laboratoriosOrigen = [...(siembraOrigen.laboratorios ?? [])];
      }

      const naupliosFinales =
        tipoOrigen === 'Directa'
          ? formularioSiembra.nauplios
          : naupliosOrigen;

      const laboratoriosFinales =
        tipoOrigen === 'Directa'
          ? formularioSiembra.laboratorios
          : laboratoriosOrigen;

      const datos = {
        fecha: formularioSiembra.fecha,
        cantidadSembrada: Number(formularioSiembra.cantidadSembrada),
        pesoInicial: Number(formularioSiembra.pesoInicial),
        nauplios: naupliosFinales,
        laboratorios: laboratoriosFinales,
        procedencia: laboratoriosFinales.join(', '),
        tipoOrigen,
        piscinaOrigenId,
        piscinaOrigenNombre,
        cicloOrigen,
        fechaSiembraOrigen,
        cantidadSembradaOrigen,
        pesoInicialOrigen,
        naupliosOrigen,
        laboratoriosOrigen,
        observacion: formularioSiembra.observacion,
      };

      /*
        SI YA EXISTE UN CICLO ACTIVO,
        estamos editando la siembra.
      */

      if (cicloActivoSiembra && siembraActual) {
        actualizarSiembraActual(piscinaSiembra.id, datos);

        alert('✅ Siembra actualizada correctamente.');

        setEditandoSiembra(false);

        return;
      }

      /*
        SI NO HAY CICLO ACTIVO,
        AquaPro crea automáticamente
        el nuevo ciclo.
      */

      const nuevoCiclo = registrarNuevaSiembra({
        piscinaId: piscinaSiembra.id,

        ...datos,
      });

      alert(
        `🦐 Siembra registrada correctamente.\n\n🌱 Se inició automáticamente el Ciclo ${nuevoCiclo.numero}.`
      );

      cerrarSiembra();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'No se pudo registrar la siembra.'
      );
    }
  }

  /* =======================================================
     ELIMINAR SIEMBRA
  ======================================================= */

  function eliminarSiembra() {
    if (!piscinaSiembra) {
      return;
    }

    const confirmar = window.confirm(
      '⚠️ ¿Seguro que deseas eliminar esta siembra?\n\nEl ciclo activo creado con esta siembra también será eliminado.'
    );

    if (!confirmar) {
      return;
    }

    try {
      eliminarSiembraActual(piscinaSiembra.id);

      alert('🗑️ Siembra eliminada.');

      cerrarSiembra();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'No se pudo eliminar la siembra.'
      );
    }
  }

  /* =======================================================
     LIQUIDAR PRECRÍA
  ======================================================= */

  function abrirLiquidacionPrecria() {
    if (!piscinaSiembra || !cicloActivoSiembra || !siembraActual) {
      return;
    }

    if (piscinaSiembra.tipo !== 'Precría') {
      alert('Esta acción solamente está disponible para precrías.');
      return;
    }

    const destinos = obtenerDestinosPrecria(
      piscinaSiembra.id,
      cicloActivoSiembra.numero
    );

    if (destinos.length === 0) {
      alert(
        `⚠️ No se puede liquidar la precría ${piscinaSiembra.nombre}.\n\n` +
          `El Ciclo ${cicloActivoSiembra.numero} todavía no tiene ninguna transferencia o siembra de engorde registrada.\n\n` +
          'Primero registra al menos una piscina de Engorde utilizando esta precría como origen.'
      );
      return;
    }

    setFechaLiquidacionPrecria(
      new Date().toISOString().slice(0, 10)
    );

    setObservacionLiquidacionPrecria('');
    setMostrarLiquidacionPrecria(true);
  }

  function cerrarLiquidacionPrecria() {
    setMostrarLiquidacionPrecria(false);
    setFechaLiquidacionPrecria('');
    setObservacionLiquidacionPrecria('');
  }

  function confirmarLiquidacionPrecria(e: FormEvent) {
    e.preventDefault();

    if (!piscinaSiembra || !cicloActivoSiembra || !siembraActual) {
      return;
    }

    if (!fechaLiquidacionPrecria) {
      alert('⚠️ Ingresa la fecha de liquidación.');
      return;
    }

    const confirmar = window.confirm(
      `🔒 ¿Confirmas la liquidación de ${piscinaSiembra.nombre} - Ciclo ${cicloActivoSiembra.numero}?\n\n` +
        `Cantidad sembrada: ${siembraActual.cantidadSembrada.toLocaleString()} camarones\n` +
        `Total transferido: ${totalTransferidoPrecria.toLocaleString()} camarones\n` +
        `Diferencia: ${diferenciaPrecria.toLocaleString()} camarones\n` +
        `Supervivencia estimada: ${supervivenciaPrecria.toFixed(2)} %\n\n` +
        'El ciclo quedará cerrado y la precría pasará a Disponible.'
    );

    if (!confirmar) {
      return;
    }

    try {
      const resultado = liquidarPrecria(
        piscinaSiembra.id,
        {
          fecha: fechaLiquidacionPrecria,
          observacion: observacionLiquidacionPrecria,
        }
      );

      alert(
        `✅ Precría liquidada correctamente.\n\n` +
          `🔒 Ciclo ${resultado.cicloCerrado} finalizado.\n` +
          `🌱 Próximo: Ciclo ${resultado.proximoCiclo}.\n` +
          `🟢 ${resultado.piscina} quedó Disponible para una nueva siembra.`
      );

      cerrarLiquidacionPrecria();
      cerrarSiembra();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'No se pudo liquidar la precría.'
      );
    }
  }

  /* =======================================================
     CÁLCULOS
  ======================================================= */

  const cantidadSembrada = Number(formularioSiembra.cantidadSembrada) || 0;

  const hectareasPiscina = piscinaSiembra ? piscinaSiembra.hectareas : 0;

  const densidadInicial =
    cantidadSembrada > 0 && hectareasPiscina > 0
      ? cantidadSembrada / hectareasPiscina
      : 0;

  function calcularDiasCultivo(fecha: string) {
    if (!fecha) return 0;

    const inicio = new Date(`${fecha}T00:00:00`);

    const hoy = new Date();

    const diferencia = hoy.getTime() - inicio.getTime();

    const dias = Math.floor(diferencia / (1000 * 60 * 60 * 24));

    return Math.max(dias, 0);
  }

  function calcularDiasEntreFechas(
    fechaInicio?: string | null,
    fechaFin?: string | null
  ) {
    if (!fechaInicio || !fechaFin) return 0;

    const inicio = new Date(`${fechaInicio}T00:00:00`);
    const fin = new Date(`${fechaFin}T00:00:00`);
    const diferencia = fin.getTime() - inicio.getTime();

    return Math.max(
      Math.floor(diferencia / (1000 * 60 * 60 * 24)),
      0
    );
  }

  /* =======================================================
     PANTALLA
  ======================================================= */

  return (
    <div className="module-page">
      {/* ===================================================
          ENCABEZADO
      =================================================== */}

      <div className="module-heading">
        <div>
          <span className="module-eyebrow">Producción</span>

          <h1>🌊 Piscinas</h1>

          <p>
            Administra las piscinas, ciclos productivos y siembras de la finca.
          </p>
        </div>

        <button className="primary-button" onClick={abrirNuevaPiscina}>
          <span>＋</span>
          Nueva piscina
        </button>
      </div>

      {/* ===================================================
          TARJETAS
      =================================================== */}

      <section className="pool-summary-grid">
        <SummaryCard
          icon="🌊"
          value={piscinas.length.toString()}
          label="Total piscinas"
        />

        <SummaryCard
          icon="🟢"
          value={activas.toString()}
          label="En producción"
          detail={`${Math.round(
            (activas / Math.max(piscinas.length, 1)) * 100
          )}% del total`}
        />

        <SummaryCard
          icon="🦐"
          value={piscinasSembradas.toString()}
          label="Con siembra activa"
        />

        <SummaryCard
          icon="🌿"
          value={descanso.toString()}
          label="Disponibles / descanso"
        />

        <SummaryCard
          icon="🛠️"
          value={mantenimiento.toString()}
          label="Mantenimiento"
        />
      </section>

      {/* ===================================================
          PANEL
      =================================================== */}

      <section className="pools-panel">
        {/* TOOLBAR */}

        <div className="pools-toolbar">
          <div className="search-box">
            <span>⌕</span>

            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por piscina o zona..."
            />
          </div>

          <select
            value={zonaFiltro}
            onChange={(e) => setZonaFiltro(e.target.value)}
          >
            <option value="Todas">Todas las zonas</option>

            <option value="Norte">Zona Norte</option>

            <option value="Centro">Zona Centro</option>

            <option value="Sur">Zona Sur</option>
          </select>

          <select
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value)}
          >
            <option value="Todos">Todos los estados</option>

            <option value="Activa">En producción</option>

            <option value="Disponible">Disponible</option>

            <option value="Descanso">Descanso</option>

            <option value="Mantenimiento">Mantenimiento</option>

            <option value="Vacía">Vacía</option>
          </select>
        </div>

        {/* =================================================
            TABLA
        ================================================= */}

        <div className="table-responsive">
          <table className="pools-table">
            <thead>
              <tr>
                <th>Piscina</th>
                <th>Zona</th>
                <th>Tipo</th>
                <th>Área</th>
                <th>Ciclo actual</th>
                <th>Siembra</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {piscinasFiltradas.map((piscina) => {
                const cicloActivo = obtenerCicloActivo(piscina.id);

                const siembra = cicloActivo?.siembra ?? null;

                const proximoCiclo = !cicloActivo
                  ? obtenerProximoNumeroCiclo(piscina.id)
                  : null;

                return (
                  <tr key={piscina.id}>
                    {/* PISCINA */}

                    <td>
                      <div className="pool-name-cell">
                        <div className="pool-avatar">🌊</div>

                        <div>
                          <strong>{piscina.nombre}</strong>

                          <span>ID #{piscina.id}</span>
                        </div>
                      </div>
                    </td>

                    {/* ZONA */}

                    <td>{piscina.zona}</td>

                    {/* TIPO */}

                    <td>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 10px',
                          borderRadius: '999px',
                          background:
                            piscina.tipo === 'Precría' ? '#fff7e8' : '#eef8f6',
                          color:
                            piscina.tipo === 'Precría' ? '#a66a13' : '#1a796d',
                          fontSize: '12px',
                          fontWeight: 700,
                        }}
                      >
                        {piscina.tipo === 'Precría' ? '🍼 Precría' : '🌊 Engorde'}
                      </span>
                    </td>

                    {/* ÁREA */}

                    <td>
                      <strong>{piscina.hectareas.toFixed(2)}</strong> ha
                    </td>

                    {/* CICLO */}

                    <td>
                      {cicloActivo ? (
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '3px',
                          }}
                        >
                          <strong>🌱 Ciclo {cicloActivo.numero}</strong>

                          <span
                            style={{
                              fontSize: '12px',
                              color: '#628078',
                            }}
                          >
                            Ciclo activo
                          </span>
                        </div>
                      ) : (
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '3px',
                          }}
                        >
                          <strong
                            style={{
                              color: '#718188',
                            }}
                          >
                            Sin ciclo activo
                          </strong>

                          <span
                            style={{
                              fontSize: '12px',
                              color: '#8a989f',
                            }}
                          >
                            Próximo: Ciclo {proximoCiclo}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* SIEMBRA */}

                    <td>
                      {siembra ? (
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '3px',
                          }}
                        >
                          <strong>🦐 Sembrada</strong>

                          <span
                            style={{
                              fontSize: '12px',
                              color: '#6b7c84',
                            }}
                          >
                            {siembra.cantidadSembrada.toLocaleString()}{' '}
                            camarones
                          </span>
                        </div>
                      ) : (
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '3px',
                          }}
                        >
                          <strong
                            style={{
                              color: '#74868d',
                            }}
                          >
                            Sin siembra activa
                          </strong>

                          {piscina.estado !== 'Mantenimiento' && (
                            <span
                              style={{
                                fontSize: '12px',
                                color: '#6a9d8d',
                              }}
                            >
                              Lista para nueva siembra
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* ESTADO */}

                    <td>
                      <span
                        className={`pool-status ${estadoClase(piscina.estado)}`}
                      >
                        {emojiEstado(piscina.estado)}{' '}
                        {nombreEstado(piscina.estado)}
                      </span>
                    </td>

                    {/* ACCIONES */}

                    <td>
                      <div className="table-actions">
                        <button
                          title={
                            siembra
                              ? 'Ver siembra actual'
                              : piscina.estado === 'Mantenimiento'
                              ? 'Piscina en mantenimiento'
                              : `Registrar nueva siembra - Ciclo ${proximoCiclo}`
                          }
                          disabled={
                            !siembra && piscina.estado === 'Mantenimiento'
                          }
                          onClick={() => abrirSiembra(piscina)}
                          style={
                            !siembra && piscina.estado === 'Mantenimiento'
                              ? {
                                  opacity: 0.45,
                                  cursor: 'not-allowed',
                                }
                              : undefined
                          }
                        >
                          {siembra ? '🦐' : '🦐➕'}
                        </button>

                        <button
                          title="Editar piscina"
                          onClick={() => abrirEditarPiscina(piscina)}
                        >
                          ✏️
                        </button>

                        <button
                          title="Eliminar piscina"
                          onClick={() => eliminarPiscina(piscina)}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {piscinasFiltradas.length === 0 && (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-table">
                      🔎 No se encontraron piscinas con esos filtros.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="table-footer">
          Mostrando <strong>{piscinasFiltradas.length}</strong> de{' '}
          <strong>{piscinas.length}</strong> piscinas
        </div>
      </section>

      {/* ===================================================
          MODAL NUEVA / EDITAR PISCINA
      =================================================== */}

      {mostrarFormularioPiscina && (
        <div className="modal-backdrop" onClick={cerrarFormularioPiscina}>
          <div className="pool-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>
                  {editandoPiscinaId !== null
                    ? '✏️ Editar piscina'
                    : '🌊 Nueva piscina'}
                </h2>

                <p>
                  {editandoPiscinaId !== null
                    ? 'Actualiza la información general de la piscina.'
                    : 'Registra una nueva piscina y define el ciclo con el que comenzará.'}
                </p>
              </div>

              <button className="modal-close" onClick={cerrarFormularioPiscina}>
                ×
              </button>
            </div>

            <form onSubmit={guardarPiscina}>
              <div className="form-grid">
                <label>
                  Nombre de piscina
                  <input
                    value={formularioPiscina.nombre}
                    onChange={(e) =>
                      setFormularioPiscina({
                        ...formularioPiscina,
                        nombre: e.target.value,
                      })
                    }
                    placeholder="Ej. IS105"
                  />
                </label>

                <label>
                  Zona
                  <select
                    value={formularioPiscina.zona}
                    onChange={(e) =>
                      setFormularioPiscina({
                        ...formularioPiscina,
                        zona: e.target.value,
                      })
                    }
                  >
                    <option>Norte</option>
                    <option>Centro</option>
                    <option>Sur</option>
                  </select>
                </label>

                <label>
                  Tipo de piscina
                  <select
                    value={formularioPiscina.tipo}
                    onChange={(e) =>
                      setFormularioPiscina({
                        ...formularioPiscina,
                        tipo: e.target.value as TipoPiscina,
                      })
                    }
                  >
                    <option value="Engorde">🌊 Engorde</option>
                    <option value="Precría">🍼 Precría</option>
                  </select>
                </label>

                <label>
                  Área (hectáreas)
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formularioPiscina.hectareas}
                    onChange={(e) =>
                      setFormularioPiscina({
                        ...formularioPiscina,
                        hectareas: e.target.value,
                      })
                    }
                    placeholder="Ej. 18.85"
                  />
                </label>

                {/* NUEVA PISCINA */}

                {editandoPiscinaId === null && (
                  <>
                    <label>
                      Estado inicial
                      <select
                        value={formularioPiscina.estado}
                        onChange={(e) =>
                          setFormularioPiscina({
                            ...formularioPiscina,

                            estado: e.target.value as EstadoPiscina,
                          })
                        }
                      >
                        <option value="Disponible">Disponible</option>

                        <option value="Mantenimiento">Mantenimiento</option>
                      </select>
                    </label>

                    <label>
                      Ciclo inicial
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={formularioPiscina.cicloInicial}
                        onChange={(e) =>
                          setFormularioPiscina({
                            ...formularioPiscina,

                            cicloInicial: e.target.value,
                          })
                        }
                        placeholder="Ej. 1"
                      />
                    </label>
                  </>
                )}

                {/* EDITAR PISCINA */}

                {editandoPiscinaId !== null && (
                  <>
                    <label>
                      Estado
                      {cicloActivoPiscinaEditando ? (
                        <input value="Activa / En producción" disabled />
                      ) : (
                        <select
                          value={formularioPiscina.estado}
                          onChange={(e) =>
                            setFormularioPiscina({
                              ...formularioPiscina,

                              estado: e.target.value as EstadoPiscina,
                            })
                          }
                        >
                          <option value="Disponible">Disponible</option>

                          <option value="Descanso">Descanso</option>

                          <option value="Mantenimiento">Mantenimiento</option>

                          <option value="Vacía">Vacía</option>
                        </select>
                      )}
                    </label>

                    <label>
                      Ciclo inicial
                      <input
                        value={piscinaEditando?.cicloInicial ?? ''}
                        disabled
                      />
                    </label>
                  </>
                )}
              </div>

              {/* INFORMACIÓN CICLO */}

              {editandoPiscinaId !== null && (
                <div
                  style={{
                    marginTop: '14px',
                    padding: '14px',
                    borderRadius: '12px',
                    background: cicloActivoPiscinaEditando
                      ? '#eef8f6'
                      : '#f5f8f9',
                    color: '#60766f',
                    fontSize: '13px',
                    lineHeight: 1.5,
                  }}
                >
                  {cicloActivoPiscinaEditando ? (
                    <>
                      🌱 Esta piscina actualmente está en el{' '}
                      <strong>Ciclo {cicloActivoPiscinaEditando.numero}</strong>
                      . El número de ciclo y su estado productivo no se
                      modifican manualmente.
                    </>
                  ) : (
                    <>
                      🌿 Esta piscina no tiene un ciclo activo. La próxima
                      siembra iniciará automáticamente el{' '}
                      <strong>
                        Ciclo{' '}
                        {piscinaEditando
                          ? obtenerProximoNumeroCiclo(piscinaEditando.id)
                          : ''}
                      </strong>
                      .
                    </>
                  )}
                </div>
              )}

              {editandoPiscinaId === null && (
                <div
                  style={{
                    marginTop: '14px',
                    padding: '14px',
                    borderRadius: '12px',
                    background: '#eef8f6',
                    color: '#58716c',
                    fontSize: '13px',
                    lineHeight: 1.5,
                  }}
                >
                  💡 El <strong>ciclo inicial</strong> solamente se elige al
                  crear la piscina. Después AquaPro incrementará los ciclos
                  automáticamente cuando termine cada producción.
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={cerrarFormularioPiscina}
                >
                  Cancelar
                </button>

                <button type="submit" className="primary-button">
                  {editandoPiscinaId !== null
                    ? 'Guardar cambios'
                    : 'Registrar piscina'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================
          MODAL SIEMBRA
      =================================================== */}

      {mostrarSiembra && piscinaSiembra && (
        <div className="modal-backdrop" onClick={cerrarSiembra}>
          <div className="pool-modal" onClick={(e) => e.stopPropagation()}>
            {/* HEADER */}

            <div className="modal-header">
              <div>
                <h2>
                  {siembraActual ? '🦐 Siembra actual' : '🌱 Nueva siembra'}
                </h2>

                <p>
                  {piscinaSiembra.nombre} —{' '}
                  {cicloActivoSiembra
                    ? `Ciclo ${cicloActivoSiembra.numero}`
                    : `Nuevo Ciclo ${obtenerProximoNumeroCiclo(
                        piscinaSiembra.id
                      )}`}
                </p>
              </div>

              <button className="modal-close" onClick={cerrarSiembra}>
                ×
              </button>
            </div>

            {/* INFORMACIÓN AUTOMÁTICA */}

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: '10px',
                padding: '14px',
                background: '#f3f8f7',
                borderRadius: '12px',
                marginBottom: '18px',
              }}
            >
              <DatoAutomatico
                titulo="🌊 Piscina"
                valor={piscinaSiembra.nombre}
              />

              <DatoAutomatico
                titulo="🔄 Ciclo"
                valor={
                  cicloActivoSiembra
                    ? `Ciclo ${cicloActivoSiembra.numero}`
                    : `Ciclo ${obtenerProximoNumeroCiclo(piscinaSiembra.id)}`
                }
              />

              <DatoAutomatico
                titulo="📐 Área"
                valor={`${piscinaSiembra.hectareas.toFixed(2)} ha`}
              />

              <DatoAutomatico
                titulo="🏷️ Tipo"
                valor={piscinaSiembra.tipo === 'Precría' ? 'Precría' : 'Engorde'}
              />

              <DatoAutomatico titulo="🦐 Supervivencia inicial" valor="100 %" />
            </div>

            {/* ===========================================
                  VER SIEMBRA EXISTENTE
              =========================================== */}

            {siembraActual && !editandoSiembra ? (
              <>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gap: '12px',
                  }}
                >
                  <InfoSiembra
                    titulo="📅 Fecha de siembra"
                    valor={formatearFecha(siembraActual.fecha)}
                  />

                  <InfoSiembra
                    titulo="🦐 Cantidad sembrada"
                    valor={`${siembraActual.cantidadSembrada.toLocaleString()} camarones`}
                  />

                  <InfoSiembra
                    titulo="🦐 Densidad de siembra"
                    valor={`${Math.round(
                      siembraActual.cantidadSembrada / piscinaSiembra.hectareas
                    ).toLocaleString('es-EC')} larvas/ha`}
                  />

                  <InfoSiembra
                    titulo="⏱️ Días de cultivo"
                    valor={`${calcularDiasCultivo(siembraActual.fecha)} días`}
                  />

                  <InfoSiembra
                    titulo="⚖️ Peso inicial"
                    valor={
                      siembraActual.pesoInicial !== null
                        ? `${siembraActual.pesoInicial} g`
                        : 'No registrado'
                    }
                  />

                  {(siembraActual.tipoOrigen ?? 'Directa') === 'Directa' && (
                    <>
                      <InfoSiembra
                        titulo="🧫 Nauplios"
                        valor={
                          (siembraActual.nauplios ?? []).length > 0
                            ? (siembraActual.nauplios ?? []).join(' • ')
                            : 'No registrados'
                        }
                      />

                      <InfoSiembra
                        titulo="🧪 Laboratorios"
                        valor={
                          (siembraActual.laboratorios ?? []).length > 0
                            ? (siembraActual.laboratorios ?? []).join(' • ')
                            : siembraActual.procedencia || 'No registrados'
                        }
                      />
                    </>
                  )}
                </div>

                {(siembraActual.tipoOrigen ?? 'Directa') !== 'Directa' && (
                  <div
                    style={{
                      marginTop: '16px',
                      padding: '16px',
                      borderRadius: '16px',
                      background: '#f8fbfb',
                      border: '1px solid #dfecea',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                        marginBottom: '13px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div>
                        <strong style={{ color: '#244f49' }}>
                          🔁 Origen de la siembra
                        </strong>
                        <div
                          style={{
                            color: '#718781',
                            fontSize: '12px',
                            marginTop: '3px',
                          }}
                        >
                          Trazabilidad de la población antes de ingresar a esta piscina.
                        </div>
                      </div>

                      <span
                        style={{
                          padding: '7px 10px',
                          borderRadius: '999px',
                          background: '#eef8f6',
                          color: '#15796d',
                          fontSize: '12px',
                          fontWeight: 800,
                        }}
                      >
                        {siembraActual.tipoOrigen === 'Precría'
                          ? '🍼 Desde precría'
                          : '🔄 Madre / Hija'}
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                        gap: '12px',
                      }}
                    >
                      <InfoSiembra
                        titulo={
                          siembraActual.tipoOrigen === 'Precría'
                            ? '🍼 Precría de origen'
                            : '🌊 Piscina madre'
                        }
                        valor={siembraActual.piscinaOrigenNombre || 'No registrada'}
                      />

                      <InfoSiembra
                        titulo="🔄 Ciclo de origen"
                        valor={
                          siembraActual.cicloOrigen
                            ? `Ciclo ${siembraActual.cicloOrigen}`
                            : 'No registrado'
                        }
                      />

                      <InfoSiembra
                        titulo="📅 Fecha de siembra en origen"
                        valor={formatearFecha(siembraActual.fechaSiembraOrigen ?? '')}
                      />

                      <InfoSiembra
                        titulo="🦐 Cantidad sembrada en origen"
                        valor={
                          siembraActual.cantidadSembradaOrigen
                            ? `${siembraActual.cantidadSembradaOrigen.toLocaleString()} camarones`
                            : 'No registrada'
                        }
                      />

                      <InfoSiembra
                        titulo={
                          siembraActual.tipoOrigen === 'Precría'
                            ? '⚖️ Peso de siembra en precría'
                            : '⚖️ Peso inicial en piscina madre'
                        }
                        valor={
                          siembraActual.pesoInicialOrigen != null
                            ? `${siembraActual.pesoInicialOrigen} g`
                            : 'No registrado'
                        }
                      />

                      {siembraActual.tipoOrigen === 'Precría' && (
                        <InfoSiembra
                          titulo="⏱️ Días en precría"
                          valor={`${calcularDiasEntreFechas(
                            siembraActual.fechaSiembraOrigen,
                            siembraActual.fecha
                          )} días`}
                        />
                      )}

                      <InfoSiembra
                        titulo="🧫 Nauplios"
                        valor={
                          (siembraActual.naupliosOrigen ?? siembraActual.nauplios ?? [])
                            .length > 0
                            ? (
                                siembraActual.naupliosOrigen ??
                                siembraActual.nauplios ??
                                []
                              ).join(' • ')
                            : 'No registrados'
                        }
                      />

                      <InfoSiembra
                        titulo="🧪 Laboratorios"
                        valor={
                          (
                            siembraActual.laboratoriosOrigen ??
                            siembraActual.laboratorios ??
                            []
                          ).length > 0
                            ? (
                                siembraActual.laboratoriosOrigen ??
                                siembraActual.laboratorios ??
                                []
                              ).join(' • ')
                            : siembraActual.procedencia || 'No registrados'
                        }
                      />
                    </div>
                  </div>
                )}

                {siembraActual.observacion && (
                  <div
                    style={{
                      marginTop: '14px',
                      padding: '14px',
                      background: '#f7f9fa',
                      borderRadius: '10px',
                    }}
                  >
                    <small
                      style={{
                        display: 'block',
                        color: '#75858c',
                        marginBottom: '5px',
                      }}
                    >
                      📝 Observación
                    </small>

                    <p
                      style={{
                        margin: 0,
                      }}
                    >
                      {siembraActual.observacion}
                    </p>
                  </div>
                )}

                {/* AVISO CICLO */}

                <div
                  style={{
                    marginTop: '14px',
                    padding: '14px',
                    borderRadius: '12px',
                    background: '#eef8f6',
                    color: '#58716c',
                    fontSize: '13px',
                  }}
                >
                  🟢 Esta siembra pertenece al{' '}
                  <strong>Ciclo {cicloActivoSiembra?.numero}</strong> y
                  actualmente está en producción.
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={eliminarSiembra}
                  >
                    🗑️ Eliminar
                  </button>

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setEditandoSiembra(true)}
                  >
                    ✏️ Editar siembra
                  </button>

                  {piscinaSiembra?.tipo === 'Precría' &&
                    cicloActivoSiembra && (
                      <button
                        type="button"
                        className="primary-button"
                        onClick={abrirLiquidacionPrecria}
                      >
                        🔒 Liquidar precría
                      </button>
                    )}
                </div>
              </>
            ) : (
              /* =========================================
                   FORMULARIO NUEVA / EDITAR SIEMBRA
                ========================================= */

              <form onSubmit={guardarSiembra}>
                {!siembraActual && (
                  <div
                    style={{
                      marginBottom: '16px',
                      padding: '14px',
                      borderRadius: '12px',
                      background: '#eef8f6',
                      color: '#58716c',
                      fontSize: '13px',
                      lineHeight: 1.5,
                    }}
                  >
                    🌱 Al registrar esta siembra, iniciará automáticamente el{' '}
                    <strong>
                      Ciclo {obtenerProximoNumeroCiclo(piscinaSiembra.id)}
                    </strong>
                    .
                  </div>
                )}

                {piscinaSiembra.tipo === 'Engorde' && (
                  <div
                    style={{
                      marginBottom: '16px',
                      padding: '16px',
                      borderRadius: '16px',
                      background: '#f8fbfb',
                      border: '1px solid #dfecea',
                    }}
                  >
                    <strong
                      style={{
                        display: 'block',
                        color: '#284f49',
                        marginBottom: '11px',
                      }}
                    >
                      🔁 Origen de la siembra
                    </strong>

                    <div className="form-grid">
                      <label>
                        Tipo de origen
                        <select
                          value={formularioSiembra.tipoOrigen}
                          onChange={(e) =>
                            setFormularioSiembra({
                              ...formularioSiembra,
                              tipoOrigen: e.target.value as TipoOrigenSiembra,
                              piscinaOrigenId: '',
                            })
                          }
                        >
                          <option value="Directa">Siembra directa</option>
                          <option value="Precría">Desde precría</option>
                          <option value="Madre/Hija">Madre / Hija</option>
                        </select>
                      </label>

                      {formularioSiembra.tipoOrigen !== 'Directa' && (
                        <label>
                          {formularioSiembra.tipoOrigen === 'Precría'
                            ? 'Precría de origen'
                            : 'Piscina madre'}
                          <select
                            required
                            value={formularioSiembra.piscinaOrigenId}
                            onChange={(e) =>
                              setFormularioSiembra({
                                ...formularioSiembra,
                                piscinaOrigenId: e.target.value,
                              })
                            }
                          >
                            <option value="">
                              {formularioSiembra.tipoOrigen === 'Precría'
                                ? 'Seleccionar precría...'
                                : 'Seleccionar piscina madre...'}
                            </option>

                            {(formularioSiembra.tipoOrigen === 'Precría'
                              ? piscinasPrecriaDisponibles
                              : piscinasMadreDisponibles
                            ).map((origen) => {
                              const ciclo = obtenerCicloActivo(origen.id);

                              return (
                                <option key={origen.id} value={origen.id}>
                                  {origen.nombre} — Ciclo {ciclo?.numero ?? '-'}
                                </option>
                              );
                            })}
                          </select>
                        </label>
                      )}
                    </div>

                    {formularioSiembra.tipoOrigen !== 'Directa' &&
                      siembraOrigenSeleccionada &&
                      piscinaOrigenSeleccionada && (
                        <div
                          style={{
                            marginTop: '14px',
                            padding: '14px',
                            borderRadius: '13px',
                            background: '#ffffff',
                            border: '1px solid #e3ecea',
                          }}
                        >
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns:
                                'repeat(2, minmax(0, 1fr))',
                              gap: '10px',
                            }}
                          >
                            <DatoAutomatico
                              titulo="🌊 Piscina origen"
                              valor={piscinaOrigenSeleccionada.nombre}
                            />
                            <DatoAutomatico
                              titulo="🔄 Ciclo"
                              valor={`Ciclo ${cicloOrigenSeleccionado?.numero ?? '-'}`}
                            />
                            <DatoAutomatico
                              titulo="📅 Siembra en origen"
                              valor={formatearFecha(siembraOrigenSeleccionada.fecha)}
                            />
                            <DatoAutomatico
                              titulo="🦐 Cantidad original"
                              valor={`${siembraOrigenSeleccionada.cantidadSembrada.toLocaleString()} camarones`}
                            />
                            <DatoAutomatico
                              titulo="⚖️ Peso de siembra en origen"
                              valor={
                                siembraOrigenSeleccionada.pesoInicial != null
                                  ? `${siembraOrigenSeleccionada.pesoInicial} g`
                                  : 'No registrado'
                              }
                            />
                            <DatoAutomatico
                              titulo="🧫 Nauplios"
                              valor={
                                (siembraOrigenSeleccionada.nauplios ?? []).length > 0
                                  ? (siembraOrigenSeleccionada.nauplios ?? []).join(' • ')
                                  : 'No registrados'
                              }
                            />
                            <DatoAutomatico
                              titulo="🧪 Laboratorios"
                              valor={
                                (siembraOrigenSeleccionada.laboratorios ?? []).length > 0
                                  ? (siembraOrigenSeleccionada.laboratorios ?? []).join(' • ')
                                  : siembraOrigenSeleccionada.procedencia || 'No registrados'
                              }
                            />
                          </div>

                          <div
                            style={{
                              marginTop: '11px',
                              color: '#607b75',
                              fontSize: '12px',
                              lineHeight: 1.5,
                            }}
                          >
                            💡 Estos datos se usan únicamente como trazabilidad.
                            La <strong>cantidad sembrada</strong> y el{' '}
                            <strong>peso inicial</strong> de la piscina destino se
                            ingresan nuevamente abajo porque pueden cambiar durante
                            la transferencia.
                          </div>
                        </div>
                      )}
                  </div>
                )}

                <div className="form-grid">
                  <label>
                    Fecha de siembra
                    <input
                      type="date"
                      required
                      value={formularioSiembra.fecha}
                      onChange={(e) =>
                        setFormularioSiembra({
                          ...formularioSiembra,

                          fecha: e.target.value,
                        })
                      }
                    />
                  </label>

                  <label>
                    Cantidad sembrada
                    <input
                      type="number"
                      min="1"
                      step="1"
                      required
                      value={formularioSiembra.cantidadSembrada}
                      onChange={(e) =>
                        setFormularioSiembra({
                          ...formularioSiembra,

                          cantidadSembrada: e.target.value,
                        })
                      }
                      placeholder="Ej. 2500000"
                    />
                  </label>

                  <label>
                    ⚖️ Peso inicial (g) *
                    <input
                      type="number"
                      min="0.001"
                      step="0.001"
                      required
                      value={formularioSiembra.pesoInicial}
                      onChange={(e) =>
                        setFormularioSiembra({
                          ...formularioSiembra,

                          pesoInicial: e.target.value,
                        })
                      }
                      placeholder="Ej. 0.015"
                    />
                  </label>
                </div>

                {(piscinaSiembra.tipo === 'Precría' ||
                  formularioSiembra.tipoOrigen === 'Directa') && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                      gap: '14px',
                      marginTop: '16px',
                    }}
                  >
                    <ListaMultiple
                      titulo="🧫 Nauplios"
                      placeholder="Ej. Nauplio N5..."
                      valor={nuevoNauplio}
                      onChange={setNuevoNauplio}
                      onAgregar={agregarNauplio}
                      items={formularioSiembra.nauplios}
                      onQuitar={quitarNauplio}
                    />

                    <ListaMultiple
                      titulo="🧪 Laboratorios"
                      placeholder="Ej. Laboratorio..."
                      valor={nuevoLaboratorio}
                      onChange={setNuevoLaboratorio}
                      onAgregar={agregarLaboratorio}
                      items={formularioSiembra.laboratorios}
                      onQuitar={quitarLaboratorio}
                    />
                  </div>
                )}

                {/* CÁLCULO DENSIDAD */}

                {cantidadSembrada > 0 && (
                  <div
                    style={{
                      marginTop: '16px',
                      padding: '14px',
                      background: '#eef8f6',
                      borderRadius: '12px',
                    }}
                  >
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                        gap: '12px',
                      }}
                    >
                      <div>
                        <small>📐 Área total</small>

                        <div>
                          <strong>
                            {hectareasPiscina.toLocaleString('es-EC', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}{' '}
                            ha
                          </strong>
                        </div>
                      </div>

                      <div>
                        <small>🦐 Densidad de siembra</small>

                        <div>
                          <strong>
                            {Math.round(densidadInicial).toLocaleString(
                              'es-EC'
                            )}{' '}
                            larvas/ha
                          </strong>
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: '10px',
                        fontSize: '13px',
                        color: '#58716c',
                      }}
                    >
                      Cálculo: {cantidadSembrada.toLocaleString('es-EC')} larvas
                      ÷{' '}
                      {hectareasPiscina.toLocaleString('es-EC', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      ha ={' '}
                      <strong>
                        {Math.round(densidadInicial).toLocaleString('es-EC')}{' '}
                        larvas/ha
                      </strong>
                    </div>
                  </div>
                )}

                <label
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '7px',
                    marginTop: '16px',
                  }}
                >
                  Observación
                  <textarea
                    rows={3}
                    value={formularioSiembra.observacion}
                    onChange={(e) =>
                      setFormularioSiembra({
                        ...formularioSiembra,

                        observacion: e.target.value,
                      })
                    }
                    placeholder="Observaciones de la siembra..."
                  />
                </label>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={
                      siembraActual
                        ? () => setEditandoSiembra(false)
                        : cerrarSiembra
                    }
                  >
                    Cancelar
                  </button>

                  <button type="submit" className="primary-button">
                    {siembraActual
                      ? 'Guardar cambios'
                      : `🌱 Iniciar Ciclo ${obtenerProximoNumeroCiclo(
                          piscinaSiembra.id
                        )}`}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ===================================================
          MODAL LIQUIDACIÓN PRECRÍA
      =================================================== */}

      {mostrarLiquidacionPrecria &&
        piscinaSiembra &&
        cicloActivoSiembra &&
        siembraActual && (
          <div
            className="modal-backdrop"
            onClick={cerrarLiquidacionPrecria}
          >
            <div
              className="pool-modal"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '760px' }}
            >
              <div className="modal-header">
                <div>
                  <h2>🔒 Liquidar precría</h2>
                  <p>
                    {piscinaSiembra.nombre} — Ciclo{' '}
                    {cicloActivoSiembra.numero}
                  </p>
                </div>

                <button
                  className="modal-close"
                  type="button"
                  onClick={cerrarLiquidacionPrecria}
                >
                  ×
                </button>
              </div>

              <form onSubmit={confirmarLiquidacionPrecria}>
                <div
                  style={{
                    padding: '14px',
                    borderRadius: '14px',
                    background: '#f3f8f7',
                    marginBottom: '16px',
                  }}
                >
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns:
                        'repeat(2, minmax(0, 1fr))',
                      gap: '10px',
                    }}
                  >
                    <DatoAutomatico
                      titulo="🌊 Precría"
                      valor={piscinaSiembra.nombre}
                    />

                    <DatoAutomatico
                      titulo="🔄 Ciclo"
                      valor={`Ciclo ${cicloActivoSiembra.numero}`}
                    />

                    <DatoAutomatico
                      titulo="📅 Fecha de siembra"
                      valor={formatearFecha(siembraActual.fecha)}
                    />

                    <DatoAutomatico
                      titulo="🦐 Cantidad inicial"
                      valor={`${siembraActual.cantidadSembrada.toLocaleString()} camarones`}
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      'repeat(2, minmax(0, 1fr))',
                    gap: '12px',
                  }}
                >
                  <InfoSiembra
                    titulo="➡️ Total transferido"
                    valor={`${totalTransferidoPrecria.toLocaleString()} camarones`}
                  />

                  <InfoSiembra
                    titulo="📉 Diferencia"
                    valor={`${diferenciaPrecria.toLocaleString()} camarones`}
                  />

                  <InfoSiembra
                    titulo="📊 Supervivencia estimada"
                    valor={`${supervivenciaPrecria.toFixed(2)} %`}
                  />

                  <InfoSiembra
                    titulo="🌊 Piscinas destino"
                    valor={`${destinosPrecria.length} registrada${
                      destinosPrecria.length === 1 ? '' : 's'
                    }`}
                  />
                </div>

                <div
                  style={{
                    marginTop: '16px',
                    padding: '16px',
                    borderRadius: '14px',
                    border: '1px solid #dfecea',
                    background: '#f8fbfb',
                  }}
                >
                  <strong
                    style={{
                      display: 'block',
                      color: '#284f49',
                      marginBottom: '10px',
                    }}
                  >
                    ➡️ Transferencias / siembras destino
                  </strong>

                  {destinosPrecria.length > 0 ? (
                    <div
                      style={{
                        display: 'grid',
                        gap: '10px',
                      }}
                    >
                      {destinosPrecria.map((destino) => (
                        <div
                          key={`${destino.piscinaId}-${destino.ciclo}`}
                          style={{
                            padding: '12px 13px',
                            borderRadius: '11px',
                            background: '#ffffff',
                            border: '1px solid #e3ecea',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '12px',
                            flexWrap: 'wrap',
                          }}
                        >
                          <div>
                            <strong>
                              🌊 {destino.piscinaNombre}
                            </strong>

                            <div
                              style={{
                                marginTop: '4px',
                                color: '#718781',
                                fontSize: '12px',
                              }}
                            >
                              Ciclo {destino.ciclo} ·{' '}
                              {formatearFecha(destino.fecha)}
                            </div>
                          </div>

                          <div
                            style={{
                              textAlign: 'right',
                            }}
                          >
                            <strong>
                              {destino.cantidadSembrada.toLocaleString()}{' '}
                              camarones
                            </strong>

                            <div
                              style={{
                                marginTop: '4px',
                                color: '#718781',
                                fontSize: '12px',
                              }}
                            >
                              Peso inicial:{' '}
                              {destino.pesoInicial !== null
                                ? `${destino.pesoInicial} g`
                                : 'No registrado'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: '13px',
                        borderRadius: '10px',
                        background: '#fff8e8',
                        color: '#8a6b25',
                        fontSize: '13px',
                        lineHeight: 1.5,
                      }}
                    >
                      ⚠️ No hay transferencias registradas para este ciclo.
                    </div>
                  )}
                </div>

                <div
                  className="form-grid"
                  style={{ marginTop: '16px' }}
                >
                  <label>
                    📅 Fecha de liquidación
                    <input
                      type="date"
                      required
                      min={siembraActual.fecha}
                      value={fechaLiquidacionPrecria}
                      onChange={(e) =>
                        setFechaLiquidacionPrecria(e.target.value)
                      }
                    />
                  </label>

                  <label>
                    📝 Observación
                    <input
                      value={observacionLiquidacionPrecria}
                      onChange={(e) =>
                        setObservacionLiquidacionPrecria(
                          e.target.value
                        )
                      }
                      placeholder="Opcional"
                    />
                  </label>
                </div>

                <div
                  style={{
                    marginTop: '16px',
                    padding: '14px',
                    borderRadius: '12px',
                    background: '#eef8f6',
                    color: '#58716c',
                    fontSize: '13px',
                    lineHeight: 1.5,
                  }}
                >
                  💡 Al confirmar, el{' '}
                  <strong>
                    Ciclo {cicloActivoSiembra.numero}
                  </strong>{' '}
                  quedará guardado como finalizado. La precría{' '}
                  <strong>{piscinaSiembra.nombre}</strong> pasará a{' '}
                  <strong>Disponible</strong> y la próxima siembra
                  iniciará automáticamente el{' '}
                  <strong>
                    Ciclo {cicloActivoSiembra.numero + 1}
                  </strong>
                  .
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={cerrarLiquidacionPrecria}
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    className="primary-button"
                  >
                    🔒 Confirmar liquidación
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
    </div>
  );
}

/* =========================================================
   TARJETA DE RESUMEN
========================================================= */

function SummaryCard({
  icon,
  value,
  label,
  detail,
}: {
  icon: string;
  value: string;
  label: string;
  detail?: string;
}) {
  return (
    <div className="pool-summary-card">
      <div className="summary-icon">{icon}</div>

      <div>
        <strong>{value}</strong>

        <span>{label}</span>

        {detail && <small>{detail}</small>}
      </div>
    </div>
  );
}

/* =========================================================
   LISTA MÚLTIPLE
========================================================= */

function ListaMultiple({
  titulo,
  placeholder,
  valor,
  onChange,
  onAgregar,
  items,
  onQuitar,
}: {
  titulo: string;
  placeholder: string;
  valor: string;
  onChange: (valor: string) => void;
  onAgregar: () => void;
  items: string[];
  onQuitar: (indice: number) => void;
}) {
  const esNauplio = titulo.toLowerCase().includes('nauplio');

  const colorPrincipal = esNauplio ? '#4f86f7' : '#35b98a';
  const colorSuave = esNauplio ? '#eef5ff' : '#eefaf6';
  const colorBorde = esNauplio ? '#d9e7ff' : '#d8f0e7';

  return (
    <div
      style={{
        padding: '18px',
        borderRadius: '18px',
        background: '#ffffff',
        border: `1px solid ${colorBorde}`,
        boxShadow: '0 8px 24px rgba(31, 78, 68, 0.06)',
      }}
    >
      {/* CABECERA */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          marginBottom: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: colorSuave,
              fontSize: '21px',
            }}
          >
            {esNauplio ? '🦐' : '🧪'}
          </div>

          <strong
            style={{
              fontSize: '16px',
              color: '#284b45',
            }}
          >
            {esNauplio ? 'Nauplios' : 'Laboratorios'}
          </strong>
        </div>

        <div
          style={{
            padding: '7px 11px',
            borderRadius: '10px',
            background: colorSuave,
            color: colorPrincipal,
            fontSize: '11px',
            fontWeight: 700,
          }}
        >
          ⓘ Puedes agregar varios
        </div>
      </div>

      {/* INPUT + BOTÓN */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '9px',
            padding: '0 14px',
            height: '46px',
            borderRadius: '13px',
            background: '#f8fafb',
            border: '1px solid #e4ebe9',
            transition: 'all 0.2s ease',
          }}
        >
          <span
            style={{
              fontSize: '17px',
              opacity: 0.8,
              flexShrink: 0,
            }}
          >
            {esNauplio ? '🦐' : '🏢'}
          </span>

          <input
            type="text"
            value={valor}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onAgregar();
              }
            }}
            placeholder={placeholder}
            style={{
              width: '100%',
              border: 'none',
              outline: 'none',
              background: 'transparent',
              color: '#334b47',
              fontSize: '14px',
              fontFamily: 'inherit',
              padding: 0,
              boxShadow: 'none',
            }}
          />
        </div>

        <button
          type="button"
          onClick={onAgregar}
          style={{
            height: '46px',
            padding: '0 18px',
            border: 'none',
            borderRadius: '13px',
            background: colorPrincipal,
            color: '#ffffff',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            boxShadow: esNauplio
              ? '0 7px 16px rgba(79, 134, 247, 0.20)'
              : '0 7px 16px rgba(53, 185, 138, 0.20)',
            transition: 'transform 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          ＋ Agregar
        </button>
      </div>

      {/* ELEMENTOS AGREGADOS */}
      {items.length > 0 ? (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            marginTop: '14px',
          }}
        >
          {items.map((item, indice) => (
            <div
              key={`${item}-${indice}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '7px 8px 7px 11px',
                borderRadius: '999px',
                background: colorSuave,
                border: `1px solid ${colorBorde}`,
                color: '#385852',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              <span>
                {esNauplio ? '🦐' : '🧪'} {item}
              </span>

              <button
                type="button"
                onClick={() => onQuitar(indice)}
                title={`Eliminar ${item}`}
                style={{
                  width: '21px',
                  height: '21px',
                  borderRadius: '50%',
                  border: 'none',
                  background: '#ffffff',
                  color: '#738783',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 700,
                  padding: 0,
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{
            marginTop: '11px',
            color: '#8a9b97',
            fontSize: '11px',
          }}
        >
          {esNauplio
            ? '🦐 Aún no has agregado nauplios.'
            : '🧪 Aún no has agregado laboratorios.'}
        </div>
      )}
    </div>
  );
}
/* =========================================================
   INFO SIEMBRA
========================================================= */

function InfoSiembra({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div
      style={{
        padding: '12px',
        border: '1px solid #e4ecea',
        borderRadius: '10px',
        background: '#ffffff',
      }}
    >
      <small
        style={{
          display: 'block',
          color: '#75858c',
          marginBottom: '4px',
        }}
      >
        {titulo}
      </small>

      <strong>{valor}</strong>
    </div>
  );
}

/* =========================================================
   DATOS AUTOMÁTICOS
========================================================= */

function DatoAutomatico({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div>
      <small
        style={{
          display: 'block',
          color: '#75858c',
          marginBottom: '3px',
        }}
      >
        {titulo}
      </small>

      <strong>{valor}</strong>
    </div>
  );
}

/* =========================================================
   ESTADOS
========================================================= */

function estadoClase(estado: EstadoPiscina) {
  if (estado === 'Activa') {
    return 'pool-status-active';
  }

  if (estado === 'Descanso' || estado === 'Disponible') {
    return 'pool-status-rest';
  }

  if (estado === 'Mantenimiento') {
    return 'pool-status-maintenance';
  }

  return 'pool-status-empty';
}

function emojiEstado(estado: EstadoPiscina) {
  if (estado === 'Activa') {
    return '🟢';
  }

  if (estado === 'Disponible') {
    return '💤';
  }

  if (estado === 'Descanso') {
    return '🌙';
  }

  if (estado === 'Mantenimiento') {
    return '🛠️';
  }

  return '⚪';
}

function nombreEstado(estado: EstadoPiscina) {
  if (estado === 'Activa') {
    return 'En producción';
  }

  return estado;
}

/* =========================================================
   FECHAS
========================================================= */

function formatearFecha(fecha: string) {
  if (!fecha) {
    return 'No registrada';
  }

  const partes = fecha.split('-');

  if (partes.length !== 3) {
    return fecha;
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}
