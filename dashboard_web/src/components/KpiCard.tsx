import { panel } from './styles';
export default function KpiCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className={panel}>
    <p className="text-xs font-medium text-slate-500">{label}</p>
    <p className="my-2 text-3xl font-semibold text-[#084580]">{value}</p>
    <p className="text-xs text-slate-500">{detail}</p>
  </div>;
}
