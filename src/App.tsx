// src/App.tsx

import {
  Bell,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  Droplets,
  Fish,
  Gauge,
  Home,
  Menu,
  Package,
  Settings,
  UserRound,
  Waves,
} from 'lucide-react';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { useState } from 'react';
import Piscinas from './Pages/Piscinas';
import Pescas from './Pages/Pescas';
import Biomasa from './Pages/Biomasa';
import Alimentacion from './Pages/Alimentacion';
import CalidadAgua from './Pages/CalidadAgua';
import Reportes from './Pages/Reportes';

const biomassData = [
  { pool: 'P1', value: 1950 },
  { pool: 'P2', value: 1480 },
  { pool: 'P3', value: 2460 },
  { pool: 'P4', value: 1780 },
  { pool: 'P5', value: 1980 },
  { pool: 'P6', value: 2850 },
  { pool: 'P7', value: 1940 },
  { pool: 'P8', value: 2470 },
  { pool: 'P9', value: 1760 },
  { pool: 'P10', value: 2330 },
  { pool: 'P11', value: 2160 },
  { pool: 'P12', value: 1280 },
];

const sizeData = [
  { name: '< 10 g', value: 12 },
  { name: '10 - 15 g', value: 28 },
  { name: '15 - 20 g', value: 36 },
  { name: '> 20 g', value: 24 },
];

const evolutionData = [
  { month: 'Ene', value: 5 },
  { month: '', value: 6 },
  { month: 'Feb', value: 8 },
  { month: '', value: 12 },
  { month: 'Mar', value: 15 },
  { month: '', value: 18 },
  { month: 'Abr', value: 20 },
  { month: '', value: 22 },
  { month: 'May', value: 24 },
  { month: '', value: 27 },
  { month: 'Jun', value: 28.5 },
];

const activities = [
  {
    title: 'Alimentación',
    detail: 'Piscina 3',
    time: 'Hoy, 08:00',
    value: '250 kg',
  },
  {
    title: 'Control de agua',
    detail: 'Piscina 5',
    time: 'Hoy, 07:30',
    value: 'Normal',
  },
  {
    title: 'Muestreo de tallas',
    detail: 'Piscina 8',
    time: 'Ayer, 16:20',
    value: '16.8 g',
  },
  {
    title: 'Pesca finalizada',
    detail: 'Piscina 2',
    time: 'Ayer, 11:45',
    value: '1.2 t',
  },
];

const harvests = [
  {
    pool: 'Piscina 4',
    date: '18 jun 2025',
    estimate: 'Est. 1.5 t',
    status: 'Programada',
  },
  {
    pool: 'Piscina 7',
    date: '25 jun 2025',
    estimate: 'Est. 2.0 t',
    status: 'Pendiente',
  },
  {
    pool: 'Piscina 10',
    date: '02 jul 2025',
    estimate: 'Est. 1.8 t',
    status: 'Pendiente',
  },
];

function App() {
  const [mobileMenu, setMobileMenu] = useState(false);
  const [paginaActual, setPaginaActual] = useState('inicio');

  return (
    <div className="app">
      <aside className={`sidebar ${mobileMenu ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-icon">
  <img
  src={`${import.meta.env.BASE_URL}camaron.png`}
  alt="Camarón AquaPro"
  className="shrimp-logo"
/>
</div>

          <div className="brand-name">
            Aqua<span>Pro</span>
          </div>
          <div className="brand-subtitle">Producción que crece</div>
        </div>

        <nav className="nav">
          <NavItem
            active={paginaActual === 'inicio'}
            icon={<Home />}
            label="Inicio"
            onClick={() => setPaginaActual('inicio')}
          />

          <NavItem
            active={paginaActual === 'piscinas'}
            icon={<Waves />}
            label="Piscinas"
            onClick={() => setPaginaActual('piscinas')}
          />

          <NavItem
            active={paginaActual === 'pescas'}
            icon={<Fish />}
            label="Pescas"
            onClick={() => setPaginaActual('pescas')}
          />

          <NavItem
            active={paginaActual === 'biomasa'}
            icon={<Gauge />}
            label="Pesos y Biomasa"
            onClick={() => setPaginaActual('biomasa')}
          />

          <NavItem
            active={paginaActual === 'alimentacion'}
            icon={<Package />}
            label="Alimentación"
            onClick={() => setPaginaActual('alimentacion')}
          />

          <NavItem
            active={paginaActual === 'calidad-agua'}
            icon={<Droplets />}
            label="Calidad de agua"
            onClick={() => setPaginaActual('calidad-agua')}
          />
          <NavItem
            active={paginaActual === 'reportes'}
            icon={<Gauge />}
            label="Reportes"
            onClick={() => setPaginaActual('reportes')}
          />
          <NavItem icon={<CircleDollarSign />} label="Costos" />
          <NavItem icon={<UserRound />} label="Usuarios" />
          <NavItem icon={<Settings />} label="Configuración" />
        </nav>

        <div className="sidebar-message">
          <div className="wave-decoration">〰〰</div>
          <p>
            Cuidamos hoy
            <br />
            la producción
            <br />
            del mañana
          </p>
        </div>
      </aside>

      {mobileMenu && (
        <button
          className="mobile-overlay"
          onClick={() => setMobileMenu(false)}
        />
      )}

      <main className="content">
        <header className="topbar">
          <button className="menu-button" onClick={() => setMobileMenu(true)}>
            <Menu size={25} />
          </button>

          <div className="top-spacer" />

          <button className="notification">
            <Bell size={23} />
            <span />
          </button>

          <div className="profile">
            <div className="avatar">JR</div>

            <div className="profile-info">
              <strong>Juan Rodríguez</strong>
              <span>Administrador</span>
            </div>

            <ChevronDown size={18} />
          </div>
        </header>

        {paginaActual === 'piscinas' ? (
          <Piscinas />
        ) : paginaActual === 'pescas' ? (
          <Pescas />
        ) : paginaActual === 'biomasa' ? (
          <Biomasa />
        ) : paginaActual === 'alimentacion' ? (
          <Alimentacion />
        ) : paginaActual === 'calidad-agua' ? (
          <CalidadAgua />
        ) : paginaActual === 'reportes' ? (
          <Reportes />
        ) : (
          <>
            <section className="hero">
              <div className="hero-overlay" />

              <div className="hero-copy">
                <h1>¡Hola!</h1>
                <p>Aquí está el estado de tu producción</p>
              </div>

              <div className="hero-slogan">
                Camaronicultura
                <br />
                <span>con futuro</span>
              </div>

              <div className="hero-date">
                <CalendarDays size={22} />
                <div>
                  <strong>Lunes, 16 de junio de 2025</strong>
                  <span>Finca San Gabriel</span>
                </div>
              </div>
            </section>

            <div className="page">
              <section className="stats-grid">
                <StatCard
                  className="blue"
                  icon={<Waves />}
                  value="12"
                  label="Piscinas activas"
                  note="de 14"
                  progress={86}
                />

                <StatCard
                  className="green"
                  icon={<Fish />}
                  value="28.5 t"
                  label="Biomasa total"
                  note="+6.2% vs. semana anterior"
                />

                <StatCard
                  className="orange"
                  icon={<Gauge />}
                  value="2.4 t"
                  label="Producción acumulada"
                  note="Este ciclo"
                />

                <StatCard
                  className="red"
                  icon={<CalendarDays />}
                  value="1"
                  label="Pesca programada"
                  note="Esta semana"
                />
              </section>

              <section className="dashboard-grid dashboard-grid-top">
                <Card className="biomass-card">
                  <CardTitle icon={<Gauge />} title="Biomasa por piscina">
                    <button className="select-button">
                      Kg <ChevronDown size={16} />
                    </button>
                  </CardTitle>

                  <div className="chart-height">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={biomassData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="pool" />
                        <YAxis />
                        <Tooltip
                          formatter={(value) => [`${value} kg`, 'Biomasa']}
                          cursor={{ opacity: 0.1 }}
                        />
                        <Bar
                          dataKey="value"
                          radius={[5, 5, 0, 0]}
                          fill="#28becb"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card>
                  <CardTitle icon={<Fish />} title="Distribución de tallas" />

                  <div className="donut-layout">
                    <div className="donut-wrapper">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={sizeData}
                            dataKey="value"
                            innerRadius={64}
                            outerRadius={92}
                            paddingAngle={1}
                          >
                            {sizeData.map((_, index) => (
                              <Cell
                                key={index}
                                fill={
                                  ['#249fdb', '#15a6a8', '#ffa32a', '#f75b61'][
                                    index
                                  ]
                                }
                              />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>

                      <div className="donut-center">
                        <strong>28.5 t</strong>
                        <span>Biomasa total</span>
                      </div>
                    </div>

                    <div className="legend">
                      {sizeData.map((item, index) => (
                        <div className="legend-row" key={item.name}>
                          <span
                            className="legend-color"
                            style={{
                              background: [
                                '#249fdb',
                                '#15a6a8',
                                '#ffa32a',
                                '#f75b61',
                              ][index],
                            }}
                          />
                          <span className="legend-name">{item.name}</span>
                          <strong>{item.value}%</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              </section>

              <section className="dashboard-grid dashboard-grid-middle">
                <Card>
                  <CardTitle
                    icon={<Droplets />}
                    title="Parámetros de agua (promedio)"
                  >
                    <button className="link-button">Ver detalles →</button>
                  </CardTitle>

                  <div className="water-grid">
                    <WaterCard icon="🌡️" value="28.4 °C" label="Temperatura" />
                    <WaterCard icon="💧" value="7.8" label="pH" />
                    <WaterCard
                      icon="O₂"
                      value="5.6 mg/L"
                      label="Oxígeno disuelto"
                    />
                    <WaterCard icon="⚗️" value="18 ppt" label="Salinidad" />
                  </div>
                </Card>

                <Card>
                  <CardTitle
                    icon={<CalendarDays />}
                    title="Evolución de la biomasa"
                  >
                    <button className="select-button">
                      Este ciclo <ChevronDown size={16} />
                    </button>
                  </CardTitle>

                  <div className="chart-height smaller">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={evolutionData}>
                        <defs>
                          <linearGradient
                            id="biomassGradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#27bebf"
                              stopOpacity={0.32}
                            />
                            <stop
                              offset="100%"
                              stopColor="#27bebf"
                              stopOpacity={0.03}
                            />
                          </linearGradient>
                        </defs>

                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip
                          formatter={(value) => [`${value} t`, 'Biomasa']}
                        />

                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke="#15aaa9"
                          strokeWidth={3}
                          fill="url(#biomassGradient)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </section>

              <section className="dashboard-grid dashboard-grid-bottom">
                <Card>
                  <CardTitle icon={<Package />} title="Últimas actividades">
                    <button className="link-button">Ver todas</button>
                  </CardTitle>

                  <div className="activity-list">
                    {activities.map((activity) => (
                      <div className="activity-row" key={activity.title}>
                        <div className="activity-icon">
                          {activity.title === 'Alimentación' && '🧺'}
                          {activity.title === 'Control de agua' && '💧'}
                          {activity.title === 'Muestreo de tallas' && '🦐'}
                          {activity.title === 'Pesca finalizada' && '🐟'}
                        </div>

                        <div className="activity-main">
                          <strong>{activity.title}</strong>
                          <span>{activity.detail}</span>
                        </div>

                        <span className="activity-time">{activity.time}</span>

                        <strong className="activity-value">
                          {activity.value}
                        </strong>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card>
                  <CardTitle icon={<CalendarDays />} title="Próximas pescas">
                    <button className="link-button">Ver todas</button>
                  </CardTitle>

                  <div className="harvest-list">
                    {harvests.map((item) => (
                      <div className="harvest-row" key={item.pool}>
                        <div className="harvest-pool">
                          <strong>{item.pool}</strong>
                          <span>{item.date}</span>
                        </div>

                        <strong className="harvest-estimate">
                          {item.estimate}
                        </strong>

                        <span
                          className={`status ${
                            item.status === 'Programada'
                              ? 'status-success'
                              : 'status-pending'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>

                <div className="promo-card">
                  <div className="promo-overlay" />
                  <div className="promo-content">
                    <span>Camaron más sano,</span>
                    <strong>mayor rentabilidad</strong>
                    <div className="promo-arrow">↗</div>
                  </div>
                </div>
              </section>

              <section className="quick-actions">
                <QuickAction
                  className="quick-green"
                  icon={<Fish />}
                  text="Registrar pesca"
                />

                <QuickAction
                  className="quick-blue"
                  icon={<Package />}
                  text="Registrar alimentación"
                />

                <QuickAction
                  className="quick-teal"
                  icon={<Droplets />}
                  text="Ingresar parámetros de agua"
                />

                <QuickAction
                  className="quick-orange"
                  icon={<Gauge />}
                  text="Ver reportes"
                />

                <div className="quote-card">
                  <strong>
                    Disciplina hoy,
                    <br />
                    mejores cosechas mañana
                  </strong>
                  <span>🍃</span>
                </div>
              </section>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function NavItem({
  icon,
  label,
  active = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>
      <span>{icon}</span>
      {label}
    </button>
  );
}

function StatCard({
  icon,
  value,
  label,
  note,
  progress,
  className,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  note: string;
  progress?: number;
  className: string;
}) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${className}`}>{icon}</div>

      <div className="stat-info">
        <strong className="stat-value">{value}</strong>
        <span className="stat-label">{label}</span>

        {progress ? (
          <>
            <span className="stat-note">{note}</span>
            <div className="progress-row">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span>{progress}%</span>
            </div>
          </>
        ) : (
          <span className="stat-note">{note}</span>
        )}
      </div>
    </div>
  );
}

function Card({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`card ${className}`}>{children}</div>;
}

function CardTitle({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="card-title">
      <div className="card-title-left">
        <span>{icon}</span>
        <h3>{title}</h3>
      </div>

      {children}
    </div>
  );
}

function WaterCard({
  icon,
  value,
  label,
}: {
  icon: string;
  value: string;
  label: string;
}) {
  return (
    <div className="water-card">
      <div className="water-icon">{icon}</div>
      <strong>{value}</strong>
      <span>{label}</span>
      <div className="water-status">✓ Óptimo</div>
    </div>
  );
}

function QuickAction({
  icon,
  text,
  className,
}: {
  icon: React.ReactNode;
  text: string;
  className: string;
}) {
  return (
    <button className={`quick-action ${className}`}>
      <span className="quick-icon">{icon}</span>
      <strong>{text}</strong>
      <span className="quick-arrow">›</span>
    </button>
  );
}

export default App;
