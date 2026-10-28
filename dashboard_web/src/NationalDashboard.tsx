import { useState } from 'react';
import type { Ranking } from './services/api';

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
import { createScoreFormatters } from './utils/format';
import { crossesTheLatamMethodologyChange, methodologyNote } from './utils/methodology';
const { format, signed } = createScoreFormatters('Sin datos');

const nationalRankingLabels: Record<string, string> = {
  QS_WORLD: 'QS World',
  THE_WORLD: 'THE World',
  QS_LATAM_CARIBE: 'QS LATAM',
  THE_LATAM: 'THE LATAM',
};

export default function NationalDashboard() {
  const [rankingChoice, setRanking] = useState('QS_WORLD');
  const [universityChoice, setUniversity] = useState('');
  const rankings = useApi<Ranking[]>('/rankings', {});
  const nationalRankings = (rankings.data ?? []).filter(r => Object.hasOwn(nationalRankingLabels, r.id_ranking));
  const ranking = nationalRankings.some(r => r.id_ranking === rankingChoice) ? rankingChoice : nationalRankings[0]?.id_ranking ?? '';
  const subject = ranking ? `${ranking}_GENERAL` : '';
  const context = { id_ranking: ranking, subject_id: subject };
  const years = useApi<{ anio: number }[]>('/api/filtros/anios', context, !!subject);
  const { availableYears, end, startYears, start, setEnd, setStart } = useRankingPeriod(years.data);
  const ready = !!subject && end !== undefined;
  const period = { ...context, anio_inicio: start ?? end, anio_fin: end };
  const options = useApi<{ university_id: number; nombre_universidad: string }[]>('/api/filtros/universidades', { ...period, pais: 'Peru' }, ready);
  const selectedUniversity = options.data?.find(u => String(u.university_id) === universityChoice);
  const university = selectedUniversity?.university_id;
  const comparisonReady = ready && options.data !== undefined;
  const comparison = selectedUniversity?.nombre_universidad ?? 'Promedio Perú · sin PUCP';
  const comparisonParams = { university_id: university };
  const kpis = useApi<Kpis>('/api/nacional/kpis', { ...context, anio_fin: end }, ready);
  const evolution = useApi<Evolution>('/api/nacional/evolucion', { ...period, ...comparisonParams }, comparisonReady && start !== undefined);
  const gaps = useApi<Gap[]>('/api/nacional/brechas', { ...context, anio_fin: end, ...comparisonParams }, comparisonReady);
  const universities = useApi<UniversityResponse>('/api/nacional/universidades', period, ready);
  const tableRows = universities.data?.universidades ?? [];
  const filterError = rankings.error || years.error;
  const filterLoading = rankings.loading || years.loading;
  const isTheLatam = ranking === 'THE_LATAM';
  const crossesMethodologyChange = crossesTheLatamMethodologyChange(ranking, start, end);


  return <div className="space-y-6">
    <div><h2 className="text-2xl font-bold text-[#0F2A44]">Nivel nacional</h2>
      <p className="mt-1 text-sm text-slate-500">Posicionamiento de PUCP en el ranking seleccionado y comparación con universidades peruanas.</p></div>
    <RankingFilters>
      <div className="grid gap-4 md:grid-cols-3">
        <SelectField label="Ranking" value={ranking} disabled={!nationalRankings.length} onChange={e => { setRanking(e.target.value); setEnd(undefined); setStart(undefined); setUniversity(''); }}>
          {!ranking && <option value="">Seleccionar ranking</option>}{nationalRankings.map(r => <option key={r.id_ranking} value={r.id_ranking}>{nationalRankingLabels[r.id_ranking]}</option>)}
        </SelectField>
        <SelectField label="Año de referencia" value={end ?? ''} disabled={!availableYears.length} onChange={e => { setEnd(Number(e.target.value)); setUniversity(''); }}>
          {end === undefined && <option value="">Sin años disponibles</option>}{availableYears.map(y => <option key={y} value={y}>{y}</option>)}
        </SelectField>
        <SelectField label="Año inicial" value={start ?? ''} disabled={!ready || !startYears.length} onChange={e => { setStart(Number(e.target.value)); setUniversity(''); }}>
          {start === undefined && <option value="">Sin años anteriores</option>}{startYears.map(y => <option key={y} value={y}>{y}</option>)}
        </SelectField>
      </div>
      <Notice error={filterError} loading={filterLoading} empty={!filterLoading && !filterError && !ready} label="No hay resultados disponibles para este ranking." />
      {isTheLatam && <div role="status" className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-[#084580]">
        <p className="font-semibold">Cambio en la base de evaluación en 2026</p>
        <p className="mt-1">THE evalúa ahora a las universidades frente al conjunto mundial, en lugar de únicamente Latinoamérica. Las variaciones de puntaje pueden reflejar este cambio y no necesariamente una mejora o caída del desempeño.</p>
      </div>}
    </RankingFilters>

    <section aria-label="Indicadores nacionales" className="space-y-3">
      <div><h3 className="font-semibold">Situación en {end ?? '—'} · Comparación nacional del ranking</h3>
        <p className="text-xs text-slate-500">Estos indicadores consideran todas las universidades peruanas del ranking y no cambian con la universidad de comparación.</p></div>
      <Notice error={kpis.error} loading={kpis.loading} empty={false} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Posición nacional', kpis.data?.posicion == null ? 'Sin datos' : String(kpis.data.posicion), `${kpis.data?.total ?? '—'} universidades · Calculada por puesto oficial y puntaje`],
          ['Puntaje PUCP', format(kpis.data?.puntaje_pucp), 'Puntaje al año de referencia'],
          ['Promedio Perú · sin PUCP', format(kpis.data?.promedio_sin_pucp), 'Universidades peruanas del ranking'],
          ['Brecha nacional', signed(kpis.data?.brecha), 'Puntaje PUCP menos promedio Perú'],
        ].map(([label, value, detail]) => <KpiCard key={label} label={label} value={value} detail={detail} />)}
      </div>
    </section>

    <section className="space-y-4 rounded-2xl border border-blue-100 bg-blue-50/40 p-4 md:p-5" aria-label="Comparación con universidades peruanas">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><h3 className="font-semibold">Comparación con universidades peruanas</h3><p className="text-xs text-slate-500">Este filtro afecta únicamente a evolución y brechas. PUCP se excluye del promedio.</p></div>
        <SelectField label="Universidad" labelClassName="min-w-52 text-xs font-semibold" value={university ?? ''} disabled={!options.data?.length} onChange={e => setUniversity(e.target.value)}>
          <option value="">Todas las peruanas</option>{options.data?.map(u => <option key={u.university_id} value={u.university_id}>{u.nombre_universidad}</option>)}
        </SelectField>
      </div>
      <Notice error={options.error} loading={options.loading} empty={false} />
      <div className="grid gap-5 xl:grid-cols-2">
        <div className={panel}>
          <h4 className="font-semibold">Evolución · {comparison}</h4>
          <p className="my-3 text-xs text-slate-500">Periodo: {start ?? '—'}–{end ?? '—'}</p>
          <EvolutionChart {...evolution} comparisonLabel={comparison} />
        </div>
        <div className={panel}>
          <h4 className="font-semibold">Brechas por indicador · {end ?? '—'}</h4><p className="mt-1 text-xs text-slate-500">{comparison} · Verde: ventaja PUCP. Rojo: puntaje por debajo de la comparación.</p>
          <IndicatorGapChart {...gaps} missingLabel="Sin datos" emptyLabel={selectedUniversity ? `No hay datos comparables con ${selectedUniversity.nombre_universidad} para ${end}. Selecciona otro año de referencia para ver las brechas.` : undefined} />
        </div>
      </div>
    </section>

    <section className={`${panel} overflow-hidden`} aria-label="Universidades peruanas">
      <h3 className="font-semibold">Universidades peruanas · {end ?? '—'}</h3>
      <p className="mt-1 mb-4 text-xs text-slate-500">Posición nacional calculada por el tablero: primero puesto oficial y, dentro del mismo puesto o intervalo, puntaje del año de referencia de mayor a menor. Los puntajes faltantes van al final de su grupo; si empatan, se ordena por nombre. La numeración es consecutiva y no modifica el puesto oficial. Esta tabla no cambia con la universidad de comparación.</p>
      <Notice error={universities.error} loading={universities.loading} empty={!tableRows.length} />
      {universities.data?.estado === 'pucp_sin_datos' && <p role="status" className="mb-3 text-sm text-slate-500">PUCP no tiene resultados en el año de referencia. Se muestran las demás universidades disponibles.</p>}
      <UniversityTable rows={tableRows} national omittedChange={crossesMethodologyChange ? { noteId: 'national-methodology-note', explanation: methodologyNote } : undefined} start={start} end={end} />
      {crossesMethodologyChange && <p id="national-methodology-note" className="mt-3 text-xs text-slate-500">— {methodologyNote} Los puntajes de ambas ediciones se mantienen como referencia.</p>}
      {/* Esto es un comentario en HTML 
      <p className="mt-3 text-xs text-slate-500">{start === undefined ? 'Sin año anterior disponible para calcular el cambio. ' : ''}Cambio = puntaje de {end ?? 'cierre'} menos puntaje de {start ?? 'inicio'}. No representa un cambio de puesto.</p>
    */}
    </section>
  </div>;
}
