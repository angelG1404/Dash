import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Gap } from '../types/dashboard';
import { createScoreFormatters } from '../utils/format';
import Notice from './DataNotice';
function GapTooltip({ active, payload, missingLabel, comparisonLabel }: { missingLabel: string; comparisonLabel: string; active?: boolean; payload?: readonly { payload?: Gap }[] }) {
  const { format, signed } = createScoreFormatters(missingLabel);
  const gap = payload?.[0]?.payload;
  if (!active || !gap) return null;
  return <div className="max-w-xs rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-lg">
    <p className="mb-2 font-semibold">{gap.indicador}</p>
    <p>PUCP: {format(gap.pucp_cierre)}</p><p>{comparisonLabel}: {format(gap.promedio_comparacion)}</p>
    <p>Diferencia: {signed(gap.diferencia)}</p><p>Universidades con datos: {gap.universidades_comparadas}</p>
  </div>;
}


export default function IndicatorGapChart({ data, error, loading, emptyLabel = 'Sin indicadores con datos comparables para esta selección y año.', missingLabel = '—', comparisonLabel = 'Comparación' }: { data?: Gap[]; error?: string; loading: boolean; emptyLabel?: string; missingLabel?: string; comparisonLabel?: string }) {
  const gapData = (data ?? []).filter(gap => gap.diferencia !== null);
  return <>
    <Notice error={error} loading={loading} empty={data !== undefined && !gapData.length} label={emptyLabel} />
    {!!gapData.length && <div className="mt-4 overflow-y-auto" style={{ maxHeight: 440 }}><div style={{ height: Math.max(300, gapData.length * 52) }}>
      <ResponsiveContainer width="100%" height="100%"><BarChart layout="vertical" data={gapData} margin={{ top: 10, right: 24, left: 0, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E1E5EB" /><XAxis type="number" domain={[min => Math.min(0, min), max => Math.max(0, max)]} tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="indicador" width={155} tick={{ fontSize: 10 }} interval={0} /><ReferenceLine x={0} stroke="#64748b" />
        <Tooltip content={<GapTooltip missingLabel={missingLabel} comparisonLabel={comparisonLabel} />} /><Bar dataKey="diferencia" maxBarSize={22} radius={3}>
          {gapData.map(gap => <Cell key={gap.indicador_id} fill={gap.diferencia! >= 0 ? '#228B3B' : '#C44040'} />)}
        </Bar>
      </BarChart></ResponsiveContainer>
    </div></div>}
    {!!data?.some(gap => gap.diferencia === null) && <p className="mt-3 text-xs text-slate-500">Los indicadores sin datos comparables no se representan.</p>}
  </>;
}
