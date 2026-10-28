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
import { crossesTheLatamMethodologyChange, methodologyNote } from './utils/methodology';

const regionalRankingLabels: Record<string, string> = {
  QS_LATAM_CARIBE: 'QS Latinoamérica y Caribe',
  THE_LATAM: 'THE Latinoamérica',
};

export default function RegionalDashboard() {
  const [rankingChoice, setRanking] = useState('QS_LATAM_CARIBE');
  const [countryChoice, setCountry] = useState('');
  const [universityChoice, setUniversity] = useState('');
  const rankings = useApi<Ranking[]>('/rankings', {});
  const regionalRankings = (rankings.data ?? []).filter(r => Object.hasOwn(regionalRankingLabels, r.id_ranking));
  const ranking = regionalRankings.some(r => r.id_ranking === rankingChoice) ? rankingChoice : regionalRankings[0]?.id_ranking ?? '';
  const subjects = useApi<Subject[]>(`/subjects/${encodeURIComponent(ranking)}`, {}, !!ranking);
  const subject = subjects.data?.find(s => s.id_subject === `${ranking}_GENERAL`)?.id_subject
    ?? subjects.data?.[0]?.id_subject ?? '';
  const context = { id_ranking: ranking, subject_id: subject };
  const years = useApi<{ anio: number }[]>('/api/filtros/anios', context, !!subject);
  const { availableYears, end, startYears, start, setEnd, setStart } = useRankingPeriod(years.data);
  const ready = !!subject && end !== undefined;
  const period = { ...context, anio_inicio: start ?? end, anio_fin: end };
  const countries = useApi<{ pais: string }[]>('/api/filtros/paises', period, ready);
  const country = countries.data?.some(c => c.pais === countryChoice) ? countryChoice : '';
  const options = useApi<{ university_id: number; nombre_universidad: string }[]>('/api/filtros/universidades', { ...period, pais: country }, ready && !!country);
  const selectedUniversity = options.data?.find(u => String(u.university_id) === universityChoice);
  const university = selectedUniversity?.university_id;
  const comparisonReady = ready && countries.data !== undefined && (!country || options.data !== undefined);
  const comparison = selectedUniversity?.nombre_universidad ?? (country ? `Promedio de ${country} · sin PUCP` : 'Promedio regional · sin PUCP');
  const comparisonParams = { pais: country || undefined, university_id: university };
  const kpis = useApi<Kpis>('/api/regional/kpis', { ...context, anio_fin: end }, ready);
  const evolution = useApi<Evolution>('/api/regional/evolucion', { ...period, ...comparisonParams }, comparisonReady && start !== undefined);
  const gaps = useApi<Gap[]>('/api/regional/brechas', { ...context, anio_fin: end, ...comparisonParams }, comparisonReady);
  const universities = useApi<UniversityResponse>('/api/regional/universidades', { ...period, limit: 20 }, ready);
  const isTheLatam = ranking === 'THE_LATAM';
  const crossesMethodologyChange = crossesTheLatamMethodologyChange(ranking, start, end);
  const tableTitle = isTheLatam ? 'Top 10 regional y entorno de PUCP' : 'Top 20 regional';
  const tableRows = universities.data?.universidades ?? [];
  const extraPucp = universities.data?.pucp && !tableRows.some(u => u.es_pucp) ? universities.data.pucp : undefined;
  const filterError = rankings.error || subjects.error || years.error;
  const filterLoading = rankings.loading || subjects.loading || years.loading;
  const title = subjects.data?.find(s => s.id_subject === subject)?.nombre_espanol;

  return <div className="space-y-6">
    <div><h2 className="text-2xl font-bold text-[#0F2A44]">Situación regional</h2>
      <p className="mt-1 text-sm text-slate-500">Posicionamiento de PUCP en el ranking seleccionado y comparación con países y universidades de Latinoamérica.</p></div>
    <RankingFilters>
      <div className="grid gap-4 md:grid-cols-3">
        <SelectField label="Ranking" value={ranking} disabled={!regionalRankings.length} onChange={e => { setRanking(e.target.value); setEnd(undefined); setStart(undefined); setCountry(''); setUniversity(''); }}>
          {!ranking && <option value="">Seleccionar ranking</option>}{regionalRankings.map(r => <option key={r.id_ranking} value={r.id_ranking}>{regionalRankingLabels[r.id_ranking]}</option>)}
        </SelectField>
        <SelectField label="Año de referencia" value={end ?? ''} disabled={!availableYears.length} onChange={e => { setEnd(Number(e.target.value)); setCountry(''); setUniversity(''); }}>
          {end === undefined && <option value="">Sin años disponibles</option>}{availableYears.map(y => <option key={y} value={y}>{y}</option>)}
        </SelectField>
        <SelectField label="Año inicial" value={start ?? ''} disabled={!ready || !startYears.length} onChange={e => { setStart(Number(e.target.value)); setCountry(''); setUniversity(''); }}>
          {start === undefined && <option value="">Sin años anteriores</option>}{startYears.map(y => <option key={y} value={y}>{y}</option>)}
        </SelectField>
      </div>
      <Notice error={filterError} loading={filterLoading} empty={!filterLoading && !filterError && !ready} label="No hay resultados disponibles para este ranking y categoría." />
      {isTheLatam && <div role="status" className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-[#084580]">
        <p className="font-semibold">Cambio en la base de evaluación en 2026</p>
        <p className="mt-1">THE evalúa ahora a las universidades frente al conjunto mundial, en lugar de únicamente Latinoamérica. Las variaciones de puntaje pueden reflejar este cambio y no necesariamente una mejora o caída del desempeño.</p>
      </div>}
    </RankingFilters>

    <section aria-label="Indicadores regionales" className="space-y-3">
      <div><h3 className="font-semibold">Situación en {end ?? '—'} · Comparación regional del ranking</h3>
        <p className="text-xs text-slate-500">{title || subject} · Estos indicadores no cambian con los filtros de país y universidad.</p></div>
      <Notice error={kpis.error} loading={kpis.loading} empty={false} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Puntaje PUCP', format(kpis.data?.puntaje_pucp), 'Puntaje al año de referencia'],
          ['Promedio regional · sin PUCP', format(kpis.data?.promedio_sin_pucp), 'Universidades del ranking seleccionado'],
          ['Brecha regional', signed(kpis.data?.brecha), 'Puntaje PUCP menos promedio regional'],
          ['Puesto oficial', kpis.data?.puesto_oficial ?? '—', `${kpis.data?.total ?? '—'} universidades consultadas`],
        ].map(([label, value, detail]) => <KpiCard key={label} label={label} value={value} detail={detail} />)}
      </div>
    </section>

    <section className="space-y-4 rounded-2xl border border-blue-100 bg-blue-50/40 p-4 md:p-5" aria-label="Comparación por país y universidad">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><h3 className="font-semibold">Comparación por país y universidad</h3><p className="text-xs text-slate-500">Estos filtros afectan únicamente a evolución y brechas. PUCP se excluye del promedio.</p></div>
        <SelectField label="País" labelClassName="min-w-52 text-xs font-semibold" value={country} disabled={!countries.data} onChange={e => { setCountry(e.target.value); setUniversity(''); }}>
          <option value="">Todos los países</option>{countries.data?.map(c => <option key={c.pais}>{c.pais}</option>)}
        </SelectField>
        <SelectField label="Universidad" labelClassName="min-w-52 text-xs font-semibold" value={university ?? ''} disabled={!country || !options.data} onChange={e => setUniversity(e.target.value)}>
          <option value="">Todas las universidades</option>{options.data?.map(u => <option key={u.university_id} value={u.university_id}>{u.nombre_universidad}</option>)}
        </SelectField>
      </div>
      <Notice error={countries.error || options.error} loading={countries.loading || options.loading} empty={false} />
      <div className="grid gap-5 xl:grid-cols-2">
        <div className={panel}>
          <h4 className="font-semibold">Evolución · {comparison}</h4>
          <p className="my-3 text-xs text-slate-500">Periodo: {start ?? '—'}–{end ?? '—'}</p>
          <EvolutionChart {...evolution} comparisonLabel={comparison} />
        </div>
        <div className={panel}>
          <h4 className="font-semibold">Brechas por indicador · {end ?? '—'}</h4><p className="mt-1 text-xs text-slate-500">{comparison} · Verde: ventaja PUCP. Rojo: puntaje por debajo de la comparación.</p>
          <IndicatorGapChart {...gaps} />
        </div>
      </div>
    </section>

    <section className={`${panel} overflow-hidden`} aria-label={tableTitle}>
      <h3 className="font-semibold">{tableTitle} · {end ?? '—'}</h3>
      <p className="mt-1 mb-4 text-xs text-slate-500">Ranking regional completo: esta tabla no cambia con los filtros de país y universidad. {isTheLatam ? 'Se muestran las primeras 10 universidades (incluidos empates en el corte), más 5 anteriores y 5 posteriores a PUCP, sin duplicados. Los puntos suspensivos indican filas omitidas.' : 'Se muestran las primeras 20 universidades según el puesto oficial del año final; PUCP se añade como referencia si queda fuera.'}</p>
      <Notice error={universities.error} loading={universities.loading} empty={!universities.data?.universidades.length}
        label={universities.data?.estado === 'pucp_sin_puesto' ? 'PUCP no tiene un puesto interpretable para ubicar sus universidades cercanas.' : universities.data?.estado === 'pucp_sin_datos' ? 'PUCP no tiene resultados al año de referencia.' : 'Sin universidades disponibles para esta selección.'} />
      {!!tableRows.length && universities.data?.estado === 'pucp_sin_datos' && <p role="status" className="mb-3 text-sm text-slate-500">PUCP no tiene resultados al año de referencia.</p>}
      {!!tableRows.length && universities.data?.estado === 'pucp_sin_puesto' && <p role="status" className="mb-3 text-sm text-slate-500">PUCP no tiene un puesto interpretable para ubicar sus universidades cercanas.</p>}
      <UniversityTable rows={[...tableRows, ...(extraPucp ? [extraPucp] : [])]} extraPucpId={extraPucp?.university_id} extraPucpLabel={isTheLatam ? 'PUCP · sin puesto' : 'PUCP · referencia fuera del top 20'} omittedChange={crossesMethodologyChange ? { noteId: 'regional-methodology-note', explanation: methodologyNote } : undefined} start={start} end={end} />
      {crossesMethodologyChange && <p id="regional-methodology-note" className="mt-3 text-xs text-slate-500">— {methodologyNote} Los puntajes de ambas ediciones se mantienen como referencia.</p>}
    </section>
  </div>;
}
