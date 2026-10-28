import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Evolution } from '../types/dashboard';
import { format } from '../utils/format';
import Notice from './DataNotice';
export default function EvolutionChart({ data, comparisonLabel, error, loading }: { data?: Evolution; comparisonLabel: string; error?: string; loading: boolean }) {
  const lineData = (data?.anios ?? []).map((anio, i) => ({
    anio: String(anio), pucp: data?.pucp[i] ?? null, promedio: data?.promedio_sin_pucp[i] ?? null,
  })).filter(row => row.pucp !== null || row.promedio !== null);
  return <>
    <Notice error={error} loading={loading} empty={lineData.length < 2} label="Se requieren datos de al menos dos años para mostrar la evolución. Selecciona un año de referencia posterior o un periodo con más datos." />
    {lineData.length >= 2 && <div className="h-80 min-w-0"><ResponsiveContainer width="100%" height="100%">
      <LineChart data={lineData} margin={{ top: 15, right: 15, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E1E5EB" /><XAxis dataKey="anio" tick={{ fontSize: 12 }} /><YAxis domain={['auto', 'auto']} width={48} tick={{ fontSize: 11 }} />
        <Tooltip formatter={value => format(value as number)} /><Legend wrapperStyle={{ fontSize: 11 }} />
        <Line name="PUCP" type="linear" dataKey="pucp" stroke="#1684db" strokeWidth={3} dot={{ r: 4 }} connectNulls />
        <Line name={comparisonLabel} type="linear" dataKey="promedio" stroke="#1A1A9C" strokeWidth={2} dot={{ r: 3 }} connectNulls />
      </LineChart>
    </ResponsiveContainer></div>}
    <p className="mt-3 text-xs text-slate-500">Se conectan las observaciones disponibles; los años sin datos en ambas series se omiten. El año inicial también se usa en el cambio de puntaje de la tabla.</p>
  </>;
}
