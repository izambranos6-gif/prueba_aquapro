import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Calculator,
  CalendarDays,
  ClipboardList,
  Plus,
  Pencil,
  Scale,
  TrendingUp,
  Waves,
} from 'lucide-react';

import { useAquaProStore, obtenerCicloActivo } from '../store/aquaProStore';

type TabActivo = 'pesos' | 'biomasa';

const PESOS_STORAGE_KEY = 'aquapro-pesos-v1';
const BIOMASA_STORAGE_KEY = 'aquapro-biomasa-v1';

type RegistroPeso = {
  id: number;
  piscinaId: number;
  ciclo: number;
  fecha: string;
  pesoPromedio: number;
  observacion: string;
};

type MuestreoBiomasa = {
  id: number;
  piscinaId: number;
  ciclo: number;
  fecha: string;

  numeroLances: number;
  totalCamarones: number;
  areaAtarraya: number;

  pesoUtilizado: number;

  promedioPorLance: number;
  camaronesMetroCuadrado: number;
  poblacionEstimada: number;
  biomasaKg: number;
  supervivencia: number;
};

const pesosIniciales: RegistroPeso[] = [
  {
    id: 1,
    piscinaId: 1,
    ciclo: 4,
    fecha: '2026-07-01',
    pesoPromedio: 5.2,
    observacion: 'Control inicial de crecimiento.',
  },
  {
    id: 2,
    piscinaId: 1,
    ciclo: 4,
    fecha: '2026-07-08',
    pesoPromedio: 6.8,
    observacion: '',
  },
  {
    id: 3,
    piscinaId: 1,
    ciclo: 4,
    fecha: '2026-07-15',
    pesoPromedio: 8.4,
    observacion: '',
  },
];

function formatearNumero(numero: number, decimales = 2) {
  return numero.toLocaleString('es-EC', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });
}

function formatearEntero(numero: number) {
  return Math.round(numero).toLocaleString('es-EC');
}

function formatearFecha(fecha: string) {
  if (!fecha) return '-';

  return new Date(`${fecha}T00:00:00`).toLocaleDateString('es-EC');
}

export default function Biomasa() {
  const { piscinas } = useAquaProStore();

  const piscinasProduccion = useMemo(
    () =>
      piscinas
        .map((piscina) => {
          const cicloActivo = obtenerCicloActivo(piscina.id);

          if (!cicloActivo?.siembra) return null;

          return {
            id: piscina.id,
            nombre: piscina.nombre,
            zona: piscina.zona,
            hectareas: piscina.hectareas,
            cicloActual: cicloActivo.numero,
            cicloId: cicloActivo.id,
            cantidadSembrada: cicloActivo.siembra.cantidadSembrada,
            fechaSiembra: cicloActivo.siembra.fecha,
          };
        })
        .filter(
          (piscina): piscina is NonNullable<typeof piscina> => piscina !== null
        ),
    [piscinas]
  );

  const [tabActivo, setTabActivo] = useState<TabActivo>('pesos');

  const [pesos, setPesos] = useState<RegistroPeso[]>(() => {
    try {
      const guardado = localStorage.getItem(PESOS_STORAGE_KEY);

      return guardado ? JSON.parse(guardado) : pesosIniciales;
    } catch {
      return pesosIniciales;
    }
  });

  const [muestreos, setMuestreos] = useState<MuestreoBiomasa[]>(() => {
    try {
      const guardado = localStorage.getItem(BIOMASA_STORAGE_KEY);

      return guardado ? JSON.parse(guardado) : [];
    } catch {
      return [];
    }
  });

  const [piscinaFiltro, setPiscinaFiltro] = useState<number>(0);

  const [mostrarPeso, setMostrarPeso] = useState(false);

  const [mostrarMuestreo, setMostrarMuestreo] = useState(false);

  const [muestreoEditandoId, setMuestreoEditandoId] = useState<number | null>(
    null
  );

  const [pesoForm, setPesoForm] = useState({
    piscinaId: '',
    fecha: '',
    pesoPromedio: '',
    observacion: '',
  });

  const [muestreoForm, setMuestreoForm] = useState({
    piscinaId: '',
    fecha: '',
    numeroLances: '',
    totalCamarones: '',
    areaAtarraya: '7.5',
  });

  useEffect(() => {
    localStorage.setItem(PESOS_STORAGE_KEY, JSON.stringify(pesos));
  }, [pesos]);

  useEffect(() => {
    localStorage.setItem(BIOMASA_STORAGE_KEY, JSON.stringify(muestreos));
  }, [muestreos]);

  useEffect(() => {
    if (piscinasProduccion.length === 0) {
      if (piscinaFiltro !== 0) {
        setPiscinaFiltro(0);
      }
      return;
    }

    const sigueDisponible = piscinasProduccion.some(
      (p) => p.id === piscinaFiltro
    );

    if (!sigueDisponible) {
      setPiscinaFiltro(piscinasProduccion[0].id);
    }
  }, [piscinasProduccion, piscinaFiltro]);

  const piscinaSeleccionada =
    piscinasProduccion.find((p) => p.id === piscinaFiltro) ??
    piscinasProduccion[0];

  const pesosPiscina = useMemo(() => {
    if (!piscinaSeleccionada) return [];

    return pesos
      .filter(
        (peso) =>
          peso.piscinaId === piscinaFiltro &&
          peso.ciclo === piscinaSeleccionada.cicloActual
      )
      .sort(
        (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
      );
  }, [pesos, piscinaFiltro, piscinaSeleccionada?.cicloActual]);

  const muestreosPiscina = useMemo(() => {
    if (!piscinaSeleccionada) return [];

    return muestreos
      .filter(
        (m) =>
          m.piscinaId === piscinaFiltro &&
          m.ciclo === piscinaSeleccionada.cicloActual
      )
      .sort(
        (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
      );
  }, [muestreos, piscinaFiltro, piscinaSeleccionada?.cicloActual]);

  const ultimoPeso =
    pesosPiscina.length > 0 ? pesosPiscina[pesosPiscina.length - 1] : null;

  const ultimoMuestreo =
    muestreosPiscina.length > 0
      ? muestreosPiscina[muestreosPiscina.length - 1]
      : null;

  function obtenerPiscina(id: number) {
    return piscinasProduccion.find((p) => p.id === id);
  }

  function obtenerPesoParaFecha(
    piscinaId: number,
    ciclo: number,
    fecha: string
  ) {
    const candidatos = pesos
      .filter(
        (p) =>
          p.piscinaId === piscinaId && p.ciclo === ciclo && p.fecha <= fecha
      )
      .sort(
        (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
      );

    return candidatos[0] ?? null;
  }

  function abrirRegistroPeso() {
    if (!piscinaSeleccionada) {
      alert('No hay piscinas sembradas con ciclo activo.');
      return;
    }

    setPesoForm({
      piscinaId: piscinaSeleccionada.id.toString(),
      fecha: '',
      pesoPromedio: '',
      observacion: '',
    });

    setMostrarPeso(true);
  }

  function guardarPeso(e: React.FormEvent) {
    e.preventDefault();

    const piscinaId = Number(pesoForm.piscinaId);

    const piscina = obtenerPiscina(piscinaId);

    if (!piscina) return;

    if (!piscina.cantidadSembrada) {
      alert('Esta piscina todavía no tiene una siembra registrada.');
      return;
    }

    if (!pesoForm.fecha) {
      alert('Ingresa la fecha del peso.');
      return;
    }

    if (!pesoForm.pesoPromedio || Number(pesoForm.pesoPromedio) <= 0) {
      alert('Ingresa un peso promedio válido.');
      return;
    }

    const nuevoPeso: RegistroPeso = {
      id: Date.now(),
      piscinaId,
      ciclo: piscina.cicloActual,
      fecha: pesoForm.fecha,
      pesoPromedio: Number(pesoForm.pesoPromedio),
      observacion: pesoForm.observacion.trim(),
    };

    setPesos((actuales) => [...actuales, nuevoPeso]);

    setPiscinaFiltro(piscinaId);
    setMostrarPeso(false);
  }

  function eliminarPeso(id: number) {
    const confirmar = window.confirm(
      '¿Seguro que deseas eliminar este registro de peso?'
    );

    if (!confirmar) return;

    setPesos((actuales) => actuales.filter((p) => p.id !== id));
  }

  function abrirMuestreo() {
    if (!piscinaSeleccionada) {
      alert('No hay piscinas sembradas con ciclo activo.');
      return;
    }

    setMuestreoEditandoId(null);

    setMuestreoForm({
      piscinaId: piscinaSeleccionada.id.toString(),
      fecha: '',
      numeroLances: '',
      totalCamarones: '',
      areaAtarraya: '7.5',
    });

    setMostrarMuestreo(true);
  }

  function editarMuestreo(muestreo: MuestreoBiomasa) {
    setMuestreoEditandoId(muestreo.id);

    setMuestreoForm({
      piscinaId: muestreo.piscinaId.toString(),
      fecha: muestreo.fecha,
      numeroLances: muestreo.numeroLances.toString(),
      totalCamarones: muestreo.totalCamarones.toString(),
      areaAtarraya: muestreo.areaAtarraya.toString(),
    });

    setMostrarMuestreo(true);
  }

  function guardarMuestreo(e: React.FormEvent) {
    e.preventDefault();

    const piscinaId = Number(muestreoForm.piscinaId);

    const piscina = obtenerPiscina(piscinaId);

    if (!piscina) return;

    if (!piscina.cantidadSembrada) {
      alert('Primero debes registrar la siembra de esta piscina.');
      return;
    }

    if (!muestreoForm.fecha) {
      alert('Ingresa la fecha del muestreo.');
      return;
    }

    const numeroLances = Number(muestreoForm.numeroLances);

    const totalCamarones = Number(muestreoForm.totalCamarones);

    const areaAtarraya = Number(muestreoForm.areaAtarraya);

    if (numeroLances <= 0) {
      alert('El número de lances debe ser mayor a cero.');
      return;
    }

    if (totalCamarones <= 0) {
      alert('Ingresa el total de camarones capturados.');
      return;
    }

    if (areaAtarraya <= 0) {
      alert('Ingresa un área de atarraya válida.');
      return;
    }

    const pesoUsado = obtenerPesoParaFecha(
      piscinaId,
      piscina.cicloActual,
      muestreoForm.fecha
    );

    if (!pesoUsado) {
      alert(
        'No existe un peso registrado para esta piscina antes o en la fecha del muestreo. Registra primero el peso promedio.'
      );
      return;
    }

    const promedioPorLance = totalCamarones / numeroLances;

    const camaronesMetroCuadrado =
      totalCamarones / (numeroLances * areaAtarraya);

    const areaPiscinaM2 = piscina.hectareas * 10000;

    const poblacionEstimada = areaPiscinaM2 * camaronesMetroCuadrado;

    const biomasaKg = (poblacionEstimada * pesoUsado.pesoPromedio) / 1000;

    const supervivencia = (poblacionEstimada / piscina.cantidadSembrada) * 100;

    const nuevoMuestreo: MuestreoBiomasa = {
      id: muestreoEditandoId ?? Date.now(),
      piscinaId,
      ciclo: piscina.cicloActual,
      fecha: muestreoForm.fecha,

      numeroLances,
      totalCamarones,
      areaAtarraya,

      pesoUtilizado: pesoUsado.pesoPromedio,

      promedioPorLance,
      camaronesMetroCuadrado,
      poblacionEstimada,
      biomasaKg,
      supervivencia,
    };

    setMuestreos((actuales) =>
      muestreoEditandoId
        ? actuales.map((m) => (m.id === muestreoEditandoId ? nuevoMuestreo : m))
        : [...actuales, nuevoMuestreo]
    );

    setPiscinaFiltro(piscinaId);
    setMuestreoEditandoId(null);
    setMostrarMuestreo(false);
  }

  function eliminarMuestreo(id: number) {
    const confirmar = window.confirm(
      '¿Seguro que deseas eliminar este muestreo?'
    );

    if (!confirmar) return;

    setMuestreos((actuales) => actuales.filter((m) => m.id !== id));
  }

  const piscinaMuestreoFormulario = obtenerPiscina(
    Number(muestreoForm.piscinaId)
  );

  const pesoPreview =
    piscinaMuestreoFormulario && muestreoForm.fecha
      ? obtenerPesoParaFecha(
          piscinaMuestreoFormulario.id,
          piscinaMuestreoFormulario.cicloActual,
          muestreoForm.fecha
        )
      : null;

  const previewLances = Number(muestreoForm.numeroLances) || 0;

  const previewCamarones = Number(muestreoForm.totalCamarones) || 0;

  const previewAreaAtarraya = Number(muestreoForm.areaAtarraya) || 0;

  let previewPromedio = 0;
  let previewCamM2 = 0;
  let previewPoblacion = 0;
  let previewBiomasa = 0;
  let previewSupervivencia = 0;

  if (
    piscinaMuestreoFormulario &&
    previewLances > 0 &&
    previewCamarones > 0 &&
    previewAreaAtarraya > 0
  ) {
    previewPromedio = previewCamarones / previewLances;

    previewCamM2 = previewCamarones / (previewLances * previewAreaAtarraya);

    previewPoblacion =
      piscinaMuestreoFormulario.hectareas * 10000 * previewCamM2;

    if (pesoPreview) {
      previewBiomasa = (previewPoblacion * pesoPreview.pesoPromedio) / 1000;
    }

    if (piscinaMuestreoFormulario.cantidadSembrada) {
      previewSupervivencia =
        (previewPoblacion / piscinaMuestreoFormulario.cantidadSembrada) * 100;
    }
  }

  if (!piscinaSeleccionada) {
    return (
      <div
        style={{
          padding: '4px 0 30px',
        }}
      >
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e5ecea',
            borderRadius: '16px',
            padding: '42px 22px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: '34px',
              marginBottom: '10px',
            }}
          >
            🦐
          </div>

          <h2
            style={{
              margin: '0 0 7px',
            }}
          >
            No hay piscinas en producción
          </h2>

          <p
            style={{
              margin: 0,
              color: '#718188',
            }}
          >
            Registra una siembra en Piscinas para comenzar a guardar pesos y
            muestreos de biomasa.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '4px 0 30px',
      }}
    >
      {/* ENCABEZADO */}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '20px',
          marginBottom: '22px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color: '#718581',
              marginBottom: '6px',
            }}
          >
            PRODUCCIÓN
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: '29px',
            }}
          >
            ⚖️ Pesos y Biomasa
          </h1>

          <p
            style={{
              margin: '7px 0 0',
              color: '#6f7f86',
            }}
          >
            Controla el crecimiento, densidad, población, biomasa y
            supervivencia estimada del camarón.
          </p>
        </div>

        <div
          style={{
            minWidth: '220px',
          }}
        >
          <label
            style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: 700,
              marginBottom: '6px',
              color: '#6d7e82',
            }}
          >
            PISCINA
          </label>

          <select
            value={piscinaFiltro}
            onChange={(e) => setPiscinaFiltro(Number(e.target.value))}
            style={inputStyle}
          >
            {piscinasProduccion.map((piscina) => (
              <option key={piscina.id} value={piscina.id}>
                {piscina.nombre} — Ciclo {piscina.cicloActual}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* INFORMACIÓN PISCINA */}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        <MiniCard
          titulo="Piscina"
          valor={piscinaSeleccionada.nombre}
          detalle={`Zona ${piscinaSeleccionada.zona}`}
          icono={<Waves size={20} />}
        />

        <MiniCard
          titulo="Área"
          valor={`${formatearNumero(piscinaSeleccionada.hectareas, 2)} ha`}
          detalle={`${formatearEntero(
            piscinaSeleccionada.hectareas * 10000
          )} m²`}
          icono={<Calculator size={20} />}
        />

        <MiniCard
          titulo="Ciclo actual"
          valor={`Ciclo ${piscinaSeleccionada.cicloActual}`}
          detalle={
            piscinaSeleccionada.fechaSiembra
              ? `Siembra: ${formatearFecha(piscinaSeleccionada.fechaSiembra)}`
              : 'Sin siembra'
          }
          icono={<CalendarDays size={20} />}
        />

        <MiniCard
          titulo="Cantidad sembrada"
          valor={
            piscinaSeleccionada.cantidadSembrada
              ? formatearEntero(piscinaSeleccionada.cantidadSembrada)
              : 'Sin registro'
          }
          detalle="Referencia inicial = 100 %"
          icono={<ClipboardList size={20} />}
        />

        <MiniCard
          titulo="Último peso"
          valor={
            ultimoPeso
              ? `${formatearNumero(ultimoPeso.pesoPromedio, 2)} g`
              : 'Sin registro'
          }
          detalle={
            ultimoPeso ? formatearFecha(ultimoPeso.fecha) : 'Registra un peso'
          }
          icono={<Scale size={20} />}
        />

        <MiniCard
          titulo="Biomasa estimada"
          valor={
            ultimoMuestreo
              ? `${formatearEntero(ultimoMuestreo.biomasaKg)} kg`
              : 'Sin muestreo'
          }
          detalle={
            ultimoMuestreo
              ? `${formatearNumero(
                  ultimoMuestreo.supervivencia,
                  2
                )}% supervivencia`
              : 'Pendiente'
          }
          icono={<BarChart3 size={20} />}
        />
      </div>

      {/* PESTAÑAS */}

      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e5ecea',
          borderRadius: '14px',
          padding: '6px',
          display: 'inline-flex',
          gap: '5px',
          marginBottom: '18px',
        }}
      >
        <button
          onClick={() => setTabActivo('pesos')}
          style={{
            ...tabStyle,
            ...(tabActivo === 'pesos' ? tabActivoStyle : {}),
          }}
        >
          ⚖️ Pesos
        </button>

        <button
          onClick={() => setTabActivo('biomasa')}
          style={{
            ...tabStyle,
            ...(tabActivo === 'biomasa' ? tabActivoStyle : {}),
          }}
        >
          🦐 Muestreos de biomasa
        </button>
      </div>

      {/* ==============================
          PESOS
      ============================== */}

      {tabActivo === 'pesos' && (
        <>
          <PanelHeader
            titulo="Historial de pesos"
            descripcion="Registra cada control de peso promedio. Los registros anteriores se conservan para analizar el crecimiento."
            boton="Registrar peso"
            onClick={abrirRegistroPeso}
          />

          <div style={panelStyle}>
            {pesosPiscina.length > 0 ? (
              <div
                style={{
                  overflowX: 'auto',
                }}
              >
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Fecha</th>

                      <th style={thStyle}>Piscina</th>

                      <th style={thStyle}>Ciclo</th>

                      <th style={thStyle}>Peso promedio</th>

                      <th style={thStyle}>Crecimiento</th>

                      <th style={thStyle}>Observación</th>

                      <th style={thStyle}>Acción</th>
                    </tr>
                  </thead>

                  <tbody>
                    {pesosPiscina.map((peso, index) => {
                      const anterior =
                        index > 0 ? pesosPiscina[index - 1] : null;

                      const crecimiento = anterior
                        ? peso.pesoPromedio - anterior.pesoPromedio
                        : null;

                      return (
                        <tr key={peso.id}>
                          <td style={tdStyle}>{formatearFecha(peso.fecha)}</td>

                          <td style={tdStyle}>
                            <strong>{piscinaSeleccionada.nombre}</strong>
                          </td>

                          <td style={tdStyle}>Ciclo {peso.ciclo}</td>

                          <td style={tdStyle}>
                            <strong
                              style={{
                                fontSize: '16px',
                              }}
                            >
                              {formatearNumero(peso.pesoPromedio, 2)} g
                            </strong>
                          </td>

                          <td style={tdStyle}>
                            {crecimiento !== null ? (
                              <span
                                style={{
                                  color:
                                    crecimiento >= 0 ? '#18795d' : '#b54747',
                                  fontWeight: 700,
                                }}
                              >
                                {crecimiento >= 0 ? '+' : ''}
                                {formatearNumero(crecimiento, 2)} g
                              </span>
                            ) : (
                              'Inicial'
                            )}
                          </td>

                          <td style={tdStyle}>{peso.observacion || '-'}</td>

                          <td style={tdStyle}>
                            <button
                              onClick={() => eliminarPeso(peso.id)}
                              style={dangerButtonStyle}
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                titulo="No existen pesos registrados"
                texto="Registra el primer peso promedio de esta piscina."
              />
            )}
          </div>
        </>
      )}

      {/* ==============================
          BIOMASA
      ============================== */}

      {tabActivo === 'biomasa' && (
        <>
          <PanelHeader
            titulo="Muestreos de biomasa"
            descripcion="Registra los lances de atarraya. AquaPro calculará automáticamente densidad, población, biomasa y supervivencia."
            boton="Nuevo muestreo"
            onClick={abrirMuestreo}
          />

          {ultimoMuestreo && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: '12px',
                marginBottom: '16px',
              }}
            >
              <ResultadoCard
                titulo="Cam/m²"
                valor={formatearNumero(
                  ultimoMuestreo.camaronesMetroCuadrado,
                  2
                )}
              />

              <ResultadoCard
                titulo="Población estimada"
                valor={formatearEntero(ultimoMuestreo.poblacionEstimada)}
              />

              <ResultadoCard
                titulo="Biomasa"
                valor={`${formatearEntero(ultimoMuestreo.biomasaKg)} kg`}
              />

              <ResultadoCard
                titulo="Supervivencia"
                valor={`${formatearNumero(ultimoMuestreo.supervivencia, 2)}%`}
              />
            </div>
          )}

          <div style={panelStyle}>
            {muestreosPiscina.length > 0 ? (
              <div
                style={{
                  overflowX: 'auto',
                }}
              >
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Fecha</th>

                      <th style={thStyle}>Lances</th>

                      <th style={thStyle}>Camarones</th>

                      <th style={thStyle}>Área atarraya</th>

                      <th style={thStyle}>Prom./lance</th>

                      <th style={thStyle}>Cam/m²</th>

                      <th style={thStyle}>Peso</th>

                      <th style={thStyle}>Población</th>

                      <th style={thStyle}>Biomasa</th>

                      <th style={thStyle}>Supervivencia</th>

                      <th style={thStyle}>Acción</th>
                    </tr>
                  </thead>

                  <tbody>
                    {muestreosPiscina.map((muestreo) => (
                      <tr key={muestreo.id}>
                        <td style={tdStyle}>
                          {formatearFecha(muestreo.fecha)}
                        </td>

                        <td style={tdStyle}>{muestreo.numeroLances}</td>

                        <td style={tdStyle}>
                          {formatearEntero(muestreo.totalCamarones)}
                        </td>

                        <td style={tdStyle}>
                          {formatearNumero(muestreo.areaAtarraya, 2)} m²
                        </td>

                        <td style={tdStyle}>
                          {formatearNumero(muestreo.promedioPorLance, 2)}
                        </td>

                        <td style={tdStyle}>
                          <strong>
                            {formatearNumero(
                              muestreo.camaronesMetroCuadrado,
                              2
                            )}
                          </strong>
                        </td>

                        <td style={tdStyle}>
                          {formatearNumero(muestreo.pesoUtilizado, 2)} g
                        </td>

                        <td style={tdStyle}>
                          {formatearEntero(muestreo.poblacionEstimada)}
                        </td>

                        <td style={tdStyle}>
                          <strong>
                            {formatearEntero(muestreo.biomasaKg)} kg
                          </strong>
                        </td>

                        <td style={tdStyle}>
                          <strong>
                            {formatearNumero(muestreo.supervivencia, 2)}%
                          </strong>
                        </td>

                        <td style={tdStyle}>
                          <div
                            style={{
                              display: 'flex',
                              gap: '7px',
                              alignItems: 'center',
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => editarMuestreo(muestreo)}
                              title="Editar muestreo"
                              aria-label="Editar muestreo"
                              style={{
                                ...secondaryButtonStyle,
                                padding: '7px 9px',
                              }}
                            >
                              <Pencil size={15} />
                            </button>

                            <button
                              type="button"
                              onClick={() => eliminarMuestreo(muestreo.id)}
                              title="Eliminar muestreo"
                              aria-label="Eliminar muestreo"
                              style={dangerButtonStyle}
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                titulo="No existen muestreos"
                texto="Registra el primer muestreo de atarraya de esta piscina."
              />
            )}
          </div>

          <div
            style={{
              marginTop: '14px',
              padding: '14px 16px',
              borderRadius: '12px',
              background: '#fff8e8',
              color: '#795f24',
              fontSize: '13px',
              lineHeight: 1.5,
            }}
          >
            <strong>Sobre la supervivencia:</strong> AquaPro la calcula
            comparando la población estimada con la cantidad sembrada del ciclo
            activo. Más adelante ajustaremos el indicador con raleos y pescas
            para separar las salidas intencionales de camarón de la mortalidad
            estimada.
          </div>
        </>
      )}

      {/* =================================
          MODAL PESO
      ================================= */}

      {mostrarPeso && (
        <Modal
          titulo="⚖️ Registrar peso"
          subtitulo="Control de crecimiento del camarón"
          cerrar={() => setMostrarPeso(false)}
        >
          <form onSubmit={guardarPeso}>
            <div style={formGridStyle}>
              <Campo titulo="Piscina">
                <select
                  value={pesoForm.piscinaId}
                  onChange={(e) =>
                    setPesoForm({
                      ...pesoForm,
                      piscinaId: e.target.value,
                    })
                  }
                  style={inputStyle}
                >
                  {piscinasProduccion.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} — Ciclo {p.cicloActual}
                    </option>
                  ))}
                </select>
              </Campo>

              <Campo titulo="Fecha">
                <input
                  type="date"
                  value={pesoForm.fecha}
                  onChange={(e) =>
                    setPesoForm({
                      ...pesoForm,
                      fecha: e.target.value,
                    })
                  }
                  style={inputStyle}
                />
              </Campo>

              <Campo titulo="Peso promedio (g)">
                <input
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  value={pesoForm.pesoPromedio}
                  onChange={(e) =>
                    setPesoForm({
                      ...pesoForm,
                      pesoPromedio: e.target.value,
                    })
                  }
                  placeholder="Ej. 8.40"
                  style={inputStyle}
                />
              </Campo>
            </div>

            <Campo titulo="Observación">
              <textarea
                rows={3}
                value={pesoForm.observacion}
                onChange={(e) =>
                  setPesoForm({
                    ...pesoForm,
                    observacion: e.target.value,
                  })
                }
                placeholder="Opcional"
                style={{
                  ...inputStyle,
                  resize: 'vertical',
                }}
              />
            </Campo>

            <ModalActions
              cancelar={() => setMostrarPeso(false)}
              textoGuardar="Guardar peso"
            />
          </form>
        </Modal>
      )}

      {/* =================================
          MODAL MUESTREO
      ================================= */}

      {mostrarMuestreo && (
        <Modal
          titulo={
            muestreoEditandoId
              ? '✏️ Editar muestreo de biomasa'
              : '🦐 Muestreo de biomasa'
          }
          subtitulo={
            muestreoEditandoId
              ? 'Corrige los datos y AquaPro recalculará automáticamente la biomasa.'
              : 'Muestreo mediante lances de atarraya'
          }
          cerrar={() => {
            setMostrarMuestreo(false);
            setMuestreoEditandoId(null);
          }}
        >
          <form onSubmit={guardarMuestreo}>
            <div style={formGridStyle}>
              <Campo titulo="Piscina">
                <select
                  value={muestreoForm.piscinaId}
                  onChange={(e) =>
                    setMuestreoForm({
                      ...muestreoForm,
                      piscinaId: e.target.value,
                    })
                  }
                  style={inputStyle}
                >
                  {piscinasProduccion.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} — Ciclo {p.cicloActual}
                    </option>
                  ))}
                </select>
              </Campo>

              <Campo titulo="Fecha del muestreo">
                <input
                  type="date"
                  value={muestreoForm.fecha}
                  onChange={(e) =>
                    setMuestreoForm({
                      ...muestreoForm,
                      fecha: e.target.value,
                    })
                  }
                  style={inputStyle}
                />
              </Campo>

              <Campo titulo="Número de lances">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={muestreoForm.numeroLances}
                  onChange={(e) =>
                    setMuestreoForm({
                      ...muestreoForm,
                      numeroLances: e.target.value,
                    })
                  }
                  placeholder="Ej. 12"
                  style={inputStyle}
                />
              </Campo>

              <Campo titulo="Total camarones">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={muestreoForm.totalCamarones}
                  onChange={(e) =>
                    setMuestreoForm({
                      ...muestreoForm,
                      totalCamarones: e.target.value,
                    })
                  }
                  placeholder="Ej. 1000"
                  style={inputStyle}
                />
              </Campo>

              <Campo titulo="Área de atarraya (m²)">
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={muestreoForm.areaAtarraya}
                  onChange={(e) =>
                    setMuestreoForm({
                      ...muestreoForm,
                      areaAtarraya: e.target.value,
                    })
                  }
                  style={inputStyle}
                />
              </Campo>

              <Campo titulo="Peso utilizado">
                <div
                  style={{
                    ...inputStyle,
                    background: '#f4f7f7',
                    display: 'flex',
                    alignItems: 'center',
                    minHeight: '43px',
                  }}
                >
                  {pesoPreview ? (
                    <strong>
                      {formatearNumero(pesoPreview.pesoPromedio, 2)} g —{' '}
                      {formatearFecha(pesoPreview.fecha)}
                    </strong>
                  ) : (
                    <span
                      style={{
                        color: '#87959a',
                      }}
                    >
                      Selecciona fecha
                    </span>
                  )}
                </div>
              </Campo>
            </div>

            {piscinaMuestreoFormulario && (
              <div
                style={{
                  padding: '14px',
                  borderRadius: '12px',
                  background: '#f4f8f7',
                  marginTop: '5px',
                  marginBottom: '15px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: '12px',
                }}
              >
                <Info
                  titulo="Área piscina"
                  valor={`${formatearNumero(
                    piscinaMuestreoFormulario.hectareas,
                    2
                  )} ha`}
                />

                <Info
                  titulo="Ciclo"
                  valor={`Ciclo ${piscinaMuestreoFormulario.cicloActual}`}
                />

                <Info
                  titulo="Siembra"
                  valor={
                    piscinaMuestreoFormulario.cantidadSembrada
                      ? formatearEntero(
                          piscinaMuestreoFormulario.cantidadSembrada
                        )
                      : 'Sin siembra'
                  }
                />
              </div>
            )}

            {previewLances > 0 &&
              previewCamarones > 0 &&
              previewAreaAtarraya > 0 && (
                <div
                  style={{
                    padding: '16px',
                    background: '#eef8f5',
                    borderRadius: '13px',
                    marginBottom: '16px',
                  }}
                >
                  <div
                    style={{
                      fontWeight: 800,
                      marginBottom: '12px',
                    }}
                  >
                    Cálculo automático
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns:
                        'repeat(auto-fit, minmax(150px, 1fr))',
                      gap: '12px',
                    }}
                  >
                    <Info
                      titulo="Promedio/lance"
                      valor={formatearNumero(previewPromedio, 2)}
                    />

                    <Info
                      titulo="Cam/m²"
                      valor={formatearNumero(previewCamM2, 2)}
                    />

                    <Info
                      titulo="Población estimada"
                      valor={formatearEntero(previewPoblacion)}
                    />

                    <Info
                      titulo="Biomasa"
                      valor={
                        pesoPreview
                          ? `${formatearEntero(previewBiomasa)} kg`
                          : 'Falta peso'
                      }
                    />

                    <Info
                      titulo="Supervivencia"
                      valor={`${formatearNumero(previewSupervivencia, 2)}%`}
                    />
                  </div>

                  <div
                    style={{
                      marginTop: '13px',
                      fontSize: '12px',
                      color: '#5f7772',
                      lineHeight: 1.6,
                    }}
                  >
                    Cam/m² = Total camarones ÷ (lances × área de atarraya)
                  </div>
                </div>
              )}

            <ModalActions
              cancelar={() => {
                setMostrarMuestreo(false);
                setMuestreoEditandoId(null);
              }}
              textoGuardar={
                muestreoEditandoId ? 'Guardar cambios' : 'Guardar muestreo'
              }
            />
          </form>
        </Modal>
      )}
    </div>
  );
}

/* =========================================================
   COMPONENTES
========================================================= */

function MiniCard({
  titulo,
  valor,
  detalle,
  icono,
}: {
  titulo: string;
  valor: string;
  detalle: string;
  icono: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e5ecea',
        borderRadius: '14px',
        padding: '15px',
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '12px',
          display: 'grid',
          placeItems: 'center',
          background: '#edf7f4',
          flexShrink: 0,
        }}
      >
        {icono}
      </div>

      <div>
        <div
          style={{
            fontSize: '12px',
            color: '#75848a',
            marginBottom: '3px',
          }}
        >
          {titulo}
        </div>

        <div
          style={{
            fontWeight: 800,
            fontSize: '17px',
          }}
        >
          {valor}
        </div>

        <div
          style={{
            fontSize: '11px',
            color: '#87949a',
            marginTop: '2px',
          }}
        >
          {detalle}
        </div>
      </div>
    </div>
  );
}

function PanelHeader({
  titulo,
  descripcion,
  boton,
  onClick,
}: {
  titulo: string;
  descripcion: string;
  boton: string;
  onClick: () => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '15px',
        flexWrap: 'wrap',
        marginBottom: '12px',
      }}
    >
      <div>
        <h2
          style={{
            margin: 0,
            fontSize: '20px',
          }}
        >
          {titulo}
        </h2>

        <p
          style={{
            margin: '5px 0 0',
            color: '#718188',
            fontSize: '13px',
          }}
        >
          {descripcion}
        </p>
      </div>

      <button onClick={onClick} style={primaryButtonStyle}>
        <Plus size={17} />
        {boton}
      </button>
    </div>
  );
}

function ResultadoCard({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #dceae6',
        borderRadius: '13px',
        padding: '15px',
      }}
    >
      <div
        style={{
          color: '#71837e',
          fontSize: '12px',
          marginBottom: '5px',
        }}
      >
        {titulo}
      </div>

      <strong
        style={{
          fontSize: '20px',
        }}
      >
        {valor}
      </strong>
    </div>
  );
}

function EmptyState({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div
      style={{
        padding: '45px 20px',
        textAlign: 'center',
        color: '#76868b',
      }}
    >
      <TrendingUp
        size={35}
        style={{
          marginBottom: '10px',
        }}
      />

      <div
        style={{
          fontWeight: 800,
          color: '#43565b',
          marginBottom: '5px',
        }}
      >
        {titulo}
      </div>

      <div>{texto}</div>
    </div>
  );
}

function Modal({
  titulo,
  subtitulo,
  cerrar,
  children,
}: {
  titulo: string;
  subtitulo: string;
  cerrar: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      onClick={cerrar}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(18, 35, 38, 0.45)',
        display: 'grid',
        placeItems: 'center',
        padding: '20px',
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          width: 'min(760px, 100%)',
          maxHeight: '90vh',
          overflowY: 'auto',
          borderRadius: '18px',
          padding: '22px',
          boxShadow: '0 20px 50px rgba(0,0,0,.18)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '20px',
            marginBottom: '20px',
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
              }}
            >
              {titulo}
            </h2>

            <p
              style={{
                margin: '5px 0 0',
                color: '#718188',
              }}
            >
              {subtitulo}
            </p>
          </div>

          <button
            onClick={cerrar}
            type="button"
            style={{
              border: 0,
              background: '#f2f5f5',
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '20px',
            }}
          >
            ×
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

function Campo({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <label
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '7px',
        fontSize: '13px',
        fontWeight: 700,
        marginBottom: '14px',
      }}
    >
      {titulo}
      {children}
    </label>
  );
}

function Info({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div>
      <div
        style={{
          fontSize: '11px',
          color: '#758681',
          marginBottom: '4px',
        }}
      >
        {titulo}
      </div>

      <strong>{valor}</strong>
    </div>
  );
}

function ModalActions({
  cancelar,
  textoGuardar,
}: {
  cancelar: () => void;
  textoGuardar: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '10px',
        marginTop: '20px',
      }}
    >
      <button type="button" onClick={cancelar} style={secondaryButtonStyle}>
        Cancelar
      </button>

      <button type="submit" style={primaryButtonStyle}>
        {textoGuardar}
      </button>
    </div>
  );
}

/* =========================================================
   ESTILOS
========================================================= */

const panelStyle: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid #e4ecea',
  borderRadius: '15px',
  overflow: 'hidden',
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  minWidth: '850px',
};

const thStyle: React.CSSProperties = {
  padding: '13px 15px',
  background: '#f6f8f8',
  color: '#66777d',
  fontSize: '12px',
  textAlign: 'left',
  borderBottom: '1px solid #e5ecea',
};

const tdStyle: React.CSSProperties = {
  padding: '14px 15px',
  borderBottom: '1px solid #edf1f0',
  fontSize: '13px',
  color: '#405157',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  border: '1px solid #dce5e3',
  borderRadius: '10px',
  padding: '11px 12px',
  background: '#ffffff',
  fontSize: '14px',
  outline: 'none',
};

const primaryButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '7px',
  border: 0,
  borderRadius: '10px',
  padding: '11px 15px',
  cursor: 'pointer',
  background: '#23745f',
  color: '#ffffff',
  fontWeight: 700,
};

const secondaryButtonStyle: React.CSSProperties = {
  border: '1px solid #dce5e3',
  borderRadius: '10px',
  padding: '10px 15px',
  cursor: 'pointer',
  background: '#ffffff',
  color: '#485a5f',
  fontWeight: 700,
};

const dangerButtonStyle: React.CSSProperties = {
  border: '1px solid #eadcdc',
  background: '#fff7f7',
  borderRadius: '8px',
  padding: '7px 9px',
  cursor: 'pointer',
};

const formGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '0 15px',
};

const tabStyle: React.CSSProperties = {
  border: 0,
  background: 'transparent',
  borderRadius: '10px',
  padding: '10px 16px',
  cursor: 'pointer',
  color: '#65757a',
  fontWeight: 700,
};

const tabActivoStyle: React.CSSProperties = {
  background: '#eaf6f2',
  color: '#246b59',
};
