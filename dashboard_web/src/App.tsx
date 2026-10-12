import { useState, useEffect } from 'react';
import type {
  Ranking,
  Year,
  Subject,
  MundialKpis,
  MundialEvolucion,
  MundialBrechaInd,
  MundialUniversidad,
  RegionalKpis,
  RegionalEvolucion,
  RegionalBrechaInd,
  RegionalUniversidad,
  RegionalPaisItem,
  RegionalUniItem,
  MejorasResumen,
  MejoraCambioItem,
  OportunidadItem
} from './services/api';
import {
  fetchRankings,
  fetchYears,
  fetchSubjects,
  fetchMundialKpis,
  fetchMundialEvolucion,
  fetchMundialBrechas,
  fetchMundialUniversidades,
  fetchRegionalKpis,
  fetchRegionalEvolucion,
  fetchRegionalBrechas,
  fetchRegionalUniversidades,
  fetchRegionalPaises,
  fetchRegionalUniversidadesLista,
  fetchNacionalKpis,
  fetchNacionalEvolucion,
  fetchNacionalBrechas,
  fetchNacionalUniversidades,
  fetchParesNacional,
  fetchMejorasResumen,
  fetchMejorasCambios,
  fetchMejorasOportunidades
} from './services/api';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { Globe, MapPin, Flag, TrendingUp, CheckCircle2, Filter } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'mundial' | 'regional' | 'nacional' | 'mejora'>('mundial');

  // Filters State
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [years, setYears] = useState<Year[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [selectedRanking, setSelectedRanking] = useState<string>('QS_WORLD');
  const [anioInicio, setAnioInicio] = useState<number>(2024);
  const [anioFin, setAnioFin] = useState<number>(2027);
  const [selectedSubject, setSelectedSubject] = useState<string>('computer-science');

  // Regional Dropdowns & Filters State
  const [regionalPaises, setRegionalPaises] = useState<RegionalPaisItem[]>([]);
  const [regionalUniversidadesList, setRegionalUniversidadesList] = useState<RegionalUniItem[]>([]);
  const [selectedRegionalPais, setSelectedRegionalPais] = useState<string>('');
  const [selectedRegionalUniId, setSelectedRegionalUniId] = useState<number | undefined>(undefined);

  // Toggles for National
  const [soloParesNacional, setSoloParesNacional] = useState<boolean>(false);
  const [paresNacionalList, setParesNacionalList] = useState<any[]>([]);

  // Page 1 Data State (Mundial)
  const [mundialKpis, setMundialKpis] = useState<MundialKpis | null>(null);
  const [mundialEvolucion, setMundialEvolucion] = useState<MundialEvolucion | null>(null);
  const [mundialBrechas, setMundialBrechas] = useState<MundialBrechaInd[]>([]);
  const [mundialUniversidades, setMundialUniversidades] = useState<MundialUniversidad[]>([]);

  // Page 2 Data State (Regional)
  const [regionalKpis, setRegionalKpis] = useState<RegionalKpis | null>(null);
  const [regionalEvolucion, setRegionalEvolucion] = useState<RegionalEvolucion | null>(null);
  const [regionalBrechas, setRegionalBrechas] = useState<RegionalBrechaInd[]>([]);
  const [regionalUniversidades, setRegionalUniversidades] = useState<RegionalUniversidad[]>([]);

  // Page 3 Data State (Nacional)
  const [nacionalKpis, setNacionalKpis] = useState<RegionalKpis | null>(null);
  const [nacionalEvolucion, setNacionalEvolucion] = useState<RegionalEvolucion | null>(null);
  const [nacionalBrechas, setNacionalBrechas] = useState<RegionalBrechaInd[]>([]);
  const [nacionalUniversidades, setNacionalUniversidades] = useState<RegionalUniversidad[]>([]);

  // Page 4 Data State (Mejoras, caídas y oportunidades)
  const [mejorasResumen, setMejorasResumen] = useState<MejorasResumen | null>(null);
  const [mejorasCambios, setMejorasCambios] = useState<MejoraCambioItem[]>([]);
  const [mejorasOportunidades, setMejorasOportunidades] = useState<OportunidadItem[]>([]);

  const [error, setError] = useState<string | null>(null);

  // Initial load
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const [rRes, yRes, pRegRes, pnRes, uRegRes] = await Promise.all([
          fetchRankings(),
          fetchYears(),
          fetchRegionalPaises(),
          fetchParesNacional(),
          fetchRegionalUniversidadesLista()
        ]);
        setRankings(rRes);
        setYears(yRes);
        setRegionalPaises(pRegRes);
        setParesNacionalList(pnRes);
        setRegionalUniversidadesList(uRegRes);
        if (rRes.length > 0) setSelectedRanking(rRes[0].id_ranking);
      } catch (err: any) {
        setError('Error al conectar con FastAPI en http://localhost:8000');
        console.error(err);
      }
    };
    loadFilters();
  }, []);

  // Load subjects when ranking changes
  useEffect(() => {
    if (!selectedRanking) return;
    fetchSubjects(selectedRanking)
      .then((data) => {
        setSubjects(data);
        if (data.length > 0) setSelectedSubject(data[0].id_subject);
      })
      .catch((err) => console.error('Error cargando subjects:', err));
  }, [selectedRanking]);

  // Update regional university list when country changes
  useEffect(() => {
    fetchRegionalUniversidadesLista(selectedRegionalPais || undefined)
      .then((list) => {
        setRegionalUniversidadesList(list);
        setSelectedRegionalUniId(undefined); // reset university selection on country change
      })
      .catch((err) => console.error('Error cargando universidades regionales:', err));
  }, [selectedRegionalPais]);

  // Load Page 1 Data
  useEffect(() => {
    if (activeTab === 'mundial' && selectedRanking && selectedSubject) {
      setError(null);
      const start = anioInicio;
      const fin = anioInicio <= anioFin ? anioFin : anioInicio;
      Promise.all([
        fetchMundialKpis(start, fin, selectedRanking, selectedSubject),
        fetchMundialEvolucion(start, fin, selectedRanking, selectedSubject),
        fetchMundialBrechas(fin, selectedRanking, selectedSubject),
        fetchMundialUniversidades(fin, selectedRanking, selectedSubject)
      ])
        .then(([k, e, b, u]) => {
          setMundialKpis(k);
          setMundialEvolucion(e);
          setMundialBrechas(b);
          setMundialUniversidades(u);
        })
        .catch((err) => {
          setError('Error al cargar datos de Situación Mundial.');
          console.error(err);
        });
    }
  }, [activeTab, selectedRanking, selectedSubject, anioInicio, anioFin]);

  // Load Page 2 Data (Regional)
  useEffect(() => {
    if (activeTab === 'regional' && selectedRanking && selectedSubject) {
      setError(null);
      const start = anioInicio;
      const fin = anioInicio <= anioFin ? anioFin : anioInicio;
      setSelectedRanking('QS_LATAM_CARIBE');
      setSelectedSubject('QS_LATAM_CARIBE_GENERAL');
      Promise.all([
        fetchRegionalKpis(start, fin, selectedRanking, selectedSubject, selectedRegionalPais || undefined, selectedRegionalUniId),
        fetchRegionalEvolucion(start, fin, selectedRanking, selectedSubject, selectedRegionalPais || undefined, selectedRegionalUniId),
        fetchRegionalBrechas(fin, selectedRanking, selectedSubject, selectedRegionalPais || undefined, selectedRegionalUniId),
        fetchRegionalUniversidades(fin, selectedRanking, selectedSubject, selectedRegionalPais || undefined)
      ])
        .then(([k, e, b, u]) => {
          setRegionalKpis(k);
          setRegionalEvolucion(e);
          setRegionalBrechas(b);
          setRegionalUniversidades(u);
          console.log('Regional data loaded:', { k, e, b, u });
          console.log('selectedRanking:', selectedRanking, 'selectedSubject:', selectedSubject);
        })
        .catch((err) => {
          setError('Error al cargar datos de Situación Regional.');
          console.error(err);
        });
    }
  }, [activeTab, selectedRanking, selectedSubject, anioInicio, anioFin, selectedRegionalPais, selectedRegionalUniId]);

  // Load Page 3 Data (Nacional)
  useEffect(() => {
    if (activeTab === 'nacional' && selectedRanking && selectedSubject) {
      setError(null);
      const start = anioInicio;
      const fin = anioInicio <= anioFin ? anioFin : anioInicio;
      Promise.all([
        fetchNacionalKpis(start, fin, selectedRanking, selectedSubject, soloParesNacional),
        fetchNacionalEvolucion(start, fin, selectedRanking, selectedSubject, soloParesNacional),
        fetchNacionalBrechas(fin, selectedRanking, selectedSubject, soloParesNacional),
        fetchNacionalUniversidades(fin, selectedRanking, selectedSubject)
      ])
        .then(([k, e, b, u]) => {
          setNacionalKpis(k);
          setNacionalEvolucion(e);
          setNacionalBrechas(b);
          setNacionalUniversidades(u);
        })
        .catch((err) => {
          setError('Error al cargar datos de Situación Nacional.');
          console.error(err);
        });
    }
  }, [activeTab, selectedRanking, selectedSubject, anioInicio, anioFin, soloParesNacional]);

  // Load Page 4 Data (Mejoras, caídas y oportunidades)
  useEffect(() => {
    if (activeTab === 'mejora' && selectedRanking && selectedSubject) {
      setError(null);
      const inicioMejora = 2026;
      const finMejora = 2027;
      Promise.all([
        fetchMejorasResumen(inicioMejora, finMejora, selectedRanking, selectedSubject),
        fetchMejorasCambios(inicioMejora, finMejora, selectedRanking, selectedSubject),
        fetchMejorasOportunidades(inicioMejora, finMejora, selectedRanking, selectedSubject)
      ])
        .then(([r, c, o]) => {
          setMejorasResumen(r);
          setMejorasCambios(c);
          setMejorasOportunidades(o);
        })
        .catch((err) => {
          setError('Error al cargar datos de Mejoras y Oportunidades.');
          console.error(err);
        });
    }
  }, [activeTab, selectedRanking, selectedSubject]);

  // Chart data transformers
  const mundialLineData = mundialEvolucion?.anios.map((a, i) => ({
    anio: a.toString(),
    'Puntaje PUCP': mundialEvolucion.pucp[i],
    'Promedio mundial (sin PUCP)': mundialEvolucion.promedio_sin_pucp[i]
  })) || [];

  const regionalLineData = regionalEvolucion?.anios.map((a, i) => ({
    anio: a.toString(),
    'Puntaje PUCP': regionalEvolucion.pucp[i],
    'Promedio regional (sin PUCP)': regionalEvolucion.promedio_sin_pucp[i]
  })) || [];

  const nacionalLineData = nacionalEvolucion?.anios.map((a, i) => ({
    anio: a.toString(),
    'Puntaje PUCP': nacionalEvolucion.pucp[i],
    'Promedio nacional (sin PUCP)': nacionalEvolucion.promedio_sin_pucp[i]
  })) || [];

  const mejorasFilter = mejorasCambios.filter((c) => c.cambio >= 0.25);
  const caidasFilter = mejorasCambios.filter((c) => c.cambio <= -0.25);

  return (
    <div className="min-h-screen bg-[#F4F6FA] text-[#0F2A44] flex flex-col font-sans">
      
      {/* Header Institucional */}
      <header className="bg-[#0F2A44] text-white px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center space-x-3">
          <div className="bg-white text-[#0F2A44] font-bold px-3 py-1.5 rounded-lg text-sm shadow">
            PUCP
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Rankings PUCP - Posicionamiento y mejora</h1>
            <p className="text-xs text-slate-300">Sistema institucional de seguimiento en QS World</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="px-3 py-1 bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 rounded-full text-xs font-medium flex items-center space-x-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>API Conectada</span>
          </span>
        </div>
      </header>

      {/* Navegación por Páginas (4 Tabs) */}
      <nav className="bg-white border-b border-[#E1E5EB] px-6 flex space-x-4 shadow-sm overflow-x-auto">
        <button
          onClick={() => setActiveTab('mundial')}
          className={`py-3.5 px-4 text-sm font-semibold border-b-2 flex items-center space-x-2 whitespace-nowrap transition-colors ${
            activeTab === 'mundial'
              ? 'border-[#0F2A44] text-[#0F2A44] bg-[#F4F6FA]'
              : 'border-transparent text-slate-500 hover:text-[#0F2A44]'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Situación mundial</span>
        </button>
        <button
          onClick={() => setActiveTab('regional')}
          className={`py-3.5 px-4 text-sm font-semibold border-b-2 flex items-center space-x-2 whitespace-nowrap transition-colors ${
            activeTab === 'regional'
              ? 'border-[#0F2A44] text-[#0F2A44] bg-[#F4F6FA]'
              : 'border-transparent text-slate-500 hover:text-[#0F2A44]'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>Situación regional</span>
        </button>
        <button
          onClick={() => setActiveTab('nacional')}
          className={`py-3.5 px-4 text-sm font-semibold border-b-2 flex items-center space-x-2 whitespace-nowrap transition-colors ${
            activeTab === 'nacional'
              ? 'border-[#0F2A44] text-[#0F2A44] bg-[#F4F6FA]'
              : 'border-transparent text-slate-500 hover:text-[#0F2A44]'
          }`}
        >
          <Flag className="w-4 h-4" />
          <span>Situación nacional</span>
        </button>
        <button
          onClick={() => setActiveTab('mejora')}
          className={`py-3.5 px-4 text-sm font-semibold border-b-2 flex items-center space-x-2 whitespace-nowrap transition-colors ${
            activeTab === 'mejora'
              ? 'border-[#0F2A44] text-[#0F2A44] bg-[#F4F6FA]'
              : 'border-transparent text-slate-500 hover:text-[#0F2A44]'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Mejoras, caídas y oportunidades</span>
        </button>
      </nav>

      {/* Contenido Principal */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        
        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* ========================================================= */}
        {/* PÁGINA 1: SITUACIÓN MUNDIAL                                 */}
        {/* ========================================================= */}
        {activeTab === 'mundial' && (
          <div className="space-y-6">
            <div className="bg-[#F4F6FA] border border-[#E1E5EB] p-4 rounded-xl space-y-1">
              <h2 className="text-xl font-bold text-[#0F2A44]">Situación mundial</h2>
              <p className="text-xs text-slate-600">¿Cómo se encuentra la PUCP frente a universidades del mundo? Periodo por defecto: {anioInicio} - {anioFin}.</p>
            </div>

            {/* Fila de Filtros y Contexto */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white border border-[#E1E5EB] p-4 rounded-xl shadow-xs space-y-3">
                <span className="text-xs font-bold text-[#0F2A44] uppercase tracking-wider">Periodo de análisis</span>
                <div className="flex items-center space-x-2">
                  <select
                    className="bg-[#F4F6FA] border border-[#E1E5EB] text-xs font-semibold rounded-lg p-2 text-[#0F2A44]"
                    value={anioInicio}
                    onChange={(e) => setAnioInicio(Number(e.target.value))}
                  >
                    {years.map((y) => (
                      <option key={y.year} value={y.year}>{y.year}</option>
                    ))}
                  </select>
                  <span className="text-slate-400">-</span>
                  <select
                    className="bg-[#F4F6FA] border border-[#E1E5EB] text-xs font-semibold rounded-lg p-2 text-[#0F2A44]"
                    value={anioFin}
                    onChange={(e) => setAnioFin(Number(e.target.value))}
                  >
                    {years.map((y) => (
                      <option key={y.year} value={y.year}>{y.year}</option>
                    ))}
                  </select>
                </div>
                <div className="pt-1 flex space-x-2">
                  <select
                    className="bg-[#F4F6FA] border border-[#E1E5EB] text-xs rounded-lg p-1.5 text-slate-700 flex-1"
                    value={selectedRanking}
                    onChange={(e) => setSelectedRanking(e.target.value)}
                  >
                    {rankings.map((r) => (
                      <option key={r.id_ranking} value={r.id_ranking}>{r.id_ranking}</option>
                    ))}
                  </select>
                  <select
                    className="bg-[#F4F6FA] border border-[#E1E5EB] text-xs rounded-lg p-1.5 text-slate-700 flex-1"
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                  >
                    {subjects.map((s) => (
                      <option key={s.id_subject} value={s.id_subject}>{s.nombre_espanol || s.id_subject}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="md:col-span-2 bg-[#E1E5EB]/50 border border-[#E1E5EB] p-4 rounded-xl text-xs space-y-1.5 text-slate-700 flex flex-col justify-center">
                <div><strong className="text-[#0F2A44]">Institución:</strong> Pontificia Universidad Católica del Perú</div>
                <div><strong className="text-[#0F2A44]">Comparación:</strong> {selectedRanking} · última edición seleccionada</div>
                <div><strong className="text-[#0F2A44]">Evolución:</strong> primer ({anioInicio}) y último ({anioFin}) año del periodo seleccionado</div>
              </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-[#E1E5EB] rounded-xl p-5 shadow-xs flex flex-col justify-between">
                <span className="text-xs font-medium text-slate-500">Puntaje PUCP</span>
                <span className="text-3xl font-semibold text-[#12A5A5] mt-2">{mundialKpis?.puntaje_pucp ?? '--'}</span>
              </div>
              <div className="bg-white border border-[#E1E5EB] rounded-xl p-5 shadow-xs flex flex-col justify-between">
                <span className="text-xs font-medium text-slate-500">Promedio mundial · Sin PUCP</span>
                <span className="text-3xl font-semibold text-[#1A1A9C] mt-2">{mundialKpis?.promedio_sin_pucp ?? '--'}</span>
              </div>
              <div className="bg-white border border-[#E1E5EB] rounded-xl p-5 shadow-xs flex flex-col justify-between">
                <span className="text-xs font-medium text-slate-500">Brecha · PUCP menos promedio mundial</span>
                <span className="text-3xl font-semibold text-[#12A5A5] mt-2">
                  {mundialKpis && mundialKpis.brecha > 0 ? `+${mundialKpis.brecha}` : mundialKpis?.brecha ?? '--'}
                </span>
              </div>
              <div className="bg-white border border-[#E1E5EB] rounded-xl p-5 shadow-xs flex flex-col justify-between">
                <span className="text-xs font-medium text-slate-500">Posición interna por puntaje</span>
                <span className="text-3xl font-semibold text-[#0F2A44] mt-2">{mundialKpis?.posicion ?? '--'}</span>
              </div>
            </div>

            {mundialKpis?.mensaje && (
              <div className="bg-white border border-[#E1E5EB] p-4 rounded-xl shadow-xs text-center">
                <p className="text-sm font-bold text-[#F26B2B]">{mundialKpis.mensaje}</p>
              </div>
            )}

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border border-[#E1E5EB] rounded-xl p-6 shadow-xs flex flex-col">
                <div className="mb-4">
                  <h3 className="text-sm font-bold text-[#0F2A44]">Evolución · PUCP frente universidades mundiales</h3>
                  <p className="text-xs text-slate-500">Puntaje PUCP y universidades a nivel mundial por Año</p>
                </div>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={mundialLineData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E1E5EB" />
                      <XAxis dataKey="anio" stroke="#64748b" tick={{ fontSize: 12 }} />
                      <YAxis stroke="#64748b" domain={[0, 50]} tick={{ fontSize: 12 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#fff', borderColor: '#E1E5EB', color: '#0F2A44', borderRadius: '8px' }} />
                      <Line type="monotone" dataKey="Puntaje PUCP" stroke="#1E90FF" strokeWidth={3} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="Promedio mundial (sin PUCP)" stroke="#1A1A9C" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white border border-[#E1E5EB] rounded-xl p-6 shadow-xs flex flex-col">
                <div className="mb-4">
                  <h3 className="text-sm font-bold text-[#0F2A44]">Brechas por indicador · positivo = ventaja PUCP</h3>
                  <p className="text-xs text-slate-500">Diferencia con promedio mundial por indicador</p>
                </div>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={mundialBrechas} margin={{ top: 5, right: 30, left: 120, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E1E5EB" />
                      <XAxis type="number" domain={[-40, 40]} stroke="#64748b" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="indicador" stroke="#64748b" tick={{ fontSize: 10 }} width={110} />
                      <Tooltip contentStyle={{ backgroundColor: '#fff', borderColor: '#E1E5EB', color: '#0F2A44', borderRadius: '8px' }} />
                      <Bar dataKey="diferencia" radius={[2, 2, 2, 2]}>
                        {mundialBrechas.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.diferencia >= 0 ? '#33FF4D' : '#F26B6B'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Tablas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border border-[#E1E5EB] rounded-xl shadow-xs overflow-hidden flex flex-col">
                <div className="bg-[#084580] text-white py-3 px-4 text-sm font-semibold">
                  Comparación de universidades · mundo · última edición
                </div>
                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#F4F6FA] text-slate-700 font-bold border-b border-[#E1E5EB]">
                        <th className="py-2.5 px-4">Universidad</th>
                        <th className="py-2.5 px-4">País</th>
                        <th className="py-2.5 px-4">Puntaje calculado</th>
                        <th className="py-2.5 px-4">Puesto QS</th>
                        <th className="py-2.5 px-4">Cambio</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E1E5EB] text-slate-700">
                      {mundialUniversidades.map((uni, idx) => (
                        <tr key={idx} className="hover:bg-[#F4F6FA] transition-colors">
                          <td className="py-2 px-4 font-medium">{uni.universidad}</td>
                          <td className="py-2 px-4 text-slate-500">{uni.pais}</td>
                          <td className="py-2 px-4 font-mono">{uni.puntaje?.toFixed(2)}</td>
                          <td className="py-2 px-4">{uni.puesto_qs}</td>
                          <td className="py-2 px-4 font-semibold text-emerald-600">+{uni.cambio}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white border border-[#E1E5EB] rounded-xl shadow-xs overflow-hidden flex flex-col">
                <div className="bg-[#084580] text-white py-3 px-4 text-sm font-semibold">
                  Fortalezas y brechas · por indicador
                </div>
                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#F4F6FA] text-slate-700 font-bold border-b border-[#E1E5EB]">
                        <th className="py-2.5 px-4">Indicador</th>
                        <th className="py-2.5 px-4">PUCP · cierre</th>
                        <th className="py-2.5 px-4">Promedio mundial (sin PUCP)</th>
                        <th className="py-2.5 px-4">Diferencia con promedio</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E1E5EB] text-slate-700">
                      {mundialBrechas.map((b, idx) => (
                        <tr key={idx} className="hover:bg-[#F4F6FA] transition-colors">
                          <td className="py-2 px-4 font-medium">{b.indicador}</td>
                          <td className="py-2 px-4 font-mono font-semibold text-[#12A5A5]">{b.pucp_cierre}</td>
                          <td className="py-2 px-4 font-mono text-slate-600">{b.promedio_mundial}</td>
                          <td className={`py-2 px-4 font-mono font-semibold ${b.diferencia >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {b.diferencia > 0 ? `+${b.diferencia}` : b.diferencia}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* PÁGINA 2: SITUACIÓN REGIONAL                                */}
        {/* ========================================================= */}
        {activeTab === 'regional' && (
          <div className="space-y-6">
            <div className="bg-[#F4F6FA] border border-[#E1E5EB] p-4 rounded-xl space-y-1">
              <h2 className="text-xl font-bold text-[#0F2A44]">Situación regional</h2>
              <p className="text-xs text-slate-600">¿Cómo nos encontramos respecto a las universidades de América Latina? Periodo por defecto: {anioInicio} - {anioFin}.</p>
            </div>

            {/* Tarjeta de Filtros por País y Universidad con botón Limpiar filtros */}
            <div className="bg-white border border-[#E1E5EB] p-4 rounded-xl shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs font-bold text-[#0F2A44] uppercase tracking-wider">
                  <Filter className="w-4 h-4 text-[#12A5A5]" />
                  <span>Filtro y Comparación por País / Universidad (América Latina)</span>
                </div>
                {(selectedRegionalPais || selectedRegionalUniId !== undefined) && (
                  <button
                    onClick={() => {
                      setSelectedRegionalPais('');
                      setSelectedRegionalUniId(undefined);
                    }}
                    className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-3 py-1 rounded-lg transition-colors"
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Filtrar por País</label>
                  <select
                    className="w-full bg-[#F4F6FA] border border-[#E1E5EB] text-xs font-medium rounded-lg p-2.5 text-[#0F2A44]"
                    value={selectedRegionalPais}
                    onChange={(e) => setSelectedRegionalPais(e.target.value)}
                  >
                    <option value="">-- Todos los países de América Latina --</option>
                    {regionalPaises.map((p) => (
                      <option key={p.pais} value={p.pais}>{p.pais}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Filtrar por Universidad</label>
                  <select
                    className="w-full bg-[#F4F6FA] border border-[#E1E5EB] text-xs font-medium rounded-lg p-2.5 text-[#0F2A44]"
                    value={selectedRegionalUniId ?? ''}
                    onChange={(e) => setSelectedRegionalUniId(e.target.value ? Number(e.target.value) : undefined)}
                  >
                    <option value="">-- Todas las universidades del ámbito --</option>
                    {regionalUniversidadesList.map((u) => (
                      <option key={u.university_id} value={u.university_id}>{u.nombre_universidad} ({u.pais})</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Filtros de Periodo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white border border-[#E1E5EB] p-4 rounded-xl shadow-xs space-y-3">
                <span className="text-xs font-bold text-[#0F2A44] uppercase tracking-wider">Periodo de análisis</span>
                <div className="flex items-center space-x-2">
                  <select
                    className="bg-[#F4F6FA] border border-[#E1E5EB] text-xs font-semibold rounded-lg p-2 text-[#0F2A44]"
                    value={anioInicio}
                    onChange={(e) => setAnioInicio(Number(e.target.value))}
                  >
                    {years.map((y) => (
                      <option key={y.year} value={y.year}>{y.year}</option>
                    ))}
                  </select>
                  <span className="text-slate-400">-</span>
                  <select
                    className="bg-[#F4F6FA] border border-[#E1E5EB] text-xs font-semibold rounded-lg p-2 text-[#0F2A44]"
                    value={anioFin}
                    onChange={(e) => setAnioFin(Number(e.target.value))}
                  >
                    {years.map((y) => (
                      <option key={y.year} value={y.year}>{y.year}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="md:col-span-2 bg-[#E1E5EB]/50 border border-[#E1E5EB] p-4 rounded-xl text-xs space-y-1.5 text-slate-700 flex flex-col justify-center">
                <div><strong className="text-[#0F2A44]">Institución:</strong> Pontificia Universidad Católica del Perú</div>
                <div><strong className="text-[#0F2A44]">Comparación:</strong> América Latina {selectedRegionalPais ? `· País: ${selectedRegionalPais}` : ''} {selectedRegionalUniId ? '· (Universidad especificada)' : ''}</div>
                <div><strong className="text-[#0F2A44]">Evolución:</strong> periodo {anioInicio} al {anioFin}</div>
              </div>
            </div>

            {/* KPIs (3 Tarjetas) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white border border-[#E1E5EB] rounded-xl p-5 shadow-xs flex flex-col justify-between">
                <span className="text-xs font-medium text-slate-500">Puntaje PUCP</span>
                <span className="text-3xl font-semibold text-[#12A5A5] mt-2">{regionalKpis?.puntaje_pucp ?? '--'}</span>
              </div>
              <div className="bg-white border border-[#E1E5EB] rounded-xl p-5 shadow-xs flex flex-col justify-between">
                <span className="text-xs font-medium text-slate-500">Promedio regional · Sin PUCP</span>
                <span className="text-3xl font-semibold text-[#1A1A9C] mt-2">{regionalKpis?.promedio_sin_pucp ?? '--'}</span>
              </div>
              <div className="bg-white border border-[#E1E5EB] rounded-xl p-5 shadow-xs flex flex-col justify-between">
                <span className="text-xs font-medium text-slate-500">Brecha · PUCP menos regionales</span>
                <span className="text-3xl font-semibold text-[#12A5A5] mt-2">
                  {regionalKpis && regionalKpis.brecha > 0 ? `+${regionalKpis.brecha}` : regionalKpis?.brecha ?? '--'}
                </span>
              </div>
            </div>

            {regionalKpis?.mensaje && (
              <div className="bg-white border border-[#E1E5EB] p-4 rounded-xl shadow-xs text-center">
                <p className="text-sm font-bold text-[#F26B2B]">{regionalKpis.mensaje}</p>
              </div>
            )}

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border border-[#E1E5EB] rounded-xl p-6 shadow-xs flex flex-col">
                <div className="mb-4">
                  <h3 className="text-sm font-bold text-[#0F2A44]">Evolución · PUCP frente a universidades regionales</h3>
                  <p className="text-xs text-slate-500">Puntaje PUCP y universidades regionales por año</p>
                </div>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={regionalLineData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E1E5EB" />
                      <XAxis dataKey="anio" stroke="#64748b" tick={{ fontSize: 12 }} />
                      <YAxis stroke="#64748b" domain={[0, 50]} tick={{ fontSize: 12 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#fff', borderColor: '#E1E5EB', color: '#0F2A44', borderRadius: '8px' }} />
                      <Line type="monotone" dataKey="Puntaje PUCP" stroke="#1E90FF" strokeWidth={3} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="Promedio regional (sin PUCP)" stroke="#1A1A9C" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white border border-[#E1E5EB] rounded-xl p-6 shadow-xs flex flex-col">
                <div className="mb-4">
                  <h3 className="text-sm font-bold text-[#0F2A44]">Brechas por indicador · positivo = ventaja PUCP</h3>
                  <p className="text-xs text-slate-500">Diferencia universidades regionales por Indicador (QS)</p>
                </div>
                <div className="h-72 w-full">
                  {regionalBrechas.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart layout="vertical" data={regionalBrechas} margin={{ top: 5, right: 30, left: 120, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E1E5EB" />
                        <XAxis type="number" domain={[-15, 45]} stroke="#64748b" tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="indicador" stroke="#64748b" tick={{ fontSize: 10 }} width={110} />
                        <Tooltip contentStyle={{ backgroundColor: '#fff', borderColor: '#E1E5EB', color: '#0F2A44', borderRadius: '8px' }} />
                        <Bar dataKey="diferencia" radius={[2, 2, 2, 2]}>
                          {regionalBrechas.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.diferencia >= 0 ? '#33FF4D' : '#F26B6B'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 text-xs">Cargando brechas regionales...</div>
                  )}
                </div>
              </div>
            </div>

            {/* Tablas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border border-[#E1E5EB] rounded-xl shadow-xs overflow-hidden flex flex-col">
                <div className="bg-[#084580] text-white py-3 px-4 text-sm font-semibold">
                  Comparación de universidades · América Latina · última edición
                </div>
                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#F4F6FA] text-slate-700 font-bold border-b border-[#E1E5EB]">
                        <th className="py-2.5 px-4">Universidad</th>
                        <th className="py-2.5 px-4">País</th>
                        <th className="py-2.5 px-4">Puntaje</th>
                        <th className="py-2.5 px-4">Puesto QS</th>
                        <th className="py-2.5 px-4">Cambio</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E1E5EB] text-slate-700">
                      {regionalUniversidades.map((uni, idx) => (
                        <tr key={idx} className="hover:bg-[#F4F6FA] transition-colors">
                          <td className="py-2 px-4 font-medium">{uni.universidad}</td>
                          <td className="py-2 px-4 text-slate-500">{uni.pais}</td>
                          <td className="py-2 px-4 font-mono">{uni.puntaje?.toFixed(2)}</td>
                          <td className="py-2 px-4">{uni.puesto_qs}</td>
                          <td className="py-2 px-4 font-semibold text-emerald-600">+{uni.cambio}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white border border-[#E1E5EB] rounded-xl shadow-xs overflow-hidden flex flex-col">
                <div className="bg-[#084580] text-white py-3 px-4 text-sm font-semibold">
                  Fortalezas y brechas · por indicador (Regional)
                </div>
                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#F4F6FA] text-slate-700 font-bold border-b border-[#E1E5EB]">
                        <th className="py-2.5 px-4">Indicador</th>
                        <th className="py-2.5 px-4">PUCP · cierre</th>
                        <th className="py-2.5 px-4">Promedio regional (sin PUCP)</th>
                        <th className="py-2.5 px-4">Diferencia</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E1E5EB] text-slate-700">
                      {regionalBrechas.map((b, idx) => (
                        <tr key={idx} className="hover:bg-[#F4F6FA] transition-colors">
                          <td className="py-2 px-4 font-medium">{b.indicador}</td>
                          <td className="py-2 px-4 font-mono font-semibold text-[#12A5A5]">{b.pucp_cierre}</td>
                          <td className="py-2 px-4 font-mono text-slate-600">{b.promedio_regional}</td>
                          <td className={`py-2 px-4 font-mono font-semibold ${b.diferencia >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {b.diferencia > 0 ? `+${b.diferencia}` : b.diferencia}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* PÁGINA 3: SITUACIÓN NACIONAL                                */}
        {/* ========================================================= */}
        {activeTab === 'nacional' && (
          <div className="space-y-6">
            <div className="bg-[#F4F6FA] border border-[#E1E5EB] p-4 rounded-xl space-y-1">
              <h2 className="text-xl font-bold text-[#0F2A44]">Situación nacional</h2>
              <p className="text-xs text-slate-600">¿Cómo nos encontramos respecto a las universidades de Perú? Periodo por defecto: {anioInicio} - {anioFin}.</p>
            </div>

            {/* Toggle Card para Pares Nacionales */}
            <div className="bg-white border border-[#E1E5EB] p-4 rounded-xl shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-bold text-[#0F2A44] uppercase tracking-wider">Pares nacionales</h4>
                <p className="text-xs text-slate-500 mt-0.5">Activa el botón para aplicar el filtro de pares nacionales. PUCP siempre queda como referencia.</p>
              </div>
              <button
                onClick={() => setSoloParesNacional(!soloParesNacional)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-2 ${
                  soloParesNacional
                    ? 'bg-[#0F2A44] text-white shadow'
                    : 'bg-[#E8EFF9] text-[#0F2A44] hover:bg-slate-200'
                }`}
              >
                <span>Pares nacionales (UPCH, San Marcos, U. de Lima)</span>
                <span className={`w-2 h-2 rounded-full ${soloParesNacional ? 'bg-emerald-400' : 'bg-slate-400'}`}></span>
              </button>
            </div>

            {/* Filtros */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white border border-[#E1E5EB] p-4 rounded-xl shadow-xs space-y-3">
                <span className="text-xs font-bold text-[#0F2A44] uppercase tracking-wider">Periodo de análisis</span>
                <div className="flex items-center space-x-2">
                  <select
                    className="bg-[#F4F6FA] border border-[#E1E5EB] text-xs font-semibold rounded-lg p-2 text-[#0F2A44]"
                    value={anioInicio}
                    onChange={(e) => setAnioInicio(Number(e.target.value))}
                  >
                    {years.map((y) => (
                      <option key={y.year} value={y.year}>{y.year}</option>
                    ))}
                  </select>
                  <span className="text-slate-400">-</span>
                  <select
                    className="bg-[#F4F6FA] border border-[#E1E5EB] text-xs font-semibold rounded-lg p-2 text-[#0F2A44]"
                    value={anioFin}
                    onChange={(e) => setAnioFin(Number(e.target.value))}
                  >
                    {years.map((y) => (
                      <option key={y.year} value={y.year}>{y.year}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="md:col-span-2 bg-[#E1E5EB]/50 border border-[#E1E5EB] p-4 rounded-xl text-xs space-y-1.5 text-slate-700 flex flex-col justify-center">
                <div><strong className="text-[#0F2A44]">Institución:</strong> Pontificia Universidad Católica del Perú</div>
                <div><strong className="text-[#0F2A44]">Comparación:</strong> Perú {soloParesNacional ? '(Pares nacionales)' : '(Todas las peruanas)'}</div>
                <div><strong className="text-[#0F2A44]">Evolución:</strong> primer ({anioInicio}) y último ({anioFin}) año</div>
              </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-[#E1E5EB] rounded-xl p-5 shadow-xs flex flex-col justify-between">
                <span className="text-xs font-medium text-slate-500">Puntaje PUCP</span>
                <span className="text-3xl font-semibold text-[#12A5A5] mt-2">{nacionalKpis?.puntaje_pucp ?? '--'}</span>
              </div>
              <div className="bg-white border border-[#E1E5EB] rounded-xl p-5 shadow-xs flex flex-col justify-between">
                <span className="text-xs font-medium text-slate-500">Promedio nacional · Sin PUCP</span>
                <span className="text-3xl font-semibold text-[#1A1A9C] mt-2">{nacionalKpis?.promedio_sin_pucp ?? '--'}</span>
              </div>
              <div className="bg-white border border-[#E1E5EB] rounded-xl p-5 shadow-xs flex flex-col justify-between">
                <span className="text-xs font-medium text-slate-500">Brecha · PUCP menos nacional</span>
                <span className="text-3xl font-semibold text-[#12A5A5] mt-2">
                  {nacionalKpis && nacionalKpis.brecha > 0 ? `+${nacionalKpis.brecha}` : nacionalKpis?.brecha ?? '--'}
                </span>
              </div>
              <div className="bg-white border border-[#E1E5EB] rounded-xl p-5 shadow-xs flex flex-col justify-between">
                <span className="text-xs font-medium text-slate-500">Posición interna por puntaje</span>
                <span className="text-3xl font-semibold text-[#0F2A44] mt-2">{nacionalKpis?.posicion ?? '--'}</span>
              </div>
            </div>

            {nacionalKpis?.mensaje && (
              <div className="bg-white border border-[#E1E5EB] p-4 rounded-xl shadow-xs text-center">
                <p className="text-sm font-bold text-[#F26B2B]">{nacionalKpis.mensaje}</p>
              </div>
            )}

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border border-[#E1E5EB] rounded-xl p-6 shadow-xs flex flex-col">
                <div className="mb-4">
                  <h3 className="text-sm font-bold text-[#0F2A44]">Evolución · PUCP frente a universidades nacionales</h3>
                  <p className="text-xs text-slate-500">Puntaje PUCP y Promedio nacional (sin PUCP) por Año</p>
                </div>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={nacionalLineData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E1E5EB" />
                      <XAxis dataKey="anio" stroke="#64748b" tick={{ fontSize: 12 }} />
                      <YAxis stroke="#64748b" domain={[0, 50]} tick={{ fontSize: 12 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#fff', borderColor: '#E1E5EB', color: '#0F2A44', borderRadius: '8px' }} />
                      <Line type="monotone" dataKey="Puntaje PUCP" stroke="#1E90FF" strokeWidth={3} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="Promedio nacional (sin PUCP)" stroke="#1A1A9C" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white border border-[#E1E5EB] rounded-xl p-6 shadow-xs flex flex-col">
                <div className="mb-4">
                  <h3 className="text-sm font-bold text-[#0F2A44]">Brechas por indicador · positivo = ventaja PUCP</h3>
                  <p className="text-xs text-slate-500">Diferencia con universidades nacionales por Indicador</p>
                </div>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={nacionalBrechas} margin={{ top: 5, right: 30, left: 120, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E1E5EB" />
                      <XAxis type="number" domain={[-10, 50]} stroke="#64748b" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="indicador" stroke="#64748b" tick={{ fontSize: 10 }} width={110} />
                      <Tooltip contentStyle={{ backgroundColor: '#fff', borderColor: '#E1E5EB', color: '#0F2A44', borderRadius: '8px' }} />
                      <Bar dataKey="diferencia" radius={[2, 2, 2, 2]}>
                        {nacionalBrechas.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.diferencia >= 0 ? '#33FF4D' : '#F26B6B'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Tablas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border border-[#E1E5EB] rounded-xl shadow-xs overflow-hidden flex flex-col">
                <div className="bg-[#084580] text-white py-3 px-4 text-sm font-semibold">
                  Comparación de universidades · Perú · última edición
                </div>
                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#F4F6FA] text-slate-700 font-bold border-b border-[#E1E5EB]">
                        <th className="py-2.5 px-4">Universidad</th>
                        <th className="py-2.5 px-4">País</th>
                        <th className="py-2.5 px-4">Puntaje</th>
                        <th className="py-2.5 px-4">Puesto QS</th>
                        <th className="py-2.5 px-4">Cambio</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E1E5EB] text-slate-700">
                      {nacionalUniversidades.map((uni, idx) => (
                        <tr key={idx} className={`transition-colors ${uni.universidad.includes('Católica') ? 'bg-amber-50 font-bold' : 'hover:bg-[#F4F6FA]'}`}>
                          <td className="py-2 px-4">{uni.universidad}</td>
                          <td className="py-2 px-4 text-slate-500">{uni.pais}</td>
                          <td className="py-2 px-4 font-mono">{uni.puntaje?.toFixed(2)}</td>
                          <td className="py-2 px-4">{uni.puesto_qs}</td>
                          <td className="py-2 px-4 font-semibold text-emerald-600">+{uni.cambio}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white border border-[#E1E5EB] rounded-xl shadow-xs overflow-hidden flex flex-col">
                <div className="bg-[#084580] text-white py-3 px-4 text-sm font-semibold">
                  Fortalezas y brechas · por indicador (Nacional)
                </div>
                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#F4F6FA] text-slate-700 font-bold border-b border-[#E1E5EB]">
                        <th className="py-2.5 px-4">Indicador</th>
                        <th className="py-2.5 px-4">PUCP · cierre</th>
                        <th className="py-2.5 px-4">Promedio nacional (sin PUCP)</th>
                        <th className="py-2.5 px-4">Diferencia</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E1E5EB] text-slate-700">
                      {nacionalBrechas.map((b, idx) => (
                        <tr key={idx} className="hover:bg-[#F4F6FA] transition-colors">
                          <td className="py-2 px-4 font-medium">{b.indicador}</td>
                          <td className="py-2 px-4 font-mono font-semibold text-[#12A5A5]">{b.pucp_cierre}</td>
                          <td className="py-2 px-4 font-mono text-slate-600">{b.promedio_nacional}</td>
                          <td className={`py-2 px-4 font-mono font-semibold ${b.diferencia >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {b.diferencia > 0 ? `+${b.diferencia}` : b.diferencia}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* PÁGINA 4: MEJORAS, CAÍDAS Y OPORTUNIDADES                   */}
        {/* ========================================================= */}
        {activeTab === 'mejora' && (
          <div className="space-y-6">
            <div className="bg-[#F4F6FA] border border-[#E1E5EB] p-4 rounded-xl space-y-1">
              <h2 className="text-xl font-bold text-[#0F2A44]">Mejoras, caídas y oportunidades</h2>
              <p className="text-xs text-slate-600">¿En qué hemos mejorado? ¿En qué hemos caído? ¿Qué oportunidades de mejora tenemos? Periodo por defecto: 2026 - 2027.</p>
            </div>

            {/* Mensaje Naranja de Resumen */}
            {mejorasResumen?.mensaje && (
              <div className="bg-white border border-[#E1E5EB] p-4 rounded-xl shadow-xs text-center">
                <p className="text-sm font-bold text-[#F26B2B]">{mejorasResumen.mensaje}</p>
              </div>
            )}

            {/* Secciones 01 y 02 (lado a lado): Gráficos de Mejoras y Caídas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* 01 / ¿En qué hemos mejorado? */}
              <div className="bg-white border border-[#E1E5EB] rounded-xl p-6 shadow-xs flex flex-col">
                <div className="bg-[#F4F6FA] border border-[#E1E5EB] py-2 px-3 rounded-lg mb-4 text-xs font-bold text-[#0F2A44]">
                  01 / ¿En qué hemos mejorado? (Cambio &ge; +0,25)
                </div>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={mejorasFilter} margin={{ top: 5, right: 30, left: 120, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E1E5EB" />
                      <XAxis type="number" domain={[0, 12]} stroke="#64748b" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="indicador" stroke="#64748b" tick={{ fontSize: 10 }} width={110} />
                      <Tooltip contentStyle={{ backgroundColor: '#fff', borderColor: '#E1E5EB', color: '#0F2A44', borderRadius: '8px' }} />
                      <Bar dataKey="cambio" fill="#228B3B" radius={[2, 2, 2, 2]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 02 / ¿En qué hemos caído? */}
              <div className="bg-white border border-[#E1E5EB] rounded-xl p-6 shadow-xs flex flex-col">
                <div className="bg-[#F4F6FA] border border-[#E1E5EB] py-2 px-3 rounded-lg mb-4 text-xs font-bold text-[#0F2A44]">
                  02 / ¿En qué hemos caído? (Cambio &le; -0,25)
                </div>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={caidasFilter} margin={{ top: 5, right: 30, left: 120, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E1E5EB" />
                      <XAxis type="number" domain={[-14, 0]} stroke="#64748b" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="indicador" stroke="#64748b" tick={{ fontSize: 10 }} width={110} />
                      <Tooltip contentStyle={{ backgroundColor: '#fff', borderColor: '#E1E5EB', color: '#0F2A44', borderRadius: '8px' }} />
                      <Bar dataKey="cambio" fill="#C44040" radius={[2, 2, 2, 2]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

            {/* Tabla Central: Así cambiaron nuestros indicadores */}
            <div className="bg-white border border-[#E1E5EB] rounded-xl shadow-xs overflow-hidden flex flex-col max-w-4xl mx-auto">
              <div className="bg-[#084580] text-white py-3 px-4 text-sm font-semibold text-center">
                Así cambiaron nuestros indicadores
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#F4F6FA] text-slate-700 font-bold border-b border-[#E1E5EB]">
                      <th className="py-2.5 px-4">Indicador</th>
                      <th className="py-2.5 px-4">Inicio</th>
                      <th className="py-2.5 px-4">Cierre</th>
                      <th className="py-2.5 px-4">Cambio PUCP</th>
                      <th className="py-2.5 px-4">Evolución</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E1E5EB] text-slate-700">
                    {mejorasCambios.map((item, idx) => (
                      <tr key={idx} className="hover:bg-[#F4F6FA] transition-colors">
                        <td className="py-2 px-4 font-medium">{item.indicador}</td>
                        <td className="py-2 px-4 font-mono">{item.inicio.toFixed(2)}</td>
                        <td className="py-2 px-4 font-mono">{item.cierre.toFixed(2)}</td>
                        <td className={`py-2 px-4 font-mono font-semibold ${item.cambio >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {item.cambio > 0 ? `+${item.cambio.toFixed(2)}` : item.cambio.toFixed(2)}
                        </td>
                        <td className="py-2 px-4">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                            item.evolucion === 'Mejora' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {item.evolucion}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sección 03: ¿Qué oportunidades de mejora tenemos? */}
            <div className="space-y-4 pt-4">
              <div className="bg-[#F4F6FA] border border-[#E1E5EB] py-2 px-4 rounded-lg text-xs font-bold text-[#0F2A44]">
                03 / ¿Qué oportunidades de mejora tenemos?
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Gráfico Oportunidades (Brecha ponderada) */}
                <div className="bg-white border border-[#E1E5EB] rounded-xl p-6 shadow-xs flex flex-col">
                  <div className="mb-4">
                    <h3 className="text-sm font-bold text-[#0F2A44]">Oportunidades según la brecha y el peso del indicador</h3>
                    <p className="text-xs text-slate-500">Brecha ponderada por Indicador</p>
                  </div>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart layout="vertical" data={mejorasOportunidades} margin={{ top: 5, right: 30, left: 120, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E1E5EB" />
                        <XAxis type="number" domain={[0, 1.2]} stroke="#64748b" tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="indicador" stroke="#64748b" tick={{ fontSize: 10 }} width={110} />
                        <Tooltip contentStyle={{ backgroundColor: '#fff', borderColor: '#E1E5EB', color: '#0F2A44', borderRadius: '8px' }} />
                        <Bar dataKey="brecha_ponderada" fill="#1E90FF" radius={[2, 2, 2, 2]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Tabla Dónde podemos mejorar */}
                <div className="bg-white border border-[#E1E5EB] rounded-xl shadow-xs overflow-hidden flex flex-col">
                  <div className="bg-[#084580] text-white py-3 px-4 text-sm font-semibold">
                    Dónde podemos mejorar
                  </div>
                  <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#F4F6FA] text-slate-700 font-bold border-b border-[#E1E5EB]">
                          <th className="py-2 px-3">Indicador</th>
                          <th className="py-2 px-3">PUCP cierre</th>
                          <th className="py-2 px-3">P75 regional</th>
                          <th className="py-2 px-3">Cambio</th>
                          <th className="py-2 px-3 text-red-600">Brecha pond.</th>
                          <th className="py-2 px-3">Qué podemos revisar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E1E5EB] text-slate-700">
                        {mejorasOportunidades.map((op, idx) => (
                          <tr key={idx} className="hover:bg-[#F4F6FA] transition-colors">
                            <td className="py-2 px-3 font-medium">{op.indicador}</td>
                            <td className="py-2 px-3 font-mono">{op.pucp_cierre.toFixed(2)}</td>
                            <td className="py-2 px-3 font-mono">{op.p75_regional.toFixed(2)}</td>
                            <td className={`py-2 px-3 font-mono ${op.cambio >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {op.cambio > 0 ? `+${op.cambio.toFixed(2)}` : op.cambio.toFixed(2)}
                            </td>
                            <td className="py-2 px-3 font-mono font-semibold text-red-600">{op.brecha_ponderada.toFixed(2)}</td>
                            <td className="py-2 px-3 text-slate-600">{op.revisar}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>

          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-[#E1E5EB] py-4 px-6 text-center text-xs text-slate-500 mt-12">
        Rankings PUCP - Posicionamiento y mejora &copy; 2026 - Conectado a base de datos mediante FastAPI
      </footer>

    </div>
  );
}
