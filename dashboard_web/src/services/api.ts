import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface Ranking {
  id_ranking: string;
}

export interface Year {
  year: number;
}

export interface Region {
  region: string;
}

export interface Pais {
  pais: string;
  region: string;
}

export interface Subject {
  nombre_ranking: string;
  area_grande: string;
  nombre_espanol: string;
  id_subject: string;
}

export interface MundialKpis {
  puntaje_pucp: number;
  promedio_sin_pucp: number;
  brecha: number;
  posicion: number;
  total: number;
  mensaje: string;
}

export interface MundialEvolucion {
  anios: number[];
  pucp: number[];
  promedio_sin_pucp: number[];
}

export interface MundialBrechaInd {
  indicador: string;
  pucp_cierre: number;
  promedio_mundial: number;
  diferencia: number;
}

export interface MundialUniversidad {
  universidad: string;
  pais: string;
  puntaje: number;
  puesto_qs: string;
  cambio: number;
}

export const fetchRankings = async () => {
  const response = await apiClient.get<Ranking[]>('/rankings');
  return response.data;
};

export const fetchYears = async () => {
  const response = await apiClient.get<Year[]>('/years');
  return response.data;
};

export const fetchRegiones = async () => {
  const response = await apiClient.get<Region[]>('/regiones');
  return response.data;
};

export const fetchPaises = async (region?: string) => {
  const response = await apiClient.get<Pais[]>('/paises', { params: { region } });
  return response.data;
};

export const fetchSubjects = async (idRanking: string) => {
  const response = await apiClient.get<Subject[]>(`/subjects/${idRanking}`);
  return response.data;
};

// Endpoints específicos Página 1: Mundial
export const fetchMundialKpis = async (anio_inicio: number, anio_fin: number, id_ranking: string, subject_id: string) => {
  const res = await apiClient.get<MundialKpis>('/api/mundial/kpis', { params: { anio_inicio, anio_fin, id_ranking, subject_id } });
  return res.data;
};

export const fetchMundialEvolucion = async (anio_inicio: number, anio_fin: number, id_ranking: string, subject_id: string) => {
  const res = await apiClient.get<MundialEvolucion>('/api/mundial/evolucion', { params: { anio_inicio, anio_fin, id_ranking, subject_id } });
  return res.data;
};

export const fetchMundialBrechas = async (anio_fin: number, id_ranking: string, subject_id: string) => {
  const res = await apiClient.get<MundialBrechaInd[]>('/api/mundial/brechas', { params: { anio_fin, id_ranking, subject_id } });
  return res.data;
};

export const fetchMundialUniversidades = async (anio_fin: number, id_ranking: string, subject_id: string) => {
  const res = await apiClient.get<MundialUniversidad[]>('/api/mundial/universidades', { params: { anio_fin, id_ranking, subject_id } });
  return res.data;
};

// Regional types & APIs
export interface RegionalKpis {
  puntaje_pucp: number;
  promedio_sin_pucp: number;
  brecha: number;
  posicion: number;
  total: number;
  mensaje: string;
}

export interface RegionalEvolucion {
  anios: number[];
  pucp: number[];
  promedio_sin_pucp: number[];
}

export interface RegionalBrechaInd {
  indicador: string;
  pucp_cierre: number;
  promedio_regional: number;
  diferencia: number;
}

export interface RegionalUniversidad {
  universidad: string;
  pais: string;
  puntaje: number;
  puesto_qs: string;
  cambio: number;
}

export interface RegionalPaisItem {
  pais: string;
}

export interface RegionalUniItem {
  university_id: number;
  nombre_universidad: string;
  pais: string;
}

export const fetchRegionalPaises = async () => {
  const res = await apiClient.get<RegionalPaisItem[]>('/api/regional/paises');
  return res.data;
};

export const fetchRegionalUniversidadesLista = async (pais?: string) => {
  const res = await apiClient.get<RegionalUniItem[]>('/api/regional/universidades_lista', { params: { pais } });
  return res.data;
};

export const fetchRegionalKpis = async (anio_inicio: number, anio_fin: number, id_ranking: string, subject_id: string, pais?: string, university_id?: number) => {
  const res = await apiClient.get<RegionalKpis>('/api/regional/kpis', { params: { anio_inicio, anio_fin, id_ranking, subject_id, pais, university_id } });
  return res.data;
};

export const fetchRegionalEvolucion = async (anio_inicio: number, anio_fin: number, id_ranking: string, subject_id: string, pais?: string, university_id?: number) => {
  const res = await apiClient.get<RegionalEvolucion>('/api/regional/evolucion', { params: { anio_inicio, anio_fin, id_ranking, subject_id, pais, university_id } });
  return res.data;
};

export const fetchRegionalBrechas = async (anio_fin: number, id_ranking: string, subject_id: string, pais?: string, university_id?: number) => {
  const res = await apiClient.get<RegionalBrechaInd[]>('/api/regional/brechas', { params: { anio_fin, id_ranking, subject_id, pais, university_id } });
  return res.data;
};

export const fetchRegionalUniversidades = async (anio_fin: number, id_ranking: string, subject_id: string, pais?: string) => {
  const res = await apiClient.get<RegionalUniversidad[]>('/api/regional/universidades', { params: { anio_fin, id_ranking, subject_id, pais } });
  return res.data;
};


export const fetchParesRegional = async () => {
  const res = await apiClient.get<ParItem[]>('/api/pares/regional');
  return res.data;
};

// Nacional types & APIs
export const fetchNacionalKpis = async (anio_inicio: number, anio_fin: number, id_ranking: string, subject_id: string, solo_pares: boolean) => {
  const res = await apiClient.get<RegionalKpis>('/api/nacional/kpis', { params: { anio_inicio, anio_fin, id_ranking, subject_id, solo_pares } });
  return res.data;
};

export const fetchNacionalEvolucion = async (anio_inicio: number, anio_fin: number, id_ranking: string, subject_id: string, solo_pares: boolean) => {
  const res = await apiClient.get<RegionalEvolucion>('/api/nacional/evolucion', { params: { anio_inicio, anio_fin, id_ranking, subject_id, solo_pares } });
  return res.data;
};

export const fetchNacionalBrechas = async (anio_fin: number, id_ranking: string, subject_id: string, solo_pares: boolean) => {
  const res = await apiClient.get<RegionalBrechaInd[]>('/api/nacional/brechas', { params: { anio_fin, id_ranking, subject_id, solo_pares } });
  return res.data;
};

export const fetchNacionalUniversidades = async (anio_fin: number, id_ranking: string, subject_id: string) => {
  const res = await apiClient.get<RegionalUniversidad[]>('/api/nacional/universidades', { params: { anio_fin, id_ranking, subject_id } });
  return res.data;
};

export const fetchParesNacional = async () => {
  const res = await apiClient.get<ParItem[]>('/api/pares/nacional');
  return res.data;
};

// Mejoras types & APIs
export interface MejorasResumen {
  mejoran: number;
  caen: number;
  estables: number;
  sin_datos: number;
  mensaje: string;
}

export interface MejoraCambioItem {
  indicador: string;
  inicio: number;
  cierre: number;
  cambio: number;
  evolucion: 'Mejora' | 'Caída' | 'Estable';
}

export interface OportunidadItem {
  indicador: string;
  pucp_cierre: number;
  p75_regional: number;
  cambio: number;
  brecha_ponderada: number;
  revisar: string;
}

export const fetchMejorasResumen = async (anio_inicio: number, anio_fin: number, id_ranking: string, subject_id: string) => {
  const res = await apiClient.get<MejorasResumen>('/api/mejoras/resumen', { params: { anio_inicio, anio_fin, id_ranking, subject_id } });
  return res.data;
};

export const fetchMejorasCambios = async (anio_inicio: number, anio_fin: number, id_ranking: string, subject_id: string) => {
  const res = await apiClient.get<MejoraCambioItem[]>('/api/mejoras/cambios', { params: { anio_inicio, anio_fin, id_ranking, subject_id } });
  return res.data;
};

export const fetchMejorasOportunidades = async (anio_inicio: number, anio_fin: number, id_ranking: string, subject_id: string) => {
  const res = await apiClient.get<OportunidadItem[]>('/api/mejoras/oportunidades', { params: { anio_inicio, anio_fin, id_ranking, subject_id } });
  return res.data;
};

