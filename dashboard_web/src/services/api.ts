import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface Ranking {
  id_ranking: string;
}

export interface Subject {
  nombre_ranking: string;
  area_grande: string;
  nombre_espanol: string;
  id_subject: string;
}
