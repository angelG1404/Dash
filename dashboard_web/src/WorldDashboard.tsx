import { useState } from 'react';
import type { Ranking, Subject } from './services/api';

import { useApi } from './hooks/useApi';
import { useRankingPeriod } from './hooks/useRankingPeriod';
import Notice from './components/DataNotice';
import KpiCard from './components/KpiCard';
import RankingFilters, { SelectField } from './components/RankingFilters';
import EvolutionChart from './components/EvolutionChart';
import IndicatorGapChart from './components/IndicatorGapChart';
import UniversityTable from './components/UniversityTable';
import { panel } from './components/styles';
import type { Kpis, Evolution, Gap, UniversityResponse } from './types/dashboard';
import { format, signed } from './utils/format';

const worldRankingLabels: Record<string, string> = {
  QS_WORLD: 'QS World',
  THE_WORLD: 'THE World',
  THE_BY_SUBJECT: 'THE by Subject',
  QS_BY_SUBJECT: 'QS by Subject',
};

export default function WorldDashboard() {
  const [rankingChoice, setRanking] = useState('QS_WORLD');
  const [subjectChoice, setSubject] = useState('');
  const [regionChoice, setRegion] = useState('');
  const rankings = useApi<Ranking[]>('/rankings', {});
  const worldRankings = (rankings.data ?? []).filter(r => Object.hasOwn(worldRankingLabels, r.id_ranking));
  const ranking = worldRankings.some(r => r.id_ranking === rankingChoice) ? rankingChoice : worldRankings[0]?.id_ranking ?? '';
  const subjects = useApi<Subject[]>(`/subjects/${encodeURIComponent(ranking)}`, { university_id: ['QS_BY_SUBJECT', 'THE_BY_SUBJECT'].includes(ranking) ? 217 : undefined }, !!ranking);
  const subject = subjects.data?.find(s => s.id_subject === subjectChoice)?.id_subject
    ?? subjects.data?.find(s => s.id_subject === `${ranking}_GENERAL`)?.id_subject
    ?? subjects.data?.[0]?.id_subject ?? '';
  const context = { id_ranking: ranking, subject_id: subject };
  const years = useApi<{ anio: number }[]>('/api/filtros/anios', context, !!subject);
  const pucpYears = useApi<{ anio: number }[]>('/api/filtros/anios', { ...context, university_id: 217 }, !!subject);
  const { availableYears, end, startYears, start, setEnd, setStart } = useRankingPeriod(years.data);
  const ready = !!subject && end !== undefined;
  const period = { ...context, anio_inicio: start ?? end, anio_fin: end };
  const regions = useApi<{ region: string }[]>('/api/filtros/regiones', period, ready);
  const region = regions.data?.some(r => r.region === regionChoice) ? regionChoice : '';
  const comparisonReady = ready && regions.data !== undefined;
  const comparison = region || 'Todas las regiones';
  const kpis = useApi<Kpis>('/api/mundial/kpis', { ...context, anio_fin: end }, ready);
  const evolution = useApi<Evolution>('/api/mundial/evolucion', { ...period, region: region || undefined }, comparisonReady && start !== undefined);
  const gaps = useApi<Gap[]>('/api/mundial/brechas', { ...context, anio_fin: end, region: region || undefined }, comparisonReady);
  const universities = useApi<UniversityResponse>('/api/mundial/universidades', { ...period, vecinos: 5, region: region || undefined }, comparisonReady);
  const tableTitle = region ? `Universidades de ${region} cercanas a PUCP` : 'Universidades cercanas a PUCP';
  const filterError = rankings.error || subjects.error || years.error;
  const filterLoading = rankings.loading || subjects.loading || years.loading;
  const title = subjects.data?.find(s => s.id_subject === subject)?.nombre_espanol;
  const missingPucpYear = ready && pucpYears.data !== undefined && !pucpYears.data.some(y => y.anio === end);

  return <div className="space-y-6">
    <div><h2 className="text-2xl font-bold text-[#0F2A44]">Situación mundial</h2>
      <p className="mt-1 text-sm text-slate-500">Posicionamiento de PUCP en el ranking seleccionado y comparación por región.</p></div>
    <RankingFilters>
      <div className="grid gap-4 md:grid-cols-2">
        <SelectField label="Ranking" value={ranking} disabled={!worldRankings.length} onChange={e => { setRanking(e.target.value); setSubject(''); setEnd(undefined); setStart(undefined); setRegion(''); }}>
          {!ranking && <option value="">Seleccionar ranking</option>}{worldRankings.map(r => <option key={r.id_ranking} value={r.id_ranking}>{worldRankingLabels[r.id_ranking]}</option>)}
        </SelectField>
        {ranking.endsWith('_BY_SUBJECT') && <SelectField label="Categoría" value={subject} disabled={!subjects.data?.length} onChange={e => { setSubject(e.target.value); setEnd(undefined); setStart(undefined); setRegion(''); }}>
          {!subject && <option value="">Sin categorías disponibles</option>}{subjects.data?.map(s => <option key={s.id_subject} value={s.id_subject}>{s.nombre_espanol}</option>)}
        </SelectField>}
        <SelectField label="Año de referencia" value={end ?? ''} disabled={!availableYears.length} onChange={e => setEnd(Number(e.target.value))}>
          {end === undefined && <option value="">Sin años disponibles</option>}{availableYears.map(y => <option key={y} value={y}>{y}</option>)}
        </SelectField>
      </div>
      <Notice error={filterError} loading={filterLoading} empty={!filterLoading && !filterError && !ready} label="No hay resultados disponibles para este ranking y categoría." />
      {missingPucpYear && <div role="status" className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-[#084580]">
        <p className="font-semibold">Sin datos registrados de PUCP para &quot;{end}&quot; en &quot;{title || subject}&quot;.</p>
        <p className="mt-1">Selecciona otro año de referencia.</p>
      </div>}
    </RankingFilters>

    {ready && !missingPucpYear && !kpis.loading && !kpis.error && kpis.data?.puntaje_pucp == null && <p role="status" className="text-sm text-slate-500">PUCP: sin puntaje disponible para el año seleccionado en esta categoría.</p>}

    <section aria-label="Indicadores globales" className="space-y-3">
      <div><h3 className="font-semibold">Situación en {end ?? '—'} · Comparación global del ranking</h3>
        <p className="text-xs text-slate-500">{title || subject} · Estos indicadores no cambian con el filtro de región.</p></div>
      <Notice error={kpis.error} loading={kpis.loading} empty={false} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Puntaje PUCP', format(kpis.data?.puntaje_pucp), 'Puntaje al año de referencia'],
          ['Promedio global · sin PUCP', format(kpis.data?.promedio_sin_pucp), 'Universidades del ranking seleccionado'],
          ['Brecha global', signed(kpis.data?.brecha), 'Puntaje PUCP menos promedio global'],
          ['Puesto oficial', kpis.data?.puesto_oficial ?? '—', `${kpis.data?.total ?? '—'} universidades consultadas`],
        ].map(([label, value, detail]) => <KpiCard key={label} label={label} value={value} detail={detail} />)}
      </div>
    </section>

    <section className="space-y-4 rounded-2xl border border-blue-100 bg-blue-50/40 p-4 md:p-5" aria-label="Comparación por región">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><h3 className="font-semibold">Comparación por región</h3><p className="text-xs text-slate-500">Este filtro afecta a evolución, brechas y tabla de universidades. PUCP se excluye del promedio.</p></div>
        <SelectField label="Región de las universidades comparadas" labelClassName="min-w-52 text-xs font-semibold" aria-describedby="world-region-description" value={region} disabled={!comparisonReady} onChange={e => setRegion(e.target.value)}>
          <option value="">Todas las regiones</option>{regions.data?.map(r => <option key={r.region}>{r.region}</option>)}
        </SelectField>
      </div>
      <p id="world-region-description" className="text-xs text-slate-600">Se mantienen los resultados y puestos del ranking mundial seleccionado. Latinoamérica agrupa las universidades de esa región dentro de este ranking; la pestaña Regional muestra los rankings específicos de Latinoamérica.</p>
      <Notice error={regions.error} loading={regions.loading} empty={false} />
      <div className="grid gap-5 xl:grid-cols-2">
        <div className={panel}>
          <h4 className="font-semibold">Evolución · {comparison}</h4>
          <div className="my-3 flex items-center gap-3 text-xs text-slate-600"><SelectField label="Desde" labelClassName="font-semibold" value={start ?? ''} disabled={!ready || !startYears.length} onChange={e => setStart(Number(e.target.value))}>
            {start === undefined && <option value="">Sin años anteriores</option>}{startYears.map(y => <option key={y} value={y}>{y}</option>)}
          </SelectField><span>hasta {end ?? '—'}</span></div>
          <EvolutionChart {...evolution} comparisonLabel={region ? `Promedio · ${region}` : 'Promedio · sin PUCP'} />
        </div>
        <div className={panel}>
          <h4 className="font-semibold">Brechas por indicador · {end ?? '—'}</h4><p className="mt-1 text-xs text-slate-500">{comparison} · Verde: ventaja PUCP. Rojo: puntaje por debajo del promedio.</p>
          <IndicatorGapChart {...gaps} comparisonLabel="Promedio comparado" emptyLabel="Sin indicadores con datos comparables para esta región y año." />
        </div>
      </div>
    </section>

    <section className={`${panel} overflow-hidden`} aria-label={tableTitle}>
      <h3 className="font-semibold">{tableTitle} · {end ?? '—'}</h3>
      <p className="mt-1 mb-4 text-xs text-slate-500">{region
        ? 'Hasta cinco universidades de la región con mejor puesto y cinco con peor puesto que PUCP. Se conservan los puestos mundiales oficiales. Las universidades empatadas o con bandas superpuestas con PUCP no se incluyen como superiores o inferiores. PUCP se mantiene como referencia aunque no pertenezca a la región.'
        : 'Hasta cinco universidades anteriores y cinco posteriores en el orden oficial. Ranking completo, sin filtro de región. Los empates y bandas conservan su puesto oficial.'}</p>
      <Notice error={universities.error} loading={universities.loading} empty={!universities.data?.universidades.length}
        label={universities.data?.estado === 'region_sin_datos' ? 'Sin universidades disponibles en esta región para el año de referencia.' : universities.data?.estado === 'pucp_sin_puesto' ? 'PUCP no tiene un puesto interpretable para ubicar sus universidades cercanas.' : universities.data?.estado === 'pucp_sin_datos' ? 'PUCP no tiene resultados al año de referencia.' : 'Sin universidades disponibles para esta selección.'} />
      <UniversityTable rows={universities.data?.universidades ?? []} start={start} end={end} extraPucpId={universities.data?.pucp_fuera_region ? 217 : undefined} extraPucpLabel="PUCP · referencia fuera de la región" />
    </section>
  </div>;
}
