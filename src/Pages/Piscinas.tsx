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
  type Piscina,
  type EstadoPiscina,
} from '../store/aquaProStore';

/* =========================================================
   FORMULARIOS
========================================================= */

const formularioPiscinaInicial = {
  nombre: '',
  zona: 'Norte',
  hectareas: '',
  estado: 'Disponible' as EstadoPiscina,
  cicloInicial: '1',
};

const formularioSiembraInicial = {
  fecha: '',
  cantidadSembrada: '',
  pesoInicial: '',
  procedencia: '',
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
  }

  /* =======================================================
     GUARDAR SIEMBRA
  ======================================================= */

  function guardarSiembra(e: FormEvent) {
    e.preventDefault();

    if (!piscinaSiembra) return;

    try {
      const datos = {
        fecha: formularioSiembra.fecha,

        cantidadSembrada: Number(formularioSiembra.cantidadSembrada),

        pesoInicial: formularioSiembra.pesoInicial
          ? Number(formularioSiembra.pesoInicial)
          : null,

        procedencia: formularioSiembra.procedencia,

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
                  <td colSpan={7}>
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

                  <InfoSiembra
                    titulo="🧪 Procedencia"
                    valor={siembraActual.procedencia || 'No registrada'}
                  />
                </div>

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
                    onClick={cerrarSiembra}
                  >
                    Cerrar
                  </button>

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={eliminarSiembra}
                  >
                    🗑️ Eliminar
                  </button>

                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => setEditandoSiembra(true)}
                  >
                    ✏️ Editar siembra
                  </button>
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

                <div className="form-grid">
                  <label>
                    Fecha de siembra
                    <input
                      type="date"
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
                    Peso inicial (g)
                    <input
                      type="number"
                      min="0"
                      step="0.001"
                      value={formularioSiembra.pesoInicial}
                      onChange={(e) =>
                        setFormularioSiembra({
                          ...formularioSiembra,

                          pesoInicial: e.target.value,
                        })
                      }
                      placeholder="Opcional"
                    />
                  </label>

                  <label>
                    Procedencia / Laboratorio
                    <input
                      value={formularioSiembra.procedencia}
                      onChange={(e) =>
                        setFormularioSiembra({
                          ...formularioSiembra,

                          procedencia: e.target.value,
                        })
                      }
                      placeholder="Ej. Laboratorio..."
                    />
                  </label>
                </div>

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
