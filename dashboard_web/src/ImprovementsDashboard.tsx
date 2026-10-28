import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { TrendingUp, TrendingDown, Minus, CircleHelp } from 'lucide-react';
import { useApi } from './hooks/useApi';
import { useRankingPeriod } from './hooks/useRankingPeriod';
import Notice from './components/DataNotice';
import { format, signed } from './utils/format';
import RankingFilters, { SelectField } from './components/RankingFilters';
import type { Ranking, Subject } from './services/api';

type State = 'Mejora' | 'Caída' | 'Estable' | 'Sin datos comparables';
interface Change { indicador_id: number; indicador: string; inicio: number | null; cierre: number | null; cambio: number | null; evolucion: State }
type Highlight = Omit<Change, 'evolucion'>;
const panel = 'rounded-xl border border-[#E1E5EB] bg-white p-5 shadow-xs';
const select = 'mt-1.5 block w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm text-slate-800 disabled:opacity-50';
const cards = [
  { state: 'Mejora', label: 'Mejoran', detail: 'Cambio ≥ +0,25 puntos', color: 'text-emerald-700', bg: 'bg-emerald-50', Icon: TrendingUp },
  { state: 'Caída', label: 'Caen', detail: 'Cambio ≤ −0,25 puntos', color: 'text-red-700', bg: 'bg-red-50', Icon: TrendingDown },
  { state: 'Estable', label: 'Estables', detail: 'Cambio entre −0,25 y +0,25', color: 'text-slate-600', bg: 'bg-slate-100', Icon: Minus },
  { state: 'Sin datos comparables', label: 'Sin datos comparables', detail: 'Falta puntaje en al menos un año', color: 'text-amber-800', bg: 'bg-amber-50', Icon: CircleHelp },
] as const;
function ChangeChart({ title, color, result, limit, negative }: { title: string; color: string; result: ReturnType<typeof useApi<Highlight[]>>; limit: number; negative?: boolean }) {
  return <section className={panel}>
    <h3 className="text-base font-semibold">{title}</h3>
    <p className="mt-1 text-xs text-slate-500">Hasta 4 indicadores · Cambio de puntaje PUCP</p>
    <Notice spacious {...result} empty={!result.data?.length} label={`No hay ${negative ? 'caídas' : 'mejoras'} en este periodo.`} />
    {!!result.data?.length && <div className="mt-5 h-72"><ResponsiveContainer width="100%" height="100%">
      <BarChart layout="vertical" data={result.data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E1E5EB" />
        <XAxis type="number" domain={negative ? [-limit, 0] : [0, limit]} tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="indicador" width={145} tick={{ fontSize: 11 }} interval={0} />
        <ReferenceLine x={0} stroke="#94a3b8" />
        <Tooltip formatter={value => [`${signed(Number(value))} pts`, 'Cambio']} />
        <Bar dataKey="cambio" fill={color} radius={3} maxBarSize={28} label={{ position: negative ? 'insideLeft' : 'insideRight', fill: '#fff', fontSize: 11, formatter: (value: unknown) => signed(Number(value)) }} />
      </BarChart>
    </ResponsiveContainer></div>}
  </section>;
}
export default function ImprovementsDashboard() {
  const [rankingChoice, setRanking] = useState('QS_WORLD');
  const [subjectChoice, setSubject] = useState('');
  const [state, setState] = useState<State | ''>('');
  const [search, setSearch] = useState('');
  const [retry, setRetry] = useState(0);
  const rankings = useApi<Ranking[]>('/rankings', {}, true, retry);
  const ranking = rankings.data?.some(r => r.id_ranking === rankingChoice) ? rankingChoice : rankings.data?.[0]?.id_ranking ?? '';
  const subjects = useApi<Subject[]>(`/subjects/${ranking}`, { university_id: 217 }, !!ranking, retry);
  const subject = subjects.data?.find(s => s.id_subject === subjectChoice) ?? subjects.data?.find(s => s.id_subject === `${ranking}_GENERAL`) ?? subjects.data?.[0];
  const context = { id_ranking: ranking, subject_id: subject?.id_subject };
  const years = useApi<{ anio: number }[]>('/api/filtros/anios', context, !!subject, retry);
  const { availableYears: available, end, startYears, start, setEnd, setStart } = useRankingPeriod(years.data, 1);
  const ready = !!subject && start !== undefined && end !== undefined;
  const params = { ...context, anio_inicio: start, anio_fin: end };
  const changes = useApi<Change[]>('/api/mejoras/cambios', params, ready, retry);
  const improvements = useApi<Highlight[]>('/api/mejoras/mejoras', params, ready, retry);
  const declines = useApi<Highlight[]>('/api/mejoras/caidas', params, ready, retry);
  const all = changes.data ?? [];
  const counts = Object.fromEntries(cards.map(card => [card.state, all.filter(row => row.evolucion === card.state).length]));
  const rows = all.filter(row => (!state || row.evolucion === state) && row.indicador.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  const limit = Math.max(1, Math.ceil(Math.max(...[...(improvements.data ?? []), ...(declines.data ?? [])].map(row => Math.abs(row.cambio ?? 0)), 0) * 1.15));
  const filterError = rankings.error || subjects.error || years.error;
  const filterLoading = rankings.loading || subjects.loading || years.loading;
  const anyError = filterError || changes.error || improvements.error || declines.error;
  const groups = [...new Set((subjects.data ?? []).map(s => s.area_grande || 'General'))];
  const isTheLatam = ranking === 'THE_LATAM';
  function resetPeriod() { setStart(undefined); setEnd(undefined); setState(''); }
  
  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-2xl font-bold">Caídas y mejoras</h2><p className="mt-1 text-sm text-slate-500">Compara la evolución de los indicadores de PUCP entre dos años.</p></div>
      {anyError && <button className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm" onClick={() => setRetry(r => r + 1)}>Reintentar carga</button>}</div>
    <RankingFilters label="Filtros de comparación">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SelectField label="Ranking" labelClassName="text-xs font-semibold" className={select} value={ranking} disabled={!rankings.data?.length} onChange={e => { setRanking(e.target.value); setSubject(''); resetPeriod(); }}>
          {!ranking && <option value="">Sin rankings disponibles</option>}{rankings.data?.map(r => <option key={r.id_ranking} value={r.id_ranking}>{r.id_ranking.replaceAll('_', ' ')}</option>)}</SelectField>
        <SelectField label="Categoría / disciplina" labelClassName="text-xs font-semibold" className={select} value={subject?.id_subject ?? ''} disabled={!subjects.data?.length} onChange={e => { setSubject(e.target.value); resetPeriod(); }}>
          {!subject && <option value="">Sin categorías disponibles</option>}{groups.map(group => <optgroup key={group} label={group}>{subjects.data?.filter(s => (s.area_grande || 'General') === group).map(s => <option key={s.id_subject} value={s.id_subject}>{s.nombre_espanol || s.id_subject}</option>)}</optgroup>)}</SelectField>
        <SelectField label="Año inicial" labelClassName="text-xs font-semibold" className={select} value={start ?? ''} disabled={!startYears.length} onChange={e => setStart(Number(e.target.value))}>
          {start === undefined && <option value="">Sin año anterior</option>}{startYears.map(y => <option key={y}>{y}</option>)}</SelectField>
        <SelectField label="Año final" labelClassName="text-xs font-semibold" className={select} value={end ?? ''} disabled={!available.length} onChange={e => setEnd(Number(e.target.value))}>
          {end === undefined && <option value="">Sin años disponibles</option>}{available.map(y => <option key={y}>{y}</option>)}</SelectField>
      </div>
      <p className="mt-3 text-xs text-slate-500">Selecciona una categoría del ranking. Las áreas grandes agrupan las opciones; solo se muestran categorías con resultados de PUCP.</p>
      <Notice spacious error={filterError} loading={filterLoading} empty={!ready && !filterError && !filterLoading} label="Se requieren dos años distintos para comparar. Selecciona otra categoría o un año final posterior." />
      {isTheLatam && <div role="status" className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-[#084580]">
        <p className="font-semibold">Cambio en la base de evaluación en 2026</p>
        <p className="mt-1">THE evalúa ahora a las universidades frente al conjunto mundial, en lugar de únicamente Latinoamérica. Las variaciones de puntaje pueden reflejar este cambio y no necesariamente una mejora o caída del desempeño.</p>
      </div>}
    </RankingFilters>
    {ready && <>
      <section aria-label="Resumen de indicadores" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="font-semibold">Balance del periodo · {start} → {end}</h3><p className="text-xs text-slate-500">Selecciona una tarjeta para filtrar la tabla</p></div>
        <Notice spacious error={changes.error} loading={changes.loading} empty={false} label="" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{cards.map(({ state: cardState, label, detail, color, bg, Icon }) => <button key={cardState} disabled={!changes.data?.length} aria-pressed={state === cardState} onClick={() => setState(state === cardState ? '' : cardState)} className={`${panel} text-left transition-shadow hover:shadow-md disabled:opacity-60 ${state === cardState ? 'ring-2 ring-[#084580]' : ''}`}>
          <div className="flex items-center justify-between gap-2"><span className="text-sm font-medium">{label}</span><span className={`rounded-lg p-2 ${bg} ${color}`}><Icon size={18} /></span></div>
          <p className={`my-3 text-3xl font-semibold ${color}`}>{changes.data ? counts[cardState] : '—'}</p><p className="text-xs text-slate-500">{detail}</p>
        </button>)}</div>
        {changes.data && <p className="text-xs text-slate-500">{all.length - counts['Sin datos comparables']} de {all.length} indicadores tienen datos comparables. Se cuentan indicadores, sin ponderar su contribución al puntaje total.</p>}
      </section>
      <div className="grid gap-6 lg:grid-cols-2"><ChangeChart title="Principales mejoras" color="#15803d" result={improvements} limit={limit} /><ChangeChart title="Principales caídas" color="#b91c1c" result={declines} limit={limit} negative /></div>
      <section className={panel} aria-label="Detalle de indicadores">
        <h3 className="font-semibold">Así cambiaron nuestros indicadores</h3>
        <div className="my-4 grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold">Buscar indicador<input type="search" className={select} value={search} onChange={e => setSearch(e.target.value)} placeholder="Nombre del indicador…" /></label>
          <SelectField label="Estado" labelClassName="text-xs font-semibold" className={select} value={state} onChange={e => setState(e.target.value as State | '')}><option value="">Todos los estados</option>{cards.map(c => <option key={c.state}>{c.state}</option>)}</SelectField></div>
        <Notice spacious error={changes.error} loading={changes.loading} empty={!rows.length} label={all.length ? 'No hay indicadores que coincidan con los filtros.' : 'No hay indicadores disponibles para este periodo.'} />
        {!!rows.length && <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-600"><tr><th className="p-3">Indicador</th><th className="p-3 text-right">Puntaje {start}</th><th className="p-3 text-right">Puntaje {end}</th><th className="p-3 text-right">Cambio (pts)</th><th className="p-3">Estado</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map(row => { const style = cards.find(c => c.state === row.evolucion)!; return <tr key={row.indicador_id} className="hover:bg-slate-50"><td className="p-3 font-medium">{row.indicador}</td><td className="p-3 text-right tabular-nums">{format(row.inicio)}</td><td className="p-3 text-right tabular-nums">{format(row.cierre)}</td><td className={`p-3 text-right font-semibold tabular-nums ${style.color}`}>{signed(row.cambio)}</td><td className="p-3"><span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${style.color} ${style.bg}`}>{row.evolucion}</span></td></tr>; })}</tbody></table></div>}
        <p className="mt-4 text-xs text-slate-500">Cambio = puntaje final − puntaje inicial, en puntos. «—» indica un puntaje no disponible. Los indicadores ausentes en ambos años no aparecen en el resumen.</p>
      </section>
    </>}
  </div>;
}
