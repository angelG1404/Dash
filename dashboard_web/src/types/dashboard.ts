export type Score = number | null;
export interface Kpis { posicion?: number | null; puntaje_pucp: Score; promedio_sin_pucp: Score; brecha: Score; puesto_oficial: string | null; total: number }
export interface Evolution { anios: number[]; pucp: Score[]; promedio_sin_pucp: Score[] }
export interface Gap { indicador_id: number; indicador: string; pucp_cierre: Score; promedio_comparacion: Score; diferencia: Score; universidades_comparadas: number }
export interface University { university_id: number; universidad: string; pais: string; puesto_oficial: string | null; puntaje_inicio: Score; puntaje_cierre: Score; cambio: Score; es_pucp: boolean; posicion_ambito?: number | null; salto_antes?: boolean; separador_antes?: string | null }
export interface UniversityResponse { universidades: University[]; pucp: University | null; total: number; estado: string; pucp_fuera_region?: boolean }
