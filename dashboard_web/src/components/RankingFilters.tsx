import type { ComponentProps, ReactNode } from 'react';
import { panel, select } from './styles';

export default function RankingFilters({ children, label = 'Filtros generales' }: { children: ReactNode; label?: string }) {
  return <section className={panel} aria-label={label}>{children}</section>;
}
export function SelectField({ label, labelClassName = 'text-xs font-semibold', children, className = select, ...props }: ComponentProps<'select'> & { label: string; labelClassName?: string }) {
  return <label className={labelClassName}>{label}<select className={className} {...props}>{children}</select></label>;
}
