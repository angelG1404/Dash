import type { Score } from '../types/dashboard';
const numberFormat = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export function createScoreFormatters(missing = '—') {
  const format = (value: Score | undefined) => value == null ? missing : numberFormat.format(value);
  const signed = (value: Score | undefined) => value == null ? missing : `${value > 0 ? '+' : ''}${format(value)}`;
  return { format, signed };
}
export const { format, signed } = createScoreFormatters();
