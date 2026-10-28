export const methodologyNote = 'Diferencia omitida por el cambio en la base de evaluación de THE en 2026.';

export function crossesTheLatamMethodologyChange(ranking: string, start?: number, end?: number): boolean {
  return ranking === 'THE_LATAM' && start !== undefined && end !== undefined && start < 2026 && end >= 2026;
}
