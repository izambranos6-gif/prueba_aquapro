import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Edit3, Package, Plus, Search, X } from 'lucide-react';

import { useAquaProStore, obtenerCicloActivo } from '../store/aquaProStore';

const ALIMENTACION_STORAGE_KEY = 'aquapro-alimentacion-v2';

type PiscinaProduccion = {
  id: number;
  nombre: string;
  zona: string;
  hectareas: number;
  cicloActual: number;
  estado: string;
  fechaSiembra: string | null;
};

type RegistroAlimentacion = {
  id: number;
  piscinaId: number;
  ciclo: number;
  fecha: string;
  tipoBalanceado: string;
  nombreBalanceado?: string;
  cantidadKg: number;
  observacion: string;
};



const tiposBalanceado = [
  'Preinicio',
  'Inicio',
  'Crecimiento',
  'Engorde',
  'Finalizador',
  'Otro',
];

function formatoNumero(valor: number, decimales = 2) {
  const numero = Number(valor);

  if (!Number.isFinite(numero)) {
    return '0';
  }

  return new Intl.NumberFormat('es-EC', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(numero);
}

function formatoFecha(fecha: string) {
  if (!fecha) return '-';

  const [anio, mes, dia] = fecha.split('-');

  return `${dia}/${mes}/${anio}`;
}

export default function Alimentacion() {
  const { piscinas: piscinasStore } = useAquaProStore();

  const piscinas = useMemo<PiscinaProduccion[]>(
    () =>
      piscinasStore
        .map((piscina) => {
          const cicloActivo = obtenerCicloActivo(piscina.id);
          if (!cicloActivo?.siembra) return null;

          return {
            id: piscina.id,
            nombre: piscina.nombre,
            zona: piscina.zona,
            hectareas: piscina.hectareas,
            cicloActual: cicloActivo.numero,
            estado: 'Activa',
            fechaSiembra: cicloActivo.siembra.fecha,
          };
        })
        .filter((piscina): piscina is PiscinaProduccion => piscina !== null),
    [piscinasStore]
  );

  const [registros, setRegistros] = useState<RegistroAlimentacion[]>(() => {
    try {
      const guardado = localStorage.getItem(ALIMENTACION_STORAGE_KEY);
      if (guardado) {
        const datos = JSON.parse(guardado);

        if (Array.isArray(datos)) {
          return datos
            .filter((item) => item && typeof item === 'object')
            .map((item) => ({
              id: Number(item.id) || Date.now() + Math.random(),
              piscinaId: Number(item.piscinaId) || 0,
              ciclo: Number(item.ciclo) || 0,
              fecha: typeof item.fecha === 'string' ? item.fecha : '',
              tipoBalanceado:
                typeof item.tipoBalanceado === 'string' &&
                item.tipoBalanceado.trim()
                  ? item.tipoBalanceado
                  : 'Sin tipo',
              nombreBalanceado:
                typeof item.nombreBalanceado === 'string'
                  ? item.nombreBalanceado
                  : '',
              cantidadKg: Number(item.cantidadKg) || 0,
              observacion:
                typeof item.observacion === 'string' ? item.observacion : '',
            }));
        }
      }
    } catch (error) {
      console.error('No se pudo cargar la alimentación:', error);
    }
    return [];
  });

  const [piscinaSeleccionadaId, setPiscinaSeleccionadaId] = useState(0);

  const [busqueda, setBusqueda] = useState('');

  const [fechaDesde, setFechaDesde] = useState('');

  const [fechaHasta, setFechaHasta] = useState('');

  const [modalAbierto, setModalAbierto] = useState(false);

  const [registroEditando, setRegistroEditando] =
    useState<RegistroAlimentacion | null>(null);

  const [fecha, setFecha] = useState('');

  const [tipoBalanceado, setTipoBalanceado] = useState('Engorde');

  const [nombreBalanceado, setNombreBalanceado] = useState('');

  const [otroBalanceado, setOtroBalanceado] = useState('');

  const [cantidadKg, setCantidadKg] = useState('');

  const [observacion, setObservacion] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem(ALIMENTACION_STORAGE_KEY, JSON.stringify(registros));
    } catch (error) {
      console.error('No se pudo guardar la alimentación:', error);
    }
  }, [registros]);

  useEffect(() => {
    if (piscinas.length === 0) {
      if (piscinaSeleccionadaId !== 0) setPiscinaSeleccionadaId(0);
      return;
    }

    if (!piscinas.some((p) => p.id === piscinaSeleccionadaId)) {
      setPiscinaSeleccionadaId(piscinas[0].id);
    }
  }, [piscinas, piscinaSeleccionadaId]);

  const piscinaSeleccionada = piscinas.find(
    (piscina) => piscina.id === piscinaSeleccionadaId
  );

  const registrosPiscina = useMemo(() => {
    if (!piscinaSeleccionada) return [];

    return registros
      .filter(
        (registro) =>
          registro.piscinaId === piscinaSeleccionada.id &&
          registro.ciclo === piscinaSeleccionada.cicloActual
      )
      .filter((registro) => {
        const texto = busqueda.trim().toLowerCase();

        if (!texto) return true;

        return (
          String(registro.tipoBalanceado ?? '')
            .toLowerCase()
            .includes(texto) ||
          String(registro.nombreBalanceado ?? '')
            .toLowerCase()
            .includes(texto) ||
          String(registro.observacion ?? '')
            .toLowerCase()
            .includes(texto)
        );
      })
      .filter((registro) => {
        if (fechaDesde && registro.fecha < fechaDesde) return false;

        if (fechaHasta && registro.fecha > fechaHasta) return false;

        return true;
      })
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [registros, piscinaSeleccionada, busqueda, fechaDesde, fechaHasta]);

  const totalAcumulado = useMemo(() => {
    if (!piscinaSeleccionada) return 0;

    return registros
      .filter(
        (registro) =>
          registro.piscinaId === piscinaSeleccionada.id &&
          registro.ciclo === piscinaSeleccionada.cicloActual
      )
      .reduce(
        (total, registro) => total + (Number(registro.cantidadKg) || 0),
        0
      );
  }, [registros, piscinaSeleccionada]);

  const totalRegistros = useMemo(() => {
    if (!piscinaSeleccionada) return 0;

    return registros.filter(
      (registro) =>
        registro.piscinaId === piscinaSeleccionada.id &&
        registro.ciclo === piscinaSeleccionada.cicloActual
    ).length;
  }, [registros, piscinaSeleccionada]);

  const promedioRegistro =
    totalRegistros > 0 ? totalAcumulado / totalRegistros : 0;

  function abrirNuevoRegistro() {
    if (!piscinaSeleccionada) return;

    if (!piscinaSeleccionada.fechaSiembra) {
      alert(
        'Esta piscina todavía no tiene una siembra activa. Primero debes registrar la siembra.'
      );
      return;
    }

    setRegistroEditando(null);
    setFecha('');
    setTipoBalanceado('Engorde');
    setNombreBalanceado('');
    setOtroBalanceado('');
    setCantidadKg('');
    setObservacion('');
    setModalAbierto(true);
  }

  function abrirEditar(registro: RegistroAlimentacion) {
    setRegistroEditando(registro);
    setFecha(registro.fecha);

    if (tiposBalanceado.includes(registro.tipoBalanceado)) {
      setTipoBalanceado(registro.tipoBalanceado);
      setOtroBalanceado('');
    } else {
      setTipoBalanceado('Otro');
      setOtroBalanceado(registro.tipoBalanceado);
    }

    setNombreBalanceado(
      registro.nombreBalanceado ??
        (tiposBalanceado.includes(registro.tipoBalanceado)
          ? ''
          : registro.tipoBalanceado)
    );

    setCantidadKg(String(registro.cantidadKg ?? ''));
    setObservacion(registro.observacion ?? '');
    setModalAbierto(true);
  }

  function cerrarModal() {
    setModalAbierto(false);
    setRegistroEditando(null);
  }

  function guardarRegistro(evento: React.FormEvent) {
    evento.preventDefault();

    if (!piscinaSeleccionada) return;

    if (!fecha) {
      alert('Debes seleccionar una fecha.');
      return;
    }

    const cantidad = Number(cantidadKg);

    if (!cantidadKg || cantidad <= 0) {
      alert('Ingresa una cantidad de balanceado mayor a 0 kg.');
      return;
    }

    let balanceadoFinal = tipoBalanceado;

    if (tipoBalanceado === 'Otro') {
      if (!otroBalanceado.trim()) {
        alert('Escribe el tipo de balanceado.');
        return;
      }

      balanceadoFinal = otroBalanceado.trim();
    }

    if (!nombreBalanceado.trim()) {
      alert('Ingresa el nombre del balanceado.');
      return;
    }

    if (registroEditando) {
      setRegistros((anteriores) => {
        const actualizados = anteriores.map((registro) =>
          registro.id === registroEditando.id
            ? {
                ...registro,
                fecha,
                tipoBalanceado: balanceadoFinal,
                nombreBalanceado: nombreBalanceado.trim(),
                cantidadKg: cantidad,
                observacion: observacion.trim(),
              }
            : registro
        );

        try {
          localStorage.setItem(
            ALIMENTACION_STORAGE_KEY,
            JSON.stringify(actualizados)
          );
        } catch (error) {
          console.error('No se pudo guardar la alimentación:', error);
        }

        return actualizados;
      });
    } else {
      const nuevoRegistro: RegistroAlimentacion = {
        id: Date.now(),
        piscinaId: piscinaSeleccionada.id,
        ciclo: piscinaSeleccionada.cicloActual,
        fecha,
        tipoBalanceado: balanceadoFinal,
        nombreBalanceado: nombreBalanceado.trim(),
        cantidadKg: cantidad,
        observacion: observacion.trim(),
      };

      setRegistros((anteriores) => {
        const actualizados = [...anteriores, nuevoRegistro];

        try {
          localStorage.setItem(
            ALIMENTACION_STORAGE_KEY,
            JSON.stringify(actualizados)
          );
        } catch (error) {
          console.error('No se pudo guardar la alimentación:', error);
        }

        return actualizados;
      });
    }

    setNombreBalanceado('');
    setOtroBalanceado('');
    setCantidadKg('');
    setObservacion('');
    cerrarModal();
  }

  if (!piscinaSeleccionada) {
    return (
      <div style={styles.contenedor}>
        <div
          style={{ ...styles.panel, padding: '44px 24px', textAlign: 'center' }}
        >
          <div style={{ fontSize: '36px', marginBottom: '10px' }}>🍚</div>
          <h2 style={{ margin: '0 0 8px', color: '#1f2937' }}>
            No hay piscinas en producción
          </h2>
          <p style={{ margin: 0, color: '#6b7280' }}>
            Registra una siembra en Piscinas para comenzar a controlar la
            alimentación del ciclo.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.contenedor}>
      <div style={styles.encabezado}>
        <div>
          <h1 style={styles.titulo}>🍚 Alimentación</h1>

          <p style={styles.subtitulo}>
            Control de balanceado consumido por piscina y ciclo.
          </p>
        </div>

        <button
          type="button"
          style={styles.botonPrincipal}
          onClick={abrirNuevoRegistro}
        >
          <Plus size={18} />
          Registrar alimentación
        </button>
      </div>

      <div style={styles.panelPiscina}>
        <div style={styles.campoSelector}>
          <label style={styles.label}>Piscina</label>

          <select
            style={styles.select}
            value={piscinaSeleccionadaId}
            onChange={(evento) =>
              setPiscinaSeleccionadaId(Number(evento.target.value))
            }
          >
            {piscinas.map((piscina) => (
              <option key={piscina.id} value={piscina.id}>
                {piscina.nombre}
              </option>
            ))}
          </select>
        </div>

        <div style={styles.datoPiscina}>
          <span style={styles.datoLabel}>Zona</span>
          <strong>{piscinaSeleccionada?.zona ?? '-'}</strong>
        </div>

        <div style={styles.datoPiscina}>
          <span style={styles.datoLabel}>Área</span>
          <strong>
            {piscinaSeleccionada
              ? `${formatoNumero(piscinaSeleccionada.hectareas)} ha`
              : '-'}
          </strong>
        </div>

        <div style={styles.datoPiscina}>
          <span style={styles.datoLabel}>Ciclo actual</span>
          <strong>
            {piscinaSeleccionada
              ? `Ciclo ${piscinaSeleccionada.cicloActual}`
              : '-'}
          </strong>
        </div>

        <div style={styles.datoPiscina}>
          <span style={styles.datoLabel}>Estado</span>

          <strong>
            {piscinaSeleccionada?.fechaSiembra
              ? '🟢 En producción'
              : '⚪ Sin siembra'}
          </strong>
        </div>
      </div>

      <div style={styles.tarjetas}>
        <div style={styles.tarjeta}>
          <div style={styles.iconoTarjeta}>
            <Package size={22} />
          </div>

          <div>
            <span style={styles.tarjetaLabel}>Balanceado acumulado</span>

            <div style={styles.tarjetaValor}>
              {formatoNumero(totalAcumulado)} kg
            </div>

            <small style={styles.tarjetaDetalle}>
              Ciclo {piscinaSeleccionada?.cicloActual ?? '-'}
            </small>
          </div>
        </div>

        <div style={styles.tarjeta}>
          <div style={styles.iconoTarjeta}>
            <CalendarDays size={22} />
          </div>

          <div>
            <span style={styles.tarjetaLabel}>Registros realizados</span>

            <div style={styles.tarjetaValor}>{totalRegistros}</div>

            <small style={styles.tarjetaDetalle}>En el ciclo actual</small>
          </div>
        </div>

        <div style={styles.tarjeta}>
          <div style={styles.iconoTarjeta}>⚖️</div>

          <div>
            <span style={styles.tarjetaLabel}>Promedio por registro</span>

            <div style={styles.tarjetaValor}>
              {formatoNumero(promedioRegistro)} kg
            </div>

            <small style={styles.tarjetaDetalle}>Referencia del ciclo</small>
          </div>
        </div>
      </div>

      <div style={styles.panel}>
        <div style={styles.panelTituloFila}>
          <div>
            <h2 style={styles.panelTitulo}>Historial de alimentación</h2>

            <p style={styles.panelDescripcion}>
              {piscinaSeleccionada?.nombre} · Ciclo{' '}
              {piscinaSeleccionada?.cicloActual}
            </p>
          </div>
        </div>

        <div style={styles.filtros}>
          <div style={styles.buscador}>
            <Search size={18} />

            <input
              style={styles.inputBuscador}
              placeholder="Buscar balanceado u observación..."
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
            />
          </div>

          <div style={styles.filtroFecha}>
            <label style={styles.labelPequeno}>Desde</label>

            <input
              type="date"
              style={styles.inputFecha}
              value={fechaDesde}
              onChange={(evento) => setFechaDesde(evento.target.value)}
            />
          </div>

          <div style={styles.filtroFecha}>
            <label style={styles.labelPequeno}>Hasta</label>

            <input
              type="date"
              style={styles.inputFecha}
              value={fechaHasta}
              onChange={(evento) => setFechaHasta(evento.target.value)}
            />
          </div>

          {(busqueda || fechaDesde || fechaHasta) && (
            <button
              style={styles.botonLimpiar}
              onClick={() => {
                setBusqueda('');
                setFechaDesde('');
                setFechaHasta('');
              }}
            >
              Limpiar filtros
            </button>
          )}
        </div>

        <div style={styles.tablaContenedor}>
          <table style={styles.tabla}>
            <thead>
              <tr>
                <th style={styles.th}>Fecha</th>
                <th style={styles.th}>Piscina</th>
                <th style={styles.th}>Ciclo</th>
                <th style={styles.th}>Balanceado</th>
                <th style={styles.thDerecha}>Cantidad</th>
                <th style={styles.th}>Observación</th>
                <th style={styles.thCentro}>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {registrosPiscina.length === 0 ? (
                <tr>
                  <td colSpan={7} style={styles.sinDatos}>
                    No hay registros de alimentación para los filtros
                    seleccionados.
                  </td>
                </tr>
              ) : (
                registrosPiscina.map((registro) => (
                  <tr key={registro.id}>
                    <td style={styles.td}>{formatoFecha(registro.fecha)}</td>

                    <td style={styles.td}>
                      <strong>{piscinaSeleccionada?.nombre}</strong>
                    </td>

                    <td style={styles.td}>Ciclo {registro.ciclo}</td>

                    <td style={styles.td}>
                      <strong>
                        {String(registro.nombreBalanceado ?? '').trim() ||
                          String(registro.tipoBalanceado ?? '').trim() ||
                          'Sin nombre'}
                      </strong>
                      <div
                        style={{
                          fontSize: '11px',
                          color: '#9ca3af',
                          marginTop: '3px',
                        }}
                      >
                        {String(registro.tipoBalanceado ?? 'Sin tipo')}
                      </div>
                    </td>

                    <td style={styles.tdDerecha}>
                      <strong>{formatoNumero(registro.cantidadKg)} kg</strong>
                    </td>

                    <td style={styles.td}>
                      {String(registro.observacion ?? '').trim() || '-'}
                    </td>

                    <td style={styles.tdCentro}>
                      <div style={styles.acciones}>
                        <button
                          title="Editar"
                          style={styles.botonAccion}
                          onClick={() => abrirEditar(registro)}
                        >
                          <Edit3 size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            {registrosPiscina.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={4} style={styles.totalEtiqueta}>
                    Total mostrado
                  </td>

                  <td style={styles.totalValor}>
                    {formatoNumero(
                      registrosPiscina.reduce(
                        (total, registro) => total + registro.cantidadKg,
                        0
                      )
                    )}{' '}
                    kg
                  </td>

                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <div style={styles.nota}>
        <strong>📌 Importante:</strong> el balanceado se acumula durante todo el
        ciclo de producción. Los raleos no reinician este valor. El acumulado
        queda asociado al ciclo y podrá utilizarse posteriormente para calcular
        indicadores como el FCA.
      </div>

      {modalAbierto && (
        <div style={styles.fondoModal}>
          <div style={styles.modal}>
            <div style={styles.modalEncabezado}>
              <div>
                <h2 style={styles.modalTitulo}>
                  {registroEditando
                    ? 'Editar alimentación'
                    : 'Registrar alimentación'}
                </h2>

                <p style={styles.modalSubtitulo}>
                  {piscinaSeleccionada?.nombre} · Ciclo{' '}
                  {piscinaSeleccionada?.cicloActual}
                </p>
              </div>

              <button style={styles.cerrarModal} onClick={cerrarModal}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={guardarRegistro}>
              <div style={styles.formGrid}>
                <div style={styles.formGrupo}>
                  <label style={styles.label}>Piscina</label>

                  <input
                    style={styles.inputBloqueado}
                    value={piscinaSeleccionada?.nombre ?? ''}
                    disabled
                  />
                </div>

                <div style={styles.formGrupo}>
                  <label style={styles.label}>Ciclo</label>

                  <input
                    style={styles.inputBloqueado}
                    value={`Ciclo ${piscinaSeleccionada?.cicloActual ?? ''}`}
                    disabled
                  />
                </div>

                <div style={styles.formGrupo}>
                  <label style={styles.label}>Fecha *</label>

                  <input
                    type="date"
                    style={styles.input}
                    value={fecha}
                    onChange={(evento) => setFecha(evento.target.value)}
                  />
                </div>

                <div style={styles.formGrupo}>
                  <label style={styles.label}>Tipo de balanceado *</label>

                  <select
                    style={styles.input}
                    value={tipoBalanceado}
                    onChange={(evento) =>
                      setTipoBalanceado(evento.target.value)
                    }
                  >
                    {tiposBalanceado.map((tipo) => (
                      <option key={tipo} value={tipo}>
                        {tipo}
                      </option>
                    ))}
                  </select>
                </div>

                {tipoBalanceado === 'Otro' && (
                  <div style={styles.formGrupoCompleto}>
                    <label style={styles.label}>
                      Otro tipo de balanceado *
                    </label>

                    <input
                      style={styles.input}
                      placeholder="Ej. Precría, transición..."
                      value={otroBalanceado}
                      onChange={(evento) =>
                        setOtroBalanceado(evento.target.value)
                      }
                    />
                  </div>
                )}

                <div style={styles.formGrupoCompleto}>
                  <label style={styles.label}>Nombre del balanceado *</label>

                  <input
                    style={styles.input}
                    placeholder="Ej. Nicovita 35%, Skretting, Balanceado A..."
                    value={nombreBalanceado}
                    onChange={(evento) =>
                      setNombreBalanceado(evento.target.value)
                    }
                  />
                </div>

                <div style={styles.formGrupoCompleto}>
                  <label style={styles.label}>Cantidad utilizada (kg) *</label>

                  <input
                    type="number"
                    min="0"
                    step="any"
                    inputMode="decimal"
                    style={styles.input}
                    placeholder="Ej. 850"
                    value={cantidadKg}
                    onChange={(evento) => setCantidadKg(evento.target.value)}
                  />
                </div>

                <div style={styles.formGrupoCompleto}>
                  <label style={styles.label}>Observación</label>

                  <textarea
                    style={styles.textarea}
                    rows={3}
                    placeholder="Observación opcional..."
                    value={observacion}
                    onChange={(evento) => setObservacion(evento.target.value)}
                  />
                </div>
              </div>

              <div style={styles.modalPie}>
                <button
                  type="button"
                  style={styles.botonCancelar}
                  onClick={cerrarModal}
                >
                  Cancelar
                </button>

                <button type="submit" style={styles.botonGuardar}>
                  {registroEditando
                    ? 'Guardar cambios'
                    : 'Registrar alimentación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  contenedor: {
    padding: '26px',
    width: '100%',
    boxSizing: 'border-box',
  },

  encabezado: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '24px',
    flexWrap: 'wrap',
  },

  titulo: {
    margin: 0,
    fontSize: '28px',
    color: '#1f2937',
  },

  subtitulo: {
    margin: '7px 0 0',
    color: '#6b7280',
    fontSize: '14px',
  },

  botonPrincipal: {
    border: 'none',
    borderRadius: '10px',
    padding: '11px 16px',
    background: '#2563eb',
    color: '#ffffff',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },

  panelPiscina: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '14px',
    padding: '18px',
    display: 'grid',
    gridTemplateColumns: 'minmax(180px, 1.4fr) repeat(4, minmax(120px, 1fr))',
    gap: '16px',
    marginBottom: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },

  campoSelector: {
    display: 'flex',
    flexDirection: 'column',
    gap: '7px',
  },

  label: {
    color: '#374151',
    fontSize: '13px',
    fontWeight: 600,
  },

  select: {
    width: '100%',
    padding: '10px 11px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    background: '#ffffff',
    color: '#111827',
    outline: 'none',
  },

  datoPiscina: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: '6px',
  },

  datoLabel: {
    color: '#6b7280',
    fontSize: '12px',
  },

  tarjetas: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(190px, 1fr))',
    gap: '16px',
    marginBottom: '20px',
  },

  tarjeta: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '14px',
    padding: '18px',
    display: 'flex',
    gap: '14px',
    alignItems: 'flex-start',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },

  iconoTarjeta: {
    width: '42px',
    height: '42px',
    borderRadius: '11px',
    background: '#eff6ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#2563eb',
    fontSize: '20px',
    flexShrink: 0,
  },

  tarjetaLabel: {
    color: '#6b7280',
    fontSize: '12px',
  },

  tarjetaValor: {
    color: '#111827',
    fontWeight: 700,
    fontSize: '22px',
    marginTop: '4px',
  },

  tarjetaDetalle: {
    color: '#9ca3af',
    display: 'block',
    marginTop: '4px',
  },

  panel: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '14px',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },

  panelTituloFila: {
    padding: '18px 20px 8px',
  },

  panelTitulo: {
    margin: 0,
    color: '#1f2937',
    fontSize: '18px',
  },

  panelDescripcion: {
    margin: '5px 0 0',
    color: '#6b7280',
    fontSize: '13px',
  },

  filtros: {
    padding: '12px 20px 18px',
    display: 'flex',
    gap: '12px',
    alignItems: 'end',
    flexWrap: 'wrap',
  },

  buscador: {
    minWidth: '230px',
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    border: '1px solid #d1d5db',
    borderRadius: '9px',
    padding: '0 10px',
  },

  inputBuscador: {
    width: '100%',
    border: 'none',
    outline: 'none',
    padding: '10px 0',
    background: 'transparent',
  },

  filtroFecha: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },

  labelPequeno: {
    fontSize: '11px',
    color: '#6b7280',
    fontWeight: 600,
  },

  inputFecha: {
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    padding: '9px',
    outline: 'none',
  },

  botonLimpiar: {
    border: '1px solid #d1d5db',
    background: '#ffffff',
    borderRadius: '8px',
    padding: '9px 12px',
    cursor: 'pointer',
  },

  tablaContenedor: {
    overflowX: 'auto',
  },

  tabla: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '900px',
  },

  th: {
    textAlign: 'left',
    background: '#f9fafb',
    color: '#6b7280',
    padding: '12px 14px',
    borderTop: '1px solid #e5e7eb',
    borderBottom: '1px solid #e5e7eb',
    fontSize: '12px',
  },

  thDerecha: {
    textAlign: 'right',
    background: '#f9fafb',
    color: '#6b7280',
    padding: '12px 14px',
    borderTop: '1px solid #e5e7eb',
    borderBottom: '1px solid #e5e7eb',
    fontSize: '12px',
  },

  thCentro: {
    textAlign: 'center',
    background: '#f9fafb',
    color: '#6b7280',
    padding: '12px 14px',
    borderTop: '1px solid #e5e7eb',
    borderBottom: '1px solid #e5e7eb',
    fontSize: '12px',
  },

  td: {
    padding: '13px 14px',
    borderBottom: '1px solid #f1f5f9',
    color: '#374151',
    fontSize: '13px',
  },

  tdDerecha: {
    padding: '13px 14px',
    borderBottom: '1px solid #f1f5f9',
    color: '#374151',
    fontSize: '13px',
    textAlign: 'right',
  },

  tdCentro: {
    padding: '13px 14px',
    borderBottom: '1px solid #f1f5f9',
    textAlign: 'center',
  },

  acciones: {
    display: 'flex',
    justifyContent: 'center',
    gap: '6px',
  },

  botonAccion: {
    width: '34px',
    height: '34px',
    borderRadius: '8px',
    border: '1px solid #dbeafe',
    background: '#eff6ff',
    color: '#2563eb',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  botonAccionEliminar: {
    width: '34px',
    height: '34px',
    borderRadius: '8px',
    border: '1px solid #fee2e2',
    background: '#fef2f2',
    color: '#dc2626',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  sinDatos: {
    padding: '40px',
    textAlign: 'center',
    color: '#9ca3af',
  },

  totalEtiqueta: {
    padding: '14px',
    textAlign: 'right',
    fontWeight: 700,
    background: '#f9fafb',
    color: '#374151',
  },

  totalValor: {
    padding: '14px',
    textAlign: 'right',
    fontWeight: 700,
    background: '#f9fafb',
    color: '#111827',
  },

  nota: {
    marginTop: '18px',
    borderRadius: '10px',
    padding: '14px 16px',
    background: '#fffbeb',
    border: '1px solid #fde68a',
    color: '#78350f',
    fontSize: '13px',
    lineHeight: 1.5,
  },

  fondoModal: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 23, 42, 0.48)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '20px',
  },

  modal: {
    width: '100%',
    maxWidth: '650px',
    maxHeight: '90vh',
    overflowY: 'auto',
    background: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.22)',
  },

  modalEncabezado: {
    padding: '20px',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  modalTitulo: {
    margin: 0,
    fontSize: '20px',
    color: '#111827',
  },

  modalSubtitulo: {
    margin: '5px 0 0',
    fontSize: '13px',
    color: '#6b7280',
  },

  cerrarModal: {
    border: 'none',
    background: '#f3f4f6',
    width: '34px',
    height: '34px',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  formGrid: {
    padding: '20px',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },

  formGrupo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '7px',
  },

  formGrupoCompleto: {
    gridColumn: '1 / -1',
    display: 'flex',
    flexDirection: 'column',
    gap: '7px',
  },

  input: {
    padding: '11px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },

  inputBloqueado: {
    padding: '11px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    background: '#f9fafb',
    color: '#6b7280',
    width: '100%',
    boxSizing: 'border-box',
  },

  textarea: {
    padding: '11px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
    width: '100%',
    boxSizing: 'border-box',
  },

  modalPie: {
    padding: '16px 20px',
    borderTop: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
  },

  botonCancelar: {
    border: '1px solid #d1d5db',
    background: '#ffffff',
    padding: '10px 15px',
    borderRadius: '8px',
    cursor: 'pointer',
  },

  botonGuardar: {
    border: 'none',
    background: '#2563eb',
    color: '#ffffff',
    padding: '10px 15px',
    borderRadius: '8px',
    fontWeight: 600,
    cursor: 'pointer',
  },
};
