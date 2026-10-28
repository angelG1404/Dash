interface Props { error?: string; loading: boolean; empty: boolean; label?: string; spacious?: boolean }
export default function DataNotice({ error, loading, empty, label = 'Sin datos para esta selección.', spacious = false }: Props) {
  if (error) return <p role="alert" className={`${spacious ? 'my-3 ' : ''}rounded-lg bg-red-50 p-4 text-sm text-red-700`}>{error}</p>;
  const className = `${spacious ? 'py-8' : 'p-4'} text-sm text-slate-500`;
  if (loading) return <p role="status" className={className}>Cargando datos…</p>;
  if (empty) return <p className={className}>{label}</p>;
  return null;
}
