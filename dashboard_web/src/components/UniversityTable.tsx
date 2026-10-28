import { Fragment } from 'react';
import type { University } from '../types/dashboard';
import { createScoreFormatters } from '../utils/format';

interface Props {
  rows: University[];
  start?: number;
  end?: number;
  national?: boolean;
  extraPucpLabel?: string;
  extraPucpId?: number;
  omittedChange?: { noteId: string; explanation: string };
}
export default function UniversityTable({ rows, start, end, national = false, extraPucpLabel, extraPucpId, omittedChange }: Props) {
  const { format, signed } = createScoreFormatters(national ? 'Sin datos' : '—');
  const labels = national ? ['Posición nacional', 'Puesto oficial', 'Universidad'] : ['Puesto oficial', 'Universidad', 'País'];
  labels.push(`Puntaje ${start ?? 'inicial'}`, `Puntaje ${end}`, 'Cambio');
  if (!rows.length) return null;
  return <div className="overflow-x-auto"><table className="w-full text-left text-xs">
    <thead className="border-y border-slate-200 bg-slate-50 text-slate-600"><tr>
      {labels.map(label => <th key={label} className="px-3 py-3 font-semibold whitespace-nowrap">{label}
        {label === 'Cambio' && omittedChange && <a href={`#${omittedChange.noteId}`} aria-label="Ver explicación de la diferencia omitida" title={omittedChange.explanation} className="ml-1 inline-flex rounded text-slate-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">ⓘ</a>}
      </th>)}
    </tr></thead><tbody>
      {rows.map(uni => {
        const hideChange = start === undefined || !!omittedChange;
        return <Fragment key={uni.university_id}>
          {uni.separador_antes && <tr><td colSpan={6} className="border-y border-blue-200 bg-blue-50/70 px-3 py-3 font-semibold text-[#084580]">{uni.separador_antes}</td></tr>}
          {uni.salto_antes && <tr><td colSpan={6} className="border-y border-blue-200 bg-blue-50/70 px-3 py-3 text-center">
            <div className="flex items-center justify-center gap-3 text-[#084580]">
              <span aria-hidden="true" className="text-3xl font-bold leading-none tracking-widest">•••</span>
            </div>
          </td></tr>}
          <tr className={`border-b border-slate-100 ${uni.es_pucp ? 'bg-blue-50 font-semibold text-[#084580]' : 'text-slate-700'}`}>
            {national && <td className="px-3 py-3">{uni.posicion_ambito ?? 'Sin datos'}</td>}
            <td className="px-3 py-3">{uni.puesto_oficial ?? (national ? 'Sin datos' : '—')}</td>
            <td className="min-w-48 px-3 py-3">{uni.universidad}{uni.es_pucp && <span className="ml-2 rounded bg-[#084580] px-2 py-0.5 text-[10px] text-white">{uni.university_id === extraPucpId ? extraPucpLabel : 'PUCP'}</span>}</td>
            {!national && <td className="px-3 py-3">{uni.pais}</td>}
            <td className="px-3 py-3 tabular-nums">{format(start === undefined ? null : uni.puntaje_inicio)}</td>
            <td className="px-3 py-3 tabular-nums">{format(uni.puntaje_cierre)}</td>
            <td aria-describedby={omittedChange?.noteId} className={`px-3 py-3 whitespace-nowrap tabular-nums ${hideChange || uni.cambio == null ? 'text-slate-400' : uni.cambio > 0 ? 'text-green-700' : uni.cambio < 0 ? 'text-red-700' : 'text-slate-600'}`}>
              {hideChange ? '—' : uni.cambio == null && !national ? 'Sin datos comparables' : signed(uni.cambio)}
            </td>
          </tr>
        </Fragment>;
      })}
    </tbody>
  </table></div>;
}
