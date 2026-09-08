import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  CalendarDays,
  Droplets,
  Gauge,
  Package,
  Scale,
  Sprout,
  Waves,
} from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { useAquaProStore } from '../store/aquaProStore';

const PESCAS_STORAGE_KEY = 'aquapro-pescas-v1';
const PESOS_STORAGE_KEY = 'aquapro-pesos-v1';
const BIOMASA_STORAGE_KEY = 'aquapro-biomasa-v1';
const ALIMENTACION_STORAGE_KEY = 'aquapro-alimentacion-v2';
const CALIDAD_STORAGE_KEY = 'aquapro-calidad-agua-v1';

type RegistroPesca = {
  id: number;
  piscina: string;
  piscinaId?: number;
  cicloId?: number;
  cicloActual: number;
  tipo: 'Raleo' | 'Pesca' | 'Venta local';
  fecha: string;
  libras: number;
  estado: 'Finalizado' | 'En proceso' | 'Programada';
  pesoInicial?: number;
  pesoFinal?: number;
  pesoVentaLocal?: number;
  noches?: Array<{
    id: number;
    numero: number;
    fecha: string;
    libras: number;
    pesoInicial?: number;
    pesoFinal?: number;
  }>;
};

type RegistroPeso = {
  id: number;
  piscinaId: number;
  ciclo: number;
  fecha: string;
  pesoPromedio: number;
  observacion?: string;
};

type RegistroBiomasa = {
  id: number;
  piscinaId: number;
  ciclo: number;
  fecha: string;
  pesoUtilizado: number;
  poblacionEstimada: number;
  biomasaKg: number;
  supervivencia: number;
  camaronesMetroCuadrado: number;
};

type RegistroAlimentacion = {
  id: number;
  piscinaId: number;
  ciclo: number;
  fecha: string;
  tipoBalanceado: string;
  nombreBalanceado?: string;
  cantidadKg: number;
  observacion?: string;
};

type RegistroCalidad = {
  id: number;
  piscinaId: number;
  cicloId?: number;
  ciclo: number;
  fecha: string;
  hora: string;
  oxigeno: number;
  saturacion: number;
  temperatura: number;
  salinidad: number | null;
  ph: number | null;
};

function leerLocalStorage<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function numero(valor: unknown) {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
}

function formatoNumero(valor: number | null | undefined, decimales = 2) {
  if (valor === null || valor === undefined || !Number.isFinite(valor))
    return '—';
  return valor.toLocaleString('es-EC', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });
}

function formatoEntero(valor: number | null | undefined) {
  if (valor === null || valor === undefined || !Number.isFinite(valor))
    return '—';
  return Math.round(valor).toLocaleString('es-EC');
}

function fechaBonita(fecha?: string | null) {
  if (!fecha) return '—';
  const [y, m, d] = fecha.split('-').map(Number);
  if (!y || !m || !d) return fecha;
  return new Intl.DateTimeFormat('es-EC', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

function diferenciaDias(inicio?: string | null, fin?: string | null) {
  if (!inicio) return null;
  const inicioMs = new Date(`${inicio}T00:00:00`).getTime();
  const finMs = fin
    ? new Date(`${fin}T00:00:00`).getTime()
    : new Date().setHours(0, 0, 0, 0);
  if (!Number.isFinite(inicioMs) || !Number.isFinite(finMs)) return null;
  return Math.max(0, Math.round((finMs - inicioMs) / 86400000));
}

function promedio(valores: Array<number | null | undefined>) {
  const validos = valores.filter(
    (v): v is number => v !== null && v !== undefined && Number.isFinite(v)
  );
  if (!validos.length) return null;
  return validos.reduce((a, b) => a + b, 0) / validos.length;
}

export default function Reportes() {
  const { piscinas, ciclos } = useAquaProStore();

  const [pescas, setPescas] = useState<RegistroPesca[]>([]);
  const [pesos, setPesos] = useState<RegistroPeso[]>([]);
  const [biomasa, setBiomasa] = useState<RegistroBiomasa[]>([]);
  const [alimentacion, setAlimentacion] = useState<RegistroAlimentacion[]>([]);
  const [calidad, setCalidad] = useState<RegistroCalidad[]>([]);

  const piscinasConCiclos = useMemo(
    () => piscinas.filter((p) => ciclos.some((c) => c.piscinaId === p.id)),
    [piscinas, ciclos]
  );

  const [piscinaId, setPiscinaId] = useState<number>(0);
  const [cicloNumero, setCicloNumero] = useState<number>(0);

  useEffect(() => {
    setPescas(leerLocalStorage<RegistroPesca>(PESCAS_STORAGE_KEY));
    setPesos(leerLocalStorage<RegistroPeso>(PESOS_STORAGE_KEY));
    setBiomasa(leerLocalStorage<RegistroBiomasa>(BIOMASA_STORAGE_KEY));
    setAlimentacion(
      leerLocalStorage<RegistroAlimentacion>(ALIMENTACION_STORAGE_KEY)
    );
    setCalidad(leerLocalStorage<RegistroCalidad>(CALIDAD_STORAGE_KEY));
  }, []);

  useEffect(() => {
    if (!piscinasConCiclos.length) {
      setPiscinaId(0);
      return;
    }

    if (!piscinasConCiclos.some((p) => p.id === piscinaId)) {
      setPiscinaId(piscinasConCiclos[0].id);
    }
  }, [piscinasConCiclos, piscinaId]);

  const ciclosPiscina = useMemo(
    () =>
      ciclos
        .filter((c) => c.piscinaId === piscinaId)
        .sort((a, b) => b.numero - a.numero),
    [ciclos, piscinaId]
  );

  useEffect(() => {
    if (!ciclosPiscina.length) {
      setCicloNumero(0);
      return;
    }

    if (!ciclosPiscina.some((c) => c.numero === cicloNumero)) {
      setCicloNumero(ciclosPiscina[0].numero);
    }
  }, [ciclosPiscina, cicloNumero]);

  const piscina = piscinas.find((p) => p.id === piscinaId) ?? null;
  const ciclo = ciclosPiscina.find((c) => c.numero === cicloNumero) ?? null;

  const pescasCiclo = useMemo(() => {
    if (!piscina || !cicloNumero) return [];
    return pescas.filter(
      (r) =>
        r.cicloActual === cicloNumero &&
        (r.piscinaId === piscina.id ||
          (!r.piscinaId &&
            r.piscina.toLowerCase() === piscina.nombre.toLowerCase()))
    );
  }, [pescas, piscina, cicloNumero]);

  const pesosCiclo = useMemo(
    () =>
      pesos
        .filter((r) => r.piscinaId === piscinaId && r.ciclo === cicloNumero)
        .sort((a, b) => a.fecha.localeCompare(b.fecha)),
    [pesos, piscinaId, cicloNumero]
  );

  const biomasaCiclo = useMemo(
    () =>
      biomasa
        .filter((r) => r.piscinaId === piscinaId && r.ciclo === cicloNumero)
        .sort((a, b) => a.fecha.localeCompare(b.fecha)),
    [biomasa, piscinaId, cicloNumero]
  );

  const alimentacionCiclo = useMemo(
    () =>
      alimentacion
        .filter((r) => r.piscinaId === piscinaId && r.ciclo === cicloNumero)
        .sort((a, b) => a.fecha.localeCompare(b.fecha)),
    [alimentacion, piscinaId, cicloNumero]
  );

  const calidadCiclo = useMemo(
    () =>
      calidad
        .filter((r) => r.piscinaId === piscinaId && r.ciclo === cicloNumero)
        .sort((a, b) =>
          `${a.fecha} ${a.hora}`.localeCompare(`${b.fecha} ${b.hora}`)
        ),
    [calidad, piscinaId, cicloNumero]
  );

  const raleosLb = pescasCiclo
    .filter((r) => r.tipo === 'Raleo' && r.estado !== 'Programada')
    .reduce((sum, r) => sum + numero(r.libras), 0);

  const pescasLb = pescasCiclo
    .filter((r) => r.tipo === 'Pesca' && r.estado !== 'Programada')
    .reduce((sum, r) => sum + numero(r.libras), 0);

  const ventaLocalLb = pescasCiclo
    .filter((r) => r.tipo === 'Venta local' && r.estado !== 'Programada')
    .reduce((sum, r) => sum + numero(r.libras), 0);

  const produccionTotalLb = raleosLb + pescasLb + ventaLocalLb;

  const balanceadoKg = alimentacionCiclo.reduce(
    (sum, r) => sum + numero(r.cantidadKg),
    0
  );

  // FCA = alimento suministrado en libras / libras producidas.
  const fca =
    produccionTotalLb > 0 ? (balanceadoKg * 2.2046) / produccionTotalLb : null;

  const ultimoPeso = pesosCiclo.length
    ? pesosCiclo[pesosCiclo.length - 1]
    : null;
  const ultimoMuestreo = biomasaCiclo.length
    ? biomasaCiclo[biomasaCiclo.length - 1]
    : null;

  const diasCultivo = diferenciaDias(ciclo?.fechaInicio, ciclo?.fechaCierre);
  const produccionHa =
    piscina && piscina.hectareas > 0
      ? produccionTotalLb / piscina.hectareas
      : null;
  const balanceadoHa =
    piscina && piscina.hectareas > 0 ? balanceadoKg / piscina.hectareas : null;

  const oxigenoProm = promedio(calidadCiclo.map((r) => r.oxigeno));
  const saturacionProm = promedio(calidadCiclo.map((r) => r.saturacion));
  const temperaturaProm = promedio(calidadCiclo.map((r) => r.temperatura));
  const salinidadProm = promedio(calidadCiclo.map((r) => r.salinidad));
  const phProm = promedio(calidadCiclo.map((r) => r.ph));
  const oxigenoMin = calidadCiclo.length
    ? Math.min(...calidadCiclo.map((r) => r.oxigeno))
    : null;

  const datosPeso = pesosCiclo.map((r) => ({
    fecha: r.fecha.slice(5),
    peso: r.pesoPromedio,
  }));

  let acumulado = 0;
  const datosAlimento = alimentacionCiclo.map((r) => {
    acumulado += numero(r.cantidadKg);
    return { fecha: r.fecha.slice(5), kg: acumulado };
  });

  const datosOxigeno = calidadCiclo.map((r) => ({
    fecha: `${r.fecha.slice(5)} ${r.hora}`,
    oxigeno: r.oxigeno,
  }));

  if (!piscinasConCiclos.length) {
    return (
      <div style={styles.page}>
        <div style={styles.empty}>
          <div style={{ fontSize: 44 }}>📊</div>
          <h2 style={{ margin: '8px 0' }}>
            Todavía no hay ciclos para reportar
          </h2>
          <p style={styles.muted}>
            Cuando registres una siembra, AquaPro podrá construir el reporte del
            ciclo.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.heading}>
        <div>
          <div style={styles.eyebrow}>ANÁLISIS PRODUCTIVO</div>
          <h1 style={styles.h1}>📊 Reportes</h1>
          <p style={styles.muted}>
            Resumen completo por piscina y ciclo, incluido el factor de
            conversión alimenticia.
          </p>
        </div>

        <div style={styles.filters}>
          <label style={styles.filterLabel}>
            Piscina
            <select
              value={piscinaId}
              onChange={(e) => setPiscinaId(Number(e.target.value))}
              style={styles.select}
            >
              {piscinasConCiclos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </label>

          <label style={styles.filterLabel}>
            Ciclo
            <select
              value={cicloNumero}
              onChange={(e) => setCicloNumero(Number(e.target.value))}
              style={styles.select}
            >
              {ciclosPiscina.map((c) => (
                <option key={c.id} value={c.numero}>
                  Ciclo {c.numero} · {c.estado}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {piscina && ciclo && (
        <>
          <section style={styles.heroCard}>
            <div>
              <div style={styles.heroTop}>
                <span style={styles.poolBadge}>{piscina.nombre}</span>
                <span
                  style={{
                    ...styles.statusBadge,
                    ...(ciclo.estado === 'Cerrado'
                      ? styles.statusClosed
                      : styles.statusActive),
                  }}
                >
                  {ciclo.estado === 'Cerrado'
                    ? '🔒 Ciclo cerrado'
                    : '🟢 Ciclo activo'}
                </span>
              </div>
              <h2 style={styles.heroTitle}>Ciclo {ciclo.numero}</h2>
              <div style={styles.heroMeta}>
                <span>📍 Zona {piscina.zona}</span>
                <span>📐 {formatoNumero(piscina.hectareas, 2)} ha</span>
                <span>🌱 Inicio {fechaBonita(ciclo.fechaInicio)}</span>
                <span>⏱️ {diasCultivo ?? 0} días de cultivo</span>
              </div>
            </div>

            <div style={styles.fcaHero}>
              <span>
                {ciclo.estado === 'Cerrado' ? 'FCA FINAL' : 'FCA PARCIAL'}
              </span>
              <strong>{fca === null ? '—' : formatoNumero(fca, 2)}</strong>
              <small>Balanceado lb ÷ producción lb</small>
            </div>
          </section>

          <section style={styles.summaryGrid}>
            <SummaryCard
              emoji="🌱"
              label="Larvas sembradas"
              value={formatoEntero(ciclo.siembra?.cantidadSembrada ?? null)}
              note="larvas"
            />
            <SummaryCard
              emoji="⚖️"
              label="Último peso"
              value={
                ultimoPeso
                  ? `${formatoNumero(ultimoPeso.pesoPromedio, 2)} g`
                  : '—'
              }
              note={
                ultimoPeso ? fechaBonita(ultimoPeso.fecha) : 'Sin registros'
              }
            />
            <SummaryCard
              emoji="🦐"
              label="Producción total"
              value={`${formatoEntero(produccionTotalLb)} lb`}
              note={`${formatoEntero(produccionHa)} lb/ha`}
            />
            <SummaryCard
              emoji="🌾"
              label="Balanceado"
              value={`${formatoEntero(balanceadoKg)} kg`}
              note={`${formatoEntero(balanceadoHa)} kg/ha`}
            />
            <SummaryCard
              emoji="🔄"
              label={ciclo.estado === 'Cerrado' ? 'FCA final' : 'FCA parcial'}
              value={fca === null ? '—' : formatoNumero(fca, 2)}
              note={
                produccionTotalLb ? 'Cálculo automático' : 'Falta producción'
              }
              highlighted
            />
            <SummaryCard
              emoji="🧬"
              label="Supervivencia"
              value={
                ultimoMuestreo
                  ? `${formatoNumero(ultimoMuestreo.supervivencia, 2)} %`
                  : '—'
              }
              note={
                ultimoMuestreo
                  ? fechaBonita(ultimoMuestreo.fecha)
                  : 'Sin muestreo'
              }
            />
          </section>

          <section style={styles.twoColumns}>
            <Panel title="🌱 Siembra y crecimiento" icon={<Sprout size={19} />}>
              <DataRow
                label="Fecha de siembra"
                value={fechaBonita(ciclo.siembra?.fecha)}
              />
              <DataRow
                label="Larvas sembradas"
                value={formatoEntero(ciclo.siembra?.cantidadSembrada ?? null)}
              />
              <DataRow
                label="Densidad de siembra"
                value={
                  ciclo.siembra?.cantidadSembrada && piscina.hectareas > 0
                    ? `${Math.round(
                        ciclo.siembra.cantidadSembrada / piscina.hectareas
                      ).toLocaleString('es-EC')} larvas/ha`
                    : '—'
                }
              />
              <DataRow
                label="Peso inicial"
                value={
                  ciclo.siembra?.pesoInicial != null
                    ? `${formatoNumero(ciclo.siembra.pesoInicial, 3)} g`
                    : '—'
                }
              />
              <DataRow
                label="Último peso registrado"
                value={
                  ultimoPeso
                    ? `${formatoNumero(ultimoPeso.pesoPromedio, 2)} g`
                    : '—'
                }
              />
              <DataRow
                label="Días de cultivo"
                value={`${diasCultivo ?? 0} días`}
              />
              <DataRow
                label="Fecha de cierre"
                value={fechaBonita(ciclo.fechaCierre)}
              />
            </Panel>

            <Panel title="🦐 Biomasa actual / final" icon={<Gauge size={19} />}>
              <DataRow
                label="Población estimada"
                value={formatoEntero(ultimoMuestreo?.poblacionEstimada)}
              />
              <DataRow
                label="Biomasa"
                value={
                  ultimoMuestreo
                    ? `${formatoEntero(ultimoMuestreo.biomasaKg)} kg`
                    : '—'
                }
              />
              <DataRow
                label="Supervivencia"
                value={
                  ultimoMuestreo
                    ? `${formatoNumero(ultimoMuestreo.supervivencia, 2)} %`
                    : '—'
                }
              />
              <DataRow
                label="Camarones/m²"
                value={formatoNumero(ultimoMuestreo?.camaronesMetroCuadrado, 2)}
              />
              <DataRow
                label="Peso usado en biomasa"
                value={
                  ultimoMuestreo
                    ? `${formatoNumero(ultimoMuestreo.pesoUtilizado, 2)} g`
                    : '—'
                }
              />
              <DataRow
                label="Último muestreo"
                value={fechaBonita(ultimoMuestreo?.fecha)}
              />
            </Panel>
          </section>

          <section style={styles.twoColumns}>
            <Panel title="🌾 Alimentación y FCA" icon={<Package size={19} />}>
              <DataRow
                label="Balanceado acumulado"
                value={`${formatoEntero(balanceadoKg)} kg`}
              />
              <DataRow
                label="Balanceado por hectárea"
                value={`${formatoEntero(balanceadoHa)} kg/ha`}
              />
              <DataRow
                label="Producción acumulada"
                value={`${formatoEntero(produccionTotalLb)} lb`}
              />
              <DataRow
                label={ciclo.estado === 'Cerrado' ? 'FCA final' : 'FCA parcial'}
                value={fca === null ? '—' : formatoNumero(fca, 2)}
                strong
              />
              <div style={styles.formulaBox}>
                <strong>
                  FCA = (Balanceado kg × 2,2046) ÷ Libras producidas
                </strong>
                <span>
                  {balanceadoKg > 0 && produccionTotalLb > 0
                    ? `(${formatoEntero(
                        balanceadoKg
                      )} × 2,2046) ÷ ${formatoEntero(
                        produccionTotalLb
                      )} = ${formatoNumero(fca, 2)}`
                    : 'Se calculará cuando exista alimento y producción en el ciclo.'}
                </span>
              </div>
            </Panel>

            <Panel title="🌊 Producción" icon={<Waves size={19} />}>
              <DataRow label="Raleos" value={`${formatoEntero(raleosLb)} lb`} />
              <DataRow label="Pescas" value={`${formatoEntero(pescasLb)} lb`} />
              <DataRow
                label="Venta local"
                value={`${formatoEntero(ventaLocalLb)} lb`}
              />
              <DataRow
                label="Producción total"
                value={`${formatoEntero(produccionTotalLb)} lb`}
                strong
              />
              <DataRow
                label="Producción por hectárea"
                value={`${formatoEntero(produccionHa)} lb/ha`}
              />
              <DataRow
                label="Registros de salida"
                value={String(pescasCiclo.length)}
              />
            </Panel>
          </section>

          <section style={styles.panel}>
            <div style={styles.panelHeader}>
              <div>
                <div style={styles.panelEyebrow}>CALIDAD DE AGUA</div>
                <h3 style={styles.panelTitle}>💧 Resumen del ciclo</h3>
              </div>
              <Droplets size={22} />
            </div>

            <div style={styles.waterGrid}>
              <WaterMetric
                label="Oxígeno promedio"
                value={oxigenoProm}
                unit="mg/L"
              />
              <WaterMetric
                label="Oxígeno mínimo"
                value={oxigenoMin}
                unit="mg/L"
                alert={oxigenoMin !== null && oxigenoMin <= 3.5}
              />
              <WaterMetric
                label="Saturación promedio"
                value={saturacionProm}
                unit="%"
              />
              <WaterMetric
                label="Temperatura promedio"
                value={temperaturaProm}
                unit="°C"
              />
              <WaterMetric
                label="Salinidad promedio"
                value={salinidadProm}
                unit="ppt"
              />
              <WaterMetric label="pH promedio" value={phProm} unit="" />
            </div>
          </section>

          <section style={styles.chartsGrid}>
            <ChartPanel title="📈 Evolución del peso" empty={!datosPeso.length}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={datosPeso}
                  margin={{ top: 10, right: 16, left: -8, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} unit=" g" />
                  <Tooltip formatter={(v) => [`${v} g`, 'Peso']} />
                  <Line
                    type="monotone"
                    dataKey="peso"
                    stroke="#22a890"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartPanel>

            <ChartPanel
              title="🌾 Balanceado acumulado"
              empty={!datosAlimento.length}
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={datosAlimento}
                  margin={{ top: 10, right: 16, left: -8, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} unit=" kg" />
                  <Tooltip
                    formatter={(v) => [
                      `${numero(v).toLocaleString('es-EC')} kg`,
                      'Acumulado',
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="kg"
                    stroke="#d9a441"
                    strokeWidth={3}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartPanel>

            <ChartPanel
              title="💨 Evolución del oxígeno"
              empty={!datosOxigeno.length}
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={datosOxigeno}
                  margin={{ top: 10, right: 16, left: -8, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="fecha"
                    tick={{ fontSize: 10 }}
                    minTickGap={25}
                  />
                  <YAxis tick={{ fontSize: 11 }} domain={[0, 'auto']} unit="" />
                  <Tooltip formatter={(v) => [`${v} mg/L`, 'Oxígeno']} />
                  <Line
                    type="monotone"
                    dataKey="oxigeno"
                    stroke="#4c9fbd"
                    strokeWidth={3}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartPanel>
          </section>

          <div style={styles.note}>
            <BarChart3 size={20} />
            <div>
              <strong>
                El reporte se construye con los registros reales del ciclo.
              </strong>
              <div style={styles.mutedSmall}>
                Si un dato todavía no ha sido registrado en Pesos, Biomasa,
                Alimentación, Pescas o Calidad de agua, AquaPro mostrará “—” sin
                inventar valores.
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({
  emoji,
  label,
  value,
  note,
  highlighted = false,
}: {
  emoji: string;
  label: string;
  value: string;
  note: string;
  highlighted?: boolean;
}) {
  return (
    <div
      style={{
        ...styles.summaryCard,
        ...(highlighted ? styles.summaryHighlighted : {}),
      }}
    >
      <div style={styles.summaryIcon}>{emoji}</div>
      <div>
        <div style={styles.summaryLabel}>{label}</div>
        <div style={styles.summaryValue}>{value}</div>
        <div style={styles.summaryNote}>{note}</div>
      </div>
    </div>
  );
}

function Panel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section style={styles.panel}>
      <div style={styles.panelHeader}>
        <h3 style={styles.panelTitle}>{title}</h3>
        <span style={{ color: '#3d8f83' }}>{icon}</span>
      </div>
      <div>{children}</div>
    </section>
  );
}

function DataRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div style={styles.dataRow}>
      <span>{label}</span>
      <strong style={strong ? { color: '#176f61', fontSize: 16 } : undefined}>
        {value}
      </strong>
    </div>
  );
}

function WaterMetric({
  label,
  value,
  unit,
  alert = false,
}: {
  label: string;
  value: number | null;
  unit: string;
  alert?: boolean;
}) {
  return (
    <div style={{ ...styles.waterCard, ...(alert ? styles.waterAlert : {}) }}>
      <span style={styles.waterLabel}>{label}</span>
      <strong style={styles.waterValue}>
        {value === null ? '—' : formatoNumero(value, 2)}
        {value !== null && unit ? ` ${unit}` : ''}
      </strong>
      {alert && (
        <small style={{ color: '#c83f4d', fontWeight: 750 }}>🔴 Crítico</small>
      )}
    </div>
  );
}

function ChartPanel({
  title,
  empty,
  children,
}: {
  title: string;
  empty: boolean;
  children: React.ReactNode;
}) {
  return (
    <section style={styles.chartPanel}>
      <h3 style={styles.chartTitle}>{title}</h3>
      <div style={styles.chartBody}>
        {empty ? (
          <div style={styles.chartEmpty}>
            Sin datos registrados para este ciclo.
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: '26px',
    minHeight: '100%',
    background: '#f6f9f9',
    color: '#183b36',
  },
  heading: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: '20px',
    flexWrap: 'wrap',
    marginBottom: '20px',
  },
  eyebrow: {
    fontSize: '11px',
    letterSpacing: '1.5px',
    fontWeight: 800,
    color: '#3a8f82',
  },
  h1: { margin: '4px 0 5px', fontSize: '30px' },
  muted: { margin: 0, color: '#71837f', lineHeight: 1.5 },
  mutedSmall: {
    marginTop: 4,
    color: '#71837f',
    fontSize: '12px',
    lineHeight: 1.5,
  },
  filters: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
  filterLabel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    fontSize: '12px',
    fontWeight: 750,
    color: '#60746f',
  },
  select: {
    minWidth: '170px',
    height: '42px',
    border: '1px solid #d5e1df',
    borderRadius: '11px',
    background: '#fff',
    padding: '0 12px',
    color: '#264b45',
    fontWeight: 650,
  },
  heroCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '18px',
    flexWrap: 'wrap',
    padding: '22px',
    borderRadius: '18px',
    background: 'linear-gradient(135deg, #eaf8f5 0%, #f7fcfb 100%)',
    border: '1px solid #cee8e2',
    marginBottom: '16px',
  },
  heroTop: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  poolBadge: {
    padding: '5px 10px',
    borderRadius: '999px',
    background: '#d9f1eb',
    color: '#176f61',
    fontSize: '12px',
    fontWeight: 800,
  },
  statusBadge: {
    padding: '5px 10px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 800,
  },
  statusActive: { background: '#eaf8f1', color: '#23845f' },
  statusClosed: { background: '#edf1f3', color: '#5d6970' },
  heroTitle: { margin: '9px 0 8px', fontSize: '25px' },
  heroMeta: {
    display: 'flex',
    gap: '14px',
    flexWrap: 'wrap',
    color: '#5f7772',
    fontSize: '13px',
  },
  fcaHero: {
    minWidth: '190px',
    padding: '16px 20px',
    borderRadius: '15px',
    background: '#fff',
    border: '1px solid #cfe5df',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    boxShadow: '0 8px 24px rgba(31, 111, 96, 0.08)',
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
    gap: '12px',
    marginBottom: '16px',
  },
  summaryCard: {
    background: '#fff',
    border: '1px solid #e0e8e6',
    borderRadius: '15px',
    padding: '15px',
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  summaryHighlighted: { background: '#edf9f6', border: '1px solid #bfe4db' },
  summaryIcon: {
    width: '42px',
    height: '42px',
    borderRadius: '12px',
    background: '#f2f7f6',
    display: 'grid',
    placeItems: 'center',
    fontSize: '21px',
  },
  summaryLabel: { color: '#71837f', fontSize: '12px', fontWeight: 700 },
  summaryValue: { fontSize: '19px', fontWeight: 850, marginTop: '2px' },
  summaryNote: { color: '#8a9895', fontSize: '11px', marginTop: '2px' },
  twoColumns: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))',
    gap: '14px',
    marginBottom: '14px',
  },
  panel: {
    background: '#fff',
    border: '1px solid #e0e8e6',
    borderRadius: '16px',
    padding: '18px',
    marginBottom: '14px',
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  panelEyebrow: {
    color: '#6f817d',
    fontSize: '10px',
    fontWeight: 800,
    letterSpacing: '1px',
  },
  panelTitle: { margin: 0, fontSize: '16px' },
  dataRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '16px',
    padding: '10px 0',
    borderBottom: '1px solid #eef2f1',
    color: '#61736f',
    fontSize: '13px',
  },
  formulaBox: {
    marginTop: '13px',
    padding: '12px 14px',
    borderRadius: '12px',
    background: '#f2f9f7',
    color: '#356a61',
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    fontSize: '12px',
    lineHeight: 1.5,
  },
  waterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '10px',
  },
  waterCard: {
    borderRadius: '12px',
    padding: '13px',
    background: '#f7faf9',
    border: '1px solid #e5ecea',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  waterAlert: { background: '#fff3f4', border: '1px solid #f1c8cd' },
  waterLabel: { fontSize: '11px', color: '#758682', fontWeight: 700 },
  waterValue: { fontSize: '17px' },
  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '14px',
    marginBottom: '14px',
  },
  chartPanel: {
    background: '#fff',
    border: '1px solid #e0e8e6',
    borderRadius: '16px',
    padding: '16px',
    minWidth: 0,
  },
  chartTitle: { margin: '0 0 12px', fontSize: '15px' },
  chartBody: { height: '245px', minWidth: 0 },
  chartEmpty: {
    height: '100%',
    display: 'grid',
    placeItems: 'center',
    color: '#879792',
    fontSize: '13px',
    background: '#fafcfc',
    borderRadius: '12px',
  },
  note: {
    display: 'flex',
    gap: '10px',
    padding: '14px 16px',
    borderRadius: '13px',
    background: '#eef8f6',
    color: '#356a61',
  },
  empty: {
    minHeight: '360px',
    display: 'grid',
    placeItems: 'center',
    alignContent: 'center',
    textAlign: 'center',
    background: '#fff',
    borderRadius: '18px',
    border: '1px solid #e1e9e7',
    padding: '30px',
  },
};
