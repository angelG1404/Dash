import { useState } from 'react';

export function resolveRankingPeriod(years: readonly { anio: number }[], endChoice?: number, startChoice?: number, previousEditions = 3) {
  const availableYears = [...new Set(years.map(y => y.anio))].sort((a, b) => a - b);
  const end = endChoice !== undefined && availableYears.includes(endChoice) ? endChoice : availableYears.at(-1);
  const startYears = availableYears.filter(year => end !== undefined && year < end);
  const start = startChoice !== undefined && startYears.includes(startChoice)
    ? startChoice : startYears[Math.max(0, startYears.length - previousEditions)];
  return { availableYears, end, startYears, start };
}

export function useRankingPeriod(years: readonly { anio: number }[] = [], previousEditions = 3) {
  const [endChoice, setEnd] = useState<number>();
  const [startChoice, setStart] = useState<number>();
  return { ...resolveRankingPeriod(years, endChoice, startChoice, previousEditions), setEnd, setStart };
}
